import React, {useEffect, useState} from "react";
import './App.css';
import axios from "axios";
import Cookies from "js-cookie";
import {useNavigate} from "react-router-dom";
import StockRow from "./StockRow";

const StockDashboard = () => {
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stockSearch, setStockSearch] = useState("");
    const [addStock, setAddStock] = useState("");
    const[time, setTime] = useState("d");
    const [lastTimeUpdate, setLastTimeUpdate] = useState(Infinity);
    const token = Cookies.get("token");
    const loadStocksFromDB = () => {
        axios.get("https://stock-scanner-backend-pt4o.onrender.com/Load-From-DB", {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }).then((res) => {
            let minTimeFound = Infinity;
            const normalizedData = res.data.stocks.map(stock => {
                const currentTime = new Date(stock.timeStamp);
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
                    Reasoning: stock.Reasoning,
                    Reasistance:stock.Resistance,
                    Expectation: stock.Expectation,
                    "Pattern Info": stock["Pattern Info"],
                    timeStamp: stock.timeStape,
                }

            });
            setLastTimeUpdate(minTimeFound);
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
                        SMA50: 0,
                        SMA150: 0,
                        Reasoning: "-",
                        Reasistance:"-",
                        Expectation: "-",
                        "Pattern Info": "-",
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
    const navigate = useNavigate();

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
            const tickersToScan = stocks
                .filter(s => !isScannedToday(s.timeStamp))
                .map(s => s.Ticker);
            if (tickersToScan.length === 0) {
                alert("כל המניות כבר מעודכנות להיום!");
                setLoading(false);
                setLastTimeUpdate(Date.now)
                return;
            }

            const response = await fetch('https://stock-scanner-proxy.onrender.com/api/scan-bulk', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({tickers: tickersToScan, interval:{time}}),
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
        const cleanStocks = stocks.filter(stock =>
            stock.RSI !== null &&
            stock.RSI !== undefined &&
            stock.RSI !== 0.0 &&
            stock.Price > 0
        );
        setStocks(cleanStocks);
        const payload = { ticks: cleanStocks,interval:{time} };
        console.log(payload);
        axios.post("https://stock-scanner-backend-pt4o.onrender.com/save-to-DB", payload, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true // חובה כדי שהשרת יזהה את הסשן שלך
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
        axios.get("https://stock-scanner-backend-pt4o.onrender.com/Remove-Stock?Ticker=" + item.Ticker,{
            headers: {'Authorization': `Bearer ${token}`}
        })
            .then((res) => {
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
                Vol: '-',
                Reasoning: 'ניתוח רגיל',
            };
            setStocks(prevStocks => [...prevStocks, newStockEntry]);
            console.log(stocks);
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
                <button  onClick={()=>{
                    Cookies.remove("token");
                    navigate("/Form");

                }}> Log out</button>
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
                               onChange={(e) => setStockSearch(e.target.value.toUpperCase())}/>
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
                        <label className="interval-wrapper">
                            Interval of search: {time}<input type={"checkbox"} placeholder={time} checked={time==="w"} onChange={(e)=>time==="w" ? (setTime("d")): setTime("w")}/>
                        </label>
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
                            <th onClick={() => requestSort("Vol")}>Vol</th>
                        </tr>
                        </thead>
                        <tbody>
                        {sortedStocks.map((stock, index) => (
                            <StockRow
                                key={stock.Ticker + index}
                                stock={stock}
                                index={index}
                                onRemove={removeStock}
                            />
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default StockDashboard;