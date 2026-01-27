import './App.css'
import React from 'react'
import { Routes, Route ,} from "react-router-dom";

import StockDashboard from "./StockDashboard.jsx";
import Form from "./Form.jsx";

function App() {

        return (
        <>
            <Routes>
                <Route path="/Form" element={<Form />} />
                <Route path="/" element={<Form />} />
                <Route path="/StockDashboard" element={<StockDashboard />} />
            </Routes>
        </>


    )
}

export default App
