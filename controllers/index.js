const wx = require('../wechat/generator'),
      generator = wx.generator,
      authToken = wx.getAccessToken,
      config = require('../config');

module.exports = {

    // 'GET /': async (ctx, next) => {
    //     console.log('auth begin...');
    //     await authToken();
    //     var
    //         token = config.wechat.token,
    //         signature = ctx.query.signature,
    //         nonce = ctx.query.nonce,
    //         timestamp = ctx.query.timestamp,
    //         echostr = ctx.query.echostr,
    //         str = [token,timestamp,nonce].sort().join(''), //按字典排序，拼接字符串
    //         sha = require('crypto').createHash('sha1').update(str).digest('hex'), //加密
    //         data = (sha === signature)? echostr + '' : 'failed';
    //     ctx.response.body = data; //比较并返回结果
    //     await next();
    // },
    //
    // 'GET /accessToken': async (ctx, next) => {
    //     await authToken();
    // },
    //
    // 'POST /': async (ctx, next) => {
    //     console.log(ctx.request);
    //     console.log(ctx.response);
    //     ctx.response.body = '1';
    //     await next();
    // }

};