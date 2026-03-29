// ===== MAIN APP =====
// Chart Pattern Intelligence — NSE
// ET Markets Hackathon 2024

window.AppState = {
  selectedSym: null,
  currentTF: '3mo',
  currentStock: null,
};

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initTicker();
  initTimeframes();
  initIndicatorButtons();
  initSearch();
  initBottomAlerts();

  // Boot scanner (fetches live data + starts auto-select)
  window.Scanner.init(onStockSelected);
});

// ── Clock ────────────────────────────────────────────────

function initClock() {
  function tick() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    const el = document.getElementById('mktTime');
    if (el) el.textContent = `NSE · ${h}:${m}:${s} IST`;

    // Market hours: 9:15 AM – 3:30 PM IST (UTC+5:30)
    const utc    = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist    = new Date(utc + 5.5 * 3600000);
    const istH   = ist.getHours();
    const istM   = ist.getMinutes();
    const isOpen = (istH === 9 && istM >= 15) || (istH > 9 && istH < 15) || (istH === 15 && istM <= 30);
    const statusEl = document.getElementById('mktStatus');
    if (statusEl) statusEl.textContent = isOpen ? 'LIVE' : 'CLOSED';
  }
  tick();
  setInterval(tick, 1000);
}

// ── Ticker Bar ───────────────────────────────────────────

async function initTicker() {
  const track = document.getElementById('tickerTrack');
  const indices = window.NSE_INDICES;

  // Fetch real candle data for each index and derive price from last candle
  const results = await Promise.all(indices.map(async idx => {
    try {
      const { candles } = await window.API.getHistory(idx.sym, '5d', '1d');
      if (candles && candles.length >= 2) {
        const last = candles[candles.length - 1];
        const prev = candles[candles.length - 2];
        const price = last.close;
        const chg   = +(last.close - prev.close).toFixed(2);
        const pct   = +((chg / prev.close) * 100).toFixed(2);
        return { display: idx.display, price, pct };
      }
    } catch(_) {}
    // fallback to simulated
    const q = window.API.getIndexQuote(idx.sym);
    return { display: idx.display, price: q.regularMarketPrice, pct: q.regularMarketChangePercent };
  }));

  const items = results.map(r => {
    const sign = r.pct >= 0 ? '+' : '';
    const cls  = r.pct >= 0 ? 't-up' : 't-dn';
    return `<span class="ticker-item">
      <span class="t-name">${r.display}</span>
      <span class="t-val">${r.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
      <span class="${cls}">${sign}${r.pct?.toFixed(2)}%</span>
    </span>`;
  });

  const html = items.join('') + items.join('');
  track.innerHTML = html;

  // Refresh every 2 min
  setTimeout(initTicker, 120_000);
}

// ── Timeframe Buttons ────────────────────────────────────

function initTimeframes() {
  const group = document.getElementById('tfGroup');
  group.addEventListener('click', async e => {
    const btn = e.target.closest('.tf-btn');
    if (!btn) return;
    group.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tf = btn.dataset.tf;
    window.AppState.currentTF = tf;

    if (window.AppState.currentStock) {
      await loadAndRenderChart(window.AppState.currentStock, tf);
    }
  });
}

// ── Indicator Toggle Buttons ─────────────────────────────

function initIndicatorButtons() {
  const group = document.getElementById('chartCanvasArea').parentElement.querySelector('.ind-group');
  if (!group) return;
  document.querySelectorAll('.ind-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ind = btn.dataset.ind;
      window.ChartModule.toggleIndicator(ind);
      btn.classList.toggle('active');
      if (window.AppState.currentStock) {
        renderChart(window.AppState.currentStock);
      }
    });
  });
}

// ── Search ───────────────────────────────────────────────

function initSearch() {
  const input   = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');

  input.addEventListener('input', () => {
    const q = input.value.trim().toUpperCase();
    if (!q) { results.style.display = 'none'; return; }

    const matches = window.NSE_STOCKS.filter(s =>
      s.display.includes(q) || s.name.toUpperCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) { results.style.display = 'none'; return; }

    results.innerHTML = matches.map(s => `
      <div class="search-result-item" data-sym="${s.sym}">
        <div>
          <div class="sr-sym">${s.display}</div>
          <div class="sr-name">${s.name}</div>
        </div>
        <div class="sr-sector">${s.sector}</div>
      </div>
    `).join('');
    results.style.display = 'block';

    results.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        input.value = '';
        results.style.display = 'none';
        window.Scanner.selectStock(el.dataset.sym);
      });
    });
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.style.display = 'none';
    }
  });
}

