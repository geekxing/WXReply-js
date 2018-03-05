const API = require('co-wechat-api');
const config = require('../config');

async function uploadVoice(filepath) {
    console.log(`上传语音... `);
    let api = new API(config.wechat.appid, config.wechat.appSecret);
    try {
        let result = await api.uploadMaterial(filepath, 'voice');
        console.log(result);
        return result;
    } catch (e) {
        throw new Error(e);
    }
}


uploadVoice(`/wechat/mediaLib/xiaoshangxing.mp3`);
