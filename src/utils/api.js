// ===== API MODULE =====
// Multi-proxy strategy + realistic GBM simulation fallback

window.API = (() => {
  const _cache = {};
  const CACHE_TTL = 5 * 60 * 1000;

  const BASE_PRICES = {
    'TCS.NS':3890,'INFY.NS':1820,'WIPRO.NS':520,'HCLTECH.NS':1680,
    'TECHM.NS':1540,'LTIM.NS':5450,'HDFCBANK.NS':1680,'ICICIBANK.NS':1250,
    'KOTAKBANK.NS':1740,'AXISBANK.NS':1090,'SBIN.NS':820,'BAJFINANCE.NS':7200,
    'RELIANCE.NS':2850,'ONGC.NS':280,'POWERGRID.NS':310,'NTPC.NS':370,
    'SUNPHARMA.NS':1820,'DRREDDY.NS':6300,'CIPLA.NS':1540,'DIVISLAB.NS':5800,
    'TATAMOTORS.NS':780,'MARUTI.NS':12400,'M&M.NS':2900,'BAJAJ-AUTO.NS':9200,
    'HINDUNILVR.NS':2400,'ITC.NS':450,'NESTLEIND.NS':2400,'BRITANNIA.NS':4900,
    '^NSEI':24000,'^NSEBANK':51000,'^CNXIT':38000,'^CNXPHARMA':21000,'INRUSD=X':83.5,'^VIX':13.5,
  };

  const VOL = {
    'TCS.NS':0.012,'INFY.NS':0.014,'WIPRO.NS':0.015,'HCLTECH.NS':0.013,
    'TECHM.NS':0.016,'LTIM.NS':0.015,'HDFCBANK.NS':0.012,'ICICIBANK.NS':0.013,
    'KOTAKBANK.NS':0.013,'AXISBANK.NS':0.014,'SBIN.NS':0.016,'BAJFINANCE.NS':0.018,
    'RELIANCE.NS':0.012,'ONGC.NS':0.017,'POWERGRID.NS':0.013,'NTPC.NS':0.014,
    'SUNPHARMA.NS':0.014,'DRREDDY.NS':0.015,'CIPLA.NS':0.014,'DIVISLAB.NS':0.016,
    'TATAMOTORS.NS':0.019,'MARUTI.NS':0.014,'M&M.NS':0.015,'BAJAJ-AUTO.NS':0.014,
    'HINDUNILVR.NS':0.011,'ITC.NS':0.012,'NESTLEIND.NS':0.012,'BRITANNIA.NS':0.013,
  };

  function makeRng(seed) {
    let s = seed | 0;
    return {
      rand() {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      randn() {
        const u = this.rand() + 1e-10, v = this.rand();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      }
    };
  }

  function generateCandles(symbol, days) {
    const base = BASE_PRICES[symbol] || 1000;
    const vol  = VOL[symbol] || 0.015;
    const seed = symbol.split('').reduce((a,c) => a + c.charCodeAt(0), 0) * 31337;
    const rng  = makeRng(seed);

    // Build trading calendar (skip weekends)
    const tradingDays = [];
    const end = new Date(); end.setHours(15,30,0,0);
    const start = new Date(end);
    start.setDate(start.getDate() - Math.ceil(days * 1.5));
    for (let d = new Date(start); d <= end && tradingDays.length < days; d.setDate(d.getDate()+1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) tradingDays.push(new Date(d));
    }

    let price = base * (0.82 + rng.rand() * 0.36);
    const raw = [];
    for (const date of tradingDays) {
      const ret   = 0.00015 + vol * rng.randn();
      const close = Math.max(price * Math.exp(ret), 0.1);
      const range = close * vol * (0.6 + rng.rand() * 1.6);
      const high  = Math.max(price, close) + range * (0.2 + rng.rand() * 0.8);
      const low   = Math.min(price, close) - range * (0.2 + rng.rand() * 0.8);
      const open  = price * (1 + (rng.rand() - 0.5) * vol * 0.6);
      const baseV = base < 500 ? 15e6 : base < 2000 ? 3e6 : base < 6000 ? 8e5 : 2e5;
      raw.push({
        time: date.getTime(),
        open: +open.toFixed(2), high: +high.toFixed(2),
        low: +Math.max(low, 0.1).toFixed(2), close: +close.toFixed(2),
        volume: Math.floor(baseV * (0.3 + rng.rand() * 1.8))
      });
      price = close;
    }
    // Blend final 30 candles toward known current price
    if (raw.length > 0) {
      const scale = base / raw[raw.length-1].close;
      const n = Math.min(30, raw.length);
      for (let i = raw.length - n; i < raw.length; i++) {
        const t = (i - (raw.length - n)) / n;
        const s = 1 + (scale - 1) * t;
        ['open','high','low','close'].forEach(k => { raw[i][k] = +(raw[i][k] * s).toFixed(2); });
      }
    }
    return raw;
  }

  function generateQuote(symbol) {
    const base = BASE_PRICES[symbol] || 1000;
    const vol  = VOL[symbol] || 0.015;
    const daySeed = Math.floor(Date.now() / 86400000);
    const rng = makeRng(symbol.split('').reduce((a,c)=>a+c.charCodeAt(0),0) + daySeed * 997);
    const changePct = (rng.rand() - 0.5) * 2 * vol * 100;
    const price = +(base * (1 + changePct/100)).toFixed(2);
    return {
      regularMarketPrice: price,
      regularMarketChange: +(price - base).toFixed(2),
      regularMarketChangePercent: +changePct.toFixed(2),
      regularMarketVolume: Math.floor((base<500?15e6:base<2000?3e6:base<6000?8e5:2e5)*(0.5+rng.rand())),
      fiftyTwoWeekHigh: +(base*1.35).toFixed(2),
      fiftyTwoWeekLow:  +(base*0.70).toFixed(2),
      marketCap: Math.floor(base*(base<1000?80e6:base<5000?40e6:20e6)),
    };
  }

  async function _tryLiveChart(symbol, range, interval) {
    const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    const urls = [
      yUrl,
      `https://corsproxy.io/?${encodeURIComponent(yUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yUrl)}`,
    ];
    for (const url of urls) {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 7000);
        const res = await fetch(url, { signal: ctrl.signal, mode: 'cors', credentials: 'omit' });
        if (!res.ok) continue;
        let json = await res.json().catch(() => null);
        if (!json) continue;
        if (typeof json.contents === 'string') { try { json = JSON.parse(json.contents); } catch { continue; } }
        const result = json?.chart?.result?.[0];
        if (!result?.timestamp?.length) continue;
        const ts = result.timestamp;
        const q  = result.indicators?.quote?.[0] || {};
        const adj = result.indicators?.adjclose?.[0]?.adjclose;
        const candles = ts.map((t,i) => ({
          time: t*1000, open: q.open?.[i], high: q.high?.[i],
          low: q.low?.[i], close: adj?.[i] ?? q.close?.[i], volume: q.volume?.[i]||0
        })).filter(c => c.open != null && c.close > 0);
        if (candles.length > 10) { console.log(`✅ Live: ${symbol}`); return candles; }
      } catch(_) {}
    }
    return null;
  }

  const P2D = {'1d':1,'5d':5,'1mo':30,'3mo':90,'6mo':180,'1y':365};

  async function getHistory(symbol, period='3mo', interval='1d') {
    const key = `h_${symbol}_${period}`;
    const hit = _cache[key];
    if (hit && Date.now()-hit.ts < CACHE_TTL) return { candles: hit.data };
    let candles = await _tryLiveChart(symbol, period, interval);
    if (!candles || candles.length < 10) {
      candles = generateCandles(symbol, P2D[period] || 90);
    }
    _cache[key] = { data: candles, ts: Date.now() };
    return { candles };
  }

  async function getQuotes(symbols) {
    const key = `q_batch`;
    const hit = _cache[key];
    if (hit && Date.now()-hit.ts < 60000) return hit.data;
    // Try live
    const yUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.map(encodeURIComponent).join(',')}`;
    let out = null;
    for (const url of [yUrl, `https://corsproxy.io/?${encodeURIComponent(yUrl)}`]) {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { signal: ctrl.signal, mode: 'cors', credentials: 'omit' });
        if (!res.ok) continue;
        let json = await res.json().catch(() => null);
        if (!json) continue;
        if (typeof json.contents === 'string') { try { json = JSON.parse(json.contents); } catch { continue; } }
        const results = json?.quoteResponse?.result;
        if (results?.length) {
          out = {};
          results.forEach(q => { out[q.symbol] = q; });
          break;
        }
      } catch(_) {}
    }
    // Fallback: simulate all
    if (!out) {
      out = {};
      symbols.forEach(sym => { out[sym] = { symbol: sym, ...generateQuote(sym) }; });
    }
    _cache[key] = { data: out, ts: Date.now() };
    return out;
  }

  async function getQuote(symbol) {
    const map = await getQuotes([symbol]);
    const q = map[symbol];
    if (!q) return null;
    return {
      price: q.regularMarketPrice, change: q.regularMarketChange,
      changePct: q.regularMarketChangePercent, volume: q.regularMarketVolume,
      high52: q.fiftyTwoWeekHigh, low52: q.fiftyTwoWeekLow, mktCap: q.marketCap,
    };
  }

  function getIndexQuote(symbol) { return generateQuote(symbol); }

  return { getHistory, getQuote, getQuotes, getIndexQuote };
})();
