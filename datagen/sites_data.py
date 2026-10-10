# Registro de sitios: (dominio, país, tipo, grupo dueño, nombre, extras)
# tipo: tienda | aerolinea | agencia | hospedaje
# extras: p = expresión de URL de producto · path = prefijo de ruta obligatorio · v = expresión de URL de vuelos
S = []
def s(d, pais, tipo, gid, nombre, modelo=None, **x):
    if not modelo:
        if tipo == "aerolinea":
            modelo = "retailer"
        elif tipo in ("agencia", "hospedaje"):
            modelo = "marketplace"
        elif tipo == "tienda":
            if any(k in d for k in ["ebay", "etsy", "mercadolibre", "mercadolivre", "aliexpress", "temu", "shein", "shopee", "taobao", "tmall", "rakuten", "mercari", "claroshop"]):
                modelo = "marketplace"
            elif any(k in d for k in ["costco", "sams", "chedraui", "soriana", "elpalaciodehierro", "liverpool", "suburbia", "homedepot", "lowes", "kroger", "cvs", "walgreens", "macys", "canadiantire", "loblaws", "realcanadian", "shoppersdrug", "coto", "jumbo", "tesco", "sainsbury", "asda", "boots", "waitrose", "currys", "ocado", "marksandspencer", "lidl", "aldi", "dm.de", "rossmann", "e.leclerc", "leroymerlin", "elcorteingles", "mercadona", "esselunga", "coopshop", "uniqlo", "yodobashi", "oliveyoung", "daiso", "ssg", "fairprice", "shufersal", "dmart"]) or gid in ("inditex", "mulliez", "fastretailing"):
                modelo = "retailer"
            else:
                modelo = "mixto"
    S.append(dict(d=d, pais=pais, tipo=tipo, g=gid, nombre=nombre, modelo=modelo, **x))

AMZ = r"/(dp|gp/product|gp/aw/d)/"
for d, p in [("amazon.com","EE.UU."),("amazon.com.mx","México"),("amazon.ca","Canadá"),("amazon.com.br","Brasil"),("amazon.co.uk","Reino Unido"),
             ("amazon.de","Alemania"),("amazon.fr","Francia"),("amazon.es","España"),("amazon.it","Italia"),("amazon.co.jp","Japón"),("amazon.sg","Singapur"),("amazon.in","India")]:
    s(d, p, "tienda", "amazon_tienda", "Amazon", p=AMZ)
ML = r"(articulo\.|produto\.|/p/ML[A-Z]\d+|/ML[A-Z]-?\d+)"
for d, p in [("mercadolibre.com.mx","México"),("mercadolibre.com.ar","Argentina"),("mercadolibre.cl","Chile"),("mercadolivre.com.br","Brasil"),("mercadolibre.com.co","Colombia")]:
    s(d, p, "tienda", "mercadolibre", "Mercado Libre", p=ML)
