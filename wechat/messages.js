const User = require('../models/User');
const Content = require('../models/Content');
const Pair = require('../models/Pair');
const API = require('co-wechat-api');
const config = require('../config');

let systemPhrase = ['关键词','确认','修改','1','2'],
    KEYWORD = 'keyword',
    DESCRIPTION = 'descr',
    USERNAME = 'name',
    ERROR_RESTART = '出错啦！请重新开始...',
    STEPS_REPLY = ['请输入你的关键词',
                   '1确认 2修改',
                   '请输入你的描述',
                   '1确认 2修改',
                   '请输入你的姓名',
                   '1确认 2修改',
                   '下载校上行'];

// { ToUserName: 'gh_037eaffcc126',
//     FromUserName: 'o0XX20dfGVfXaS_AwyWYCz-IV2-g',
//     CreateTime: '1514529062',
//     MsgType: 'text',
//     Content: '关键词',
//     MsgId: '6504852790609083392' }

// 该表维护进度
var m = [];

function replyAdd(reply, user) {
    user['step'] ++;
    return reply;
}

function replyMinus(reply, user) {
    user['step'] --;
    return reply;
}

function findByUid(from, array) {
    var index,
        item;
    for (var i in array) {
        var p = array[i];
        if (p['id'] === from) {
            index = i;
            item = p;
            break;
        }
    }
    return [index, item];
}

async function getUser(openid) {
    var api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        var result = await api.getUser(openid);
        console.log(result);
        return result;
    } catch (e) {
        throw new Error(e);
    }
}

async function updateUserContent(_user, k) {
    // 把数据写入数据库操作
    var flag = '';
    var word = _user[k];
    var from = _user['id'];
    var user = await User.findOne({where:{fromUserName:from}});
    User.hasMany(Content, {foreignKey: 'fromUserName', sourceKey: 'fromUserName'});
    if (!user) {
        var info = await getUser(from);
        info['fromUserName'] = from;
        var obj = {};
        obj[k] = word;
        info['contents'] = [obj];
        user = await User.create(info, {include: [Content]});
        await user.save();
    } else  {
        var contents = await Content.findAll({where:{fromUserName:from}});
        if (k === KEYWORD) {  //插入关键词
            var exist = false;
            for (var i in contents) {
                var obj = contents[i];
                if (obj[k] === word && obj[DESCRIPTION].length > 0 && obj['status'] === 2) {
                    console.log(flag);
                    exist =true;
                    return '该关键词重复或已成功匹配，请重新输入';
                } else if ((obj[k] === word && obj[DESCRIPTION].length <= 0)) {
                    exist = true;
                    break;
                }
            }
            if (!exist || contents.length === 0) {
                console.log(`增加新的关键词'${word}'`);
                var obj = {};
                obj[k] = word;
                obj['fromUserName'] = from;
                var content = await Content.create(obj);
                contents.push(content);
            }
        } else if (k === DESCRIPTION) {  //更新描述
            var index = contents.length - 1;
            if (index < 0) {
                flag = ERROR_RESTART;
                return flag;
            }
            var obj = contents[index];
            obj[k] = word;
            await obj.save();
            contents[index] = obj;
        }
        user.contents = contents;
        await user.save();
    }
}

async function pairKeywords(_user, fid) {
    //开始匹配数据库
    var keyword = _user[KEYWORD],
        from = _user['id'];
    var pairContents = await Content.findAll({where:{keyword:keyword, status: 1}});
    if (pairContents.length > 0) { //成功找到匹配对象
        var found = false;
        for (var i in pairContents) {
            var pairContent = pairContents[i];
            if (pairContent.fromUserName !== from) {
                var pairA = await User.findOne({where:{fromUserName:from}});
                var pairB = await User.findOne({where:{fromUserName:pairContent.fromUserName}});
                var pair = await Pair.create({pairA_name: pairA.nickname, pairB_name: pairB.nickname, keyword: keyword});
                await pair.save();
                pairContent.status = 2;
                await pairContent.save();
                var myPair = await Content.findOne({where:{keyword:keyword, fromUserName: from}});
                myPair.status = 2;
                await myPair.save();
                console.log(`成功匹配'${pairA.nickname}'和'${pairB.nickname}'的关键词'${keyword}'`);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log('匹配失败');
        }
    } else {
        console.log('匹配失败');
    }
    m.splice(fid, 1);
}

function replyMessage() {
    return async (message, ctx) => {
        console.log(message);
        // 微信输入信息就是这个 message
        var from = message.FromUserName;
        var l = 1;
        // 如果该用户是新来的，就注册到映射表中
        var fid = 0,
            _user;
        if (m.length === 0) {
            _user = {"id":from, 'step':1};
            m = [_user];
        } else {
            var arr = findByUid(from, m);
            fid = arr[0];
            _user = arr[1];
            if (_user === undefined) {
                _user = {"id":from, 'step':1};
                fid = m.length;
                m.push(_user);
            } else {
                l = _user['step'];
            }
        }
        var content = message.Content,
            isInLength = (content.length > 0 && content.length < 4),
            isNotSystemPhrase = systemPhrase.indexOf(content) === -1,
            index = l - 1,
            reply = STEPS_REPLY[index];
        if (l === 1) {
            if (content === '关键词') {
                return replyAdd(reply, _user)
            }
            return '';
        } else if ((isInLength && isNotSystemPhrase && l === 2) || (content.length>0 && isNotSystemPhrase && (l === 4 || l === 6))) {
            //关键词长度不超过3个字，且不能是系统词汇
            var prop = '';
            if (l === 2) prop = KEYWORD;
            else if (l === 4) prop = DESCRIPTION;
            else prop = USERNAME;
            _user[prop] = content;
            return replyAdd(reply, _user);
        } else if (!isInLength && isNotSystemPhrase && l === 2) {
            return '关键词不超过3个字';
        } else if ((l === 3 || l === 5 || l === 7)) {
            if (content === '2') {
                //修改
                return replyMinus('请重新输入', _user);
            } else if (content === '1') {
                if (l === 3) {  //存储关键词
                    var rep = await updateUserContent(_user, KEYWORD);
                    if (rep !== undefined && rep.length > 0) {
                        return replyMinus(rep, _user);
                    }
                } else if (l === 5) { //存储关键词描述
                    var rep = await updateUserContent(_user, DESCRIPTION);
                    if (rep !== undefined && rep.length > 0) {
                        m.splice(fid, 1);
                        return rep;
                    }
                } else { //存储用户姓名
                    var user = await User.findOne({where: {fromUserName: from}});
                    user.user_name = _user[USERNAME];
                    await user.save();
                    await pairKeywords(_user, fid);
                }
                console.log('开始下一个描述');
                return replyAdd(reply, _user);
            } else {
                return '请回复1 或者 2';
            }
        } else {
            var _step = l-2 < 0 ? 0 : l-2;
            return `请回复问题'${STEPS_REPLY[_step]}'`;
        }
    };
}

module.exports = replyMessage;