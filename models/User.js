const db = require('../db');

const User = db.defineModel('users', {
    fromUserName: { type: db.ID, unique: true },
    user_name: { type: db.STRING(50), defaultValue: '' },
    nickname: { type: db.STRING(50), defaultValue: '' },
    city: { type: db.STRING(20), defaultValue: '' },
    province: { type: db.STRING(20), defaultValue: '' },
    country: { type: db.STRING(20), defaultValue: '' },
    sex: { type: db.BIGINT, defaultValue: 1 },
    sex_input: { type: db.STRING(10), defaultValue: '' },
    user_info: { type: db.STRING(100), defaultValue: '' },
    self_desr: { type: db.TEXT, defaultValue: '' },
    userType: { type: db.BIGINT, defaultValue: 1 }
});

module.exports = User;