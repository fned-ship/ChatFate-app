import { useState } from "react";
import { useParams } from "react-router-dom";
import './infopages.css';
import { HiMoon } from "react-icons/hi";


type Page = 'matching' | 'safety-guidelines' | 'privacy' | 'terms' | 'safety' | 'help';

interface InfoPagesProps {
  initialPage?: Page;
  onClose?: () => void;
}

const VALID_PAGES: Page[] = ['matching', 'safety-guidelines', 'privacy', 'terms', 'safety', 'help'];

const NAV_ITEMS: { id: Page; label: string; icon :any }[] = [
  {
    id: 'matching', label: 'How Matching Works',
    icon: <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  },
  {
    id: 'safety-guidelines', label: 'Safety Guidelines',
    icon: <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg>
  },
  {
    id: 'privacy', label: 'Privacy Policy',
    icon: <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
  },
  {
    id: 'terms', label: 'Terms of Service',
    icon: <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M9 12h6M9 16h4M7 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M9 3h6v4H9V3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
  },
  {
    id: 'safety', label: 'Safety Center',
    icon: <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  },
  {
    id: 'help', label: 'Help Center',
    icon: <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6"/><path d="M9 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  },
];

// ── Content Components ────────────────────────────────────────────────────────

function MatchingPage() {
  return (
    <article className="ip-article">
      <div className="ip-hero">
        <div className="ip-hero-icon">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="var(--purple-light)" strokeWidth="1.6" strokeLinejoin="round"/></svg>
        </div>
        <h1>How Matching Works</h1>
        <p className="ip-hero-sub">Our algorithm goes far beyond random pairing — it finds people you'll genuinely connect with.</p>
      </div>

      <section className="ip-section">
        <h2>The Interest-Matching Algorithm</h2>
        <p>When you enter a chat queue, our matchmaking engine scores every waiting user against your profile using a weighted interest-reciprocity model. The core scoring formula considers two levels of compatibility:</p>
        <div className="ip-score-cards">
          <div className="ip-score-card">
            <span className="ip-score-label">Exact match</span>
            <span className="ip-score-value">+30 pts</span>
            <p>You and a candidate share the same interest tag (e.g. both listed "Chess").</p>
          </div>
          <div className="ip-score-card">
            <span className="ip-score-label">Category match</span>
            <span className="ip-score-value">+10 pts</span>
            <p>Your interests fall in the same broad category (e.g. "Anime" and "Manga" both under Entertainment).</p>
          </div>
        </div>
        <p>The system selects the candidate with the highest cumulative score. This ensures the most compatible match is always prioritized before falling back to a broader pool.</p>
      </section>

      <section className="ip-section">
        <h2>Age-Gap Filtering</h2>
        <p>To foster comfortable conversations, the algorithm applies an age-gap filter of ±4 years by default. Users whose estimated age difference exceeds this threshold are deprioritized unless no other match is available.</p>
      </section>

      <section className="ip-section">
        <h2>The Fallback System</h2>
        <p>If no compatible match is found within <strong>10 seconds</strong>, the system automatically falls back to a random match to prevent long waiting times. You'll always be connected — the algorithm simply optimizes the quality of that connection whenever possible.</p>
        <div className="ip-flow">
          <div className="ip-flow-step">
            <span className="ip-flow-num">1</span>
            <div>
              <strong>Join queue</strong>
              <p>Your interests and age group are sent to the Redis matchmaking queue.</p>
            </div>
          </div>
          <div className="ip-flow-arrow">↓</div>
          <div className="ip-flow-step">
            <span className="ip-flow-num">2</span>
            <div>
              <strong>Score candidates</strong>
              <p>All waiting users are scored. The highest-scoring candidate is selected.</p>
            </div>
          </div>
          <div className="ip-flow-arrow">↓</div>
          <div className="ip-flow-step">
            <span className="ip-flow-num">3</span>
            <div>
              <strong>Establish connection</strong>
              <p>A WebRTC P2P session is signaled and the video stream begins — typically under 200ms latency.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ip-section">
        <h2>Why Your Interests Matter</h2>
        <p>The more interests you add to your profile, the better your matches will be. We recommend adding at least 3 interests across different categories. Interests are never shared with other users — they are used only internally for scoring.</p>
        <div className="ip-callout">
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15v-4m0-4h.01" stroke="var(--purple-light)" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <p>Adding more than 5 interests significantly increases match quality and reduces wait times.</p>
        </div>
      </section>
    </article>
  );
}

