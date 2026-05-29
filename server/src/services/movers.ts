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
  stocks: MoverStock[]; // sorted by return1M desc
}

export interface MoversResult {
  totalRallied: number;
  midcapRallied: number;
  smallcapRallied: number;
  sectors: SectorGroup[]; // sorted by avgReturn desc
  generatedAt: string;
}

// ── Stock universe ────────────────────────────────────────────────────────────
// NSE tradingsymbol · sector label · cap type
// Tokens resolved dynamically — wrong/delisted symbols silently produce no data

interface StockDef {
  symbol: string;
  name: string;
  sector: string;
  cap: "MIDCAP" | "SMALLCAP";
}

const UNIVERSE: StockDef[] = [
  // ── IT / Technology ──
  { symbol: "MPHASIS",     name: "MPHASIS",      sector: "IT",           cap: "MIDCAP"   },
  { symbol: "PERSISTENT",  name: "PERSISTENT",   sector: "IT",           cap: "MIDCAP"   },
  { symbol: "COFORGE",     name: "COFORGE",      sector: "IT",           cap: "MIDCAP"   },
  { symbol: "LTTS",        name: "L&T TECH",     sector: "IT",           cap: "MIDCAP"   },
  { symbol: "KPITTECH",    name: "KPIT TECH",    sector: "IT",           cap: "MIDCAP"   },
  { symbol: "TATAELXSI",   name: "TATA ELXSI",   sector: "IT",           cap: "MIDCAP"   },
  { symbol: "NEWGEN",      name: "NEWGEN SOFT",  sector: "IT",           cap: "SMALLCAP" },
  { symbol: "LATENTVIEW",  name: "LATENTVIEW",   sector: "IT",           cap: "SMALLCAP" },
  { symbol: "RATEGAIN",    name: "RATEGAIN",     sector: "IT",           cap: "SMALLCAP" },
  { symbol: "INTELLECT",   name: "INTELLECT",    sector: "IT",           cap: "SMALLCAP" },
  { symbol: "NETWEB",      name: "NETWEB TECH",  sector: "IT",           cap: "SMALLCAP" },

  // ── Banking & Finance ──
  { symbol: "FEDERALBNK",  name: "FEDERAL BANK", sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "IDFCFIRSTB",  name: "IDFC FIRST",   sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "BANDHANBNK",  name: "BANDHAN BNK",  sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "AUBANK",      name: "AU BANK",       sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "RBLBANK",     name: "RBL BANK",      sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "PNB",         name: "PNB",           sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "CANBK",       name: "CANARA BANK",   sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "BANKBARODA",  name: "BANK OF BARO",  sector: "BANKING",      cap: "MIDCAP"   },
  { symbol: "UJJIVANSFB",  name: "UJJIVAN SFB",   sector: "BANKING",      cap: "SMALLCAP" },
  { symbol: "EQUITASBNK",  name: "EQUITAS BNK",   sector: "BANKING",      cap: "SMALLCAP" },

  // ── NBFC & Financials ──
  { symbol: "MUTHOOTFIN",  name: "MUTHOOT FIN",   sector: "NBFC",         cap: "MIDCAP"   },
  { symbol: "CHOLAFIN",    name: "CHOLA FIN",      sector: "NBFC",         cap: "MIDCAP"   },
  { symbol: "MANAPPURAM",  name: "MANAPPURAM",     sector: "NBFC",         cap: "MIDCAP"   },
  { symbol: "M&MFIN",      name: "M&M FIN",        sector: "NBFC",         cap: "MIDCAP"   },
  { symbol: "SUNDARMFIN",  name: "SUNDARAM FIN",   sector: "NBFC",         cap: "MIDCAP"   },
  { symbol: "IIFL",        name: "IIFL FIN",       sector: "NBFC",         cap: "MIDCAP"   },
  { symbol: "ANGELONE",    name: "ANGEL ONE",       sector: "NBFC",         cap: "MIDCAP"   },

  // ── Pharma & Healthcare ──
  { symbol: "ALKEM",       name: "ALKEM LAB",      sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "TORNTPHARM",  name: "TORRENT PHARM",  sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "AJANTPHARM",  name: "AJANTA PHARM",   sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "NATCO",       name: "NATCO PHARMA",   sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "GRANULES",    name: "GRANULES",        sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "IPCALAB",     name: "IPCA LAB",        sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "ERIS",        name: "ERIS LIFESC",     sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "STRIDES",     name: "STRIDES PHARMA",  sector: "PHARMA",       cap: "MIDCAP"   },
  { symbol: "METROPOLIS",  name: "METROPOLIS",      sector: "PHARMA",       cap: "MIDCAP"   },

  // ── Automobiles & Auto Ancillary ──
  { symbol: "BALKRISIND",  name: "BALKRISHNA IND", sector: "AUTO",         cap: "MIDCAP"   },
  { symbol: "CEATLTD",     name: "CEAT",            sector: "AUTO",         cap: "MIDCAP"   },
  { symbol: "SONACOMS",    name: "SONA BLW",        sector: "AUTO",         cap: "MIDCAP"   },
  { symbol: "CRAFTSMAN",   name: "CRAFTSMAN AUTO",  sector: "AUTO",         cap: "MIDCAP"   },
  { symbol: "MOTHERSON",   name: "MOTHERSON",       sector: "AUTO",         cap: "MIDCAP"   },
  { symbol: "MINDA",       name: "MINDA CORP",      sector: "AUTO",         cap: "MIDCAP"   },
  { symbol: "SUPRAJIT",    name: "SUPRAJIT ENG",    sector: "AUTO",         cap: "SMALLCAP" },
  { symbol: "ENDURANCE",   name: "ENDURANCE TECH",  sector: "AUTO",         cap: "MIDCAP"   },

  // ── Specialty Chemicals ──
  { symbol: "AARTI",       name: "AARTI IND",       sector: "CHEMICALS",    cap: "MIDCAP"   },
  { symbol: "VINATI",      name: "VINATI ORG",      sector: "CHEMICALS",    cap: "MIDCAP"   },
  { symbol: "ATUL",        name: "ATUL LTD",         sector: "CHEMICALS",    cap: "MIDCAP"   },
  { symbol: "FINEORG",     name: "FINE ORGANIC",     sector: "CHEMICALS",    cap: "MIDCAP"   },
  { symbol: "NOCIL",       name: "NOCIL",            sector: "CHEMICALS",    cap: "MIDCAP"   },
  { symbol: "GALAXYSURF",  name: "GALAXY SURF",      sector: "CHEMICALS",    cap: "MIDCAP"   },
  { symbol: "TATACHEM",    name: "TATA CHEM",        sector: "CHEMICALS",    cap: "MIDCAP"   },
  { symbol: "JUBILANT",    name: "JUBILANT INGR",    sector: "CHEMICALS",    cap: "SMALLCAP" },

  // ── Capital Goods & Engineering ──
  { symbol: "AIAENG",      name: "AIA ENGINEERING",  sector: "CAPITAL GOODS", cap: "MIDCAP"  },
  { symbol: "CGPOWER",     name: "CG POWER",          sector: "CAPITAL GOODS", cap: "MIDCAP"  },
  { symbol: "GRINDWELL",   name: "GRINDWELL NOR",     sector: "CAPITAL GOODS", cap: "MIDCAP"  },
  { symbol: "ELGIEQUIP",   name: "ELGI EQUIPMENTS",   sector: "CAPITAL GOODS", cap: "MIDCAP"  },
  { symbol: "KECL",        name: "KEC INTL",           sector: "CAPITAL GOODS", cap: "MIDCAP"  },
  { symbol: "BHEL",        name: "BHEL",               sector: "CAPITAL GOODS", cap: "MIDCAP"  },
  { symbol: "APAR",        name: "APAR INDS",          sector: "CAPITAL GOODS", cap: "MIDCAP"  },
  { symbol: "HITACHIENERGY", name: "HITACHI ENERGY",  sector: "CAPITAL GOODS", cap: "MIDCAP"  },

  // ── Power & Utilities ──
  { symbol: "TORNTPOWER",  name: "TORRENT POWER",    sector: "POWER",        cap: "MIDCAP"   },
  { symbol: "CESC",        name: "CESC",              sector: "POWER",        cap: "MIDCAP"   },
  { symbol: "IREDA",       name: "IREDA",             sector: "POWER",        cap: "MIDCAP"   },
  { symbol: "NHPC",        name: "NHPC",              sector: "POWER",        cap: "MIDCAP"   },
  { symbol: "JPPOWER",     name: "JAIPRAKASH PWR",   sector: "POWER",        cap: "SMALLCAP" },
  { symbol: "RPOWER",      name: "RELIANCE POWER",   sector: "POWER",        cap: "SMALLCAP" },

  // ── Railways ──
  { symbol: "RVNL",        name: "RVNL",              sector: "RAILWAYS",     cap: "MIDCAP"   },
  { symbol: "IRCON",       name: "IRCON",             sector: "RAILWAYS",     cap: "MIDCAP"   },
  { symbol: "IRFC",        name: "IRFC",              sector: "RAILWAYS",     cap: "MIDCAP"   },
  { symbol: "RAILTEL",     name: "RAILTEL",           sector: "RAILWAYS",     cap: "MIDCAP"   },
  { symbol: "TITAGARH",    name: "TITAGARH RAIL",    sector: "RAILWAYS",     cap: "SMALLCAP" },
  { symbol: "JUPITERWAG",  name: "JUPITER WAG",      sector: "RAILWAYS",     cap: "SMALLCAP" },
  { symbol: "TEXRAIL",     name: "TEXMACO RAIL",     sector: "RAILWAYS",     cap: "SMALLCAP" },

  // ── Defence ──
  { symbol: "MTAR",        name: "MTAR TECH",        sector: "DEFENCE",      cap: "SMALLCAP" },
  { symbol: "DATAPATTNS",  name: "DATA PATTERNS",    sector: "DEFENCE",      cap: "SMALLCAP" },
  { symbol: "PARASDEFENC", name: "PARAS DEFENCE",    sector: "DEFENCE",      cap: "SMALLCAP" },
  { symbol: "ZENTEC",      name: "ZEN TECH",          sector: "DEFENCE",      cap: "SMALLCAP" },
  { symbol: "COCHINSHIP",  name: "COCHIN SHIP",      sector: "DEFENCE",      cap: "SMALLCAP" },
  { symbol: "BEML",        name: "BEML",              sector: "DEFENCE",      cap: "MIDCAP"   },
  { symbol: "IDEAFORGE",   name: "IDEAFORGE",        sector: "DEFENCE",      cap: "SMALLCAP" },

  // ── Optical Fibre / Telecom Infra ──
  { symbol: "STLTECH",     name: "STERLITE TECH",   sector: "TELECOM INFRA", cap: "MIDCAP"   },
  { symbol: "HFCL",        name: "HFCL",             sector: "TELECOM INFRA", cap: "SMALLCAP" },
  { symbol: "VINDHYATELE", name: "VINDHYA TEL",      sector: "TELECOM INFRA", cap: "SMALLCAP" },
  { symbol: "TEJAS",       name: "TEJAS NETWORKS",   sector: "TELECOM INFRA", cap: "SMALLCAP" },

  // ── Solar & Renewable ──
  { symbol: "WAAREEENER",  name: "WAAREE",           sector: "SOLAR",        cap: "MIDCAP"   },
  { symbol: "PREMIERENE",  name: "PREMIER ENERGY",  sector: "SOLAR",        cap: "SMALLCAP" },
  { symbol: "BOROSLRENE",  name: "BOROSIL REN",     sector: "SOLAR",        cap: "SMALLCAP" },
  { symbol: "WEBSOL",      name: "WEBSOL ENERGY",   sector: "SOLAR",        cap: "SMALLCAP" },
  { symbol: "GOLDENKA",    name: "GOLDEN KARSHANBHAI", sector: "SOLAR",     cap: "SMALLCAP" },

  // ── EMS / Electronics Manufacturing ──
  { symbol: "KAYNES",      name: "KAYNES TECH",     sector: "EMS",          cap: "MIDCAP"   },
  { symbol: "SYRMA",       name: "SYRMA SGS",       sector: "EMS",          cap: "SMALLCAP" },
  { symbol: "PGEL",        name: "PG ELECTROPLAST", sector: "EMS",          cap: "SMALLCAP" },
  { symbol: "AMBER",       name: "AMBER ENT",        sector: "EMS",          cap: "MIDCAP"   },
  { symbol: "DIXON",       name: "DIXON TECH",       sector: "EMS",          cap: "MIDCAP"   },

  // ── Real Estate ──
  { symbol: "SOBHA",       name: "SOBHA",            sector: "REALTY",       cap: "MIDCAP"   },
  { symbol: "KOLTEPATIL",  name: "KOLTE PATIL",     sector: "REALTY",       cap: "SMALLCAP" },
  { symbol: "BRIGADE",     name: "BRIGADE ENT",     sector: "REALTY",       cap: "MIDCAP"   },
  { symbol: "PHOENIXLTD",  name: "PHOENIX MILLS",   sector: "REALTY",       cap: "MIDCAP"   },
  { symbol: "ARVIND",      name: "ARVIND",           sector: "REALTY",       cap: "MIDCAP"   },

  // ── FMCG / Consumer ──
  { symbol: "GODREJCP",    name: "GODREJ CP",        sector: "FMCG",         cap: "MIDCAP"   },
  { symbol: "VBLLTD",      name: "VARUN BEV",        sector: "FMCG",         cap: "MIDCAP"   },
  { symbol: "RADICO",      name: "RADICO KHAITAN",  sector: "FMCG",         cap: "MIDCAP"   },
  { symbol: "JUBLFOOD",    name: "JUBILANT FOOD",   sector: "FMCG",         cap: "MIDCAP"   },
  { symbol: "DEVYANI",     name: "DEVYANI INTL",    sector: "FMCG",         cap: "MIDCAP"   },

  // ── Metals & Mining ──
  { symbol: "NATIONALUM",  name: "NATIONAL ALU",    sector: "METALS",       cap: "MIDCAP"   },
  { symbol: "APLAPOLLO",   name: "APL APOLLO",      sector: "METALS",       cap: "MIDCAP"   },
  { symbol: "RATNAMANI",   name: "RATNAMANI MET",   sector: "METALS",       cap: "MIDCAP"   },
  { symbol: "WELSPUNIND",  name: "WELSPUN INDIA",   sector: "METALS",       cap: "MIDCAP"   },
  { symbol: "JINDALSAW",   name: "JINDAL SAW",      sector: "METALS",       cap: "MIDCAP"   },

  // ── Hospitality & Travel ──
  { symbol: "LEMONTREE",   name: "LEMON TREE",      sector: "HOSPITALITY",  cap: "MIDCAP"   },
  { symbol: "MAHINDHOLIDAY", name: "MAHINDRA HOL",  sector: "HOSPITALITY",  cap: "MIDCAP"   },
  { symbol: "EIHOTEL",     name: "EIH LTD",          sector: "HOSPITALITY",  cap: "MIDCAP"   },
  { symbol: "SAPPHIRE",    name: "SAPPHIRE FOODS",  sector: "HOSPITALITY",  cap: "MIDCAP"   },

  // ── Agri & Inputs ──
  { symbol: "DHANUKA",     name: "DHANUKA",          sector: "AGRI",         cap: "SMALLCAP" },
  { symbol: "RALLIS",      name: "RALLIS INDIA",     sector: "AGRI",         cap: "MIDCAP"   },
  { symbol: "SUMICHEM",    name: "SUMITOMO CHEM",   sector: "AGRI",         cap: "SMALLCAP" },
  { symbol: "BAYER",       name: "BAYER CROP",       sector: "AGRI",         cap: "MIDCAP"   },

  // ── Retail & New-age Consumer ──
  { symbol: "NYKAA",       name: "NYKAA",            sector: "RETAIL",       cap: "MIDCAP"   },
  { symbol: "CAMPUS",      name: "CAMPUS ACTIV",    sector: "RETAIL",       cap: "SMALLCAP" },
  { symbol: "VEDANT",      name: "VEDANT FASHION",  sector: "RETAIL",       cap: "MIDCAP"   },

  // ── Textiles ──
  { symbol: "KPRMILL",     name: "KPR MILL",         sector: "TEXTILES",     cap: "MIDCAP"   },
  { symbol: "RAYMOND",     name: "RAYMOND",          sector: "TEXTILES",     cap: "MIDCAP"   },
  { symbol: "VARDHACRLC",  name: "VARDHMAN TEXT",   sector: "TEXTILES",     cap: "MIDCAP"   },

  // ── Media & Entertainment ──
  { symbol: "PVRINOX",     name: "PVR INOX",         sector: "MEDIA",        cap: "MIDCAP"   },
  { symbol: "ZEEL",        name: "ZEE ENT",           sector: "MEDIA",        cap: "MIDCAP"   },
];

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

