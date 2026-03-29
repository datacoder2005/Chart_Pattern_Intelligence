// ===== CHART RENDERING MODULE =====

window.ChartModule = (() => {

  let priceChartInst = null;
  let volumeChartInst = null;
  let rsiChartInst = null;

  // Active indicators
  const activeInds = new Set(['BB', 'EMA', 'VOL', 'RSI']);

  // Chart.js doesn't have built-in candlestick — we simulate with bar charts
  // and overlay open/close as floating bars

  function destroyAll() {
    [priceChartInst, volumeChartInst, rsiChartInst].forEach(c => { if (c) c.destroy(); });
    priceChartInst = volumeChartInst = rsiChartInst = null;
  }

  function fmt(n, dec = 0) {
    if (n == null) return '';
    return n.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function fmtDate(ts, period) {
    const d = new Date(ts);
    if (period === '1d') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (period === '5d') return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function render(candles, indicators, period, pattern) {
    destroyAll();
    if (!candles || candles.length === 0) return;

    const pCanvas  = document.getElementById('priceChart');
    const vCanvas  = document.getElementById('volumeChart');
    const rCanvas  = document.getElementById('rsiChart');

    [pCanvas, vCanvas, rCanvas].forEach(c => c && (c.style.display = 'block'));

    const labels = candles.map(c => fmtDate(c.time, period));
    const closes = candles.map(c => c.close);
    const opens  = candles.map(c => c.open);
    const highs  = candles.map(c => c.high);
    const lows   = candles.map(c => c.low);
    const vols   = candles.map(c => c.volume || 0);

    const { series } = indicators || { series: {} };

    // Colors
    const GREEN = '#4caf7d';
    const RED   = '#e05c5c';
    const GOLD  = '#c8a84b';
    const GOLD_DIM = 'rgba(200,168,75,0.25)';
    const GRID  = 'rgba(30,39,64,0.8)';
    const TEXT  = '#4a4a5a';

    // Candlestick as floating bar: [low, high] with color per candle
    const candleColors = candles.map(c => c.close >= c.open ? GREEN : RED);
    const candleEdge   = candles.map(c => c.close >= c.open ? 'rgba(76,175,125,0.7)' : 'rgba(224,92,92,0.7)');

    // Wick data sets
    const wickHigh = candles.map(c => [Math.max(c.open, c.close), c.high]);
    const wickLow  = candles.map(c => [c.low, Math.min(c.open, c.close)]);

    // Build datasets
    const datasets = [];

    // BODY (open-close as floating bar)
    datasets.push({
      label: 'OHLC',
      data: candles.map(c => [Math.min(c.open, c.close), Math.max(c.open, c.close)]),
      backgroundColor: candleColors,
      borderColor: candleEdge,
      borderWidth: 1,
      borderSkipped: false,
      barPercentage: 0.6,
      categoryPercentage: 0.7,
      type: 'bar',
      order: 3,
    });

    // WICK HIGH (thin bar from body top to wick high)
    datasets.push({
      label: '_wickH',
      data: wickHigh,
      backgroundColor: candleColors,
      borderColor: candleColors,
      borderWidth: 0,
      barPercentage: 0.08,
      categoryPercentage: 0.7,
      type: 'bar',
      order: 2,
    });

    // WICK LOW (thin bar from body bottom to wick low)
    datasets.push({
      label: '_wickL',
      data: wickLow,
      backgroundColor: candleColors,
      borderColor: candleColors,
      borderWidth: 0,
      barPercentage: 0.08,
      categoryPercentage: 0.7,
      type: 'bar',
      order: 2,
    });

    // Bollinger Bands
    if (activeInds.has('BB') && series.bbVals) {
      const { upper, mid, lower } = series.bbVals;
      datasets.push({
        label: 'BB Upper',
        data: upper,
        type: 'line',
        borderColor: 'rgba(42,92,58,0.7)',
        borderWidth: 1,
        borderDash: [4,3],
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        order: 1,
      });
      datasets.push({
        label: 'BB Mid',
        data: mid,
        type: 'line',
        borderColor: GOLD_DIM,
        borderWidth: 1,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        order: 1,
      });
      datasets.push({
        label: 'BB Lower',
        data: lower,
        type: 'line',
        borderColor: 'rgba(42,92,58,0.7)',
        borderWidth: 1,
        borderDash: [4,3],
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(76,175,125,0.04)',
        tension: 0.3,
        order: 1,
      });
    }

    // EMAs
    if (activeInds.has('EMA') && series.ema20) {
      datasets.push({
        label: 'EMA 20',
        data: series.ema20,
        type: 'line',
        borderColor: '#6495ed',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        order: 0,
      });
    }
    if (activeInds.has('EMA') && series.ema50) {
      datasets.push({
        label: 'EMA 50',
        data: series.ema50,
        type: 'line',
        borderColor: '#c8a84b',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        order: 0,
      });
    }

    // Pattern levels
    if (pattern) {
      if (pattern.resistance) {
        datasets.push({
          label: 'Resistance',
          data: candles.map(() => pattern.resistance),
          type: 'line',
          borderColor: 'rgba(224,92,92,0.6)',
          borderWidth: 1,
          borderDash: [6,4],
          pointRadius: 0,
          fill: false,
          order: 0,
        });
      }
      if (pattern.support) {
        datasets.push({
          label: 'Support',
          data: candles.map(() => pattern.support),
          type: 'line',
          borderColor: 'rgba(76,175,125,0.6)',
          borderWidth: 1,
          borderDash: [6,4],
          pointRadius: 0,
          fill: false,
          order: 0,
        });
      }
      if (pattern.target) {
        datasets.push({
          label: 'Target',
          data: candles.map(() => pattern.target),
          type: 'line',
          borderColor: 'rgba(100,149,237,0.5)',
          borderWidth: 1,
          borderDash: [3,3],
          pointRadius: 0,
          fill: false,
          order: 0,
        });
      }
    }

    const priceMin = Math.min(...lows.filter(Boolean)) * 0.995;
    const priceMax = Math.max(...highs.filter(Boolean)) * 1.005;

    // ── PRICE CHART ──
    const canvasArea = document.getElementById('chartCanvasArea');
    const totalH = canvasArea.offsetHeight - 20;
    const priceH = activeInds.has('RSI') ? Math.floor(totalH * 0.65) : Math.floor(totalH * 0.82);
    const volH   = activeInds.has('VOL') ? 60 : 0;
    const rsiH   = activeInds.has('RSI') ? Math.floor(totalH * 0.22) : 0;

    pCanvas.style.height = priceH + 'px';
    if (vCanvas) vCanvas.style.height = volH + 'px';
    if (rCanvas) rCanvas.style.height = rsiH + 'px';

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
    };

    priceChartInst = new Chart(pCanvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        ...commonOptions,
        scales: {
          x: {
            display: true,
            ticks: {
              color: TEXT, font: { family: 'monospace', size: 9 },
              maxTicksLimit: 10, maxRotation: 0,
            },
            grid: { color: GRID },
          },
          y: {
            display: true,
            position: 'right',
            min: priceMin,
            max: priceMax,
            ticks: {
              color: TEXT, font: { family: 'monospace', size: 9 },
              callback: v => '₹' + fmt(v, 0),
              maxTicksLimit: 6,
            },
            grid: { color: GRID },
          },
        },
        plugins: {
          ...commonOptions.plugins,
          tooltip: {
            callbacks: {
              title: ctx => labels[ctx[0].dataIndex],
              label: ctx => {
                const i = ctx.dataIndex;
                if (ctx.dataset.label === 'OHLC') {
                  const c = candles[i];
                  return [
                    `O: ₹${fmt(c.open, 2)}`,
                    `H: ₹${fmt(c.high, 2)}`,
                    `L: ₹${fmt(c.low, 2)}`,
                    `C: ₹${fmt(c.close, 2)}`,
                  ];
                }
                if (ctx.dataset.label?.startsWith('_')) return null;
                return `${ctx.dataset.label}: ₹${fmt(ctx.parsed.y, 2)}`;
              },
              filter: item => !item.dataset.label?.startsWith('_'),
            },
            backgroundColor: '#0d1120',
            borderColor: '#1e2740',
            borderWidth: 1,
            titleColor: '#e8e4d9',
            bodyColor: '#8a8a9a',
            padding: 10,
          },
        },
      },
    });

    // ── VOLUME CHART ──
    if (activeInds.has('VOL') && vCanvas && volH > 0) {
      vCanvas.style.display = 'block';
      volumeChartInst = new Chart(vCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            data: vols,
            backgroundColor: candles.map(c => c.close >= c.open ? 'rgba(76,175,125,0.5)' : 'rgba(224,92,92,0.5)'),
            borderColor: 'transparent',
            borderWidth: 0,
          }],
        },
        options: {
          ...commonOptions,
          scales: {
            x: { display: false },
            y: {
              display: true,
              position: 'right',
              ticks: {
                color: TEXT, font: { family: 'monospace', size: 8 },
                maxTicksLimit: 3,
                callback: v => v >= 1e7 ? (v/1e7).toFixed(1)+'Cr' : v >= 1e5 ? (v/1e5).toFixed(0)+'L' : v,
              },
              grid: { color: GRID },
            },
          },
        },
      });
    } else if (vCanvas) {
      vCanvas.style.display = 'none';
    }

    // ── RSI CHART ──
    if (activeInds.has('RSI') && rCanvas && series.rsiVals && rsiH > 0) {
      rCanvas.style.display = 'block';
      const rsiData = series.rsiVals.slice(-candles.length);
      rsiChartInst = new Chart(rCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              data: rsiData,
              borderColor: GOLD,
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
              tension: 0.3,
            },
            {
              data: candles.map(() => 70),
              borderColor: 'rgba(224,92,92,0.3)',
              borderWidth: 1,
              borderDash: [4,3],
              pointRadius: 0,
              fill: false,
            },
            {
              data: candles.map(() => 30),
              borderColor: 'rgba(76,175,125,0.3)',
              borderWidth: 1,
              borderDash: [4,3],
              pointRadius: 0,
              fill: false,
            },
          ],
        },
        options: {
          ...commonOptions,
          scales: {
            x: { display: false },
            y: {
              min: 0, max: 100,
              display: true,
              position: 'right',
              ticks: {
                color: TEXT, font: { family: 'monospace', size: 8 },
                values: [30, 50, 70],
                callback: v => v,
              },
              grid: { color: GRID },
            },
          },
        },
      });
    } else if (rCanvas) {
      rCanvas.style.display = 'none';
    }
  }

  function toggleIndicator(ind) {
    if (activeInds.has(ind)) activeInds.delete(ind);
    else activeInds.add(ind);
  }

  function isActive(ind) { return activeInds.has(ind); }

  return { render, destroyAll, toggleIndicator, isActive };
})();
