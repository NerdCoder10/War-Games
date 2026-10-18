/* =====================================================================
   WARGAMES — country dataset
   ---------------------------------------------------------------------
   Hard figures are rounded estimates compiled from public sources
   (IMF/World Bank GDP & population, SIPRI military expenditure, IISS
   Military Balance force sizes, FAS nuclear inventories, EIU Democracy
   Index). Qualitative 0-100 scores (patriotism, soft power, intelligence,
   ruthlessness, tech, revisionism, stability) are editorial composites
   informed by surveys (WIN/Gallup "willingness to fight"), Brand Finance
   Soft Power Index, Fragile States Index and conflict-conduct records.
   They are approximations for a simulation, not authoritative facts.

   Column order:
   iso | isoNum | name | region | pop(M) | GDP($B) | milSpend($B) |
   activeTroops(k) | reserves(k) | nukes | democracy(0-10) |
   stability | patriotism | softPower | intel | ruthlessness | tech | revisionism
   ===================================================================== */

const REGIONS = {
  NA: 'North America', LA: 'Latin America & Caribbean', EU: 'Europe',
  ME: 'Middle East & North Africa', AF: 'Sub-Saharan Africa',
  CA: 'Central Asia & Caucasus', SA: 'South Asia', EA: 'East Asia',
  SE: 'Southeast Asia', OC: 'Oceania'
};

