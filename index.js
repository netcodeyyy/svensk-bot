// Discord stuff
const Discord = require("discord.js");
const client = new Discord.Client();

// functionality
const db = require('./db.js');
const msg = require('./msg.js');

// create table if not exists
db.query('CREATE TABLE IF NOT EXISTS user_data(user_id bigint UNIQUE NOT NULL PRIMARY KEY, data jsonb NOT NULL)');
// clear users on app start
db.query('DELETE FROM user_data');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
  
client.on("message", function(message) {
    // ignore self and only listen to DMs
    if (message.author.bot || message.channel.type != 'dm') return;

    (async () => {      
        const is_command = await msg.isCommand(message);
        if (is_command) {
            msg.handleCommand(message);
        }
        else {
            msg.handleAnswer(message);
        }
    })();
});
  
client.login(process.env.BOT_TOKEN);