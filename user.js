const db = require('./db.js');

const DEFAULT_DATA = '{ "vocab_mode": 0,'               // vocab mode; 0: swe <> deu, 1: deu => swe, 2: swe => deu 
                    + '"selection_mode": "chapter",'    // by what bounds the vocab is selected
                    + '"page_min": 0,'                  // page_min [0, 213]
                    + '"page_max": 213,'                // page_max [0, 213]
                    + '"chapter_min": 0,'               // chapter_min [0, 32]
                    + '"chapter_max": 32,'              // chapter_max [0, 32]
                    + '"question": "",'                 // last question asked
                    + '"answer": "",'                   // answer to that question
                    + '"vocabCount": 0}';               // number of questions answered (not used yet)

const WELCOME_MSG = "Hej, jag heter SvenskBot.\n\n"
                    + "--- WARNUNG ---\n"
                    + "Die Vokabeln wurden naiv aus dem PDF des Buches geparsed, dabei sind bei manchen Vokabeln wahrscheinlich Fehler aufgetreten.\n"
                    + "Falls so eine Vokabel auftritt, einfach IRGENDETWAS antworten damit die nächste Vokabel kommt.\n"
                    + "Alternativ kannst du mit 's' auch einfach die Vokabel überspringen.\n"
                    + "Der Bot akzeptiert leider nur GENAU die Lösung aus dem PDF, also nicht wundern\n"
                    + "wenn der Bot Antworten nicht akzeptiert die eigentlich richtig sind\n"        
                    + "----------------------------------\n"
                    + "Wähle mit '!seiten min max' bzw. '!kapitel min max' welche Vokabeln du üben möchtest. "
                    + "Um dir deine aktuellen Auswahleinstellungen anzeigen zu lassen benutze '!auswahl'\n\n"
                    + "Benutze '!hilfe' (oder kurz: 'h') für eine Übersicht/Beschreibung aller möglichen Befehle\n"
                    + "----------------------------------";

async function addNew(userID) {
    await db.query('INSERT INTO user_data(user_id, data) VALUES($1, $2)', [userID, DEFAULT_DATA]);
    console.log(`added new user with id: ${userID}`);
}

module.exports = {

    isUser: async function(userID) {
        const res = await db.query('SELECT EXISTS(SELECT 1 FROM user_data WHERE user_id = $1)', [userID]);
        return res.rows[0].exists;
    },
    
    getObjByID: async function(userID) {
        const res = await db.query('SELECT * FROM user_data WHERE user_id = $1', [userID]);
        return res.rows[0];
    },
    
    setProperty: async function(userID, property, value) {
        const user_obj = await this.getObjByID(userID);
    
        var data = user_obj.data;
        data[property] = value;
    
        const new_data = JSON.stringify(data);
    
        await db.query('UPDATE user_data SET data = $2 WHERE user_id = $1', [userID, new_data]);
    },
    
    getProperty: async function(userID, property) {
        const user_obj = await this.getObjByID(userID);
        return user_obj.data[property];
    },
    
    addIfNew: async function(message) {
        const userStatus = await this.isUser(message.author.id);
        if (userStatus)
            return;
        await addNew(message.author.id);
    
        message.reply(WELCOME_MSG);
    }
}