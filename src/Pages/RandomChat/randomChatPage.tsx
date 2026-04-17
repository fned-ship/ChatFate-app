import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import './style2.css';
import ChatBoxComp from "../../Components/chatBox";
import Cookies from 'js-cookie';
import ReactCountryFlag from 'react-country-flag';




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

  const token         = Cookies.get('token');
const currentUserId = Cookies.get('userId');
const user          = JSON.parse(Cookies.get('user') ?? '{}');
const colors        = ["#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040",
                       "#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040","#065535"];


const socketRef = useRef<Socket | null>(null);
  useEffect(() => {
    const currentUserId = Cookies.get('userId');

    socketRef.current = io(import.meta.env.VITE_SERVER_URL, {
      auth: { userId: currentUserId }
    });


    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportReason, setReportReason]           = useState('');
    const [importance, setImportance]               = useState<number>(1);
    const [selectedFiles, setSelectedFiles]         = useState<File[]>([]);
    const [reportStatus, setReportStatus]           = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  
  
  
    const submitReportManually = async () => {
      if (!reportReason.trim() || !partnerId) return;
      setReportStatus('submitting');
      
      try {
        const formData = new FormData();
        formData.append('reportedId', partnerId);
        formData.append('report', reportReason);
        formData.append('ai', 'false');
        formData.append('importance', importance.toString());
        
        selectedFiles.forEach((file) => {
          formData.append('files', file); 
        });
  
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/api/reports`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
  
        if (!res.ok) throw new Error('Failed to submit report');
        
        setReportStatus('success');
        setTimeout(() => {
          resetModal();
          handleSkip();
        }, 1000);
        
      } catch (error) {
        console.error('[Report] Submission failed:', error);
        setReportStatus('error');
      }
    };
  
    const resetModal = () => {
      setIsReportModalOpen(false);
      setReportStatus('idle');
      setReportReason('');
      setImportance(1);
      setSelectedFiles([]);
    };
  

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
        socketRef.current.emit('join_random_chat', { randomChatId: data.randomChat._id });
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

    socketRef.current.on('partner_found', onPartnerFound);
    socketRef.current.on('partner_left',  onPartnerLeft);

    // 6. Start matchmaking
    triggerSearch();

    return () => {
      // Bump session id — all in-flight async callbacks will self-abort
      sessionIdRef.current++;

      socketRef.current.off('partner_found', onPartnerFound);
      socketRef.current.off('partner_left',  onPartnerLeft);

      if (randomChatIdRef.current) {
        socketRef.current.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
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
      socketRef.current.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
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
      <div className="rest" style={{padding:'min(2%,10px)',gap:'10px'}} >
        <div className='boxHolder'>
              { partnerData && 
            <div className="box" >
              <span>Randomly Chatting With:</span>
                <img src={`${import.meta.env.VITE_SERVER_URL}/imagesProfile/${partnerData.photo}`} />
                <div className="details" >
                    <p>{partnerData.userName}</p>
                    <span>From</span>
                    {partnerData && <ReactCountryFlag countryCode={partnerData.country} svg style={{ width: '2em', height: '2em' }} />}
                </div>
            </div> }
              <div className="chatbuttons">
            <button className="btn skip"   onClick={handleSkip}>Skip</button>
            <button className={`btn friend ${friendRequestStatus?'sent':'not-sent'}`} onClick={addFriend} >{friendRequestStatus?'Request Sent':'Add Friend'}</button>
            <button className="btn report" disabled={!partnerData} onClick={()=>setIsReportModalOpen(true)} >!</button>
          </div>
            </div>
        <div style={{display:'flex',flex:2,position:'relative'}}>
          {randomChatData && (
                <ChatBoxComp
                type="random"
                socket={socketRef.current}
                currentUserId={currentUserId}
                partnerData={partnerData}
                chatId={randomChatData._id}
                />
            )}
            <PartnerOverlay status={partnerStatus} />
        </div>
        
        
            
      </div>
{isReportModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: '#151520', padding: '24px', borderRadius: '12px',
            width: '90%', maxWidth: '400px', color: '#fff',
            display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #2a2a3a',
            maxHeight: '90vh', overflowY: 'auto' // Added scroll for smaller screens
          }}>
            <h3 style={{ margin: 0, color: '#ff4d4f', fontSize: '20px' }}>Report User</h3>
            
            {reportStatus === 'success' ? (
              <p style={{ color: '#4BB543', margin: 0 }}>Report submitted successfully. Thank you.</p>
            ) : (
              <>
                <p style={{ margin: 0, color: '#aaa', fontSize: '14px' }}>
                  Please describe the inappropriate behavior. Your report will be reviewed by our team.
                </p>
                
                <textarea 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Reason for reporting..."
                  style={{
                    width: '100%', minHeight: '100px', padding: '12px',
                    borderRadius: '8px', background: '#0a0a10', color: '#fff',
                    border: '1px solid #333', resize: 'vertical', outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
  <label style={{ color: '#aaa', fontSize: '14px' }}>Importance Level:</label>
  <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
    {[1, 2, 3, 4, 5].map((num) => {
      const isSelected = importance === num;
      const severityColors = ['#066000', '#5e9d16', '#dac400', '#ffa726', '#f81a1d'];

      return (
        <button
          key={num}
          type="button"
          onClick={() => setImportance(num)}
          style={{
            height:30,
            aspectRatio:'1/1',
            borderRadius: '50vh',
            border: '1px solid',
            borderColor: isSelected ? 'white' : 'transparent',
            background: severityColors[num-1],
            color: isSelected ? 'white' : '#dfdfdf',
            fontSize: '14px',
            fontWeight: isSelected ? '700' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {num}
        </button>
      );
    })}
  </div>
</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <div style={{position:'relative', padding:'8px',display:"flex",alignItems:'center',gap:8,backgroundColor:'darkblue',borderRadius:8,width:'fit-content'}}>
                    <label style={{ color: 'white', fontSize: '14px', fontWeight:'300' }}>Attach Evidence:</label>
                  <img height={16} width={16} src="/camIcon.png"/>
                  <input
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={(e)=>{setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);}}
                    style={{
                      position:'absolute',
                      top:0,left:0,width:'100%',height:'100%',zIndex:0,
                      color: 'transparent',
                      background: 'transparent',
                      cursor: 'pointer'
                    }}
                  />

                  </div>
                  
                  
                  {selectedFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {selectedFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} style={{ position: 'relative', width: '64px', height: '64px' }}>
                          <img 
                            src={URL.createObjectURL(file)} 
                            style={{ 
                              width: '100%', height: '100%', objectFit: 'cover', 
                              borderRadius: '8px', border: '1px solid #333' 
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>     setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                            style={{
                              position: 'absolute', top: '-6px', right: '-6px',
                              background: '#ff4d4f', color: '#fff', border: 'none',
                              borderRadius: '50%', width: '20px', height: '20px',
                              fontSize: '12px', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {reportStatus === 'error' && (
                  <p style={{ color: '#ff4d4f', margin: 0, fontSize: '13px' }}>Failed to submit. Please try again.</p>
                )}
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button 
                    type="button"
                    onClick={resetModal}
                    style={{
                      padding: '8px 16px', borderRadius: '6px', border: 'none',
                      background: '#333', color: '#fff', cursor: 'pointer', fontWeight: 600
                    }}
                    disabled={reportStatus === 'submitting'}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    onClick={submitReportManually}
                    style={{
                      padding: '8px 16px', borderRadius: '6px', border: 'none',
                      background: '#ff4d4f', color: '#fff', fontWeight: 600,
                      cursor: reportReason.trim() ? 'pointer' : 'not-allowed',
                      opacity: (reportStatus === 'submitting' || !reportReason.trim()) ? 0.6 : 1
                    }}
                    disabled={reportStatus === 'submitting' || !reportReason.trim()}
                  >
                    {reportStatus === 'submitting' ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      
    </main>
  );
}

export default RandomChatPage;