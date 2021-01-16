require('dotenv').config();
const fs = require("fs");
const readline = require('readline');

if(!fs.existsSync(`${process.env.Anlagen_DB}/MinecraftServer.json`)){
	const CleanDB = {"ServerName":[],"IPv4":[],"Port":[]}
	let NewJson = JSON.stringify(CleanDB);
	fs.writeFile(`${process.env.Anlagen_DB}/MinecraftServer.json`, NewJson, (err) => {if (err) console.log(err);});
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function Questions() {
    var ans = await askQuestion("\nMöchtest du einen Server hinzufügen(+) oder löschen(-)?: ");

    if(ans === "+"){
        var ServerName = await askQuestion("\nWie soll der Server heißen?: ");
        var IPv4 = await askQuestion("\nBitte nenne mir die IPv4: ");
        var Port = await askQuestion("\nDen RCON Port findest du in server.properties (rcon.port)\nBitte nenne mir den RCON Port:");
        var Vorlage = JSON.parse(fs.readFileSync(`${process.env.Anlagen_DB}/MinecraftServer.json`));
        Vorlage["ServerName"].push(ServerName);
        Vorlage["IPv4"].push(IPv4);
        Vorlage["Port"].push(Port);

        Vorlage = JSON.stringify(Vorlage);
        fs.writeFile(`${process.env.Anlagen_DB}/MinecraftServer.json`, Vorlage, (err) => {if (err) console.log(err);
        });
    }else if(ans === "-"){
        var Vorlage = JSON.parse(fs.readFileSync(`${process.env.Anlagen_DB}/MinecraftServer.json`));
        let ServerListe = "";

        for (i = 0; i < Vorlage.IPv4.length; i++) { 
            ServerListe = `${ServerListe}[${i+1}] \x1b[36mName:\x1b[0m  ${Vorlage.ServerName[i]}  \x1b[36mIP:\x1b[0m ${Vorlage.IPv4[i]}:${Vorlage.Port[i]}\n`
        }

        console.log(ServerListe)

        var ServerName = await askQuestion("\nBitte nenne die Nummer, welchen ich entfernen soll: ");
        if(!isNaN(ServerName)){
            Vorlage.ServerName.splice(ServerName-1, 1)
            Vorlage.IPv4.splice(ServerName-1, 1)
            Vorlage.Port.splice(ServerName-1, 1)
        }else{
            console.log("\x1b[31mI expected a number...\x1b[0m")
        }

        Vorlage = JSON.stringify(Vorlage);
        fs.writeFile(`${process.env.Anlagen_DB}/MinecraftServer.json`, Vorlage, (err) => {if (err) console.log(err);
        });

    }else{
        console.log("\x1b[31mDie erste Antwort war unbekannt, sollte + oder - sein was aber\x1b[0mD: " + ans)
    }
}

Questions()