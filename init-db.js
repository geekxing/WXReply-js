// const model = require('');
const db = require('./db');
const User = require('./models/User');
const Voice = require('./models/Voice').Voice;
const UserVoices = require('./models/Voice').UserVoices;

User.belongsToMany(Voice, { through: UserVoices, foreignKey: 'fromUserName'});
Voice.belongsToMany(User, { through: UserVoices, foreignKey: 'media_id'});

async function abc() {
    await db.sequelize.sync();
}

abc();