import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
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

// ── Main page ─────────────────────────────────────────────────────────────────
function RandomChatPage() {
  const [partnerId,      setPartnerId]      = useState('');
  const [randomChatData, setRandomChatData] = useState<any>(null);
  const [partnerStatus,  setPartnerStatus]  = useState<PartnerStatus>('searching');
  const [partnerData,    setPartnerData]    = useState<any>(null);
  const [matchPayload,   setMatchPayload]   = useState<any>(null);
  const [friendRequestStatus,setFriendRequestStatus] = useState(false);

  const iAmInitiatorRef  = useRef(false);
  const matchActiveRef   = useRef(false);
  const randomChatIdRef  = useRef<string | null>(null);
  const pendingCallToRef = useRef<string | null>(null);
  // Incremented on every cleanup so stale async callbacks can detect they're outdated
  const sessionIdRef     = useRef(0);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // Capture session id for this mount — if cleanup runs before an async
    // callback finishes, the callback sees a stale session and self-aborts.
    const mySession = ++sessionIdRef.current;
    const isStale   = () => sessionIdRef.current !== mySession;


    console.log(user);

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
      setFriendRequestStatus(false);
      setMatchPayload(data.matchPayload);
      setPartnerStatus('connected');
      console.log('data:', data, '- userId', currentUserId);

      if (data.randomChat?._id) {
        randomChatIdRef.current = data.randomChat._id;
        socket.emit('join_random_chat', { randomChatId: data.randomChat._id });
      }

    };

    // 5. Partner left
    const onPartnerLeft = () => {
      if (isStale()) return;
      console.log('[Socket] Partner left');
      setPartnerId('');
      setRandomChatData(null);
      setPartnerStatus('left');
      randomChatIdRef.current  = null;
      pendingCallToRef.current = null;
      matchActiveRef.current   = false;
      iAmInitiatorRef.current  = false;
    };

    socket.on('partner_found', onPartnerFound);
    socket.on('partner_left',  onPartnerLeft);

    // 6. Start matchmaking
    triggerSearch();

    return () => {
      // Bump session id — all in-flight async callbacks will self-abort
      sessionIdRef.current++;

      socket.off('partner_found', onPartnerFound);
      socket.off('partner_left',  onPartnerLeft);

      if (randomChatIdRef.current) {
        socket.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
      }
      fetch(`${import.meta.env.VITE_SERVER_URL}/api/waiting-room`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      matchActiveRef.current   = false;
      iAmInitiatorRef.current  = false;
      randomChatIdRef.current  = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Matchmaking trigger ───────────────────────────────────────────────────
  const triggerSearch = () => {
    setPartnerStatus('searching');
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ typeOfChat: 'chat' }) ,
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
    setPartnerId('');
    setRandomChatData(null);
    pendingCallToRef.current = null;
    matchActiveRef.current   = false;
    iAmInitiatorRef.current  = false;
    triggerSearch();
  }, []);

  // ── Add friend ────────────────────────────────────────────────────────────
  const addFriend = () => {
    if (!partnerId) return;
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/friends/request/${partnerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        console.log('[Friend] Request sent:', d.message ?? d);
        setFriendRequestStatus(true);
      })
      .catch(err => console.error('[Friend request] Error:', err));
  };

  return (
    <main className="randomchatpage">
      <span className="brand">hatFate</span>
      <img src="/bg2.jpg" alt="" className="background" />
      <div className="overlay" />

      <div className="common">
        <h2 className="title">Common Interests:</h2>
        {matchPayload?.commonInterests?.map((int: string, index: number) => (
          <div key={int} className="interest" style={{ backgroundColor: colors[index] }}>{int}</div>
        ))}
      </div>

      <div className="screen">
        <div className="cams" style={{position:"relative"}} >
            {randomChatData && (
                <ChatBoxComp
                type="random"
                socket={socket}
                currentUserId={currentUserId}
                partnerData={partnerData}
                chatId={randomChatData._id}
                />
            )}
            <PartnerOverlay status={partnerStatus} />
        </div>

        <div className="chatcontainer">
          <div className="chatbuttons">
            <button className="btn skip"   onClick={handleSkip}>Skip</button>
            <button className={`btn friend ${friendRequestStatus?'sent':'not-sent'}`} onClick={addFriend} >{friendRequestStatus?'Request Sent':'Add Friend'}</button>
            <button className="btn report" >!</button>
          </div>
          { partnerData && 
            <div className="box" >
                <div className="img-container" >
                    <img src={`${import.meta.env.VITE_SERVER_URL}/imagesProfile/${partnerData.photo}`} id="img" />
                </div>
                <div className="details" >
                    <p>{partnerData.userName}</p>
                    {partnerData && <ReactCountryFlag countryCode={partnerData.country} svg style={{ width: '2em', height: '2em' }} />}
                </div>
            </div> }
        </div>
      </div>
    </main>
  );
}

export default RandomChatPage;