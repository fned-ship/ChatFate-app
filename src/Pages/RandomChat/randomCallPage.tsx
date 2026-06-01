import React, { useEffect, useRef, useState, useCallback } from "react";
import io, {  Socket } from "socket.io-client";
import Peer, { SignalData, Instance } from "simple-peer";
import * as nsfwjs from "nsfwjs";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import './style2.css';
import ChatBoxComp from "../../Components/chatBox";
import Cookies from 'js-cookie';
import ReactCountryFlag from 'react-country-flag';
import { HiMoon } from "react-icons/hi";
import { useNavigate } from "react-router-dom";


// ── ICE ───────────────────────────────────────────────────────────────────────
async function fetchIceServers(): Promise<RTCIceServer[]> {
  const subdomain = import.meta.env.VITE_METERED_SUBDOMAIN;
  const apiKey    = import.meta.env.VITE_METERED_API_KEY;
  const fallback: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302'  },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];
  if (!subdomain || !apiKey) return fallback;
  try {
    const res  = await fetch(`https://${subdomain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    const data = await res.json();
    return data as RTCIceServer[];
  } catch { return fallback; }
}

const iceServersPromise = fetchIceServers();

// ── Models ────────────────────────────────────────────────────────────────────
// NSFW: run once:  cp -r node_modules/nsfwjs/dist/quant_nsfw_mobilenet public/nsfwjs_model
let nsfwModel:  nsfwjs.NSFWJS          | null = null;
let weaponModel: cocoSsd.ObjectDetection | null = null;

const nsfwModelPromise: Promise<nsfwjs.NSFWJS> = (async () => {
  await tf.ready();
  nsfwModel = await nsfwjs.load(); //nsfwjs_model
  console.log('[NSFW] Model loaded'); 
  return nsfwModel;
})();

// COCO-SSD loads from jsDelivr CDN bundled with the package — no extra setup needed
const weaponModelPromise: Promise<cocoSsd.ObjectDetection> = (async () => {
  await tf.ready();
  weaponModel = await cocoSsd.load({ base: 'mobilenet_v2' });
  console.log('[Weapon] COCO-SSD model loaded');
  return weaponModel;
})();

// ── Weapon classes from COCO-SSD that we care about ──────────────────────────
// Full COCO 80-class list includes these weapon-related labels:
const WEAPON_CLASSES = ['knife', 'scissors'] as const;
// Note: COCO-SSD does NOT have "gun" or "pistol" in its 80 classes.
// For gun detection you need a custom model. We cover knife/scissors here
// and add a score boost when both nsfw + weapon trigger simultaneously.
const WEAPON_SCORE_THRESHOLD = 0.55;   // confidence to flag a weapon detection
const WEAPON_AUTO_THRESHOLD  = 0.75;   // confidence to auto-report weapon

// ── Thresholds ────────────────────────────────────────────────────────────────
const NSFW_SCAN_INTERVAL_MS  = 2000;
const BLUR_THRESHOLD         = 0.65;
const AUTO_REPORT_THRESHOLD  = 0.85;
const NSFW_CATEGORIES        = ['Porn', 'Hentai'] as const;
const WARN_CATEGORIES        = ['Sexy'] as const;

// ── Types ─────────────────────────────────────────────────────────────────────
type PartnerStatus  = 'searching' | 'connecting' | 'connected' | 'left';
type ContentWarning = 'none' | 'mild' | 'severe';
type DetectionType  = 'nsfw' | 'weapon' | 'nsfw+weapon';

// ── Overlay ───────────────────────────────────────────────────────────────────
const OVERLAY_CONFIG: Record<
  Exclude<PartnerStatus, 'connected'>,
  { icon: string; line1: string; line2: string; accent: string; spin: boolean }
> = {
  searching:  { icon: '🔍', line1: 'Finding you a partner…',  line2: 'This usually takes a few seconds', accent: '#6c63ff', spin: true  },
  connecting: { icon: '⚡', line1: 'Partner found!',           line2: 'Establishing connection…',         accent: '#f0a500', spin: true  },
  left:       { icon: '👋', line1: 'Partner left the chat',    line2: 'Hit Skip to find someone new',     accent: '#e05252', spin: false },
};

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

// ── Content warning overlay ───────────────────────────────────────────────────
interface ContentWarningOverlayProps {
  warning:      ContentWarning;
  detectionType: DetectionType;
  onUnblur:     () => void;
  onReport:     () => void;
  onSkip:       () => void;
}

const overlayBtnStyle = (bg: string, color: string): React.CSSProperties => ({
  background: bg, color,
  border: `1px solid ${color}44`,
  borderRadius: 8, padding: '7px 14px',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
});

const DETECTION_COPY: Record<DetectionType, { mild: string; severe: string }> = {
  'nsfw':       { mild: 'Potentially sensitive content',   severe: 'Inappropriate content detected'  },
  'weapon':     { mild: 'Possible weapon detected',        severe: 'Weapon detected — session ended'  },
  'nsfw+weapon':{ mild: 'Sensitive content & weapon',      severe: 'Dangerous content — session ended'},
};

function ContentWarningOverlay({ warning, detectionType, onUnblur, onReport, onSkip }: ContentWarningOverlayProps) {
  if (warning === 'none') return null;
  const isSevere = warning === 'severe';
  const copy     = DETECTION_COPY[detectionType];
  const icon     = detectionType === 'weapon' || detectionType === 'nsfw+weapon' ? '🔫' : (isSevere ? '🚨' : '⚠️');

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
      background: isSevere ? 'rgba(20,0,0,0.92)' : 'rgba(20,10,0,0.80)',
      backdropFilter: `blur(${isSevere ? 24 : 16}px)`,
      borderRadius: 'inherit', padding: '20px 16px',
    }}>
      <span style={{ fontSize: 36 }}>{icon}</span>
      <p style={{ color: isSevere ? '#ff5f5f' : '#ffb347', fontWeight: 700, fontSize: 14, textAlign: 'center', margin: 0 }}>
        {isSevere ? copy.severe : copy.mild}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, textAlign: 'center', margin: 0, padding: '0 8px' }}>
        {isSevere
          ? 'This session has been automatically reported and ended.'
          : 'Stream blurred for safety. What would you like to do?'}
      </p>
      {!isSevere && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onUnblur} style={overlayBtnStyle('#ffffff22', '#fff')}>Unblur</button>
          <button onClick={onReport} style={overlayBtnStyle('#ff5f5f33', '#ff5f5f')}>Report</button>
          <button onClick={onSkip}   style={overlayBtnStyle('#6c63ff33', '#a78bfa')}>Skip</button>
        </div>
      )}
    </div>
  );
}

// ── Peer helpers ──────────────────────────────────────────────────────────────
function safePeerDestroy(peer: Instance | null) {
  if (!peer) return;
  try {
    peer.removeAllListeners();
    setTimeout(() => { try { peer.destroy(); } catch (_) {} }, 0);
  } catch (_) {}
}


// ── Main page ─────────────────────────────────────────────────────────────────
function RandomCallPage() {


  const token         = Cookies.get('token');
const user          = JSON.parse(Cookies.get('user') ?? '{}');
const colors        = ["#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040",
                       "#065535","#133337","#008080","#e6e6fa","#003366","#800000","#ff4040","#065535"];
const socketRef = useRef<Socket | null>(null);
const currentUserId = Cookies.get('userId');
  useEffect(() => {
    const currentUserId = Cookies.get('userId');

    socketRef.current = io(import.meta.env.VITE_SERVER_URL, {
      auth: { userId: currentUserId }
    });


    return () => {
      socketRef.current?.disconnect();
    };
  }, []);
  


  const [partnerId,           setPartnerId]           = useState('');
  const [randomChatData,      setRandomChatData]      = useState<any>(null);
  const [callAccepted,        setCallAccepted]        = useState(false);
  const [remoteStream,        setRemoteStream]        = useState<MediaStream | null>(null);
  const [partnerStatus,       setPartnerStatus]       = useState<PartnerStatus>('searching');
  const [partnerData,         setPartnerData]         = useState<any>(null);
  const [matchPayload,        setMatchPayload]        = useState<any>(null);
  const [contentWarning,      setContentWarning]      = useState<ContentWarning>('none');
  const [detectionType,       setDetectionType]       = useState<DetectionType>('nsfw');
  const [nsfwReady,           setNsfwReady]           = useState(false);
  const [weaponReady,         setWeaponReady]         = useState(false);
  const [friendRequestStatus, setFriendRequestStatus] = useState(false);


  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason]           = useState('');
  const [importance, setImportance]               = useState<number>(1);
  const [selectedFiles, setSelectedFiles]         = useState<File[]>([]);
  const [reportStatus, setReportStatus]           = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [elapsed, setElapsed]                     = useState(0);
  const elapsedRef                                = useRef<ReturnType<typeof setInterval> | null>(null);
  const [chatOpen, setChatOpen]                   = useState(false);
  const [micMuted, setMicMuted]                   = useState(false);

  useEffect(() => {
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, []);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const toggleMic = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setMicMuted(prev => !prev);
  }, []);


  const submitReportManually = async () => {
    if (!reportReason.trim() || !partnerId) return;
    setReportStatus('submitting');
    
    try {
      const formData = new FormData();
      formData.append('reportedId', partnerId);
      formData.append('report', reportReason);
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

  const myVideo   = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  // Two canvases: NSFW needs 224×224, COCO-SSD works best at native resolution
  const nsfwCanvasRef   = useRef<HTMLCanvasElement>(null);
  const weaponCanvasRef = useRef<HTMLCanvasElement>(null);
  const peerRef         = useRef<Instance | null>(null);
  const streamRef       = useRef<MediaStream | undefined>(null);

  const streamPromiseRef  = useRef<Promise<MediaStream> | null>(null);
  const streamResolverRef = useRef<((s: MediaStream) => void) | null>(null);

  const iAmInitiatorRef  = useRef(false);
  const matchActiveRef   = useRef(false);
  const randomChatIdRef  = useRef<string | null>(null);
  const pendingCallToRef = useRef<string | null>(null);
  const sessionIdRef     = useRef(0);

  const scanIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const partnerIdRef     = useRef('');
  const contentWarnRef   = useRef<ContentWarning>('none');
  const detectionTypeRef = useRef<DetectionType>('nsfw');
  const autoReportedRef  = useRef(false);

  const navigate = useNavigate();

  // Keep refs in sync with state
  useEffect(() => { partnerIdRef.current     = partnerId;      }, [partnerId]);
  useEffect(() => { contentWarnRef.current   = contentWarning; }, [contentWarning]);
  useEffect(() => { detectionTypeRef.current = detectionType;  }, [detectionType]);

  // Preload both models in parallel
  useEffect(() => {
    nsfwModelPromise.then(()   => setNsfwReady(true)).catch(console.error);
    weaponModelPromise.then(() => setWeaponReady(true)).catch(console.error);
  }, []);

  const modelReady = nsfwReady && weaponReady;

  // ── Frame capture (shared, configurable size) ─────────────────────────────
  const captureFrame = useCallback((
    canvasRef: React.RefObject<HTMLCanvasElement>,
    size: number
  ): HTMLCanvasElement | null => {
    const video  = userVideo.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return null;
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, size, size);
    return canvas;
  }, []);

  // ── Submit report ─────────────────────────────────────────────────────────
  const submitReport = useCallback(async (reason: string, imageDataUrl?: string) => {
    const pid = partnerIdRef.current;
    if (!pid) return;
    try {
      const fd = new FormData();
      fd.append('reportedId', pid);
      fd.append('report',     reason);
      fd.append('importance', importance.toString());
      fd.append('ai',         'false');
      if (imageDataUrl) {
        const blob = await (await fetch(imageDataUrl)).blob();
        fd.append('files', blob, 'evidence.jpg');
      }
      fetch(`${import.meta.env.VITE_SERVER_URL}/api/reports`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
        .then(r => r.json())
        .then(d => console.log('[Report] submitted:', d.message ?? d))
        .catch(err => console.error('[Report] Error:', err));
    } catch (err) {
      console.error('[Report] failed:', err);
    }
  }, []);

  // ── Trigger severe action (report + skip after delay) ─────────────────────
  const handleSkipRef = useRef<() => void>(() => {});

  const triggerSevere = useCallback(async (
    label: string,
    type: DetectionType,
    imageDataUrl?: string
  ) => {
    if (autoReportedRef.current) return;
    autoReportedRef.current = true;
    setDetectionType(type);
    setContentWarning('severe');
    await submitReport(label, imageDataUrl);
    setTimeout(() => handleSkipRef.current(), 3500);
  }, [submitReport]);

  // ── Scan loop: runs NSFW + weapon detection on every tick ─────────────────
  const stopScanLoop = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  const startScanLoop = useCallback(() => {
    if (scanIntervalRef.current) return;

    scanIntervalRef.current = setInterval(async () => {
      if (contentWarnRef.current === 'severe') return;

      // ── Run both detections in parallel ───────────────────────────────────
      const [nsfwResult, weaponResult] = await Promise.allSettled([

        // 1. NSFW scan
        (async () => {
          if (!nsfwModel) return null;
          const canvas = captureFrame(nsfwCanvasRef, 224);
          if (!canvas) return null;
          const preds  = await nsfwModel.classify(canvas);
          const nsfwScore = Math.max(
            ...NSFW_CATEGORIES.map(c => preds.find(p => p.className === c)?.probability ?? 0)
          );
          const warnScore = Math.max(
            ...WARN_CATEGORIES.map(c => preds.find(p => p.className === c)?.probability ?? 0)
          );
          return { score: Math.max(nsfwScore, warnScore * 0.7), preds, canvas };
        })(),

        // 2. Weapon scan — COCO-SSD works on the video element directly
        (async () => {
          if (!weaponModel) return null;
          const video = userVideo.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

          const detections = await weaponModel.detect(video);
          const weapons    = detections.filter(d =>
            WEAPON_CLASSES.includes(d.class as any) && d.score >= WEAPON_SCORE_THRESHOLD
          );
          const topScore = weapons.length > 0
            ? Math.max(...weapons.map(w => w.score))
            : 0;
          const topClass = weapons.length > 0
            ? [...weapons].sort((a, b) => b.score - a.score)[0].class
            : null;

          return { score: topScore, topClass, detections: weapons };
        })(),

      ]);

      const nsfw   = nsfwResult.status   === 'fulfilled' ? nsfwResult.value   : null;
      const weapon = weaponResult.status === 'fulfilled' ? weaponResult.value : null;

      const nsfwScore   = nsfw?.score   ?? 0;
      const weaponScore = weapon?.score ?? 0;
      const bothTriggered = nsfwScore >= BLUR_THRESHOLD && weaponScore >= WEAPON_SCORE_THRESHOLD;

      // Determine combined detection type
      const currentType: DetectionType =
        bothTriggered            ? 'nsfw+weapon'
        : weaponScore >= WEAPON_SCORE_THRESHOLD ? 'weapon'
        : 'nsfw';

      // ── Evidence frame (from NSFW canvas, same image used for reports) ────
      const evidenceDataUrl = nsfw?.canvas?.toDataURL('image/jpeg', 0.8);

      // ── SEVERE auto-report logic ──────────────────────────────────────────
      if (!autoReportedRef.current) {

        // Weapon at high confidence → always severe
        if (weaponScore >= WEAPON_AUTO_THRESHOLD) {
          console.warn('[Weapon] SEVERE:', weapon?.topClass, `(${(weaponScore*100).toFixed(0)}%)`);
          await triggerSevere(
            `AI detected weapon: ${weapon?.topClass} (${(weaponScore*100).toFixed(0)}% confidence)`,
            bothTriggered ? 'nsfw+weapon' : 'weapon',
            evidenceDataUrl
          );
          return;
        }

        // NSFW at high confidence → severe
        if (nsfwScore >= AUTO_REPORT_THRESHOLD) {
          const topCat = nsfw?.preds
            ? [...nsfw.preds].sort((a, b) => b.probability - a.probability)[0].className
            : 'unknown';
          console.warn('[NSFW] SEVERE:', topCat, `(${(nsfwScore*100).toFixed(0)}%)`);
          await triggerSevere(
            `AI detected inappropriate content: ${topCat} (${(nsfwScore*100).toFixed(0)}% confidence)`,
            'nsfw',
            evidenceDataUrl
          );
          return;
        }
      }

      // ── MILD blur logic ───────────────────────────────────────────────────
      const shouldBlur =
        nsfwScore   >= BLUR_THRESHOLD ||
        weaponScore >= WEAPON_SCORE_THRESHOLD;

      if (shouldBlur && contentWarnRef.current === 'none') {
        console.warn('[Scan] Mild warning:', currentType,
          `nsfw=${(nsfwScore*100).toFixed(0)}%`,
          `weapon=${(weaponScore*100).toFixed(0)}%`
        );
        setDetectionType(currentType);
        setContentWarning('mild');

      } else if (!shouldBlur && contentWarnRef.current === 'mild') {
        // Hysteresis: only clear if both scores drop below 60% of threshold
        const clear =
          nsfwScore   < BLUR_THRESHOLD * 0.6 &&
          weaponScore < WEAPON_SCORE_THRESHOLD * 0.6;
        if (clear) setContentWarning('none');
      }

    }, NSFW_SCAN_INTERVAL_MS);
  }, [captureFrame, triggerSevere]);

  // Start/stop scan when call is active and both models are ready
  useEffect(() => {
    if (callAccepted && modelReady) {
      autoReportedRef.current = false;
      setContentWarning('none');
      startScanLoop();
    } else {
      stopScanLoop();
    }
    return stopScanLoop;
  }, [callAccepted, modelReady, startScanLoop, stopScanLoop]);

  // ── Peer teardown ─────────────────────────────────────────────────────────
  const destroyPeer = useCallback(() => {
    safePeerDestroy(peerRef.current);
    peerRef.current = null;
    setCallAccepted(false);
    setRemoteStream(null);
    setContentWarning('none');
    stopScanLoop();
    if (userVideo.current) userVideo.current.srcObject = null;
  }, [stopScanLoop]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = undefined;
    if (myVideo.current) myVideo.current.srcObject = null;
  }, []);

  // ── Build peer ────────────────────────────────────────────────────────────
  const buildPeer = useCallback(async (initiator: boolean, localStream: MediaStream): Promise<Instance> => {
    const iceServers = await iceServersPromise;
    return new Peer({ initiator, trickle: true, stream: localStream, config: { iceServers, iceCandidatePoolSize: 10 } });
  }, []);

  const attachCommonHandlers = useCallback((peer: Instance) => {
    peer.on('stream', (incoming: MediaStream) => {
      if (peerRef.current !== peer) return;
      setRemoteStream(incoming);
      setCallAccepted(true);
      setPartnerStatus('connected');
    });
    peer.on('error', (err: Error) => { if (peerRef.current !== peer) return; console.error('[RTC] Peer error:', err.message); });
    peer.on('close', ()          => { if (peerRef.current !== peer) return; console.log('[RTC] Peer closed'); });
  }, []);

  const startCall = useCallback(async (targetUserId: string, localStream: MediaStream) => {
    const peer = await buildPeer(true, localStream);
    if (!matchActiveRef.current) { safePeerDestroy(peer); return; }
    peerRef.current = peer;
    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      socketRef.current.emit('callUser', { userToCall: targetUserId, signalData: data, from: currentUserId });
    });
    const onCallAccepted = (signal: SignalData) => {
      if (peerRef.current !== peer || (peer as any).destroyed) return;
      try { peer.signal(signal); } catch (_) {}
    };
    socketRef.current.on('callAccepted', onCallAccepted);
    attachCommonHandlers(peer);
    peer.on('close', () => socketRef.current.off('callAccepted', onCallAccepted));
    peer.on('error', () => socketRef.current.off('callAccepted', onCallAccepted));
  }, [buildPeer, attachCommonHandlers]);

  const receiveCall = useCallback(async (callerDbId: string, offerSignal: SignalData, localStream: MediaStream) => {
    const peer = await buildPeer(false, localStream);
    if (!matchActiveRef.current) { safePeerDestroy(peer); return; }
    peerRef.current = peer;
    peer.on('signal', (data: SignalData) => {
      if (peerRef.current !== peer) return;
      socketRef.current.emit('answerCall', { signal: data, to: callerDbId });
    });
    attachCommonHandlers(peer);
    try { peer.signal(offerSignal); } catch (e) { console.warn('[RTC] signal() failed:', e); }
  }, [buildPeer, attachCommonHandlers]);

  // ── Skip ──────────────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    stopScanLoop();
    setContentWarning('none');
    autoReportedRef.current = false;
    if (randomChatIdRef.current) {
      socketRef.current.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
      randomChatIdRef.current = null;
    }
    destroyPeer();
    setPartnerId('');
    setRandomChatData(null);
    setMatchPayload(null);
    setFriendRequestStatus(false);
    pendingCallToRef.current = null;
    matchActiveRef.current   = false;
    iAmInitiatorRef.current  = false;

    setPartnerStatus('searching');
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ typeOfChat: 'video' }),
    })
      .then(r => r.json())
      .then(d => console.log('[Match] Request sent:', d.message ?? d))
      .catch(err => { console.error('[Match] Error:', err); setPartnerStatus('searching'); });
  }, [destroyPeer, stopScanLoop]);

  useEffect(() => { handleSkipRef.current = handleSkip; }, [handleSkip]);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const mySession = ++sessionIdRef.current;
    const isStale   = () => sessionIdRef.current !== mySession;

    streamPromiseRef.current = new Promise(resolve => { streamResolverRef.current = resolve; });

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

    const onPartnerFound = async (data: any) => {
      if (isStale() || matchActiveRef.current) { console.warn('[Match] Ignored'); return; }
      matchActiveRef.current = true;
      const foundPartnerId: string = data.partnerId;
      setPartnerId(foundPartnerId);
      setRandomChatData(data.randomChat);
      setPartnerData(data.partner);
      setFriendRequestStatus(false);
      setMatchPayload(data.matchPayload);
      setPartnerStatus('connecting');
      if (data.randomChat?._id) {
        randomChatIdRef.current = data.randomChat._id;
        socketRef.current.emit('join_random_chat', { randomChatId: data.randomChat._id });
      }
      iAmInitiatorRef.current = (currentUserId ?? '') < foundPartnerId;
      if (iAmInitiatorRef.current) {
        pendingCallToRef.current = foundPartnerId;
      } else {
        await Promise.all([streamPromiseRef.current!, iceServersPromise]);
        if (isStale() || !matchActiveRef.current) return;
        socketRef.current.emit('callee_ready', { to: foundPartnerId });
      }
    };

    const onCalleeReady = async () => {
      if (isStale() || !iAmInitiatorRef.current || !pendingCallToRef.current) return;
      const localStream = await streamPromiseRef.current!;
      if (isStale() || !matchActiveRef.current) return;
      startCall(pendingCallToRef.current, localStream);
    };

    const onCallUser = async (data: { signal: SignalData; from: string }) => {
      if (isStale() || iAmInitiatorRef.current) return;
      const localStream = await streamPromiseRef.current!;
      if (isStale()) return;
      if (!peerRef.current) {
        receiveCall(data.from, data.signal, localStream);
      } else if (!(peerRef.current as any).destroyed) {
        try { peerRef.current.signal(data.signal); } catch (_) {}
      }
    };

    const onPartnerLeft = () => {
      if (isStale()) return;
      destroyPeer();
      setPartnerId(''); setRandomChatData(null); setMatchPayload(null);
      setPartnerStatus('left');
      randomChatIdRef.current  = null;
      pendingCallToRef.current = null;
      matchActiveRef.current   = false;
      iAmInitiatorRef.current  = false;
    };

    socketRef.current.on('partner_found', onPartnerFound);
    socketRef.current.on('callee_ready',  onCalleeReady);
    socketRef.current.on('callUser',      onCallUser);
    socketRef.current.on('partner_left',  onPartnerLeft);

    setPartnerStatus('searching');
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/find-partner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ typeOfChat: 'video' }),
    })
      .then(r => r.json())
      .then(d => console.log('[Match] Request sent:', d.message ?? d))
      .catch(err => { console.error('[Match] Error:', err); setPartnerStatus('searching'); });

    return () => {
      sessionIdRef.current++;
      socketRef.current.off('partner_found', onPartnerFound);
      socketRef.current.off('callee_ready',  onCalleeReady);
      socketRef.current.off('callUser',      onCallUser);
      socketRef.current.off('callAccepted');
      socketRef.current.off('partner_left',  onPartnerLeft);
      if (randomChatIdRef.current) {
        socketRef.current.emit('leave_random_chat', { randomChatId: randomChatIdRef.current });
      }
      fetch(`${import.meta.env.VITE_SERVER_URL}/api/waiting-room`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      stopScanLoop(); destroyPeer(); stopStream();
      matchActiveRef.current = false; iAmInitiatorRef.current = false;
      pendingCallToRef.current = null; randomChatIdRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (callAccepted && remoteStream && userVideo.current) {
      userVideo.current.srcObject = remoteStream;
    }
  }, [callAccepted, remoteStream]);

  const handleManualReport = useCallback(async () => {
    const canvas       = captureFrame(nsfwCanvasRef, 224);
    const imageDataUrl = canvas?.toDataURL('image/jpeg', 0.8);
    await submitReport('User manually reported inappropriate content', imageDataUrl);
    handleSkip();
  }, [captureFrame, submitReport, handleSkip]);

  // ── Loading indicator label ───────────────────────────────────────────────
  const loadingLabel = !nsfwReady && !weaponReady ? 'Loading safety models…'
    : !nsfwReady  ? 'Loading content model…'
    : !weaponReady ? 'Loading weapon detector…'
    : '';

  return (
    <main className="randomchatpage">
      {/* Hidden canvases */}
      <canvas ref={nsfwCanvasRef}   style={{ display: 'none' }} />
      <canvas ref={weaponCanvasRef} style={{ display: 'none' }} />

      {/* ── Navbar ── */}
      <nav className="rc-navbar">
        <span className="brand"><HiMoon style={{color:"#a855f7"}} />hatFate</span>
        <div className="rc-nav-actions">
          <button className="history-back-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="rc-hero">
        <div className="rc-pref-pill">
          <span className="rc-pref-dot" />
          Matching Preference: Worldwide
          <span style={{ opacity: 0.4, marginLeft: 2 }}>ⓘ</span>
        </div>
        <h1>Destiny is calling…</h1>
        <p className="rc-timer">Time elapsed: {fmtTime(elapsed)}</p>
      </div>

      {/* ── Common interests ── */}
      {matchPayload?.commonInterests?.length > 0 && (
        <div className="rc-common">
          <span className="rc-common-label">Common interests:</span>
          {matchPayload.commonInterests.map((int: string, i: number) => (
            <span key={int} className="rc-common-tag" style={{ borderColor: colors[i] + '55', color: colors[i] }}>{int}</span>
          ))}
        </div>
      )}

      {/* ── Main content: two video cards side by side ── */}
      <div className="rc-content">

        {/* Left: My video */}
        <div className="rc-local-card">
          <div className="rc-card-topbar">
            <span className="rc-live-badge">
              <span className="rc-live-dot" />
              LIVE PREVIEW
            </span>
            {user.country && (
              <span className="rc-country-badge">
                <ReactCountryFlag countryCode={user.country} svg style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                {user.country}
              </span>
            )}
          </div>
          <div className="rc-video-area">
            <video autoPlay muted ref={myVideo} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="rc-user-info">
            <div className="rc-user-name-block">
              <span className="rc-user-name">{user.firstName ?? 'You'}</span>
              <span className="rc-user-status">{micMuted ? 'Mic off' : 'Ready to chat'}</span>
            </div>
            <div className="rc-cam-controls">
              <button
                className={`rc-cam-btn${micMuted ? ' off' : ''}`}
                title={micMuted ? 'Unmute mic' : 'Mute mic'}
                onClick={toggleMic}
              >
                {micMuted ? '🔇' : '🎤'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Partner video */}
        <div className="rc-partner-card">
          {partnerStatus !== 'connected' ? (
            <div className="rc-searching">
              <div className="rc-searching-icon">
                <span className="rc-searching-star">✦</span>
              </div>
              <div>
                <h3>{OVERLAY_CONFIG[partnerStatus as Exclude<PartnerStatus,'connected'>]?.line1 ?? 'Finding you a partner…'}</h3>
                <p>{OVERLAY_CONFIG[partnerStatus as Exclude<PartnerStatus,'connected'>]?.line2 ?? 'This usually takes a few seconds.'}</p>
              </div>
              {matchPayload?.commonInterests?.length > 0 && (
                <div className="rc-interest-tags">
                  {matchPayload.commonInterests.map((int: string) => (
                    <span key={int} className="rc-tag">{int}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rc-partner-video-wrap">
              <div className="rc-card-topbar">
                {partnerData && partnerId && (
                  <span className="rc-country-badge">
                    <ReactCountryFlag countryCode={partnerData.country} svg style={{ width: '14px', height: '14px', borderRadius: '50%' }} />
                    {partnerData.country}
                  </span>
                )}
              </div>
              <video
                autoPlay ref={userVideo}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                  opacity: partnerStatus === 'connected' ? 1 : 0,
                  transition: 'opacity 0.4s, filter 0.5s',
                  filter: contentWarning !== 'none' ? 'blur(20px)' : 'none',
                }}
              />
              <ContentWarningOverlay
                warning={contentWarning}
                detectionType={detectionType}
                onUnblur={() => setContentWarning('none')}
                onReport={handleManualReport}
                onSkip={handleSkip}
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Bottom action bar ── */}
      <div className="rc-bottom-bar">
        <button className="rc-action-btn rc-btn-skip" onClick={handleSkip}>
          ↺ Skip Match
        </button>
        <button
          className={`rc-action-btn rc-btn-friend ${friendRequestStatus ? 'sent' : ''}`}
          disabled={!callAccepted}
          onClick={() => {
            if (!partnerId) return;
            fetch(`${import.meta.env.VITE_SERVER_URL}/api/friends/request/${partnerId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            }).then(r => r.json()).then(d => {
              console.log('[Friend]', d.message);
              setFriendRequestStatus(true);
            }).catch(console.error);
          }}
        >
          {friendRequestStatus ? '✓ Request Sent' : '＋ Add Friend'}
        </button>
        {randomChatData && (
          <button
            className={`rc-action-btn rc-btn-chat${chatOpen ? ' active' : ''}`}
            onClick={() => setChatOpen(o => !o)}
            title="Toggle chat"
          >
            💬 Chat
          </button>
        )}
        <button className="rc-action-btn rc-btn-report" disabled={!callAccepted} onClick={() => setIsReportModalOpen(true)}>⚑</button>
      </div>

      {/* ── Slide-in chat panel ── */}
      <div className={`rc-chat-panel${chatOpen ? ' open' : ''}`}>
        <div className="rc-chat-panel-header">
          <span>Chat</span>
          <button className="rc-chat-close" onClick={() => setChatOpen(false)}>✕</button>
        </div>
        <div className="rc-chat-panel-body">
          {randomChatData && (
            <ChatBoxComp
              type="random"
              socket={socketRef.current}
              currentUserId={currentUserId}
              chatId={randomChatData._id}
              partnerData={partnerData}
            />
          )}
        </div>
      </div>
      {/* Backdrop to close chat on outside click */}
      {chatOpen && <div className="rc-chat-backdrop" onClick={() => setChatOpen(false)} />}

      {/* ── Footer ── */}
      <footer className="rc-footer">
        <span>© 2024 ChatFate. Connect with destiny.</span>
        <div className="rc-footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Safety</a>
          <a href="#">Help Center</a>
        </div>
      </footer>

      {/* ── Model loading pill ── */}
      {!modelReady && (
        <div className="rc-loading-pill">
          <span className="rc-loading-spin" />
          {loadingLabel}
        </div>
      )}
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
    </main>
  );
}

export default RandomCallPage;