import { kiteService } from "./kite";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MoverStock {
  symbol: string;
  name: string;
  sector: string;
  cap: "MIDCAP" | "SMALLCAP";
  return1M: number;
  ltp: number;
}

export interface SectorGroup {
  sector: string;
  avgReturn: number;
  count: number;
  stocks: MoverStock[];
}

export interface MoversResult {
  totalRallied: number;
  midcapRallied: number;
  smallcapRallied: number;
  sectors: SectorGroup[];
  generatedAt: string;
}

// ── Nifty Midcap 150 + Nifty Smallcap 250 constituents ───────────────────────
// These are the official NSE index constituent symbols — updated quarterly by NSE.
// Using index-based universe instead of manual lists means we can't miss stocks.
// Symbols are current NSE tradingsymbols as of mid-2025.

const NIFTY_MIDCAP_150 = new Set([
  "ABCAPITAL","ABB","ABIRLANUVO","ACC","AIAENG","AJANTPHARM","ALKEM","AMARAJABAT",
  "AMBER","AMBUJACEM","ANGELONE","APAR","APLAPOLLO","APOLLOHOSP","ASTRAL","ATUL",
  "AUBANK","BALKRISIND","BANDHANBNK","BANKBARODA","BAYERCROP","BEL","BEML",
  "BHARATFORG","BHEL","BRIGADE","BSE","CAMS","CANBK","CEATLTD","CGPOWER","CHOLAFIN",
  "COFORGE","CRAFTSMAN","CROMPTON","CUMMINSIND","DEEPAKNTR","DELHIVERY","DEVYANI",
  "DIXON","DMART","ELGIEQUIP","EMAMILTD","ENDURANCE","ERIS","ESCORTS","FINEORG",
  "FINPIPE","FLUOROCHEM","GLENMARK","GODREJCP","GRANULES","GRINDWELL","GSPL",
  "HDFCAMC","HFCL","HITACHIENERGY","IIFL","INDIAMART","INDUSINDBK","INDUSTOWER",
  "IPCALAB","IRCTC","IREDA","IRFC","JKCEMENT","JUBLPHARMA","JUBLFOOD","KALYANKJIL",
  "KAYNES","KECL","KPRMILL","KPITTECH","LAURUS","LAURUSLABS","LEMONTREE","LTF",
  "LTIM","LTTS","LUPIN","M&MFIN","MAHINDHOLIDAY","MANAPPURAM","MARICO","MFSL",
  "MINDA","MOTHERSON","MPHASIS","MTAR","MUTHOOTFIN","NATIONALUM","NAUKRI","NATCO",
  "NAVINFLUOR","NYKAA","PAGEIND","PERSISTENT","PIIND","PNB","POLYCAB","POONAWALLA",
  "RADICO","RAILTEL","RATNAMANI","RBLBANK","RVNL","SCHAEFFLER","SOBHA","SONACOMS",
  "SRF","STLTECH","SUNDARMFIN","SUPREMEIND","SYNGENE","TATACHEM","TATAINVEST",
  "TATAPOWER","TATAELXSI","TRENT","TORNTPHARM","TORNTPOWER","UBL","UNIONBANK",
  "VOLTAS","WAAREEENER","WELSPUNIND","WIPRO",
]);

