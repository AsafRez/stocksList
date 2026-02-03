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

function calculateRSI(prices, periods = 14) {
    if (prices.length <= periods) return null;

    let gains = 0;
    let losses = 0;

    // 1. חישוב הממוצע הראשוני (Simple Average) ל-14 הימים הראשונים
    for (let i = 1; i <= periods; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / periods;
    let avgLoss = losses / periods;

    // 2. חישוב Wilder's Smoothing לכל שאר המחירים (זה הסוד!)
    for (let i = periods + 1; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        const currentGain = diff >= 0 ? diff : 0;
        const currentLoss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (periods - 1) + currentGain) / periods;
        avgLoss = (avgLoss * (periods - 1) + currentLoss) / periods;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
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
    const { tickers,interval } = req.body;
    if (!tickers) return res.status(400).json([]);
    console.log("Getting information")
    const cleanTickers = tickers.map(t => t.includes(':') ? t.split(':').pop().toUpperCase() : t.toUpperCase());
    const interval1=interval["time"]==="d"?('1d'):('1wk')
    console.log(interval1);
    const period=interval["time"]==="d"?('2024-01-01'):('2021-01-01')
    console.log(period);
    try {
        const results = await Promise.all(cleanTickers.map(async (symbol) => {
            try {
                const quote = await yahooFinance.quote(symbol);
                const chart = await yahooFinance.chart(symbol, {period1: period, interval: interval1});

                const currentPrice = quote.regularMarketPrice;
                const prices = chart.quotes.map(q => q.close).filter(p => p != null);

                if (prices[prices.length - 1] !== currentPrice) {
                    prices.push(currentPrice);
                }

                const rsiValue = calculateRSI(prices);
                const sma50 = calculateSMA(prices, 50);
                const sma150 = calculateSMA(prices, 150);

                let action="";
                const pattern = detectPattern(chart.quotes);
                const isBullish = sma150 && currentPrice > sma150;
                const trend = isBullish ? 'Bullish' : 'Bearish';
                let reasoning = "ניתוח רגיל";
                if (isBullish) {
                    if (currentPrice > sma50 && rsiValue < 60) {
                        action = "STRONG BUY";
                        reasoning = "טרנד שורי חזק: מעל ממוצע 150 ו-50";
                    } else if (currentPrice > sma50) {
                        action = "BUY SETUP";
                        reasoning = "במגמת עלייה, מחיר נתמך מעל SMA50";
                    }
                } else {
                    // לוגיקה למצב Bearish (כמו DIS)
                    if (currentPrice > sma50 && rsiValue < 30) {
                        action = "REVERSAL WATCH";
                        reasoning = "טרנד דובי, אך נראה ניסיון היפוך מעל SMA50 עם RSI נמוך";
                    } else {
                        action = "AVOID";
                        reasoning = "טרנד דובי: מחיר מתחת לממוצעים המרכזיים";
                    }
                }




                return {
                    Ticker: symbol,
                    Price: currentPrice,
                    RSI: rsiValue,
                    Vol: quote.averageDailyVolume10Day,
                    Pattern: pattern,
                    Trend: trend,
                    SMA50: sma50,
                    SMA150: sma150,
                    Resistance: Math.max(...prices.slice(-20)).toFixed(2),
                    Expectation: pattern !== "-" ? "Reversal Watch" : "Neutral",
                    Action: action,
                    Reasoning: reasoning,
                    timeStape:new Date()

                };
            } catch (e) {
                console.error(`Skip ${symbol}: ${e.message}`);
                return null;
            }
        }));

        res.json(results.filter(r => r !== null));
        console.log("Done :D")
    } catch (err) {
        res.status(500).json([]);
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`🚀 שרת ה-Yahoo Finance המעודכן רץ בפורט ${PORT}`));