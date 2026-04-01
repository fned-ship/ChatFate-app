
import {  useState } from 'react'
import './chatboxstyle.css'
const ChatBoxComp= ({type})=>{
    const [typing,setTyping] = useState<string>("")
    return (<div className="flux" style={type=="random"?{backgroundColor:'rgb(94 81 81 / 21%)',borderRadius:'10px'}:{}}>
                <div className="fluxMessages" >
                    <div className="myMessage" >
                        waaaa

                        
                    </div>
                    <div className="otherMessage">
                       waaa
                       {/* <div className="actions">
                        <img src="reply.png" alt="" />
                        <img src="heart.png" alt="" />

                       </div> */}
                    </div>
                    
                    <div className="otherMessage">
                       ch9awlk
                       {/* <div className="actions">
                        <img src="reply.png" alt="" />
                        <img src="heart.png" alt="" />

                       </div> */}
                    </div>

                    <div id='typingIndicator' style={{display: typing.length>0? "flex":"none"}}>
                        <img src="user4.jpg" alt="" />
                        typing
                    </div>
                   

                    
                </div>
                <div className="replyto">
                    <span>Replying to:</span>
                    <span>ch9awlk </span>
                </div>
                <div className="picsChosen">
                    <div>
                        <img src='moon.png'/>
                        <button></button>
                    </div>
                    <div>
                        <img src='user3.jpg'/>
                        <button></button>
                    </div>
                </div>
                <div className="controls">
                    <input type="text" placeholder="send a message" onChange={(e)=>{setTyping(e.target.value)}} />
                    { type != 'random' && <div className="sendButton">
                        <input type="file" multiple accept="image/*" onChange={(e)=>{console.log(e.target.files)}}></input>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                    
<path fill-rule="evenodd" clip-rule="evenodd" d="M23 4C23 2.34315 21.6569 1 20 1H4C2.34315 1 1 2.34315 1 4V20C1 21.6569 2.34315 23 4 23H20C21.6569 23 23 21.6569 23 20V4ZM21 4C21 3.44772 20.5523 3 20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4Z" fill="#0F0F0F"/>
<path d="M4.80665 17.5211L9.1221 9.60947C9.50112 8.91461 10.4989 8.91461 10.8779 9.60947L14.0465 15.4186L15.1318 13.5194C15.5157 12.8476 16.4843 12.8476 16.8682 13.5194L19.1451 17.5039C19.526 18.1705 19.0446 19 18.2768 19H5.68454C4.92548 19 4.44317 18.1875 4.80665 17.5211Z" fill="#0F0F0F"/>
<path d="M18 8C18 9.10457 17.1046 10 16 10C14.8954 10 14 9.10457 14 8C14 6.89543 14.8954 6 16 6C17.1046 6 18 6.89543 18 8Z" fill="#0F0F0F"/>
</svg></div>}
                <svg xmlns="http://www.w3.org/2000/svg"   viewBox="0 0 24 24" version="1.1">
                <path ill-rule="evenodd" clip-rule="evenodd" d="M21.4325,4.86103 L15.4325,20.361 C15.175,21.0261 14.324,21.2156 13.8087,20.7227 L10.4266,17.4876 L8.35348,19.5607 C8.0385,19.8757 7.49993,19.6526 7.49993,19.2072 L7.49993,14.6882 L2.30868,9.72268 C1.74196,9.1806 1.99133,8.22685 2.75086,8.03155 L20.2509,3.53155 C21.0389,3.32889 21.7262,4.10218 21.4325,4.86103 Z M19,6.00006 L8.03159,13.1534 L9.76704,14.8134 L19,6.00006 Z">
</path>
</svg>
                </div>
                
            </div>)
}

export default ChatBoxComp