s("walmart.com","EE.UU.","tienda","walmart_tienda","Walmart",p=r"/ip/")
s("walmart.ca","Canadá","tienda","walmart_tienda","Walmart Canadá",p=r"/ip/")
s("walmart.com.mx","México","tienda","walmex","Walmart México",p=r"/ip/")
s("bodegaaurrera.com.mx","México","tienda","walmex","Bodega Aurrera",p=r"/ip/")
s("sams.com.mx","México","tienda","walmex","Sam's Club México",p=r"/ip/")
s("lider.cl","Chile","tienda","walmart_tienda","Líder (Walmart Chile)")
# ---- EE.UU.
s("target.com","EE.UU.","tienda","target","Target",p=r"/p/")
s("bestbuy.com","EE.UU.","tienda","bestbuy","Best Buy",p=r"\.p(\?|$)")
s("homedepot.com","EE.UU.","tienda","homedepot","The Home Depot",p=r"/p/")
s("lowes.com","EE.UU.","tienda","lowes","Lowe's",p=r"/pd/")
s("costco.com","EE.UU.","tienda","costco_tienda","Costco",p=r"\.product\.")
s("ebay.com","EE.UU.","tienda","ebay","eBay",p=r"/itm/")
s("etsy.com","EE.UU.","tienda","etsy","Etsy",p=r"/listing/")
s("kroger.com","EE.UU.","tienda","kroger","Kroger",p=r"/p/")
s("cvs.com","EE.UU.","tienda","cvs","CVS",p=r"prodid")
s("walgreens.com","EE.UU.","tienda","walgreens","Walgreens",p=r"ID=")
s("macys.com","EE.UU.","tienda","macys","Macy's",p=r"/shop/product/")
s("temu.com","Global","tienda","pdd","Temu",p=r"-g-\d+\.html")
s("shein.com","Global","tienda","shein","Shein",p=r"-p-\d+")
s("aliexpress.com","Global","tienda","alibaba","AliExpress",p=r"/item/")
s("aliexpress.us","EE.UU.","tienda","alibaba","AliExpress",p=r"/item/")
# ---- México
s("liverpool.com.mx","México","tienda","liverpool","Liverpool",p=r"/pdp/")
s("suburbia.com.mx","México","tienda","liverpool","Suburbia",p=r"/pdp/")
s("coppel.com","México","tienda","coppel","Coppel")
s("elektra.mx","México","tienda","elektra","Elektra")
s("elektra.com.mx","México","tienda","elektra","Elektra")
s("soriana.com","México","tienda","soriana","Soriana")
s("chedraui.com.mx","México","tienda","chedraui","Chedraui")
s("sanborns.com.mx","México","tienda","sanborns","Sanborns")
s("sears.com.mx","México","tienda","sanborns","Sears México")
s("claroshop.com","México","tienda","sanborns","Claro Shop")
s("elpalaciodehierro.com","México","tienda","palacio","El Palacio de Hierro")
s("costco.com.mx","México","tienda","costco_tienda","Costco México")
s("homedepot.com.mx","México","tienda","homedepot","The Home Depot México")
# ---- Canadá
s("canadiantire.ca","Canadá","tienda","canadiantire","Canadian Tire",p=r"/pdp/")
s("bestbuy.ca","Canadá","tienda","bestbuy","Best Buy Canadá",p=r"/product/")
s("costco.ca","Canadá","tienda","costco_tienda","Costco Canadá",p=r"\.product\.")
s("loblaws.ca","Canadá","tienda","loblaw","Loblaws")
s("realcanadiansuperstore.ca","Canadá","tienda","loblaw","Real Canadian Superstore")
s("shoppersdrugmart.ca","Canadá","tienda","loblaw","Shoppers Drug Mart")
# ---- Brasil
s("magazineluiza.com.br","Brasil","tienda","magalu","Magazine Luiza",p=r"/p/")
s("magalu.com","Brasil","tienda","magalu","Magalu",p=r"/p/")
s("netshoes.com.br","Brasil","tienda","magalu","Netshoes")
s("casasbahia.com.br","Brasil","tienda","casasbahia","Casas Bahia")
s("americanas.com.br","Brasil","tienda","americanas","Americanas",p=r"/produto/")
s("shopee.com.br","Brasil","tienda","sea","Shopee Brasil",p=r"-i\.\d+\.\d+")
s("carrefour.com.br","Brasil","tienda","carrefour","Carrefour Brasil")
# ---- Argentina y Chile
s("carrefour.com.ar","Argentina","tienda","carrefour","Carrefour Argentina")
s("cotodigital.com.ar","Argentina","tienda","coto","Coto Digital")
s("cotodigital3.com.ar","Argentina","tienda","coto","Coto Digital")
s("falabella.com","Chile","tienda","falabella","Falabella",p=r"/product/")
s("falabella.com.ar","Argentina","tienda","falabella","Falabella",p=r"/product/")
s("sodimac.cl","Chile","tienda","falabella","Sodimac",p=r"/product/")
s("ripley.cl","Chile","tienda","ripley","Ripley")
s("paris.cl","Chile","tienda","cencosud","Paris")
s("jumbo.cl","Chile","tienda","cencosud","Jumbo")
# ---- Reino Unido
s("tesco.com","Reino Unido","tienda","tesco","Tesco",p=r"/products/")
s("sainsburys.co.uk","Reino Unido","tienda","sainsburys","Sainsbury's",p=r"/product/")
s("argos.co.uk","Reino Unido","tienda","sainsburys","Argos",p=r"/product/")
s("asda.com","Reino Unido","tienda","asda","Asda",p=r"/product/")
s("boots.com","Reino Unido","tienda","walgreens","Boots")
s("johnlewis.com","Reino Unido","tienda","johnlewis","John Lewis",p=r"/p\d+")
s("waitrose.com","Reino Unido","tienda","johnlewis","Waitrose",p=r"/products/")
s("currys.co.uk","Reino Unido","tienda","currys","Currys",p=r"/products/")
s("asos.com","Reino Unido","tienda","asos","ASOS",p=r"/prd/")
s("next.co.uk","Reino Unido","tienda","next","Next",p=r"/style/")
s("ocado.com","Reino Unido","tienda","ocado","Ocado",p=r"/products/")
s("marksandspencer.com","Reino Unido","tienda","marks","Marks & Spencer",p=r"/p/")
s("ebay.co.uk","Reino Unido","tienda","ebay","eBay UK",p=r"/itm/")
# ---- Alemania
s("otto.de","Alemania","tienda","otto","Otto",p=r"/p/")
for d, p in [("zalando.de","Alemania"),("zalando.co.uk","Reino Unido"),("zalando.fr","Francia"),("zalando.es","España"),("zalando.it","Italia")]:
    s(d, p, "tienda", "zalando", "Zalando")
