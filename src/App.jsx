import './App.css'
import React from 'react'
import StockDashboard from "./StockDashboard.jsx";
function App() {

  return (
    <div className="App">
        <header className="App-header">
            <h1>מערכת מעקב אחר המניות</h1>
        </header>
        <main>
            <StockDashboard/>
        </main>

    </div>
  )
}

export default App
