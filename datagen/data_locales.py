# Marcas alternativas: cooperativas, de empleados, familiares o fundadoras de capital local.
# Verificadas con búsqueda web el 8-oct-2026 (sitio oficial, Wikipedia o prensa).
from data_base import g, b, A, V

CAT = {}  # marca → categoría

g('loc_sociedad_cooperativa_trabajado', 'Sociedad Cooperativa Trabajadores de Pascual S.C.L.', 'Pertenece a más de 4,000 trabajadores que eligen democráticamente su consejo de administración.', 'México', 'Cooperativa', "", "", '', 'Alta', 'Expansión: ¿Quién es el dueño de Pascual?', 'https://expansion.mx/empresas/2025/07/04/quien-es-el-dueno-de-pascual', ahorro=True)
b('loc_sociedad_cooperativa_trabajado', '!Pascual', 'Boing', 'Boing!', 'Pascual Boing')
CAT['Pascual'] = 'bebidas'
g('loc_grupo_jumex', 'Grupo Jumex', 'Familia López: Eugenio López Alonso, único heredero del fundador Eugenio López Rodea y presidente del consejo; no cotiza en bolsa.', 'México', 'Familia', "", "", 'La familia es López (no Fernández). Sin desglose accionario público.', 'Verificar (fuente secundaria)', 'Tus Buenas Noticias: ¿Quién es el dueño de Jumex?', 'https://www.tusbuenasnoticias.com/noticias/economia/2026/01/31/56280-quien-es-el-dueno-de-jumex-y-cual-es-su-fortuna')
b('loc_grupo_jumex', 'Jumex')
CAT['Jumex'] = 'bebidas'
g('loc_grupo_la_moderna', 'Grupo La Moderna', 'Las familias Monroy Carrillo y Monroy Saint Martín poseen cerca de 95% del capital; dirige Carlos Alejandro Monroy Carrillo.', 'México', 'Familia', "", "", 'Una sola fuente periodística; cotiza en la BMV.', 'Verificar (fuente secundaria)', 'Tus Buenas Noticias: ¿Quién es el dueño de La Moderna?', 'https://www.tusbuenasnoticias.com/noticias/economia/2026/04/13/58915-quien-es-el-dueno-de-sopas-la-moderna', ahorro=True)
b('loc_grupo_la_moderna', 'La Moderna', 'Sopas La Moderna', 'Pastas La Moderna')
CAT['La Moderna'] = 'abarrotes'
g('loc_chocolatera_de_jalisco_s_a_de_', 'Chocolatera de Jalisco, S.A. de C.V.', 'Empresa fundada en 1925 por la familia Gómez Ibarra; la dirige la cuarta generación (Armando Gómez Ibarra).', 'México', 'Familia', "", "", 'No se halló estructura accionaria detallada, ni adquisiciones.', 'Verificar (fuente secundaria)', 'Players of Life: Chocolate Ibarra y su centenario', 'https://playersoflife.com/gourmet/historia-chocolate-ibarra-el-sabor-tapatio-que-va-por-su-centenario/')
b('loc_chocolatera_de_jalisco_s_a_de_', 'Chocolate Ibarra', '!Ibarra')
CAT['Chocolate Ibarra'] = 'chocolate_dulces'
g('loc_f_brica_de_jab_n_la_corona_s_a', 'Fábrica de Jabón La Corona, S.A. de C.V.', 'Empresa fundada por la familia González en Tepatitlán, Jalisco; sin venta a extranjeros reportada.', 'México', 'Familia', "", "", 'Detergentes y jabones (Zote, Roma, Blanca Nieves, Foca). Control familiar actual inferido de la fuente (no hay cifras accionarias).', 'Alta', 'El CEO: Zote, cómo surgió y quién es el dueño', 'https://elceo.com/negocios/zote-como-surgio-y-quien-es-el-dueno-de-la-marca-de-jabon/', ahorro=True)
b('loc_f_brica_de_jab_n_la_corona_s_a', 'Zote', 'Jabón Zote')
CAT['Zote'] = 'limpieza'
b('loc_f_brica_de_jab_n_la_corona_s_a', '!Roma', 'Detergente Roma')
CAT['Roma'] = 'limpieza'
b('loc_f_brica_de_jab_n_la_corona_s_a', 'Blanca Nieves', 'Detergente Blanca Nieves')
CAT['Blanca Nieves'] = 'limpieza'
b('loc_f_brica_de_jab_n_la_corona_s_a', 'Foca', 'Detergente Foca', 'Jabón Tepeyac', 'Carisma')
CAT['Foca'] = 'limpieza'
CAT['Carisma'] = 'limpieza'
CAT['Jabón Tepeyac'] = 'cuidado_personal'
g('loc_galletas_dond', 'Galletas Dondé', 'Fundada en Mérida en 1905 por Luis Dondé; pasó a la familia Gómory.', 'México', 'Familia', "", "", 'Control familiar actual no confirmado con fuente reciente.', 'Alta', 'Diario de Yucatán: Galletas Dondé, 115 años', 'https://www.yucatan.com.mx/merida/2021/05/05/galletas-donde-115-anos-en-el-mercado.html', ahorro=True)
b('loc_galletas_dond', 'Dondé', 'Galletas Dondé')
CAT['Dondé'] = 'botanas_galletas'
g('loc_grupo_flexi', 'Grupo Flexi (Flexi)', 'Familia Plascencia: fundador Roberto Plascencia Gutiérrez; hoy dirige la tercera generación (Roberto Plascencia Torres).', 'México', 'Familia', "", "", 'Escrito también Plasencia.', 'Alta', 'El CEO: ¿Quién es el dueño de Flexi?', 'https://elceo.com/negocios/quien-es-el-dueno-de-la-marca-flexi/')
b('loc_grupo_flexi', '!Flexi', 'Grupo Flexi')
CAT['Flexi'] = 'ropa_calzado'
g('loc_land_o_lakes_inc', "Land O'Lakes, Inc.", 'Cooperativa agrícola propiedad de sus miembros (aprox. 2,580 miembros en 2024).', 'EE.UU.', 'Cooperativa', "", "", '', 'Alta', "Wikipedia: Land O'Lakes", 'https://en.wikipedia.org/wiki/Land_O%27Lakes')
b('loc_land_o_lakes_inc', "Land O'Lakes", 'Land O Lakes')
CAT["Land O'Lakes"] = 'lacteos'
g('loc_cropp_cooperative', 'CROPP Cooperative', 'Cooperativa propiedad de agricultores.', 'EE.UU.', 'Cooperativa', "", "", "La página confirma 'farmer-owned cooperative'; el nombre CROPP no aparece en ella.", 'Alta', 'Organic Valley: About us', 'https://www.organicvalley.coop/about-us/')
b('loc_cropp_cooperative', 'Organic Valley')
CAT['Organic Valley'] = 'lacteos'
g('loc_cabot_creamery_cooperative', 'Cabot Creamery Cooperative (subsidiaria de Agri-Mark)', 'Propiedad de Agri-Mark, cooperativa de granjeros lecheros de Nueva Inglaterra y Nueva York (unas 800 granjas en 2021).', 'EE.UU.', 'Cooperativa', "", "", '', 'Alta', 'Wikipedia: Cabot Creamery', 'https://en.wikipedia.org/wiki/Cabot_Creamery')
b('loc_cabot_creamery_cooperative', '!Cabot', 'Cabot Creamery')
CAT['Cabot'] = 'lacteos'
g('loc_tillamook_county_creamery_asso', 'Tillamook County Creamery Association', 'Cooperativa propiedad de familias ganaderas del condado de Tillamook, Oregon.', 'EE.UU.', 'Cooperativa', "", "", '', 'Alta', 'Tillamook: About us', 'https://www.tillamook.com/about-us')
b('loc_tillamook_county_creamery_asso', 'Tillamook')
CAT['Tillamook'] = 'lacteos'
g('loc_ocean_spray_cranberries_inc', 'Ocean Spray Cranberries, Inc.', 'Cooperativa agrícola con unos 700 productores de arándano como dueños.', 'EE.UU.', 'Cooperativa', "", "", '', 'Alta', 'Ocean Spray: About us', 'https://www.oceanspray.com/en/About-Us')
b('loc_ocean_spray_cranberries_inc', 'Ocean Spray')
CAT['Ocean Spray'] = 'bebidas'
g('loc_welch_s', "Welch's / National Grape Cooperative Association", 'Propiedad de la cooperativa de viticultores National Grape desde 1956.', 'EE.UU.', 'Cooperativa', "", "", 'Wikipedia marca la página como desactualizada (abr 2025); sin venta reportada.', 'Alta', "Wikipedia: Welch's", 'https://en.wikipedia.org/wiki/Welch%27s')
b('loc_welch_s', "Welch's", 'Welchs')
CAT["Welch's"] = 'bebidas'
g('loc_bob_s_red_mill_natural_foods', "Bob's Red Mill Natural Foods", 'Propiedad de sus empleados.', 'EE.UU.', 'Empleados', "", "", '', 'Alta', "Bob's Red Mill: About us", 'https://www.bobsredmill.com/about-us')
b('loc_bob_s_red_mill_natural_foods', "Bob's Red Mill", 'Bobs Red Mill')
CAT["Bob's Red Mill"] = 'panaderia_harinas'
g('loc_king_arthur_baking_company_inc', 'King Arthur Baking Company, Inc.', '100% propiedad de sus empleados mediante ESOP desde 2004.', 'EE.UU.', 'Empleados', "", "", '', 'Alta', 'Wikipedia: King Arthur Baking Company', 'https://en.wikipedia.org/wiki/King_Arthur_Baking_Company')
b('loc_king_arthur_baking_company_inc', 'King Arthur Baking', 'King Arthur Flour', '!King Arthur')
CAT['King Arthur Baking'] = 'panaderia_harinas'
g('loc_patagonia_inc', 'Patagonia, Inc.', 'Desde 2022 las acciones con voto están en Patagonia Purpose Trust (supervisado por la familia Chouinard) y las sin voto en Holdfast Collective.', 'EE.UU.', 'Fideicomiso', "", "", '', 'Alta', 'Wikipedia: Patagonia, Inc.', 'https://en.wikipedia.org/wiki/Patagonia,_Inc.')
b('loc_patagonia_inc', '!Patagonia')
CAT['Patagonia'] = 'ropa_calzado'
g('loc_dr_bronner_s_magic_soaps', "Dr. Bronner's Magic Soaps", 'Empresa familiar dirigida por David Bronner (CEO), nieto del fundador.', 'EE.UU.', 'Familia', "", "", '', 'Alta', "Dr. Bronner's: Our story", 'https://www.drbronner.com/about/ourselves/the-dr-bronners-story/')
b('loc_dr_bronner_s_magic_soaps', "Dr. Bronner's", 'Dr Bronners', 'Dr. Bronners')
CAT["Dr. Bronner's"] = 'cuidado_personal'
g('loc_the_hershey_company', 'The Hershey Company', 'Empresa pública cuyo accionista mayoritario en poder de voto es el fideicomiso Hershey Trust (Milton Hershey School).', 'EE.UU.', 'Fideicomiso', "", "", 'Cotiza en bolsa; es una gran empresa, pero de capital estadounidense.', 'Alta', 'Wikipedia: Hershey Company', 'https://en.wikipedia.org/wiki/Hershey_Company')
b('loc_the_hershey_company', "Hershey's", '!Hershey')
CAT["Hershey's"] = 'chocolate_dulces'
g('loc_d_g_yuengling_son', 'D.G. Yuengling & Son', 'Empresa privada de la familia Yuengling (Richard Yuengling Jr.); sus hijas serían las sucesoras.', 'EE.UU.', 'Familia', "", "", '', 'Alta', 'Wikipedia: Yuengling', 'https://en.wikipedia.org/wiki/Yuengling')
b('loc_d_g_yuengling_son', 'Yuengling', "Yuengling's", 'Yuengling Lager')
CAT['Yuengling'] = 'cerveza'
g('loc_sierra_nevada_brewing_co', 'Sierra Nevada Brewing Co.', 'Empresa privada de su fundador Ken Grossman (y familia).', 'EE.UU.', 'Fundador', "", "", 'La fuente solo cita a Ken Grossman.', 'Alta', 'Wikipedia: Sierra Nevada Brewing Company', 'https://en.wikipedia.org/wiki/Sierra_Nevada_Brewing_Company')
b('loc_sierra_nevada_brewing_co', '!Sierra Nevada', 'Sierra Nevada Brewing')
CAT['Sierra Nevada'] = 'cerveza'
g('loc_the_boston_beer_company', 'The Boston Beer Company', 'Cotiza en bolsa (NYSE: SAM); el fundador Jim Koch tiene el 100% de las acciones Clase B con voto.', 'EE.UU.', 'Fundador', "", "", '', 'Alta', 'Wikipedia: Boston Beer Company', 'https://en.wikipedia.org/wiki/Boston_Beer_Company')
b('loc_the_boston_beer_company', 'Samuel Adams', 'Sam Adams', 'Boston Beer')
CAT['Samuel Adams'] = 'cerveza'
g('loc_agropur_coop_rative', 'Agropur Coopérative', 'Cooperativa de productores lecheros con 2,908 miembros (2021); sede en Saint-Hubert, Quebec.', 'Canadá', 'Cooperativa', "", "", '', 'Alta', 'Wikipedia: Agropur', 'https://en.wikipedia.org/wiki/Agropur')
b('loc_agropur_coop_rative', 'Agropur')
CAT['Agropur'] = 'lacteos'
g('loc_gay_lea_foods_co_operative_lim', 'Gay Lea Foods Co-operative Limited', 'Cooperativa propiedad de unos 1,200 productores lecheros de Ontario y Manitoba.', 'Canadá', 'Cooperativa', "", "", '', 'Alta', 'Gay Lea Foods: About us', 'https://www.gaylea.com/about-us')
b('loc_gay_lea_foods_co_operative_lim', 'Gay Lea', 'Gay Lea Foods')
CAT['Gay Lea'] = 'lacteos'
g('loc_cooperativa_central_aurora_ali', 'Cooperativa Central Aurora Alimentos', 'Cooperativa central cuyos miembros son 14 cooperativas agrícolas; sede en Chapecó (SC).', 'Brasil', 'Cooperativa', "", "", '', 'Alta', 'Compre Rural: Aurora Coop asume planta en Castro', 'https://www.comprerural.com/aurora-coop-assume-a-operacao-da-planta-industrial-de-suinos-da-unium-em-castro-pr')
b('loc_cooperativa_central_aurora_ali', '!Aurora', 'Aurora Alimentos', 'Aurora Coop')
CAT['Aurora'] = 'abarrotes'
g('loc_latic_nios_bela_vista_s_a', 'Laticínios Bela Vista S.A.', 'Controlada por la familia Helou (hermanos Cesar y Marcos Helou); desde 2024 preside Luiz Cláudio Lorenzo, con los Helou en el consejo.', 'Brasil', 'Familia', "", "", '', 'Alta', 'InfoMoney: Dona da Piracanjuba faz planos', 'https://www.infomoney.com.br/?p=2347395')
b('loc_latic_nios_bela_vista_s_a', 'Piracanjuba')
CAT['Piracanjuba'] = 'lacteos'
g('loc_qu_mica_amparo_ltda', 'Química Amparo Ltda.', 'Grupo familiar de la familia Beira (fundada en 1950 por Waldyr Beira); consejo con 5 familiares y 4 independientes.', 'Brasil', 'Familia', "", "", '', 'Alta', 'InvestNews: Crise Anvisa e Ypê', 'https://investnews.com.br/negocios/crise-anvisa-ype-testa-marca-brasil/amp/')
b('loc_qu_mica_amparo_ltda', 'Ypê', '!Ype')
CAT['Ypê'] = 'limpieza'
g('loc_cooperativa_agr_cola_y_lechera', 'Cooperativa Agrícola y Lechera de La Unión Ltda.', 'Cooperativa de productores lecheros (más de 730 socios), sede en La Unión, Chile.', 'Chile', 'Cooperativa', "", "", '', 'Alta', 'Wikipedia: Colún', 'https://en.wikipedia.org/wiki/Cooperativa_Agr%C3%ADcola_y_Lechera_de_La_Uni%C3%B3n_Limitada')
b('loc_cooperativa_agr_cola_y_lechera', 'Colún')
CAT['Colún'] = 'lacteos'
g('loc_procafecol_s_a', 'Procafecol S.A. / Federación Nacional de Cafeteros de Colombia', 'Marca oficial de la Federación Nacional de Cafeteros, gremio de unos 500,000 caficultores.', 'Colombia', 'Cooperativa', "", "", 'Gremio de productores, no cooperativa estricta; Procafecol tiene otros accionistas, sin verificar.', 'Alta', 'Wikipedia: Juan Valdez Café', 'https://es.wikipedia.org/wiki/Juan_Valdez_Café')
b('loc_procafecol_s_a', 'Juan Valdez', 'Juan Valdez Café')
CAT['Juan Valdez'] = 'cafe'
g('loc_arla_foods_amba', 'Arla Foods amba', 'Cooperativa de unos 8.500 ganaderos de siete países (Dinamarca, Suecia, Alemania, Reino Unido, Bélgica, Países Bajos, Luxemburgo).', 'Dinamarca / Suecia', 'Cooperativa', "", "", 'Cooperativa de capital danés-sueco; sede en Aarhus.', 'Alta', 'Wikipedia: Arla Foods', 'https://en.wikipedia.org/wiki/Arla_Foods')
b('loc_arla_foods_amba', '!Arla', 'Arla Foods', 'Arla Foods amba')
CAT['Arla'] = 'lacteos'
g('loc_the_co_operative_group', 'The Co-operative Group', 'Cooperativa de consumidores propiedad de sus miembros.', 'Reino Unido', 'Cooperativa', "", "", 'Marca propia y supermercados Co-op Food del Reino Unido.', 'Alta', 'Wikipedia: Co-op Food', 'https://en.wikipedia.org/wiki/Co-op_Food')
b('loc_the_co_operative_group', '!Co-op', 'Co-op Food', 'The Co-operative Food')
CAT['Co-op'] = 'abarrotes'
g('loc_capsa_food', 'Capsa Food', 'Central Lechera Asturiana, cooperativa ganadera de origen asturiano, posee el 81,53% de Capsa Food.', 'España', 'Cooperativa', "", "", 'El resto del capital de Capsa no pudo confirmarse en la fuente.', 'Alta', 'Central Lechera Asturiana: noticia corporativa', 'https://www.centrallecheraasturiana.es/en/?p=102577')
b('loc_capsa_food', 'Central Lechera Asturiana', '!CLAS', '!Asturiana')
CAT['Central Lechera Asturiana'] = 'lacteos'
g('loc_covap_sociedad_cooperativa_and', 'COVAP, Sociedad Cooperativa Andaluza', 'Cooperativa de ganaderos con sede en Pozoblanco (Córdoba).', 'España', 'Cooperativa', "", "", '', 'Alta', 'Agronews Castilla y León: ALBA y COVAP', 'https://www.agronewscastillayleon.com/las-cooperativas-alba-y-covap-se-unen-para-gestionar-el-88-de-la-leche-de-vaca-andaluza')
b('loc_covap_sociedad_cooperativa_and', 'COVAP', 'Grupo COVAP')
CAT['COVAP'] = 'lacteos'
g('loc_eroski_s_coop', 'Eroski S. Coop.', 'Cooperativa de consumidores y trabajadores, parte de la división de distribución de Mondragon Corporation.', 'España', 'Cooperativa', "", "", 'Cooperativa mixta: unos 450.000 consumidores socios y más de 36.000 trabajadores socios.', 'Alta', 'Wikipedia: Eroski', 'https://es.wikipedia.org/wiki/Eroski')
b('loc_eroski_s_coop', 'Eroski', 'Eroski S. Coop.', 'Caprabo')
CAT['Eroski'] = 'abarrotes'
g('loc_hijos_de_rivera_s_a', 'Hijos de Rivera S.A.', 'Empresa familiar de la familia Rivera (presidente Ignacio Rivera Quintana, cuarta generación), de capital español.', 'España', 'Familia', "", "", '', 'Alta', 'Wikipedia: Hijos de Rivera', 'https://es.wikipedia.org/wiki/Hijos_de_Rivera')
b('loc_hijos_de_rivera_s_a', 'Estrella Galicia', 'Hijos de Rivera', '1906 Reserva Especial')
CAT['Estrella Galicia'] = 'cerveza'
g('loc_chocolates_valor_s_a', 'Chocolates Valor S.A.', 'Empresa familiar de la familia López en Villajoyosa (Alicante); Pedro López representa la cuarta generación.', 'España', 'Familia', "", "", 'No se halló una fuente que detalle el reparto accionarial; se describe como empresa familiar.', 'Alta', 'The Objective / Instituto de la Empresa Familiar', 'https://theobjective.com/further/branded-content/2025-12-09/fuerza-invisible-chocolate-140-anos-endulzando-espana/')
b('loc_chocolates_valor_s_a', 'Chocolates Valor', '!Valor')
CAT['Chocolates Valor'] = 'chocolate_dulces'
g('loc_camper_s_l', 'Camper S.L.', 'Familia Fluxà: Forch Med tiene el 65% y otras dos ramas familiares el 35%.', 'España', 'Familia', "", "", '', 'Alta', 'Modaes: Camper alcanza 240 millones en 2024', 'https://www.modaes.com/empresas/camper-alcanza-240-millones-en-2024-y-estrena-en-paris-su-plan-de-expansion-para-2025')
b('loc_camper_s_l', '!Camper', '!Camperlab')
CAT['Camper'] = 'ropa_calzado'
g('loc_sodiaal_international', 'Sodiaal International (Sodiaal Union)', 'Propiedad 100% de la cooperativa francesa Sodiaal desde nov. 2021 (General Mills vendió su parte; también compró el negocio de Canadá en 2025).', 'Francia', 'Cooperativa', "", "", 'Solo vale para Europa/Francia y Canadá: en EE.UU. Yoplait pertenece a Lactalis desde jun. 2025.', 'Alta', 'Wikipedia: Yoplait', 'https://en.wikipedia.org/wiki/Yoplait')
b('loc_sodiaal_international', 'Yoplait', 'Yoplait France')
CAT['Yoplait'] = 'lacteos'
b('loc_sodiaal_international', '!Candia', 'Candia Grandlait', '!GrandLait')
CAT['Candia'] = 'lacteos'
g('loc_andros', 'Andros (Groupe Andros)', 'Familia Gervoson-Chapoulart; Jean Gervoson fundó Bonne Maman en 1971.', 'Francia', 'Familia', "", "", 'Fuente secundaria; el origen familiar es de conocimiento público.', 'Verificar (fuente secundaria)', 'Synonyme-du-mot: Qui possède Andros', 'https://www.synonyme-du-mot.com/les-articles/qui-possede-andros')
b('loc_andros', 'Bonne Maman', '!Andros')
CAT['Bonne Maman'] = 'abarrotes'
g('loc_granarolo_s_p_a', 'Granarolo S.p.A.', 'La cooperativa Granlatte conserva el control con cerca del 65% (antes 77,5%), tras el aumento de capital de 2023 con CDP (FNS) y Enpaia como socios minoritarios.', 'Italia', 'Cooperativa', "", "", 'Los minoritarios son un fondo público (CDP) y un ente previsional agrícola, no capital privado extranjero.', 'Alta', 'BeBeez: aumento de capital de Granarolo', 'https://bebeez.it/ma-e-corporate-finance/granarolo-aumento-di-capitale-da-160-mln-euro-entrano-il-fondo-nazionale-strategico-cdp-ed-enpaia-mentre-granlatte-resta-al-comando-con-il-65-circa-dal-775/')
b('loc_granarolo_s_p_a', 'Granarolo', 'Granarolo S.p.A.')
CAT['Granarolo'] = 'lacteos'
g('loc_mutti_s_p_a', 'Mutti S.p.A.', 'Empresa de matriz familiar de la familia Mutti (Francesco Mutti, CEO desde 1994).', 'Italia', 'Familia', "", "", 'La fuente no detalla accionistas; confirma carácter familiar.', 'Alta', 'AGI: addio a Marcello Mutti', 'https://www.agi.it/economia/news/2024-10-11/addio-a-marcello-mutti-re-della-passata-di-pomodoro-28228521/')
b('loc_mutti_s_p_a', '!Mutti', 'Mutti Parma')
CAT['Mutti'] = 'abarrotes'
g('loc_pastificio_rummo_s_p_a', 'Pastificio Rummo S.p.A.', 'Familia Rummo, hoy en su sexta generación (Benevento).', 'Italia', 'Familia', "", "", 'La fuente no detalla la estructura accionarial formal.', 'Alta', 'Assolombarda: scheda Rummo', 'https://assolombarda.it/le-imprese/filiere/aziende/rummo/scheda-rummo')
b('loc_pastificio_rummo_s_p_a', '!Rummo', 'Pasta Rummo')
CAT['Rummo'] = 'abarrotes'
g('loc_f_lli_de_cecco_di_filippo_fara', 'F.lli De Cecco di Filippo Fara San Martino S.p.A.', 'Familia De Cecco; Filippo Antonio De Cecco dirige el grupo.', 'Italia', 'Familia', "", "", 'No se pudo verificar el reparto accionarial en la fuente.', 'Alta', 'QuiFinanza: Filippo Antonio De Cecco', 'https://quifinanza.it/economia/filippo-antonio-de-cecco-fatturato-pasta/877953/')
b('loc_f_lli_de_cecco_di_filippo_fara', 'De Cecco', 'Di Cecco', 'Pasta De Cecco')
CAT['De Cecco'] = 'abarrotes'
g('loc_ehrmann_se', 'Ehrmann SE', '100% de la familia Ehrmann, no cotizada, sin inversionistas externos.', 'Alemania', 'Familia', "", "", '', 'Verificar (fuente secundaria)', 'UAMR: Wem gehört Ehrmann?', 'https://www.uamr.de/?p=5615')
b('loc_ehrmann_se', 'Ehrmann', 'Almighurt', 'Ehrmann SE')
CAT['Ehrmann'] = 'lacteos'
g('loc_alfred_ritter_gmbh_co_kg', 'Alfred Ritter GmbH & Co. KG', 'Familia Ritter (holding familiar R2); nueva generación asume el consejo asesor.', 'Alemania', 'Familia', "", "", 'La fuente no da el porcentaje exacto.', 'Alta', 'Stuttgarter Zeitung: Unternehmerfamilie Ritter', 'https://www.stuttgarter-zeitung.de/wirtschaft/unternehmerfamilie-ritter-generationswechsel-bei-ritter-sport-79031186.html')
b('loc_alfred_ritter_gmbh_co_kg', 'Ritter Sport', 'Alfred Ritter')
CAT['Ritter Sport'] = 'chocolate_dulces'
g('loc_werner_mertz_gmbh', 'Werner & Mertz GmbH', 'Empresa familiar de los descendientes de Philipp Adam Schneider; Reinhard Schneider es propietario, quinta generación.', 'Alemania', 'Familia', "", "", '', 'Verificar (fuente secundaria)', 'Austria-Forum: Werner & Mertz', 'https://austria-forum.org/af/AustriaWiki/Werner_%26_Mertz')
b('loc_werner_mertz_gmbh', 'Frosch', 'Werner & Mertz', 'Werner & Mertz Frosch')
CAT['Frosch'] = 'limpieza'
g('loc_japanese_consumers_co_operativ', "Japanese Consumers' Co-operative Union (JCCU)", 'Federación nacional de cooperativas de consumidores (unos 302 miembros y alrededor de 30 millones de socios) que maneja la marca propia CO-OP.', 'Japón', 'Cooperativa', "", "", 'Marca propia CO-OP de las cooperativas de consumidores japonesas.', 'Alta', 'JCCU: sitio oficial', 'https://jccu.coop/eng/')
b('loc_japanese_consumers_co_operativ', 'Co-op Japan', 'JCCU', 'Nihon Seikyo')
CAT['Co-op Japan'] = 'abarrotes'
g('loc_seoul_dairy_cooperative', 'Seoul Dairy Cooperative', 'Cooperativa lechera; Seoul Milk es su nombre comercial (fundada en 1937 como asociación, cooperativa desde 1962).', 'Corea del Sur', 'Cooperativa', "", "", '', 'Alta', 'Wikipedia: Seoul Milk', 'https://en.wikipedia.org/wiki/Seoul_Milk')
b('loc_seoul_dairy_cooperative', 'Seoul Milk', 'Seoul Dairy Cooperative', 'Seoul Dairy Coop', '서울우유')
CAT['Seoul Milk'] = 'lacteos'
g('loc_binggrae_co_ltd', 'Binggrae Co., Ltd.', 'Cotizada en la Bolsa de Corea; el mayor accionista es Kim Ho-yeon (36,75%) y la Pensión Nacional tiene 6,48%.', 'Corea del Sur', 'Familia', "", "", 'Cotizada pero con control familiar claro (Kim Ho-yeon, presidente del consejo); la fuente no lo califica explícitamente de familiar.', 'Alta', 'Wikipedia: Binggrae', 'https://en.wikipedia.org/wiki/Binggrae')
b('loc_binggrae_co_ltd', 'Binggrae', 'Binggrae KR', '빙그레')
CAT['Binggrae'] = 'lacteos'
g('loc_karnataka_milk_federation', 'Karnataka Milk Federation (KMF)', 'Federación cooperativa de tres niveles (sociedades de ganaderos, 14 uniones lecheras y la federación estatal).', 'India', 'Cooperativa', "", "", 'Wikipedia lista al gobierno de Karnataka como propietario por su respaldo estatal; la estructura es cooperativa.', 'Alta', 'KMF Nandini: Acerca de', 'https://www.kmfnandini.coop/en/about-us')
b('loc_karnataka_milk_federation', 'Nandini', '!KMF', 'Karnataka Milk Federation')
CAT['Nandini'] = 'lacteos'
g('loc_haldiram_snacks_foods_pvt_ltd', 'Haldiram Snacks Foods Pvt Ltd', 'Las familias Agarwal (ramas de Delhi y Nagpur) siguen como accionistas mayoritarios; entre 2025 y 2026 vendieron minorías a Temasek (~10%) y a Alpha Wave/IHC (~6-9%).', 'India', 'Familia', "", "", 'Control familiar vigente; la salida a bolsa aún no se presenta (DRHP pendiente a jun. 2026). Los fondos son minoritarios (menos de 20% en total). Vigilar si cambia el control.', 'Verificar (fuente secundaria)', "IPO Market: Haldiram's IPO 2026", 'https://www.ipomarket.in/news/haldirams-ipo-2026-date-price-band-gmp-review')
b('loc_haldiram_snacks_foods_pvt_ltd', "Haldiram's", 'Haldirams', 'Haldiram')
CAT["Haldiram's"] = 'botanas_galletas'
g('loc_ntuc_fairprice_co_operative_li', 'NTUC FairPrice Co-operative Limited', 'Cooperativa de consumidores del movimiento laboral NTUC; marca propia FairPrice.', 'Singapur', 'Cooperativa', "", "", 'La fuente no menciona participación de Temasek.', 'Alta', 'Wikipedia: NTUC FairPrice', 'https://en.wikipedia.org/wiki/NTUC_FairPrice')
b('loc_ntuc_fairprice_co_operative_li', 'FairPrice', 'NTUC FairPrice', 'FairPrice Group')
CAT['FairPrice'] = 'abarrotes'