function SafetyGuidelinesPage() {
  return (
    <article className="ip-article">
      <div className="ip-hero">
        <div className="ip-hero-icon ip-hero-icon--green">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" stroke="var(--green)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/></svg>
        </div>
        <h1>Safety Guidelines</h1>
        <p className="ip-hero-sub">A safe environment requires both technology and community responsibility. Here's what you need to know.</p>
      </div>

      <section className="ip-section">
        <h2>Our AI Moderation System</h2>
        <p>ChatFate uses a real-time AI moderation system that operates entirely on your device (client-side). This "Zero-Exposure" approach means inappropriate content is detected and the video stream is cut <em>before</em> it is ever transmitted — not after.</p>
        <div className="ip-stat-row">
          <div className="ip-stat">
            <span className="ip-stat-value">500ms</span>
            <span className="ip-stat-label">Frame analysis interval</span>
          </div>
          <div className="ip-stat">
            <span className="ip-stat-value">85%</span>
            <span className="ip-stat-label">Confidence threshold for auto-ban</span>
          </div>
          <div className="ip-stat">
            <span className="ip-stat-value">Zero</span>
            <span className="ip-stat-label">Server exposure before cut</span>
          </div>
        </div>
      </section>

      <section className="ip-section">
        <h2>Community Guidelines</h2>
        <div className="ip-rule-list">
          {[
            ['Respect every person', 'Treat all users with dignity. Harassment, bullying, or targeted abuse of any kind will result in an immediate ban.'],
            ['No explicit content', 'Nudity or sexually explicit material is strictly prohibited. Our AI detects and cuts such content automatically.'],
            ['No hate speech', 'Language or behavior that targets people based on race, gender, religion, nationality, or sexual orientation is banned.'],
            ['No illegal activity', 'Do not use the platform to facilitate, discuss, or promote illegal activities.'],
            ['Protect minors', 'Any content involving or targeting minors is an absolute violation and will be reported to authorities.'],
            ['No harassment campaigns', 'Coordinating off-platform harassment using information obtained on ChatFate is banned.'],
          ].map(([title, desc]) => (
            <div className="ip-rule" key={title}>
              <div className="ip-rule-dot" />
              <div>
                <strong>{title}</strong>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ip-section">
        <h2>How to Report</h2>
        <p>If you encounter behavior that violates these guidelines, use the <strong>Report</strong> button during any session. Reports are reviewed and actioned within 24 hours. Repeat offenders are permanently banned.</p>
        <div className="ip-callout ip-callout--warning">
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#f0c040" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <p>False reporting is also a violation. Abuse of the reporting system may result in account suspension.</p>
        </div>
      </section>
    </article>
  );
}

function PrivacyPage() {
  return (
    <article className="ip-article">
      <div className="ip-hero">
        <div className="ip-hero-icon ip-hero-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#60a5fa" strokeWidth="1.6" strokeLinejoin="round"/></svg>
        </div>
        <h1>Privacy Policy</h1>
        <p className="ip-hero-sub">We are committed to protecting your personal data. This policy explains what we collect, why, and how.</p>
      </div>

      <div className="ip-toc">
        <span className="ip-toc-label">Sections</span>
        {['Data We Collect','How We Use Your Data','Data We Do NOT Collect','Data Retention','Your Rights','Cookies','Contact'].map(s => (
          <span key={s} className="ip-toc-item">{s}</span>
        ))}
      </div>

      <section className="ip-section">
        <h2>Data We Collect</h2>
        <div className="ip-data-table">
          {[
            ['Profile data', 'Username, email, profile photo, date of birth, country, gender, interests', 'Account creation and matching'],
            ['Session data', 'Connection timestamps, session duration, match history', 'Service improvement and history feature'],
            ['Reports & moderation', 'Report reason, optional screenshot URL, reporter and reported user IDs', 'Safety enforcement'],
            ['Authentication tokens', 'JWT stored in httpOnly cookie, OAuth tokens (Google)', 'Session management'],
          ].map(([type, data, purpose]) => (
            <div className="ip-data-row" key={type}>
              <div className="ip-data-type">{type}</div>
              <div className="ip-data-detail">
                <p>{data}</p>
                <span className="ip-data-purpose">{purpose}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ip-section">
        <h2>Data We Do NOT Collect</h2>
        <div className="ip-no-collect">
          {['Video or audio streams (never stored on our servers)', 'Financial or payment information', 'Real-time location data', 'Device contacts or other app data'].map(item => (
            <div className="ip-no-item" key={item}>
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M18 6L6 18M6 6l12 12" stroke="var(--green)" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ip-section">
        <h2>Data Retention</h2>
        <p>Your data is retained for as long as your account is active. Upon account deletion, all personal data is removed within 30 days. Chat history from random sessions is stored for 90 days then permanently deleted. Reports are retained for compliance purposes for up to 2 years.</p>
      </section>

      <section className="ip-section">
        <h2>Your Rights</h2>
        <p>You have the right to access, correct, export, or delete your personal data at any time. You can do this from the Settings page or by contacting our support team. We comply with applicable data protection regulations.</p>
      </section>

      <section className="ip-section">
        <h2>Security</h2>
        <p>All data is encrypted in transit (TLS). Passwords are hashed using bcrypt before storage. We use DDoS protection, NoSQL injection prevention, XSS protection, and rate limiting on all API endpoints.</p>
      </section>
    </article>
  );
}

function TermsPage() {
  return (
    <article className="ip-article">
      <div className="ip-hero">
        <div className="ip-hero-icon ip-hero-icon--amber">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32"><path d="M9 12h6M9 16h4M7 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M9 3h6v4H9V3z" stroke="#f0c040" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h1>Terms of Service</h1>
        <p className="ip-hero-sub">By using ChatFate, you agree to these terms. Please read them carefully.</p>
      </div>

      {[
        ['1. Eligibility', 'You must be at least 13 years old to use ChatFate. Users under 18 are subject to enhanced safety protections. By creating an account, you confirm that the information you provide is accurate and that you meet the age requirement.'],
        ['2. Acceptable Use', 'You agree to use ChatFate only for lawful purposes and in accordance with our Community Guidelines. You may not use the platform to harass, abuse, or harm others, to distribute illegal content, to impersonate others, or to attempt to gain unauthorized access to any part of the system.'],
        ['3. Account Responsibility', 'You are responsible for maintaining the security of your account credentials. Any activity conducted under your account is your responsibility. Notify us immediately if you suspect unauthorized access.'],
        ['4. Intellectual Property', 'The ChatFate platform, including its code, design, and branding, is proprietary. You may not reproduce, copy, or distribute any part of the service without explicit written permission.'],
        ['5. AI Moderation and Bans', 'Our AI moderation system may automatically suspend or ban accounts that violate our guidelines. You may appeal a ban by contacting support. We reserve the right to permanently ban users who commit serious violations without appeal.'],
        ['6. Disclaimer of Warranties', 'ChatFate is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service availability. We are not liable for content generated by users.'],
        ['7. Limitation of Liability', 'To the fullest extent permitted by law, ChatFate shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.'],
        ['8. Changes to Terms', 'We may update these Terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. We will notify users of material changes via email or an in-app notice.'],
      ].map(([title, body]) => (
        <section className="ip-section" key={title}>
          <h2>{title}</h2>
          <p>{body}</p>
        </section>
      ))}
    </article>
  );
}

function SafetyCenterPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = [
    ['How does the AI moderation work?', 'Our TensorFlow.js-based moderation runs entirely in your browser. It analyzes video frames every 500ms. If inappropriate content is detected with over 85% confidence, the stream is immediately cut and the offending user is banned from MongoDB — before any content reaches the other person.'],
    ['What happens when I report someone?', 'A report is logged with the reason, the IDs of both users, and optionally a screenshot. Our moderation team reviews all reports within 24 hours. Confirmed violations result in suspension or permanent ban depending on severity.'],
    ['Can I block someone?', 'Yes. After a session ends, you can block a user from your chat history. Blocked users can never be matched with you again.'],
    ['Is my video stored?', 'No. Video streams are P2P via WebRTC and never pass through our servers. We have no ability to store or replay your video sessions.'],
    ['What if someone under 18 uses the platform?', 'We use an AI-based age estimation feature to help verify user age groups. Users classified as minors are placed in age-appropriate matching pools and additional safety restrictions apply to their sessions.'],
    ['How do I delete my account?', 'You can delete your account from the Settings page. All your personal data will be removed within 30 days, in line with our Privacy Policy.'],
  ];

  return (
    <article className="ip-article">
      <div className="ip-hero">
        <div className="ip-hero-icon">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32"><circle cx="12" cy="12" r="10" stroke="var(--purple-light)" strokeWidth="1.6"/><path d="M12 8v4m0 4h.01" stroke="var(--purple-light)" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </div>
        <h1>Safety Center</h1>
        <p className="ip-hero-sub">Everything you need to stay safe — tools, policies, and answers to common questions.</p>
      </div>

      <section className="ip-section">
        <h2>Safety Features at a Glance</h2>
        <div className="ip-feature-grid">
          {[
            ['Zero-Exposure AI', 'Content is blocked before transmission, not after.', 'purple'],
            ['Interest-Based Matching', 'You only meet people you are likely to connect with.', 'blue'],
            ['Age Verification', 'AI-based age estimation protects younger users.', 'green'],
            ['One-Click Reporting', 'Report anyone instantly during or after a session.', 'amber'],
            ['Permanent Ban System', 'Repeat offenders are removed from the platform.', 'red'],
            ['End-to-End Encrypted Signaling', 'WebRTC connections use DTLS encryption for all media.', 'teal'],
          ].map(([title, desc, color]) => (
            <div className={`ip-feature-card ip-feature-card--${color}`} key={title}>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ip-section">
        <h2>Frequently Asked Questions</h2>
        <div className="ip-faq">
          {faqs.map(([q, a], i) => (
            <div className="ip-faq-item" key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="ip-faq-q">
                <span>{q}</span>
                <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {openFaq === i && <div className="ip-faq-a">{a}</div>}
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}

function HelpCenterPage() {
  const [search, setSearch] = useState('');
  const topics = [
    { cat: 'Account', q: 'How do I change my profile photo?', a: 'Go to the Edit Profile page from the settings icon in the top bar. Click on your profile photo and select a new image from your device.' },
    { cat: 'Account', q: 'How do I change my password?', a: 'Navigate to Edit Profile → Change Password. You will need to enter your current password and confirm the new one.' },
    { cat: 'Matching', q: 'Why is my wait time long?', a: 'Wait times increase when fewer users with matching interests are online. Adding more interests to your profile significantly reduces wait time. After 10 seconds the system falls back to random matching.' },
    { cat: 'Matching', q: 'Can I choose who I match with?', a: 'You cannot choose a specific person, but you can influence matches by setting your interests. The algorithm will prioritize users who share your interests.' },
    { cat: 'Chat', q: 'How do I add someone as a friend?', a: 'During or after a random chat session, you will see an "Add Friend" button. Your request will appear in their Requests tab on their profile page.' },
    { cat: 'Chat', q: 'Can I send images in chat?', a: 'Yes. In a friend chat, click the attachment icon in the message input bar to select and send images.' },
    { cat: 'Safety', q: 'How do I report a user?', a: 'Click the Report button visible during any active session, or access it from your chat history. Fill in the reason and optionally attach a screenshot.' },
    { cat: 'Safety', q: 'My account was banned. What can I do?', a: 'If you believe the ban was in error, contact our support team with your username and a description of the situation. We review all ban appeals within 48 hours.' },
    { cat: 'Technical', q: 'The video is lagging. How do I fix it?', a: 'Check your internet connection speed. WebRTC requires a stable connection. Try closing other bandwidth-heavy applications. If problems persist, try a different browser.' },
    { cat: 'Technical', q: 'My camera is not working. What should I do?', a: 'Ensure your browser has permission to access your camera. Check your browser settings under Privacy → Camera. Some antivirus software can also block camera access.' },
  ];

  const categories = Array.from(new Set(topics.map(t => t.cat)));
  const filtered = search.trim()
    ? topics.filter(t => t.q.toLowerCase().includes(search.toLowerCase()) || t.a.toLowerCase().includes(search.toLowerCase()))
    : topics;
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <article className="ip-article">
      <div className="ip-hero">
        <div className="ip-hero-icon ip-hero-icon--teal">
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32"><circle cx="12" cy="12" r="10" stroke="#2dd4bf" strokeWidth="1.6"/><path d="M9 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </div>
        <h1>Help Center</h1>
        <p className="ip-hero-sub">Find answers to common questions about ChatFate.</p>
      </div>

      <div className="ip-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ opacity: 0.45 }}><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        <input
          className="ip-search"
          placeholder="Search help articles…"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpenIdx(null); }}
        />
      </div>

      {!search.trim() ? (
        categories.map(cat => (
          <section className="ip-section" key={cat}>
            <h2>{cat}</h2>
            <div className="ip-faq">
              {topics.filter(t => t.cat === cat).map((t, i) => {
                const globalIdx = topics.indexOf(t);
                return (
                  <div className="ip-faq-item" key={i} onClick={() => setOpenIdx(openIdx === globalIdx ? null : globalIdx)}>
                    <div className="ip-faq-q">
                      <span>{t.q}</span>
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ transform: openIdx === globalIdx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {openIdx === globalIdx && <div className="ip-faq-a">{t.a}</div>}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      ) : (
        <section className="ip-section">
          <h2>{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</h2>
          {filtered.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.45)' }}>No articles found. Try different keywords or browse the categories.</p>
          ) : (
            <div className="ip-faq">
              {filtered.map((t, i) => (
                <div className="ip-faq-item" key={i} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
                  <div className="ip-faq-q">
                    <div>
                      <span className="ip-faq-cat-badge">{t.cat}</span>
                      <span>{t.q}</span>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" width="16" height="16" style={{ transform: openIdx === i ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {openIdx === i && <div className="ip-faq-a">{t.a}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </article>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const InfoPages: React.FC<InfoPagesProps> = ({ initialPage = 'matching', onClose }) => {
  const { page: pageParam } = useParams<{ page: string }>();

  // Use the URL param if it's a valid page, otherwise fall back to initialPage prop
  const resolvedInitialPage: Page =
    pageParam && VALID_PAGES.includes(pageParam as Page)
      ? (pageParam as Page)
      : initialPage;

  const [page, setPage] = useState<Page>(resolvedInitialPage);
  const [mobileNav, setMobileNav] = useState(false);

  const renderPage = () => {
    switch (page) {
      case 'matching':          return <MatchingPage />;
      case 'safety-guidelines': return <SafetyGuidelinesPage />;
      case 'privacy':           return <PrivacyPage />;
      case 'terms':             return <TermsPage />;
      case 'safety':            return <SafetyCenterPage />;
      case 'help':              return <HelpCenterPage />;
    }
  };

  return (
    <div className="ip-root">
      {/* Header */}
      <header className="ip-header">
        <div className="ip-header-brand">
          {/* <div className="ip-brand-icon" /> */}
          <span className="brand"><HiMoon style={{color:"#a855f7"}} />hatFate</span>
        </div>
        <button className="ip-mobile-nav-btn" onClick={() => setMobileNav(v => !v)} aria-label="Toggle navigation">
          <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>
        {onClose && (
          <button className="ip-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        )}
      </header>

      <div className="ip-layout">
        {/* Sidebar */}
        <nav className={`ip-sidebar${mobileNav ? ' ip-sidebar--open' : ''}`}>
          <span className="ip-sidebar-label">Navigation</span>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`ip-nav-item${page === item.id ? ' ip-nav-item--active' : ''}`}
              onClick={() => { setPage(item.id); setMobileNav(false); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mobile backdrop */}
        {mobileNav && <div className="ip-backdrop" onClick={() => setMobileNav(false)} />}

        {/* Main content */}
        <main className="ip-main">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default InfoPages;