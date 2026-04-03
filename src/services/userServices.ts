import api from './api';
export interface Interest {
  _id?: string;
  name: string;
  category?: string;
}

export interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  userName: string;
  photo?: string;
  sex?: string;
  country?: string;
  birthDate?: string | Date;
  friends: string[];
  requests: string[];
  interests: Interest[];
  online: boolean;
}


export const updateProfile = (formData: FormData) => 
  api.put<{ user: User }>('/api/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const updateInterests = (interests: string[] | Interest[]) => 
  api.put<{ interests: Interest[] }>('/api/profile/interests', { interests })
// --- Friends ---

export const sendFriendRequest = (targetId: string) => 
  api.post<{ message: string }>(`/api/friends/request/${targetId}`)

export const acceptFriendRequest = (requesterId: string) => 
  api.post<{ message: string; chat }>(`/api/friends/accept/${requesterId}`)

export const declineFriendRequest = (requesterId: string) => 
  api.delete<{ message: string }>(`/api/friends/request/${requesterId}`)

export const removeFriend = (friendId: string) => 
  api.delete<{ message: string }>(`/api/friends/${friendId}`)

export const getFriendRequests = () => 
  api.get<User[]>('/api/friends/requests')