g('loc_sancor_cooperativas_unidas', 'SanCor Cooperativas Unidas Limitada', 'Cooperativa de segundo grado integrada por productores tamberos de Santa Fe y Córdoba fundada en 1938.', 'Argentina', 'Cooperativa', "", "", '', 'Alta', 'SanCor: Historia institucional', 'https://www.sancor.com/historia')
b('loc_sancor_cooperativas_unidas', 'SanCor')
CAT['SanCor'] = 'lacteos'

g('loc_cooperativa_obrera_ltda', 'Cooperativa Obrera Limitada', 'Cooperativa de consumo con más de 2 millones de asociados fundada en 1920 en Bahía Blanca.', 'Argentina', 'Cooperativa', "", "", '', 'Alta', 'Cooperativa Obrera: Quiénes somos', 'https://www.cooperativaobrera.coop/quienes-somos/')
b('loc_cooperativa_obrera_ltda', '!Cooperativa Obrera', 'Primer Precio')
CAT['Cooperativa Obrera'] = 'abarrotes'

g('loc_cooperativa_agricola_liebig', 'Cooperativa Agrícola de la Colonia Liebig', 'Cooperativa de productores agrícolas fundada en 1926 en Corrientes, productora de Playadito.', 'Argentina', 'Cooperativa', "", "", '', 'Alta', 'Liebig: Sitio oficial', 'https://www.coestliebig.com.ar/')
b('loc_cooperativa_agricola_liebig', 'Playadito', 'Yerba Playadito')
CAT['Playadito'] = 'bebidas'

