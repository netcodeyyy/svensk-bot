const db = require('./db.js');
const user = require('./user.js');
const core = require('./core.js');

// constants
const CMD_PREFIX = '!';
const CMD_CHARS = ['k', 'a', 's', 'h'];

const HELP_MSG = "--- Hilfe ---\n"
                    + "Hier ist eine Liste der Befehle (und was sie tun):\n"
                    + "- ``!hej`` => sich zum ersten Mal beim Bot anmelden\n"
                    + "- ``!hilfe`` => das hier (Kurzschreibweise: ``h``)\n"
                    + "- ``!seite(n) min max`` => neu generierte Vokabeln nur von Seite ``min`` bis Seite ``max``"
                    + "- ``!kapitel min max`` => neu generierte Vokabeln nur in Kapitel ``min`` bis Kapitel ``max``"
                    + " (Kurzschreibweise: ``k min max``)\n"
                    + "- ``!auswahl`` => liefert die aktuelle Auswahl der Vokabeln (ob nach Kapitel oder Seiten beschränkt und die Werte ``min`` und ``max``)"
                    + " (Kurzschreibweise: ``a``)\n"
                    + "- ``!skip`` => überspringt die aktuelle Vokabel"
                    + " (Kurzschreibweise: ``s``)\n"
                    + "----------------------------------";

const UNKNOWN_MSG = "Ich kenne dich nicht. Schreib mir '!hej' um zu starten oder '!hilfe' für eine Übersicht an Befehlen.";

async function getSelection(message) {
    const user_status = await user.isUser(message.author.id);
    if (!user_status) {
        message.reply(UNKNOWN_MSG);
        return;
    }
    else {
        const user_obj = await user.getObjByID(message.author.id);
        const index = user_obj.data['selection_mode'];
        const modus = index === 'chapter' ? 'Kapitel' : 'Seite';
        const min = user_obj.data[`${index}_min`];
        const max = user_obj.data[`${index}_max`];

        const auswahl_msg = '--- Auswahl ---\n'
            + `Vokabeln werden ausgesucht durch: ${modus}\n`
            + `Von ${modus} ${min} bis ${modus} ${max}`;
            
        message.reply(auswahl_msg);
    }
}

async function setSelection(message, chat_cmd, args, mode) {
    const mode_str = mode === 'chapter' ? 'Kapitel' : 'Seiten';
    if (args.length != 2) {
        message.reply(`Falsches Format. '${chat_cmd}' erwartet zwei Parameter: '${chat_cmd} min max'.`)
    }
    else {
        const min = parseInt(args[0]);
        const max = parseInt(args[1]);
        if (isNaN(min) || isNaN(max)) {
            message.reply(`Fehler: '${chat_cmd}' erwartet zwei Zahlen! Format: '${chat_cmd} min max'.`);
        }
        else if (min > max) {
            message.reply(`Fehler: Parameter min (${min}) ist größer als max (${max}). So werden keine Vokabeln gefunden`);
        }
        else {
            user.setProperty(message.author.id, `${mode}_min`, min);       
            user.setProperty(message.author.id, `${mode}_max`, max);
            user.setProperty(message.author.id, 'selection_mode', mode);  

            message.reply(`Einstellung erfolgreich aktualisiert: Vokabeln werden nach ${mode_str} ausgewählt (${min} - ${max}).`);
        }   
    }
}

async function listUsers(message) {
    if (message.author.id === process.env.ADMIN_ID) {
        message.reply("Listing users:");
        const res = await db.query('SELECT * FROM user_data');
        const users = res.rows;
        users.forEach(user_obj => {
            const res = `user_id: '${user_obj.user_id}', data: '${JSON.stringify(user_obj.data)}'`;
            message.reply(res);
        });
    }
    else {
        message.reply("Insufficient user rights");
    }
}

async function showHelp(message) {
    message.reply(HELP_MSG);
}

function skipQuestion(message) {
    message.reply("Vokabel übersprungen.\n------------------------------");
    core.generateQuestion(message);
}


module.exports = {

    isCommand: async function(message) {
        if (message.content.startsWith(CMD_PREFIX)) return true;

        const words = message.content.split(' ');
        if (CMD_CHARS.includes(words[0].toLowerCase())) {
            return true;
        }
        else {
            return false;
        }
    },

    handleCommand: async function(message) {
        
        if (message.content.charAt(0) === CMD_PREFIX) {
            const body = message.content.slice(CMD_PREFIX.length);
            args = body.trim().split(' ').map((x) => {return x.toLowerCase()});

            const cmd = args.shift();
            chat_cmd = CMD_PREFIX + cmd;

            if (cmd === 'hej') {
                await user.addIfNew(message);
                core.generateQuestion(message);
            }
            else if (cmd === 'hilfe') {
                showHelp(message);
                core.reaskQuestion(message);
            }
            else {
                const is_user = await user.isUser(message.author.id);
                if (!is_user) {
                    message.reply(UNKNOWN_MSG);
                }
                else {
                    if (cmd === 'kapitel') {
                        await setSelection(message, chat_cmd, args, 'chapter');
                        core.reaskQuestion(message);
                    }
                    else if (cmd === 'seite' || cmd === 'seiten') {
                        await setSelection(message, chat_cmd, args, 'page');
                        core.reaskQuestion(message);
                    }
                    else if (cmd === 'auswahl') {
                        await getSelection(message);
                        core.reaskQuestion(message);
                    }
                    else if (cmd === 'skip') {
                        skipQuestion(message);
                    }
                    else if (cmd === 'users') {
                        listUsers(message);
                        core.reaskQuestion(message);
                    }
                }
            }
        }
        else {
            const args = message.content.split(' ').map((x) => {return x.toLowerCase()});
            const cmd = args.shift();
            if (cmd === 'h') {
                showHelp(message);
                core.reaskQuestion(message);
            }
            else {
                const is_user = await user.isUser(message.author.id);
                if (!is_user) {
                    message.reply(UNKNOWN_MSG);
                }
                else {
                    if (cmd === 'k') {
                        await setSelection(message, cmd, args, 'chapter');
                        core.reaskQuestion(message);
                    }
                    else if (cmd === 'a') {
                        await getSelection(message);
                        core.reaskQuestion(message);
                    }
                    else if (cmd === 's') {
                        skipQuestion(message);
                    }
                }
            }
        }
    },

    handleAnswer: async function(message) {
        const user_status = await user.isUser(message.author.id);
        if (!user_status) {
            message.reply("Ich kenne dich nicht. '!hej' um zu starten.");
            return;
        }
        const answer = await user.getProperty(message.author.id, 'answer');
        const response = (answer === message.content) ? 'Richtig!' : `Leider falsch. Die richtige Antwort ist '${answer}'.`;
        message.reply(`${response}\n----------------------------------------`);

        core.generateQuestion(message);
    }

}
