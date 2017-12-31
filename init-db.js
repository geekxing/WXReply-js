const model = require('./model.js');
const User = require('./models/User');
const Content = require('./models/Content');

User.hasMany(Content, {foreignKey: 'fromUserName', sourceKey: 'fromUserName'});

model.sync();