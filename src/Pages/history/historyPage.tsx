import { useState, useEffect, useCallback,useRef } from "react";
import Cookies from 'js-cookie';
import ReactCountryFlag from "react-country-flag";
import api from "../../services/api";



interface Partner {
  _id: string;
  userName: string;
  photo: string;
  country: string;
}

interface ChatEntry {
  randomChatId: string;
  dateTalked: string;
  partner: Partner;
}

interface MessageSender {
  _id: string;
  firstName: string;
  lastName: string;
  userName: string;
  photo: string;
}

interface ReplyTo {
  _id: string;
  text?: string;
  sender?: string;
  imagesFiles?: string[];
  otherFiles?: string[];
}

interface ApiMessage {
  _id: string;
  chatId: string;
  chatModel: string;
  sender: MessageSender;
  text?: string;
  imagesFiles?: string[];
  otherFiles?: string[];
  replyTo?: ReplyTo;
  createdAt: string;
  updatedAt: string;
}

interface MessagesApiResponse {
  page: number;
  messages: ApiMessage[];
}



function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

function groupByDay(entries: ChatEntry[]): [string, ChatEntry[]][] {
  const map = new Map<string, ChatEntry[]>();
  entries.forEach((entry) => {
    const key = new Date(entry.dateTalked).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  });
  return Array.from(map.entries());
}

const btnStyle: React.CSSProperties = {
  fontSize: 13,
  padding: "5px 12px",
  borderRadius: 8,
  background: "blue",
  color: "white"
};


interface ChatModalProps {
  entry: ChatEntry;
  currentUserId: string;
  onClose: () => void;
}

function ChatModal({ entry, currentUserId, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  
  const fetchPage = useCallback(
    async (pageNum: number, prepend = false) => {
      const { data } = await api.get<MessagesApiResponse>(
        `/api/random-chats/${entry.randomChatId}/messages`,
        { params: { page: pageNum } }
      );

      const fetched = data.messages;
      // API returns newest-first → reverse to oldest-first for display
      const sorted = [...fetched].reverse();

      setMessages((prev) => (prepend ? [...sorted, ...prev] : sorted));
      // If we got fewer results than expected, no more pages
      setHasMore(fetched.length > 0);
    },
    [entry.randomChatId]
  );

  // Initial load
  useEffect(() => {
    setLoadingInitial(true);
    fetchPage(1)
      .catch((err) =>
        setError(err?.response?.data?.message ?? "Failed to load messages.")
      )
      .finally(() => setLoadingInitial(false));
  }, [fetchPage]);

  // Scroll to bottom only on first load
  useEffect(() => {
    if (!loadingInitial) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [loadingInitial]);

  const loadOlder = async () => {
    if (loadingMore || !hasMore) return;
    const container = scrollContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;

    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    try {
      await fetchPage(nextPage, true);
    } catch (err) {
      setError(err?.response?.data?.message ?? "Failed to load more messages.");
    } finally {
      setLoadingMore(false);
      if (container) {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      }
    }
  };

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#8253848f",
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit:'cover'
              }} src={`${import.meta.env.VITE_SERVER_URL}/${entry.partner.photo}`} alt="" />
            
            <div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{entry.partner.userName}</div>
              
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "gray",
              borderRadius:"50%",
              fontSize: 10,
              color: "white",
              width:20,
              height:20
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Load older button ── */}
        {!loadingInitial && !error && hasMore && (
          <div
            style={{
              textAlign: "center",
              padding: "8px 0",
              flexShrink: 0,
              borderBottom: "0.5px solid  #e5e5e5",
            }}
          >
            <button onClick={loadOlder} disabled={loadingMore} style={{ ...btnStyle, fontSize: 12 }}>
              {loadingMore ? "Loading…" : "↑ Load older messages"}
            </button>
          </div>
        )}

        {/* ── Messages area ── */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {loadingInitial && (
            <div style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "2rem 0" }}>
              Loading…
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", color: "#c0392b", fontSize: 13, padding: "2rem 0" }}>
              {error}
            </div>
          )}

          {!loadingInitial && !error && messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#888", fontSize: 13, padding: "2rem 0" }}>
              No messages in this chat.
            </div>
          )}

          { messages.map((msg) => {
            const isMe = msg.sender._id === currentUserId;

            return (
              <div
                key={msg._id}
                style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}
              >
                

                {/* Bubble */}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "8px 12px",
                    borderRadius:12,
                    background: isMe
                      ? "rgb(41, 41, 41)"
                      : "var(--mainPurple)",
                    color: "white",
                    fontSize: 15,
                    lineHeight: 1.5,
                  }}
                >
                  

                  {msg.text && <div>{msg.text}</div>}


                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────



export default function ChatHistory(  ) {
const currentUserId = Cookies.get('userId');
  const [history,setHistory]=useState([])
  useEffect(()=>{api.get('/api/random-chats/history')
  .then(res =>{ setHistory(res.data) ; console.log(res.data)})
  .catch(error => console.error('Fetch error:', error))},[])


  const [activeEntry, setActiveEntry] = useState<ChatEntry | null>(null);
  const groups = groupByDay(history);

  return (
    <div style={{ padding: "1.5rem", display:'flex',gap:"2rem",alignItems:'center',width:'100%',minHeight:'100vh',flexDirection:'column',backgroundColor:'var(--mainPurple)'}}>
      <img src="/bg2.jpg" alt="" className="background"  style={{zIndex:0}}/>
      <div className="overlay" style={{zIndex:0}} />
      <span style={{zIndex:1, alignSelf:'start',fontSize:18,fontFamily:'Times New Roman'}}>Your History of random chat and video Calls</span>
      {groups.map(([dateKey, entries]) => (
        <div key={dateKey} style={{ width:"100%" ,maxWidth:'900px', zIndex:1 }}>
          <div style={{width:'100%',display:'flex',alignItems:'center', gap:'1rem', marginBottom:'1rem'}}>
            <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color:  "white"
            }}
          >
            {formatDayLabel(entries[0].dateTalked)}
          </div>
          <div style={{flex:1,height:1,backgroundColor:'white'}}></div>
          </div>
          

          {entries.map((entry) => (
            <div
              key={entry.randomChatId}
              style={{
                borderRadius: 12,
                padding: "0.875rem 1rem",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <img style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit:'cover'
              }} src={`${import.meta.env.VITE_SERVER_URL}/${entry.partner.photo}`} alt="" />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "white" }}>
                  {entry.partner.userName}
                </div>
                <div style={{ fontSize: 12, color: " #888", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                  <span>{formatTime(entry.dateTalked)}</span>
                  <ReactCountryFlag countryCode={entry.partner.country} className="flag" svg  />
                </div>
              </div>

              <button onClick={() => setActiveEntry(entry)} style={btnStyle}>
                View chat log
              </button>
            </div>
          ))}
        </div>
      ))}

      {activeEntry && (
        <ChatModal
          entry={activeEntry}
          currentUserId={currentUserId}
          onClose={() => setActiveEntry(null)}
        />
      )}
    </div>
  );
}