// ── Token resolution ──────────────────────────────────────────────────────────

let symbolTokenCache: { map: Map<string, number>; at: number } | null = null;

async function resolveTokens(symbols: string[]): Promise<Map<string, number>> {
  if (!symbolTokenCache || Date.now() - symbolTokenCache.at > 60 * 60_000) {
    const instruments: any[] = await kiteService.getInstruments("NSE");
    const map = new Map<string, number>();
    for (const inst of instruments) {
      if (inst.tradingsymbol && inst.instrument_token) {
        map.set(inst.tradingsymbol as string, inst.instrument_token as number);
      }
    }
    symbolTokenCache = { map, at: Date.now() };
  }
  const result = new Map<string, number>();
  for (const sym of symbols) {
    const tok = symbolTokenCache.map.get(sym);
    if (tok) result.set(sym, tok);
  }
  return result;
}

// ── 1-month return fetch ──────────────────────────────────────────────────────

async function fetch1MReturn(token: number): Promise<{ return1M: number; ltp: number } | null> {
  const to = new Date();
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
const CACHE_TTL = 30 * 60_000; // 30 min

export async function computeMovers(minReturn = 3): Promise<MoversResult> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.result;

  const symbols  = UNIVERSE.map((s) => s.symbol);
  const tokenMap = await resolveTokens(symbols);

  // Fetch 1M returns for all resolved stocks (concurrency-limited)
  const resolvedStocks = UNIVERSE.filter((s) => tokenMap.has(s.symbol));
  const returns = await batchFetch(
    resolvedStocks,
    async (s) => {
      const d = await fetch1MReturn(tokenMap.get(s.symbol)!);
      if (!d) return null;
      return { ...s, return1M: Math.round(d.return1M * 100) / 100, ltp: d.ltp };
    },
    15 // 15 concurrent requests
  );

  // Filter for stocks that have rallied above minReturn threshold
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
    const sorted = stocks.sort((a, b) => b.return1M - a.return1M);
    const avgReturn = sorted.reduce((s, r) => s + r.return1M, 0) / sorted.length;
    sectors.push({
      sector,
      avgReturn: Math.round(avgReturn * 100) / 100,
      count: sorted.length,
      stocks: sorted,
    });
  }

  // Sort sectors by avgReturn descending
  sectors.sort((a, b) => b.avgReturn - a.avgReturn);

  const result: MoversResult = {
    totalRallied: rallied.length,
    midcapRallied:  rallied.filter((s) => s.cap === "MIDCAP").length,
    smallcapRallied: rallied.filter((s) => s.cap === "SMALLCAP").length,
    sectors,
    generatedAt: new Date().toISOString(),
  };

  cache = { result, at: Date.now() };
  return result;
}
