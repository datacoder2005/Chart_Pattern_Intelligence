// ===== SCANNER MODULE =====

window.Scanner = (() => {

  let scannedStocks = [];
  let filters = { pat: 'all', conf: 70, sec: 'all' };
  let onSelectCb = null;

  function init(onSelect) {
    onSelectCb = onSelect;
    setupFilters();
    runScan();
  }

  function setupFilters() {
    ['patFilter','confFilter','secFilter'].forEach(id => {
      document.getElementById(id).addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        document.querySelectorAll(`#${id} .chip`).forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (id === 'patFilter')  filters.pat  = chip.dataset.val;
        if (id === 'confFilter') filters.conf = parseInt(chip.dataset.val);
        if (id === 'secFilter')  filters.sec  = chip.dataset.val;
        renderList();
      });
    });
  }

  async function runScan() {
    const listEl = document.getElementById('stockList');
    listEl.innerHTML = `<div class="loading-state"><div class="spinner"></div><div>Scanning NSE…</div></div>`;

    const allSyms = window.NSE_STOCKS.map(s => s.sym);

    // Fetch all quotes in one shot (uses sim fallback if needed)
    const quotesMap = await window.API.getQuotes(allSyms);

    // Process stocks in batches of 6 for progressive rendering
    const batchSize = 6;
    for (let i = 0; i < window.NSE_STOCKS.length; i += batchSize) {
      const batch = window.NSE_STOCKS.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async stock => {
        try {
          const { candles } = await window.API.getHistory(stock.sym, '3mo', '1d');
          if (!candles || candles.length < 20) return null;
          const ind     = window.Technicals.computeAll(candles);
          const pattern = window.PatternEngine.detect(candles, ind);
          const q       = quotesMap[stock.sym] || {};
          const lastCandle = candles[candles.length - 1];
          const prevCandle = candles[candles.length - 2];
          
          // Always derive price/change from actual candle data — guaranteed consistent
          const lastClose = lastCandle.close;
          const prevClose = prevCandle?.close || lastCandle.open;
          const change    = +(lastClose - prevClose).toFixed(2);
          const changePct = +((change / prevClose) * 100).toFixed(2);
          
          // 52W high/low from candle data (use API values as override if live)
          const allHighs  = candles.map(c => c.high);
          const allLows   = candles.map(c => c.low);
          const high52    = q.fiftyTwoWeekHigh  || Math.max(...allHighs);
          const low52     = q.fiftyTwoWeekLow   || Math.min(...allLows);
          
          return {
            ...stock,
            price: lastClose, change, changePct,
            high52, low52,
            mktCap:  q.marketCap,
            volume:  lastCandle.volume,
            candles, ind, pattern,
          };
        } catch(e) {
          console.warn('Scan error', stock.sym, e);
          return null;
        }
      }));

      results.filter(Boolean).forEach(r => {
        const existing = scannedStocks.findIndex(s => s.sym === r.sym);
        if (existing >= 0) scannedStocks[existing] = r;
        else scannedStocks.push(r);
      });
      renderList();

      // Auto-select first stock with pattern after first batch
      if (i === 0) {
        const first = scannedStocks.find(s => s.pattern);
        if (first && !window.AppState?.selectedSym && onSelectCb) {
          selectStock(first.sym);
        }
      }
    }

    // Refresh quotes every 60s
    setInterval(async () => {
      try {
        const fresh = await window.API.getQuotes(allSyms);
        scannedStocks.forEach(s => {
          const q = fresh[s.sym];
          if (q && q.regularMarketPrice) {
            // Only update from live API data — skip simulated (which randomises on each call)
            // Detect live vs simulated: live data has a valid quoteType field
            const isLive = q.quoteType != null;
            if (isLive) {
              s.price     = q.regularMarketPrice;
              s.change    = q.regularMarketChange    || s.change;
              s.changePct = q.regularMarketChangePercent || s.changePct;
            }
            // If simulated: keep candle-derived price (already set), don't overwrite
          }
        });
        renderList();
      } catch(_) {}
    }, 60_000);
  }

  function getFiltered() {
    return scannedStocks.filter(s => {
      if (!s.pattern) return false;
      if (filters.pat !== 'all' && s.pattern.type !== filters.pat) return false;
      if (s.pattern.confidence < filters.conf) return false;
      if (filters.sec !== 'all' && s.sector !== filters.sec) return false;
      return true;
    }).sort((a,b) => b.pattern.confidence - a.pattern.confidence);
  }

  function renderList() {
    const filtered = getFiltered();
    document.getElementById('scanCount').textContent = filtered.length;
    const listEl = document.getElementById('stockList');

    if (scannedStocks.length === 0) {
      listEl.innerHTML = `<div class="loading-state"><div class="spinner"></div><div>Scanning NSE…</div></div>`;
      return;
    }
    if (filtered.length === 0) {
      listEl.innerHTML = `<div class="loading-state"><div style="font-size:24px">🔍</div><div>No patterns match filters</div></div>`;
      return;
    }

    listEl.innerHTML = filtered.map(s => {
      const pct  = s.changePct?.toFixed(2) ?? '0.00';
      const sign = (s.change >= 0) ? '+' : '';
      const cls  = s.change >= 0 ? 'up' : 'dn';
      const pr   = s.price ? '₹' + s.price.toLocaleString('en-IN',{maximumFractionDigits:2}) : '—';
      const sel  = (window.AppState?.selectedSym === s.sym) ? 'selected' : '';
      return `<div class="stock-item ${sel}" data-sym="${s.sym}">
        <div class="si-left">
          <div class="si-sym">${s.display}</div>
          <div class="si-name">${s.name}</div>
          <div class="si-pat"><span class="pat-badge pat-${s.pattern.type}">${s.pattern.name}</span></div>
        </div>
        <div class="si-right">
          <div class="si-price">${pr}</div>
          <div class="si-chg ${cls}">${sign}${pct}%</div>
          <div class="si-conf">${s.pattern.confidence}% conf</div>
        </div>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.stock-item').forEach(el => {
      el.addEventListener('click', () => selectStock(el.dataset.sym));
    });

    if (window._updateBottomAlerts) window._updateBottomAlerts(filtered);
  }

  function selectStock(sym) {
    if (!window.AppState) window.AppState = {};
    window.AppState.selectedSym = sym;
    renderList();
    const stock = scannedStocks.find(s => s.sym === sym);
    if (stock && onSelectCb) onSelectCb(stock);
  }

  function getFiltered2() { return getFiltered(); }
  function getStock(sym) { return scannedStocks.find(s => s.sym === sym); }

  return { init, renderList, selectStock, getFiltered: getFiltered2, getStock };
})();