g('loc_colanta_cooperativa', 'Colanta (Cooperativa Lechera de Antioquia)', 'Cooperativa lechera de productores y trabajadores agropecuarios fundada en 1964 en Medellín.', 'Colombia', 'Cooperativa', "", "", '', 'Alta', 'Colanta: Nuestra historia', 'https://www.colanta.com/historia/')
b('loc_colanta_cooperativa', 'Colanta')
CAT['Colanta'] = 'lacteos'

g('loc_gran_cafe_de_la_parroquia', 'Gran Café de La Parroquia', 'Empresa familiar fundada en 1808 en Veracruz, dirigida por la familia Fernández.', 'México', 'Familia', "", "", '', 'Alta', 'Sitio oficial La Parroquia', 'https://laparroquia.com/')
b('loc_gran_cafe_de_la_parroquia', 'La Parroquia', 'Café La Parroquia')
CAT['La Parroquia'] = 'cafe'

g('loc_industrias_guacamaya', 'Industrias Guacamaya', 'Empresa familiar de salsas fundada en 1948 en Culiacán, Sinaloa, por la familia Cebreros.', 'México', 'Familia', "", "", '', 'Alta', 'La Guacamaya: Historia', 'https://laguacamaya.mx/')
b('loc_industrias_guacamaya', 'La Guacamaya', 'Salsa La Guacamaya')
CAT['La Guacamaya'] = 'abarrotes'

