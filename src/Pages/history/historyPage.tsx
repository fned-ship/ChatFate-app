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

  // Fetch a specific page; prepend=true when loading older messages
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
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load more messages.");
    } finally {
      setLoadingMore(false);
      // Restore scroll position after prepending older messages
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
              }} src={`${import.meta.env.VITE_SERVER_URL}/imagesProfile/${entry.partner.photo}`} alt="" />
            
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

          { [
  {
    _id: '661bc4f5d2a1b2c3d4e5f601',
    chatId: '69d5a1c2b3e4f5a6b7c8d9e0',
    chatModel: 'RandomChat',
    sender: {
      _id: '69d2bf992b0a11976d2fb07b',
      firstName: 'Alex',
      lastName: 'Rivera',
      userName: 'arivera_99',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    },
    text: "Hey! Did you get a chance to look at the project requirements?",
    imagesFiles: [],
    otherFiles: ['requirements.pdf'],
    replyTo: null,
    createdAt: '2026-04-14T14:30:00.000Z',
    updatedAt: '2026-04-14T14:30:00.000Z'
  },
  {
    _id: '661bc521d2a1b2c3d4e5f602',
    chatId: '69d5a1c2b3e4f5a6b7c8d9e0',
    chatModel: 'RandomChat',
    sender: {
      _id: '69d3f0b432cd16722c4e9ae5',
      firstName: 'Jordan',
      lastName: 'Lee',
      userName: 'jlee_dev',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan'
    },
    text: "Just finished reading them. The UI section looks a bit complex.",
    imagesFiles: ['https://example.com/storage/ui-mockup.png'],
    otherFiles: [],
    replyTo: {
      _id: '661bc4f5d2a1b2c3d4e5f601',
      text: "Hey! Did you get a chance to look at the project requirements?",
      sender: '69d2bf992b0a11976d2fb07b',
      imagesFiles: [],
      otherFiles: ['requirements.pdf']
    },
    createdAt: '2026-04-14T14:35:15.000Z',
    updatedAt: '2026-04-14T14:35:15.000Z'
  },
  {
    _id: '661bc544d2a1b2c3d4e5f603',
    chatId: '69d5a1c2b3e4f5a6b7c8d9e0',
    chatModel: 'RandomChat',
    sender: {
      _id: '69d2bf992b0a11976d2fb07b',
      firstName: 'Alex',
      lastName: 'Rivera',
      userName: 'arivera_99',
      photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
    },
    text: "Agreed, we might need to simplify the dashboard.",
    imagesFiles: [],
    otherFiles: [],
    replyTo: {
      _id: '661bc521d2a1b2c3d4e5f602',
      text: "Just finished reading them. The UI section looks a bit complex.",
      sender: '69d3f0b432cd16722c4e9ae5',
      imagesFiles: ['https://example.com/storage/ui-mockup.png'],
      otherFiles: []
    },
    createdAt: '2026-04-14T14:40:02.000Z',
    updatedAt: '2026-04-14T14:40:02.000Z'
  }
].map((msg) => {
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
  const history=[{
"randomChatId": "69dd041d3a58e8b5634497d1",
"dateTalked": "2026-04-13T14:56:29.162Z",
"partner": {
"_id": "69d2bf992b0a11976d2fb07b",
"userName": "fned_youssef",
"photo": "1775419289144-413331708.png",
"country": "DK"
}
},
{
"randomChatId": "69dd041d3a58e8b5634497cf",
"dateTalked": "2026-04-13T14:56:29.139Z",
"partner": {
"_id": "69d2bf992b0a11976d2fb07b",
"userName": "fned_youssef",
"photo": "1775419289144-413331708.png",
"country": "DK"
}
}]
  const [activeEntry, setActiveEntry] = useState<ChatEntry | null>(null);
  const groups = groupByDay(history);

  return (
    <div style={{ padding: "1.5rem", display:'flex',gap:"2rem",alignItems:'center',flex:1,flexDirection:'column'}}>
      {groups.map(([dateKey, entries]) => (
        <div key={dateKey} style={{ width:"100%" ,maxWidth:'900px' }}>
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
              }} src={`${import.meta.env.VITE_SERVER_URL}/imagesProfile/${entry.partner.photo}`} alt="" />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "black" }}>
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