const RAW = `
USA|840|United States|NA|342|30500|997|1316|800|5177|7.85|70|55|80|98|50|100|35
CAN|124|Canada|NA|41|2250|29|68|36|0|9.2|90|45|60|68|20|80|5
MEX|484|Mexico|NA|131|1850|12|216|82|0|5.3|40|65|50|45|40|45|5
GTM|320|Guatemala|LA|18.7|115|0.5|18|64|0|4.7|40|60|20|20|35|20|8
BLZ|084|Belize|LA|0.42|3.3|0.03|1.5|0.7|0|6.5|55|60|15|10|15|15|3
SLV|222|El Salvador|LA|6.3|36|0.4|25|10|0|4.6|50|65|25|25|45|20|3
HND|340|Honduras|LA|10.8|37|0.5|15|60|0|5|35|60|18|18|35|18|5
NIC|558|Nicaragua|LA|7|19|0.1|12|0|0|2.1|35|60|18|30|55|15|10
CRI|188|Costa Rica|LA|5.2|95|0|0|0|0|8.1|70|65|40|15|5|5|2
PAN|591|Panama|LA|4.5|90|0.9|0|0|0|6.9|60|65|35|20|10|10|2
CUB|192|Cuba|LA|10.9|100|1.2|49|39|0|2.6|35|75|35|65|45|25|15
HTI|332|Haiti|LA|11.9|25|0.02|0.7|0|0|2.8|5|50|15|5|40|5|5
DOM|214|Dominican Republic|LA|11.4|125|0.9|56|0|0|6.6|55|65|30|20|25|20|5
JAM|388|Jamaica|LA|2.8|20|0.3|6|1|0|7.1|60|70|45|15|20|15|2
TTO|780|Trinidad and Tobago|LA|1.5|28|0.2|4|0|0|7.1|60|60|25|15|15|15|3
BHS|044|Bahamas|LA|0.4|15|0.1|1.5|0|0|7.5|70|60|30|10|10|10|2
BRB|052|Barbados|LA|0.28|7|0.04|0.6|0|0|8|75|60|30|10|10|10|2
ATG|028|Antigua and Barbuda|LA|0.09|2.2|0.01|0.2|0|0|7|70|60|20|5|10|5|2
DMA|212|Dominica|LA|0.07|0.7|0|0|0|0|7|65|60|15|5|10|5|2
GRD|308|Grenada|LA|0.12|1.4|0|0|0|0|7|70|60|15|5|10|5|2
KNA|659|Saint Kitts and Nevis|LA|0.05|1.1|0.01|0.3|0|0|7|70|60|15|5|10|5|2
LCA|662|Saint Lucia|LA|0.18|2.6|0|0|0|0|7|70|60|20|5|10|5|2
VCT|670|Saint Vincent and the Grenadines|LA|0.1|1.1|0|0|0|0|7|70|60|15|5|10|5|2
COL|170|Colombia|LA|53|420|11|293|35|0|6.4|40|70|45|50|50|50|10
VEN|862|Venezuela|LA|28|90|1|123|8|0|2.3|20|65|25|50|65|35|55
GUY|328|Guyana|LA|0.83|25|0.1|3.4|0.7|0|6.1|55|60|20|10|10|10|2
SUR|740|Suriname|LA|0.63|4|0.05|1.8|0|0|6.8|50|60|15|10|15|10|5
ECU|218|Ecuador|LA|18|125|2.6|40|118|0|5.2|35|65|30|25|40|30|5
PER|604|Peru|LA|34.5|290|2.6|81|188|0|5.6|35|70|40|35|30|35|8
BOL|068|Bolivia|LA|12.4|50|0.6|34|0|0|4.3|35|65|20|20|25|20|20
BRA|076|Brazil|LA|212|2300|24|366|1340|0|6.5|50|70|55|55|35|55|8
CHL|152|Chile|LA|19.8|340|5.6|69|40|0|7.8|70|70|45|45|20|55|5
ARG|032|Argentina|LA|46|640|4.5|72|0|0|6.6|50|75|45|45|25|45|22
URY|858|Uruguay|LA|3.4|82|1.3|21|0|0|8.7|75|65|40|25|10|30|2
PRY|600|Paraguay|LA|6.9|45|0.4|14|165|0|5.9|45|70|20|20|25|20|5
GBR|826|United Kingdom|EU|69.5|3800|82|141|79|225|8.3|75|40|67|92|40|92|10
FRA|250|France|EU|68.6|3200|64.7|202|41|290|8|70|45|63|80|40|90|10
DEU|276|Germany|EU|83.5|4900|88.5|182|34|0|8.7|80|30|66|70|25|88|5
ITA|380|Italy|EU|59|2400|38|161|18|0|7.6|65|40|57|62|30|80|5
ESP|724|Spain|EU|48.6|1800|24.6|122|15|0|8|70|40|55|55|25|75|5
PRT|620|Portugal|EU|10.6|320|4.5|24|210|0|8.1|80|50|45|40|20|60|3
NLD|528|Netherlands|EU|18|1200|22.9|41|6|0|9|85|30|52|66|20|82|3
BEL|056|Belgium|EU|11.8|680|7.8|23|5|0|7.6|75|30|45|45|20|70|3
LUX|442|Luxembourg|EU|0.67|95|0.7|1|0|0|8.9|90|40|40|20|10|60|2
CHE|756|Switzerland|EU|9|950|6.5|21|123|0|9.3|95|55|59|50|10|75|2
AUT|040|Austria|EU|9.2|540|5.2|23|125|0|8.3|85|40|50|45|15|65|2
IRL|372|Ireland|EU|5.4|600|1.4|7.5|2|0|9.2|85|50|50|30|10|50|2
ISL|352|Iceland|EU|0.39|34|0|0|0|0|9.4|95|55|40|10|5|10|2
DNK|208|Denmark|EU|6|430|9.9|15|45|0|9.3|90|50|50|55|20|80|3
NOR|578|Norway|EU|5.6|500|10.4|26|40|0|9.8|92|55|52|60|15|85|3
SWE|752|Sweden|EU|10.6|620|12|15|32|0|9.4|88|45|54|62|15|85|3
FIN|246|Finland|EU|5.6|310|7.3|24|238|0|9.3|92|80|48|60|20|80|3
EST|233|Estonia|EU|1.37|43|1.6|7.7|230|0|8|75|60|35|55|20|65|3
LVA|428|Latvia|EU|1.85|45|1.7|8.8|16|0|7.4|70|55|30|40|20|55|3
LTU|440|Lithuania|EU|2.9|85|2.3|23|104|0|7.9|75|55|32|45|20|55|3
POL|616|Poland|EU|36.6|950|38|216|0|0|7.2|75|60|45|60|35|75|5
CZE|203|Czechia|EU|10.9|360|4.6|27|3|0|7.9|80|30|42|45|20|65|3
SVK|703|Slovakia|EU|5.4|140|2.4|13|0|0|7|65|40|35|30|20|55|3
HUN|348|Hungary|EU|9.6|230|4.8|41|20|0|6.6|70|50|40|40|25|55|8
ROU|642|Romania|EU|19|410|8.8|72|55|0|6.4|60|55|38|50|25|55|5
BGR|100|Bulgaria|EU|6.4|115|1.8|37|3|0|6.4|50|45|32|35|25|45|3
GRC|300|Greece|EU|10.3|260|8.1|132|289|0|8.1|65|65|52|50|25|70|5
CYP|196|Cyprus|EU|1.3|37|0.6|12|50|0|7.4|70|65|30|30|15|40|15
MLT|470|Malta|EU|0.56|25|0.1|1.7|0|0|7.9|80|55|35|15|10|30|2
SVN|705|Slovenia|EU|2.1|75|1.1|6.4|1|0|7.8|80|45|35|30|15|55|2
HRV|191|Croatia|EU|3.8|95|1.5|15|0|0|6.5|65|65|38|40|25|55|5
BIH|070|Bosnia and Herzegovina|EU|3.2|30|0.2|10|0|0|5|35|40|20|20|35|30|15
SRB|688|Serbia|EU|6.6|85|2|28|50|0|6.2|55|65|30|45|45|45|40
MNE|499|Montenegro|EU|0.62|8|0.1|2.3|0|0|6.7|50|55|25|15|20|30|5
MKD|807|North Macedonia|EU|1.8|16|0.3|8|5|0|6|50|45|20|20|25|30|5
ALB|008|Albania|EU|2.7|27|0.3|6.6|0|0|6.2|50|70|30|25|25|30|5
XKX|-|Kosovo|EU|1.6|11|0.1|5|0|0|6|40|75|20|20|20|25|10
MDA|498|Moldova|EU|2.4|19|0.1|5|58|0|6|40|45|25|20|20|25|10
UKR|804|Ukraine|EU|33|200|64.7|900|1200|0|5|25|85|50|78|40|70|20
BLR|112|Belarus|EU|9.1|75|1.5|48|290|0|2|50|50|20|50|65|45|15
RUS|643|Russia|EU|144|2100|149|1320|2000|5459|2|45|60|50|88|88|85|90
AND|020|Andorra|EU|0.08|4|0|0|0|0|9|95|50|30|5|5|5|2
MCO|492|Monaco|EU|0.04|9|0|0|0|0|8|95|50|40|5|5|5|2
LIE|438|Liechtenstein|EU|0.04|7|0|0|0|0|9|95|50|30|5|5|5|2
SMR|674|San Marino|EU|0.034|2|0|0|0|0|8.5|95|55|25|5|5|5|2
VAT|336|Vatican City|EU|0.0008|0.1|0|0|0|0|3|99|50|50|20|5|5|2
TUR|792|Turkey|ME|86|1450|25|355|380|0|4.3|50|75|52|72|60|70|45
ISR|376|Israel|ME|10|560|46.5|170|465|90|7.8|50|85|45|95|70|92|50
PSE|275|Palestine|ME|5.5|15|0|30|0|0|3.5|5|90|25|20|55|5|60
LBN|422|Lebanon|ME|5.8|20|0.6|60|0|0|3.6|15|70|30|30|40|30|10
SYR|760|Syria|ME|24|25|0.8|80|0|0|1.5|15|50|15|35|70|20|15
JOR|400|Jordan|ME|11.5|55|2.3|100|65|0|3.2|55|65|35|65|35|45|5
IRQ|368|Iraq|ME|46.5|260|6|193|0|0|3|25|55|25|40|55|35|10
IRN|364|Iran|ME|91.5|400|7.9|610|350|0|1.96|35|60|35|75|80|55|70
SAU|682|Saudi Arabia|ME|35|1100|80|257|0|0|2.08|65|65|52|60|65|65|30
KWT|414|Kuwait|ME|5|160|7.8|17.5|24|0|3.5|70|65|40|35|20|50|3
BHR|048|Bahrain|ME|1.6|47|1.4|8.2|0|0|2.5|55|60|35|40|45|45|3
QAT|634|Qatar|ME|3|220|9|16.5|0|0|3.6|85|65|55|50|25|55|5
ARE|784|United Arab Emirates|ME|10.5|550|24|63|130|0|2.9|85|70|56|70|50|75|25
OMN|512|Oman|ME|5.3|110|6.5|42.6|0|0|3|75|65|40|40|20|50|3
YEM|887|Yemen|ME|40|17|1.5|120|0|0|1.8|5|70|10|30|80|25|60
EGY|818|Egypt|ME|117|350|4.5|438|479|0|2.8|45|70|40|62|65|55|15
LBY|434|Libya|ME|7.4|45|2|40|0|0|2|10|50|10|25|65|25|15
TUN|788|Tunisia|ME|12.3|52|1.2|36|0|0|4.7|45|60|30|30|30|30|5
DZA|012|Algeria|ME|47|270|21.8|139|150|0|3.6|45|75|30|55|55|55|25
MAR|504|Morocco|ME|38|165|5.5|196|150|0|5|60|90|38|55|40|50|40
MRT|478|Mauritania|AF|5|11|0.3|16|0|0|4|40|70|15|25|35|20|5
NGA|566|Nigeria|AF|232|250|2.1|143|0|0|4.2|20|75|35|40|55|35|10
GHA|288|Ghana|AF|34.4|82|0.3|16|0|0|6.3|60|70|35|25|20|25|5
CIV|384|Côte d'Ivoire|AF|31.9|85|0.9|27|0|0|4.2|45|65|30|25|30|25|5
SEN|686|Senegal|AF|18.5|33|0.5|14|0|0|5.7|60|70|35|25|20|25|5
GMB|270|Gambia|AF|2.8|2.5|0.02|1|0|0|4.5|50|65|15|10|20|10|3
GNB|624|Guinea-Bissau|AF|2.2|2.2|0.03|4.5|0|0|2.6|20|60|10|10|35|10|3
GIN|324|Guinea|AF|14.5|25|0.3|10|0|0|2.3|25|60|15|20|50|15|5
SLE|694|Sierra Leone|AF|8.9|7.5|0.04|8.5|0|0|5.2|40|65|15|10|25|10|3
LBR|430|Liberia|AF|5.6|4.8|0.02|2|0|0|5.3|35|65|15|10|25|10|3
TGO|768|Togo|AF|9.5|10|0.15|9|0|0|2.8|35|60|15|20|40|15|3
BEN|204|Benin|AF|14.5|22|0.15|7|0|0|4.3|45|65|20|15|30|15|3
MLI|466|Mali|AF|24.5|22|0.9|21|0|0|2.1|10|75|15|25|70|20|25
BFA|854|Burkina Faso|AF|23.5|22|1|12|0|0|2.4|8|75|15|20|70|20|15
NER|562|Niger|AF|27|20|0.3|33|0|0|2|10|70|12|20|60|15|10
TCD|148|Chad|AF|19.5|19|0.6|33|0|0|1.7|10|65|12|25|60|20|10
CMR|120|Cameroon|AF|29.5|55|0.5|25|0|0|2.6|20|60|20|30|50|20|5
CAF|140|Central African Republic|AF|5.5|2.8|0.04|9|0|0|1.4|3|50|8|15|70|10|5
GAB|266|Gabon|AF|2.5|21|0.3|5|0|0|3|45|60|15|15|30|15|3
GNQ|226|Equatorial Guinea|AF|1.8|13|0.1|1.5|0|0|1.9|40|50|10|15|50|15|5
COG|178|Republic of the Congo|AF|6.3|15|0.3|10|0|0|3.1|35|55|15|20|40|15|5
COD|180|DR Congo|AF|110|70|0.8|134|0|0|1.5|5|60|15|25|75|15|15
AGO|024|Angola|AF|38|85|1.3|107|0|0|3.9|40|60|25|30|40|25|5
SDN|729|Sudan|AF|50|30|1.5|200|0|0|1.4|2|50|10|45|92|25|20
SSD|728|South Sudan|AF|11.9|5|0.1|185|0|0|1.5|3|40|5|15|80|10|10
ETH|231|Ethiopia|AF|130|120|1.2|150|0|0|3.2|15|75|25|45|75|30|50
ERI|232|Eritrea|AF|3.6|2.6|0.2|202|120|0|1.9|25|80|10|40|75|15|30
DJI|262|Djibouti|AF|1.2|4.5|0.2|10|0|0|2.7|50|60|20|20|30|20|5
SOM|706|Somalia|AF|19|12|0.2|20|0|0|2|5|60|10|20|60|10|25
KEN|404|Kenya|AF|56.4|130|1.3|24|0|0|5|40|65|40|40|35|35|5
UGA|800|Uganda|AF|50|57|1|45|10|0|4.5|35|60|25|40|55|25|15
RWA|646|Rwanda|AF|14.3|15|0.2|33|0|0|3.3|70|75|35|60|65|35|45
BDI|108|Burundi|AF|13.6|3|0.1|30|0|0|2.1|20|55|10|30|70|10|15
TZA|834|Tanzania|AF|69|85|1|27|80|0|5.3|55|65|30|30|30|25|5
ZMB|894|Zambia|AF|21|28|0.4|15|3|0|5.7|55|60|25|20|20|20|3
MWI|454|Malawi|AF|21.6|11|0.1|11|0|0|5.8|40|60|15|10|20|10|3
MOZ|508|Mozambique|AF|34.6|23|0.2|11|0|0|3.5|20|55|15|20|45|15|5
ZWE|716|Zimbabwe|AF|16.6|37|0.3|29|0|0|2.9|30|60|15|35|55|20|5
NAM|516|Namibia|AF|3|13|0.4|9.5|0|0|6.5|60|60|25|15|15|20|3
BWA|072|Botswana|AF|2.5|20|0.6|9|0|0|7.6|75|65|35|20|10|25|3
ZAF|710|South Africa|AF|64|420|2.8|74|15|0|7.1|40|60|45|45|25|50|5
LSO|426|Lesotho|AF|2.3|2.3|0.04|2|0|0|6.1|40|60|15|5|20|10|3
SWZ|748|Eswatini|AF|1.2|5|0.1|3|0|0|3|45|60|15|10|40|10|3
MDG|450|Madagascar|AF|31|17|0.1|13.5|0|0|5.7|30|60|20|10|30|10|5
MUS|480|Mauritius|AF|1.3|15|0.02|0|0|0|8|75|60|30|10|10|10|5
SYC|690|Seychelles|AF|0.12|2.2|0.03|0.4|0|0|7|75|60|30|10|10|10|2
COM|174|Comoros|AF|0.85|1.4|0|0.5|0|0|3.5|35|60|10|5|25|5|10
CPV|132|Cabo Verde|AF|0.6|2.8|0.01|1.2|0|0|7.6|70|65|25|5|10|10|2
STP|678|São Tomé and Príncipe|AF|0.23|0.7|0|0.3|0|0|6|60|60|10|5|10|5|2
KAZ|398|Kazakhstan|CA|20.3|290|2|39|0|0|3.1|55|65|30|45|40|40|5
UZB|860|Uzbekistan|CA|36.8|115|1.5|48|0|0|2.1|55|65|25|45|45|35|5
TKM|795|Turkmenistan|CA|7.5|80|0.8|36|0|0|1.7|55|60|10|35|50|25|3
KGZ|417|Kyrgyzstan|CA|7.2|17|0.2|11|0|0|3.6|40|65|20|25|35|20|15
TJK|762|Tajikistan|CA|10.6|14|0.1|9|0|0|1.9|45|65|15|30|50|15|15
AFG|004|Afghanistan|CA|43|17|0.5|150|0|0|0.3|10|70|5|30|85|10|25
GEO|268|Georgia|CA|3.7|33|0.6|20|0|0|4.7|45|70|30|30|25|35|15
ARM|051|Armenia|CA|3|26|1.4|42|210|0|5.4|45|75|30|35|30|40|10
AZE|031|Azerbaijan|CA|10.2|75|3.3|64|300|0|2.8|55|85|30|50|60|50|40
IND|356|India|SA|1460|4200|86|1475|1155|180|7.3|55|80|55|72|50|75|30
PAK|586|Pakistan|SA|255|375|10.2|660|550|170|3.6|25|85|30|75|65|55|45
BGD|050|Bangladesh|SA|175|460|4.3|163|0|0|4.4|35|80|30|35|40|35|5
LKA|144|Sri Lanka|SA|22|100|1.5|200|0|0|6.2|45|70|30|35|45|30|5
NPL|524|Nepal|SA|30|45|0.4|96|0|0|4.6|35|65|30|20|25|15|3
BTN|064|Bhutan|SA|0.8|3.3|0.05|8|0|0|5.6|80|70|30|10|5|10|2
MDV|462|Maldives|SA|0.53|7.5|0.1|4|0|0|5|50|60|20|10|10|10|2
CHN|156|China|EA|1409|19500|314|2035|510|600|2.1|75|75|73|90|70|92|75
JPN|392|Japan|EA|123.5|4200|55.3|247|56|0|8.5|90|25|66|60|15|92|10
KOR|410|South Korea|EA|51.7|1850|47.6|500|3100|0|7.75|70|55|60|68|25|88|10
PRK|408|North Korea|EA|26.4|28|4|1280|600|50|1.08|50|85|10|70|95|40|70
TWN|158|Taiwan|EA|23.4|820|16.5|169|1657|0|8.8|80|60|50|60|15|80|5
MNG|496|Mongolia|EA|3.5|23|0.2|9.7|137|0|6.4|65|75|30|25|15|25|3
VNM|704|Vietnam|SE|101|490|6.5|450|5000|0|2.6|60|90|40|60|55|50|20
THA|764|Thailand|SE|71.6|545|5.8|361|200|0|6.3|45|65|45|45|40|50|15
MMR|104|Myanmar|SE|54.5|65|2.7|150|0|0|0.96|5|50|10|40|90|25|15
KHM|116|Cambodia|SE|17.6|50|1.3|124|0|0|2.2|50|70|20|25|50|20|20
LAO|418|Laos|SE|7.8|16|0.03|29|0|0|1.7|55|65|10|20|40|15|3
MYS|458|Malaysia|SE|35.9|450|4|113|52|0|7.3|70|70|45|40|25|50|5
SGP|702|Singapore|SE|6|550|13|51|252|0|6.2|95|55|52|60|20|80|3
IDN|360|Indonesia|SE|284|1450|9.9|400|400|0|6.4|50|70|45|50|45|50|5
PHL|608|Philippines|SE|116|500|4.5|146|131|0|6.7|45|65|40|40|45|40|10
BRN|096|Brunei|SE|0.46|16|0.5|7|0.7|0|3|85|65|25|15|20|30|3
TLS|626|Timor-Leste|SE|1.4|2|0.04|2.3|0|0|7|55|70|15|10|10|10|3
AUS|036|Australia|OC|27.4|1800|33.8|58|30|0|8.8|85|50|58|72|25|85|5
NZL|554|New Zealand|OC|5.3|260|2.5|9.2|3|0|9.6|90|45|52|50|10|65|2
PNG|598|Papua New Guinea|OC|10.5|32|0.1|4|0|0|6|30|60|15|10|30|10|3
FJI|242|Fiji|OC|0.93|6|0.1|4|6|0|5.6|55|90|25|15|25|15|3
SLB|090|Solomon Islands|OC|0.75|1.7|0|0|0|0|6|40|65|15|5|20|5|3
VUT|548|Vanuatu|OC|0.33|1.1|0|0|0|0|6.5|60|65|15|5|10|5|2
WSM|882|Samoa|OC|0.22|1|0|0|0|0|6.5|70|65|15|5|10|5|2
TON|776|Tonga|OC|0.1|0.55|0.01|0.6|0|0|6|65|70|15|5|10|5|2
KIR|296|Kiribati|OC|0.13|0.3|0|0|0|0|6|60|65|10|5|10|5|2
FSM|583|Micronesia|OC|0.11|0.5|0|0|0|0|7|70|60|10|5|10|5|2
MHL|584|Marshall Islands|OC|0.04|0.3|0|0|0|0|7|70|60|10|5|10|5|2
PLW|585|Palau|OC|0.018|0.3|0|0|0|0|7.5|75|60|10|5|10|5|2
NRU|520|Nauru|OC|0.012|0.15|0|0|0|0|6|65|60|5|5|10|5|2
TUV|798|Tuvalu|OC|0.011|0.07|0|0|0|0|7|70|60|5|5|10|5|2
`;