# ---- Cuidado de la piel y dermocosmética local
g('loc_laboratorios_grisi', 'Laboratorios Grisi', 'Familia Grisi: empresa familiar mexicana fundada en 1863, especializada en dermocosmética y cuidado de la piel.', 'México', 'Familia', "", "", 'Dermocosmética, jabón neutro, concha nácar y cuidado facial.', 'Alta', 'Expansión: Grisi, 160 años de historia', 'https://expansion.mx/empresas/2023/05/23/grisi-160-anos-historia', ahorro=True)
b('loc_laboratorios_grisi', 'Grisi Dermocosmética', 'Jabón Neutro Grisi', 'Concha Nácar Grisi', 'Grisi Facial', 'Grisi', 'Cero')
CAT['Grisi Dermocosmética'] = 'skincare_cosmetica'
CAT['Jabón Neutro Grisi'] = 'skincare_cosmetica'
CAT['Concha Nácar Grisi'] = 'skincare_cosmetica'
CAT['Grisi Facial'] = 'skincare_cosmetica'
CAT['Grisi'] = 'skincare_cosmetica'
CAT['Cero'] = 'cuidado_personal'

g('loc_genomma_lab', 'Genomma Lab (Cuidado Facial)', 'Rodrigo Herrera (fundador mexicano) y accionistas en la BMV; marcas de cuidado facial.', 'México', 'Fundador + fondos', "", "", 'Cuidado facial, cremas antiedad e higiene dermatológica de farmacia. Cotiza en la BMV.', 'Verificar (fuente: sitio oficial, sin datos de propiedad)', 'Reporte anual Genomma Lab (BMV)', 'https://www.genommalab.com', ahorro=True)
b('loc_genomma_lab', 'Cicatricure', 'Asepxia', 'Teatrical', 'Goicoechea')
CAT['Cicatricure'] = 'skincare_cosmetica'
CAT['Asepxia'] = 'skincare_cosmetica'
CAT['Teatrical'] = 'skincare_cosmetica'
CAT['Goicoechea'] = 'cuidado_personal'

