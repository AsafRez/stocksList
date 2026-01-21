import './App.css'
import React from 'react'
import axios from "axios";

import StockDashboard from "./StockDashboard.jsx";

function App() {
    const [statusRegister, setStatusRegister] = React.useState(false);
    const[userName, setUserName] = React.useState("");
    const[userEmail, setUserEmail] = React.useState("");
    const[userPhone, setUserPhone] = React.useState("");
    const[password, setPassword] = React.useState("");
    const[errorCode, seterrorCode] = React.useState(0);
    const[loggedIn, setLoggedIn] = React.useState(false);
    const [userloginId,setUserloginId] = React.useState(0);
    const ERROR_MESSAGES= {0:"All good",
        1:"Missing information",
        2:"Password too short",
        3:"Email in the wrong format.",
        4:"Phone in the wrong format.",
    5:"UserName TAKEN"};
    const Register=()=>{
        if(userName.length===0 || userEmail.length===0||password.length===0||userPhone.length===0){
            seterrorCode(1);
            return;
        }
        if(password.length<4){
            seterrorCode(2);
            return;
        }
        if(!userEmail.includes("@") || userEmail.charAt(0)==='@' ||userEmail.charAt(userEmail.length-1)==='@'){
            seterrorCode(3);
            return;
        }
        if(userPhone.length!=9 || !/^\d+$/.test(userPhone)){
            seterrorCode(4);
            return;
        }
        axios.get("http://localhost:5000/Register?username="+userName+"&password="+password+"&email="+userEmail+"&phone="+userPhone).then((res)=>{
            if(res.data) {
                cleanAll();
                setStatusRegister(true);
                alert("Please login now")
            }else{
                seterrorCode(5)
            }
        })
    }
    const Login=()=>{
        if(userName.length===0 ||password.length===0){
            seterrorCode(1);
            return;
        }
        if(password.length<4){
            seterrorCode(2);
            return;
        }
        axios.get("http://localhost:5000/Login?username="+userName+"&password="+password).then((res)=>{
            if(res.data!==0) {
                cleanAll();
                setLoggedIn(true);
                console.log(res.data);
                setUserloginId(res.data);
            }else{
                seterrorCode(3);
                console.log(res.data);

            }
        })
    }
    if(loggedIn){
        return <StockDashboard data={userloginId} />; // הקומפוננטה של הפרויקט שלך
    }
    function cleanAll(){
        seterrorCode(0);
        setUserName("");
        setUserEmail("");
        setUserPhone("");
        setPassword("");

    }
    return (
        <>Welcome to the StockWatcher Site
            {!statusRegister ? (
                <div>
                    <div className="Form-Register">
                        <div>
                            שם משתמש: <input value={userName} onChange={(e)=>{setUserName(e.target.value)}} type={"text"}/>
                        </div>
                        <div>
                            סיסמא:<input value={password} onChange={(e)=>{setPassword(e.target.value)}} type={"password"}/>
                        </div>
                        <div>

                            אימייל:<input value={userEmail} onChange={(e)=>{setUserEmail(e.target.value)}} type={"email"}/>
                        </div>
                        <div>
                            טלפון:<input value={userPhone} onChange={(e)=>{setUserPhone(e.target.value)}} type={"tel"}/>
                        </div>
                        <button onClick={()=>Register()}>Register</button>
                        <div>
                            משתמש קיים?
                            <span onClick={() => {setStatusRegister(!statusRegister)
                                cleanAll()}
                            }>לחץ כאן</span>
                        </div>
                    </div>
                </div>

            ) : (<div>
                <div className="Form-Register">
                    שם משתמש:<input value={userName} onChange={(e)=>{setUserName(e.target.value)}} type={"text"}/>
                </div>

                סיסמא:<input value={password} onChange={(e)=>{setPassword(e.target.value)}} type={"password"}/>
                <div>
                    <button onClick={()=>Login()}>Login</button>

                </div>
                <div>
                    אין משתמש?
                    <span onClick={() => {setStatusRegister(!statusRegister)
                        cleanAll()
                  }}>לחץ כאן</span>
                </div>
            </div>)
            }
            <div className="Error"> {ERROR_MESSAGES[errorCode]}</div>

        </>


    )
}

export default App