// ── Bottom Alerts ────────────────────────────────────────

function initBottomAlerts() {
  // Will be populated once scan completes
  // Update data source badge
  window._updateDataBadge = function(isLive) {
    const el = document.getElementById('dataSrcBadge');
    if (el) el.textContent = isLive ? '● Live NSE Data' : '◌ Simulated Data';
    if (el) el.style.color = isLive ? '#4caf7d' : '#c8a84b';
  };

  window._updateBottomAlerts = function(stocks) {
    const scroll = document.getElementById('alertsScroll');
    const top5 = stocks
      .filter(s => s.pattern && s.pattern.confidence >= 80)
      .sort((a, b) => b.pattern.confidence - a.pattern.confidence)
      .slice(0, 8);

    if (!top5.length) return;

    const typeIcon = { bullish: 'alert-bull', bearish: 'alert-bear', breakout: 'alert-bull', reversal: 'alert-neutral' };

    const items = top5.map(s => {
      const cls = typeIcon[s.pattern.type] || 'alert-neutral';
      return `<span class="alert-item ${cls}">
        <strong>${s.display}</strong> · ${s.pattern.name} · ${s.pattern.confidence}% conf
      </span>`;
    });

    // Duplicate for seamless scroll
    scroll.innerHTML = items.join('') + items.join('');
  };
}

// ── Stock Selection ──────────────────────────────────────

async function onStockSelected(stock) {
  window.AppState.currentStock = stock;
  window.AppState.selectedSym  = stock.sym;

  // Show symbol/name immediately, price will update after candles load
  document.getElementById('chartSymbol').textContent = stock.display;
  document.getElementById('chartName').textContent   = stock.name;
  document.getElementById('chartSector').textContent = stock.sector;
  document.getElementById('chartPrice').textContent  = '₹—';
  document.getElementById('chartChg').textContent    = '';
  document.getElementById('high52').textContent      = '—';
  document.getElementById('low52').textContent       = '—';
  document.getElementById('mktCap').textContent      = stock.mktCap ? formatCap(stock.mktCap) : '—';
  document.getElementById('volume').textContent      = '—';

  // Show loading overlay
  showChartLoading(true);

  // Load chart data
  await loadAndRenderChart(stock, window.AppState.currentTF || '3mo');

  showChartLoading(false);

  // Pattern overlay
  updatePatternOverlay(stock.pattern);

  // Show signal panel
  window.SignalsPanel.show(stock);

  // Update bottom alerts
  if (window._updateBottomAlerts) {
    window._updateBottomAlerts(window.Scanner.getFiltered());
  }
}

async function loadAndRenderChart(stock, period) {
  try {
    // Get fresh history for selected timeframe
    let { candles } = await window.API.getHistory(stock.sym, period, period === '1d' ? '5m' : '1d');

    if (!candles || candles.length === 0) {
      candles = stock.candles || []; // fallback to scan candles
    }

    stock._chartCandles = candles;

    // ── CRITICAL: Derive price/change from actual candle data ──
    // This ensures header always matches chart, regardless of data source
    const lastC = candles[candles.length - 1];
    const prevC = candles[candles.length - 2];
    if (lastC) {
      const realClose   = lastC.close;
      const prevClose   = prevC ? prevC.close : lastC.open;
      const realChange  = +(realClose - prevClose).toFixed(2);
      const realChangePct = +((realChange / prevClose) * 100).toFixed(2);
      // Compute 52W high/low from candle data
      const allHighs  = candles.map(c => c.high);
      const allLows   = candles.map(c => c.low);
      const real52Hi  = Math.max(...allHighs);
      const real52Lo  = Math.min(...allLows);
      const realVol   = lastC.volume;

      // Update stock object with candle-derived values
      stock.price     = realClose;
      stock.change    = realChange;
      stock.changePct = realChangePct;
      // Only override 52W if we have enough history (>= 200 candles ≈ 1Y)
      if (candles.length >= 200) {
        stock.high52  = real52Hi;
        stock.low52   = real52Lo;
      }
      if (realVol) stock.volume = realVol;

      // Re-render header with accurate data now that candles are loaded
      updateChartHeader(stock);
    }

    // Recompute indicators on new candle set
    const ind = window.Technicals.computeAll(candles);
    const pattern = window.PatternEngine.detect(candles, ind) || stock.pattern;

    stock.ind     = ind;
    stock.pattern = pattern;

    renderChart(stock);
    updatePatternOverlay(pattern);
    window.SignalsPanel.show(stock);
  } catch (e) {
    console.warn('Chart load error:', e);
    showChartLoading(false);
  }
}

