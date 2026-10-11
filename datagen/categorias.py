# Categorías de producto: sirven para detectar qué tipo de producto se ve y proponer alternativas
# (cooperativas, de empleados, familiares o de fundadores, de capital del país de la tienda).
# kw: palabras del título del producto (varios idiomas, en minúsculas y sin acentos).
# excluye: palabras o frases que anulan la categoría (p. ej. "arbol de te" anula cafe).
# subcats: subcategorías de dos niveles con kw y marcas propias.
# marcas: marcas de la base que pertenecen a la categoría (las de data_locales.py se agregan solas).
CATS = {
  "lacteos": {
    "label": "Lácteos",
    "kw": ["leche", "yogur", "yoghurt", "yogurt", "queso", "mantequilla", "crema acida", "milk", "cheese", "butter", "leite", "iogurte", "queijo", "lait", "fromage", "beurre", "yaourt", "latte", "formaggio", "burro", "milch", "kase", "joghurt", "牛乳", "ヨーグルト", "우유", "牛奶", "חלב", "dahi", "ghee", "paneer"],
    "excluye": ["corporal", "limpiadora", "crema corporal", "locion corporal", "jabon", "shampoo", "facial", "piel", "bloqueador"],
    "subcats": {
      "leche": {"label": "Leche", "kw": ["leche", "milk", "leite", "lait", "latte", "milch"], "marcas": ["Lala", "Nutri Leche", "Borden", "Yomi Lala", "Alpura", "Nido", "Carnation", "La Lechera", "Silk", "Alpro", "Land O'Lakes", "Organic Valley", "Cabot", "Tillamook"]},
      "queso": {"label": "Queso", "kw": ["queso", "cheese", "queijo", "fromage", "formaggio", "kase"], "marcas": ["Lala", "Président", "President", "Galbani", "Parmalat", "Lactalis", "Philadelphia", "Cabot", "Tillamook", "Land O'Lakes"]},
      "yogurt": {"label": "Yogurt", "kw": ["yogur", "yoghurt", "yogurt", "iogurte", "yaourt", "joghurt"], "marcas": ["Danone", "Activia", "Danonino", "Oikos", "Lala", "Alpura", "Tillamook"]}
    },
    "marcas": ["Lala", "Nutri Leche", "Borden", "Yomi Lala", "Alpura", "Danone", "Activia", "Danonino", "Oikos", "Nido", "Carnation", "La Lechera", "Président", "President", "Galbani", "Parmalat", "Lactalis", "Amul", "Tnuva", "Philadelphia", "Silk", "Alpro"]
  },
  "bebidas": {
    "label": "Bebidas y jugos",
    "kw": ["refresco", "jugo", "nectar", "agua mineral", "agua natural", "soda", "juice", "soft drink", "suco", "refrigerante", "jus", "boisson", "succo", "bibita", "saft", "limonade", "bebida", "yerba", "mate"],
    "excluye": ["tarro", "vaso", "playera", "termo", "llavero"],
    "subcats": {
      "refrescos": {"label": "Refrescos y sodas", "kw": ["refresco", "soda", "refrigerante", "soft drink"], "marcas": ["Coca-Cola", "Coca Cola", "Sprite", "Fanta", "Fresca", "Schweppes", "Pepsi", "Bilz", "Pap"]},
      "jugos": {"label": "Jugos y néctares", "kw": ["jugo", "nectar", "juice", "suco", "jus", "succo"], "marcas": ["Del Valle", "Santa Clara", "Tang", "Kool-Aid", "Capri Sun", "Real Juice"]},
      "aguas": {"label": "Aguas y rehidratantes", "kw": ["agua mineral", "agua natural", "agua purificada", "electrolitos"], "marcas": ["Ciel", "Topo Chico", "Powerade", "Gatorade", "Bonafont", "Evian", "Electrolit", "Cristal"]}
    },
    "marcas": ["Coca-Cola", "Coca Cola", "Ciel", "Sprite", "Fanta", "Powerade", "Del Valle", "Santa Clara", "Topo Chico", "Fresca", "Fuze Tea", "Schweppes", "Pepsi", "Gatorade", "Bonafont", "Evian", "Electrolit", "Tang", "Kool-Aid", "Capri Sun", "Real Juice", "Bilz", "Pap", "Cristal"]
  },
  "cerveza": {
    "label": "Cerveza",
    "kw": ["cerveza", "beer", "lager", "cerveja", "biere", "birra", "bier", "ビール", "맥주", "啤酒", "pilsner", "stout", "ale"],
    "excluye": ["tarro", "vaso", "playera", "camiseta", "abridor", "destapador", "llavero", "enfriador"],
    "subcats": {
      "cerveza": {"label": "Cerveza", "kw": ["cerveza", "beer", "lager", "pilsner", "stout", "ale"], "marcas": ["Corona", "Modelo", "Victoria", "Pacífico", "Michelob Ultra", "Stella Artois", "Budweiser", "Bud Light", "Negra Modelo", "Heineken", "Tecate", "Indio", "Dos Equis", "XX Lager", "Bohemia", "Carta Blanca", "Sol", "Amstel", "Miller", "Guinness", "Mahou", "San Miguel", "Alhambra", "Estrella Damm", "Damm", "Voll-Damm", "Escudo", "Kunstmann", "Austral"]}
    },
    "marcas": ["Corona", "Modelo", "Victoria", "Pacífico", "Michelob Ultra", "Stella Artois", "Budweiser", "Bud Light", "Negra Modelo", "Heineken", "Tecate", "Indio", "Dos Equis", "XX Lager", "Bohemia", "Carta Blanca", "Sol", "Amstel", "Miller", "Guinness", "Mahou", "San Miguel", "Alhambra", "Estrella Damm", "Damm", "Voll-Damm", "Escudo", "Kunstmann", "Austral"]
  },
  "cafe": {
    "label": "Café",
    "kw": ["cafe", "coffee", "kaffee", "caffe", "espresso", "capsulas de cafe", "cafe soluble", "cafe molido", "cafe en grano", "infusion", "te verde", "te negro", "te chai", "te matcha", "matcha", "te de manzanilla", "infusiones", "コーヒー", "커피", "咖啡"],
    "excluye": ["aceite esencial", "aceites esenciales", "arbol de te", "difusor", "aromaterapia", "taza", "termo", "cafetera", "filtro", "filtro para cafe", "vela", "aroma", "incienso", "velas", "llavero", "capsulas vacias", "shampoo"],
    "subcats": {
      "cafe": {"label": "Café", "kw": ["cafe", "coffee", "kaffee", "caffe", "espresso", "cafe soluble", "cafe molido", "cafe en grano"], "marcas": ["Nescafé", "Nescafe", "Lavazza", "illy", "Melitta"]},
      "te": {"label": "Té e infusiones", "kw": ["infusion", "infusiones", "te verde", "te negro", "te chai", "te matcha", "matcha"], "marcas": []}
    },
    "marcas": ["Nescafé", "Nescafe", "Lavazza", "illy", "Melitta"]
  },
  "chocolate_dulces": {
    "label": "Chocolates y dulces",
    "kw": ["chocolate", "chocolat", "cioccolato", "schokolade", "dulce", "dulces", "caramelo", "candy", "bombon", "chicle", "gomitas", "gummies", "チョコ", "초콜릿", "巧克力"],
    "excluye": ["shampoo", "crema corporal", "vela", "locion", "balsamo labial"],
    "subcats": {
      "chocolate": {"label": "Chocolates", "kw": ["chocolate", "chocolat", "cioccolato", "schokolade"], "marcas": ["KitKat", "Kit Kat", "Snickers", "M&M's", "Milky Way", "Twix", "Mars", "Milka", "Toblerone", "Cadbury", "Ferrero Rocher", "Kinder", "Nutella", "Arcor", "Cofler", "Butterfinger", "Crunch"]},
      "dulces": {"label": "Dulces y golosinas", "kw": ["dulce", "dulces", "caramelo", "candy", "bombon", "chicle", "gomitas", "gummies"], "marcas": ["Skittles", "Trident", "Halls", "Bubbaloo", "Haribo", "Sonric's"]}
    },
    "marcas": ["KitKat", "Kit Kat", "La Lechera", "Snickers", "M&M's", "Milky Way", "Twix", "Skittles", "Mars", "Oreo", "Milka", "Toblerone", "Cadbury", "Trident", "Halls", "Bubbaloo", "Ferrero Rocher", "Kinder", "Nutella", "Haribo", "Arcor", "Bon o Bon", "Cofler", "Butterfinger", "Crunch", "Gansito", "Pingüinos", "Sonric's", "Elite", "Pepero"]
  },
  "botanas_galletas": {
    "label": "Botanas y galletas",
    "kw": ["galletas", "papas fritas", "botana", "frituras", "cookies", "biscuits", "crackers", "chips", "snack", "biscoito", "bolacha", "salgadinho", "gateaux", "biscotti", "kekse", "namkeen", "bhujia", "スナック", "과자"],
    "excluye": ["playera", "llavero", "cojin", "estuche"],
    "subcats": {
      "botanas": {"label": "Botanas y frituras", "kw": ["papas fritas", "botana", "frituras", "chips", "snack", "salgadinho"], "marcas": ["Sabritas", "Doritos", "Cheetos", "Ruffles", "Lay's", "Tostitos", "Barcel", "Takis", "Pringles", "Cheez-It", "Bamba", "Bissli"]},
      "galletas": {"label": "Galletas", "kw": ["galletas", "cookies", "biscuits", "crackers", "biscoito", "bolacha", "biscotti", "kekse"], "marcas": ["Gamesa", "Emperador", "Mamut", "Chokis", "Marinela", "Oreo", "Chips Ahoy", "Ritz", "Club Social", "belVita", "Bagley", "Britannia", "Good Day", "Parle", "Parle-G", "Mulino Bianco"]}
    },
    "marcas": ["Sabritas", "Doritos", "Cheetos", "Ruffles", "Lay's", "Tostitos", "Gamesa", "Emperador", "Mamut", "Chokis", "Marinela", "Barcel", "Takis", "Pringles", "Cheez-It", "Oreo", "Chips Ahoy", "Ritz", "Club Social", "belVita", "Bagley", "Britannia", "Good Day", "Parle", "Parle-G", "Bingo!", "Sunfeast", "Bamba", "Bissli", "Mulino Bianco"]
  },
  "abarrotes": {
    "label": "Despensa (pastas, salsas, conservas, sopas)",
    "kw": ["pasta", "spaghetti", "sopa", "fideo", "salsa", "atun", "mayonesa", "ketchup", "conserva", "frijoles", "arroz", "mermelada", "pure de tomate", "tomate", "aceite de oliva", "aceite vegetal", "aceite comestible", "aceite de cocina", "aceite de canola", "noodles", "ramen", "rice", "beans", "jam", "massa", "molho", "feijao", "pates", "sauce", "confiture", "sugo", "passata", "nudeln", "marmelade", "atta", "dal"],
    "excluye": ["aceite esencial", "aceites esenciales", "aceite corporal", "aceite de motor", "aceite para motor", "aceite mineral", "difusor", "taza"],
    "subcats": {
      "pastas_sopas": {"label": "Pastas y sopas", "kw": ["pasta", "spaghetti", "sopa", "fideo", "noodles", "ramen"], "marcas": ["Barilla", "Knorr", "Maruchan", "Nissin", "Cup Noodles", "Top Ramen", "Shin Ramyun"]},
      "salsas_aderezos": {"label": "Salsas y aderezos", "kw": ["salsa", "mayonesa", "ketchup", "sauce", "sugo", "passata", "molho"], "marcas": ["Herdez", "Doña María", "Búfalo", "McCormick", "Hellmann's", "Heinz", "Kraft", "Dolmio"]},
      "conservas_granos": {"label": "Conservas, legumbres y atún", "kw": ["atun", "conserva", "frijoles", "arroz", "beans", "rice", "mermelada"], "marcas": ["Herdez", "Del Fuerte", "La Costeña", "La Campagnola", "Uncle Ben's", "Ben's Original"]}
    },
    "marcas": ["Herdez", "Doña María", "Búfalo", "Carlota", "Del Fuerte", "La Costeña", "McCormick", "Barilla", "Knorr", "Hellmann's", "Maggi", "Heinz", "Kraft", "Maruchan", "Nissin", "Cup Noodles", "Top Ramen", "Uncle Ben's", "Ben's Original", "Dolmio", "Carozzi", "La Campagnola", "Tata Sampann", "Aashirvaad", "Kissan", "Patak's", "Shin Ramyun", "Bibigo"]
  },
  "panaderia_harinas": {
    "label": "Pan, cereales y harinas",
    "kw": ["pan de caja", "pan dulce", "pan blanco", "pan integral", "bread", "harina", "flour", "tortillas", "cereal", "avena", "oats", "pao", "farinha", "pain", "farine", "pane", "farina", "brot", "mehl"],
    "excluye": ["tostadora", "panera", "cuchillo", "recipiente"],
    "subcats": {
      "pan": {"label": "Pan y tortillas", "kw": ["pan de caja", "pan dulce", "pan blanco", "pan integral", "bread", "tortillas", "pao", "pain", "pane", "brot"], "marcas": ["Bimbo", "Wonder", "Sara Lee", "Oroweat", "Thomas'", "Entenmann's", "Tía Rosa", "Mission", "Guerrero", "Kingsmill", "Wasa"]},
      "cereales_harinas": {"label": "Cereales y harinas", "kw": ["harina", "flour", "cereal", "avena", "oats", "farinha", "farine"], "marcas": ["Maseca", "Quaker", "Kellogg's", "Zucaritas", "Choco Krispis", "Froot Loops", "Special K", "All-Bran", "Bob's Red Mill", "King Arthur Baking"]}
    },
    "marcas": ["Bimbo", "Wonder", "Sara Lee", "Oroweat", "Thomas'", "Entenmann's", "Tía Rosa", "Maseca", "Mission", "Guerrero", "Quaker", "Kellogg's", "Zucaritas", "Choco Krispis", "Froot Loops", "Special K", "All-Bran", "Kingsmill", "Wasa"]
  },
  "limpieza": {
    "label": "Limpieza del hogar y vajilla",
    "kw": ["detergente", "suavizante", "jabon para ropa", "jabon liquido para ropa", "detergente liquido", "detergente en polvo", "lavatrastes", "jabon para trastes", "lavavajillas", "cloro", "desinfectante", "limpiador multiusos", "limpiador de pisos", "limpiador de banos", "limpiador de cocina", "limpiador liquido", "limpiapisos", "desengrasante", "multiusos", "detergent", "laundry", "fabric softener", "dish soap", "cleaner", "bleach", "sabao", "lessive", "detersivo", "waschmittel", "spulmittel"],
    "excluye": ["piel", "facial", "rostro", "cutis", "ojos", "skincare", "serum", "bloqueador", "solar", "crema corporal", "shampoo"],
    "subcats": {
      "ropa": {"label": "Cuidado de la ropa", "kw": ["detergente", "suavizante", "jabon para ropa", "jabon liquido para ropa", "detergente liquido", "detergente en polvo", "laundry", "fabric softener", "lessive", "detersivo", "waschmittel"], "marcas": ["Ariel", "Tide", "Downy", "Ace", "Persil", "Vernel", "Suavitel", "Vanish", "Surf Excel", "Rin", "Wheel", "Zote", "Roma", "Blanca Nieves", "Foca", "Carisma"]},
      "trastes": {"label": "Lavavajillas y trastes", "kw": ["lavatrastes", "jabon para trastes", "lavavajillas", "dish soap", "spulmittel"], "marcas": ["Salvo", "Dawn", "Cascade", "Fairy", "Axion", "Finish", "Vim"]},
      "superficies": {"label": "Limpieza de superficies", "kw": ["cloro", "desinfectante", "limpiador multiusos", "limpiador de pisos", "limpiador de banos", "limpiador de cocina", "limpiador liquido", "limpiapisos", "desengrasante", "multiusos", "bleach", "cleaner"], "marcas": ["Fabuloso", "Ajax", "Lysol", "Calgon", "Harpic", "Mr. Clean"]}
    },
    "marcas": ["Ariel", "Tide", "Downy", "Ace", "Persil", "Vernel", "Suavitel", "Fabuloso", "Ajax", "Lysol", "Vanish", "Finish", "Calgon", "Harpic", "Salvo", "Dawn", "Cascade", "Fairy", "Axion", "Mr. Clean", "Surf Excel", "Rin", "Wheel", "Vim"]
  },
  "cuidado_personal": {
    "label": "Higiene y cuidado personal",
    "kw": ["shampoo", "champu", "jabon de tocador", "desodorante", "crema corporal", "pasta dental", "toothpaste", "deodorant", "body wash", "lotion", "soap bar", "sabonete", "xampu", "savon", "shampooing", "sapone", "seife", "duschgel", "cepillo electrico", "rasuradora", "afeitadora", "acondicionador"],
    "excluye": ["lavatrastes", "lavavajillas", "pisos", "ropa", "multiusos", "vela aromatica"],
    "subcats": {
      "cabello": {"label": "Cuidado del cabello", "kw": ["shampoo", "champu", "acondicionador", "xampu", "shampooing"], "marcas": ["Dove", "Sedal", "Clear", "TRESemmé", "Head & Shoulders", "Pantene", "Herbal Essences", "Schwarzkopf", "Syoss"]},
      "cuerpo": {"label": "Cuidado corporal y desodorantes", "kw": ["jabon de tocador", "desodorante", "crema corporal", "body wash", "soap bar", "sabonete", "savon", "sapone", "seife", "duschgel"], "marcas": ["Dove", "Rexona", "Axe", "Vasenol", "Palmolive", "Protex", "Nivea", "Johnson's", "Lux", "Lifebuoy", "Natura", "Avon", "O Boticário", "Godrej", "Cinthol", "Jabón Tepeyac"]},
      "bucal": {"label": "Higiene bucal", "kw": ["pasta dental", "toothpaste", "cepillo electrico", "cepillo dental"], "marcas": ["Colgate", "Crest", "Oral-B", "Philips Sonicare", "Sonicare", "Sensodyne", "Listerine"]},
      "afeitado": {"label": "Afeitado y rasurado", "kw": ["rasuradora", "afeitadora"], "marcas": ["Norelco"]}
    },
    "marcas": ["Dove", "Rexona", "Axe", "Sedal", "Pond's", "Vasenol", "Clear", "TRESemmé", "Head & Shoulders", "Pantene", "Herbal Essences", "Colgate", "Palmolive", "Protex", "Crest", "Oral-B", "Nivea", "Johnson's", "Lux", "Lifebuoy", "Natura", "Avon", "O Boticário", "Schwarzkopf", "Syoss", "Godrej", "Cinthol", "Philips Sonicare", "Sonicare", "Norelco", "Sensodyne", "Listerine"]
  },
  "skincare_cosmetica": {
    "label": "Dermocosmética y cuidado de la piel",
    "kw": ["gel limpiador", "limpiador espumoso", "espuma limpiadora", "limpiador facial", "limpiador para piel", "limpiador en gel", "limpiador suave", "agua micelar", "desmaquillante", "serum", "suero facial", "suero", "concentrado facial", "acido hialuronico", "niacinamida", "retinol", "vitamina c", "ceramidas", "acido salicilico", "acido glicolico", "centella asiatica", "pantenol", "protector solar", "bloqueador solar", "bloqueador", "fotoprotector", "fps", "spf", "sunscreen", "crema facial", "contorno de ojos", "hidratante facial", "locion facial", "tonico facial", "exfoliante facial", "mascarilla facial", "cuidado de la piel", "skincare", "dermocosmetica", "dermocosmetico", "dermatologico", "dermatologica", "piel normal", "piel grasa", "piel seca", "piel mixta", "piel sensible", "antiarrugas", "antiedad", "antimanchas", "antiacne", "acne", "poros", "barrera cutanea", "facial cleanser", "foaming cleanser", "cleansing gel", "face wash", "face cream", "moisturizer", "eye cream", "skin care", "hyaluronic"],
    "excluye": ["lavatrastes", "lavavajillas", "ropa", "pisos", "multiusos", "detergente", "inodoro", "trastes"],
    "subcats": {
      "facial": {"label": "Cuidado facial y serums", "kw": ["serum", "suero facial", "acido hialuronico", "niacinamida", "retinol", "vitamina c", "crema facial", "contorno de ojos", "hidratante facial"], "marcas": ["CeraVe", "La Roche-Posay", "Vichy", "Eucerin", "Neutrogena", "Aveeno", "Clean & Clear", "Kiehl's", "Clinique", "Cetaphil", "Avène", "ISDIN", "Bioderma", "Beauty of Joseon", "COSRX"]},
      "solar": {"label": "Protección solar", "kw": ["protector solar", "bloqueador solar", "bloqueador", "fotoprotector", "fps", "spf", "sunscreen"], "marcas": ["ISDIN", "La Roche-Posay", "Eucerin", "Heliocare", "Bioderma", "Anessa", "Bioré"]},
      "limpieza_facial": {"label": "Limpieza facial", "kw": ["gel limpiador", "limpiador espumoso", "limpiador facial", "agua micelar", "desmaquillante"], "marcas": ["CeraVe", "La Roche-Posay", "Bioderma", "Cetaphil", "Neutrogena"]}
    },
    "marcas": ["CeraVe", "La Roche-Posay", "Vichy", "Eucerin", "Neutrogena", "Aveeno", "Clean & Clear", "Kiehl's", "Clinique", "Cetaphil", "Avène", "ISDIN", "Heliocare", "Bioderma", "Beauty of Joseon", "Anessa", "Bioré", "COSRX"]
  },
  "ropa_calzado": {
    "label": "Ropa, calzado y accesorios",
    "kw": ["tenis", "zapatos", "zapatillas", "botas", "sandalias", "playera", "camiseta", "pantalon", "jeans", "chamarra", "chaqueta", "sudadera", "vestido", "vestidos", "traje", "trajes", "sombrero", "sombreros", "gorra", "reloj de pulsera", "sneakers", "shoes", "boots", "jacket", "hoodie", "t-shirt", "dress", "suit", "hat", "sapato", "chaussures", "veste", "scarpe", "schuhe", "robe", "costume", "chapeau", "kleid", "anzug", "hut"],
    "excluye": ["funda", "soporte", "estuche", "llavero"],
    "subcats": {
      "calzado": {"label": "Calzado y tenis", "kw": ["tenis", "zapatos", "zapatillas", "botas", "sandalias", "sneakers", "shoes", "boots", "sapato", "chaussures", "scarpe", "schuhe"], "marcas": ["Nike", "Jordan", "Converse", "Adidas", "Puma", "Skechers", "Reebok", "Under Armour", "New Balance", "Vans", "Timberland", "Crocs", "Havaianas", "ASICS", "Onitsuka Tiger", "Flexi"]},
      "ropa": {"label": "Ropa y prendas", "kw": ["playera", "camiseta", "pantalon", "jeans", "chamarra", "chaqueta", "sudadera", "vestido", "vestidos", "traje", "trajes", "jacket", "hoodie", "t-shirt", "dress", "suit"], "marcas": ["Nike", "Adidas", "Puma", "Under Armour", "Levi's", "Dockers", "Calvin Klein", "Tommy Hilfiger", "The North Face", "Lacoste", "Zara", "Massimo Dutti", "Bershka", "Pull&Bear", "Uniqlo", "GU", "Primark", "H&M", "Mango"]},
      "accesorios": {"label": "Sombreros y relojes", "kw": ["sombrero", "sombreros", "gorra", "reloj de pulsera", "hat", "chapeau", "hut"], "marcas": ["Rolex", "Casio", "G-Shock", "Seiko", "Citizen", "Swatch", "Tissot", "Stetson"]}
    },
    "marcas": ["Nike", "Jordan", "Converse", "Adidas", "Puma", "Skechers", "Reebok", "Under Armour", "New Balance", "Levi's", "Dockers", "Calvin Klein", "Tommy Hilfiger", "Vans", "The North Face", "Timberland", "Crocs", "Lacoste", "Zara", "Massimo Dutti", "Bershka", "Pull&Bear", "Uniqlo", "GU", "Havaianas", "ASICS", "Onitsuka Tiger", "Primark", "H&M", "Mango", "Rolex", "Casio", "G-Shock", "Seiko", "Citizen", "Swatch", "Tissot", "Stetson"]
  },
  "deportes_outdoor": {
    "label": "Deportes, pesca y aire libre",
    "kw": ["pesca", "carrete", "cana de pescar", "anzuelo", "senuelo", "fishing", "rod", "reel", "lure", "tackle", "camping", "tienda de campana", "tent", "ciclismo", "bicicleta", "bike", "bicycle", "peche", "moulinet", "angeln", "fischen", "rute", "rolle", "purificador de agua", "pastillas purificadoras", "pastillas potabilizadoras", "potable aqua", "water purification", "filtro de agua portatil", "linterna de camping", "cantimplora", "supervivencia", "survival", "casco de bicicleta", "mancuerna", "mancuernas", "tapete de yoga"],
    "excluye": ["llavero", "calcomania", "estampado", "playera", "taza"],
    "subcats": {
      "pesca": {
        "label": "Pesca",
        "kw": ["pesca", "carrete", "cana de pescar", "anzuelo", "senuelo", "fishing", "rod", "reel", "lure", "tackle", "peche", "moulinet", "angeln", "fischen", "rute", "rolle"],
        "marcas": ["Penn", "Penn Fishing", "Abu Garcia", "Berkley", "Ugly Stik", "Fenwick", "Hardy", "Shakespeare", "Shimano"]
      },
      "camping_supervivencia": {
        "label": "Camping y supervivencia",
        "kw": ["camping", "tienda de campana", "tent", "purificador de agua", "pastillas purificadoras", "pastillas potabilizadoras", "potable aqua", "water purification", "filtro de agua portatil", "linterna de camping", "cantimplora", "supervivencia", "survival"],
        "marcas": ["Potable Aqua", "Potable Aqua PURE"]
      },
      "ciclismo": {
        "label": "Ciclismo",
        "kw": ["ciclismo", "bicicleta", "bike", "bicycle", "casco de bicicleta", "candado de bicicleta"],
        "marcas": ["Shimano"]
      },
      "fitness": {
        "label": "Fitness y ejercicio",
        "kw": ["fitness", "mancuerna", "mancuernas", "pesa rusa", "kettlebell", "tapete de yoga", "caminadora", "bicicleta fija"],
        "marcas": []
      }
    },
    "marcas": ["Penn", "Penn Fishing", "Abu Garcia", "Berkley", "Ugly Stik", "Fenwick", "Hardy", "Shakespeare", "Shimano", "Potable Aqua", "Potable Aqua PURE"]
  },
  "electrodomesticos_cocina": {
    "label": "Electrodomésticos de cocina",
    "kw": ["freidora de aire", "air fryer", "licuadora", "blender", "cafetera", "batidora", "procesador de alimentos", "horno tostador", "olla de presion", "parrilla electrica", "toaster", "creami", "foodi", "extractor de jugos", "tostadora", "sandwichera"],
    "excluye": ["funda", "recetario", "termo"],
    "subcats": {
      "preparacion": {"label": "Preparación de alimentos", "kw": ["licuadora", "blender", "batidora", "procesador de alimentos", "extractor de jugos"], "marcas": ["Ninja", "KitchenAid", "Whirlpool", "Acros"]},
      "coccion": {"label": "Cocción y freidoras", "kw": ["freidora de aire", "air fryer", "horno tostador", "olla de presion", "parrilla electrica", "toaster", "tostadora", "sandwichera"], "marcas": ["Ninja", "Ninja Foodi", "Whirlpool", "Acros", "GE Appliances"]},
      "cafeteras": {"label": "Cafeteras", "kw": ["cafetera"], "marcas": []}
    },
    "marcas": ["Ninja", "Shark", "Ninja Foodi", "Ninja Creami", "SharkNinja", "KitchenAid", "Whirlpool", "Acros", "GE Appliances"]
  },
  "audio_electronica": {
    "label": "Audio, video y electrónica",
    "kw": ["audifonos", "auriculares", "headphones", "earbuds", "headset", "bocina", "bocinas", "altavoz", "speaker", "speakers", "parlante", "pantalla", "tv", "smart tv", "televisor", "television", "celular", "smartphone", "telefono", "soundbar", "barra de sonido", "earphones", "cuffie", "casque", "kopfhorer", "イヤホン", "ヘッドホン"],
    "excluye": ["funda", "soporte", "estuche", "protector de pantalla", "mica", "cable para", "adaptador", "carcasa", "llavero"],
    "subcats": {
      "audio": {"label": "Audio y auriculares", "kw": ["audifonos", "auriculares", "headphones", "earbuds", "headset", "bocina", "bocinas", "altavoz", "speaker", "speakers", "parlante", "soundbar", "barra de sonido", "earphones"], "marcas": ["Sony", "Bose", "JBL", "Beats", "Harman Kardon", "AirPods", "Sennheiser", "Audio-Technica", "Anker", "Soundcore"]},
      "tv_video": {"label": "Televisores y pantallas", "kw": ["pantalla", "tv", "smart tv", "televisor", "television"], "marcas": ["Sony"]},
      "telefonia": {"label": "Smartphones y telefonía", "kw": ["celular", "smartphone", "telefono"], "marcas": []}
    },
    "marcas": ["Sony", "Bose", "JBL", "Beats", "Harman Kardon", "AirPods", "Sennheiser", "Audio-Technica", "Anker", "Soundcore"]
  },
  "hogar_muebles": {
    "label": "Muebles y oficina",
    "kw": ["mueble", "muebles", "silla de oficina", "silla ergonomica", "escritorio", "sofa", "sillon", "cama", "colchon", "comedor", "librero", "estante", "buro", "armario", "ropero", "furniture", "office chair", "desk", "mattress", "meubles", "mobel"],
    "excluye": ["funda", "almohadilla", "tapete de mouse", "juguete"],
    "subcats": {
      "muebles": {"label": "Muebles del hogar", "kw": ["mueble", "muebles", "sofa", "sillon", "cama", "colchon", "comedor", "librero", "estante", "buro", "armario", "ropero", "furniture", "mattress"], "marcas": ["IKEA", "Ashley Furniture"]},
      "oficina": {"label": "Muebles de oficina", "kw": ["silla de oficina", "silla ergonomica", "escritorio", "office chair", "desk"], "marcas": ["Herman Miller", "Knoll", "Steelcase"]}
    },
    "marcas": ["IKEA", "Ashley Furniture", "Herman Miller", "Knoll", "Steelcase"]
  },
  "electrodomesticos_clima": {
    "label": "Electrodomésticos, climatización y aspiración",
    "kw": ["refrigerador", "nevera", "frigobar", "lavadora", "secadora", "estufa", "horno", "lavavajillas", "aire acondicionado", "minisplit", "clima", "purificador de aire", "filtro de aire", "filtro hepa", "aspiradora robot", "robot aspirador", "aspiradora inteligente", "air conditioner", "air purifier", "robot vacuum", "climatiseur", "klimaanlage", "luftreiniger"],
    "excluye": ["filtro para cafe", "funda", "control remoto", "cable"],
    "subcats": {
      "clima_lineablanca": {"label": "Línea blanca y climatización", "kw": ["refrigerador", "nevera", "frigobar", "lavadora", "secadora", "estufa", "aire acondicionado", "minisplit", "clima"], "marcas": ["Whirlpool", "Haier", "Electrolux", "Daikin", "Carrier", "Midea"]},
      "aspiracion_aire": {"label": "Aspiradoras y purificadores", "kw": ["purificador de aire", "filtro de aire", "filtro hepa", "aspiradora robot", "robot aspirador", "aspiradora inteligente", "robot vacuum"], "marcas": ["Dyson", "iRobot", "Roomba", "Roborock", "Ecovacs", "Levoit", "Coway"]}
    },
    "marcas": ["Whirlpool", "Haier", "Electrolux", "Daikin", "Carrier", "Midea", "Dyson", "iRobot", "Roomba", "Roborock", "Ecovacs", "Levoit", "Coway"]
  },
  "herramientas": {
    "label": "Herramientas, jardinería y mantenimiento",
    "kw": ["taladro", "rotomartillo", "destornillador", "desarmador", "llave inglesa", "llave espanola", "juego de llaves", "pinzas", "alicate", "matraca", "dado", "podadora", "cortacesped", "desbrozadora", "desmalezadora", "motosierra", "cortasetos", "tijeras de podar", "hidrolavadora", "tuberia", "fontaneria", "plomeria", "bomba de agua", "valvula", "multimetro", "cautin", "soldadora", "caja de herramientas", "drill", "screwdriver", "wrench", "pliers", "lawn mower", "chainsaw", "pressure washer", "plumbing", "outils", "werkzeug"],
    "excluye": ["juguete", "llavero", "estuche vacio"],
    "subcats": {
      "herramientas": {"label": "Herramientas", "kw": ["taladro", "rotomartillo", "destornillador", "desarmador", "llave inglesa", "pinzas", "drill", "wrench"], "marcas": ["DeWalt", "Stanley", "Black+Decker", "Craftsman", "Makita", "Milwaukee", "Ryobi", "Husqvarna", "Bosch"]}
    },
    "marcas": ["DeWalt", "Stanley", "Black+Decker", "Craftsman", "Makita", "Milwaukee", "Ryobi", "Husqvarna", "Bosch"]
  },
  "mascotas": {
    "label": "Alimento y cuidado de mascotas",
    "kw": ["alimento para perro", "alimento para gato", "croquetas para perro", "croquetas para gato", "croquetas", "comida para perro", "comida para gato", "premios para perro", "premios para gato", "bocadillos para perro", "treats para perro", "juguete para perro", "juguete para gato", "rascador para gato", "arena para gato", "dog food", "cat food", "dog treats", "cat treats", "pet toy", "croquettes pour chien", "katzenfutter", "hundefutter"],
    "excluye": ["playera", "llavero", "peluche para bebe"],
    "subcats": {
      "perros": {"label": "Perros", "kw": ["alimento para perro", "croquetas para perro", "comida para perro", "premios para perro", "bocadillos para perro", "treats para perro", "juguete para perro", "dog food", "dog treats"], "marcas": ["Purina", "Dog Chow", "Pro Plan", "Pedigree", "Cesar", "Hill's", "Blue Buffalo", "Ganador"]},
      "gatos": {"label": "Gatos", "kw": ["alimento para gato", "croquetas para gato", "comida para gato", "premios para gato", "juguete para gato", "rascador para gato", "arena para gato", "cat food", "cat treats"], "marcas": ["Purina", "Cat Chow", "Pro Plan", "Whiskas", "Royal Canin", "Sheba", "Hill's", "Blue Buffalo", "Fancy Feast", "Minino"]}
    },
    "marcas": ["Purina", "Dog Chow", "Cat Chow", "Pro Plan", "Pedigree", "Whiskas", "Royal Canin", "Sheba", "Cesar", "Hill's", "Blue Buffalo", "Fancy Feast", "Ganador", "Minino"]
  },
  "aromas_ambiente": {
    "label": "Aromatizantes, esencias e inciensos",
    "kw": ["aromatizante", "ambientador", "ambientador de cuarto", "locion para cuarto", "esencia para difusor", "esencia aromatica", "aceite esencial", "aceites esenciales", "incienso", "inciensos", "varillas de incienso", "difusor de aromas", "difusor ultrasonico", "vela aromatica", "velas aromaticas", "air freshener", "room spray", "essential oil", "incense", "incense sticks", "scented candle", "encens"],
    "excluye": ["shampoo", "jabon para ropa", "detergente", "crema corporal"],
    "subcats": {
      "aceites_esenciales": {"label": "Aceites esenciales y difusores", "kw": ["aceite esencial", "aceites esenciales", "difusor de aromas", "difusor ultrasonico", "esencia para difusor", "essential oil"], "marcas": []},
      "aromatizantes_velas": {"label": "Aromatizantes y velas", "kw": ["aromatizante", "ambientador", "vela aromatica", "velas aromaticas", "incienso", "air freshener", "scented candle"], "marcas": ["Glade", "Air Wick", "Febreze", "Yankee Candle", "Bath & Body Works"]}
    },
    "marcas": ["Glade", "Air Wick", "Febreze", "Yankee Candle", "Bath & Body Works"]
  },
  "higiene_papel": {
    "label": "Papel higiénico, toallitas y cuidado íntimo",
    "kw": ["papel higienico", "papel de bano", "papel sanitario", "toallitas humedas", "toallas humedas", "toallitas para bebe", "panales", "panal", "toallas sanitarias", "toallas femeninas", "protectores diarios", "toilet paper", "bath tissue", "wet wipes", "baby wipes", "diapers", "papier toilette", "lingettes", "toilettenpapier"],
    "excluye": ["portarrollos", "dispensador", "bote de basura"],
    "subcats": {
      "papel": {"label": "Papel higiénico y pañuelos", "kw": ["papel higienico", "papel de bano", "papel sanitario", "toilet paper", "bath tissue"], "marcas": ["Pétalo", "Regio", "Cottonelle", "Kleenex", "Scott", "Charmin"]},
      "bebe_intimo": {"label": "Pañales y cuidado íntimo", "kw": ["toallitas humedas", "toallitas para bebe", "panales", "panal", "toallas sanitarias", "toallas femeninas", "protectores diarios"], "marcas": ["Huggies", "Pampers", "Saba", "Always"]}
    },
    "marcas": ["Pétalo", "Regio", "Cottonelle", "Kleenex", "Scott", "Charmin", "Huggies", "Pampers", "Saba", "Always"]
  },
  "viajes_equipaje": {
    "label": "Equipaje y accesorios de viaje",
    "kw": ["mochila", "maleta", "mochila de viaje", "mochila para viaje", "porta pasaporte", "portapasaporte", "porta documentos de viaje", "maleta de viaje", "maleta carry on", "equipaje de mano", "valija", "neceser de viaje", "organizador de maleta", "almohada de viaje", "travel backpack", "passport holder", "carry on luggage", "travel pillow", "sac de voyage", "porte passeport"],
    "excluye": ["funda de celular", "cable"],
    "subcats": {
      "equipaje": {"label": "Equipaje y maletas", "kw": ["mochila", "maleta", "maleta de viaje", "maleta carry on", "equipaje de mano", "valija", "mochila de viaje"], "marcas": ["Samsonite", "American Tourister", "Tumi", "Thule", "Osprey", "Delsey Paris", "The North Face"]}
    },
    "marcas": ["Samsonite", "American Tourister", "Tumi", "Thule", "Osprey", "Delsey Paris", "The North Face"]
  },
  "salud_primeros_auxilios": {
    "label": "Salud y primeros auxilios",
    "kw": ["primeros auxilios", "botiquin", "botiquin de primeros auxilios", "curitas", "banditas adhesivas", "vendas", "venda elastica", "gasa esteril", "gasas", "aposito", "algodon absorbente", "agua oxigenada", "alcohol etilico", "alcohol desnaturalizado", "antiseptico", "merthiolate", "mertiolate", "termometro digital", "tensiometro", "oximetro", "first aid kit", "bandages", "sterile gauze", "trousse premiers secours", "verbandkasten"],
    "excluye": ["juguete"],
    "subcats": {
      "primeros_auxilios": {"label": "Primeros auxilios y curación", "kw": ["primeros auxilios", "botiquin", "curitas", "vendas", "gasa esteril", "alcohol etilico", "antiseptico"], "marcas": ["Band-Aid", "Curitas", "Hansaplast", "Nexcare", "3M", "Omron"]}
    },
    "marcas": ["Band-Aid", "Curitas", "Hansaplast", "Nexcare", "3M", "Omron"]
  },
  "tecnologia_3d": {
    "label": "Tecnología e impresión 3D",
    "kw": ["impresora 3d", "impresora 3-d", "3d printer", "filamento", "pla", "petg", "resina 3d", "ender", "creality", "hotend", "extrusor"],
    "excluye": ["figura 3d", "poster"],
    "subcats": {
      "impresion_3d": {"label": "Impresión 3D", "kw": ["impresora 3d", "3d printer", "filamento", "pla", "petg", "resina 3d"], "marcas": ["Creality", "Creality 3D", "Ender", "Ender 3"]}
    },
    "marcas": ["Creality", "Creality 3D", "Ender", "Ender 3"]
  }
}
