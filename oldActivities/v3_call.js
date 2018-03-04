const User = require('../models/User');
const Voice = require('../models/Voice').Voice;
const UserVoices = require('../models/Voice').UserVoices;
const API = require('co-wechat-api');
const config = require('../config');
const Op = require('../db').Op;
var fs = require('fs');

const IDX_K = 'K',
    IDX_L = 'L',
    IDX_M = 'M',
    IDX_N = 'N';

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

// 打电话的回复
function STEPS_REPLY(_user, index) {
    if (index === 0) {
        return `你好，同学
这是江南大学「校园电话亭」
谢谢你愿意和我分享一段声音
现在就请你拿起手机收集吧
使用对话框，发送语音即可

鼠标声音、键盘声、电视机声、开门声、车流声…
亦或是你的一些想法~

注意语音时长不要超过59s~`;
    } else if (index === 1) {
        return `你确定好这就是你要分享的声音了吗？
        
确定请回复【1】
需要修改请回复【2】`;
    } else if (index === 2) {
        return `校园电话亭已经收到你的声音啦
现在，你可以给这段声音加一段描述~

你的心情、想法、状态、你看到的景象或是一个小故事
(注意4-200字的字数限制哦~)`
    } else if (index === 3) {
        return `你的描述是：

${_user[MEDIA_DESCR]}

你确定好这段描述作为你声音的名片了吗？

确定请回复【1】
需要修改请回复【2】`;
    } else if (index === 4) {
        return `好喜欢你的这段声音啊!
我想你也一定是个有趣的人
留下你的学院专业还有姓名吧

例如：
设计学院 视觉传达 王汤姆

这样喜欢你这段语音的同学
就可以通过校上行APP找到你啦~`;
    } else if (index === 5) {
        return `你填写的信息是：

${_user[USERINFO]}

你确定这是你正确的信息吗
别让“循声而来”的小哥哥/小姐姐失望呀

确定请回复 【1】
需要修改请回复 【2】`;
    } else if (index === 6) {
        return `你已经成功分享这段声音啦
短短一段声波又会钻入谁的耳朵，触动谁的内心呢
如果听到你这段语音的同学对你感兴趣的话，Ta会通过校上行APP找到你哦~

你可以先下载校上行APP，并且实名认证，等待着Ta的出现…
你也先可以回复 【听电话】 ，听听别人的故事

校上行APP是由江南大学在校生自主开发的一款社交APP！在这里，你可以结识全校的任何一位同学，「校友通讯录」中精细分类学院、专业、年级，让你校内找人从此不再是难事！你也可以加入「壹周约行」，和校友一起约吃饭运动看电影打游戏……打破你有限的人际圈，结识更多新同学~先戳这里

下载链接： http://a.app.qq.com/o/simple.jsp?pkgname=com.xiaoshangxing`;
    }
}

// 听电话的回复
function receiveCallReply(idx, obj) {
    if (idx === IDX_K) {
        return `这是你收到的第${obj}段声音
回复【听电话】你将获取下一段声音
回复【${obj}】你将获得这段声音的主人信息

注意哦，你最多可以：
-收听3段声音
-获取1位主人的信息`;
    } else if (idx === IDX_L) {
        return `Ta的信息：

${obj.user_name}

有趣的灵魂不多 ，那就别错过~
快记下感兴趣的声音的主人信息
使用「校上行」APP去「校友通讯录」里找到他吧！
下载链接： http://a.app.qq.com/o/simple.jsp?pkgname=com.xiaoshangxing`;
    }
    return '';
}

function jubaoReply(idx, obj) {
    if (idx === IDX_M) {
        return `空音？涉嫌黄赌毒？太好听以致耳朵意外怀孕？……
回复【1】或者【2】或者【3】举报你所听到的第几通声音
例如你想举报第1通电话
回复数字【1】即可`;
    } else if (idx === IDX_N) {
        return `亲爱的同学，我们已收到你的举报
我们将认真审核，严肃处理               
对你造成困扰我们在此诚挚道歉
祝你在这里玩得开心~`;
    }
    return '';
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
    if (l === 4) propLengthLimitAlert = `描述长度在4-200字之间`;
    else propLengthLimitAlert = ``;
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

function write(filepath, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filepath, data, (err) => {
            if (err) {
                reject(err);
            }
            resolve(console.log('写入完成'))
        });

    })
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
        let result = await api.getMaterial(mediaId);
        console.log(result);
        let filePath = `wechat/mediaLib/${mediaId}.txt`;
        await write(filePath, result);
        return filePath;
    } catch (e) {
        throw new Error(e);
    }
}

