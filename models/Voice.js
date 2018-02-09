const db = require('../db');

const Voice = db.defineAllowNull('Voice', {
    media_id: { type: db.STRING(100), defaultValue: '' },
    descr: { type: db.TEXT , allowNull: true },
    author: { type: db.STRING(100), defaultValue: '' }
});

const UserVoices = db.defineAllowNull('UserVoices', {
});

module.exports = {Voice:Voice, UserVoices:UserVoices};