g('loc_farmacias_similares', 'Grupo Por Un País Mejor (Farmacias Similares)', 'Familia González Torres (Víctor González Herrera y familia); empresa 100% mexicana privada.', 'México', 'Familia', "", "", 'Productos farmacéuticos y dermocosméticos (Eternal Secret, SimiCrema, SimiSolar).', 'Verificar (fuente: sitio oficial, sin datos de propiedad)', 'Sitio oficial Farmacias Similares', 'https://farmaciassimilares.com', ahorro=True)
b('loc_farmacias_similares', 'Eternal Secret', 'SimiCrema', 'SimiSolar', 'Dr. Simi', 'Simi')
CAT['Eternal Secret'] = 'skincare_cosmetica'
CAT['SimiCrema'] = 'skincare_cosmetica'
CAT['SimiSolar'] = 'skincare_cosmetica'
CAT['Dr. Simi'] = 'cuidado_personal'
CAT['Simi'] = 'cuidado_personal'

g('loc_jaloma', 'Laboratorios Jaloma', 'Familia López Morales; empresa 100% mexicana fundada en 1941 en Guadalajara, Jalisco.', 'México', 'Familia', "", "", 'Cuidado personal básico (agua de rosas, aceites corporales, vaselina).', 'Verificar (fuente: sitio oficial, sin datos de propiedad)', 'Sitio oficial Jaloma', 'https://jaloma.com.mx', ahorro=True)
b('loc_jaloma', 'Jaloma', 'Aceite Jaloma', 'Agua de Rosas Jaloma')
CAT['Jaloma'] = 'skincare_cosmetica'
CAT['Agua de Rosas Jaloma'] = 'skincare_cosmetica'
CAT['Aceite Jaloma'] = 'cuidado_personal'

