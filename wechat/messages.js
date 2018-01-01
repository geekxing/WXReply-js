const User = require('../models/User');
const Content = require('../models/Content');
const Pair = require('../models/Pair');
const API = require('co-wechat-api');
const config = require('../config');
const db = require('../db');

let systemPhrase = ['巴士','确认','修改','1','2'],
    KEYWORD = 'keyword',
    DESCRIPTION = 'descr',
    USERNAME = 'name',
    ERROR_RESTART = '出错啦！请重新开始...';

// { ToUserName: 'gh_037eaffcc126',
//     FromUserName: 'o0XX20dfGVfXaS_AwyWYCz-IV2-g',
//     CreateTime: '1514529062',
//     MsgType: 'text',
//     Content: '关键词',
//     MsgId: '6504852790609083392' }

// 该表维护进度
var m = [];

function STEPS_REPLY(_user, index) {
    var keyword = _user[KEYWORD];
    if (index === 0) {
        return `欢迎你乘坐18号巴士！
为了找到你这次旅途的旅伴
快来输入你的【关键词】吧~
例如：减肥/考研/健身/考雅思/学习/变帅（不可以超过三个字哦）`;
    } else if (index === 1) {
        return `你的关键词是：
        
${keyword}

确定 回复【1】	修改 回复【2】
注意：一旦确定，将无法再次修改哦！`;
    } else if (index === 2) {
        return `为什么以  ${keyword}  作为你的2018关键词呢？
描述一下它吧~（建议50~200字）
你详尽丰富的描述可以让Ta对你的了解更多呦~`;
    } else if (index === 3) {
        return `你的【关键词描述】：

${_user[DESCRIPTION]}

确认 回复【1】	修改 回复【2】`;
    } else if (index === 4) {
        return `输入你的【姓名】+【学院】+【专业】吧~
注意：一定是真实姓名，对方才可以找到你哦~`;
    } else if (index === 5) {
        return `你的名字、学院及专业：
        
${_user[USERNAME]}

确认 回复【1】 修改 回复【2】`;
    } else if (index === 6) {
        return `车票已经预定成功，系统正在为你匹配旅伴中，请耐心等候Ta的出现哦！
为了确保所有的参与同学均是江南大学学生，只有使用校上行APP，才可以找到彼此哦！
【校上行】是由江南大学在校生自主开发的一款社交APP，目前只对江南大学用户开放哦！在这里，你可以结识全校的任何一位同学，「校友通讯录」中精细分类学院、专业、年级，让你校内找人从此不再是难事！你也可以加入「壹周约行」，和校友一起约吃饭运动看电影打游戏……打破你有限的人际圈，结识更多新同学~先戳这里http://a.app.qq.com/o/simple.jsp?pkgname=com.xiaoshangxing 
下载【校上行】，在校上行APP里等待那个和你关键词一样的旅伴，开启你们的18号巴士之旅吧！
你也可以先回复“看关键词” 看看别人的关键词。系统将随机为你发送五个他人的关键词，你可以选择一个你感兴趣的同学，去校上行跟他say hi哦~`;
    }
}

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
    console.log(`get user info with ${openid}`);
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
        var info;
        if (k === KEYWORD) {  //插入关键词
            info = await getUser(from);
            var exist = false;
            for (var i in contents) {
                var obj = contents[i];
                if (obj[k] === word && obj[DESCRIPTION].length > 0) {
                    exist = true;
                    if (obj['status'] === 2) {
                        console.log(flag);
                        return '该关键词重复或已成功匹配，请重新输入';
                    } else if (obj['status'] === 1) {
                        break;
                    }
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
            info['contents'] = contents;
            await user.update(info);
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
            await user.update({contents: contents});
        }
    }
}

async function pairKeywords(_user, fid) {
    //开始匹配数据库
    var keyword = _user[KEYWORD],
        from = _user['id'];
    var pairContents = await Content.findAll({where:{keyword:keyword, status: 1}});
    if (pairContents.length > 1) { //匹配必须有俩人以上，成功找到匹配对象
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

/* 洗牌算法 */
Array.prototype.shuffle = function () {
    var arr = this;
    var input = [];

    for (var i = 0, len = arr.length; i < len; i++) {
        var j = Math.floor(Math.random() * arr.length);
        input[i] = this[j];
        arr.splice(j, 1);
    }
    console.log(input);
    return input;
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
        if (message.Content === undefined) {
            return '';
        }
        var content = message.Content,
            isInLength = (content.length > 0 && content.length < 4),
            isNotSystemPhrase = systemPhrase.indexOf(content) === -1,
            index = l - 1,
            reply = STEPS_REPLY(_user, index);
        //看关键词是优先级最高的
        if (content === '巴士') {
            _user['step'] = 1;
            delete _user['look'];
            delete _user['lookKeys'];
            return replyAdd(STEPS_REPLY(_user, index), _user)
        } else if (content === '看关键词') {
            _user['look'] = true;
            var list = await db.sequelize.query('SELECT DISTINCT(keyword) FROM contents');
            var keyArr = list[0];
            console.log(keyArr);
            var keyArr_5 = [];
            if (keyArr.length > 5) {
                //从数组中随机选5个值
                keyArr_5 = keyArr.shuffle().slice(0, 5);
            } else {
                keyArr_5 = keyArr;
            }
            var keyStr = '';
            for (var i in keyArr_5) {
                var keyword = keyArr_5[i]['keyword'];
                if (keyword !== undefined) {
                    keyStr += `${keyword}\n`;
                }
            }
            keyStr += '\n选择一个你喜欢的关键词去校上行APP里和TA say hi 吧或者发送【看关键词】换一组'
            _user['lookKeys'] = keyStr;
            console.log(keyStr);
            return keyStr;
        } else if (_user['look'] === true && _user['lookKeys'].length > 0) {
            if (!isNotSystemPhrase) return '';
            //用户在看一看之后回复了关键词
            var keyStr = _user['lookKeys'];
            var keyArr = keyStr.split('\n');
            console.log(keyArr);
            delete _user['look'];
            delete _user['lookKeys'];
            if (keyArr.indexOf(content) !== -1) {
                //展示关键词的1, 2, 3
                User.hasMany(Content, {foreignKey: 'fromUserName', sourceKey: 'fromUserName'});
                var key = await Content.findOne({where:{keyword:content}});
                var user = await User.findOne({where:{fromUserName:key.fromUserName}});
                return `关键词：${key.keyword}\n描述：${key.descr}\n姓名：${user.user_name}`;
            }
            return '';
        } else if (l === 1) {
            return '';
        } else if ((isInLength && isNotSystemPhrase && l === 2) || (content.length>0 && isNotSystemPhrase && (l === 4 || l === 6))) {
            //关键词长度不超过3个字，且不能是系统词汇
            var prop = '';
            if (l === 2) prop = KEYWORD;
            else if (l === 4) prop = DESCRIPTION;
            else prop = USERNAME;
            _user[prop] = content;
            reply = STEPS_REPLY(_user, index);
            return replyAdd(reply, _user);
        } else if (!isInLength && isNotSystemPhrase && l === 2) {
            return '关键词不超过3个字';
        } else if ((l === 3 || l === 5 || l === 7)) {
            if (content === '2') {
                //修改
                var field = '';
                if (l === 3) field = '【关键词】';
                else if (l === 5) field = '【关键词描述】';
                else  field = '【姓名】+【学院与专业】';
                return replyMinus(`重新输入你的${field}吧`, _user);
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
            return `请回复'${STEPS_REPLY(_user, _step)}'`;
        }
    };
}

module.exports = replyMessage;