// Fallback coordinates [lon, lat] for countries too small to appear on the map.
const FALLBACK_COORDS = { TUV: [179.2, -8.5], XKX: [20.9, 42.6] };

// Map features that belong to a sovereign state (territories, dependencies).
const TERRITORIES = {
  '304': 'DNK', '234': 'DNK', '630': 'USA', '316': 'USA', '850': 'USA', '580': 'USA', '016': 'USA',
  '540': 'FRA', '258': 'FRA', '666': 'FRA', '876': 'FRA', '663': 'FRA', '652': 'FRA', '260': 'FRA',
  '238': 'GBR', '060': 'GBR', '136': 'GBR', '092': 'GBR', '796': 'GBR', '500': 'GBR', '660': 'GBR',
  '654': 'GBR', '612': 'GBR', '086': 'GBR', '239': 'GBR', '832': 'GBR', '831': 'GBR', '833': 'GBR',
  '533': 'NLD', '531': 'NLD', '534': 'NLD', '344': 'CHN', '446': 'CHN', '248': 'FIN',
  '574': 'AUS', '334': 'AUS', '184': 'NZL', '570': 'NZL'
};
const TERRITORY_NAMES = { 'Indian Ocean Ter.': 'AUS', 'Kosovo': 'XKX' };

/* Alliances & alignments. s = how likely a member is to fight for another (0-1). */
const ALLIANCES = [
  { id: 'NATO', name: 'NATO (Article 5)', s: 0.85, members: ['USA','CAN','GBR','FRA','DEU','ITA','ESP','PRT','NLD','BEL','LUX','DNK','NOR','ISL','POL','CZE','SVK','HUN','ROU','BGR','GRC','TUR','HRV','SVN','ALB','MNE','MKD','EST','LVA','LTU','FIN','SWE'] },
  { id: 'EU', name: 'EU mutual-defence clause (Art. 42.7)', s: 0.45, members: ['AUT','BEL','BGR','HRV','CYP','CZE','DNK','EST','FIN','FRA','DEU','GRC','HUN','IRL','ITA','LVA','LTU','LUX','MLT','NLD','POL','PRT','ROU','SVK','SVN','ESP','SWE'] },
  { id: 'USPAC', name: 'US Pacific treaty alliances', s: 0.75, members: ['USA','JPN','KOR','AUS','PHL'] },
  { id: 'USTHA', name: 'US–Thailand / ANZUS legacy ties', s: 0.35, members: ['USA','THA','NZL'] },
  { id: 'AUKUS', name: 'AUKUS', s: 0.8, members: ['USA','GBR','AUS'] },
  { id: 'USISR', name: 'US–Israel strategic partnership', s: 0.65, members: ['USA','ISR'] },
  { id: 'USTWN', name: 'US–Taiwan (Taiwan Relations Act, strategic ambiguity)', s: 0.55, members: ['USA','TWN'] },
  { id: 'JPNTWN', name: 'Japan–Taiwan contingency linkage', s: 0.35, members: ['JPN','TWN'] },
  { id: 'USGULF', name: 'US–Gulf security partnerships', s: 0.35, members: ['USA','SAU','ARE','QAT','KWT','BHR'] },
  { id: 'QUAD', name: 'Quad', s: 0.2, members: ['USA','IND','JPN','AUS'] },
  { id: 'FPDA', name: 'Five Power Defence Arrangements', s: 0.3, members: ['GBR','AUS','NZL','MYS','SGP'] },
  { id: 'GRCCYP', name: 'Greece–Cyprus joint defence doctrine', s: 0.75, members: ['GRC','CYP'] },
  { id: 'GRCFRA', name: 'France–Greece mutual assistance (2021)', s: 0.5, members: ['GRC','FRA'] },
  { id: 'CSTO', name: 'CSTO', s: 0.45, members: ['RUS','BLR','KAZ','KGZ','TJK'] },
  { id: 'UNION', name: 'Russia–Belarus Union State', s: 0.95, members: ['RUS','BLR'] },
  { id: 'RUPRK', name: 'Russia–DPRK mutual-defence treaty (2024)', s: 0.6, members: ['RUS','PRK'] },
  { id: 'CNPRK', name: 'China–DPRK treaty of friendship', s: 0.55, members: ['CHN','PRK'] },
  { id: 'CNPAK', name: 'China–Pakistan "all-weather" partnership', s: 0.35, members: ['CHN','PAK'] },
  { id: 'CNRU', name: 'China–Russia "no limits" partnership', s: 0.25, members: ['CHN','RUS'] },
  { id: 'RUIRN', name: 'Russia–Iran strategic partnership', s: 0.2, members: ['RUS','IRN'] },
  { id: 'AXIS', name: 'Iran-aligned "Axis of Resistance"', s: 0.45, members: ['IRN','YEM'] },
  { id: 'IRNIRQ', name: 'Iran–Iraqi militia networks', s: 0.15, members: ['IRN','IRQ'] },
  { id: 'SAPAK', name: 'Saudi–Pakistan mutual defence pact (2025)', s: 0.5, members: ['SAU','PAK'] },
  { id: 'GCC', name: 'Gulf Cooperation Council', s: 0.5, members: ['SAU','ARE','QAT','KWT','BHR','OMN'] },
  { id: 'TURAZE', name: 'Turkey–Azerbaijan Shusha Declaration', s: 0.6, members: ['TUR','AZE'] },
  { id: 'TURPAK', name: 'Turkey–Pakistan strategic ties', s: 0.2, members: ['TUR','PAK'] },
  { id: 'AES', name: 'Alliance of Sahel States', s: 0.8, members: ['MLI','BFA','NER'] },
  { id: 'AFRCORPS', name: 'Russian Africa Corps presence', s: 0.3, members: ['RUS','MLI','BFA','NER','CAF'] },
  { id: 'ALBA', name: 'ALBA bloc', s: 0.25, members: ['VEN','CUB','NIC','BOL'] },
  { id: 'RUVEN', name: 'Russia–Venezuela ties', s: 0.15, members: ['RUS','VEN'] },
  { id: 'EGYSDN', name: 'Egypt–Sudan defence pact', s: 0.35, members: ['EGY','SDN'] },
  { id: 'ARMIND', name: 'India–Armenia arms partnership', s: 0.1, members: ['IND','ARM'] },
  { id: 'INDBTN', name: 'India–Bhutan security treaty', s: 0.7, members: ['IND','BTN'] },
  { id: 'GBRFRA', name: 'Lancaster House / Northwood (UK–France nuclear coordination)', s: 0.7, members: ['GBR','FRA'] },
  { id: 'ARAB', name: 'Arab League', s: 0.12, members: ['SAU','ARE','QAT','KWT','BHR','OMN','EGY','JOR','IRQ','SYR','LBN','YEM','LBY','TUN','DZA','MAR','MRT','SDN','SOM','DJI','COM','PSE'] },
  { id: 'SADC', name: 'SADC mutual defence pact', s: 0.2, members: ['ZAF','AGO','BWA','COD','LSO','MDG','MWI','MUS','MOZ','NAM','SYC','SWZ','TZA','ZMB','ZWE','COM'] },
  { id: 'ECOWAS', name: 'ECOWAS standby force', s: 0.2, members: ['NGA','GHA','CIV','SEN','GMB','GNB','GIN','SLE','LBR','TGO','BEN','CPV'] },
  { id: 'UKRAID', name: 'Ukraine Defense Contact Group (arms, not troops)', s: 0.15, members: ['UKR','USA','GBR','FRA','DEU','POL','NLD','DNK','SWE','NOR','FIN','CAN','EST','LVA','LTU','CZE'] }
];

