// Türkiye's 81 provinces in plate-code order (index + 1 = plate code = postcode prefix), each with its
// 973 districts (ilçe) as PTT names them. Edited by hand: districts change only by law.
const data = [
  ["Adana", ["Aladağ","Ceyhan","Çukurova","Feke","İmamoğlu","Karaisalı","Karataş","Kozan","Pozantı","Saimbeyli","Sarıçam","Seyhan","Tufanbeyli","Yumurtalık","Yüreğir"]], // 01
  ["Adıyaman", ["Besni","Çelikhan","Gerger","Gölbaşı","Kahta","Merkez","Samsat","Sincik","Tut"]], // 02
  ["Afyonkarahisar", ["Başmakçı","Bayat","Bolvadin","Çay","Çobanlar","Dazkırı","Dinar","Emirdağ","Evciler","Hocalar","İhsaniye","İscehisar","Kızılören","Merkez","Sandıklı","Sinanpaşa","Sultandağı","Şuhut"]], // 03
  ["Ağrı", ["Diyadin","Doğubayazıt","Eleşkirt","Hamur","Merkez","Patnos","Taşlıçay","Tutak"]], // 04
  ["Amasya", ["Göynücek","Gümüşhacıköy","Hamamözü","Merkez","Merzifon","Suluova","Taşova"]], // 05
  ["Ankara", ["Akyurt","Altındağ","Ayaş","Bala","Beypazarı","Çamlıdere","Çankaya","Çubuk","Elmadağ","Etimesgut","Evren","Gölbaşı","Güdül","Haymana","Kahramankazan","Kalecik","Keçiören","Kızılcahamam","Mamak","Nallıhan","Polatlı","Pursaklar","Sincan","Şereflikoçhisar","Yenimahalle"]], // 06
  ["Antalya", ["Akseki","Aksu","Alanya","Demre","Döşemealtı","Elmalı","Finike","Gazipaşa","Gündoğmuş","İbradı","Kaş","Kemer","Kepez","Konyaaltı","Korkuteli","Kumluca","Manavgat","Muratpaşa","Serik"]], // 07
  ["Artvin", ["Ardanuç","Arhavi","Borçka","Hopa","Kemalpaşa","Merkez","Murgul","Şavşat","Yusufeli"]], // 08
  ["Aydın", ["Bozdoğan","Buharkent","Çine","Didim","Efeler","Germencik","İncirliova","Karacasu","Karpuzlu","Koçarlı","Köşk","Kuşadası","Kuyucak","Nazilli","Söke","Sultanhisar","Yenipazar"]], // 09
  ["Balıkesir", ["Altıeylül","Ayvalık","Balya","Bandırma","Bigadiç","Burhaniye","Dursunbey","Edremit","Erdek","Gömeç","Gönen","Havran","İvrindi","Karesi","Kepsut","Manyas","Marmara","Savaştepe","Sındırgı","Susurluk"]], // 10
  ["Bilecik", ["Bozüyük","Gölpazarı","İnhisar","Merkez","Osmaneli","Pazaryeri","Söğüt","Yenipazar"]], // 11
  ["Bingöl", ["Adaklı","Genç","Karlıova","Kiğı","Merkez","Solhan","Yayladere","Yedisu"]], // 12
  ["Bitlis", ["Adilcevaz","Ahlat","Güroymak","Hizan","Merkez","Mutki","Tatvan"]], // 13
  ["Bolu", ["Dörtdivan","Gerede","Göynük","Kıbrıscık","Mengen","Merkez","Mudurnu","Seben","Yeniçağa"]], // 14
  ["Burdur", ["Ağlasun","Altınyayla","Bucak","Çavdır","Çeltikçi","Gölhisar","Karamanlı","Kemer","Merkez","Tefenni","Yeşilova"]], // 15
  ["Bursa", ["Büyükorhan","Gemlik","Gürsu","Harmancık","İnegöl","İznik","Karacabey","Keles","Kestel","Mudanya","Mustafakemalpaşa","Nilüfer","Orhaneli","Orhangazi","Osmangazi","Yenişehir","Yıldırım"]], // 16
  ["Çanakkale", ["Ayvacık","Bayramiç","Biga","Bozcaada","Çan","Eceabat","Ezine","Gelibolu","Gökçeada","Lapseki","Merkez","Yenice"]], // 17
  ["Çankırı", ["Atkaracalar","Bayramören","Çerkeş","Eldivan","Ilgaz","Kızılırmak","Korgun","Kurşunlu","Merkez","Orta","Şabanözü","Yapraklı"]], // 18
  ["Çorum", ["Alaca","Bayat","Boğazkale","Dodurga","İskilip","Kargı","Laçin","Mecitözü","Merkez","Oğuzlar","Ortaköy","Osmancık","Sungurlu","Uğurludağ"]], // 19
  ["Denizli", ["Acıpayam","Babadağ","Baklan","Bekilli","Beyağaç","Bozkurt","Buldan","Çal","Çameli","Çardak","Çivril","Güney","Honaz","Kale","Merkezefendi","Pamukkale","Sarayköy","Serinhisar","Tavas"]], // 20
  ["Diyarbakır", ["Bağlar","Bismil","Çermik","Çınar","Çüngüş","Dicle","Eğil","Ergani","Hani","Hazro","Kayapınar","Kocaköy","Kulp","Lice","Silvan","Sur","Yenişehir"]], // 21
  ["Edirne", ["Enez","Havsa","İpsala","Keşan","Lalapaşa","Meriç","Merkez","Süloğlu","Uzunköprü"]], // 22
  ["Elazığ", ["Ağın","Alacakaya","Arıcak","Baskil","Karakoçan","Keban","Kovancılar","Maden","Merkez","Palu","Sivrice"]], // 23
  ["Erzincan", ["Çayırlı","İliç","Kemah","Kemaliye","Merkez","Otlukbeli","Refahiye","Tercan","Üzümlü"]], // 24
  ["Erzurum", ["Aşkale","Aziziye","Çat","Hınıs","Horasan","İspir","Karaçoban","Karayazı","Köprüköy","Narman","Oltu","Olur","Palandöken","Pasinler","Pazaryolu","Şenkaya","Tekman","Tortum","Uzundere","Yakutiye"]], // 25
  ["Eskişehir", ["Alpu","Beylikova","Çifteler","Günyüzü","Han","İnönü","Mahmudiye","Mihalgazi","Mihalıççık","Odunpazarı","Sarıcakaya","Seyitgazi","Sivrihisar","Tepebaşı"]], // 26
  ["Gaziantep", ["Araban","İslahiye","Karkamış","Nizip","Nurdağı","Oğuzeli","Şahinbey","Şehitkamil","Yavuzeli"]], // 27
  ["Giresun", ["Alucra","Bulancak","Çamoluk","Çanakçı","Dereli","Doğankent","Espiye","Eynesil","Görele","Güce","Keşap","Merkez","Piraziz","Şebinkarahisar","Tirebolu","Yağlıdere"]], // 28
  ["Gümüşhane", ["Kelkit","Köse","Kürtün","Merkez","Şiran","Torul"]], // 29
  ["Hakkari", ["Çukurca","Derecik","Merkez","Şemdinli","Yüksekova"]], // 30
  ["Hatay", ["Altınözü","Antakya","Arsuz","Belen","Defne","Dörtyol","Erzin","Hassa","İskenderun","Kırıkhan","Kumlu","Payas","Reyhanlı","Samandağ","Yayladağı"]], // 31
  ["Isparta", ["Aksu","Atabey","Eğirdir","Gelendost","Gönen","Keçiborlu","Merkez","Senirkent","Sütçüler","Şarkikaraağaç","Uluborlu","Yalvaç","Yenişarbademli"]], // 32
  ["Mersin", ["Akdeniz","Anamur","Aydıncık","Bozyazı","Çamlıyayla","Erdemli","Gülnar","Mezitli","Mut","Silifke","Tarsus","Toroslar","Yenişehir"]], // 33
  ["İstanbul", ["Adalar","Arnavutköy","Ataşehir","Avcılar","Bağcılar","Bahçelievler","Bakırköy","Başakşehir","Bayrampaşa","Beşiktaş","Beykoz","Beylikdüzü","Beyoğlu","Büyükçekmece","Çatalca","Çekmeköy","Esenler","Esenyurt","Eyüpsultan","Fatih","Gaziosmanpaşa","Güngören","Kadıköy","Kağıthane","Kartal","Küçükçekmece","Maltepe","Pendik","Sancaktepe","Sarıyer","Silivri","Sultanbeyli","Sultangazi","Şile","Şişli","Tuzla","Ümraniye","Üsküdar","Zeytinburnu"]], // 34
  ["İzmir", ["Aliağa","Balçova","Bayındır","Bayraklı","Bergama","Beydağ","Bornova","Buca","Çeşme","Çiğli","Dikili","Foça","Gaziemir","Güzelbahçe","Karabağlar","Karaburun","Karşıyaka","Kemalpaşa","Kınık","Kiraz","Konak","Menderes","Menemen","Narlıdere","Ödemiş","Seferihisar","Selçuk","Tire","Torbalı","Urla"]], // 35
  ["Kars", ["Akyaka","Arpaçay","Digor","Kağızman","Merkez","Sarıkamış","Selim","Susuz"]], // 36
  ["Kastamonu", ["Abana","Ağlı","Araç","Azdavay","Bozkurt","Cide","Çatalzeytin","Daday","Devrekani","Doğanyurt","Hanönü","İhsangazi","İnebolu","Küre","Merkez","Pınarbaşı","Seydiler","Şenpazar","Taşköprü","Tosya"]], // 37
  ["Kayseri", ["Akkışla","Bünyan","Develi","Felahiye","Hacılar","İncesu","Kocasinan","Melikgazi","Özvatan","Pınarbaşı","Sarıoğlan","Sarız","Talas","Tomarza","Yahyalı","Yeşilhisar"]], // 38
  ["Kırklareli", ["Babaeski","Demirköy","Kofçaz","Lüleburgaz","Merkez","Pehlivanköy","Pınarhisar","Vize"]], // 39
  ["Kırşehir", ["Akçakent","Akpınar","Boztepe","Çiçekdağı","Kaman","Merkez","Mucur"]], // 40
  ["Kocaeli", ["Başiskele","Çayırova","Darıca","Derince","Dilovası","Gebze","Gölcük","İzmit","Kandıra","Karamürsel","Kartepe","Körfez"]], // 41
  ["Konya", ["Ahırlı","Akören","Akşehir","Altınekin","Beyşehir","Bozkır","Cihanbeyli","Çeltik","Çumra","Derbent","Derebucak","Doğanhisar","Emirgazi","Ereğli","Güneysınır","Hadim","Halkapınar","Hüyük","Ilgın","Kadınhanı","Karapınar","Karatay","Kulu","Meram","Sarayönü","Selçuklu","Seydişehir","Taşkent","Tuzlukçu","Yalıhüyük","Yunak"]], // 42
  ["Kütahya", ["Altıntaş","Aslanapa","Çavdarhisar","Domaniç","Dumlupınar","Emet","Gediz","Hisarcık","Merkez","Pazarlar","Simav","Şaphane","Tavşanlı"]], // 43
  ["Malatya", ["Akçadağ","Arapgir","Arguvan","Battalgazi","Darende","Doğanşehir","Doğanyol","Hekimhan","Kale","Kuluncak","Pütürge","Yazıhan","Yeşilyurt"]], // 44
  ["Manisa", ["Ahmetli","Akhisar","Alaşehir","Demirci","Gölmarmara","Gördes","Kırkağaç","Köprübaşı","Kula","Salihli","Sarıgöl","Saruhanlı","Selendi","Soma","Şehzadeler","Turgutlu","Yunusemre"]], // 45
  ["Kahramanmaraş", ["Afşin","Andırın","Çağlayancerit","Dulkadiroğlu","Ekinözü","Elbistan","Göksun","Nurhak","Onikişubat","Pazarcık","Türkoğlu"]], // 46
  ["Mardin", ["Artuklu","Dargeçit","Derik","Kızıltepe","Mazıdağı","Midyat","Nusaybin","Ömerli","Savur","Yeşilli"]], // 47
  ["Muğla", ["Bodrum","Dalaman","Datça","Fethiye","Kavaklıdere","Köyceğiz","Marmaris","Menteşe","Milas","Ortaca","Seydikemer","Ula","Yatağan"]], // 48
  ["Muş", ["Bulanık","Hasköy","Korkut","Malazgirt","Merkez","Varto"]], // 49
  ["Nevşehir", ["Acıgöl","Avanos","Derinkuyu","Gülşehir","Hacıbektaş","Kozaklı","Merkez","Ürgüp"]], // 50
  ["Niğde", ["Altunhisar","Bor","Çamardı","Çiftlik","Merkez","Ulukışla"]], // 51
  ["Ordu", ["Akkuş","Altınordu","Aybastı","Çamaş","Çatalpınar","Çaybaşı","Fatsa","Gölköy","Gülyalı","Gürgentepe","İkizce","Kabadüz","Kabataş","Korgan","Kumru","Mesudiye","Perşembe","Ulubey","Ünye"]], // 52
  ["Rize", ["Ardeşen","Çamlıhemşin","Çayeli","Derepazarı","Fındıklı","Güneysu","Hemşin","İkizdere","İyidere","Kalkandere","Merkez","Pazar"]], // 53
  ["Sakarya", ["Adapazarı","Akyazı","Arifiye","Erenler","Ferizli","Geyve","Hendek","Karapürçek","Karasu","Kaynarca","Kocaali","Pamukova","Sapanca","Serdivan","Söğütlü","Taraklı"]], // 54
  ["Samsun", ["19 Mayıs","Alaçam","Asarcık","Atakum","Ayvacık","Bafra","Canik","Çarşamba","Havza","İlkadım","Kavak","Ladik","Salıpazarı","Tekkeköy","Terme","Vezirköprü","Yakakent"]], // 55
  ["Siirt", ["Baykan","Eruh","Kurtalan","Merkez","Pervari","Şirvan","Tillo"]], // 56
  ["Sinop", ["Ayancık","Boyabat","Dikmen","Durağan","Erfelek","Gerze","Merkez","Saraydüzü","Türkeli"]], // 57
  ["Sivas", ["Akıncılar","Altınyayla","Divriği","Doğanşar","Gemerek","Gölova","Gürün","Hafik","İmranlı","Kangal","Koyulhisar","Merkez","Suşehri","Şarkışla","Ulaş","Yıldızeli","Zara"]], // 58
  ["Tekirdağ", ["Çerkezköy","Çorlu","Ergene","Hayrabolu","Kapaklı","Malkara","Marmaraereğlisi","Muratlı","Saray","Süleymanpaşa","Şarköy"]], // 59
  ["Tokat", ["Almus","Artova","Başçiftlik","Erbaa","Merkez","Niksar","Pazar","Reşadiye","Sulusaray","Turhal","Yeşilyurt","Zile"]], // 60
  ["Trabzon", ["Akçaabat","Araklı","Arsin","Beşikdüzü","Çarşıbaşı","Çaykara","Dernekpazarı","Düzköy","Hayrat","Köprübaşı","Maçka","Of","Ortahisar","Sürmene","Şalpazarı","Tonya","Vakfıkebir","Yomra"]], // 61
  ["Tunceli", ["Çemişgezek","Hozat","Mazgirt","Merkez","Nazımiye","Ovacık","Pertek","Pülümür"]], // 62
  ["Şanlıurfa", ["Akçakale","Birecik","Bozova","Ceylanpınar","Eyyübiye","Halfeti","Haliliye","Harran","Hilvan","Karaköprü","Siverek","Suruç","Viranşehir"]], // 63
  ["Uşak", ["Banaz","Eşme","Karahallı","Merkez","Sivaslı","Ulubey"]], // 64
  ["Van", ["Bahçesaray","Başkale","Çaldıran","Çatak","Edremit","Erciş","Gevaş","Gürpınar","İpekyolu","Muradiye","Özalp","Saray","Tuşba"]], // 65
  ["Yozgat", ["Akdağmadeni","Aydıncık","Boğazlıyan","Çandır","Çayıralan","Çekerek","Kadışehri","Merkez","Saraykent","Sarıkaya","Sorgun","Şefaatli","Yenifakılı","Yerköy"]], // 66
  ["Zonguldak", ["Alaplı","Çaycuma","Devrek","Ereğli","Gökçebey","Kilimli","Kozlu","Merkez"]], // 67
  ["Aksaray", ["Ağaçören","Eskil","Gülağaç","Güzelyurt","Merkez","Ortaköy","Sarıyahşi","Sultanhanı"]], // 68
  ["Bayburt", ["Aydıntepe","Demirözü","Merkez"]], // 69
  ["Karaman", ["Ayrancı","Başyayla","Ermenek","Kazımkarabekir","Merkez","Sarıveliler"]], // 70
  ["Kırıkkale", ["Bahşılı","Balışeyh","Çelebi","Delice","Karakeçili","Keskin","Merkez","Sulakyurt","Yahşihan"]], // 71
  ["Batman", ["Beşiri","Gercüş","Hasankeyf","Kozluk","Merkez","Sason"]], // 72
  ["Şırnak", ["Beytüşşebap","Cizre","Güçlükonak","İdil","Merkez","Silopi","Uludere"]], // 73
  ["Bartın", ["Amasra","Kurucaşile","Merkez","Ulus"]], // 74
  ["Ardahan", ["Çıldır","Damal","Göle","Hanak","Merkez","Posof"]], // 75
  ["Iğdır", ["Aralık","Karakoyunlu","Merkez","Tuzluca"]], // 76
  ["Yalova", ["Altınova","Armutlu","Çınarcık","Çiftlikköy","Merkez","Termal"]], // 77
  ["Karabük", ["Eflani","Eskipazar","Merkez","Ovacık","Safranbolu","Yenice"]], // 78
  ["Kilis", ["Elbeyli","Merkez","Musabeyli","Polateli"]], // 79
  ["Osmaniye", ["Bahçe","Düziçi","Hasanbeyli","Kadirli","Merkez","Sumbas","Toprakkale"]], // 80
  ["Düzce", ["Akçakoca","Cumayeri","Çilimli","Gölyaka","Gümüşova","Kaynaşlı","Merkez","Yığılca"]], // 81
] as const;

