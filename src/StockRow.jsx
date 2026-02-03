import React from 'react';

const StockRow = ({ stock, index, onRemove }) => {
    // לוגיקה פנימית לחישובים (כדי שה-Map הראשי יהיה נקי)
    const isReversal = stock.Expectation === "Reversal Watch";
    const isBuySetup = stock.Action === "BUY SETUP" || stock.Action === "STRONG BUY";

    // חישוב יעד וסטופ (בצורה בטוחה)
    const targetPrice = stock.Price ? (stock.Price * 1.015).toFixed(2) : '-';
    const stopLoss = stock.Price ? (stock.Price * 0.95).toFixed(2) : '-';

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

            {/* Target & Stop Loss */}
            <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>${targetPrice}</td>
            <td style={{ color: '#f87171', fontWeight: 'bold' }}>${stopLoss}</td>

            <td>
                <span className={`action-badge ${isBuySetup ? 'action-buy' : 'action-wait'}`}>
                    {stock.Action || "Wait"}
                </span>
            </td>

            <td>{stock.Reasoning}</td>
            <td>{stock.Resistance}</td>
            <td>{stock.Expectation}</td>
            <td>{stock.Vol}</td>

            {/* כפתור מחיקה */}
            <td className="remove-btn" onClick={() => onRemove(stock)}>X</td>
        </tr>
    );
};

export default StockRow;