import { useState, useEffect, useCallback, useRef } from "react";
import Cookies from 'js-cookie';
import ReactCountryFlag from "react-country-flag";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import './historypage.css';

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

interface ApiMessage {
  _id: string;
  chatId: string;
  sender: MessageSender;
  text?: string;
  imagesFiles?: string[];
  otherFiles?: string[];
  replyTo?: { _id: string; text?: string };
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
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

// ─── Chat Modal ───────────────────────────────────────────────────────────────
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
      const sorted = [...data.messages].reverse();
      setMessages((prev) => (prepend ? [...sorted, ...prev] : sorted));
      setHasMore(data.messages.length > 0);
    },
    [entry.randomChatId]
  );

  useEffect(() => {
    setLoadingInitial(true);
    fetchPage(1)
      .catch((err) => setError(err?.response?.data?.message ?? "Failed to load messages."))
      .finally(() => setLoadingInitial(false));
  }, [fetchPage]);

  useEffect(() => {
    if (!loadingInitial) messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
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
      if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
    }
  };

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-panel">

        {/* Header */}
        <div className="modal-header">
          <img
            className="modal-avatar"
            src={`${import.meta.env.VITE_SERVER_URL}/${entry.partner.photo}`}
            alt=""
          />
          <div>
            <div className="modal-partner-name">{entry.partner.userName}</div>
            <div className="modal-partner-date">Chatted on {formatDate(entry.dateTalked)}</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Load older */}
        {!loadingInitial && !error && hasMore && (
          <div className="modal-load-older">
            <button className="modal-load-btn" onClick={loadOlder} disabled={loadingMore}>
              <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
                <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {loadingMore ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="modal-messages" ref={scrollContainerRef}>
          {loadingInitial && <div className="msg-loading">Loading…</div>}
          {error && <div className="msg-error">{error}</div>}
          {!loadingInitial && !error && messages.length === 0 && (
            <div className="msg-empty">No messages in this chat.</div>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender._id === currentUserId;
            return (
              <div key={msg._id} className={`msg-row ${isMe ? 'mine' : 'theirs'}`}>
                <div className="msg-bubble">{msg.text}</div>
                <span className="msg-time">{formatTime(msg.createdAt)}</span>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <span className="modal-footer-note">You are viewing a permanent record of this conversation.</span>
          <button className="modal-report-btn">Report issue</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ChatHistory() {
  const currentUserId = Cookies.get('userId');
  const navigate = useNavigate();
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [search, setSearch] = useState("");
  const [activeEntry, setActiveEntry] = useState<ChatEntry | null>(null);

  useEffect(() => {
    api.get('/api/random-chats/history')
      .then(res => setHistory(res.data))
      .catch(err => console.error('Fetch error:', err));
  }, []);

  const filtered = history.filter(e =>
    e.partner.userName.toLowerCase().includes(search.toLowerCase())
  );
  const groups = groupByDay(filtered);

  return (
    <div className="history-page">

      {/* Header */}
      <header className="history-header">
        <button className="history-back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <span className="history-header-title">Chat History</span>

        <div className="history-header-search">
          <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
            <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Body */}
      <main className="history-body">
        {groups.length === 0 && (
          <div className="history-empty">
            <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
              <path d="M8 10h8M8 14h4M12 3C7.03 3 3 7.03 3 12c0 1.74.5 3.37 1.36 4.74L3 21l4.26-1.36A9 9 0 1 0 12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h3>No chat history yet</h3>
            <p>Your random chat sessions will appear here.</p>
          </div>
        )}

        {groups.map(([dateKey, entries], gi) => (
          <div key={dateKey} className="day-group" style={{ animationDelay: `${gi * 0.05}s` }}>
            <div className="day-label-row">
              <span className="day-label">{formatDayLabel(entries[0].dateTalked)}</span>
              <div className="day-line" />
            </div>

            {entries.map((entry, ei) => (
              <div
                key={entry.randomChatId}
                className="history-entry"
                style={{ animationDelay: `${gi * 0.05 + ei * 0.04}s` }}
              >
                <img
                  className="history-avatar"
                  src={`${import.meta.env.VITE_SERVER_URL}/${entry.partner.photo}`}
                  alt=""
                />

                <div className="history-entry-info">
                  <div className="history-entry-name">
                    {entry.partner.userName}
                    <span className="new-connection-badge">New Connection</span>
                  </div>
                  <div className="history-entry-meta">
                    <svg viewBox="0 0 24 24" fill="none" width="11" height="11">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>{formatTime(entry.dateTalked)}</span>
                    <span className="dot">•</span>
                    <span>Duration: —</span>
                    {entry.partner.country && (
                      <>
                        <span className="dot">•</span>
                        <ReactCountryFlag countryCode={entry.partner.country} svg className="flag" />
                      </>
                    )}
                  </div>
                </div>

                <button className="history-view-btn" onClick={() => setActiveEntry(entry)}>
                  <svg viewBox="0 0 24 24" fill="none" width="13" height="13">
                    <path d="M8 10h8M8 14h4M12 3C7.03 3 3 7.03 3 12c0 1.74.5 3.37 1.36 4.74L3 21l4.26-1.36A9 9 0 1 0 12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  View chat log
                </button>
              </div>
            ))}
          </div>
        ))}
      </main>

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