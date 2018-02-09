const User = require('../models/User');
const Voice = require('../models/Voice').Voice;
const UserVoices = require('../models/Voice').UserVoices;
const API = require('co-wechat-api');
const config = require('../config');
const Op = require('../db').Op;

let systemPhrase = ['打电话', '听电话', '确认','修改','1','2'],
    MEDIA = 'media_id',
    MEDIA_DESCR = 'descr',
    USERINFO = 'user_name',
    LISTEN_LIST = 'listen_list',
    ERROR_RESTART = '出错啦！请重新开始...',
    ERRPR_LISTEN_LIMIT = '已经听电话3次了';

// { ToUserName: 'gh_037eaffcc126',
//     FromUserName: 'o0XX20dfGVfXaS_AwyWYCz-IV2-g',
//     CreateTime: '1514529062',
//     MsgType: 'text',
//     Content: '关键词',
//     MsgId: '6504852790609083392' }

// 该表维护进度
let m = [];

User.belongsToMany(Voice, { through: UserVoices, foreignKey: 'fromUserName'});
Voice.belongsToMany(User, { through: UserVoices, foreignKey: 'media_id'});

function STEPS_REPLY(_user, index) {
    if (index === 0) {
        return `请录入你的声音`;
    } else if (index === 1) {
        return `声音 
${_user[MEDIA]}
确定 回复【1】	修改 回复【2】`;
    } else if (index === 2) {
        return `请输入一段【声音描述】吧`
    } else if (index === 3) {
        return `你的【声音描述】：

${_user[MEDIA_DESCR]}

确认 回复【1】	修改 回复【2】`;
    } else if (index === 4) {
        return `请输入【个人信息】`;
    } else if (index === 5) {
        return `你的自我介绍

${_user[USERINFO]}

确认 回复【1】 修改 回复【2】`;
    } else if (index === 6) {
        return `第三期活动
【校上行】是由江南大学在校生自主开发的一款社交APP！在这里，你可以结识全校的任何一位同学，「校友通讯录」中精细分类学院、专业、年级，让你校内找人从此不再是难事！你也可以加入「壹周约行」，和校友一起约吃饭运动看电影打游戏……打破你有限的人际圈，结识更多新同学~先戳这里http://a.app.qq.com/o/simple.jsp?pkgname=com.xiaoshangxing 
下载【校上行】，在校上行APP里等待你的江南同桌出现吧！`;
    }
}

function receiveCallReply(num) {
    return `这是第${num}通`;
}

function propNameByStep(l) {
    var prop = '';
    if (l === 2) prop = MEDIA;
    else if (l === 4) prop = MEDIA_DESCR;
    else prop = USERINFO;
    return prop;
}

function propLengthLimitAlertByStep(l) {
    let propLengthLimitAlert = '';
    if (l === 2) propLengthLimitAlert = `长度不能超过50个字`;
    else if (l === 4) propLengthLimitAlert = `请输入男生/女生`;
    else propLengthLimitAlert = `长度在10-800字之间`;
    return propLengthLimitAlert;
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
    let index, item;
    for (let i in array) {
        let p = array[i];
        if (p['id'] === from) {
            index = i;
            item = p;
            break;
        }
    }
    return [index, item];
}

//生成从minNum到maxNum的随机数
function randomNum(minNum,maxNum){
    switch(arguments.length){
        case 1:
            return parseInt(Math.random()*minNum+1,10);
            break;
        case 2:
            return parseInt(Math.random()*(maxNum-minNum+1)+minNum,10);
            break;
        default:
            return 0;
            break;
    }
}

async function getUser(openid) {
    console.log(`get user info with ${openid}`);
    let api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        let result = await api.getUser(openid);
        console.log(result);
        return result;
    } catch (e) {
        throw new Error(e);
    }
}

async function getMedia(mediaId) {
    console.log(`下载语音 ${mediaId}`);
    let api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        let result = await api.getMedia(mediaId);
        console.log(result);
        return result;
    } catch (e) {
        throw new Error(e);
    }
}

async function uploadVoice(filepath) {
    console.log(`上传语音... `);
    let api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        let result = await api.uploadVoiceMedia(filepath);
        console.log(result);
        return result;
    } catch (e) {
        throw new Error(e);
    }
}

async function sendVoice(openid, mediaId) {
    let api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        let result = await api.sendVoice(openid, mediaId);
        console.log(result);
        return result;
    } catch (e) {
        throw new Error(e);
    }
}

async function sendText(openid, text) {
    let api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        let result = await api.sendText(openid, text);
        console.log(result);
        return result;
    } catch (e) {
        throw new Error(e);
    }
}

async function updateUserContent(_user, k) {
    // 把数据写入数据库操作
    let value = _user[k];
    let from = _user['id'];
    let user = await User.findOne({where:{fromUserName:from}});
    if (!user) {
        let info = await getUser(from);
        info['fromUserName'] = from;
        user = await User.create(info);
    }
    if (k === MEDIA) {
        let obj = {};
        obj[k] = value;
        obj['author'] = from;
        let voice = await Voice.create(obj);
        user.addVoice(voice);
        return;
    } else if (k === MEDIA_DESCR) {
        let contents = await Voice.findAll({where:{author:from}});
        if (contents.length > 0) {
            let index = contents.length - 1;
            let obj = contents[index];
            obj[k] = value;
            await obj.save();
            contents[index] = obj;
            await user.update({contents: contents});
        }
        return;
    } else if (k === USERINFO) {
        user[k] = value;
    }
    await user.save();
}

