# Architecture Document
## Chart Pattern Intelligence — NSE
### ET Markets Hackathon 2024

---

## System Overview

Chart Pattern Intelligence is a **client-side web application** that fetches real NSE price data, runs pattern detection algorithms, and renders actionable signals — entirely in the browser with zero backend infrastructure required.

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (Client-Side)                       │
│                                                                 │
│  ┌──────────┐    ┌────────────┐    ┌──────────────────────┐    │
│  │  Scanner │───▶│  API Layer │───▶│  Yahoo Finance API   │    │
│  │ Component│    │  (api.js)  │    │  (NSE .NS symbols)   │    │
│  └────┬─────┘    └─────┬──────┘    └──────────────────────┘    │
│       │                │                                        │
│       │         ┌──────▼──────┐                                │
│       │         │   OHLCV     │                                │
│       │         │  Candle     │                                │
│       │         │   Data      │                                │
│       │         └──────┬──────┘                                │
│       │                │                                        │
│       │    ┌───────────▼──────────┐                            │
│       │    │   Technicals Engine  │                            │
│       │    │   (technicals.js)    │                            │
│       │    │  RSI, MACD, BB,      │                            │
│       │    │  EMA, OBV, Stoch RSI │                            │
│       │    └───────────┬──────────┘                            │
│       │                │                                        │
│       │    ┌───────────▼──────────┐                            │
│       │    │   Pattern Engine     │                            │
│       │    │   (patterns.js)      │                            │
│       │    │  8 pattern detectors │                            │
│       │    │  Confidence scoring  │                            │
│       │    └───────────┬──────────┘                            │
│       │                │                                        │
│  ┌────▼────────────────▼──────┐                                │
│  │      UI Components         │                                │
│  │  ┌────────┐ ┌────────────┐ │                                │
│  │  │Scanner │ │Chart.js    │ │                                │
│  │  │Panel   │ │Candlestick │ │                                │
│  │  └────────┘ └────────────┘ │                                │
│  │  ┌──────────────────────┐  │                                │
│  │  │ Signals Panel        │  │                                │
│  │  │ (Verdict/Targets/    │  │                                │
│  │  │  Indicators/History) │  │                                │
│  │  └──────────────────────┘  │                                │
│  └────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Descriptions

### 1. API Layer (`src/utils/api.js`)
**Role**: Fetches live NSE data from Yahoo Finance — no API key required.

**Tool Integrations**:
- `GET /v7/finance/quote` — Real-time price, change %, volume, 52W high/low, market cap
- `GET /v8/finance/chart/{symbol}` — OHLCV history with configurable period (1d–1y) and interval
- Dual-proxy failover: `query1` → `query2.finance.yahoo.com`
- In-memory cache: 1 min for quotes, 5 min for history

**Error Handling**:
- Network timeout → fall back to secondary proxy
- Empty data → use cached candles from previous fetch
- Rate limiting → exponential backoff via browser caching

---

### 2. Technicals Engine (`src/utils/technicals.js`)
**Role**: Pure JavaScript implementation of all standard technical indicators.

**Indicators Computed**:
| Indicator | Inputs | Complexity |
|---|---|---|
| SMA | Close, Period | O(n) |
| EMA | Close, Period | O(n) |
| RSI (Wilder) | Close, 14 | O(n) |
| MACD | Close, 12/26/9 | O(n) |
| Bollinger Bands | Close, 20, 2σ | O(n) |
| ATR | High/Low/Close, 14 | O(n) |
| OBV | Close, Volume | O(n) |
| Stochastic RSI | RSI values | O(n) |

**Output**: Both full series (for charting) and latest values (for signal generation)

---

### 3. Pattern Engine (`src/utils/patterns.js`)
**Role**: Algorithmic detection of 9 major chart patterns from raw OHLCV data.

**Detection Methods**:

| Pattern | Algorithm | Key Metrics |
|---|---|---|
| Cup & Handle | Local extrema + depth/symmetry check | Rim symmetry, depth 5–40%, proximity to rim |
| Ascending Triangle | Linear regression on swing points | Flat top slope, rising low slope |
| Head & Shoulders | 3-peak sequence + neckline | Shoulder symmetry, head height ratio |
| Inverse H&S | 3-trough sequence + neckline | Trough symmetry, reversal confirmation |
| Bull Flag | Pole gain + consolidation regression | Pole ≥6%, flag slope < 0, flag width < 6% |
| Double Top/Bottom | 2-peak proximity + neckline | Peak price difference < 3% |
| Golden Cross | EMA 50/200 crossover in last 10 bars | Cross recency, EMA spread |
| Volume Breakout | >1% above 20-bar resistance on 1.3x+ volume | Breakout %, volume multiplier |
| Rising Wedge | Converging trendlines via linear regression | Slope convergence ratio |

