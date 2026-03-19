<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  
  <xsl:template match="/game">
    
    <xsl:variable name="lokace" select="character/location" />
    <xsl:variable name="mapaX" select="map//object[@name=$lokace]/@x" />
    <xsl:variable name="mapaY" select="map//object[@name=$lokace]/@y" />

    <xsl:variable name="posunX" select="number($mapaX) - 128" />
    <xsl:variable name="posunY" select="number($mapaY) - 128" />

    <html>
      <head>
        <title>Mapa - Herní okno</title>
        
        <script>
            const zdroj = new EventSource('/aktualizace');
            zdroj.onmessage = function(event) {
                if (event.data === 'refresh') {
                    location.reload(); // Prohlížeči, obnov stránku!
                }
            };
        </script>

        <style>
          body { 
            background-color: #111; color: white; font-family: sans-serif; 
            display: flex; justify-content: center; align-items: center; 
            height: 100vh; margin: 0; 
          }
          
          /* Odsud jsme smazali background-position */
          .kamera {
            width: 384px; height: 384px; border: 4px solid #555;
            background-image: url('mapa/mapa.png');
            background-repeat: no-repeat; position: relative; overflow: hidden;
          }
          
          .hrac {
            width: 128px; height: 128px; position: absolute; top: 128px; left: 128px;
            border: 3px solid red; box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        <div>
          <h2>Aktuální lokace: <xsl:value-of select="$lokace"/></h2>
          <p style="color:gray; font-size:12px;">DEBUG Cíl z Tiled: X=<xsl:value-of select="$mapaX"/>, Y=<xsl:value-of select="$mapaY"/></p>
          
          <div class="kamera" style="background-position: -{$posunX}px -{$posunY}px;">
             <div class="hrac"></div>
          </div>
          
          <p style="text-align: center; color: #888;">(Změnil jsi místnost? Zmáčkni F5 pro obnovení mapy)</p>
        </div>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>