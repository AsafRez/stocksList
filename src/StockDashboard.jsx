import React, {useEffect, useState} from "react";
import './App.css';
import axios from "axios";
import Cookies from "js-cookie";

const StockDashboard = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stockSearch, setStockSearch] = useState("");
    const [addStock, setAddStock] = useState("");
    // רשימת תבניות שאנחנו מחפשים כדי לסמן "נרות היפוך"
    const reversalPatterns = ['Hammer', 'Doji', 'Engulfing', 'Inverted Hammer', 'היפוך'];
    const [lastTimeUpdate, setLastTimeUpdate] = useState(Infinity);
    const token = Cookies.get("token");
    const loadStocksFromDB = () => {
        axios.get("http://localhost:5000/Load-From-DB", {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then((res) => {
            console.log(res.data.stocks);
            let minTimeFound = Infinity;
            const normalizedData = res.data.stocks.map(stock => {
                const currentTime = new Date(stock.timeStape);
                if (currentTime < minTimeFound) {
                    minTimeFound = currentTime;

                }
                return {
                    Ticker: stock.ticker,
                    Price: stock.price,
                    RSI: stock.rsi,
                    Pattern: stock.pattern,
                    SMA50: stock.sma50,
                    SMA150: stock.sma150,
                    Trend: stock.trend,
                    timeStamp: stock.timeStape,
                }

            });
            setLastTimeUpdate(minTimeFound);
            console.log("Success");
            setStocks(normalizedData);
        })
    }


    useEffect(() => {
        loadStocksFromDB();

    }, []);
    const importFile = (event) => {
        const file = event.target.files[0]; // קבלת הקובץ שנבחר
        if (!file) return;
        if (file.size === 0) {
            alert("Empty file, do not upload");
            return;
        }

        const reader = new FileReader();
        // טעינת קובץ הטקסט מהתיקייה הציבורית (public)
        reader.onload = (e) => {
            const text = e.target.result;
            if (!text || text.trim().length === 0) {
                alert("No file uploaded");
                return;
            }
            const rawTickers = text.split(/[,\n]+/);

            const formattedStocks = rawTickers
                .map(item => item.trim())
                .filter(item => item !== "") // הסרת שורות ריקות
                .map(item => {
                    const tickerOnly = item.includes(':') ? item.split(':').pop() : item;
                    return {
                        Ticker: tickerOnly.trim().toUpperCase(),
                        Price: null,
                        RSI: null,
                        Trend: '-',
                        Pattern: '-',
                        timeStape: new Date().toLocaleTimeString() // הוספת חותמת זמן לטעינה
                    };
                });

            if (formattedStocks.length === 0) {
                alert("לא נמצאו טיקרים תקינים בקובץ.");
                return;
            }

            // הסרת כפילויות ועדכון ה-State
            const uniqueStocks = Array.from(new Set(formattedStocks.map(s => s.Ticker)))
                .map(ticker => formattedStocks.find(s => s.Ticker === ticker));

            setStocks(uniqueStocks);
            console.log(`Successfully imported ${uniqueStocks.length} stocks from ${file.name}`);
        };

        reader.readAsText(file); // קריאת הקובץ כטקסט
    };
    const isScannedToday = (timestamp) => {
        const scanDate = new Date(timestamp);
        const today = new Date();

        // בדיקה של יום, חודש ושנה
        return scanDate.getDate() === today.getDate() &&
            scanDate.getMonth() === today.getMonth() &&
            scanDate.getFullYear() === today.getFullYear();
    };
    const handleRunScanner = async () => {
        setLoading(true);
        try {
            console.log(isScannedToday(stocks[0]))
            const tickersToScan = stocks
                .filter(s => !isScannedToday(s.timeStamp))
                .map(s => s.Ticker);
            if (tickersToScan.length === 0) {
                alert("כל המניות כבר מעודכנות להיום!");
                setLoading(false);
                setLastTimeUpdate(Date.now)
                return;
            }

            const response = await fetch('http://localhost:4000/api/scan-bulk', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({tickers: tickersToScan}),
            });
            const result = await response.json();

            console.log("נתונים מהשרת:", result);

            if (Array.isArray(result)) {
                setStocks(prevStocks => prevStocks.map(oldStock => {
                    const updatedData = result.find(
                        r => r.Ticker.toUpperCase() === oldStock.Ticker.toUpperCase()
                    );

                    return updatedData
                        ? {...updatedData, timeStamp: Date.now()}
                        : oldStock;
                }));
            }
        } catch (error) {
            console.error("Scanner error:", error);
        }
        setLoading(false);
    };
    const [sortConfig, setSortConfig] = useState({key: 'Ticker', direction: 'asc'});

    const savetoDB = () => {
        const stocksData = encodeURIComponent(JSON.stringify(stocks));
        axios.get("http://localhost:5000/save-to-DB?ticks=" + stocksData,{
        headers: {'Authorization': `Bearer ${token}`}
        })
            .then((res) => {
                if(res.data.status){
                    alert("All Good");
                }else {
                    alert("Not Good");
                }

            });
    }
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({key, direction});
    };

    const removeStock = (item) => {
        axios.get("http://localhost:5000/Remove-Stock?Ticker=" + item.Ticker,{
            headers: {'Authorization': `Bearer ${token}`}
        })
            .then((res) => {
                console.log(res.data);
                setStocks(prevStocks => prevStocks.filter(stock => stock.Ticker !== item.Ticker));

            })
    }
    const addStockFun = () => {
        if (stocks.some(s => s.Ticker === addStock)) {
            alert("המניה כבר קיימת ברשימה");
            setAddStock("");
        } else {
            const newStockEntry = {
                Ticker: addStock,
                Price: null,
                RSI: null,
                Trend: '-',
                Pattern: '-',
                SMA50: null,
                SMA150: null,
                "Vol Ratio": '-',
                Reasoning: 'ניתוח רגיל',
                "Pattern Info": 'Daily Analysis'
            };
            setStocks(prevStocks => [...prevStocks, newStockEntry]);
        }
        setAddStock("");

    }
    const sortedStocks = React.useMemo(() => {
        let sortableStocks = [...stocks];

        // סינון לפי חיפוש
        if (stockSearch && stockSearch.trim() !== "") {
            sortableStocks = sortableStocks.filter(stock =>
                stock.Ticker?.toLowerCase().includes(stockSearch.toLowerCase())
            );
        }

        // מיון
        if (sortConfig.key !== null) {
            sortableStocks.sort((a, b) => {
                const aValue = a[sortConfig.key] ?? '';
                const bValue = b[sortConfig.key] ?? '';
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableStocks;
    }, [stocks, sortConfig, stockSearch]);
    return (
        <>

            <div className="dashboard-container">
                <button></button>
                <header className="dashboard-header">
                    <h1>Market Scanner Pro</h1>
                    <p>Last time updated: {new Date(lastTimeUpdate).toLocaleDateString('he-IL')}</p>
                    <div className="actions">
                        <input className="addStock" placeholder={"Enter stock to add"}
                               value={addStock} onChange={(e) => setAddStock(e.target.value)}/>
                        <button
                            onClick={() => addStockFun()}
                            className="add-button"
                            disabled={loading}
                        >
                            {"add Stock"}
                        </button>
                        <input className="stockSearch" placeholder={"Enter stock to search"}
                               onChange={(e) => setStockSearch(e.target.value.toUpperCase)}/>
                        <button
                            onClick={() => handleRunScanner()}
                            className="scan-button"
                            disabled={loading}
                        >
                            {loading ? "⌛ סורק נתונים..." : "🚀 הפעל סריקה עכשיו"}
                        </button>
                        <label htmlFor="file-upload" className="custom-file-upload">
                            Import list
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".txt,.csv" // הגבלה לסוגי קבצים רלוונטיים
                            onChange={importFile}
                        />
                        <button className="save-to-base"
                                onClick={savetoDB}
                        >Save to the Database
                        </button>

                    </div>

                </header>

                <div className="table-wrapper">
                    <table className="stock-table">
                        <thead>
                        <tr>
                            <th onClick={() => requestSort('Ticker')}>Ticker {sortConfig.key === 'Ticker' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : ''}</th>
                            <th onClick={() => requestSort('Price')}>Price</th>
                            <th onClick={() => requestSort('RSI')}>RSI</th>
                            <th onClick={() => requestSort("Pattern")}>Pattern</th>
                            <th onClick={() => requestSort("Trend")}>Trend</th>
                            <th onClick={() => requestSort('SMA50')}>SMA 50</th>
                            <th onClick={() => requestSort('SMA150')}>SMA 150</th>
                            <th onClick={() => requestSort('Entry')}>Entry Point</th>
                            <th onClick={() => requestSort('StopLoss')}>Stop Loss</th>
                            <th onClick={() => requestSort("Action")}>Action</th>
                            <th onClick={() => requestSort('Reason')}>Reasoning</th>
                            <th onClick={() => requestSort("Resistance")}>Resistance</th>
                            <th onClick={() => requestSort("Expectation")}>Expectation</th>
                            <th onClick={() => requestSort("Pattern Info")}>Pattern Info</th>
                        </tr>
                        </thead>
                        <tbody>

                        {sortedStocks.map((stock, index) => {
                            // לוגיקה משופרת: Buy Setup אם המחיר מעל שני הממוצעים וה-RSI לא גבוה מדי
                            const isBuySetup = stock.Price > stock.SMA50 && stock.Price > stock.SMA150 && stock.RSI < 60;
                            const reason = isBuySetup ? "STRONG BUY" : "ניתוח רגיל";

                            const isReversal = reversalPatterns.some(p =>
                                (stock.Pattern && stock.Pattern.includes(p)) ||
                                (stock["Pattern Info"] && stock["Pattern Info"].includes("היפוך"))
                            );

                            return (
                                <tr key={stock.Ticker || index} className={isReversal ? 'reversal-highlight' : ''}>
                                    <td className="ticker-name">{stock.Ticker}</td>
                                    <td>${stock.Price?.toFixed(2)}</td>
                                    <td>{stock.RSI?.toFixed(2)}</td>
                                    <td>{stock.Pattern}</td>
                                    <td className={stock.Trend === 'Bearish' ? 'trend-bearish' : 'trend-bullish'}>
                                        {stock.Trend}
                                    </td>
                                    <td>{stock.SMA50 ? `$${stock.SMA50.toFixed(2)}` : '-'}</td>
                                    <td>{stock.SMA150 ? `$${stock.SMA150.toFixed(2)}` : '-'}</td>
                                    <td style={{color: '#38bdf8', fontWeight: 'bold'}}>
                                        {stock.Price ? `$${(stock.Price * 1.015).toFixed(2)}` : '-'}
                                    </td>
                                    <td style={{color: '#f87171', fontWeight: 'bold'}}>
                                        {stock.Price ? `$${(stock.Price * 0.95).toFixed(2)}` : '-'}
                                    </td>
                                    <td>
                    <span className={`action-badge ${isBuySetup ? 'action-buy' : 'action-wait'}`}>
                        {reason}
                    </span>
                                    </td>
                                    <td>{stock.Reasoning}</td>
                                    <td>{stock.Resistance}</td>
                                    <td>{stock.Expectation}</td>
                                    <td className="pattern-info-cell">{stock["Pattern Info"]}</td>
                                    <td onClick={() => removeStock(stock)}>X</td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default StockDashboard;