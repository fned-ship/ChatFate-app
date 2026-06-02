import { useEffect, useRef, useState, useCallback } from "react";
import io, { Socket } from "socket.io-client";
import './randomChatPage.css';
import ChatBoxComp from "../../Components/chatBox";
import Cookies from 'js-cookie';
import ReactCountryFlag from 'react-country-flag';
import { HiMoon } from "react-icons/hi";
import { useNavigate } from "react-router-dom";


type PartnerStatus = 'searching' | 'connecting' | 'connected' | 'left';

// const OVERLAY_CONFIG: Record<
//   Exclude<PartnerStatus, 'connected'>,
//   { icon: string; line1: string; line2: string; accent: string; spin: boolean }
// > = {
//   searching:  { icon: '🔍', line1: 'Finding you a partner…',  line2: 'This usually takes a few seconds', accent: '#6c63ff', spin: true  },
//   connecting: { icon: '⚡', line1: 'Partner found!',           line2: 'Establishing connection…',         accent: '#f0a500', spin: true  },
//   left:       { icon: '👋', line1: 'Partner left the chat',    line2: 'Hit Skip to find someone new',     accent: '#e05252', spin: false },
// };

// function PartnerOverlay({ status }: { status: PartnerStatus }) {
//   if (status === 'connected') return null;
//   const cfg = OVERLAY_CONFIG[status];
//   return (
//     <div style={{
//       position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
//       alignItems: 'center', justifyContent: 'center', gap: 12,
//       background: 'rgba(8,8,18,0.85)', backdropFilter: 'blur(8px)',
//       borderRadius: 'inherit', zIndex: 10,
//     }}>
//       {cfg.spin && (
//         <div style={{
//           width: 52, height: 52, borderRadius: '50%',
//           borderWidth: 3, borderStyle: 'solid',
//           borderColor: `transparent transparent transparent ${cfg.accent}`,
//           animation: 'spin 0.9s linear infinite',
//         }} />
//       )}
//       <span style={{ fontSize: cfg.spin ? 26 : 44, lineHeight: 1 }}>{cfg.icon}</span>
//       <p style={{ color: '#fff', fontWeight: 600, fontSize: 15, margin: 0, textAlign: 'center', padding: '0 16px' }}>{cfg.line1}</p>
//       <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0, textAlign: 'center', padding: '0 16px' }}>{cfg.line2}</p>
//       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//     </div>
//   );
// }

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
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const iAmInitiatorRef  = useRef(false);
  const matchActiveRef   = useRef(false);
  const randomChatIdRef  = useRef<string | null>(null);
  const pendingCallToRef = useRef<string | null>(null);
  // Incremented on every cleanup so stale async callbacks can detect they're outdated
  const sessionIdRef     = useRef(0);

  const navigate = useNavigate();

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

  useEffect(() => {
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, []);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

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

  const isSearching = partnerStatus !== 'connected';

  return (
    <main className="rcp-page">

      {/* ── Navbar ── */}
      <nav className="rcp-navbar">
        <span className="brand"><HiMoon style={{color:"#a855f7"}} />hatFate</span>
        <div className="rcp-nav-actions">
          <button className="history-back-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="rcp-hero">
        <div className="rcp-pref-pill">
          <span className="rcp-pref-dot" />
          Matching Preference: Worldwide
          <span style={{ opacity: 0.4, marginLeft: 2 }}>ⓘ</span>
        </div>
        <h1>Destiny is calling…</h1>
        <p className="rcp-timer">Time elapsed: {fmtTime(elapsed)}</p>
      </div>

      {/* ── Common interests ── */}
      {matchPayload?.commonInterests?.length > 0 && (
        <div className="rcp-common">
          <span className="rcp-common-label">Common interests:</span>
          {matchPayload.commonInterests.map((int: string, i: number) => (
            <span
              key={int}
              className="rcp-common-tag"
              style={{ borderColor: colors[i] + '55', color: colors[i] }}
            >
              {int}
            </span>
          ))}
        </div>
      )}

      {/* ── Body ── */}
      <div className="rcp-body">

        {/* ── Left sidebar ── */}
        <div className="rcp-sidebar">

          {/* Partner info / searching state */}
          {partnerData && partnerStatus === 'connected' ? (
            <div className="rcp-partner-card">
              <img
                className="rcp-partner-avatar"
                src={`${import.meta.env.VITE_SERVER_URL}/${partnerData.photo}`}
                alt={partnerData.userName}
                onError={(e) => { (e.target as HTMLImageElement).src = '/unknown.jpg'; }}
              />
              <div className="rcp-partner-info">
                <div className="rcp-partner-name">{partnerData.firstName ?? partnerData.userName}</div>
                <div className="rcp-partner-country">
                  <ReactCountryFlag countryCode={partnerData.country} svg style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                  {partnerData.country}
                </div>
                <div className="rcp-status-badge" style={{ marginTop: 6 }}>
                  <span className="rcp-status-dot" />
                  Chatting now
                </div>
              </div>
            </div>
          ) : (
            <div className="rcp-searching-card">
              <div className="rcp-searching-icon">
                <span className="rcp-searching-star">✦</span>
              </div>
              <div>
                <h3>
                  {partnerStatus === 'left'
                    ? 'Partner left'
                    : 'Finding you a partner…'}
                </h3>
                <p>
                  {partnerStatus === 'left'
                    ? 'Hit Skip to find someone new.'
                    : 'This usually takes a few seconds.'}
                </p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="rcp-actions">
            <button className="rcp-btn rcp-btn-skip" onClick={handleSkip}>
              ↺ Skip Match
            </button>
            <button
              className={`rcp-btn rcp-btn-friend${friendRequestStatus ? ' sent' : ''}`}
              disabled={!partnerData}
              onClick={addFriend}
            >
              {friendRequestStatus ? '✓ Request Sent' : '＋ Add Friend'}
            </button>
            <button
              className="rcp-btn rcp-btn-report"
              disabled={!partnerData}
              onClick={() => setIsReportModalOpen(true)}
            >
              ⚑ Report
            </button>
          </div>

        </div>

        {/* ── Chat area ── */}
        <div className="rcp-chat-area">
          <div className="rcp-chat-box">
            {randomChatData && (
              <ChatBoxComp
                type="random"
                socket={socketRef.current}
                currentUserId={currentUserId}
                partnerData={partnerData}
                chatId={randomChatData._id}
              />
            )}
          </div>

          {/* Overlay when not connected */}
          {isSearching && (
            <div className="rcp-chat-overlay">
              {partnerStatus === 'left' ? (
                <>
                  <span className="rcp-overlay-emoji">👋</span>
                  <h2>Partner left the chat</h2>
                  <p>Hit <strong>Skip Match</strong> to find someone new.</p>
                </>
              ) : (
                <>
                  <div className="rcp-searching-icon" style={{ width: 56, height: 56 }}>
                    <span className="rcp-searching-star">✦</span>
                  </div>
                  <h2>Finding you a partner…</h2>
                  <p>Connecting to the global network. This usually takes a few seconds.</p>
                  {matchPayload?.commonInterests?.length > 0 && (
                    <div className="rcp-overlay-tags">
                      {matchPayload.commonInterests.map((int: string) => (
                        <span key={int} className="rcp-overlay-tag">{int}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="rcp-footer">
        <span>© 2026 ChatFate. Connect with destiny.</span>
        <div className="rcp-footer-links">
          <a onClick={() => navigate('/info/privacy')} >Privacy</a>
          <a onClick={() => navigate('/info/terms')} >Terms</a>
          <a onClick={() => navigate('/info/safety')} >Safety</a>
          <a onClick={() => navigate('/info/help')} >Help Center</a>
        </div>
      </footer>

      {/* [] */}
      {/* ── Report modal ── */}
{isReportModalOpen && (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)'
  }}>
    <div style={{
      background: '#0d0d14',
      padding: '28px 24px',
      borderRadius: '14px',
      width: '90%',
      maxWidth: '400px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      border: '1px solid #1e1e2e',
      maxHeight: '90vh',
      overflowY: 'auto'
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px', color: '#e74c3c' }}>🚩</span>
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, letterSpacing: '0.01em' }}>
          Report user
        </h3>
      </div>

      {reportStatus === 'success' ? (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#0a1f12', border: '1px solid #1a4a28',
            borderRadius: '10px', padding: '14px 16px',
            color: '#4caf81', fontSize: '14px'
          }}>
            ✓ Report submitted. Thank you for helping keep the platform safe.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={resetModal}
              style={{
                padding: '9px 18px', borderRadius: '8px',
                border: '1px solid #1e1e2e', background: '#10102a',
                color: '#8888bb', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
              }}
            >Close</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: 0, color: '#6b6b8a', fontSize: '13px', lineHeight: 1.6 }}>
            Describe the inappropriate behavior. Your report will be reviewed by our team.
          </p>

          <hr style={{ height: '1px', background: '#1e1e2e', border: 'none', margin: 0 }} />

          {/* Reason textarea */}
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Reason for reporting…"
            style={{
              width: '100%', minHeight: '96px', padding: '12px 14px',
              borderRadius: '10px', background: '#07070f', color: '#d0d0e0',
              border: '1px solid #1e1e2e', resize: 'vertical', outline: 'none',
              fontSize: '13px', fontFamily: 'inherit', lineHeight: 1.6
            }}
          />

          {/* Severity */}
          <div>
            <p style={{
              fontSize: '12px', fontWeight: 500, color: '#6b6b8a',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px'
            }}>
              Severity level
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = importance === num;
                const severityColors = ['#1a5c1a', '#3d6e12', '#7a6200', '#8a4a00', '#8a1212'];
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setImportance(num)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      border: `1.5px solid ${isSelected ? '#fff' : 'transparent'}`,
                      background: severityColors[num - 1],
                      color: '#fff',
                      fontSize: '13px', fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 0 0 2px rgba(255,255,255,0.12)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >{num}</button>
                );
              })}
            </div>
          </div>

          {/* Attach evidence */}
          <div>
            <p style={{
              fontSize: '12px', fontWeight: 500, color: '#6b6b8a',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px'
            }}>
              Attach evidence
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', background: '#10102a',
              border: '1px solid #1e1e2e', borderRadius: '8px',
              color: '#8888bb', fontSize: '13px', cursor: 'pointer',
              position: 'relative', overflow: 'hidden'
            }}>
              📷 Upload screenshots
              <input
                type="file" multiple accept="image/*"
                onChange={(e) => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])}
                style={{
                  position: 'absolute', inset: 0, opacity: 0,
                  cursor: 'pointer', width: '100%', height: '100%'
                }}
              />
            </div>

            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                {selectedFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} style={{ position: 'relative', width: '60px', height: '60px' }}>
                    <img
                      src={URL.createObjectURL(file)}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        borderRadius: '8px', border: '1px solid #1e1e2e'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                      style={{
                        position: 'absolute', top: '-6px', right: '-6px',
                        background: '#c0392b', color: '#fff', border: 'none',
                        borderRadius: '50%', width: '18px', height: '18px',
                        fontSize: '10px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {reportStatus === 'error' && (
            <p style={{ color: '#e74c3c', margin: 0, fontSize: '13px' }}>
              Failed to submit. Please try again.
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={resetModal}
              disabled={reportStatus === 'submitting'}
              style={{
                padding: '9px 18px', borderRadius: '8px',
                border: '1px solid #1e1e2e', background: '#10102a',
                color: '#8888bb', fontSize: '13px', fontWeight: 500, cursor: 'pointer'
              }}
            >Cancel</button>
            <button
              type="button"
              onClick={submitReportManually}
              disabled={reportStatus === 'submitting' || !reportReason.trim()}
              style={{
                padding: '9px 20px', borderRadius: '8px', border: 'none',
                background: '#c0392b', color: '#fff',
                fontSize: '13px', fontWeight: 600,
                cursor: (reportStatus === 'submitting' || !reportReason.trim()) ? 'not-allowed' : 'pointer',
                opacity: (reportStatus === 'submitting' || !reportReason.trim()) ? 0.45 : 1,
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'background 0.15s, opacity 0.15s'
              }}
            >
              {reportStatus === 'submitting' ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)}
      {/* [] */}

    </main>
  );
}

export default RandomChatPage;