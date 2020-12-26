const db = require('./db.js');
const user = require('./user.js');
const util = require('./util.js');

module.exports = {
    getVocab: async function(p_min, p_max, c_min, c_max) {
        const res = await db.query('SELECT * FROM vocab WHERE page >= $1 AND page <= $2 AND chapter >= $3 AND chapter <= $4', [p_min, p_max, c_min, c_max]);
        return res.rows;
    },
    
    generateQuestion: async function(message) {
        const userID = message.author.id;
        const user_obj = await user.getObjByID(userID);
    
        const vocab_mode = user_obj.data["vocab_mode"];
        const selection_mode = user_obj.data["selection_mode"];
    
        var p_min = user_obj.data["page_min"]; 
        var p_max = user_obj.data["page_max"]; 
        var c_min = user_obj.data["chapter_min"]; 
        var c_max = user_obj.data["chapter_max"];
    
        if (selection_mode === "page") {
            c_min = 0; c_max = 32;
        }
        else {
            p_min = 0; p_max = 213;
        }
    
        const rows = await this.getVocab(p_min, p_max, c_min, c_max);
        if (rows === undefined || rows === null || rows.length === 0) {
            message.reply("Keine Vokabeln im Suchbereich gefunden.\nEvtl. ist der Suchbereich falsch eingestellt.\nMit !kapitel / !seiten ändern.");
            return;
        }
    
        const item = rows[util.randInt(0, rows.length)];
        const lang = (vocab_mode === 0) ? util.randInt(0, 2) : (vocab_mode % 2);
    
        const from = (lang === 0) ? item["svensk"] : item["german"];
        const to = (lang === 0) ? item["german"] : item["svensk"];
        const question = `Was heißt '${from}' auf ${lang === 0 ? 'deutsch' : 'schwedisch'}?`;
    
        user.setProperty(userID, 'question', question);
        user.setProperty(userID, 'answer', to);
    
        message.reply(`Neue Frage: ${question}`);
    },
    
    reaskQuestion: async function(message) {
        const repeat_question = await user.getProperty(message.author.id, 'question');
        if (repeat_question != "") message.reply(`----------------------------------\nVorherige Frage: ${repeat_question}`);
    }
}