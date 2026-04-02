import React, { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import Peer, { SignalData, Instance } from "simple-peer";
import './style2.css';
import ChatBoxComp from "../../Components/chatBox";
import Cookies from 'js-cookie';

const token         = Cookies.get('token');
const currentUserId = Cookies.get('userId');

const socket: Socket = io(import.meta.env.VITE_SERVER_URL, {
  auth: { userId: currentUserId }
});

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls:       'turn:openrelay.metered.ca:80',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// Four possible states for the partner video panel
type PartnerStatus = 'searching' | 'connecting' | 'connected' | 'left';

// ── Partner overlay component ─────────────────────────────────────────────────
const OVERLAY_CONFIG: Record<
  Exclude<PartnerStatus, 'connected'>,
  { icon: string; line1: string; line2: string; accent: string; spin: boolean }
> = {
  searching: {
    icon:   '🔍',
    line1:  'Finding you a partner…',
    line2:  'This usually takes a few seconds',
    accent: '#6c63ff',
    spin:   true,
  },
  connecting: {
    icon:   '⚡',
    line1:  'Partner found!',
    line2:  'Establishing connection…',
    accent: '#f0a500',
    spin:   true,
  },
  left: {
    icon:   '👋',
    line1:  'Partner left the chat',
    line2:  'Hit Skip to find someone new',
    accent: '#e05252',
    spin:   false,
  },
};

function PartnerOverlay({ status }: { status: PartnerStatus }) {
  if (status === 'connected') return null;

  const cfg = OVERLAY_CONFIG[status];

  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            12,
      background:     'rgba(8, 8, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      borderRadius:   'inherit',
      zIndex:         10,
    }}>
      {cfg.spin && (
        <div style={{
          width:          52,
          height:         52,
          borderRadius:   '50%',
          border:         `3px solid ${cfg.accent}`,
          borderTopColor: 'transparent',
          animation:      'spin 0.9s linear infinite',
        }} />
      )}

      <span style={{ fontSize: cfg.spin ? 26 : 44, lineHeight: 1 }}>{cfg.icon}</span>

      <p style={{
        color:      '#fff',
        fontWeight: 600,
        fontSize:   15,
        margin:     0,
        textAlign:  'center',
        padding:    '0 16px',
      }}>
        {cfg.line1}
      </p>

      <p style={{
        color:     'rgba(255,255,255,0.5)',
        fontSize:  12,
        margin:    0,
        textAlign: 'center',
        padding:   '0 16px',
      }}>
        {cfg.line2}
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function RandomChatPage() {
  const [stream,         setStream]         = useState<MediaStream | undefined>();
  const [partnerId,      setPartnerId]      = useState('');
  const [randomChatData, setRandomChatData] = useState<any>(null);
  const [callAccepted,   setCallAccepted]   = useState(false);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);
  const [partnerStatus,  setPartnerStatus]  = useState<PartnerStatus>('searching');

  const myVideo   = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const peerRef   = useRef<Instance | null>(null);
  const streamRef = useRef<MediaStream | undefined>();

  const iAmInitiatorRef = useRef(false);
  const matchActiveRef  = useRef(false);
  const randomChatIdRef = useRef<string | null>(null);   // track joined room for cleanup

  // ── Peer teardown ─────────────────────────────────────────────────────────
  const destroyPeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    setCallAccepted(false);
    setRemoteStream(null);
    if (userVideo.current) userVideo.current.srcObject = null;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = undefined;
    setStream(undefined);
    if (myVideo.current) myVideo.current.srcObject = null;
  }, []);

  // ── Initiator peer (caller) ───────────────────────────────────────────────
  const startCall = useCallback((targetUserId: string, localStream: MediaStream) => {
    console.log('[RTC] Starting call → initiator');

    const peer = new Peer({ initiator: true, trickle: false, stream: localStream, config: ICE_SERVERS });

    peer.on('signal', (data: SignalData) => {
      socket.emit('callUser', { userToCall: targetUserId, signalData: data, from: currentUserId });
    });

    const onCallAccepted = (signal: SignalData) => {
      if (peerRef.current && !(peerRef.current as any).destroyed) {
        peerRef.current.signal(signal);
      }
    };
    socket.once('callAccepted', onCallAccepted);

    peer.on('stream', (incoming: MediaStream) => {
      setRemoteStream(incoming);
      setCallAccepted(true);
      setPartnerStatus('connected');
    });

    peer.on('error', (err: Error) => {
      console.error('[RTC] Initiator error:', err.message);
      socket.off('callAccepted', onCallAccepted);
    });
    peer.on('close', () => socket.off('callAccepted', onCallAccepted));

    peerRef.current = peer;
  }, []);

  // ── Callee peer (receiver) ────────────────────────────────────────────────
  const receiveCall = useCallback((callerDbId: string, offerSignal: SignalData, localStream: MediaStream) => {
    console.log('[RTC] Receiving call → callee');

    const peer = new Peer({ initiator: false, trickle: false, stream: localStream, config: ICE_SERVERS });

    peer.on('signal', (data: SignalData) => {
      socket.emit('answerCall', { signal: data, to: callerDbId });
    });

    peer.on('stream', (incoming: MediaStream) => {
      setRemoteStream(incoming);
      setCallAccepted(true);
      setPartnerStatus('connected');
    });

    peer.on('error', (err: Error) => console.error('[RTC] Callee error:', err.message));

    peer.signal(offerSignal);
    peerRef.current = peer;
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Camera / mic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(localStream => {
        streamRef.current = localStream;
        setStream(localStream);
        if (myVideo.current) myVideo.current.srcObject = localStream;
      })
      .catch(err => console.error('[Media] getUserMedia failed:', err));

    // Match found
    socket.on('partner_found', (data: any) => {
      if (matchActiveRef.current) return;
      matchActiveRef.current = true;

      const foundPartnerId: string = data.partnerId;
      setPartnerId(foundPartnerId);
      setRandomChatData(data.randomChat);
      setPartnerStatus('connecting');

      // Join the random chat room — server uses this to track us for disconnect events
      if (data.randomChat?._id) {
        randomChatIdRef.current = data.randomChat._id;
        socket.emit('join_random_chat', { randomChatId: data.randomChat._id });
      }

      iAmInitiatorRef.current = (currentUserId ?? '') < foundPartnerId;
      console.log('[RTC] Role:', iAmInitiatorRef.current ? 'INITIATOR' : 'CALLEE');

      if (iAmInitiatorRef.current) {
        setTimeout(() => {
          if (streamRef.current) startCall(foundPartnerId, streamRef.current);
        }, 600);
      }
    });

    // Incoming offer — callee only
    socket.on('callUser', (data: { signal: SignalData; from: string }) => {
      if (iAmInitiatorRef.current) return;
      if (!streamRef.current)     return;
      receiveCall(data.from, data.signal, streamRef.current);
    });

    // Partner left (covers: explicit leave_random_chat AND abrupt disconnect)
    socket.on('partner_left', () => {
      console.log('[Socket] Partner left');
      destroyPeer();
      setPartnerId('');
      setRandomChatData(null);
      setPartnerStatus('left');          // ← shows "Partner left" overlay
      randomChatIdRef.current = null;
      matchActiveRef.current  = false;
      iAmInitiatorRef.current = false;
    });

    // Kick off matchmaking
    triggerSearch();

    return () => {
      socket.off('partner_found');
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('partner_left');

      // Tell server we're leaving so partner gets partner_left
      if (randomChatIdRef.current) {
        socket.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
      }
      // Also pull us from Redis waiting room if still searching
      fetch(`${import.meta.env.VITE_SERVER_URL}/api/waiting-room`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      destroyPeer();
      stopStream();
      matchActiveRef.current  = false;
      iAmInitiatorRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach remote stream to <video> once available
  useEffect(() => {
    if (callAccepted && remoteStream && userVideo.current) {
      userVideo.current.srcObject = remoteStream;
    }
  }, [callAccepted, remoteStream]);

  // ── Matchmaking helper (also used by Skip) ────────────────────────────────
  const triggerSearch = () => {
    setPartnerStatus('searching');
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => console.log('[Match] Request sent:', d.message ?? d))
      .catch(err => {
        console.error('[Match] Error:', err);
        setPartnerStatus('searching');
      });
  };

  // ── Skip ──────────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    if (randomChatIdRef.current) {
      socket.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
      randomChatIdRef.current = null;
    }
    destroyPeer();
    setPartnerId('');
    setRandomChatData(null);
    matchActiveRef.current  = false;
    iAmInitiatorRef.current = false;
    triggerSearch();
  }, [destroyPeer]);

  return (
    <main className="randomchatpage">
      <span className="brand">ChatFate</span>
      <img src="bg2.jpg" alt="" className="background" />
      <div className="overlay" />

      <div className="common">
        <h2 className="title">Common Interests:</h2>
        <div className="interest">Anime</div>
        <div className="interest" style={{ backgroundColor: 'forestgreen' }}>Tennis</div>
        <div className="interest" style={{ backgroundColor: 'yellow' }}>Chess</div>
      </div>

      <div className="screen">
        <div className="cams">

          {/* My video — always visible */}
          <div className="videoscreen">
            <div className="sticker">
              <img src="download.png" alt="" />
              <span>You</span>
            </div>
            <video autoPlay muted ref={myVideo} />
          </div>

          {/* Partner video — overlaid with status panel until fully connected */}
          <div className="videoscreen second" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="sticker">
              <img src="download.png" alt="" />
              <span>{callAccepted ? 'Partner' : '…'}</span>
            </div>
            {/* Video is rendered but hidden until stream is live */}
            <video
              autoPlay
              ref={userVideo}
              style={{ opacity: partnerStatus === 'connected' ? 1 : 0, transition: 'opacity 0.4s' }}
            />
            <PartnerOverlay status={partnerStatus} />
          </div>

        </div>

        <div className="chatcontainer">
          {randomChatData && <ChatBoxComp type="random" />}
          <div className="chatbuttons">
            <button className="btn skip"   onClick={handleSkip}>Skip</button>
            <button className="btn friend" disabled={!callAccepted}>Add Friend</button>
            <button className="btn report" disabled={!callAccepted}>!</button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default RandomChatPage;