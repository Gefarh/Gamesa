<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="text" encoding="UTF-8"/>

  <xsl:template match="/">
    === TVŮJ INVENTÁŘ  ===
    <xsl:for-each select="world/player/inventory/item">
      * <xsl:value-of select="@name"/>
        - Typ: <xsl:value-of select="@type"/>
        <xsl:if test="@quantity"> [Množství: <xsl:value-of select="@quantity"/>]</xsl:if>
        <xsl:if test="@dmg"> [Poškození: <xsl:value-of select="@dmg"/>]</xsl:if>
    </xsl:for-each>
    ============================
  </xsl:template>

</xsl:stylesheet>