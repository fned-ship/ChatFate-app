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
const colors        = ["#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040",
                       "#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040","#065535"];

// Module-level socket — one instance for the lifetime of the page
const socket: Socket = io(import.meta.env.VITE_SERVER_URL, {
  auth: { userId: currentUserId }
});

// Fetch Metered ICE servers once at module load
async function fetchIceServers(): Promise<RTCIceServer[]> {
  const subdomain = import.meta.env.VITE_METERED_SUBDOMAIN;
  const apiKey    = import.meta.env.VITE_METERED_API_KEY;

  const fallback: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302'  },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  if (!subdomain || !apiKey) {
    console.warn('[ICE] No Metered credentials — using STUN only');
    return fallback;
  }
  try {
    const res  = await fetch(`https://${subdomain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    const data = await res.json();
    console.log('[ICE] Fetched', data.length, 'ICE servers from Metered');
    return data as RTCIceServer[];
  } catch (err) {
    console.error('[ICE] Metered fetch failed, using STUN fallback:', err);
    return fallback;
  }
}

const iceServersPromise = fetchIceServers();

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
      <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: 0, textAlign: 'center', padding: '0 16px' }}>{cfg.line1}</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, textAlign: 'center', padding: '0 16px' }}>{cfg.line2}</p>
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
function RandomCallPage() {
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
  const streamRef = useRef<MediaStream | undefined>();

  // Stream promise — resolved once getUserMedia succeeds
  const streamPromiseRef  = useRef<Promise<MediaStream> | null>(null);
  const streamResolverRef = useRef<((s: MediaStream) => void) | null>(null);

  const iAmInitiatorRef  = useRef(false);
  const matchActiveRef   = useRef(false);
  const randomChatIdRef  = useRef<string | null>(null);
  const pendingCallToRef = useRef<string | null>(null);
  // Incremented on every cleanup so stale async callbacks can detect they're outdated
  const sessionIdRef     = useRef(0);

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
    const iceServers = await iceServersPromise;
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
    // Check session is still valid after the async buildPeer
    if (!matchActiveRef.current) { safePeerDestroy(peer); return; }
    peerRef.current = peer;

    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Initiator signal:', (data as any).type ?? 'candidate');
      socket.emit('callUser', { userToCall: targetUserId, signalData: data, from: currentUserId });
    });

    const onCallAccepted = (signal: SignalData) => {
      if (peerRef.current !== peer || (peer as any).destroyed) return;
      console.log('[RTC] callAccepted:', (signal as any).type ?? 'candidate');
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
    if (!matchActiveRef.current) { safePeerDestroy(peer); return; }
    peerRef.current = peer;

    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      console.log('[RTC] Callee signal:', (data as any).type ?? 'candidate');
      socket.emit('answerCall', { signal: data, to: callerDbId });
    });

    attachCommonHandlers(peer);
    try { peer.signal(offerSignal); } catch (e) { console.warn('[RTC] initial signal() failed:', e); }
  }, [buildPeer, attachCommonHandlers]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // console.log("token : ",token) ;
    // Capture session id for this mount — if cleanup runs before an async
    // callback finishes, the callback sees a stale session and self-aborts.
    const mySession = ++sessionIdRef.current;
    const isStale   = () => sessionIdRef.current !== mySession;

    // Fresh stream promise for this mount
    streamPromiseRef.current = new Promise(resolve => {
      streamResolverRef.current = resolve;
    });

    console.log(user);

    // 1. Camera / mic
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(localStream => {
        if (isStale()) { localStream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = localStream;
        if (myVideo.current) myVideo.current.srcObject = localStream;
        streamResolverRef.current?.(localStream);
        streamResolverRef.current = null;
        console.log('[Media] Stream ready');
      })
      .catch(err => console.error('[Media] getUserMedia failed:', err));

    // 2. Partner found
    const onPartnerFound = async (data: any) => {
      if (isStale() || matchActiveRef.current) {
        console.warn('[Match] partner_found ignored (stale or duplicate)');
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
      console.log('data:', data, '- userId', currentUserId);

      if (data.randomChat?._id) {
        randomChatIdRef.current = data.randomChat._id;
        socket.emit('join_random_chat', { randomChatId: data.randomChat._id });
      }

      iAmInitiatorRef.current = (currentUserId ?? '') < foundPartnerId;
      console.log('[RTC] Role:', iAmInitiatorRef.current ? 'INITIATOR' : 'CALLEE');

      if (iAmInitiatorRef.current) {
        pendingCallToRef.current = foundPartnerId;
        console.log('[RTC] Initiator waiting for callee_ready…');
      } else {
        console.log('[RTC] Callee awaiting stream + ICE…');
        await Promise.all([streamPromiseRef.current!, iceServersPromise]);
        // After the await, check we're still in a valid session
        if (isStale() || !matchActiveRef.current) {
          console.warn('[RTC] Callee aborted — session ended while awaiting');
          return;
        }
        console.log('[RTC] Callee signalling ready to initiator');
        socket.emit('callee_ready', { to: foundPartnerId });
      }
    };

    // 3. Initiator receives callee_ready
    const onCalleeReady = async () => {
      if (isStale() || !iAmInitiatorRef.current || !pendingCallToRef.current) return;
      console.log('[RTC] callee_ready received — starting call');
      const localStream = await streamPromiseRef.current!;
      if (isStale() || !matchActiveRef.current) return;
      startCall(pendingCallToRef.current, localStream);
    };

    // 4. Incoming offer / trickle candidates (callee only)
    const onCallUser = async (data: { signal: SignalData; from: string }) => {
      if (isStale() || iAmInitiatorRef.current) return;
      const localStream = await streamPromiseRef.current!;
      if (isStale()) return;

      if (!peerRef.current) {
        receiveCall(data.from, data.signal, localStream);
      } else if (!(peerRef.current as any).destroyed) {
        console.log('[RTC] Callee feeding trickle candidate');
        try { peerRef.current.signal(data.signal); } catch (_) {}
      }
    };

    // 5. Partner left
    const onPartnerLeft = () => {
      if (isStale()) return;
      console.log('[Socket] Partner left');
      destroyPeer();
      setPartnerId('');
      setRandomChatData(null);
      setPartnerStatus('left');
      randomChatIdRef.current  = null;
      pendingCallToRef.current = null;
      matchActiveRef.current   = false;
      iAmInitiatorRef.current  = false;
    };

    socket.on('partner_found', onPartnerFound);
    socket.on('callee_ready',  onCalleeReady);
    socket.on('callUser',      onCallUser);
    socket.on('partner_left',  onPartnerLeft);

    // 6. Start matchmaking
    triggerSearch();

    return () => {
      // Bump session id — all in-flight async callbacks will self-abort
      sessionIdRef.current++;

      socket.off('partner_found', onPartnerFound);
      socket.off('callee_ready',  onCalleeReady);
      socket.off('callUser',      onCallUser);
      socket.off('callAccepted');
      socket.off('partner_left',  onPartnerLeft);

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
      randomChatIdRef.current  = null;
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
      .catch(err => { console.error('[Match] Error:', err); setPartnerStatus('searching'); });
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
    pendingCallToRef.current = null;
    matchActiveRef.current   = false;
    iAmInitiatorRef.current  = false;
    triggerSearch();
  }, [destroyPeer]);

  // ── Add friend ────────────────────────────────────────────────────────────
  const addFriend = () => {
    if (!partnerId) return;
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/friends/request/${partnerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => console.log('[Friend] Request sent:', d.message ?? d))
      .catch(err => console.error('[Friend request] Error:', err));
  };

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
              {partnerData && <ReactCountryFlag countryCode={partnerData.country} svg style={{ width: '2em', height: '2em' }} />}
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
          {randomChatData && (
            <ChatBoxComp
              type="random"
              socket={socket}
              currentUserId={currentUserId}
              chatId={randomChatData._id}
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

export default RandomCallPage;