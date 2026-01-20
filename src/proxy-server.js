import yf_module from 'yahoo-finance2';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// פונקציה לחישוב ממוצע נע פשוט (SMA)
function calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return parseFloat((sum / period).toFixed(2));
}

// חישוב RSI של 14 תקופות על סמך נתוני סגירה
function calculateRSI(prices) {
    if (prices.length < 15) return 50; // ברירת מחדל ניטרלית
    const relevantPrices = prices.slice(-15);
    let gains = 0, losses = 0;

    for (let i = 1; i < relevantPrices.length; i++) {
        let difference = relevantPrices[i] - relevantPrices[i - 1];
        if (difference >= 0) gains += difference;
        else losses -= difference;
    }

    if (losses === 0) return 100;
    let rs = (gains / 14) / (losses / 14);
    return parseFloat((100 - (100 / (1 + rs))).toFixed(2));
}

// פונקציית זיהוי תבניות הכוללת "נר בולע" (Engulfing)
function detectPattern(quotes) {
    if (quotes.length < 2) return "-";

    const current = quotes[quotes.length - 1];
    const prev = quotes[quotes.length - 2];

    // נתוני נר נוכחי
    const cOpen = current.open, cClose = current.close, cHigh = current.high, cLow = current.low;
    // נתוני נר קודם
    const pOpen = prev.open, pClose = prev.close;

    const body = Math.abs(cClose - cOpen);
    const candleHeight = cHigh - cLow;
    if (candleHeight === 0) return "-";

    // 1. נר בולע שורי (Bullish Engulfing) 🚀
    if (pClose < pOpen && cClose > cOpen && cClose >= pOpen && cOpen <= pClose) {
        return "Bullish Engulfing 🚀";
    }

    // 2. נר בולע דובי (Bearish Engulfing) 📉
    if (pClose > pOpen && cClose < cOpen && cClose <= pOpen && cOpen >= pClose) {
        return "Bearish Engulfing 📉";
    }

    const upperWick = cHigh - Math.max(cOpen, cClose);
    const lowerWick = Math.min(cOpen, cClose) - cLow;

    // 3. Doji
    if (body <= candleHeight * 0.1) return "Doji ⚖️";

    // 4. Hammer
    if (lowerWick >= body * 2 && upperWick <= body * 0.5 && body > 0) return "Hammer 🔨";

    return "-";
}

const yahooFinance = new (yf_module.YahooFinance || yf_module)();

app.post('/api/scan-bulk', async (req, res) => {
    const { tickers } = req.body;
    if (!tickers) return res.status(400).json([]);

    const cleanTickers = tickers.map(t => t.includes(':') ? t.split(':').pop().toUpperCase() : t.toUpperCase());

    try {
        const results = await Promise.all(cleanTickers.map(async (symbol) => {
            try {
                const quote = await yahooFinance.quote(symbol);
                const chart = await yahooFinance.chart(symbol, { period1: '2024-01-01', interval: '1d' });

                const prices = chart.quotes.map(q => q.close).filter(p => p != null);
                const currentPrice = quote.regularMarketPrice;
                const rsiValue = calculateRSI(prices);
                const sma50 = calculateSMA(prices, 50);
                const sma150 = calculateSMA(prices, 150);

                // סנכרון לוגיקה עבור Reasoning ו-Action
                let reasoning = "ניתוח רגיל";
                if (currentPrice > sma50 && currentPrice > sma150 && rsiValue < 60) {
                    reasoning = "STRONG BUY";
                } else if (currentPrice > sma50 && rsiValue < 60) {
                    reasoning = "BUY SETUP";
                }

                const pattern = detectPattern(chart.quotes);

                return {
                    Ticker: symbol,
                    Price: currentPrice,
                    RSI: rsiValue,
                    "Vol Ratio": (quote.regularMarketVolume / quote.averageDailyVolume10Day).toFixed(2),
                    Pattern: pattern,
                    Trend: (sma150 && currentPrice > sma150) ? 'Bullish' : 'Bearish',
                    SMA50: sma50,
                    SMA150: sma150,
                    Resistance: Math.max(...prices.slice(-20)).toFixed(2),
                    Expectation: pattern !== "-" ? "Reversal Watch" : "Neutral",
                        "Pattern Info": pattern !== "-" ? `Potential ${pattern}` : `Price is ${currentPrice > sma150 ? 'Above' : 'Below'} SMA150`,
                    Action: reasoning,
                    Reasoning: reasoning,
                    timeStape:new Date()

                };
            } catch (e) {
                console.error(`Skip ${symbol}: ${e.message}`);
                return null;
            }
        }));

        res.json(results.filter(r => r !== null));
    } catch (err) {
        res.status(500).json([]);
    }
});

const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 שרת ה-Yahoo Finance המעודכן רץ בפורט ${PORT}`));