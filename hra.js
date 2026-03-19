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

async function aktualizujMapu() {
    try {
        // 1. Přečteme oba soubory
        const charData = fs.readFileSync(souborPostavy, 'utf8');
        const tmxData = fs.readFileSync('./mapa/mapa.tmx', 'utf8');

        // 2. Vymažeme z nich úvodní <?xml...?> hlavičky, abychom je mohli spojit
        const cleanChar = charData.replace(/<\?xml.*?\?>/g, '');
        const cleanTmx = tmxData.replace(/<\?xml.*?\?>/g, '');

        // 3. Slepíme je pod jeden hlavní tag <game>
        const combinedXml = `<?xml version="1.0" encoding="UTF-8"?>
        <game>
            ${cleanChar}
            ${cleanTmx}
        </game>`;

        // 4. Transformace
        const xslData = fs.readFileSync('./mapa.xsl', 'utf8');
        const parser = new XmlParser();
        const xslt = new Xslt();

        const xml = parser.xmlParse(combinedXml);
        const xsl = parser.xmlParse(xslData);

        let htmlResult = (typeof xslt.xsltProcess === 'function')
            ? await xslt.xsltProcess(xml, xsl)
            : await xslt.process(xml, xsl);

        fs.writeFileSync('./zobrazeni.html', htmlResult, 'utf8');
    } catch (error) {
        console.log("Chyba při generování mapy:", error.message);
    }
}



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
    ukazLokaci();
    handleInput();
}


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

            console.log(`\nJsi zde: ${roomName}`);
            console.log(`----------------------------------------`);
            console.log(`${roomDesc}\n`);
            return;
        }
    }
}

function ukazInventar() {
    const charRaw = fs.readFileSync(souborPostavy, 'utf8');
    const parser = new DOMParser();
    const charDoc = parser.parseFromString(charRaw, 'text/xml');

    const inventory = charDoc.getElementsByTagName('inventory')[0];
    const items = inventory.getElementsByTagName('item'); // Dejme tomu, že tam budou tagy <item>

    console.clear();
    console.log("=== TVŮJ INVENTÁŘ ===");

    if (items.length === 0) {
        console.log("Máš prázdné kapsy.");
    } else {
        for (let i = 0; i < items.length; i++) {
            console.log("- " + items[i].textContent);
        }
    }
    console.log("=====================\n");
}

function MovePlayer(smer) {
    // 1. ZJISTÍME, KDE JE POSTAVA
    const charRaw = fs.readFileSync(souborPostavy, 'utf8');
    const parser = new DOMParser();
    const charDoc = parser.parseFromString(charRaw, 'text/xml');

    // Získáme aktuální ID lokace z XML postavy
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

        aktualizujMapu();

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
    rl.question('Co uděláš? > ', async (input) => {
        const command = input.toLowerCase().trim();

        if (command === 'konec') {
            console.log("Díky za hraní!");
            rl.close();
            return;
        }
        if (command === 'inventory' || command === 'inventar') {
            ukazInventar();
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

        if (command === 'sever' || command === 'north' || command === 'w') {
            MovePlayer('north');
        }

        if (command === 'jih' || command === 'south' || command === 's') {
            MovePlayer('south');
        }
        if (command === 'vychod' || command === 'east' || command === 'd') {
            MovePlayer('east');
        }
        if (command === 'zapad' || command === 'west' || command === 'a') {
            MovePlayer('west');
        }
        if (command === 'schody' || command === 'staircase') {
            MovePlayer('staircase');
        }
    });
}


startHry();