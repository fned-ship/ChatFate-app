import React, { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import Peer, { SignalData, Instance } from "simple-peer";
import './style2.css';
import ChatBoxComp from "../../Components/chatBox";
import Cookies from 'js-cookie';

const token         = Cookies.get('token');
const currentUserId = Cookies.get('userId');
const colors =["#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040",
    "#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040","#065535"]

const socket: Socket = io(import.meta.env.VITE_SERVER_URL, {
  auth: { userId: currentUserId }
});

// ── ICE config ────────────────────────────────────────────────────────────────
// Multiple STUN servers + a free TURN from Metered for cross-NAT support.
// Replace the TURN credentials with your own for production reliability.
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302'  },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls:       'turn:openrelay.metered.ca:80',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls:       'turn:openrelay.metered.ca:443',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls:       'turn:openrelay.metered.ca:443?transport=tcp',
      username:   'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

type PartnerStatus = 'searching' | 'connecting' | 'connected' | 'left';

// ── Overlay config ────────────────────────────────────────────────────────────
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
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      background: 'rgba(8, 8, 18, 0.85)',
      backdropFilter: 'blur(8px)',
      borderRadius: 'inherit',
      zIndex: 10,
    }}>
      {cfg.spin && (
        <div style={{
          width:       52,
          height:      52,
          borderRadius: '50%',
          borderWidth:  3,
          borderStyle:  'solid',
          borderColor:  `transparent transparent transparent ${cfg.accent}`,
          animation:    'spin 0.9s linear infinite',
        }} />
      )}
      <span style={{ fontSize: cfg.spin ? 26 : 44, lineHeight: 1 }}>{cfg.icon}</span>
      <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: 0, textAlign: 'center', padding: '0 16px' }}>
        {cfg.line1}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, textAlign: 'center', padding: '0 16px' }}>
        {cfg.line2}
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Safe peer destroy ─────────────────────────────────────────────────────────
// simple-peer can throw "_readableState undefined" if destroyed while a stream
// event is in flight. Wrapping destroy() in a try/catch + nextTick prevents this.
function safePeerDestroy(peer: Instance | null) {
  if (!peer) return;
  try {
    // Remove all listeners first so no callbacks fire after destroy
    peer.removeAllListeners();
    // Defer the actual destroy one tick so any in-flight emit finishes
    setTimeout(() => {
      try { peer.destroy(); } catch (_) { /* already gone */ }
    }, 0);
  } catch (_) { /* already gone */ }
}