s("mediamarkt.de","Alemania","tienda","ceconomy","MediaMarkt",p=r"/product/")
s("saturn.de","Alemania","tienda","ceconomy","Saturn",p=r"/product/")
s("lidl.de","Alemania","tienda","schwarz","Lidl",p=r"/p/")
s("kaufland.de","Alemania","tienda","schwarz","Kaufland",p=r"/product/")
s("aldi-sued.de","Alemania","tienda","aldi","Aldi Süd")
s("aldi-nord.de","Alemania","tienda","aldi","Aldi Nord")
s("dm.de","Alemania","tienda","dm","dm",p=r"-p\d+\.html")
s("rossmann.de","Alemania","tienda","rossmann","Rossmann",p=r"/p/")
s("ebay.de","Alemania","tienda","ebay","eBay Alemania",p=r"/itm/")
# ---- Francia
s("cdiscount.com","Francia","tienda","casino","Cdiscount",p=r"/f-")
s("fnac.com","Francia","tienda","fnac","Fnac",p=r"/a\d+")
s("darty.com","Francia","tienda","fnac","Darty")
s("carrefour.fr","Francia","tienda","carrefour","Carrefour",p=r"/p/")
s("e.leclerc","Francia","tienda","leclerc","E.Leclerc")
s("auchan.fr","Francia","tienda","mulliez","Auchan",p=r"/pr-")
s("boulanger.com","Francia","tienda","mulliez","Boulanger",p=r"/ref/")
for d, p in [("decathlon.fr","Francia"),("decathlon.es","España"),("decathlon.it","Italia"),("decathlon.de","Alemania"),("decathlon.co.uk","Reino Unido"),("decathlon.ca","Canadá"),("decathlon.com.mx","México"),("decathlon.com.br","Brasil")]:
    s(d, p, "tienda", "mulliez", "Decathlon", p=r"/p/")
s("leroymerlin.fr","Francia","tienda","mulliez","Leroy Merlin")
s("leroymerlin.es","España","tienda","mulliez","Leroy Merlin")
# ---- España
s("elcorteingles.es","España","tienda","elcorteingles","El Corte Inglés")
s("carrefour.es","España","tienda","carrefour","Carrefour España")
s("mercadona.es","España","tienda","mercadona","Mercadona")
s("mediamarkt.es","España","tienda","ceconomy","MediaMarkt España",p=r"/product/")
s("fnac.es","España","tienda","fnac","Fnac España")
for d, n in [("zara.com","Zara"),("pullandbear.com","Pull&Bear"),("bershka.com","Bershka"),("massimodutti.com","Massimo Dutti"),("stradivarius.com","Stradivarius"),("oysho.com","Oysho"),("zarahome.com","Zara Home")]:
    s(d, "España", "tienda", "inditex", n, p=r"-p\d+\.html")
