// ===== NSE STOCK UNIVERSE =====
// Full list of tracked stocks with metadata

window.NSE_STOCKS = [
  // IT
  { sym: 'TCS.NS',        display: 'TCS',        name: 'Tata Consultancy Services', sector: 'IT' },
  { sym: 'INFY.NS',       display: 'INFY',       name: 'Infosys Ltd',               sector: 'IT' },
  { sym: 'WIPRO.NS',      display: 'WIPRO',      name: 'Wipro Ltd',                 sector: 'IT' },
  { sym: 'HCLTECH.NS',    display: 'HCLTECH',    name: 'HCL Technologies',          sector: 'IT' },
  { sym: 'TECHM.NS',      display: 'TECHM',      name: 'Tech Mahindra',             sector: 'IT' },
  { sym: 'LTIM.NS',       display: 'LTIM',       name: 'LTIMindtree',               sector: 'IT' },
  // Banking
  { sym: 'HDFCBANK.NS',   display: 'HDFCBANK',   name: 'HDFC Bank Ltd',             sector: 'Banking' },
  { sym: 'ICICIBANK.NS',  display: 'ICICIBANK',  name: 'ICICI Bank Ltd',            sector: 'Banking' },
  { sym: 'KOTAKBANK.NS',  display: 'KOTAKBANK',  name: 'Kotak Mahindra Bank',       sector: 'Banking' },
  { sym: 'AXISBANK.NS',   display: 'AXISBANK',   name: 'Axis Bank Ltd',             sector: 'Banking' },
  { sym: 'SBIN.NS',       display: 'SBIN',       name: 'State Bank of India',       sector: 'Banking' },
  { sym: 'BAJFINANCE.NS', display: 'BAJFINANCE', name: 'Bajaj Finance Ltd',         sector: 'Banking' },
  // Energy
  { sym: 'RELIANCE.NS',   display: 'RELIANCE',   name: 'Reliance Industries',       sector: 'Energy' },
  { sym: 'ONGC.NS',       display: 'ONGC',       name: 'Oil & Natural Gas Corp',    sector: 'Energy' },
  { sym: 'POWERGRID.NS',  display: 'POWERGRID',  name: 'Power Grid Corporation',    sector: 'Energy' },
  { sym: 'NTPC.NS',       display: 'NTPC',       name: 'NTPC Ltd',                  sector: 'Energy' },
  // Pharma
  { sym: 'SUNPHARMA.NS',  display: 'SUNPHARMA',  name: 'Sun Pharmaceutical',        sector: 'Pharma' },
  { sym: 'DRREDDY.NS',    display: 'DRREDDY',    name: "Dr. Reddy's Laboratories",  sector: 'Pharma' },
  { sym: 'CIPLA.NS',      display: 'CIPLA',      name: 'Cipla Ltd',                 sector: 'Pharma' },
  { sym: 'DIVISLAB.NS',   display: 'DIVISLAB',   name: "Divi's Laboratories",       sector: 'Pharma' },
  // Auto
  { sym: 'TATAMOTORS.NS', display: 'TATAMOTORS', name: 'Tata Motors Ltd',           sector: 'Auto' },
  { sym: 'MARUTI.NS',     display: 'MARUTI',     name: 'Maruti Suzuki India',       sector: 'Auto' },
  { sym: 'M&M.NS',        display: 'M&M',        name: 'Mahindra & Mahindra',       sector: 'Auto' },
  { sym: 'BAJAJ-AUTO.NS', display: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd',            sector: 'Auto' },
  // FMCG
  { sym: 'HINDUNILVR.NS', display: 'HINDUNILVR', name: 'Hindustan Unilever',        sector: 'FMCG' },
  { sym: 'ITC.NS',        display: 'ITC',        name: 'ITC Ltd',                   sector: 'FMCG' },
  { sym: 'NESTLEIND.NS',  display: 'NESTLEIND',  name: 'Nestle India',              sector: 'FMCG' },
  { sym: 'BRITANNIA.NS',  display: 'BRITANNIA',  name: 'Britannia Industries',      sector: 'FMCG' },
];

// Indices for ticker bar
window.NSE_INDICES = [
  { sym: '^NSEI',   display: 'NIFTY 50' },
  { sym: '^NSEBANK', display: 'BANK NIFTY' },
  { sym: '^CNXIT',  display: 'NIFTY IT' },
  { sym: '^CNXPHARMA', display: 'NIFTY PHARMA' },
  { sym: 'INRUSD=X', display: 'USD/INR' },
  { sym: '^VIX',    display: 'INDIA VIX' },
];
