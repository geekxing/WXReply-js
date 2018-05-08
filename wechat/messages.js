

function replyMessage() {
    return async (message, ctx) => {
        console.log(message);
        // 微信输入信息就是这个 message
        if (message.MsgType === 'text' && message.Content === undefined) {
            return '';
        }
        if (message.MsgType === 'event') {
            return replyEvent(message);
        }
        let content = message.MsgType === 'text' ? message.Content : '';
        if (content === `七天情侣`) {
            return [article];
        } else {
            return '';
        }
    };
}

let article = {
    title:"校上行「七天情侣5.0」| 打个赌吧：今年520不再一个人！",
    description: '谈恋爱还能拿iPhone X ？',
    picurl: 'http://mmbiz.qpic.cn/mmbiz_jpg/5kOu9Zp6NhYxxI85UFu7BiaLWeEa1s5LA28XibW1KtEqJ1c5oZyI3at0pV1MMQOZy3r4KicM9oyA85sUPmvLlIh6Q/0?wx_fmt=jpeg',
    url: 'http://mp.weixin.qq.com/s?__biz=MzIwOTM4NjYxOQ==&mid=100003658&idx=1&sn=471775ccc196b19856597055b55adf65&chksm=1775e25e20026b4894314be694ad7d4fcae1e92698aa24fac57f7199e67db3f427fced6cf3a5#rd'
}


function replyEvent(message) {
    if (message.Event === `subscribe`) {
        return [article];
    } else if (message.Event === 'CLICK') {
        if (message.EventKey === 'V1001_INTRO') {
            return `嘿！同学
这里是校上行团队
我们是一支来自江南大学的大学生创业团队
拥有成熟的负责产品、设计、技术、运营的同学
术业有专攻的我们因为同样的梦想聚到校上行

持续性踌躇满志，间歇性嬉闹玩乐
沉迷工作头发少，热血少年想法多

我们致力于通过更多有趣的活动
让同学们遇见更多有趣的人
毕竟，这个世界本来就属于有趣的人`;
        } else if (message.EventKey === 'V1001_CORPORATION') {
            return `校上行——江南大学专属校园约行社交平台，我们是江南最专业的校园团队。在这里，无论你是企业、商家还是社团，无论是推广、策划还是设计，校上行通通帮你搞定啦~详情请咨询微信18106172027`;
        } else if (message.EventKey === 'V1001_JOINUS') {
            return `如果你也是一位有趣的青年
如果你也想一起做一些有趣的事情
如果你也想一起把这个世界变得更加有趣
校上行已经等你好久啦~
详情可咨询微信18106172027
或者直接发送你的简历至hr@xiaoshangxing.com 
和校上行一起激情热聊，逐梦校园！`;
        }
    } else {
        return '';
    }
}

module.exports = replyMessage;
//
// {
//     "button": [
//     {
//         "type": "view_limited",
//         "name": "七天情侣",
//         "media_id": "2l6QmkWO-Tb_hFO_8ZSyPx0CnbBwm27aDasoPDtCu-4"
//     },
//     {
//         "name": "关于我们",
//         "sub_button": [
//             {
//                 "type": "click",
//                 "name": "团队简介",
//                 "key": "V1001_INTRO"
//             },
//             {
//                 "type": "click",
//                 "name": "校园合作",
//                 "key": "V1001_CORPORATION"
//             },
//             {
//                 "type": "click",
//                 "name": "加入我们",
//                 "key": "V1001_JOINUS"
//             }
//         ]
//     },
//     {
//         "type": "view",
//         "name": "APP下载",
//         "url": "http://a.app.qq.com/o/simple.jsp?pkgname=com.xiaoshangxing"
//     }
// ]
// }