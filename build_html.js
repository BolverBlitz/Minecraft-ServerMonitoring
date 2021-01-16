require('dotenv').config();
const fs = require("fs");

function CreateHTML(){
    const Vorlage = fs.readFileSync('./template/index.html').toString();
    
    //Insert IP and PORT
    var FertigHTML = Vorlage.split("REPLACE_THIS_WITH_BACKEND_IP").join(process.env.IP)
    FertigHTML = FertigHTML.split("REPLACE_THIS_WITH_BACKEND_PORT").join(process.env.PORT)

    console.log(`HTML was build:\nIP: ${process.env.IP}\nPort: ${process.env.PORT}`)

    fs.writeFile("./src/Web/index.html", FertigHTML, (err) => {if (err) console.log(err);

	});
}

CreateHTML()