# ---- Italia
s("esselunga.it","Italia","tienda","esselunga","Esselunga")
s("coopshop.it","Italia","tienda","coop_it","Coop")
s("mediaworld.it","Italia","tienda","ceconomy","MediaWorld",p=r"/product/")
s("unieuro.it","Italia","tienda","fnac","Unieuro")
s("ebay.it","Italia","tienda","ebay","eBay Italia",p=r"/itm/")
# ---- China
s("taobao.com","China","tienda","alibaba","Taobao",p=r"item\.taobao")
s("tmall.com","China","tienda","alibaba","Tmall",p=r"detail\.tmall")
s("jd.com","China","tienda","jd","JD.com",p=r"item\.jd\.com")
s("yangkeduo.com","China","tienda","pdd","Pinduoduo")
s("pinduoduo.com","China","tienda","pdd","Pinduoduo")
s("suning.com","China","tienda","suning","Suning",p=r"product\.suning")
# ---- Japón
s("rakuten.co.jp","Japón","tienda","rakuten","Rakuten Ichiba",p=r"item\.rakuten")
s("shopping.yahoo.co.jp","Japón","tienda","lycorp","Yahoo! Shopping",p=r"/item|/products/")
s("mercari.com","Japón","tienda","mercari","Mercari",p=r"/item/")
s("uniqlo.com","Japón","tienda","fastretailing","Uniqlo",p=r"/products/")
s("yodobashi.com","Japón","tienda","yodobashi","Yodobashi",p=r"/product/")
# ---- Corea del Sur
s("coupang.com","Corea del Sur","tienda","coupang","Coupang",p=r"/vp/products/")
s("smartstore.naver.com","Corea del Sur","tienda","naver","Naver Smart Store",p=r"/products/")
s("brand.naver.com","Corea del Sur","tienda","naver","Naver Brand Store",p=r"/products/")
s("shopping.naver.com","Corea del Sur","tienda","naver","Naver Shopping")
s("gmarket.co.kr","Corea del Sur","tienda","gmarket","Gmarket")
s("ssg.com","Corea del Sur","tienda","shinsegae","SSG.com")
s("lotteon.com","Corea del Sur","tienda","lotte","Lotte ON")
s("11st.co.kr","Corea del Sur","tienda","elevenst","11st",p=r"/products/")
# ---- Singapur
s("shopee.sg","Singapur","tienda","sea","Shopee",p=r"-i\.\d+\.\d+")
s("lazada.sg","Singapur","tienda","alibaba","Lazada",p=r"-i\d+")
s("fairprice.com.sg","Singapur","tienda","fairprice","FairPrice",p=r"/product/")
# ---- Israel
s("shufersal.co.il","Israel","tienda","shufersal","Shufersal")
s("rami-levy.co.il","Israel","tienda","ramilevy","Rami Levy")
# ---- India
s("flipkart.com","India","tienda","flipkart","Flipkart",p=r"/p/")
s("myntra.com","India","tienda","flipkart","Myntra")
s("jiomart.com","India","tienda","reliance_retail","JioMart",p=r"/p/")
s("ajio.com","India","tienda","reliance_retail","Ajio",p=r"/p/")
s("nykaa.com","India","tienda","nykaa","Nykaa",p=r"/p/")
s("meesho.com","India","tienda","meesho","Meesho",p=r"/p/")
s("bigbasket.com","India","tienda","tata_digital","BigBasket",p=r"/pd/")
s("tatacliq.com","India","tienda","tata_digital","Tata CLiQ",p=r"/p-")
s("croma.com","India","tienda","tata_digital","Croma",p=r"/p/")
s("blinkit.com","India","tienda","eternal","Blinkit",p=r"/prn/")

# ======================================================================
# VIAJES: metabuscadores, agencias y hospedaje
# ======================================================================
for d, p in [("google.com","Global"),("google.com.mx","México"),("google.ca","Canadá"),("google.com.br","Brasil"),("google.com.ar","Argentina"),("google.cl","Chile"),
             ("google.co.uk","Reino Unido"),("google.de","Alemania"),("google.fr","Francia"),("google.es","España"),("google.it","Italia"),("google.co.jp","Japón"),
             ("google.co.kr","Corea del Sur"),("google.com.sg","Singapur"),("google.co.il","Israel"),("google.co.in","India")]:
    s(d, p, "agencia", "google_travel", "Google Vuelos", path="/travel/", v=r"/travel/flights")
