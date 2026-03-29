# Chart Pattern Intelligence 📈
### AI for the Indian Investor

> Real-time technical chart pattern detection across the full NSE universe — with plain-English explanations and historical back-tested success rates, stock-specific.

---

## 🚀 Live Demo

Open `index.html` in your browser. No server required — all data fetched live from Yahoo Finance API.

> **Note:** Requires internet connection. NSE data is fetched in real-time from Yahoo Finance (free, no API key needed).

---

## 🧠 What It Does

**Chart Pattern Intelligence** automatically scans 28+ NSE stocks, detects 8 major chart patterns in real time, and translates them into plain-English buy/sell signals with:

- **Real candlestick charts** with Bollinger Bands, EMA 20/50/200, Volume, RSI
- **8 pattern detectors**: Cup & Handle, Ascending Triangle, Bull Flag, Head & Shoulders, Inverse H&S, Double Top/Bottom, Golden Cross, Volume Breakout, Rising Wedge
- **Historical back-testing**: Win rate, average gain, average duration for that pattern on that specific stock
- **Price targets**: Entry zone, Target 1, Target 2, Stop Loss, Risk/Reward ratio
- **9 technical indicators**: RSI, MACD, BB Position, BB Width, EMA alignment, Golden/Death Cross, Stoch RSI, OBV, Volume Ratio
- **Pattern confidence score**: 0–100% algorithmic confidence
- **Plain-English explanation**: What the pattern means for a retail investor, in simple language

---

## 📁 Project Structure

```
chart-pattern-intelligence/
├── index.html                    # Main app HTML
├── styles.css                    # All styles
├── src/
│   ├── app.js                    # Main orchestrator
│   ├── data/
│   │   └── stocks.js             # NSE stock universe (28 stocks, 6 sectors)
│   ├── utils/
│   │   ├── api.js                # Yahoo Finance data fetcher + cache
│   │   ├── technicals.js         # SMA, EMA, RSI, MACD, BB, ATR, OBV, Stoch RSI
│   │   └── patterns.js           # 8 chart pattern detectors (algorithmic)
│   └── components/
│       ├── chart.js              # Chart.js rendering (candlestick + overlays)
│       ├── scanner.js            # Stock list, filters, live quote refresh
│       └── signals.js            # Right panel: verdict, targets, indicators
└── docs/
    ├── ARCHITECTURE.md           # System architecture document
    └── IMPACT_MODEL.md           # Business impact analysis
```

---

## 🏃 How to Run

### Option 1: Direct (Recommended for Demo)
```bash
# Just open in browser — no build step needed
open index.html
# or
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Option 2: Live Server (VS Code)
Install the "Live Server" extension → Right click `index.html` → Open with Live Server

### Option 3: Node.js simple server
```bash
npx serve .
```

---

## 🔌 Data Source

All price data comes from **Yahoo Finance API** (free, no authentication required):
- **Real-time quotes**: `query1.finance.yahoo.com/v7/finance/quote`
- **OHLCV history**: `query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- **Symbols**: Standard `.NS` suffix for NSE stocks (e.g., `RELIANCE.NS`, `TCS.NS`)
- **Fallback**: Secondary Yahoo proxy `query2.finance.yahoo.com` if primary fails
- **Caching**: 1-minute cache for intraday quotes, 5-minute for historical data

---

## 🔍 Pattern Detection Algorithms

Each detector works purely on OHLCV data:

| Pattern | Method | Min Candles |
|---|---|---|
| Cup & Handle | Local minima/maxima + symmetry check | 50 |
| Ascending Triangle | Linear regression on swing highs/lows | 30 |
| Head & Shoulders | 3-peak detection + neckline | 40 |
| Inverse H&S | 3-trough detection + neckline | 40 |
| Bull Flag | Pole gain + consolidation slope | 25 |
| Double Top/Bottom | 2-peak proximity check | 30 |
| Golden Cross | EMA 50/200 crossover detection | 200 |
| Volume Breakout | Resistance break + volume confirmation | 20 |
| Rising Wedge | Converging trendline regression | 30 |

---

## 📊 Technical Indicators

Computed from scratch (no external library):

| Indicator | Formula | Signal Logic |
|---|---|---|
| RSI (14) | Wilder smoothing | <30 BUY, >70 SELL |
| MACD (12,26,9) | EMA difference | MACD > Signal = BUY |
| Bollinger Bands (20,2) | SMA ± 2σ | Position within bands |
| EMA 20/50/200 | Exponential smoothing | Alignment direction |
| Stochastic RSI | RSI normalized over window | <0.2 BUY, >0.8 SELL |
| OBV | Cumulative volume × direction | Trend direction |
| ATR (14) | True range smoothing | Volatility context |

---

## ⚡ Key Features

### Real-Time Data
- Quotes refresh every 60 seconds automatically
- Historical data fetched fresh on each timeframe switch
- Market open/closed status tracked (IST 9:15 AM – 3:30 PM)

### Smart Scanning
- Parallel batch scanning (8 stocks at a time) with progressive rendering
- Filter by: Pattern type, Confidence threshold (70/80/90%+), Sector
- Auto-selects highest-confidence pattern on load

### Chart Interactivity
- 6 timeframes: 1D, 5D, 1M, 3M, 6M, 1Y
- Toggle indicators: BB, EMA, VOL, RSI
- Hover tooltips with OHLCV data
- Pattern zones highlighted with support/resistance/target lines
