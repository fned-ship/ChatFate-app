import './styleProfile.css'
import ChatBoxComp from '../../Components/chatBox';
import { useEffect, useState } from 'react';
import { getMyChats, getChat } from '../../services/chatServices';
import { getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../../services/userServices';
import Cookies from 'js-cookie';
import io, { Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { HiMoon } from "react-icons/hi";

const Profile = () => {
    const currentUserId = Cookies.get('userId');
    const socket: Socket = io(import.meta.env.VITE_SERVER_URL, {
        auth: { userId: currentUserId }
    });

    const navigate = useNavigate();
    const me = JSON.parse(Cookies.get('user') ?? '{}');

    useEffect(() => {
        if (Object.keys(me).length === 0) navigate('/auth/login');
    }, []);

    const [searchTerm, setsearchTerm] = useState("");
    const [showrequests, setShowRequests] = useState<boolean>(false);
    const [partner, setPartner] = useState(null);
    const [chats, setChats] = useState([]);
    const [requests, setrequests] = useState([]);
    const [openChat, setOpenChat] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

    const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

    useEffect(() => {
        getMyChats().then(res => { setChats(res.data); });
        getFriendRequests().then(res => setrequests(res.data));
    }, []);

    useEffect(() => {
        if (openChat) { socket.emit('join_chat', { chatId: openChat._id }); }
    }, [openChat]);

    // Close drawer when a chat is opened on mobile
    const handleSelectChat = (friend) => {
        const friendUser = friend.participants[0]._id === me._id
            ? friend.participants[1]
            : friend.participants[0];
        setPartner(friendUser);
        if (openChat) socket.emit('leave_chat', { chatId: openChat._id });
        getChat(friendUser._id)
            .then(res => {
                setOpenChat(res.data);
                if (isMobile()) setDrawerOpen(false);
            })
            .catch(e => console.log("error:", e));
    };

    const handleClickRandomChat = (url) => {
        if (me.interests?.length < 3) {
            navigate("/interests");
        } else {
            navigate(url);
        }
    };

    return (
        <main className="profilepage">
            {/* ── HEADER ── */}
            <header>
                {/* Hamburger — mobile only */}
                <button
                    className="hamburger"
                    onClick={() => setDrawerOpen(v => !v)}
                    aria-label="Toggle friends"
                >
                    <span /><span /><span />
                </button>

                <span className="brand"><HiMoon style={{color:"#a855f7"}} />hatFate</span>

                <div className="tools">
                    {/* History */}
                    <svg onClick={() => navigate('/history')} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                        <path d="M3 5.67541V3C3 2.44772 2.55228 2 2 2C1.44772 2 1 2.44772 1 3V7C1 8.10457 1.89543 9 3 9H7C7.55229 9 8 8.55229 8 8C8 7.44772 7.55229 7 7 7H4.52186C4.54218 6.97505 4.56157 6.94914 4.57995 6.92229C5.621 5.40094 7.11009 4.22911 8.85191 3.57803C10.9074 2.80968 13.173 2.8196 15.2217 3.6059C17.2704 4.3922 18.9608 5.90061 19.9745 7.8469C20.9881 9.79319 21.2549 12.043 20.7247 14.1724C20.1945 16.3018 18.9039 18.1638 17.0959 19.4075C15.288 20.6513 13.0876 21.1909 10.9094 20.9247C8.73119 20.6586 6.72551 19.605 5.27028 17.9625C4.03713 16.5706 3.27139 14.8374 3.06527 13.0055C3.00352 12.4566 2.55674 12.0079 2.00446 12.0084C1.45217 12.0088 0.995668 12.4579 1.04626 13.0078C1.25994 15.3309 2.2082 17.5356 3.76666 19.2946C5.54703 21.3041 8.00084 22.5931 10.6657 22.9188C13.3306 23.2444 16.0226 22.5842 18.2345 21.0626C20.4464 19.541 22.0254 17.263 22.6741 14.6578C23.3228 12.0526 22.9963 9.30013 21.7562 6.91897C20.5161 4.53782 18.448 2.69239 15.9415 1.73041C13.4351 0.768419 10.6633 0.756291 8.14853 1.69631C6.06062 2.47676 4.26953 3.86881 3 5.67541Z"/>
                        <path d="M12 5C11.4477 5 11 5.44771 11 6V12.4667C11 12.4667 11 12.7274 11.1267 12.9235C11.2115 13.0898 11.3437 13.2344 11.5174 13.3346L16.1372 16.0019C16.6155 16.278 17.2271 16.1141 17.5032 15.6358C17.7793 15.1575 17.6155 14.546 17.1372 14.2698L13 11.8812V6C13 5.44772 12.5523 5 12 5Z"/>
                    </svg>
                    {/* Settings */}
                    <svg onClick={() => navigate('/editInfo')} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M14.2788 2.15224C13.9085 2 13.439 2 12.5 2C11.561 2 11.0915 2 10.7212 2.15224C10.2274 2.35523 9.83509 2.74458 9.63056 3.23463C9.53719 3.45834 9.50065 3.7185 9.48635 4.09799C9.46534 4.65568 9.17716 5.17189 8.69017 5.45093C8.20318 5.72996 7.60864 5.71954 7.11149 5.45876C6.77318 5.2813 6.52789 5.18262 6.28599 5.15102C5.75609 5.08178 5.22018 5.22429 4.79616 5.5472C4.47814 5.78938 4.24339 6.1929 3.7739 6.99993C3.30441 7.80697 3.06967 8.21048 3.01735 8.60491C2.94758 9.1308 3.09118 9.66266 3.41655 10.0835C3.56506 10.2756 3.77377 10.437 4.0977 10.639C4.57391 10.936 4.88032 11.4419 4.88029 12C4.88026 12.5581 4.57386 13.0639 4.0977 13.3608C3.77372 13.5629 3.56497 13.7244 3.41645 13.9165C3.09108 14.3373 2.94749 14.8691 3.01725 15.395C3.06957 15.7894 3.30432 16.193 3.7738 17C4.24329 17.807 4.47804 18.2106 4.79606 18.4527C5.22008 18.7756 5.75599 18.9181 6.28589 18.8489C6.52778 18.8173 6.77305 18.7186 7.11133 18.5412C7.60852 18.2804 8.2031 18.27 8.69012 18.549C9.17714 18.8281 9.46533 19.3443 9.48635 19.9021C9.50065 20.2815 9.53719 20.5417 9.63056 20.7654C9.83509 21.2554 10.2274 21.6448 10.7212 21.8478C11.0915 22 11.561 22 12.5 22C13.439 22 13.9085 22 14.2788 21.8478C14.7726 21.6448 15.1649 21.2554 15.3694 20.7654C15.4628 20.5417 15.4994 20.2815 15.5137 19.902C15.5347 19.3443 15.8228 18.8281 16.3098 18.549C16.7968 18.2699 17.3914 18.2804 17.8886 18.5412C18.2269 18.7186 18.4721 18.8172 18.714 18.8488C19.2439 18.9181 19.7798 18.7756 20.2038 18.4527C20.5219 18.2105 20.7566 17.807 21.2261 16.9999C21.6956 16.1929 21.9303 15.7894 21.9827 15.395C22.0524 14.8691 21.9088 14.3372 21.5835 13.9164C21.4349 13.7243 21.2262 13.5628 20.9022 13.3608C20.4261 13.0639 20.1197 12.558 20.1197 11.9999C20.1197 11.4418 20.4261 10.9361 20.9022 10.6392C21.2263 10.4371 21.435 10.2757 21.5836 10.0835C21.9089 9.66273 22.0525 9.13087 21.9828 8.60497C21.9304 8.21055 21.6957 7.80703 21.2262 7C20.7567 6.19297 20.522 5.78945 20.2039 5.54727C19.7799 5.22436 19.244 5.08185 18.7141 5.15109C18.4722 5.18269 18.2269 5.28136 17.8887 5.4588C17.3915 5.71959 16.7969 5.73002 16.3099 5.45096C15.8229 5.17191 15.5347 4.65566 15.5136 4.09794C15.4993 3.71848 15.4628 3.45833 15.3694 3.23463C15.1649 2.74458 14.7726 2.35523 14.2788 2.15224ZM12.5 15C14.1695 15 15.5228 13.6569 15.5228 12C15.5228 10.3431 14.1695 9 12.5 9C10.8305 9 9.47716 10.3431 9.47716 12C9.47716 13.6569 10.8305 15 12.5 15Z"/>
                    </svg>
                    {/* Logout */}
                    <svg onClick={() => {
                        navigate('/auth/login');
                        document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
                        <path d="M4 5.4A1.4 1.4 0 0 1 5.4 4h6.2A1.4 1.4 0 0 1 13 5.4V8a1 1 0 1 0 2 0V5.4A3.4 3.4 0 0 0 11.6 2H5.4A3.4 3.4 0 0 0 2 5.4v13.2A3.4 3.4 0 0 0 5.4 22h6.2a3.4 3.4 0 0 0 3.4-3.4V16a1 1 0 1 0-2 0v2.6a1.4 1.4 0 0 1-1.4 1.4H5.4A1.4 1.4 0 0 1 4 18.6V5.4Z"/>
                        <path d="M17.293 8.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 0 1-1.414-1.414L18.586 13H7a1 1 0 1 1 0-2h11.586l-1.293-1.293a1 1 0 0 1 0-1.414Z"/>
                    </svg>
                </div>
            </header>

            {/* ── BODY ── */}
            <div className="rest">

                {/* Drawer backdrop — mobile only */}
                {drawerOpen && (
                    <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
                )}

                {/* Sidebar / Drawer */}
                <div className={`friendList${drawerOpen ? ' drawer-open' : ''}`}>
                    {/* Profile row */}
                    <div className="profile" onClick={() => navigate('/editInfo')}>
                        <img src={`${import.meta.env.VITE_SERVER_URL}/${me.photo}`} alt="" />
                        <span>Welcome, {me.userName}!</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" version="1.1">
                            <g transform="matrix(0.95173205,0,0,0.95115787,13.901174,12.168794)">
                                <path d="M 447.70881 -12.781343 A 42.041451 42.041451 0 0 0 405.66786 29.260344 L 405.66786 50.301721 L 27.434765 50.301721 A 42.041302 42.041302 0 0 0 -14.606185 92.341354 A 42.041302 42.041302 0 0 0 27.434765 134.38304 L 405.66786 134.38304 L 405.66786 155.44906 A 42.041451 42.041451 0 0 0 447.70881 197.49075 A 42.041451 42.041451 0 0 0 489.74976 155.44906 L 489.74976 134.38304 L 573.78036 134.38304 A 42.041302 42.041302 0 0 0 615.82336 92.341354 A 42.041302 42.041302 0 0 0 573.78036 50.301721 L 489.74976 50.301721 L 489.74976 29.260344 A 42.041451 42.041451 0 0 0 447.70881 -12.781343 z M 143.0012 197.48869 A 42.041451 42.041451 0 0 0 100.9582 239.53038 L 100.9582 260.5697 L 27.447078 260.5697 A 42.041302 42.041302 0 0 0 -14.593872 302.61139 A 42.041302 42.041302 0 0 0 27.447078 344.65308 L 100.9582 344.65308 L 100.9582 365.7191 A 42.041451 42.041451 0 0 0 143.0012 407.76078 A 42.041451 42.041451 0 0 0 185.04215 365.7191 L 185.04215 344.65308 L 573.79472 344.65308 A 42.041302 42.041302 0 0 0 615.83567 302.61139 A 42.041302 42.041302 0 0 0 573.79472 260.5697 L 185.04215 260.5697 L 185.04215 239.53038 A 42.041451 42.041451 0 0 0 143.0012 197.48869 z M 279.59427 407.76078 A 42.041451 42.041451 0 0 0 237.55332 449.80042 L 237.55332 470.83974 L 27.447078 470.83974 A 42.041302 42.041302 0 0 0 -14.593872 512.88143 A 42.041302 42.041302 0 0 0 27.447078 554.92106 L 237.55332 554.92106 L 237.55332 575.98913 A 42.041451 42.041451 0 0 0 279.59427 618.02877 A 42.041451 42.041451 0 0 0 321.63522 575.98913 L 321.63522 554.92106 L 573.79472 554.92106 A 42.041302 42.041302 0 0 0 615.83567 512.88143 A 42.041302 42.041302 0 0 0 573.79472 470.83974 L 321.63522 470.83974 L 321.63522 449.80042 A 42.041451 42.041451 0 0 0 279.59427 407.76078 z"/>
                            </g>
                        </svg>
                    </div>

                    {/* Toggle */}
                    <div className="toggleBar">
                        <div className="toggle">
                            <input type="radio" name="type" value="friends" defaultChecked onClick={() => setShowRequests(false)} />
                            <span>Friends</span>
                        </div>
                        <div className="toggle">
                            <input type="radio" name="type" value="requests" onClick={() => setShowRequests(true)} />
                            <span>Requests {requests.length > 0 && `(${requests.length})`}</span>
                        </div>
                    </div>

                    {/* Search */}
                    <div style={{
                        height: '36px', width: "calc(100% - 24px)", alignSelf: 'center',
                        display: "flex", borderBottom: "1px solid white",
                        paddingBottom: "4px", marginBottom: "8px"
                    }}>
                        <img src="/searchIcon.png" style={{ aspectRatio: "1/1", height: "100%" }} alt="" />
                        <input
                            onChange={(e) => { setsearchTerm(e.target.value); }}
                            style={{ flex: 1, backgroundColor: "transparent", fontSize: "13px", color: "white", border: "none", outline: "none" }}
                            type="text"
                            placeholder="Search..."
                        />
                    </div>

                    {/* Friends list */}
                    {!showrequests && chats
                        .filter(friend => friend.participants[0]._id === me._id
                            ? friend.participants[1].userName.includes(searchTerm)
                            : friend.participants[0].userName.includes(searchTerm))
                        .map(friend => {
                            const friendUser = friend.participants[0]._id === me._id
                                ? friend.participants[1]
                                : friend.participants[0];
                            return (
                                <div className="message" key={friend._id} onClick={() => handleSelectChat(friend)}>
                                    <div className="friendProfile Active">
                                        <img src={`${import.meta.env.VITE_SERVER_URL}/${friendUser.photo}`} alt="" />
                                    </div>
                                    <div className="content">
                                        <span>{friendUser.userName}</span>
                                        <div>
                                            <span className="lastMessage">
                                                {friend.lastMessage ? friend.lastMessage.text : "Start a conversation"}
                                            </span>
                                            <span>• {new Date(friend.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                    {/* Requests list */}
                    {showrequests && requests
                        .filter(user => user.userName.includes(searchTerm))
                        .map(user => (
                            <div className="message request" key={user._id}>
                                <img src={`${import.meta.env.VITE_SERVER_URL}/${user.photo}`} alt="" />
                                <span>{user.userName} wants to be your friend</span>
                                <svg onClick={() => acceptFriendRequest(user._id).then(() => {
                                    setrequests(prev => prev.filter(i => i._id !== user._id));
                                    getMyChats().then(res => setChats(res.data));
                                })} viewBox="0 0 24 24" style={{ backgroundColor: "rgb(138, 231, 133)", borderRadius: "8px" }} xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4.89163 13.2687L9.16582 17.5427L18.7085 8" fill="none" stroke="green" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <svg onClick={() => declineFriendRequest(user._id).then(() => setrequests(prev => prev.filter(i => i._id !== user._id)))}
                                    xmlns="http://www.w3.org/2000/svg" style={{ backgroundColor: "rgb(231, 133, 133)", borderRadius: "8px" }} viewBox="0 0 24 24" fill="none">
                                    <path d="M6.99486 7.00636C6.60433 7.39689 6.60433 8.03005 6.99486 8.42058L10.58 12.0057L6.99486 15.5909C6.60433 15.9814 6.60433 16.6146 6.99486 17.0051C7.38538 17.3956 8.01855 17.3956 8.40907 17.0051L11.9942 13.4199L15.5794 17.0051C15.9699 17.3956 16.6031 17.3956 16.9936 17.0051C17.3841 16.6146 17.3841 15.9814 16.9936 15.5909L13.4084 12.0057L16.9936 8.42059C17.3841 8.03007 17.3841 7.3969 16.9936 7.00638C16.603 6.61585 15.9699 6.61585 15.5794 7.00638L11.9942 10.5915L8.40907 7.00636C8.01855 6.61584 7.38538 6.61584 6.99486 7.00636Z" fill="red" />
                                </svg>
                            </div>
                        ))}
                </div>

                {/* Main content area */}
                <div className="main-content">
                    {/* Chat window */}
                    {openChat ? (
                        <div className="chatbox">
                            <div className="chatHeader">
                                {/* Back button on mobile */}
                                <button className="back-btn" onClick={() => setOpenChat(null)}>
                                    <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                                        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </button>
                                <div className="friendProfile Active">
                                    <img src={`${import.meta.env.VITE_SERVER_URL}/${partner.photo}`} alt="" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{partner.userName}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--active-green)' }}>Active Now</span>
                                </div>
                                <button className="close-chat-btn" onClick={() => setOpenChat(null)}>✕</button>
                            </div>
                            <ChatBoxComp
                                type="none"
                                socket={socket}
                                currentUserId={me._id}
                                chatId={openChat._id}
                                partnerData={partner}
                            />
                        </div>
                    ) : (
                        /* Random panel */
                        <div className="random">
                            <div className="galaxy-bg" />
                            <div className="random-overlay" />

                            <div className="random-hero">
                                <h1 className="random-title">
                                    Hop into a random chat<br />
                                    and see what <em className="fate-word">fate</em> has<br />
                                    in store for you
                                </h1>
                                <p className="random-subtitle">
                                    Spontaneous video and text conversations with people around the world. Secure, anonymous, and magical.
                                </p>

                                <div className="buttons">
                                    <button onClick={() => handleClickRandomChat("/random-call")} className="videoCall btnn">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                            <path d="M4 4h10.5a2 2 0 0 1 2 2v1.5l3.5-2v9l-3.5-2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                                        </svg>
                                        Video Call
                                    </button>
                                    <span className="or-divider">Or</span>
                                    <button onClick={() => handleClickRandomChat("/random-chat")} className="textChat btnn">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                            <path d="M20 2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14l4 4V4a2 2 0 0 0-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                        </svg>
                                        Text Chat
                                    </button>
                                </div>

                                <div className="trust-badges">
                                    <span className="badge">
                                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(255,255,255,0.5)"/></svg>
                                        End-to-End Encryption
                                    </span>
                                    <span className="badge">
                                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M13 10h-2V6h2v4zm0 4h-2v-2h2v2zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="rgba(255,255,255,0.5)"/></svg>
                                        Instant Matching
                                    </span>
                                    <span className="badge">
                                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="rgba(255,255,255,0.5)"/></svg>
                                        Community Moderated
                                    </span>
                                </div>
                            </div>

                            <div className="stats-row">
                                <div className="stat-card">
                                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="rgba(168,85,247,0.8)"/></svg>
                                    <div><span className="stat-label">USERS ONLINE</span><span className="stat-value">12,482</span></div>
                                </div>
                                <div className="stat-card">
                                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="rgba(168,85,247,0.8)"/></svg>
                                    <div><span className="stat-label">SUCCESSFUL MATCHES</span><span className="stat-value">8.4M+</span></div>
                                </div>
                                <div className="stat-card">
                                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M7 2v11h3v9l7-12h-4l4-8z" fill="rgba(168,85,247,0.8)"/></svg>
                                    <div><span className="stat-label">AVG. WAIT TIME</span><span className="stat-value">&lt; 2s</span></div>
                                </div>
                            </div>

                            <div className="feature-cards">
                                <div className="feature-card">
                                    <div className="feature-icon">
                                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="var(--purple-light)"/></svg>
                                    </div>
                                    <h3>Magic of Fate</h3>
                                    <p>ChatFate uses a proprietary algorithm that considers your interests, language preferences, and mood to find the most compatible random matches in the cosmos.</p>
                                    <a className="feature-link">Learn more about matching →</a>
                                </div>
                                <div className="feature-card">
                                    <div className="feature-icon">
                                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="var(--purple-light)"/></svg>
                                    </div>
                                    <h3>Cosmic Safety</h3>
                                    <p>Your safety is our priority. We employ AI-driven moderation and instant reporting tools to ensure a respectful and stellar experience for everyone in the galaxy.</p>
                                    <a className="feature-link">Safety guidelines →</a>
                                </div>
                            </div>

                            <div className="random-footer">
                                <span>© 2024 ChatFate. Connect with destiny.</span>
                                <div className="footer-links">
                                    <a>Privacy</a><a>Terms</a><a>Safety</a><a>Help Center</a>
                                </div>
                                <div className="live-badge">
                                    <span className="live-dot" />
                                    1,402 active video calls happening now
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default Profile;