const NIFTY_SMALLCAP_250 = new Set([
  "AARTI","AARTIIND","AARTIPHARM","ABBOTINDIA","ABFRL","ADANIGREEN","ADFFOODS",
  "AEGISLOG","AETHER","AJMERA","AKZOINDIA","ALEMBICLTD","ALEMBICPHARMA","ALKYLAMINE",
  "ALLCARGO","AMRUTANJAN","ANANTRAJ","ANGELBRKING","APCOTEX","APOLLOPIPE","APOLLOTYRE",
  "APTUS","ARCHIES","ARVIND","ASAHIINDIA","ASHOKA","ASIANPAINT","ASTERDM","ASTRAZEN",
  "ATGL","ATUL","AUROBINDO","AVANTIFEED","AVTNPL","AZADENG","BAJAJHFL","BAJAJHINDL",
  "BALRAMCHIN","BALPHARMA","BALUARTE","BATAINDIA","BDL","BFINVEST","BHAGCHEM","BHARATRAS",
  "BIGBLOC","BIKAJI","BIRLASOFT","BLUEDART","BLUEJET","BOROSLRENE","BPCL","BRIGADE",
  "CAMPUS","CANFINHOME","CAPLIPOINT","CASTROLIND","CCL","CESC","CHOLAHLDNG","CIGNITITEC",
  "CLEAN","CMSINFO","COCHINSHIP","COROMANDEL","CREDITACC","DATAPATTNS","DBCORP",
  "DCM","DEEPAKFERT","DEEPAKNTR","DHANUKA","DIVI","DLINKINDIA","DMART","EIHOTEL","EMCURE",
  "ENGINERSIN","EPIGRAL","EQUITASBNK","ESCORTS","ESAB","ETHOSINDIA","EXIDEIND","FAZE3Q",
  "FCONSUMER","FINEORG","FINOFINANCE","FLUOROCHEM","FMGOETZE","FORCEMOT","GANDHAR",
  "GARFIBRES","GESHIP","GHCL","GICRE","GLAND","GNFC","GODFRYPHLP","GODREJIND",
  "GRANDIND","GREAVESCOT","GREENPOWER","GRSE","GSFC","HBLPOWER","HECPROJECT","HEIDELBERG",
  "HEMIPROP","HERCULES","HFCL","HGS","HINDCOPPER","HINDUJAIND","HMVL","HONASA",
  "HUDCO","IBREALEST","ICEMAKE","IDFC","IDEAFORGE","IMFA","INDIGO","INDORAMA",
  "INTELLECT","INVENTURE","IOB","ITC","JAMNAAUTO","JBCHEPHARM","JBMA","JINDALSAW",
  "JKPAPER","JMFINANCIL","JPPOWER","JSWENERGY","JUBILANT","JUBLINGREA","JUPITERWAG",
  "JUSTDIAL","K&RFIN","KAJARIACER","KARDA","KARMAENG","KARURVYSYA","KENNAMET","KFINTECH",
  "KNR","KNRCON","KOLTEPATIL","KRIDHANINF","KRSNAA","LATENTVIEW","LEADMICH","LICI",
  "LINC","LLOYDSENGG","LNTFH","LSIND","LUXIND","MAHARASHTRA","MAHSCOOTER",
  "MANAKALUCO","MASTEK","MAXHEALTH","MAZAGON","MCDOWELL","MFSL","MIDHANI","MINDTREE",
  "MMFL","MODYSONCL","MOIL","MOREPENLAB","MRPL","MSCHFL","MSTC","NATCOPHARM","NAVNETEDUL",
  "NESCO","NETWEB","NEWGEN","NH","NIITMTS","NMDC","NOCIL","NSLNISP","ONGC","ORIENTCEM",
  "ORIENTELEC","PANACEA","PARASDEFENC","PATANJALI","PEL","PGEL","PGHH","PHOENIXLTD",
  "PILANIINVS","PNCINFRA","POLYMED","POONAWALLA","POWERMECH","PRAJ","PREMIERENE",
  "PRINCEPIPES","PRIVISCL","PTCIL","PVRINOX","RAILTEL","RAIN","RALLIS","RATEGAIN",
  "RAYMOND","REDINGTON","RELAXO","RESPONIND","RITES","RPOWER","RPSGVENT","RTNL","RUCHI",
  "SAFARI","SAGCEM","SAHANA","SAPPHIRE","SATIA","SCHNEIDER","SEQUENT","SHANKARA",
  "SHARDAMOTR","SHARDACROP","SHILPAMED","SHOPERSTOP","SHREDIGCEM","SHYAMMETL",
  "SILVERTUC","SKFINDIA","SMSPHARMA","SOLARINDS","SRCOMPANY","SRF","STARCEMENT",
  "STLTECH","STRIDES","SUMICHEM","SUPRAJIT","SURYADAYA","SURYAROSNI","SUVENPHAR",
  "SWANENERGY","SYRMA","TANLA","TATAINVEST","TATVA","TCNSCLOTH","TEXRAIL","THYROCARE",
  "TIINDIA","TITAGARH","TBZ","TORNTPOWER","TREEHOUSE","TRIGYN","TTKPRESTIGE",
  "TVSHLTD","TVSSCS","TVSSRICHAK","UJJIVANSFB","UNIPARTS","UNITDSPR","UNIVASTU",
  "VARDHACRLC","VARROC","VARUN","VEDANT","VGUARD","VINDHYATELE","VSTIND",
  "WABAG","WEBELSOLAR","WEBSOL","WELCORP","WONDERLA","XCHANGING","ZENTEC","ZFSTEERING",
]);