**Confidence Scoring**: Each pattern returns a confidence score (0–100%) computed from:
- Pattern geometry quality (symmetry, slope ratios)
- Volume confirmation
- Price proximity to key levels
- Number of touches / data points

**Fallback**: If no pattern with confidence ≥65% detected, returns momentum signal based on indicator alignment.

---

### 4. Chart Component (`src/components/chart.js`)
**Role**: Renders interactive candlestick charts using Chart.js.

**Implementation**: Since Chart.js doesn't have native candlestick support, candles are simulated using:
1. **Floating bar chart** (open–close) for the body
2. **Thin bar charts** (0.08 category width) for upper/lower wicks
3. **Line chart overlays** for BB, EMA, pattern levels

**Layers Rendered**:
- Bollinger Bands (upper/lower with fill, mid as dashed line)
- EMA 20 (blue) and EMA 50 (gold)
- Pattern resistance, support, and target as dashed lines
- Volume bars (green/red mirroring candle direction)
- RSI sub-chart (with 70/30 reference lines)

**Performance**: Charts are destroyed and recreated on symbol/timeframe change to prevent memory leaks.

---

### 5. Scanner Component (`src/components/scanner.js`)
**Role**: Manages the stock list, parallel data fetching, and filter logic.

**Scan Flow**:
```
1. Fetch bulk quotes for all 28 stocks (single API call)
2. Fetch OHLCV history in parallel batches of 8
3. Compute technicals + run pattern detector per stock
4. Progressive render: list updates as each batch completes
5. Auto-select highest-confidence stock
6. Refresh quotes every 60 seconds
```

**Filters**: Pattern type (all/bullish/bearish/breakout/reversal), Confidence (70/80/90%+), Sector (7 sectors)

---

### 6. Signals Panel (`src/components/signals.js`)
**Role**: Renders the AI signal analysis for the selected stock.

**Sections**:
1. **AI Verdict**: Pattern verdict (BULLISH/BEARISH/BREAKOUT/REVERSAL) + plain-English explanation
2. **Historical Success Rate**: Win rate, pattern count, average gain/duration, past occurrences
3. **Price Targets**: Entry zone, Target 1 (40% of measured move), Target 2 (full measured move), Stop Loss, Risk/Reward
4. **Technical Indicators**: 8 rows with value + BUY/SELL/HOLD signal badge
5. **Alert Button**: One-click breakout alert setup (can be wired to push notifications)

---

## Data Flow Diagram

```
User opens app
    │
    ▼
initClock() + initTicker()          [Parallel]
    │                │
    │         Fetch index quotes
    │         (NIFTY, BANK NIFTY, etc.)
    │
    ▼
Scanner.init()
    │
    ├── getQuotes([28 symbols])      ──▶  Yahoo Finance (1 call)
    │       └── quotesMap
    │
    ├── Batch 1: getHistory × 8     ──▶  Yahoo Finance (8 parallel)
    │       └── For each:
    │           ├── Technicals.computeAll(candles)
    │           ├── PatternEngine.detect(candles, indicators)
    │           └── Progressive render to DOM
    │
    ├── Batch 2–4: repeat ──▶ Progressive render
    │
    └── Auto-select first stock
            │
            ▼
    onStockSelected(stock)
            │
            ├── updateChartHeader()
            ├── loadAndRenderChart()
            │       ├── API.getHistory(sym, period)
            │       ├── Technicals.computeAll()
            │       ├── PatternEngine.detect()
            │       └── ChartModule.render()
            │
            ├── updatePatternOverlay()
            └── SignalsPanel.show()
```

---

## Error Handling

| Error Type | Handling Strategy |
|---|---|
| Network failure | Dual proxy fallback; show cached data |
| Empty candle data | Skip stock in scanner; show "—" in UI |
| Pattern not found | Fall back to momentum signal from indicators |
| Yahoo Finance rate limit | Browser-level caching (5 min TTL) |
| CORS issues | Both Yahoo endpoints support CORS |
| Chart render fail | try/catch per detector; graceful degradation |

---

## Technology Stack

| Component | Technology | Reason |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | Zero build complexity, instant deploy |
| Charts | Chart.js 4.4.1 | Best OSS charting, CDN-hosted |
| Data | Yahoo Finance API | Free, no auth, real NSE data |
| Indicators | Custom JS | Full control, no black-box dependency |
| Pattern Detection | Custom JS | Tuned for Indian market timeframes |
| Styling | CSS Variables | Theme consistency, dark mode native |

---

## Scalability Path (Production)

| Feature | Current | Production |
|---|---|---|
| Data source | Yahoo Finance (free) | NSE official feed / Broker API |
| Pattern detection | Client-side JS | Server-side Python + precomputed |
| Universe | 28 stocks | Full 2000+ NSE universe |
| Real-time | 60s refresh | WebSocket tick data |
| Alerts | UI only | Push notifications / WhatsApp |
| History | Synthetic | Actual back-tested database |
| Authentication | None | User accounts + portfolio |
