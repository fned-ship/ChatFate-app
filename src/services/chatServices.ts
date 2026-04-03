import api from "./api";

// Get list of friend chats
export const getMyChats = () => api.get('/api/chats');

// Get messages (paginated)
export const getMessages = (chatId, page = 1) => 
  api.get(`/api/chats/${chatId}/messages?page=${page}`);

// Send message (Handles Text + Files)
export const sendMessage = async (chatId, text, files = [], replyToId = null) => {
  const formData = new FormData();
  formData.append('text', text);
  if (replyToId) formData.append('replyTo', replyToId);

  // 'images' and 'files' match the names in your backend upload.fields()
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      formData.append('images', file);
    } else {
      formData.append('files', file);
    }
  });

  return api.post(`/api/chats/${chatId}/messages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};