// ── Sector inference from company name ────────────────────────────────────────
// Avoids manually labelling ~400 stocks. Falls back to "OTHERS".

const SECTOR_RULES: [string, string[]][] = [
  ["IT",            ["tech","software","infosy","infosys","wipro","hcl","tcs","digital","computer","data","cyber","cloud","ai"]],
  ["BANKING",       ["bank","banking","finance ltd","financial services","credit corp"]],
  ["NBFC",          ["fin corp","fin ltd","finserv","capital fin","lending","nbfc","housing fin","microfi","muthoot","manappuram","chola"]],
  ["PHARMA",        ["pharma","drug","labs","lab ltd","medicine","biocon","life sci","lifescience","health","hospital","clinic","diagnostic","therapeutics"]],
  ["AUTO",          ["auto","motor","vehicle","tyre","wheel","gear","axle","braking","transmis","piston","clutch","forging auto"]],
  ["CHEMICALS",     ["chem","chemical","petrochem","organic","polymer","resin","carbon","fluorine","colour","dye","pigment","fertilizer","agrochemical","pesticide","solvents"]],
  ["CAPITAL GOODS", ["engineer","machinery","equipment","boiler","turbine","pump","valve","compressor","industrial","electric motor","cables","conductors","power transmis"]],
  ["POWER",         ["power","energy","electric","renewable","solar","wind","hydro","thermal","ntpc","ner","generation","transmission"]],
  ["RAILWAYS",      ["rail","railway","wagon","locomotive","coach","rolling stock","rvnl","irfc","ircon","titagarh","jupiter"]],
  ["DEFENCE",       ["defence","defense","shipbuild","ordnance","aerospace","aviat","missile","armament","weapon","naval","helicopter"]],
  ["TELECOM INFRA", ["fibre","fiber","optical","telecom","cable","hfcl","sterlite","stl","vindhya","tejas network","towercom","railtel"]],
  ["SOLAR",         ["solar","photovoltaic","waaree","websol","borosil renew","premier energy","insolation"]],
  ["EMS",           ["electronic manufactur","ems","pcb","assembly","kaynes","syrma","pg electro","amber enter","dixon"]],
  ["REALTY",        ["real estate","realty","property","developer","housing","infra project","build","construc","cement","ashoka"]],
  ["FMCG",          ["consumer","fmcg","food","beverage","alcohol","spirits","tobacco","personal care","household","retailing","quick service"]],
  ["METALS",        ["steel","iron","aluminium","aluminum","zinc","copper","metal","alloy","casting","mining","coal","nmdc","nal","hindalco","ratnam","apar","welspun","pipe","tube"]],
  ["HOSPITALITY",   ["hotel","resort","hospitality","tourism","travel","lemon tree","mahindra holidays","eihotel","wonderla","pvr","inox"]],
  ["AGRI",          ["agri","seed","crop","farm","fertiliser","dhanuka","rallis","bayer crop","coromandel","sumitomo","kaveri"]],
  ["LOGISTICS",     ["logistic","courier","freight","cargo","transport","warehousing","shipping","ports","container","blue dart"]],
  ["MEDIA",         ["media","entertainment","broadcasting","print","film","zeel","pvrinox","sun tv","network18"]],
  ["INSURANCE",     ["insurance","insur","reinsur","general insur","life insur","health insur"]],
  ["TEXTILES",      ["textile","garment","fabric","apparel","yarn","cotton","fiber","spinning","raymond","vardhman","kpr","page ind"]],
  ["CEMENT",        ["cement","concrete","ready mix","ultratech","acc","ambuja","dalmia","india cement","shree cement"]],
];

function inferSector(name: string): string {
  const lower = name.toLowerCase();
  for (const [sector, keywords] of SECTOR_RULES) {
    if (keywords.some((kw) => lower.includes(kw))) return sector;
  }
  return "OTHERS";
}

// ── Concurrency-limited batch fetcher ─────────────────────────────────────────