for d, p in [("expedia.com","EE.UU."),("expedia.com.mx","México"),("expedia.ca","Canadá"),("expedia.com.br","Brasil"),("expedia.com.ar","Argentina"),("expedia.co.uk","Reino Unido"),
             ("expedia.de","Alemania"),("expedia.fr","Francia"),("expedia.es","España"),("expedia.it","Italia"),("expedia.co.jp","Japón"),("expedia.co.kr","Corea del Sur"),
             ("expedia.com.sg","Singapur"),("expedia.co.in","India")]:
    s(d, p, "agencia", "expedia", "Expedia", v=r"/(Flights|flights|Vuelos|vuelos|Fluge|Vols|Voli|Voos)")
s("hotels.com","Global","agencia","expedia","Hotels.com")
s("vrbo.com","Global","hospedaje","expedia","Vrbo",p=r"/\d+")
s("trivago.com","Global","agencia","expedia","Trivago")
s("booking.com","Global","agencia","booking","Booking.com")
for d, p in [("kayak.com","EE.UU."),("kayak.com.mx","México"),("kayak.co.uk","Reino Unido"),("kayak.de","Alemania"),("kayak.fr","Francia"),("kayak.es","España"),
             ("kayak.it","Italia"),("kayak.co.jp","Japón"),("kayak.co.in","India"),("kayak.com.br","Brasil")]:
    s(d, p, "agencia", "booking", "Kayak")
s("priceline.com","EE.UU.","agencia","booking","Priceline")
s("agoda.com","Global","agencia","booking","Agoda")
s("momondo.com","Global","agencia","booking","Momondo")
s("cheapflights.com","EE.UU.","agencia","booking","Cheapflights")
for d, p in [("despegar.com.mx","México"),("despegar.com.ar","Argentina"),("despegar.cl","Chile"),("despegar.com","Global"),("decolar.com","Brasil"),("bestday.com.mx","México")]:
    s(d, p, "agencia", "despegar", "Despegar" if "decolar" not in d and "bestday" not in d else ("Decolar" if "decolar" in d else "Best Day"))
s("trip.com","Global","agencia","tripcom","Trip.com")
s("ctrip.com","China","agencia","tripcom","Ctrip")
s("qunar.com","China","agencia","tripcom","Qunar")
for d, p in [("skyscanner.net","Global"),("skyscanner.com","EE.UU."),("skyscanner.com.mx","México"),("skyscanner.ca","Canadá"),("skyscanner.com.br","Brasil"),
             ("skyscanner.cl","Chile"),("skyscanner.de","Alemania"),("skyscanner.fr","Francia"),("skyscanner.es","España"),("skyscanner.it","Italia"),("skyscanner.jp","Japón"),
             ("skyscanner.co.kr","Corea del Sur"),("skyscanner.com.sg","Singapur"),("skyscanner.co.il","Israel"),("skyscanner.co.in","India")]:
    s(d, p, "agencia", "tripcom", "Skyscanner")
for d, p, n in [("edreams.com","Global","eDreams"),("edreams.es","España","eDreams"),("edreams.fr","Francia","eDreams"),("edreams.it","Italia","eDreams"),
                ("opodo.com","Global","Opodo"),("opodo.co.uk","Reino Unido","Opodo"),("opodo.de","Alemania","Opodo"),("opodo.fr","Francia","Opodo"),("govoyages.com","Francia","GO Voyages")]:
    s(d, p, "agencia", "edreams", n)
s("kiwi.com","Global","agencia","kiwi","Kiwi.com")
s("hopper.com","Global","agencia","hopper","Hopper")
s("makemytrip.com","India","agencia","makemytrip","MakeMyTrip")
s("goibibo.com","India","agencia","makemytrip","Goibibo")
s("cleartrip.com","India","agencia","flipkart","Cleartrip")
for d, p in [("airbnb.com","Global"),("airbnb.mx","México"),("airbnb.ca","Canadá"),("airbnb.com.br","Brasil"),("airbnb.com.ar","Argentina"),("airbnb.cl","Chile"),
             ("airbnb.co.uk","Reino Unido"),("airbnb.de","Alemania"),("airbnb.fr","Francia"),("airbnb.es","España"),("airbnb.it","Italia"),("airbnb.jp","Japón"),
             ("airbnb.co.kr","Corea del Sur"),("airbnb.com.sg","Singapur"),("airbnb.co.il","Israel"),("airbnb.co.in","India")]:
    s(d, p, "hospedaje", "airbnb", "Airbnb", p=r"/rooms/")

