import React, { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import Peer, { SignalData, Instance } from "simple-peer";
import './style2.css';
import ChatBoxComp from "../../Components/chatBox";
import Cookies from 'js-cookie';
import ReactCountryFlag from 'react-country-flag';

const token         = Cookies.get('token');
const currentUserId = Cookies.get('userId');
const user          = JSON.parse(Cookies.get('user') ?? '{}');

const colors = [
  "#065535","#133337","#008080","#e6e6fa","#003366",
  "#800000","#ff4040","#065535","#133337","#008080",
  "#e6e6fa","#003366","#800000","#ff4040","#065535",
];

const socket: Socket = io(import.meta.env.VITE_SERVER_URL, {
  auth: { userId: currentUserId }
});

// ── ICE config ────────────────────────────────────────────────────────────────
// fetchIceServers() calls Metered's free-tier API at runtime to get short-lived
// TURN credentials — far more reliable than hardcoded openrelay credentials.
// Sign up free at https://www.metered.ca/ and put your subdomain + API key in
// your .env:  VITE_METERED_SUBDOMAIN=yourapp  VITE_METERED_API_KEY=xxxx
//
// Fallback: if the fetch fails we still try with Google STUN only (works on
// same-network calls but may fail across different NATs).
async function fetchIceServers(): Promise<RTCIceServer[]> {
  const subdomain = import.meta.env.VITE_METERED_SUBDOMAIN;
  const apiKey    = import.meta.env.VITE_METERED_API_KEY;

  const fallback: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302'  },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  // If no Metered credentials configured, use fallback STUN only
  if (!subdomain || !apiKey) {
    console.warn('[ICE] No Metered credentials — using STUN only (cross-NAT calls may fail)');
    return fallback;
  }

  try {
    const res  = await fetch(
      `https://${subdomain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    const data = await res.json();
    console.log('[ICE] Fetched', data.length, 'ICE servers from Metered');
    return data as RTCIceServer[];
  } catch (err) {
    console.error('[ICE] Failed to fetch Metered credentials, using STUN fallback:', err);
    return fallback;
  }
}

type PartnerStatus = 'searching' | 'connecting' | 'connected' | 'left';

const OVERLAY_CONFIG: Record<
  Exclude<PartnerStatus, 'connected'>,
  { icon: string; line1: string; line2: string; accent: string; spin: boolean }
> = {
  searching:  { icon: '🔍', line1: 'Finding you a partner…',  line2: 'This usually takes a few seconds', accent: '#6c63ff', spin: true  },
  connecting: { icon: '⚡', line1: 'Partner found!',           line2: 'Establishing connection…',         accent: '#f0a500', spin: true  },
  left:       { icon: '👋', line1: 'Partner left the chat',    line2: 'Hit Skip to find someone new',     accent: '#e05252', spin: false },
};

function PartnerOverlay({ status }: { status: PartnerStatus }) {
  if (status === 'connected') return null;
  const cfg = OVERLAY_CONFIG[status];
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12,
      background: 'rgba(8,8,18,0.85)', backdropFilter: 'blur(8px)',
      borderRadius: 'inherit', zIndex: 10,
    }}>
      {cfg.spin && (
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          borderWidth: 3, borderStyle: 'solid',
          borderColor: `transparent transparent transparent ${cfg.accent}`,
          animation: 'spin 0.9s linear infinite',
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

function safePeerDestroy(peer: Instance | null) {
  if (!peer) return;
  try {
    peer.removeAllListeners();
    setTimeout(() => { try { peer.destroy(); } catch (_) {} }, 0);
  } catch (_) {}
}

// ── Main page ─────────────────────────────────────────────────────────────────
function RandomChatPage() {
  const [partnerId,      setPartnerId]      = useState('');
  const [randomChatData, setRandomChatData] = useState<any>(null);
  const [callAccepted,   setCallAccepted]   = useState(false);
  const [remoteStream,   setRemoteStream]   = useState<MediaStream | null>(null);
  const [partnerStatus,  setPartnerStatus]  = useState<PartnerStatus>('searching');
  const [partnerData,    setPartnerData]    = useState<any>(null);
  const [matchPayload,   setMatchPayload]   = useState<any>(null);

  const myVideo   = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const peerRef   = useRef<Instance | null>(null);

  // Stream promise: resolves as soon as getUserMedia succeeds.
  // Any code can await this instead of polling streamRef.current.
  const streamRef         = useRef<MediaStream | undefined>(null);
  const streamResolverRef = useRef<((s: MediaStream) => void) | null>(null);
  const streamPromiseRef  = useRef<Promise<MediaStream>>(
    new Promise(resolve => { streamResolverRef.current = resolve; })
  );

  // ICE servers promise: resolves after fetchIceServers() completes.
  const iceServersRef = useRef<Promise<RTCIceServer[]>>(fetchIceServers());

  const iAmInitiatorRef   = useRef(false);
  const matchActiveRef    = useRef(false);
  const randomChatIdRef   = useRef<string | null>(null);
  // Initiator stores partner's DB id here so callee_ready can trigger the call
  const pendingCallToRef  = useRef<string | null>(null);

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

  // ── Build peer ────────────────────────────────────────────────────────────
  const buildPeer = useCallback(async (initiator: boolean, localStream: MediaStream): Promise<Instance> => {
    const iceServers = await iceServersRef.current;
    return new Peer({
      initiator,
      trickle: true,
      stream:  localStream,
      config:  { iceServers, iceCandidatePoolSize: 10 },
    });
  }, []);

  const attachCommonHandlers = useCallback((peer: Instance) => {
    peer.on('stream', (incoming: MediaStream) => {
      if (peerRef.current !== peer) return;
      setRemoteStream(incoming);
      setCallAccepted(true);
      setPartnerStatus('connected');
    });
    peer.on('error', (err: Error) => {
      if (peerRef.current !== peer) return;
      console.error('[RTC] Peer error:', err.message);
    });
    peer.on('close', () => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Peer closed');
    });
  }, []);

  // ── Initiator ─────────────────────────────────────────────────────────────
  const startCall = useCallback(async (targetUserId: string, localStream: MediaStream) => {
    console.log('[RTC] Starting call → initiator');

    const peer = await buildPeer(true, localStream);
    peerRef.current = peer;

    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Initiator signal:', (data as any).type ?? 'candidate');
      socket.emit('callUser', { userToCall: targetUserId, signalData: data, from: currentUserId });
    });

    const onCallAccepted = (signal: SignalData) => {
      if (peerRef.current !== peer || (peer as any).destroyed) return;
      try { peer.signal(signal); } catch (_) {}
    };
    socket.on('callAccepted', onCallAccepted);

    attachCommonHandlers(peer);
    peer.on('close', () => socket.off('callAccepted', onCallAccepted));
    peer.on('error', () => socket.off('callAccepted', onCallAccepted));
  }, [buildPeer, attachCommonHandlers]);

  // ── Callee ────────────────────────────────────────────────────────────────
  const receiveCall = useCallback(async (callerDbId: string, offerSignal: SignalData, localStream: MediaStream) => {
    console.log('[RTC] Receiving call → callee');

    const peer = await buildPeer(false, localStream);
    peerRef.current = peer;

    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Callee signal:', (data as any).type ?? 'candidate');
      socket.emit('answerCall', { signal: data, to: callerDbId });
    });

    attachCommonHandlers(peer);
    try { peer.signal(offerSignal); } catch (e) { console.warn('[RTC] signal() failed:', e); }
  }, [buildPeer, attachCommonHandlers]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Camera / mic — resolve the stream promise when ready
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(localStream => {
        streamRef.current = localStream;
        if (myVideo.current) myVideo.current.srcObject = localStream;
        streamResolverRef.current?.(localStream);
        streamResolverRef.current = null;
        console.log('[Media] Stream ready');
      })
      .catch(err => console.error('[Media] getUserMedia failed:', err));

    // 2. Partner found
    socket.on('partner_found', async (data: any) => {
      if (matchActiveRef.current) return;
      matchActiveRef.current = true;

      const foundPartnerId: string = data.partnerId;
      console.log('[Match] Partner found! id =', foundPartnerId);

      setPartnerId(foundPartnerId);
      setRandomChatData(data.randomChat);
      setPartnerData(data.partner);
      setMatchPayload(data.matchPayload ?? data);
      setPartnerStatus('connecting');

      if (data.randomChat?._id) {
        randomChatIdRef.current = data.randomChat._id;
        socket.emit('join_random_chat', { randomChatId: data.randomChat._id });
      }

      iAmInitiatorRef.current = (currentUserId ?? '') < foundPartnerId;
      console.log('[RTC] Role:', iAmInitiatorRef.current ? 'INITIATOR' : 'CALLEE');

      if (iAmInitiatorRef.current) {
        // Store the partner id; the actual call starts only after callee_ready
        pendingCallToRef.current = foundPartnerId;
        console.log('[RTC] Initiator waiting for callee_ready…');
      } else {
        // Callee: await both the stream and the ICE servers, then signal ready
        console.log('[RTC] Callee awaiting stream + ICE…');
        await Promise.all([streamPromiseRef.current, iceServersRef.current]);
        console.log('[RTC] Callee ready — notifying initiator');
        // Tell the initiator we're ready to receive the offer
        socket.emit('callee_ready', { to: foundPartnerId });
      }
    });

    // 3. Initiator receives "callee is ready" — NOW safe to send the offer
    socket.on('callee_ready', async () => {
      if (!iAmInitiatorRef.current || !pendingCallToRef.current) return;
      console.log('[RTC] callee_ready received — starting call');

      const [localStream] = await Promise.all([
        streamPromiseRef.current,
        iceServersRef.current,
      ]);

      if (matchActiveRef.current) {
        startCall(pendingCallToRef.current, localStream);
      }
    });

    // 4. Incoming offer / trickle candidates (callee only)
    socket.on('callUser', async (data: { signal: SignalData; from: string }) => {
      if (iAmInitiatorRef.current) return;

      const localStream = await streamPromiseRef.current;

      if (!peerRef.current) {
        receiveCall(data.from, data.signal, localStream);
      } else if (!(peerRef.current as any).destroyed) {
        try { peerRef.current.signal(data.signal); } catch (_) {}
      }
    });

    // 5. Partner left
    socket.on('partner_left', () => {
      console.log('[Socket] Partner left');
      destroyPeer();
      setPartnerId('');
      setRandomChatData(null);
      setPartnerData(null);
      setMatchPayload(null);
      setPartnerStatus('left');
      randomChatIdRef.current  = null;
      pendingCallToRef.current = null;
      matchActiveRef.current   = false;
      iAmInitiatorRef.current  = false;
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

    // 6. Start matchmaking
    triggerSearch();

    return () => {
      socket.off('partner_found');
      socket.off('callee_ready');
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
      matchActiveRef.current   = false;
      iAmInitiatorRef.current  = false;
      pendingCallToRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach remote stream to <video>
  useEffect(() => {
    if (callAccepted && remoteStream && userVideo.current) {
      userVideo.current.srcObject = remoteStream;
    }
  }, [callAccepted, remoteStream]);

  // ── Matchmaking ───────────────────────────────────────────────────────────
  const triggerSearch = () => {
    setPartnerStatus('searching');
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => console.log('[Match] Request sent:', d.message ?? d))
      .catch(err => { console.error('[Match] Error:', err); setPartnerStatus('searching'); });
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
    setPartnerData(null);
    setMatchPayload(null);
    pendingCallToRef.current = null;
    matchActiveRef.current   = false;
    iAmInitiatorRef.current  = false;
    triggerSearch();
  }, [destroyPeer]);

  // ── Add friend ────────────────────────────────────────────────────────────
  const addFriend = useCallback(() => {
    if (!partnerId) return;
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/friends/request/${partnerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => console.log('[Friend] Request sent:', d.message ?? d))
      .catch(err => console.error('[Friend] Error:', err));
  }, [partnerId]);

  return (
    <main className="randomchatpage">
      <span className="brand">hatFate</span>
      <img src="bg2.jpg" alt="" className="background" />
      <div className="overlay" />

      <div className="common">
        <h2 className="title">Common Interests:</h2>
        {matchPayload?.commonInterests?.map((int: string, index: number) => (
          <div key={int} className="interest" style={{ backgroundColor: colors[index] }}>{int}</div>
        ))}
      </div>

      <div className="screen">
        <div className="cams">

          <div className="videoscreen">
            <div className="sticker">
              <ReactCountryFlag countryCode={user.country} svg style={{ width: '2em', height: '2em' }} />
              <span>You</span>
            </div>
            <video autoPlay muted ref={myVideo} />
          </div>

          <div className="videoscreen second" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="sticker">
              {partnerData && <ReactCountryFlag className="countryFlag"countryCode={partnerData.country} svg style={{ width: '2em', height: '2em' }} />}
              <span>{callAccepted ? partnerData.userName : '…'}</span>
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
          {randomChatData && (
            <ChatBoxComp
              type="random"
              socket={socket}
              currentUserId={currentUserId}
              partnerId={partnerId}
              chatData={randomChatData}
              chatId={randomChatIdRef.current}
              partnerData={partnerData}
            />
          )}
          <div className="chatbuttons">
            <button className="btn skip"   onClick={handleSkip}>Skip</button>
            <button className="btn friend" onClick={addFriend} disabled={!callAccepted}>Add Friend</button>
            <button className="btn report" disabled={!callAccepted}>!</button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default RandomChatPage;