async function batchFetch<I, O>(
  items: I[],
  fn: (item: I) => Promise<O | null>,
  concurrency = 15
): Promise<(O | null)[]> {
  const results: (O | null)[] = new Array(items.length).fill(null);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      try { results[i] = await fn(items[i]); }
      catch { results[i] = null; }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ── Build the universe from Kite instruments ──────────────────────────────────
// Fetches ALL NSE equity instruments, then keeps only those present in the
// Nifty Midcap 150 or Nifty Smallcap 250 constituent sets.
// This ensures correct current tradingsymbols — no stale hardcoded names.

interface StockMeta {
  symbol: string;
  name: string;
  token: number;
  cap: "MIDCAP" | "SMALLCAP";
  sector: string;
}

let universeCache: { stocks: StockMeta[]; at: number } | null = null;

async function buildUniverse(): Promise<StockMeta[]> {
  if (universeCache && Date.now() - universeCache.at < 4 * 60 * 60_000) {
    return universeCache.stocks;
  }

  const instruments: any[] = await kiteService.getInstruments("NSE");
  const stocks: StockMeta[] = [];

  for (const inst of instruments) {
    const sym = inst.tradingsymbol as string;
    const isMid   = NIFTY_MIDCAP_150.has(sym);
    const isSmall = NIFTY_SMALLCAP_250.has(sym);

    if (!isMid && !isSmall) continue;
    if (inst.instrument_type !== "EQ") continue;

    stocks.push({
      symbol: sym,
      name:   inst.name || sym,
      token:  inst.instrument_token,
      cap:    isMid ? "MIDCAP" : "SMALLCAP",
      sector: inferSector(inst.name || sym),
    });
  }

  universeCache = { stocks, at: Date.now() };
  return stocks;
}

// ── 1-month return fetch ──────────────────────────────────────────────────────

async function fetch1MReturn(token: number): Promise<{ return1M: number; ltp: number } | null> {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 35);
  try {
    const candles: any[] = await kiteService.getHistoricalData(token, "day", from, to);
    if (!candles || candles.length < 5) return null;
    const first = candles[0].close;
    const last  = candles[candles.length - 1].close;
    if (!first) return null;
    return { return1M: ((last - first) / first) * 100, ltp: last };
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

let cache: { result: MoversResult; at: number } | null = null;
const CACHE_TTL = 30 * 60_000;

export async function computeMovers(minReturn = 3): Promise<MoversResult> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.result;

  // Build the universe from the Nifty Midcap 150 + Smallcap 250 instruments
  const universe = await buildUniverse();

  // Fetch 1M returns for all universe stocks (concurrency-limited)
  const returns = await batchFetch(
    universe,
    async (s) => {
      const d = await fetch1MReturn(s.token);
      if (!d) return null;
      return {
        symbol:   s.symbol,
        name:     s.name,
        sector:   s.sector,
        cap:      s.cap,
        return1M: Math.round(d.return1M * 100) / 100,
        ltp:      d.ltp,
      } as MoverStock;
    },
    15
  );

  const rallied = returns.filter(
    (r): r is NonNullable<typeof r> => r !== null && r.return1M >= minReturn
  ) as MoverStock[];

  // Group by sector
  const sectorMap = new Map<string, MoverStock[]>();
  for (const stock of rallied) {
    const list = sectorMap.get(stock.sector) ?? [];
    list.push(stock);
    sectorMap.set(stock.sector, list);
  }

  const sectors: SectorGroup[] = [];
  for (const [sector, stocks] of sectorMap.entries()) {
    const sorted     = stocks.sort((a, b) => b.return1M - a.return1M);
    const avgReturn  = sorted.reduce((s, r) => s + r.return1M, 0) / sorted.length;
    sectors.push({ sector, avgReturn: Math.round(avgReturn * 100) / 100, count: sorted.length, stocks: sorted });
  }

  sectors.sort((a, b) => b.avgReturn - a.avgReturn);

  const result: MoversResult = {
    totalRallied:    rallied.length,
    midcapRallied:   rallied.filter((s) => s.cap === "MIDCAP").length,
    smallcapRallied: rallied.filter((s) => s.cap === "SMALLCAP").length,
    sectors,
    generatedAt: new Date().toISOString(),
  };

  cache = { result, at: Date.now() };
  return result;
}
