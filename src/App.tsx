
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Profile from './Pages/ProfilePage/profile';
import Login from './Pages/LoginPage/login';
import RandomChatPage from './Pages/RandomChat/randomCallPage';
import EditInterests from './Pages/PickInterest/EditInterests';
function App() {
  

  return (
     <BrowserRouter>
      <Routes>
        <Route path="/myAccount" element={<Profile />} />
        <Route path="/" element={<Login />} />
        <Route path="/random" element={<RandomChatPage />} />
        <Route path="/interests" element={<EditInterests />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