/* Known dyadic flashpoints. t = tension (0-1). active = ongoing interstate war. */
const RIVALRIES = [
  ['RUS','UKR',1.0,'Full-scale war since Feb 2022; attritional front, on-off ceasefire diplomacy',true],
  ['ISR','PSE',0.95,'Gaza war from Oct 2023; fragile ceasefire since Oct 2025',true],
  ['ISR','IRN',0.9,'Direct strikes in 2024 and the June 2025 "12-Day War"; nuclear programme'],
  ['ISR','LBN',0.75,'Hezbollah front; 2024 ground incursion, repeated ceasefire violations'],
  ['ISR','YEM',0.7,'Houthi missile & drone attacks; Israeli strikes on Hodeidah & Sanaa'],
  ['ISR','SYR',0.55,'Post-Assad buffer-zone occupation and air strikes'],
  ['ISR','TUR',0.45,'Competing influence in Syria; Gaza rhetoric'],
  ['ISR','QAT',0.3,'Sept 2025 Israeli strike on Hamas leaders in Doha'],
  ['ISR','IRQ',0.3,'Iraqi militia drone launches'],
  ['ISR','EGY',0.2,'Sinai / Rafah border friction'],
  ['USA','IRN',0.75,'US strikes on Fordow/Natanz (June 2025); Gulf naval standoffs'],
  ['USA','VEN',0.7,'US military pressure campaign & Caribbean strikes 2025–26'],
  ['USA','CHN',0.6,'Taiwan, South China Sea, tech & trade rivalry'],
  ['USA','YEM',0.6,'Red Sea shipping attacks; US strike campaigns'],
  ['USA','PRK',0.55,'Nuclear & ICBM programme'],
  ['USA','RUS',0.5,'Ukraine war, collapse of arms control'],
  ['USA','CUB',0.3,'Sanctions, Russian/Chinese presence'],
  ['USA','MEX',0.25,'Threatened strikes on cartels'],
  ['USA','DNK',0.15,'Pressure over Greenland'],
  ['USA','PAN',0.12,'Canal control rhetoric'],
  ['CHN','TWN',0.85,'Unification claim; large-scale PLA blockade drills'],
  ['CHN','PHL',0.65,'Second Thomas & Scarborough Shoal confrontations'],
  ['CHN','JPN',0.55,'Senkaku/Diaoyu; 2025 Taiwan-contingency dispute'],
  ['CHN','IND',0.55,'Line of Actual Control; 2020 Galwan clash'],
  ['CHN','VNM',0.4,'Paracel & Spratly disputes'],
  ['CHN','AUS',0.3,'Pacific influence; naval live-fire incidents'],
  ['CHN','KOR',0.2,'THAAD, Yellow Sea structures'],
  ['CHN','IDN',0.2,'Natuna EEZ incursions'],
  ['CHN','MYS',0.2,'South China Sea claims'],
  ['CHN','BTN',0.1,'Doklam border'],
  ['IND','PAK',0.85,'Kashmir; May 2025 missile & drone clashes'],
  ['PAK','AFG',0.75,'TTP sanctuaries; Oct 2025 border clashes'],
  ['PAK','IRN',0.35,'Baloch militancy; 2024 tit-for-tat strikes'],
  ['IND','BGD',0.2,'Post-2024 political rupture, border killings'],
  ['KOR','PRK',0.7,'Armistice line; artillery & drone incidents'],
  ['JPN','PRK',0.5,'Missile overflights'],
  ['JPN','RUS',0.3,'Kuril Islands'],
  ['JPN','KOR',0.08,'Historical disputes, Dokdo/Takeshima'],
  ['RUS','LTU',0.5,'Kaliningrad corridor & Suwałki Gap'],
  ['RUS','EST',0.45,'Narva, airspace violations'],
  ['RUS','LVA',0.45,'Hybrid pressure, Russian minority'],
  ['RUS','POL',0.45,'Drone incursions (Sept 2025), sabotage'],
  ['RUS','FIN',0.4,'1,340 km NATO border'],
  ['RUS','GEO',0.45,'Occupation of Abkhazia & South Ossetia'],
  ['RUS','MDA',0.4,'Transnistria garrison'],
  ['RUS','GBR',0.35,'Sabotage, intelligence war'],
  ['RUS','DEU',0.3,'Arms to Ukraine, sabotage'],
  ['RUS','FRA',0.3,'Africa competition, Ukraine'],
  ['RUS','ROU',0.3,'Black Sea drone debris'],
  ['RUS','SWE',0.3,'Baltic Sea cable sabotage'],
  ['RUS','NOR',0.25,'Arctic, Svalbard'],
  ['RUS','DNK',0.25,'Baltic shadow fleet, drone sightings'],
  ['RUS','AZE',0.3,'2025 diplomatic crisis after AZAL shoot-down'],
  ['RUS','KAZ',0.15,'Northern Kazakhstan rhetoric'],
  ['BLR','UKR',0.5,'Staging ground for 2022 invasion'],
  ['BLR','POL',0.4,'Border crisis, Wagner presence'],
  ['BLR','LTU',0.4,'Balloon incursions, border closures'],
  ['ARM','AZE',0.45,'Karabakh seized 2023; US-brokered framework Aug 2025'],
  ['IRN','AZE',0.35,'Zangezur corridor, Israel ties'],
  ['SRB','XKX',0.5,'Northern Kosovo; 2023 Banjska attack'],
  ['GRC','TUR',0.4,'Aegean airspace & EEZ, Cyprus'],
  ['CYP','TUR',0.4,'Occupation of northern Cyprus'],
  ['MAR','DZA',0.5,'Western Sahara, sealed border'],
  ['EGY','ETH',0.45,'Grand Ethiopian Renaissance Dam'],
  ['ETH','ERI',0.7,'Red Sea access rhetoric, troop build-ups'],
  ['ETH','SOM',0.35,'Somaliland port deal'],
  ['SDN','SSD',0.35,'Oil pipelines, Abyei'],
  ['SDN','TCD',0.4,'RSF supply lines'],
  ['SDN','ARE',0.4,'Alleged UAE support to RSF'],
  ['COD','RWA',0.8,'M23 offensive & fall of Goma (2025); fragile Washington accord'],
  ['BDI','RWA',0.45,'Border closure, mutual accusations'],
  ['COD','UGA',0.25,'Ituri operations'],
  ['RWA','UGA',0.15,'Regional rivalry'],
  ['MLI','DZA',0.45,'April 2025 drone shoot-down, airspace closures'],
  ['NER','BEN',0.35,'Border & pipeline dispute'],
  ['BFA','CIV',0.35,'Accusations of destabilisation'],
  ['ERI','DJI',0.2,'Ras Doumeira'],
  ['KEN','SOM',0.15,'Maritime border'],
  ['VEN','GUY',0.6,'Essequibo annexation claim'],
  ['VEN','COL',0.3,'Border armed groups'],
  ['ARG','GBR',0.2,'Falklands/Malvinas'],
  ['BOL','CHL',0.15,'Sea access'],
  ['GTM','BLZ',0.15,'Territorial claim at ICJ'],
  ['THA','KHM',0.7,'July 2025 border war; ceasefire'],
  ['MMR','BGD',0.25,'Rohingya, Arakan Army on border'],
  ['MMR','THA',0.15,'Border spillover'],
  ['IRN','SAU',0.35,'2023 détente atop proxy rivalry'],
  ['IRN','ARE',0.3,'Abu Musa & Tunbs islands'],
  ['IRN','AFG',0.3,'Helmand water, border'],
  ['SAU','YEM',0.5,'Houthi war (truce since 2022)'],
  ['ARE','YEM',0.3,'Southern Yemen'],
  ['TUR','SYR',0.25,'Kurdish-held north-east'],
  ['TUR','IRQ',0.25,'Operations against PKK'],
  ['LBN','SYR',0.3,'Border clashes 2025'],
  ['JOR','ISR',0.15,'West Bank tensions'],
  ['KGZ','TJK',0.3,'2021–22 border wars; 2025 border treaty'],
  ['AFG','TJK',0.3,'Northern border militancy'],
  ['UZB','KGZ',0.08,'Enclaves']
];

