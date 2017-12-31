const db = require('../db');

const User = db.defineModel('users', {
    fromUserName: { type: db.ID, unique: true },
    user_name: { type: db.STRING(50), defaultValue: '' },
    nickname: { type: db.STRING(50), defaultValue: '' },
    city: { type: db.STRING(20), defaultValue: '' },
    province: { type: db.STRING(20), defaultValue: '' },
    country: { type: db.STRING(20), defaultValue: '' },
    sex: { type: db.BIGINT, defaultValue: 1 },
    userType: { type: db.BIGINT, defaultValue: 1 }
});

module.exports = User;