# ======================================================================
# AEROLÍNEAS (sitio propio)
# ======================================================================
AIRSITES = [
 ("aeromexico.com","México","aeromexico","Aeroméxico"),("volaris.com","México","volaris","Volaris"),("vivaaerobus.com","México","viva","Viva Aerobus"),
 ("aa.com","EE.UU.","american","American Airlines"),("delta.com","EE.UU.","delta","Delta Air Lines"),("united.com","EE.UU.","united","United Airlines"),
 ("southwest.com","EE.UU.","southwest","Southwest Airlines"),("jetblue.com","EE.UU.","jetblue","JetBlue"),("alaskaair.com","EE.UU.","alaska","Alaska Airlines"),
 ("hawaiianairlines.com","EE.UU.","alaska","Hawaiian Airlines"),("spirit.com","EE.UU.","spirit","Spirit Airlines"),("flyfrontier.com","EE.UU.","frontier","Frontier Airlines"),
 ("aircanada.com","Canadá","aircanada","Air Canada"),("westjet.com","Canadá","westjet","WestJet"),("flyporter.com","Canadá","porter","Porter Airlines"),
 ("latamairlines.com","Chile","latam","LATAM"),("voeazul.com.br","Brasil","azul","Azul"),("voegol.com.br","Brasil","abra","GOL"),("avianca.com","Colombia","abra","Avianca"),
 ("aerolineas.com.ar","Argentina","aerolineas_ar","Aerolíneas Argentinas"),("flybondi.com","Argentina","flybondi","Flybondi"),("jetsmart.com","Chile","jetsmart","JetSMART"),
 ("skyairline.com","Chile","sky_cl","Sky Airline"),("copaair.com","Panamá","copa","Copa Airlines"),
 ("britishairways.com","Reino Unido","iag","British Airways"),("iberia.com","España","iag","Iberia"),("vueling.com","España","iag","Vueling"),
 ("aerlingus.com","Irlanda","iag","Aer Lingus"),("flylevel.com","España","iag","Level"),("easyjet.com","Reino Unido","easyjet","easyJet"),
 ("ryanair.com","Irlanda","ryanair","Ryanair"),("virginatlantic.com","Reino Unido","virgin","Virgin Atlantic"),
 ("lufthansa.com","Alemania","lufthansa","Lufthansa"),("swiss.com","Suiza","lufthansa","SWISS"),("austrian.com","Austria","lufthansa","Austrian Airlines"),
 ("brusselsairlines.com","Bélgica","lufthansa","Brussels Airlines"),("eurowings.com","Alemania","lufthansa","Eurowings"),("discover-airlines.com","Alemania","lufthansa","Discover Airlines"),
 ("condor.com","Alemania","condor","Condor"),("airfrance.com","Francia","afklm","Air France"),("airfrance.fr","Francia","afklm","Air France"),("airfrance.us","EE.UU.","afklm","Air France"),
 ("klm.com","Países Bajos","afklm","KLM"),("klm.nl","Países Bajos","afklm","KLM"),("transavia.com","Países Bajos","afklm","Transavia"),("ita-airways.com","Italia","ita","ITA Airways"),
 ("airchina.com.cn","China","airchina","Air China"),("ceair.com","China","chinaeastern","China Eastern"),("csair.com","China","chinasouthern","China Southern"),
 ("hainanairlines.com","China","hainan","Hainan Airlines"),("jal.co.jp","Japón","jal","Japan Airlines"),("jal.com","Japón","jal","Japan Airlines"),
 ("ana.co.jp","Japón","ana","ANA"),("koreanair.com","Corea del Sur","korean","Korean Air"),("flyasiana.com","Corea del Sur","korean","Asiana Airlines"),
 ("singaporeair.com","Singapur","sia","Singapore Airlines"),("flyscoot.com","Singapur","sia","Scoot"),("elal.com","Israel","elal","El Al"),
 ("airindia.com","India","airindia","Air India"),("goindigo.in","India","indigo_in","IndiGo"),("emirates.com","Emiratos","emirates","Emirates"),
 ("qatarairways.com","Qatar","qatar","Qatar Airways"),("turkishairlines.com","Turquía","turkish","Turkish Airlines"),("cathaypacific.com","Hong Kong","cathay","Cathay Pacific"),
]
for d, p, gid, n in AIRSITES:
    s(d, p, "aerolinea", gid, n)
