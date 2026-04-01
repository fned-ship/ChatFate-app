import React, { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import Peer, { SignalData, Instance } from "simple-peer";
import './style2.css'
import ChatBoxComp from "../../Components/chatBox";
import Cookies from 'js-cookie';


// Assuming you have the logged-in user's ID stored (e.g., from a login response)
const token = Cookies.get('token');
const currentUserId = Cookies.get('userId');


const socket: Socket = io(import.meta.env.VITE_SERVER_URL, {
  auth: { userId: currentUserId }
});


function RandomChatPage() {
  const [me, setMe] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | undefined>();

  const [isSearching, setIsSearching] = useState(false);
  const [partnerId, setPartnerId] = useState("");
  const [randomChatData, setRandomChatData] = useState(null);

  const [receivingCall, setReceivingCall] = useState<boolean>(false);
  const [caller, setCaller] = useState<string>("");
  const [callerSignal, setCallerSignal] = useState<string | SignalData>("");
  const [callAccepted, setCallAccepted] = useState<boolean>(false);
  
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Types for Refs
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Instance | null>(null);

  const findPartner = async () => {
    setIsSearching(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": ` Bearer ${token}` // Pass your JWT here
        }
      });
      const data = await response.json();
      console.log("Matching request sent:", data.message || "Searching...");
    } catch (error) {
      console.error("Match error:", error);
      setIsSearching(false);
    }
  };


  const callUser = (id: string) => {
      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream,
        config: {iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]}});

      peer.on("signal", (data: SignalData) => {
        socket.emit("callUser", {
          userToCall: id,
          signalData: data,
          from: me,
        });
      });

      peer.on("stream", (incomingStream: MediaStream) => {
        setRemoteStream(incomingStream);
      });

      socket.on("callAccepted", (signal: SignalData) => {
        setCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
  };

   useEffect(() => {
    // 1. Get Camera/Mic access
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      if (myVideo.current) myVideo.current.srcObject = currentStream;
    });

    // 2. Listen for the 'partner_found' event from your Match backend
    socket.on("partner_found", (data) => {
      console.log("Match Found!", data);
      setPartnerId(data.partnerId);
      setRandomChatData(data.randomChat);
      setIsSearching(false);
      


      
      // Optional: Auto-call the partner once found
    //   if(currentUserId<data.partnerId)
    //     callUser(data.partnerId); 
    });

    // 3. WebRTC signaling listeners
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });


    return () => {
      socket.off("partner_found");
      socket.off("callUser");
    };
  }, []);

  // Handle attaching remote stream to the video element
  useEffect(() => {
    if (callAccepted && remoteStream && userVideo.current) {
      userVideo.current.srcObject = remoteStream;
    }
  }, [callAccepted, remoteStream]);

  useEffect(() => {
    if (!callAccepted && !isSearching) {
      if(currentUserId<partnerId)
        callUser(partnerId);  
    }
  }, [callAccepted, isSearching]);




  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
      config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }, 
    ]
  }
    });

    peer.on("signal", (data: SignalData) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (incomingStream: MediaStream) => {
      setRemoteStream(incomingStream);
    });

    if (callerSignal) {
      peer.signal(callerSignal);
    }
    
    connectionRef.current = peer;
  };


    return (
        <main className="randomchatpage" >
    <span className="brand">hatFate</span>
    <img src="bg2.jpg" alt="" className="background"/>
    <div className="overlay"></div>
    <div className="common">
        <h2 className="title"> Common Interests:</h2>
        <div className="interest">
            Anime
        </div>
        <div className="interest" style={{backgroundColor: 'forestgreen'}}>
            Tennis
        </div>
        <div className="interest" style={{backgroundColor: 'yellow'}}>
            Chess
        </div>

    </div>
    <div className="screen">
        <div className="cams">
        <div className="videoscreen">
            <div className="sticker">
                <img src="download.png" alt="" />
                <span>Mohamed Adem Selmi</span>
            </div>
            <video autoPlay ref={myVideo}></video>
        </div>
        <div className="videoscreen second">
            <div className="sticker">
                <img src="download.png" alt="" />
                <span>Youssef Fned</span>
            </div>
            <video autoPlay ref={userVideo}></video>
        </div>
        </div>
        <div className="chatcontainer">
            <ChatBoxComp type="random" />
            {/* <div>
              <p>my id : {me} </p>
              <input type="text" placeholder="to call" />
              <button>Call</button>
        {receivingCall && !callAccepted && (
          <div style={{ border: "1px solid #ccc", marginTop: "20px", padding: "20px" }}>
            <h3>{caller} is calling...</h3>
            <button onClick={answerCall} style={{ background: "green", color: "white", padding: "10px 20px" }}>
              Answer
            </button>
          </div>
        )}
      </div> */}
            <div className="chatbuttons">
                <button className="btn skip" onClick={findPartner}>Skip</button>
                <button className="btn friend">Add Friend</button>
                <button className="btn report">!</button>
                
            </div>
            
        </div>
    </div>
    

</main>
    )
}

export default RandomChatPage