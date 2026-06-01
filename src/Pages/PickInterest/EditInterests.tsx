import { useEffect, useState } from 'react'
import './editinterestsstyle.css'
import Cookies from 'js-cookie';
import api from '../../services/api';
import { HiMoon } from "react-icons/hi";

const EditInterests = () => {
  const [interests, setInterests] = useState<Record<string, { id: string; name: string }[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(import.meta.env.VITE_SERVER_URL + "/api/interests")
      .then(r => { if (!r.ok) throw new Error('Network response was not ok'); return r.json(); })
      .then(data => { setInterests(data); setLoading(false); })
      .catch(err => { console.error('Fetch error:', err); setLoading(false); });
  }, []);

  const [picked, setPicked] = useState<string[]>(() => {
    try {
      const userCookie = Cookies.get('user');
      if (userCookie) return JSON.parse(userCookie).interests.map((i: any) => i._id);
    } catch (e) { console.error("Failed to parse user cookie", e); }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const MAX = 15;
  const MIN = 3;

  const toggleInterest = (id: string, e: React.MouseEvent) => {
    if (picked.includes(id)) {
      setPicked(prev => prev.filter(p => p !== id));
    } else if (picked.length < MAX) {
      setPicked(prev => [...prev, id]);
    } else {
      const target = e.currentTarget as HTMLElement;
      target.classList.add('shake');
      setTimeout(() => target.classList.remove('shake'), 500);
    }
  };

  const countInCategory = (cat: string) =>
    (interests[cat] ?? []).filter(i => picked.includes(i.id)).length;

  const progressPct = Math.min((picked.length / MAX) * 100, 100);
  const isReady = picked.length >= MIN;

  return (
    <div className="interestPage">

      {/* ── Navbar ── */}
      <nav className="ei-navbar">
        <span className="brand"><HiMoon style={{color:"#a855f7"}} />hatFate</span>
        <div className="ei-nav-right">
          <span className={`ei-counter-badge${picked.length >= MAX ? ' warn' : ''}`}>
            {picked.length} / {MAX} selected
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="ei-hero">
        <h1>Pick Your <span>Interests</span></h1>
        <p>Select at least {MIN} interests to help us find you better matches. You can pick up to {MAX}.</p>
      </div>

      {/* ── Progress bar ── */}
      <div className="ei-progress-wrap">
        <div className="ei-progress-track">
          <div className="ei-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="ei-loading">
          <div className="ei-loading-spinner" />
          Loading interests…
        </div>
      )}

      {/* ── Category cards ── */}
      {!loading && (
        <div className="ei-categories">
          {Object.keys(interests).map(cat => {
            const selCount = countInCategory(cat);
            return (
              <div className="cat" key={cat}>
                {/* Card header with background image */}
                <div className="cat-header">
                  <div
                    className="cat-bg"
                    style={{ backgroundImage: `url("/${cat}.jpg")` }}
                  />
                  <div className="cat-overlay" />
                  <span className="cat-name">{cat}</span>
                  {selCount > 0 && (
                    <span className="cat-selected-count">{selCount} picked</span>
                  )}
                </div>

                {/* Interest chips */}
                <div className="cat-body">
                  {interests[cat].map(i => (
                    <div
                      key={i.id}
                      className={`intr${picked.includes(i.id) ? ' selected' : ''}`}
                      onClick={e => toggleInterest(i.id, e)}
                    >
                      {i.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky footer bar ── */}
      <div className="ei-footer-bar">
        <p className="ei-footer-hint">
          {picked.length < MIN
            ? <>Pick <strong>{MIN - picked.length} more</strong> to continue</>
            : <>You've picked <strong>{picked.length}</strong> interest{picked.length !== 1 ? 's' : ''} — looking good!</>
          }
        </p>
        <button
          className="submit-button"
          disabled={isLoading || !isReady}
          onClick={async () => {
            if (picked.length < MIN) {
              setMessage({ type: 'error', text: `Minimum of ${MIN} interests need to be picked.` });
              return;
            }
            setIsLoading(true);
            try {
              await api.put('/api/profile/interests', { interests: picked });
              setMessage({ type: 'success', text: 'Interests saved successfully!' });
              Cookies.set('user', JSON.stringify({ ...JSON.parse(Cookies.get('user') ?? '{}'), interests: picked }), { expires: 7 });
            } catch (err) {
              console.error(err);
              setMessage({ type: 'error', text: 'Failed to save. Please try again.' });
            } finally {
              setIsLoading(false);
            }
          }}
        >
          {isLoading ? 'Saving…' : '✦ Save Changes'}
        </button>
      </div>

      {/* ── Alert toast ── */}
      {message && (
        <div
          className={`alert-message ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
          onClick={() => setMessage(null)}
        >
          {message.text}
        </div>
      )}

    </div>
  );
};

export default EditInterests;