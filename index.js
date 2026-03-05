const { XmlParser, Xslt } = require('xslt-processor');
const fs = require('fs');
const readline = require('readline');

// Nastavení vstupu z konzole
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function renderGame(xmlData) {
    const xslData = fs.readFileSync('./inventory.xsl', 'utf8');
    const parser = new XmlParser();
    const xslt = new Xslt();

    const xml = parser.xmlParse(xmlData);
    const xsl = parser.xmlParse(xslData);

    let result;
    if (typeof xslt.xsltProcess === 'function') {
        result = await xslt.xsltProcess(xml, xsl);
    } else {
        result = await xslt.process(xml, xsl);
    }
    console.clear(); // Vyčistí obrazovku pro lepší zážitek
    console.log(result);
}

function handleInput() {
    // Načteme XML (jako naši databázi)
    let xmlString = fs.readFileSync('./world.xml', 'utf8');

    renderGame(xmlString);

    rl.question('Co uděláš? > ', (input) => {
        const command = input.toLowerCase().trim();

        if (command === 'konec') {
            console.log("Díky za hraní!");
            rl.close();
            return;
        }

        // --- JEDNODUCHÁ LOGIKA POHYBU ---
        if (command === 'sever' || command === 'north') {
            // Tady by v budoucnu byla automatická logika, 
            // teď to pro ukázku jen "natvrdo" prohodíme v textu
            if (xmlString.includes('id="cell" current="true"')) {
                xmlString = xmlString.replace('id="cell" current="true"', 'id="cell" current="false"');
                xmlString = xmlString.replace('id="corridor" current="false"', 'id="corridor" current="true"');
                fs.writeFileSync('./world.xml', xmlString);
                console.log("Jdeš na sever...");
            } else {
                console.log("Tudy cesta nevede.");
            }
        } else if (command === 'jih' || command === 'south') {
            if (xmlString.includes('id="corridor" current="true"')) {
                xmlString = xmlString.replace('id="corridor" current="true"', 'id="corridor" current="false"');
                xmlString = xmlString.replace('id="cell" current="false"', 'id="cell" current="true"');
                fs.writeFileSync('./world.xml', xmlString);
                console.log("Jdeš na jih...");
            } else {
                console.log("Tudy cesta nevede.");
            }
        }

        // Po každém příkazu znovu zavoláme smyčku
        setTimeout(handleInput, 1000);
    });
}

console.log("Hra se spouští...");
handleInput();