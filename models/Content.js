const db = require('../db');

const Content = db.defineAllowNull('contents', {
    keyword: { type: db.STRING(50), defaultValue: '' },
    descr: { type: db.STRING(400), defaultValue: '' },
    status: { type: db.BIGINT, defaultValue: 1 }
});

module.exports = Content;