function renderChart(stock) {
  const candles = stock._chartCandles || stock.candles;
  if (!candles?.length) return;
  document.getElementById('chartPlaceholder').style.display = 'none';
  window.ChartModule.render(candles, stock.ind, window.AppState.currentTF, stock.pattern);
}

function updateChartHeader(stock) {
  const { display, name, sector, price, change, changePct, high52, low52, mktCap, volume } = stock;

  document.getElementById('chartSymbol').textContent  = display;
  document.getElementById('chartName').textContent    = name;
  document.getElementById('chartSector').textContent  = sector;

  const priceEl = document.getElementById('chartPrice');
  const chgEl   = document.getElementById('chartChg');
  priceEl.textContent = price ? '₹' + price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';

  if (change != null) {
    const sign = change >= 0 ? '+' : '';
    chgEl.textContent = `${sign}${change.toFixed(2)} (${sign}${changePct?.toFixed(2)}%)`;
    chgEl.className = 'chart-change ' + (change >= 0 ? 'up' : 'dn');
  }

  document.getElementById('high52').textContent  = high52  ? '₹' + Math.round(high52).toLocaleString('en-IN') : '—';
  document.getElementById('low52').textContent   = low52   ? '₹' + Math.round(low52).toLocaleString('en-IN')  : '—';
  document.getElementById('mktCap').textContent  = mktCap  ? formatCap(mktCap)  : '—';
  document.getElementById('volume').textContent  = volume  ? formatVol(volume)  : '—';
}

function updatePatternOverlay(pattern) {
  const overlay = document.getElementById('patternOverlay');
  if (!pattern) { overlay.style.display = 'none'; return; }

  overlay.style.display = 'block';
  document.getElementById('overlayPatName').textContent  = pattern.name;
  document.getElementById('overlayPatDesc').textContent  = pattern.description;
  document.getElementById('overlayConfBar').style.width  = pattern.confidence + '%';
  document.getElementById('overlayConfVal').textContent  = pattern.confidence + '%';

  const typeBadge = document.getElementById('overlayPatType');
  const clsMap = { bullish: 'pat-bullish', bearish: 'pat-bearish', breakout: 'pat-breakout', reversal: 'pat-reversal' };
  typeBadge.innerHTML = `<span class="pat-badge ${clsMap[pattern.type] || 'pat-neutral'}">${pattern.type.toUpperCase()}</span>`;
}

function showChartLoading(show) {
  const area = document.getElementById('chartCanvasArea');
  let overlay = area.querySelector('.chart-loading');
  if (show) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'chart-loading';
      overlay.innerHTML = `<div class="spinner"></div><div style="font-family:monospace;font-size:11px">Loading chart…</div>`;
      area.appendChild(overlay);
    }
  } else {
    if (overlay) overlay.remove();
  }
}

// ── Formatters ────────────────────────────────────────────

function formatCap(n) {
  if (n >= 1e12) return '₹' + (n / 1e12).toFixed(2) + 'L Cr';
  if (n >= 1e9)  return '₹' + (n / 1e9).toFixed(0)  + 'Cr';
  if (n >= 1e7)  return '₹' + (n / 1e7).toFixed(0)  + 'L';
  return '₹' + n.toLocaleString('en-IN');
}

function formatVol(n) {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(1) + ' L';
  return n.toLocaleString('en-IN');
}
