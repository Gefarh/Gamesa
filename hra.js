const { XmlParser, Xslt } = require('xslt-processor');
const fs = require('fs');
const readline = require('readline');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');


// Nastavení vstupu z konzole
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Globální proměnné pro aktuální hru
let souborPostavy = "";
let aktualniLokaceId = "";

// Šablona pro novou postavu (obsahuje startovní lokaci, např. 'start')
const characterTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<character>
    <name>{JMENO}</name>
    <location>start</location> 
    <hp>100</hp>
    <inventory></inventory>
</character>`;

// Funkce na spuštění hry - zeptá se na jméno
function startHry() {
    console.clear();
    console.log("=== VÍTEJ V DUNGEONU ===");
    rl.question('Zadej jméno postavy (nebo napiš "konec"): ', (jmeno) => {
        jmeno = jmeno.trim();

        if (jmeno.toLowerCase() === 'konec') {
            rl.close();
            return;
        }

        if (!jmeno) {
            console.log("Jméno nesmí být prázdné!");
            return startHry();
        }

        souborPostavy = `./p-${jmeno}.xml`;

        // Kontrola, jestli postava existuje
        if (fs.existsSync(souborPostavy)) {
            console.log(`\nVítej zpět, ${jmeno}! Načítám hru...`);
            nactiPostavu();
        } else {
            console.log(`\nVytvářím nového hrdinu: ${jmeno}...`);
            const noveXml = characterTemplate.replace("{JMENO}", jmeno);
            fs.writeFileSync(souborPostavy, noveXml, 'utf8');
            nactiPostavu();
        }
    });
}

function nactiPostavu() {
    // Přečteme XML postavy a zjistíme, kde se nachází
    const xmlRaw = fs.readFileSync(souborPostavy, 'utf8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlRaw, 'text/xml');

    // Získáme ID lokace z uložené postavy
    aktualniLokaceId = doc.getElementsByTagName('location')[0].textContent;

    console.log("Hra připravena. Napiš 'help' pro nápovědu.");
    ukazLokaci(); // Vypíše, kde postava aktuálně je
    handleInput(); // Spustíme tvou existující smyčku
}

function MovePlayer(smer) {
    // 1. Přečteme mapu světa (pouze pro čtení)
    const worldRaw = fs.readFileSync('./world.xml', 'utf8');
    const parser = new DOMParser();
    const worldDoc = parser.parseFromString(worldRaw, 'text/xml');
    const locations = worldDoc.getElementsByTagName('location');

    let currentLocation = null;

    // 2. Najdeme aktuální lokaci podle ID, které má postava uložené
    for (let i = 0; i < locations.length; i++) {
        if (locations[i].getAttribute('id') === aktualniLokaceId) {
            currentLocation = locations[i];
            break;
        }
    }

    if (!currentLocation) {
        console.log("Chyba: Tvá aktuální lokace neexistuje ve world.xml!");
        return;
    }

    // 3. Kontrola východů
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

    // --- ZÁPIS DO SOUBORU POSTAVY ---
    // Změníme aktuální ID na to cílové
    aktualniLokaceId = targetId;

    // Načteme XML postavy, upravíme <location> a uložíme
    const charRaw = fs.readFileSync(souborPostavy, 'utf8');
    const charDoc = parser.parseFromString(charRaw, 'text/xml');
    charDoc.getElementsByTagName('location')[0].textContent = aktualniLokaceId;

    const serializer = new XMLSerializer();
    fs.writeFileSync(souborPostavy, serializer.serializeToString(charDoc), 'utf8');

    // Vykreslíme novou místnost
    ukazLokaci();
}

// Pomocná funkce pro vypsání textu místnosti bez toho, abys hýbal hráčem
function ukazLokaci() {
    const worldRaw = fs.readFileSync('./world.xml', 'utf8');
    const parser = new DOMParser();
    const worldDoc = parser.parseFromString(worldRaw, 'text/xml');
    const locations = worldDoc.getElementsByTagName('location');

    for (let i = 0; i < locations.length; i++) {
        if (locations[i].getAttribute('id') === aktualniLokaceId) {
            const nameNode = locations[i].getElementsByTagName('name')[0];
            const descNode = locations[i].getElementsByTagName('desc')[0];

            const roomName = nameNode ? nameNode.textContent : "Neznámá místnost";
            const roomDesc = descNode ? descNode.textContent : "Zde není nic zajímavého k vidění.";

            console.clear();
            console.log(`\nJsi zde: ${roomName}`);
            console.log(`----------------------------------------`);
            console.log(`${roomDesc}\n`);
            return;
        }
    }
}

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

// Globální proměnná pro aktuálně hrající postavu (musíš ji nastavit při výběru postavy)
// let souborPostavy = './p-gandalf.xml'; 

function MovePlayer(smer) {
    // 1. ZJISTÍME, KDE JE POSTAVA (Přečteme soubor postavy)
    const charRaw = fs.readFileSync(souborPostavy, 'utf8');
    const parser = new DOMParser();
    const charDoc = parser.parseFromString(charRaw, 'text/xml');

    // Získáme aktuální ID lokace z XML postavy (např. <location>start_room</location>)
    const locationNode = charDoc.getElementsByTagName('location')[0];
    const currentLocationId = locationNode.textContent;

    // 2. NAČTEME MAPU SVĚTA (Pouze pro čtení, nebudeme ji měnit!)
    const worldRaw = fs.readFileSync('./world.xml', 'utf8');
    const worldDoc = parser.parseFromString(worldRaw, 'text/xml');
    const locations = worldDoc.getElementsByTagName('location');

    // Najdeme aktuální lokaci ve světě podle ID z postavy
    let currentLocation = null;
    for (let i = 0; i < locations.length; i++) {
        if (locations[i].getAttribute('id') === currentLocationId) {
            currentLocation = locations[i];
            break;
        }
    }

    if (!currentLocation) {
        console.log(`Kritická chyba: Lokace '${currentLocationId}' neexistuje ve world.xml!`);
        return;
    }

    // 3. KONTROLA VÝCHODŮ
    let targetId = null;
    const exits = currentLocation.getElementsByTagName('exit');
    for (let i = 0; i < exits.length; i++) {
        if (exits[i].getAttribute('direction') === smer) {
            targetId = exits[i].getAttribute('target');
            break;
        }
    }

    if (!targetId) {
        console.log(`\nNemůžeš jít na ${smer}.`);
        return;
    }

    // Najdeme cílovou lokaci ve světě, abychom z ní vzali texty
    let targetLocation = null;
    for (let i = 0; i < locations.length; i++) {
        if (locations[i].getAttribute('id') === targetId) {
            targetLocation = locations[i];
            break;
        }
    }

    // 4. PŘESUN A ULOŽENÍ
    if (targetLocation) {
        // --- TADY JE TA HLAVNÍ ZMĚNA ---
        // Přepíšeme text v tagu <location> v souboru postavy na nové ID
        locationNode.textContent = targetId;

        // Uložíme POUZE soubor postavy (world.xml se vůbec nedotkneme)
        const serializer = new XMLSerializer();
        const newCharRaw = serializer.serializeToString(charDoc);
        fs.writeFileSync(souborPostavy, newCharRaw, 'utf8');

        // Získáme název a popis nové místnosti z world.xml pro výpis
        const nameNode = targetLocation.getElementsByTagName('name')[0];
        const descNode = targetLocation.getElementsByTagName('desc')[0];

        const roomName = nameNode ? nameNode.textContent : "Neznámá místnost";
        const roomDesc = descNode ? descNode.textContent : "Zde není nic zajímavého k vidění.";

        console.clear();
        console.log(`\nVešel jsi do: ${roomName}`);
        console.log(`----------------------------------------`);
        console.log(`${roomDesc}\n`);

    } else {
        console.log(`\nChyba hry: Lokace '${targetId}' neexistuje ve world.xml.`);
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
            console.log("   schody      - jde na schody");
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
        if (command === 'schody' || command === 'staircase') {
            MovePlayer('staircase');
        }
    });
}


startHry();