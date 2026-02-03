import './App.css'
import React, {useEffect} from 'react'
import axios from "axios";
import Cookies from "js-cookie";
import { Routes, Route ,useNavigate} from "react-router-dom";

import StockDashboard from "./StockDashboard.jsx";

function App() {
    const [statusRegister, setStatusRegister] = React.useState(false);
    const[userName, setUserName] = React.useState("");
    const[userEmail, setUserEmail] = React.useState("");
    const[userPhone, setUserPhone] = React.useState("");
    const[password, setPassword] = React.useState("");
    const[errorCode, seterrorCode] = React.useState(0);
    const[loggedIn, setLoggedIn] = React.useState(false);
    const ERROR_MESSAGES= {0:"All good",
        1:"Missing information",
        2:"Password too short",
        3:"Email in the wrong format.",
        4:"Phone in the wrong format.",
        5:"UserName TAKEN"};
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true); // מצב המתנה לבדיקת העוגייה
    useEffect(()=>{
        if(loggedIn) {
            navigate("/StockDashboard");
        }
    }, [loggedIn,navigate]);
    useEffect(() => {
        // 1. קריאת העוגייה (get ולא set)
        const token = Cookies.get("token");
        if (token) {
            axios.get("http://localhost:5000/check-session", { withCredentials: true })
                .then(res => {
                    console.log(res);
                    if (res.data!=null && res.data.status) {
                        setLoggedIn(true);
                    } else {
                        // אם השרת אמר שהטוקן לא תקין, מנקים אותו
                        Cookies.remove("token");
                        setLoggedIn(false);
                    }
                })
                .catch(() => {
                    setLoggedIn(false);
                })
                .finally(() => {
                    setLoading(false); // עדכון אסינכרוני - בטוח לשימוש
                });
        } else {
            // אין טוקן - עוברים למסך לוגין
            setLoading(false);
        }
    }, []);
    if (loading) {
        return <div>בודק חיבור...</div>;
    }
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
        axios.get(`http://localhost:5000/Login?username=${userName}&password=${password}`, {
            withCredentials: true // חובה לעטוף בסוגריים מסולסלים
        })
            .then((res) => {
                if(res.data!==0) {
                    cleanAll();
                    const t = res.data.token;
                    Cookies.set("token", t, { expires: 1 });

                    setLoggedIn(true);
                    // console.log(res.data);
                }else{
                    seterrorCode(3);
                    // console.log(res.data);

                }
            })
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
