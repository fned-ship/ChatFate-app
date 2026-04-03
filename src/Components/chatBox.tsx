import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './chatboxstyle.css';
import Cookies from "js-cookie"

const token = Cookies.get('token'); 

const config = {
    headers: {
        Authorization: `Bearer ${token}`
    }
};

const serverURL=import.meta.env.VITE_SERVER_URL ;

const ChatBoxComp = ({ type, socket, currentUserId, partnerId, randomChatData, chatId , partnerData }: any) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const typingTimeoutRef = useRef(null);

    const activeChatId = type === 'random' ? randomChatData?._id : chatId;

    // IMPORTANT: You need to EMIT the correct event name too!
    const handleInputChange = (e: any) => {
        setInputText(e.target.value);
        const emitEvent = type === 'random' ? 'random_typing' : 'typing';
        const payload = type === 'random' ? { randomChatId: activeChatId } : { chatId: activeChatId };
        socket.emit(emitEvent, payload);
    };

    useEffect(() => {
        if (!inputText.trim()) {
            // If the box is empty, immediately stop typing
            socket.emit(type === 'random' ? 'random_stop_typing' : 'stop_typing', 
                type === 'random' ? { randomChatId: activeChatId } : { chatId: activeChatId }
            );
            return;
        }

        // Tell the server we ARE typing
        socket.emit(type === 'random' ? 'random_typing' : 'typing', 
            type === 'random' ? { randomChatId: activeChatId } : { chatId: activeChatId }
        );

        // Clear any existing "stop" timer
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set a new timer: if no more keys are pressed for 2 seconds, emit "stop"
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit(type === 'random' ? 'random_stop_typing' : 'stop_typing', 
                type === 'random' ? { randomChatId: activeChatId } : { chatId: activeChatId }
            );
        }, 9000); // seconds of silence = stopped typing

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [inputText, activeChatId, type, socket]);

    useEffect(() => {
        if (!activeChatId) return;

        // Load History
        const endpoint = type === 'random' 
            ? `${serverURL}/api/random-chats/${activeChatId}/messages` 
            : `${serverURL}/api/chats/${activeChatId}/messages`;
        axios.get(endpoint,config).then(res => setMessages(res.data.messages.reverse()));

        // Socket Listeners
        socket.on('new_message', (msg: any) => {
            if (msg.chatId === activeChatId) setMessages(prev => [...prev, msg]);
        });

        socket.on('message_reacted', (updatedMsg: any) => {
            setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        });

        // Inside your main useEffect socket listeners
        socket.on('typing', (data: any) => {
            if (data.userId !== currentUserId) setIsPartnerTyping(true);
        });

        socket.on('stop_typing', (data: any) => {
            // You don't always need to check userId here, 
            // but it's safer if multiple people are in a room
            setIsPartnerTyping(false);
        });


        return () => {
            socket.off('new_message');
            socket.off('message_reacted');
            socket.off('typing');
            socket.off('stop_typing');
        };
    }, [activeChatId, type, socket]);

    // Scroll to bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isPartnerTyping,selectedFiles]);

    const handleReact = (messageId: string) => {
        // We use the socket event defined in your socketHandler.js
        socket.emit('react_message', { messageId, react: "❤️" });
    };

    const sendMessage = async () => {
        if (!inputText.trim() && selectedFiles.length === 0) return;

        // If files exist, use HTTP POST (Multer)
        if (selectedFiles.length > 0) {
            const formData = new FormData();
            formData.append('text', inputText);
            if (replyTo) formData.append('replyTo', replyTo._id);
            selectedFiles.forEach(f => {
                f.type.startsWith('image/') ? formData.append('images', f) : formData.append('files', f);
            });

            const url = type === 'random' 
                ? `http://localhost:3003/api/random-chats/${activeChatId}/messages` 
                : `${serverURL}/api/chats/${activeChatId}/messages`;
            
            await axios.post(url, formData , config);
            setSelectedFiles([]);
        } else {
            // Text only via Socket
            const event = type === 'random' ? 'send_random_message' : 'send_message';
            const payload = type === 'random' 
                ? { randomChatId: activeChatId, text: inputText, replyTo: replyTo?._id }
                : { chatId: activeChatId, text: inputText, replyTo: replyTo?._id };
            socket.emit(event, payload);
        }
        setInputText("");
        setReplyTo(null);
    };

    return (
        <div className="flux" style={type === "random" ? { backgroundColor: 'rgb(94 81 81 / 21%)', borderRadius: '10px' } : {}}>
            <div className="fluxMessages">
                {messages.map((msg) => (
                    <div key={msg._id} className={msg.sender._id === currentUserId ? "myMessage" : "otherMessage"}>
                        {msg.replyTo && <div className="reply-preview">Replying to: {msg.replyTo.text}</div>}
                        
                        <div className="msg-content">
                            {msg.text}
                            {msg.imagesFiles?.map((img: string) => (
                                <img key={img} src={`${serverURL}/images/${img}`} className="chat-img" />
                            ))}
                        </div>

                        {/* Reaction Display */}
                        {msg.react && <span className="reaction-badge">{msg.react}</span>}

                        {/* Actions: Reply and Like */}
                        <div className="actions">
                            <img src="reply.png" alt="reply" onClick={() => setReplyTo(msg)} />
                            <img src="heart.png" alt="like" onClick={() => handleReact(msg._id)} />
                        </div>
                    </div>
                ))}
                
                {isPartnerTyping && (
                    <div id='typingIndicator' style={{ display: "flex" , paddingTop:"40px" }}>
                        <img src={`${serverURL}/imagesProfile/${partnerData.photo}`} alt="" />
                        <span>partner is typing...</span>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {selectedFiles.length > 0 && (
                <div className="picsChosen">
                    {selectedFiles.map((f, i) => (
                        <div key={i}>
                            <img src={URL.createObjectURL(f)} alt="preview" />
                            <button onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}></button>
                        </div>
                    ))}
                </div>
            )}

            <div className="controls">
                <input 
                    type="text" 
                    placeholder="send a message" 
                    value={inputText}
                    onChange={(e) => handleInputChange(e)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />
                
                <div className="sendButton">
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} 
                    />
                    {/* SVG Icon for attachment */}
                    <svg width="24" height="24" viewBox="0 0 24 24"><path d="M21 4H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h17c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 20V6h17v14H4zm13-11l-3.5 4.5-2.5-3L5 17h14l-2-8z" fill="currentColor"/></svg>
                </div>

                <div className="sendIcon" onClick={sendMessage}>
                    <svg width="24" height="24" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/></svg>
                </div>
            </div>
        </div>
    );
};

export default ChatBoxComp;