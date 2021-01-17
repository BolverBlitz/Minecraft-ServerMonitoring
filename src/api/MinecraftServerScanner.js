require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const Joi = require('joi');
const os = require("os")
const cpucores = os.cpus().length

const { Rcon } = require('rcon-client')
const find = require('find-process');
var pidusage = require('pidusage')

const PluginConfig = {
};

/* Plugin info */
const PluginName = 'MinecraftServerMonitor';
const PluginRequirements = [];
const PluginVersion = '0.0.1';
const PluginAuthor = 'BolverBlitz';
const PluginDocs = '';

//Global Vars
var HasChanced = true;
var MinecraftServer;
var CPUUsage = [];
var RAMUsage = [];
var Players = [];
var StatusListe = [];

let getServerStats = function({ IPv4, port, ServerName }) {
	return new Promise(function(resolve, reject) {
    try{
        Rcon.connect({host: "localhost", port: port, password: process.env.RCON_Passwort}).then(function(rcon) {
            rcon.send("list").then(function(list) {
                list = list.split(" ")
                var PlayerList = [];
                for (i = 10; i < list.length; i++) { 
                  PlayerList.push(list[i].replace(",",""))
                };
                find('port', port).then(function (pid) {
                    pidusage(pid[0].pid, function (err, stats) {
                        let StartPara = pid[0].cmd.split(" ");
                        let memMax;
                        StartPara.map(part => {
                            if(part.includes("-Xmx")){
                                memMax = part.substr(4, part.length).split("")
                                memMax = memMax.slice(0, memMax.length-1).join("")
                            }
                        });

                        let ret = {
                            ServerName: ServerName,
                            Port: port,
                            IPv4: IPv4,
                            PlayerOn: list[2],
                            PlayerList: PlayerList,
                            Slots: list[7],
                            cpu: stats.cpu/cpucores,
                            mem: stats.memory,
                            memMax: memMax,
                            Status: "Online"
                        }
                        resolve(ret)
                    });
                }).catch(error => console.log(error));
            }).catch(error => console.log(error));
            rcon.end()
        }).catch(function (error) {
          if(error.code === "ECONNREFUSED"){
            let ret = {
              ServerName: ServerName,
              Port: port,
              IPv4: IPv4,
              Status: "Offline"
          }
          resolve(ret)
          }
      });
    }catch{
      let ret = {
        ServerName: ServerName,
        Port: port,
        IPv4: IPv4,
        Status: "Offline"
    }
    resolve(ret)
    }
	});
}

function UpdateStatus() {
  var Promises = [];
  if(HasChanced){
    if(fs.existsSync(`${process.env.Anlagen_DB}/MinecraftServer.json`)){
      MinecraftServer = JSON.parse(fs.readFileSync(`${process.env.Anlagen_DB}/MinecraftServer.json`));
      HasChanced = false;
    }
  }
  
  for (i = 0; i < MinecraftServer.IPv4.length; i++) { 
    Promises.push(getServerStats({IPv4: MinecraftServer.IPv4[i], port: MinecraftServer.Port[i], ServerName: MinecraftServer.ServerName[i]}))
  };

  var AliveNum = 0;
  var NotAliveNum = 0;
  var StatusArrON = [];
  var StatusArrOFF = [];

  Promise.all(Promises).then(function(PAll) {
    PAll.map(part => {
      if(part.Status === "Offline"){
        NotAliveNum++;
        StatusArrOFF.push(part)
      }else{
        AliveNum++;
        StatusArrON.push(part)
      }
    });
    //Update Global VAR
    StatusListe = {
      Timestamp: Date.now(),
      Online: AliveNum,
      Offline: NotAliveNum,
      ListOn: StatusArrON,
      ListOff: StatusArrOFF
    }

  });
}

UpdateStatus()

if(!fs.existsSync(`${process.env.Anlagen_DB}/MinecraftServer.json`)){
	const CleanDB = {"ServerName":[],"IP":[],"Port":[]}
	let NewJson = JSON.stringify(CleanDB);
	fs.writeFile(`${process.env.Anlagen_DB}/MinecraftServer.json`, NewJson, (err) => {if (err) console.log(err);});
	console.log(`[API.Plugins] [${PluginName}] created DB`)
}

const GETlimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

const POSTlimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40
});

const router = express.Router();

const schemaPost = Joi.object({
  Port: Joi.string().required().regex(/\b^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/),
  IPAddress: Joi.string().required().regex(/\b((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:(?<!\.)\b|\.)){4}/),
  ServerName: Joi.string().required().regex(/^[a-z\d\s\-\.\,\ä\ü\ö\ß\&]*$/i),
});

const schemaDelete = Joi.object({
  ServerName: Joi.string().required().regex(/^[a-z\d\s\-\.\,\ä\ü\ö\ß\&]*$/i),
});

router.get('/', GETlimiter, async (reg, res, next) => {
  try {
    if(typeof(StatusListe) === undefined){
      res.status(500);
    }else{
      if(Date.now()-StatusListe.Timestamp <= (process.env.UpdateInterval*2)){
        res.status(200);
        res.json(StatusListe);
      }else{
        res.status(500);
      }
    }

  } catch (error) {
    next(error);
  }
});
/*
router.post('/add', POSTlimiter, async (reg, res, next) => {
  try {
    const value = await schemaPost.validateAsync(reg.body);
    if(fs.existsSync(`${process.env.Anlagen_DB}/Anlagen.json`)){
      var AnlagenJson = JSON.parse(fs.readFileSync(`${process.env.Anlagen_DB}/Anlagen.json`));
      if(!AnlagenJson["IP"].includes(value.IPAddress)){
        AnlagenJson["AnlagenName"].push(value.AnlagenName);
        AnlagenJson["IP"].push(value.IPAddress);

        let NewJson = JSON.stringify(AnlagenJson);
        fs.writeFile(`${process.env.Anlagen_DB}/Anlagen.json`, NewJson, (err) => {if (err) console.log(err);});
        HasChanced = true;

        res.status(200);
        res.json({
          message: 'Anlage wurde gespeichert'
        });

      }else{
        res.status(500);
        res.json({
          error: 'Duplicated Entry'
        });
      }

    }


  } catch (error) {
    next(error);
  }
});

router.post('/rem', POSTlimiter, async (reg, res, next) => {
  try {
    const value = await schemaDelete.validateAsync(reg.body);
    if(fs.existsSync(`${process.env.Anlagen_DB}/Anlagen.json`)){
      var AnlagenJson = JSON.parse(fs.readFileSync(`${process.env.Anlagen_DB}/Anlagen.json`));
      if(AnlagenJson["IP"].includes(value.IPAddress)){
        let index = AnlagenJson["IP"].indexOf(value.IPAddress);
					if (index > -1) {
						AnlagenJson["AnlagenName"].splice(index, 1);
					}
        removeItemFromArrayByName(AnlagenJson["IP"], value.IPAddress)

        let NewJson = JSON.stringify(AnlagenJson);
        fs.writeFile(`${process.env.Anlagen_DB}/Anlagen.json`, NewJson, (err) => {if (err) console.log(err);});
        HasChanced = true;

        res.status(200);
        res.json({
          message: 'Anlage wurde gespeichert'
        });

      }else{
        res.status(500);
        res.json({
          error: 'IP not found'
        });
      }

    }
  } catch (error) {
    next(error);
  }
});
*/
module.exports = {
  router,
  PluginName,
  PluginRequirements,
  PluginVersion,
  PluginAuthor,
  PluginDocs
};
setInterval(function(){
  UpdateStatus()
}, process.env.UpdateInterval);