async function uploadVoice(filepath) {
    console.log(`上传语音... `);
    let api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        let result = await api.uploadVoiceMaterial(filepath);
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
    if (!user) {
        let info = await getUser(from);
        info['fromUserName'] = from;
        user = await User.create(info);
    }
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
    // 从数据库中查找 1.没有听过 2.有描述的 3.别人的 4.没有被核实举报的 录音
    let contents = await Voice.findAll({ where: {[Op.and]: [
                { author:{[Op.ne]: from }},
                { media_id: {[Op.notIn]: listenedMediaIds }},
                { descr: {[Op.not]: null}},
                { forbidden: {[Op.eq] : false}}
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
        return receiveCallReply(IDX_K, listenedMediaIds.length + 1);
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
            reply = STEPS_REPLY(_user, index);

        // Part 1
        if (content === '举报') {
            return '「校园电话亭」活动已经结束啦~';
            delete _user['listen'];
            _user['jubao'] = 1;
            return jubaoReply(IDX_M);
        } else if (_user['jubao'] === 1 && ['1', '2', '3'].indexOf(content) !== -1) {
            let user = await User.findOne({where:{fromUserName:from}});
            let listenedMedias = await user.getVoices({ where: { author:{[Op.ne]: from }}});
            let index = ['1', '2', '3'].indexOf(content);
            if (index+1 > listenedMedias.length) {
                return '你还没有听这么多通电话呢';
            } else {
                delete _user['jubao'];
                let voice = listenedMedias[index];
                // 1 表示已经被举报的录音
                voice.status = 1;
                await voice.save();
                return jubaoReply(IDX_N);
            }
        } else if (_user['jubao'] === 1 && content !== '听电话' && content !== '打电话') {
            return jubaoReply(IDX_M);
        }
        // Part 2
        if (content === '听电话') {
            return '「校园电话亭」活动已经结束啦~';
            delete _user['jubao'];
            _user['listen'] = 1;
            let recv = await receiveCall(_user);
            return recv;
        } else if (_user['listen'] && content !== '打电话') {
            let user = await User.findOne({where:{fromUserName:from}});
            let listenedMedias = await user.getVoices({ where: { author:{[Op.ne]: from }}});
            if (['1', '2', '3'].indexOf(content) !== -1) {
                let index = ['1', '2', '3'].indexOf(content);
                if (index+1 > listenedMedias.length) {
                    return receiveCallReply(IDX_K, listenedMedias.length);
                } else {
                    let checkedVoice = await UserVoices.findOne({where: {fromUserName: user.id, checked: true}});
                    if (checkedVoice === null) {
                        let voice = listenedMedias[index];
                        let user = await User.findOne({where: {fromUserName: voice.author}});
                        let userVoice = await UserVoices.findOne({where: {media_id: voice.id}});
                        userVoice.checked = true;
                        await userVoice.save();
                        return receiveCallReply(IDX_L, user);
                    } else {
                        return '你已经查看过一次别人的个人信息啦';
                    }
                }
            } else {
                return receiveCallReply(IDX_K, listenedMedias.length);
            }
        }
        // Part 3
        if (content === '打电话') {
            return '「校园电话亭」活动已经结束啦~';
            delete _user['listen'];
            delete _user['jubao'];
            _user['step'] = 1;
            return replyAdd(STEPS_REPLY(_user, 0), _user)
        } else if (l === 1) {
            return '';
        } else if (l === 2 && message.MsgType === 'voice') {
            let prop = propNameByStep(l);
            _user[prop] = message.MediaId;
            return replyAdd(STEPS_REPLY(_user, index), _user);
        } else if (content.length>0 && isNotSystemPhrase && (l === 4 || l === 6)) {
            let alert = propLengthLimitAlertByStep(l);
            if (l === 4 && (content.length < 2 || content.length > 500)) {
                return alert;
            }
            //关键词长度不超过3个字，且不能是系统词汇
            let prop = propNameByStep(l);
            _user[prop] = content;
            reply = STEPS_REPLY(_user, index);
            return replyAdd(reply, _user);
        } else if ((l === 3 || l === 5 || l === 7)) {
            if (content === '2') {
                //修改
                let field = '';
                if (l === 3) field = '现在请重新发一段语音吧：';
                else if (l === 5) field = `现在请重新输入你的声音的描述吧：`;
                else  field = `请重新输入你的学院专业姓名信息吧~

例如：
设计学院 视觉传达 王汤姆`;
                return replyMinus(field, _user);
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
            if (_step === 0) {
                return `请回复一段语音`;
            }
            return `请回复'${STEPS_REPLY(_user, _step)}'`;
        }
    };
}

module.exports = replyMessage;