
import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useParams } from 'react-router-dom';

import Profile from './Pages/ProfilePage/profile';

import LoginPage     from './Pages/auth/LoginPage';
import SignupPage    from './Pages/auth/SignupPage';
import {
  CheckEmailPage,
  VerifiedPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './Pages/auth/authPages';
import RandomChatPage from './Pages/RandomChat/randomChatPage';

import RandomCallPage from './Pages/RandomChat/randomCallPage';
import EditInterests from './Pages/PickInterest/EditInterests';
function App() {
  

  return (
     <BrowserRouter>
      <Routes>
        <Route path="/" element={<Profile />} />
        <Route path="/random-call" element={<RandomCallPage />} />
        <Route path="/random-chat" element={<RandomChatPage />} />
        <Route path="/interests" element={<EditInterests />} />

        {/* Auth */}
        <Route path="/auth/login"                      element={<LoginPage />} />
        <Route path="/auth/signup"                     element={<SignupPage />} />
        <Route path="/auth/check-email"                element={<CheckEmailPage />} />
        <Route path="/auth/verified"                   element={<VerifiedPage />} />
        <Route path="/auth/forgot-password"            element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password/:token"      element={<ResetPasswordPageWithParams />} />

      </Routes>
    </BrowserRouter>
  )
}

 
function ResetPasswordPageWithParams() {
  const { token } = useParams<{ token: string }>();
  // Pass token as prop, or just use useParams directly inside ResetPasswordPage
  return <ResetPasswordPage />;
}

export default App