async function receiveCall(_user) {
    let from = _user["id"];
    let user = await User.findOne({where:{fromUserName:from}});
    // 从数据库中找该用户已经听过的所有录音的media_id s
    let listenedMedias = await user.getVoices({ where: { author:{[Op.ne]: from }}, attributes: ['media_id']});
    let listenedMediaIds = [];
    listenedMedias.forEach(function (element) {
       listenedMediaIds.push(element.media_id);
    });
    if (listenedMediaIds.length >= 3) {
        return ERRPR_LISTEN_LIMIT;
    }
    console.log(listenedMediaIds);
    // 从数据库中查找 1.没有听过 2.有描述的 3.别人的 录音
    let contents = await Voice.findAll({ where: {[Op.and]: [
                { author:{[Op.ne]: from }},
                { media_id: {[Op.notIn]: listenedMediaIds }},
                { descr: {[Op.not]: null}}
            ] }});
    if (contents.length > 0) {
        // 在查找结果中随机取一个播放
        let voice = contents[randomNum(0, contents.length-1)];
        // 存入听电话的media_id
        _user[LISTEN_LIST] = voice.media_id;
        await user.addVoice(voice);
        await sendVoice(from, voice.media_id);
        if (voice.descr !== null) {
            await sendText(from, voice.descr);
        }
        return receiveCallReply(listenedMediaIds.length + 1);
    }
    return '你已经听完了全部的录音';
}

function replyMessage() {
    return async (message, ctx) => {
        console.log(message);
        // 微信输入信息就是这个 message
        let from = message.FromUserName;
        let l = 1;
        // 如果该用户是新来的，就注册到映射表中
        let fid = 0,
            _user;
        if (m.length === 0) {
            _user = {"id":from, 'step':1};
            m = [_user];
        } else {
            let arr = findByUid(from, m);
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
        if (message.MsgType === 'text' && message.Content === undefined) {
            return '';
        }
        let content = message.MsgType === 'text' ? message.Content : '',
            isNotSystemPhrase = systemPhrase.indexOf(content) === -1,
            index = l - 1,
            wenxinTip = '活动报名已截止，请持续关注校上行公众号后续精彩内容',
            reply = STEPS_REPLY(_user, index);

        // Part 1
        if (l === 1 && content === '举报') {
            _user['jubao'] = 1;
            return '请回复【对方名字】+【聊天截图/经过描述】完成举报操作';
        } else if (l === 1 && _user['jubao'] === 1) {
            delete _user['jubao'];
            return '系统已经收到你的举报信息啦。很遗憾给你带来不好的体验，一经核实我们将会拒绝他参与校上行后续的所有活动！';
        }
        // Part 2
        if (content === '听电话') {
            _user['listen'] = 1;
            let res = await receiveCall(_user);
            return res;
        } else if (_user['listen'] && content !== '打电话') {
            let listenedMedias = await user.getVoices({ where: { author:{[Op.ne]: from }}});
            if (['1', '2', '3'].indexOf(content) != -1) {
                let index = ['1', '2', '3'].indexOf(content);
                if (index+1 > listenedMedias.length) {
                    return receiveCallReply(index-1);
                } else {
                    let voice = listenedMedias[index];
                    let user = voice.getUsers({where: {author: voice.author}});
                    return `${user.user_name}  
                               下载APP, "听电话继续"`;
                }
            } else {
                return receiveCallReply(listenedMedias.length);
            }
        }
        // Part 3
        if (content === '打电话') {
            delete _user['listen'];
            _user['step'] = 1;
            return replyAdd(STEPS_REPLY(_user, 0), _user)
        } else if (l === 1) {
            return '';
        } else if (l === 2 && message.MsgType === 'voice') {
            let prop = propNameByStep(l);
            _user[prop] = message.MediaId;
            return replyAdd(STEPS_REPLY(_user, index), _user);
        } else if (content.length>0 && isNotSystemPhrase && (l === 4 || l === 6)) {
            //关键词长度不超过3个字，且不能是系统词汇
            let prop = propNameByStep(l);
            _user[prop] = content;
            reply = STEPS_REPLY(_user, index);
            return replyAdd(reply, _user);
        } else if ((l === 3 || l === 5 || l === 7)) {
            if (content === '2') {
                //修改
                let field = '';
                if (l === 3) field = '【声音】';
                else if (l === 5) field = '【声音描述】';
                else  field = '【个人信息】';
                return replyMinus(`请重新输入${field}`, _user);
            } else if (content === '1') {
                let prop = propNameByStep(l-1);
                if (l === 3) {
                    let filepath = await getMedia(_user[prop]);
                    if (filepath) {
                        let res = await uploadVoice(filepath);
                        if (!res) {
                            return replyMinus('服务器开小差了，请重新录入语音...', _user);
                        }
                    }
                }
                await updateUserContent(_user, prop);
                if (l === 7) {
                    m.splice(fid, 1);
                }
                console.log('开始下一个描述');
                return replyAdd(reply, _user);
            } else {
                return '请回复1 或者 2';
            }
        } else {
            let _step = l-2 < 0 ? 0 : l-2;
            return `请回复'${STEPS_REPLY(_user, _step)}'`;
        }
    };
}

module.exports = replyMessage;