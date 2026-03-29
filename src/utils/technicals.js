// ===== TECHNICAL INDICATORS MODULE =====

window.Technicals = (() => {

  /** Simple Moving Average */
  function sma(data, period) {
    return data.map((_, i) => {
      if (i < period - 1) return null;
      const slice = data.slice(i - period + 1, i + 1);
      return slice.reduce((a, b) => a + b, 0) / period;
    });
  }

  /** Exponential Moving Average */
  function ema(data, period) {
    const k = 2 / (period + 1);
    const out = new Array(data.length).fill(null);
    let firstValid = data.findIndex(v => v != null);
    if (firstValid === -1) return out;
    out[firstValid + period - 1] = sma(data.slice(firstValid, firstValid + period), period).slice(-1)[0];
    for (let i = firstValid + period; i < data.length; i++) {
      out[i] = data[i] * k + out[i - 1] * (1 - k);
    }
    return out;
  }

  /** Relative Strength Index */
  function rsi(closes, period = 14) {
    if (closes.length < period + 1) return closes.map(() => null);
    const gains = [], losses = [];
    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      gains.push(Math.max(0, diff));
      losses.push(Math.max(0, -diff));
    }
    const out = new Array(closes.length).fill(null);
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    out[period] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
      out[i + 1] = 100 - 100 / (1 + avgGain / (avgLoss || 0.001));
    }
    return out;
  }

  /** MACD */
  function macd(closes, fast = 12, slow = 26, signal = 9) {
    const emaFast   = ema(closes, fast);
    const emaSlow   = ema(closes, slow);
    const macdLine  = closes.map((_, i) =>
      emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
    );
    const validMacd = macdLine.map(v => v != null ? v : 0);
    const signalLine = ema(validMacd, signal);
    const histogram = macdLine.map((v, i) =>
      v != null && signalLine[i] != null ? v - signalLine[i] : null
    );
    return { macdLine, signalLine, histogram };
  }

  /** Bollinger Bands */
  function bollingerBands(closes, period = 20, stdMult = 2) {
    const mid = sma(closes, period);
    const upper = [], lower = [];
    for (let i = 0; i < closes.length; i++) {
      if (mid[i] == null) { upper.push(null); lower.push(null); continue; }
      const slice = closes.slice(Math.max(0, i - period + 1), i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
      const std = Math.sqrt(variance);
      upper.push(mid[i] + stdMult * std);
      lower.push(mid[i] - stdMult * std);
    }
    return { upper, mid, lower };
  }

  /** Average True Range */
  function atr(candles, period = 14) {
    const tr = candles.map((c, i) => {
      if (i === 0) return c.high - c.low;
      const prev = candles[i - 1];
      return Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close));
    });
    return sma(tr, period);
  }

  /** On-Balance Volume */
  function obv(candles) {
    let running = 0;
    return candles.map((c, i) => {
      if (i === 0) return 0;
      running += (c.close > candles[i-1].close ? 1 : c.close < candles[i-1].close ? -1 : 0) * c.volume;
      return running;
    });
  }

  /** Stochastic RSI */
  function stochRsi(closes, rsiPeriod = 14, stochPeriod = 14) {
    const rsiVals = rsi(closes, rsiPeriod);
    return rsiVals.map((v, i) => {
      if (v == null || i < stochPeriod - 1) return null;
      const slice = rsiVals.slice(i - stochPeriod + 1, i + 1).filter(x => x != null);
      if (slice.length < 2) return null;
      const lo = Math.min(...slice), hi = Math.max(...slice);
      if (hi === lo) return 0.5;
      return (v - lo) / (hi - lo);
    });
  }

  /** Compute all indicators from candle array */
  function computeAll(candles) {
    if (!candles || candles.length < 30) return null;
    const closes  = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume || 0);

    const rsiVals  = rsi(closes);
    const macdVals = macd(closes);
    const bbVals   = bollingerBands(closes);
    const ema20    = ema(closes, 20);
    const ema50    = ema(closes, 50);
    const ema200   = ema(closes, 200);
    const atrVals  = atr(candles);
    const obvVals  = obv(candles);
    const stochR   = stochRsi(closes);
    const volSma   = sma(volumes, 20);

    const last = closes.length - 1;
    const cur  = {
      rsi:       rsiVals[last],
      macd:      macdVals.macdLine[last],
      macdSig:   macdVals.signalLine[last],
      macdHist:  macdVals.histogram[last],
      bbUpper:   bbVals.upper[last],
      bbMid:     bbVals.mid[last],
      bbLower:   bbVals.lower[last],
      bbWidth:   bbVals.upper[last] && bbVals.lower[last]
                   ? ((bbVals.upper[last] - bbVals.lower[last]) / bbVals.mid[last] * 100) : null,
      ema20:     ema20[last],
      ema50:     ema50[last],
      ema200:    ema200[last],
      atr:       atrVals[last],
      obvTrend:  last > 5 ? (obvVals[last] > obvVals[last-5] ? 'Rising' : 'Falling') : 'N/A',
      stochRsi:  stochR[last],
      volume:    volumes[last],
      avgVolume: volSma[last],
      close:     closes[last],
      prevClose: closes[last - 1],
    };

    return {
      cur,
      series: { rsiVals, macdVals, bbVals, ema20, ema50, ema200, volSma }
    };
  }

  /** Generate indicator signal table rows */
  function getSignalRows(ind) {
    if (!ind) return [];
    const { cur } = ind;
    const rows = [];

    // RSI
    if (cur.rsi != null) {
      const sig = cur.rsi < 30 ? 'BUY' : cur.rsi > 70 ? 'SELL' : 'HOLD';
      rows.push({ name: 'RSI (14)', val: cur.rsi.toFixed(1), sig });
    }
    // MACD
    if (cur.macd != null) {
      const sig = cur.macd > cur.macdSig ? 'BUY' : 'SELL';
      rows.push({ name: 'MACD (12,26)', val: (cur.macd > 0 ? '+' : '') + cur.macd.toFixed(2), sig });
    }
    // BB Position
    if (cur.bbUpper && cur.bbLower) {
      const pos = (cur.close - cur.bbLower) / (cur.bbUpper - cur.bbLower);
      const sig = pos < 0.2 ? 'BUY' : pos > 0.8 ? 'SELL' : 'HOLD';
      rows.push({ name: 'BB Position', val: (pos * 100).toFixed(0) + '%', sig });
    }
    // BB Width (squeeze)
    if (cur.bbWidth != null) {
      rows.push({ name: 'BB Width', val: cur.bbWidth.toFixed(1) + '%', sig: cur.bbWidth < 2 ? 'SQUEEZE' : 'HOLD' });
    }
    // EMA Alignment
    if (cur.ema20 && cur.ema50) {
      const sig = cur.ema20 > cur.ema50 ? 'BUY' : 'SELL';
      rows.push({ name: 'EMA 20/50', val: sig === 'BUY' ? 'Bull' : 'Bear', sig });
    }
    // Golden/Death Cross
    if (cur.ema50 && cur.ema200) {
      const cross = cur.ema50 > cur.ema200 ? 'Golden ✓' : 'Death ✗';
      const sig   = cur.ema50 > cur.ema200 ? 'BUY' : 'SELL';
      rows.push({ name: 'EMA 50/200', val: cross, sig });
    }
    // Stoch RSI
    if (cur.stochRsi != null) {
      const sig = cur.stochRsi < 0.2 ? 'BUY' : cur.stochRsi > 0.8 ? 'SELL' : 'HOLD';
      rows.push({ name: 'Stoch RSI', val: cur.stochRsi.toFixed(2), sig });
    }
    // OBV
    rows.push({ name: 'OBV Trend', val: cur.obvTrend, sig: cur.obvTrend === 'Rising' ? 'BUY' : 'SELL' });
    // Volume vs avg
    if (cur.avgVolume && cur.volume) {
      const ratio = cur.volume / cur.avgVolume;
      const sig   = ratio > 1.5 ? 'BUY' : ratio < 0.5 ? 'SELL' : 'HOLD';
      rows.push({ name: 'Volume Ratio', val: ratio.toFixed(1) + 'x', sig });
    }

    return rows;
  }

  return { sma, ema, rsi, macd, bollingerBands, atr, obv, stochRsi, computeAll, getSignalRows };
})();