/* Short strategic profiles for key states. */
const NOTES = {
  USA: 'Only power with global reach: 11 carrier groups, ~750 overseas bases, unmatched ISR and logistics. Treaty network spans NATO and the Pacific. Domestic polarisation is the main constraint on long wars.',
  CHN: 'Largest navy by hull count and the world\'s biggest shipbuilder. PLA modernisation is aimed at a Taiwan contingency and denying US access inside the first island chain. Nuclear arsenal growing fast (~600 warheads).',
  RUS: 'Largest nuclear arsenal. Has absorbed heavy losses in Ukraine but rebuilt mass via a war economy, North Korean munitions and Iranian-design drones. High tolerance for casualties.',
  IND: 'Nuclear power with the world\'s second-largest army; two-front problem (China & Pakistan). Strategic autonomy—no treaty allies, buys arms from Russia, France, US and Israel.',
  PAK: 'Army-dominated state with fast-growing nuclear arsenal and tactical nuclear doctrine against India. ISI is among the world\'s most capable and aggressive services. New mutual-defence pact with Saudi Arabia.',
  ISR: 'Qualitatively dominant regional military with an undeclared nuclear arsenal, multi-layer missile defence and elite intelligence (Mossad, Unit 8200). Very high mobilisation capacity.',
  IRN: 'Large missile & drone arsenal and proxy network, but air defences and nuclear sites were badly damaged in 2024–25. Nuclear-threshold state.',
  PRK: 'Massive conventional army, artillery aimed at Seoul and ~50 nuclear warheads with ICBMs. Has combat-tested troops in Russia\'s war.',
  UKR: 'Combat-hardened, drone-innovative military sustained by Western aid. Extremely high societal resolve, under severe manpower strain.',
  TWN: 'Porcupine strategy: anti-ship missiles, mines, drones. Depends on US intervention; 160 km strait is its main defence.',
  GBR: 'Nuclear-armed, global intelligence leader (MI6, GCHQ, Five Eyes), two carriers, but small army.',
  FRA: 'Europe\'s most deployable military; independent nuclear deterrent and expeditionary tradition.',
  DEU: 'Europe\'s largest economy re-arming fast after the 2022 Zeitenwende; low public appetite for war.',
  JPN: 'Rapid build-up toward 2% GDP with counter-strike missiles; constitution and public opinion restrain offensive use.',
  KOR: 'Large, modern conscript military and huge reserve; world-class arms industry.',
  TUR: 'NATO\'s second-largest army, drone superpower, controls the Bosphorus; pursues independent regional policy.',
  SAU: 'Huge defence budget but limited combat effectiveness; security leans on the US and now Pakistan.',
  POL: 'Spending ~4.5% of GDP on defence, building Europe\'s largest land army.',
  EGY: 'Arab world\'s largest military; GERD dispute with Ethiopia.',
  VEN: 'Under heavy US military pressure; large militia but degraded conventional forces.',
  BRA: 'Regional giant with little external threat; focus on Amazon and internal security.'
};

/* Parse into objects */
const COUNTRIES = RAW.trim().split('\n').map(line => {
  const f = line.split('|');
  const n = i => parseFloat(f[i]);
  return {
    iso: f[0], num: f[1] === '-' ? null : f[1], name: f[2], region: f[3],
    pop: n(4), gdp: n(5), mil: n(6), troops: n(7), reserves: n(8), nukes: n(9),
    dem: n(10), stab: n(11), pat: n(12), soft: n(13), intel: n(14), vic: n(15),
    tech: n(16), rev: n(17), note: NOTES[f[0]] || ''
  };
});
const BY_ISO = Object.fromEntries(COUNTRIES.map(c => [c.iso, c]));
const BY_NUM = Object.fromEntries(COUNTRIES.filter(c => c.num).map(c => [c.num, c]));
