const db = require('../db');

const Pair = db.defineAllowNull('pairs', {
    keyword: { type: db.STRING(50), defaultValue: '' },
    pairA_name: { type: db.STRING(50), defaultValue: '' },
    pairB_name: { type: db.STRING(50), defaultValue: '' },
});

module.exports = Pair;