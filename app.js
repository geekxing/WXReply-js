const Koa = require('koa');

const bodyParser = require('koa-bodyparser');

const controller = require('./controller');

const wechat = require('co-wechat');

const api = require('wechat-api');

const config = require('./config');

const message = require('./wechat/messages');

const app = new Koa();

app.use(bodyParser());

app.use(wechat(config.wechat).middleware(message()));

app.use(controller());

let port = 3000;
app.listen(port);
console.log(`app started at port ${port}...`);

