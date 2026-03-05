const { XmlParser, Xslt } = require('xslt-processor');
const fs = require('fs');
const readline = require('readline');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');


// Nastavení vstupu z konzole
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function render(xmlData, xslFile) {
    const xslData = fs.readFileSync(xslFile, 'utf8');
    const parser = new XmlParser();
    const xslt = new Xslt();

    const xml = parser.xmlParse(xmlData);
    const xsl = parser.xmlParse(xslData);

    // Použijeme tvůj ověřený způsob s kontrolou funkce
    let result = (typeof xslt.xsltProcess === 'function')
        ? await xslt.xsltProcess(xml, xsl)
        : await xslt.process(xml, xsl);

    console.clear();
    console.log(result);
    return result; // Vracíme výsledek, kdyby ho Node.js potřeboval pro logiku
}

function MovePlayer(smer) {
    const xmlRaw = fs.readFileSync('./world.xml', 'utf8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlRaw, 'text/xml');

    const locations = doc.getElementsByTagName('location');
    let currentLocation = null;

    for (let i = 0; i < locations.length; i++) {
        if (locations[i].getAttribute('current') === 'true') {
            currentLocation = locations[i];
            break;
        }
    }

    if (!currentLocation) {
        console.log("Kritická chyba: Hráč se nenachází v žádné lokaci!");
        return;
    }

    let targetId = null;
    const exits = currentLocation.getElementsByTagName('exit');
    for (let i = 0; i < exits.length; i++) {
        if (exits[i].getAttribute('direction') === smer) {
            targetId = exits[i].getAttribute('target');
            break;
        }
    }

    if (!targetId) {
        console.log(`\nNemůžeš jít na ${smer}, zeď hlavou neprorazíš.`);
        return;
    }

    let targetLocation = null;
    for (let i = 0; i < locations.length; i++) {
        if (locations[i].getAttribute('id') === targetId) {
            targetLocation = locations[i];
            break;
        }
    }

    // --- ZDE JE UPRAVENÁ ČÁST (KROK 6) ---
    if (targetLocation) {
        // Přepíšeme atributy current
        currentLocation.setAttribute('current', 'false');
        targetLocation.setAttribute('current', 'true');

        // Uložíme do souboru
        const serializer = new XMLSerializer();
        const newXmlRaw = serializer.serializeToString(doc);
        fs.writeFileSync('./world.xml', newXmlRaw, 'utf8');

        // Získáme název a popis nové místnosti
        const nameNode = targetLocation.getElementsByTagName('name')[0];
        const descNode = targetLocation.getElementsByTagName('desc')[0];

        // Pokud náhodou tag chybí, dáme výchozí text
        const roomName = nameNode ? nameNode.textContent : "Neznámá místnost";
        const roomDesc = descNode ? descNode.textContent : "Zde není nic zajímavého k vidění.";

        console.clear(); // Vyčistíme konzoli pro hezčí zobrazení
        console.log(`\nVešel jsi do: ${roomName}`);
        console.log(`----------------------------------------`);
        console.log(`${roomDesc}\n`);

    } else {
        console.log(`\nChyba hry: Lokace '${targetId}' neexistuje.`);
    }
}

async function handleInput(input) {
    let xmlString = fs.readFileSync('./world.xml', 'utf8');

    rl.question('Co uděláš? > ', async (input) => {
        const command = input.toLowerCase().trim();

        if (command === 'konec') {
            console.log("Díky za hraní!");
            rl.close();
            return;
        }
        if (command === 'inventory' || command === 'inventar') {
            await render(xmlString, './inventory.xsl');
        }
        setTimeout(handleInput, 1000);

        if (command === 'help') {
            console.log("Seznam příkazů:");
            console.log("   inventory   - zobrazí inventář");
            console.log("   konec       - ukončí hru");
            console.log("   sever       - jde na sever");
            console.log("   jih         - jde na jih");
            console.log("   vychod      - jde na vychod");
            console.log("   zapad       - jde na zapad");
            console.log("   help        - zobrazí nápovědu");
        }

        if (command === 'sever' || command === 'north') {
            MovePlayer('north');
        }

        if (command === 'jih' || command === 'south') {
            MovePlayer('south');
        }
        if (command === 'vychod' || command === 'east') {
            MovePlayer('east');
        }
        if (command === 'zapad' || command === 'west') {
            MovePlayer('west');
        }
    });
}

console.log("Hra se spouští...");
console.log("Seznam příkazů:");
console.log("   inventory   - zobrazí inventář");
console.log("   konec       - ukončí hru");
console.log("   sever       - jde na sever");
console.log("   jih         - jde na jih");
console.log("   vychod      - jde na vychod");
console.log("   zapad       - jde na zapad");
console.log("   help        - zobrazí nápovědu");
handleInput();