g('loc_sesderma', 'Laboratorios Sesderma', 'Dr. Gabriel Serrano y familia; laboratorio dermocosmético español fundado en 1989.', 'España', 'Familia', "", "", 'Dermocosmética y cuidado facial.', 'Verificar (fuente: sitio oficial, sin datos de propiedad)', 'Sitio oficial de Sesderma', 'https://www.sesderma.com')
b('loc_sesderma', 'Sesderma', 'Babé')
CAT['Sesderma'] = 'skincare_cosmetica'
CAT['Babé'] = 'skincare_cosmetica'

g('loc_cantabria_labs', 'Cantabria Labs', 'Familia Matji; laboratorio dermatológico español fundado en 1989.', 'España', 'Familia', "", "", 'Dermocosmética española y fotoprotección dermatológica.', 'Verificar (fuente: sitio oficial, sin datos de propiedad)', 'Sitio oficial Cantabria Labs', 'https://www.cantabrialabs.com')
b('loc_cantabria_labs', 'Heliocare', 'Endocare', 'Neoretin')
CAT['Heliocare'] = 'skincare_cosmetica'
CAT['Endocare'] = 'skincare_cosmetica'
CAT['Neoretin'] = 'skincare_cosmetica'

g('loc_vanicream', 'Vanicream (Pharmaceutical Specialties, Inc.)', 'Farmacéuticos fundadores independientes en Rochester, Minnesota.', 'EE.UU.', 'Privada', "", "", 'Dermocosmética para piel sensible y dermatitis, libre de fragancias, tintes y parabenos.', 'Verificar (fuente: sitio oficial, sin datos de propiedad)', 'Sitio oficial Vanicream', 'https://www.vanicream.com')
b('loc_vanicream', 'Vanicream')
CAT['Vanicream'] = 'skincare_cosmetica'

g('loc_naos', 'NAOS (Bioderma, Institut Esthederm)', 'Controlada por el fondo de dotación / fundación Jean-Noël Thorel con fin de utilidad pública.', 'Francia', 'Fideicomiso', "", "", 'Dermocosmética francesa (Bioderma, Institut Esthederm).', 'Verificar (fuente: sitio oficial, sin datos de propiedad)', 'Sitio oficial NAOS', 'https://naos.com')
b('loc_naos', 'Bioderma', 'Institut Esthederm')
CAT['Bioderma'] = 'skincare_cosmetica'
CAT['Institut Esthederm'] = 'skincare_cosmetica'


