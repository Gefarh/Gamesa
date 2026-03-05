<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8"/>
  <xsl:template match="/">
    <xsl:value-of select="//location[@current='true']/exits/exit[@direction='##SMER##']/@target"/>
  </xsl:template>
</xsl:stylesheet>