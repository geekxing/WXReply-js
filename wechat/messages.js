const User = require('../models/User');
const API = require('co-wechat-api');
const config = require('../config');

let systemPhrase = ['同桌','确认','修改','1','2'],
    USERINFO = 'user_name',
    SEX = 'sex_input',
    SELFDESCR = 'self_descr',
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
    if (index === 0) {
        return `终于等到你
我的江南同桌
在这里~
你可以匹配到你的江南大学专属同桌喔
为了能找到你的同桌
快来输入你的【姓名】+【学院】+【专业】吧
例如：王大锤+设计学院+视觉传达
注意：一定要是真实姓名哦，不然你的同桌是找不到你的哦`;
    } else if (index === 1) {
        var uinfo = _user[USERINFO];
        return `你的【姓名】+【学院】+【专业】是：

${uinfo}

确定 回复【1】	修改 回复【2】
注意：一旦确定，将无法再次修改哦！`;
    } else if (index === 2) {
        return `你是男孩子还是女孩子呢
我们会给你匹配一个异性同桌喔
快来输入你的【性别】吧
例如：男生/女生;`
    } else if (index === 3) {
        return `你的【性别】：

${_user[SEX]}

确认 回复【1】	修改 回复【2】`;
    } else if (index === 4) {
        return `好啦，你的新同桌快要到你面前啦
做一个简单的【自我介绍】吧
（建议20~200字）
让你的同桌可以更加了解你
你详尽丰富的自我介绍可以让Ta对你的了解更多呦~`;
    } else if (index === 5) {
        return `你的自我介绍

${_user[SELFDESCR]}

确认 回复【1】 修改 回复【2】`;
    } else if (index === 6) {
        return `正在为你匹配你的江南同桌，你会在24小时内收到你的同桌信息哦！
这是一个只有江南大学的学生才可以参加的活动，为了确保所有的参与同学均是江南大学学生，只有使用校上行APP，才可以找到彼此哦！
【校上行】是由江南大学在校生自主开发的一款社交APP！在这里，你可以结识全校的任何一位同学，「校友通讯录」中精细分类学院、专业、年级，让你校内找人从此不再是难事！你也可以加入「壹周约行」，和校友一起约吃饭运动看电影打游戏……打破你有限的人际圈，结识更多新同学~先戳这里http://a.app.qq.com/o/simple.jsp?pkgname=com.xiaoshangxing 
下载【校上行】，在校上行APP里等待你的江南同桌出现吧！`;
    }
}

function propNameByStep(l) {
    var prop = '';
    if (l === 2) prop = USERINFO;
    else if (l === 4) prop = SEX;
    else prop = SELFDESCR;
    return prop;
}

function propLengthLimitAlertByStep(l) {
    var propLengthLimitAlert = '';
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
    var index, item;
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
    var value = _user[k];
    var from = _user['id'];
    var user = await User.findOne({where:{fromUserName:from}});
    if (!user) {
        var info = await getUser(from);
        info['fromUserName'] = from;
        info[k] = value;
        user = await User.create(info);
    } else  {
        user[k] = value;
    }
    await user.save();
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
            isNotSystemPhrase = systemPhrase.indexOf(content) === -1,
            index = l - 1,
            reply = STEPS_REPLY(_user, index);
        // Part 1
        if (l === 1 && content === '任务') {
            var now = new Date();
            console.log(now);
            var day = now.getDay();
            if (day === 1) {
                return '任务一';
            } else if (day === 2) {
                return '任务二';
            } else if (day === 3) {
                return '任务三';
            } else if (day === 4) {
                return '任务四';
            } else if (day === 5) {
                return '任务五';
            } else  {
                return '今天暂无任务';
            }
        }
        // Part 2
        else if (l === 1 && content === '举报') {
            _user['jubao'] = 1;
            return '请回复【对方名字】+【聊天截图/经过描述】完成举报操作';
        } else if (l === 1 && _user['jubao'] === 1) {
            delete _user['jubao'];
            return '系统已经收到你的举报信息啦。很遗憾给你带来不好的体验，一经核实我们将会拒绝他参与校上行后续的所有活动！';
        }
        // Part 3
        else if (content === '同桌') {
            _user['step'] = 1;
            return replyAdd(STEPS_REPLY(_user, 0), _user)
        } else if (l === 1) {
            return '';
        } else if (content.length>0 && isNotSystemPhrase && (l === 2 || l === 4 || l === 6)) {
            //关键词长度不超过3个字，且不能是系统词汇
            var alert = propLengthLimitAlertByStep(l);
            if (l === 2 && content.length > 50) {
                return alert;
            } else if (l === 4 && (content !== '男生' && content !== '女生')) {
                return alert;
            } else if (l === 6 && (content.length < 10 || content.length > 800)) {
                return alert;
            }
            var prop = propNameByStep(l);
            _user[prop] = content;
            reply = STEPS_REPLY(_user, index);
            return replyAdd(reply, _user);
        } else if ((l === 3 || l === 5 || l === 7)) {
            if (content === '2') {
                //修改
                var field = '';
                if (l === 3) field = '【姓名】+【学院】+【专业】';
                else if (l === 5) field = '【性别】';
                else  field = '【自我介绍】';
                return replyMinus(`重新输入你的${field}吧`, _user);
            } else if (content === '1') {
                var prop = propNameByStep(l-1);
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
            var _step = l-2 < 0 ? 0 : l-2;
            return `请回复'${STEPS_REPLY(_user, _step)}'`;
        }
    };
}

module.exports = replyMessage;