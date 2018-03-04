

function replyMessage() {
    return async (message, ctx) => {
        console.log(message);
        // 微信输入信息就是这个 message
        let from = message.FromUserName;
        if (message.MsgType === 'text' && message.Content === undefined) {
            return '';
        }
        let content = message.MsgType === 'text' ? message.Content : '',
            index = l - 1;
        if (content === `玫瑰行动`) {
            return `想知道「玫瑰行动」的暗号吗？
偷偷告诉你，可不要告诉别人哦！
 
小哥哥说上句：在哪里遇见Ta？ 
你需要接下句：来这里遇见Ta
 
记住了吗？
「来这里遇见Ta 」`;
        }
    };
}

module.exports = replyMessage;