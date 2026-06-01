import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import Cookies from 'js-cookie';
import './EditProfilePage.css';
import { updateProfile } from '../../services/userServices';
import { COUNTRIES } from './SignupPage';
// import ReactCountryFlag from 'react-country-flag';
import { useNavigate } from 'react-router-dom';

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const me = JSON.parse(Cookies.get('user') ?? '{}');
  const formattedDate = new Date(me.birthDate).toISOString().split('T')[0];
  const [year, month, day] = formattedDate.split('-');

  const [userState, setUserState] = useState({
    userName: '',
    firstName: '',
    lastName: '',
    sex: '',
    country: '',
    birthDate: '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [monthState, setMonth] = useState(+month);
  const [dayState, setDay] = useState(+day);

  const clearInfo = () => {
    setMonth(+month);
    setDay(+day);
    setUserState({ ...me, birthDate: formattedDate });
    if (me.photo) setPhotoPreview(`${import.meta.env.VITE_SERVER_URL}/${me.photo}`);
  };

  useEffect(clearInfo, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    userState.birthDate = `${year}-${monthState}-${dayState}`;
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      Object.entries(userState).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== '_id' && key !== 'online' && key !== 'photo') {
          formData.append(key, String(value));
        }
      });
      if (photoFile) formData.append('photo', photoFile);
      const response = await updateProfile(formData);
      Cookies.set('user', JSON.stringify(response.data.user), { expires: 7 });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">

      {/* ── Header ── */}
      <header className="edit-header">
        <button className="edit-back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <span className="edit-header-title">Edit Profile</span>
      </header>

      {/* ── Body ── */}
      <div className="profile-body">

        {/* Sidebar */}
        <div className="sidebar">
          <div className="photo-upload-group">
            <img className="photo-preview" src={photoPreview ?? ''} alt="Profile preview" />
            <input
              id="photoInput"
              type="file"
              name="photo"
              accept="image/*"
              onChange={handleFileChange}
              className="photo-input"
            />
            <img
              src="/camIcon.png"
              className="photo-input-icon"
              alt=""
            />
          </div>

          <button className="sidebar-btn" onClick={() => navigate('/interests')}>
            Edit Interests
          </button>
          <button className="sidebar-btn" onClick={() => navigate('/change-password')}>
            Change Password
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="profile-form">

          <span className="form-section-title">Personal Info</span>

          {/* First / Last name */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input id="firstName" type="text" name="firstName" value={userState.firstName || ''} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input id="lastName" type="text" name="lastName" value={userState.lastName || ''} onChange={handleChange} />
            </div>
          </div>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="userName">Username</label>
            <input id="userName" type="text" name="userName" required value={userState.userName || ''} onChange={handleChange} />
          </div>

          <span className="form-section-title">Date of Birth</span>

          {/* Birthdate */}
          <div className="birthdate-row">
            <div className="form-group">
              <label>Day</label>
              <select name="day" value={dayState} onChange={(e) => setDay(+e.target.value)}>
                {Array.from({ length: new Date(+year, monthState, 0).getDate() }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Month</label>
              <select name="month" value={monthState} onChange={(e) => setMonth(+e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Year</label>
              <span className="year">{year}</span>
            </div>
          </div>

          <span className="form-section-title">Identity</span>

          {/* Gender */}
          <div className="form-group-sex">
            <span>Gender</span>
            {['male', 'female', 'other'].map((g) => (
              <label key={g} className="radio-label">
                <input type="radio" name="sex" value={g} checked={userState.sex === g} onChange={handleChange} />
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </label>
            ))}
          </div>

          {/* Country */}
          <div className="form-group">
            <label htmlFor="country">Country</label>
            <select id="country" name="country" value={userState.country || ''} onChange={handleChange}>
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="submit-button cancel-btn" onClick={clearInfo}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="submit-button">
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {message && (
            <div className={`alert-message ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EditProfilePage;