// ── Main page ─────────────────────────────────────────────────────────────────
function RandomChatPage() {
  const [partnerId,      setPartnerId]      = useState('');
  const [randomChatData, setRandomChatData] = useState<any>(null);
  const [callAccepted,   setCallAccepted]   = useState(false);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);
  const [partnerStatus,  setPartnerStatus]  = useState<PartnerStatus>('searching');
  const [partnerData,   setPartnerData]   = useState(null);
  const [matchPayload,   setMatchPayload]   = useState(null);

  const myVideo   = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const peerRef   = useRef<Instance | null>(null);
  const streamRef = useRef<MediaStream | undefined>();

  const iAmInitiatorRef = useRef(false);
  const matchActiveRef  = useRef(false);
  const randomChatIdRef = useRef<string | null>(null);

  // ── Peer teardown ─────────────────────────────────────────────────────────
  const destroyPeer = useCallback(() => {
    safePeerDestroy(peerRef.current);
    peerRef.current = null;
    setCallAccepted(false);
    setRemoteStream(null);
    if (userVideo.current) userVideo.current.srcObject = null;
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = undefined;
    if (myVideo.current) myVideo.current.srcObject = null;
  }, []);

  // ── Build a peer — shared logic ───────────────────────────────────────────
  // trickle: true  → candidates are sent incrementally as they are discovered,
  //                  which is far more reliable across different networks / NATs.
  // With trickle=true the 'signal' event fires multiple times (once for the
  // offer/answer SDP, then once per ICE candidate), so the server must forward
  // ALL of them — which your existing callUser / answerCall / callAccepted
  // events already do correctly.
  const buildPeer = useCallback((
    initiator:   boolean,
    localStream: MediaStream,
  ): Instance => {
    return new Peer({
      initiator,
      trickle: true,           // ← changed from false; critical for cross-network
      stream:  localStream,
      config:  ICE_SERVERS,
    });
  }, []);

  // ── Attach common stream/error/close handlers ─────────────────────────────
  const attachCommonHandlers = useCallback((peer: Instance) => {
    peer.on('stream', (incoming: MediaStream) => {
      // Guard: if we already destroyed this peer, don't touch state
      if (peerRef.current !== peer) return;
      setRemoteStream(incoming);
      setCallAccepted(true);
      setPartnerStatus('connected');
    });

    peer.on('error', (err: Error) => {
      // Guard: only log if this peer is still the active one
      if (peerRef.current !== peer) return;
      console.error('[RTC] Peer error:', err.message);
    });

    peer.on('close', () => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Peer connection closed');
    });
  }, []);

  // ── Initiator (caller) ────────────────────────────────────────────────────
  const startCall = useCallback((targetUserId: string, localStream: MediaStream) => {
    console.log('[RTC] Starting call → initiator (trickle=true)');

    const peer = buildPeer(true, localStream);
    peerRef.current = peer;

    // Each signal event must be forwarded (offer SDP + each ICE candidate)
    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Initiator signal:', (data as any).type ?? 'candidate');
      socket.emit('callUser', {
        userToCall: targetUserId,
        signalData: data,
        from:       currentUserId,
      });
    });

    // callAccepted fires once for the answer SDP, then once per ICE candidate
    const onCallAccepted = (signal: SignalData) => {
      if (peerRef.current !== peer || (peer as any).destroyed) return;
      console.log('[RTC] callAccepted signal:', (signal as any).type ?? 'candidate');
      try { peer.signal(signal); } catch (e) { console.warn('[RTC] signal() after destroy ignored'); }
    };
    // Use .on (not .once) because trickle sends multiple signals
    socket.on('callAccepted', onCallAccepted);

    attachCommonHandlers(peer);

    // Clean up the socket listener when this peer dies
    peer.on('close', () => socket.off('callAccepted', onCallAccepted));
    peer.on('error', () => socket.off('callAccepted', onCallAccepted));
  }, [buildPeer, attachCommonHandlers]);

  // ── Callee (receiver) ─────────────────────────────────────────────────────
  const receiveCall = useCallback((callerDbId: string, offerSignal: SignalData, localStream: MediaStream) => {
    console.log('[RTC] Receiving call → callee (trickle=true)');

    const peer = buildPeer(false, localStream);
    peerRef.current = peer;

    // Each answer SDP + ICE candidate must be sent back
    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Callee signal:', (data as any).type ?? 'candidate');
      socket.emit('answerCall', { signal: data, to: callerDbId });
    });

    attachCommonHandlers(peer);

    // Feed the offer — after all listeners are attached
    try { peer.signal(offerSignal); } catch (e) { console.warn('[RTC] initial signal() failed:', e); }
  }, [buildPeer, attachCommonHandlers]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Camera / mic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(localStream => {
        streamRef.current = localStream;
        if (myVideo.current) myVideo.current.srcObject = localStream;
      })
      .catch(err => console.error('[Media] getUserMedia failed:', err));

    // 2. Match found
    socket.on('partner_found', (data: any) => {
      if (matchActiveRef.current) {
        console.warn('[Match] Duplicate partner_found — ignored');
        return;
      }
      matchActiveRef.current = true;

      const foundPartnerId: string = data.partnerId;
      console.log('[Match] Partner found! id =', foundPartnerId);
      setPartnerId(foundPartnerId);
      setRandomChatData(data.randomChat);
      setPartnerData(data.partner);
      setMatchPayload(data.matchPayload);
      setPartnerStatus('connecting');

      console.log("data:",data, "- userId" , currentUserId )

      if (data.randomChat?._id) {
        randomChatIdRef.current = data.randomChat._id;
        socket.emit('join_random_chat', { randomChatId: data.randomChat._id });
      }

      iAmInitiatorRef.current = (currentUserId ?? '') < foundPartnerId;
      console.log('[RTC] Role:', iAmInitiatorRef.current ? 'INITIATOR' : 'CALLEE');

      if (iAmInitiatorRef.current) {
        // 800 ms gives the callee time to register its 'callUser' listener
        setTimeout(() => {
          if (streamRef.current) {
            startCall(foundPartnerId, streamRef.current);
          } else {
            console.error('[RTC] No local stream — cannot start call');
          }
        }, 800);
      }
    });

    // 3. Incoming offer signals (callee) + trickle ICE candidates from initiator
    socket.on('callUser', (data: { signal: SignalData; from: string }) => {
      if (iAmInitiatorRef.current) return; // not for us

      if (!streamRef.current) {
        console.error('[RTC] No local stream — cannot answer');
        return;
      }

      // First callUser event → create the peer and feed the offer
      // Subsequent callUser events → feed trickle ICE candidates into existing peer
      if (!peerRef.current) {
        receiveCall(data.from, data.signal, streamRef.current);
      } else if (!(peerRef.current as any).destroyed) {
        console.log('[RTC] Callee feeding trickle candidate');
        try { peerRef.current.signal(data.signal); } catch (e) { /* ignore post-destroy */ }
      }
    });

    // 4. Partner left
    socket.on('partner_left', () => {
      console.log('[Socket] Partner left');
      destroyPeer();
      setPartnerId('');
      setRandomChatData(null);
      setPartnerStatus('left');
      randomChatIdRef.current = null;
      matchActiveRef.current  = false;
      iAmInitiatorRef.current = false;
    });
    
    
    const triggerSearch = () => {
    setPartnerStatus('searching');
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => console.log('[Match] Request sent:', d.message ?? d))
      .catch(err => {
        console.error('[Match] Error:', err);
        setPartnerStatus('searching');
      });
  };

    // 5. Start matchmaking
    triggerSearch();

    return () => {
      socket.off('partner_found');
      socket.off('callUser');
      socket.off('callAccepted');
      socket.off('partner_left');

      if (randomChatIdRef.current) {
        socket.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
      }
      fetch(`${import.meta.env.VITE_SERVER_URL}/api/waiting-room`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      destroyPeer();
      stopStream();
      matchActiveRef.current  = false;
      iAmInitiatorRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach remote stream to <video>
  useEffect(() => {
    if (callAccepted && remoteStream && userVideo.current) {
      userVideo.current.srcObject = remoteStream;
    }
  }, [callAccepted, remoteStream]);

  // ── Matchmaking trigger ───────────────────────────────────────────────────
  const triggerSearch = () => {
    setPartnerStatus('searching');
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
      method: 'POST',
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
  //I hope this works
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
      <span className="brand">hatFate</span>
      <img src="bg2.jpg" alt="" className="background" />
      <div className="overlay" />

      <div className="common">
        <h2 className="title">Common Interests:</h2>
        {matchPayload && matchPayload.commonInterests.map((int , index)=>(
          <div className="interest" style={{ backgroundColor: colors[index] }}>{int}</div>
        ))}
      </div>

      <div className="screen">
        <div className="cams">

          <div className="videoscreen">
            <div className="sticker">
              <img src="download.png" alt="" />
              <span>You</span>
            </div>
            <video autoPlay muted ref={myVideo} />
          </div>

          <div className="videoscreen second" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="sticker">
              <img src="download.png" alt="" />
              <span>{callAccepted ? 'Partner' : '…'}</span>
            </div>
            <video
              autoPlay
              ref={userVideo}
              style={{ opacity: partnerStatus === 'connected' ? 1 : 0, transition: 'opacity 0.4s' }}
            />
            <PartnerOverlay status={partnerStatus} />
          </div>

        </div>

        <div className="chatcontainer">
          {randomChatData && <ChatBoxComp type="random" socket={socket} currentUserId={currentUserId} partnerId={partnerId}  randomChatData={randomChatData} chatId={randomChatIdRef.current} partnerData={partnerData}  />}
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