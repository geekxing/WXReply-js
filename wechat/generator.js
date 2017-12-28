const crypto = require('crypto'),
      hash = crypto.createHash('sha1'),
      accessTokenJson = require('./access_token'),
      request = require('request'), //引入 htts 模块
      wechat = require('../config').wechat;
      fs = require('mz/fs');


let _WECHAT_API = 'https://api.weixin.qq.com/cgi-bin/token';

function generator() {
    return async (ctx, next) => {
        await next();
    }
}

function getAccessToken() {
    var dict ={ grant_type: 'client_credential',
                appid: wechat.appid,
                secret: wechat.appSecret };
    return new Promise(function(resolve,reject){
        //获取当前时间
        var currentTime = new Date().getTime();
        //判断 本地存储的 access_token 是否有效
        if(accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime){
            //格式化请求地址
            var url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${dict.appid}&secret=${dict.secret}`;
            request(url, function (err, res, body) {
               if (!err && res.statusCode == 200) {
                   console.log(body);
                   var result = JSON.parse(body);
                   if(body.indexOf("errcode") < 0){
                       accessTokenJson.access_token = result.access_token;
                       accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                       //更新本地存储的
                       fs.writeFile('./wechat/access_token.json',JSON.stringify(accessTokenJson));
                       //将获取后的 access_token 返回
                       resolve(accessTokenJson.access_token);
                   }else{
                       //将错误返回
                       resolve(result);
                   }
               }
            });
        }else{
            //将本地存储的 access_token 返回
            console.log(`return ${ accessTokenJson.access_token } from db..`);
            resolve(accessTokenJson.access_token);
        }
    });
}


var exp = {
    generator: generator,
    getAccessToken: getAccessToken
};

module.exports = exp;