export type Province = (typeof data)[number][0];
export const provinces: readonly Province[] = data.map(([name]) => name);

export const provinceOptions = [...provinces].sort(new Intl.Collator("tr-TR").compare);

// Folds case, accents and ı/i: "IGDIR" → "igdir".
const fold = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ı", "i").replace(/[^a-z]/g, "");
// Only list names (provinces, districts, countries) are cached; user input never is.
const foldedNames = new Map<string, string>();
const foldName = (name: string) => foldedNames.get(name) ?? foldedNames.set(name, fold(name)).get(name)!;
let lastQuery = { raw: "", folded: "" };
/** Picker search: `name` must come from a fixed list. */
export function matchesTurkish(name: string, query: string) {
  if (lastQuery.raw !== query) lastQuery = { raw: query, folded: fold(query) };
  return foldName(name).includes(lastQuery.folded);
}
const aliases: Record<string, Province> = { icel: "Mersin", afyon: "Afyonkarahisar", maras: "Kahramanmaraş", kmaras: "Kahramanmaraş", urfa: "Şanlıurfa", antep: "Gaziantep" };
const byFolded = new Map<string, Province>([...provinces.map(name => [fold(name), name] as const), ...Object.entries(aliases)]);

/** The canonical province for free text (e.g. a Shopier city), or null. */
export function matchProvince(value: string | null | undefined): Province | null {
  return value ? byFolded.get(fold(value)) ?? null : null;
}

export function plateCode(province: Province): string {
  return String(provinces.indexOf(province) + 1).padStart(2, "0");
}

export function districtsOf(province: Province): readonly string[] {
  return data[provinces.indexOf(province)]?.[1] ?? [];
}

/** The canonical district for free text, or null; the province name matches its "Merkez". */
export function matchDistrict(province: Province, value: string | null | undefined): string | null {
  if (!value) return null;
  const folded = fold(value);
  const districts = districtsOf(province);
  return districts.find(name => foldName(name) === folded)
    ?? (folded === foldName(province) || folded === `${foldName(province)}merkez` ? districts.find(name => name === "Merkez") ?? null : null);
}
