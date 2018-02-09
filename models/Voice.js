const db = require('../db');

const Voice = db.defineAllowNull('Voice', {
    media_id: { type: db.STRING(100), defaultValue: '' },
    descr: { type: db.TEXT , allowNull: true },
    author: { type: db.STRING(100), defaultValue: '' },
    status: { type: db.INTEGER(5), defaultValue: 0 },
    forbidden: { type: db.BOOLEAN, defaultValue: false }
});

const UserVoices = db.defineAllowNull('UserVoices', {
    checked: { type: db.BOOLEAN, defaultValue: false }
});

module.exports = {Voice:Voice, UserVoices:UserVoices};