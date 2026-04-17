import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import Cookies from 'js-cookie';
import './EditProfilePage.css';

import { updateProfile } from '../../services/userServices';
import { COUNTRIES } from './SignupPage';
import ReactCountryFlag from 'react-country-flag';
import { useNavigate } from 'react-router-dom';
const EditProfilePage: React.FC = () => {
  const [userState, setUserState] = useState({
    userName: '',
    firstName: '',
    lastName: '',
    sex: '',
    country: '',
    birthDate: '',
  });

  const navigate=useNavigate();
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const me= JSON.parse(Cookies.get('user'))
  const formattedDate=new Date(me.birthDate).toISOString().split('T')[0];
  const [year, month, day] = formattedDate.split('-');
  const [monthState,setMonth]=useState(+month)
  const [dayState,setDay]=useState(+day)
  const clearInfo =()=>{
    setMonth(+month)
    setDay(+day)
        setUserState({
          ...me,
          birthDate: formattedDate,
        });
        
        if (me.photo) {
          setPhotoPreview(`${import.meta.env.VITE_SERVER_URL}/${me.photo}`);
        }
  }
  useEffect(clearInfo, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserState((prev) => ({
      ...prev,
      [name]: value,
    }));
    console.log(userState)
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPhotoFile(file);
      
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    userState.birthDate=year+'-'+monthState +'-'+dayState;
    console.log(userState)
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      
  
      // Append text fields
      Object.entries(userState).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== '_id' && key !== 'online' && key !== 'photo') {
          formData.append(key, String(value));
        }
      });

      // Append file if a new one was selected
      if (photoFile) {
        formData.append('photo', photoFile);
      }

     const response = await updateProfile(formData);
      
      // Update the cookie to sync state across the app
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
      <h1 className="profile-title">Edit Profile Information</h1>
      
      
      <div className="rest" style={{gap:'40px'}}>
        <div className="sidebar">
          <div className="photo-upload-group">
        <img className="photo-preview" src={photoPreview} alt="Profile preview" />
          
            <input 
              id="photoInput"
              type="file" 
              name="photo"
              accept="image/*"
              onChange={handleFileChange}
              className="photo-input"
            />
            <img src="/camIcon.png" className='photo-input photo-input-icon' style={{width:'24px',height:'24px',right:'3px',bottom:'3px',pointerEvents:'none'}}/>
        </div>
        <button onClick={()=>{navigate('/interests')}}>Edit Interests</button>
        <button onClick={()=>{navigate('/auth/reset-password/'+Cookies.get('token'))}}>Change Password</button>
        </div>
         <form onSubmit={handleSubmit} className="profile-form">

        

        {/* Username */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              value={userState.firstName || ''}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              value={userState.lastName || ''}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="userName">Username </label>
          <input
            id="userName"
            type="text"
            name="userName"
            required
            value={userState.userName || ''}
            onChange={handleChange}
          />
        </div>
        <div className="form-row">
            <label style={{alignSelf:'center'}}>Birth Date:</label>
            <div className="form-group">
              <label>Day</label>
              <select  name="day" value={dayState} onChange={(e)=>{setDay(+e.target.value)}}>
              {Array.from({ length: new Date(+year, monthState, 0).getDate() }, (_, index) => index + 1).map((d) => (
                                    <option key={d} value={d}>
                                      {d}</option>
                                  ))}
            </select>
            </div>
            <div className="form-group">
              <label>Month</label>
            <select  name="month" value={monthState} onChange={(e)=>{setMonth(+e.target.value)}}>
              {Array.from({ length: 12 }, (_, index) => index + 1).map((d) => (
                                    <option  value={d}>
                                      {d}</option>
                                  ))}
            </select>
            </div>
            <span className='year' style={{flex:1,border:'1px solid white'}}>{year}</span>
          </div>
        {/* Name Fields */}
        

        {/* Demographic Fields */}
        <div className="form-group-sex">
          <span>Gender: </span>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="sex" 
                  value="male" 
                  checked={userState.sex === 'male'} 
                  onChange={handleChange} 
                />
                Male
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="sex" 
                  value="female" 
                  checked={userState.sex === 'female'} 
                  onChange={handleChange} 
                />
                Female
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  name="sex" 
                  value="other" 
                  checked={userState.sex === 'other'} 
                  onChange={handleChange} 
                />
                Other
              </label>
          </div>
        <div className="form-group">
            <label htmlFor="country">Country</label>
            <select id="country" name="country" value={userState.country || ''} onChange={handleChange}>
              {COUNTRIES.map(([code, name]) => (
                                    <option key={code} value={code}>
                                      <ReactCountryFlag countryCode={code} className="flag" svg />
                                      {name}</option>
                                  ))}
            </select>
            
          </div>

        {/* Submit */}
        <div className="form-actions">
          <button type='button' className='submit-button' style={{backgroundColor:'#3b3b3b'}} onClick={clearInfo}> Cancel</button>
          <button type="submit" disabled={isLoading} className="submit-button">
            {isLoading ? 'Saving...' : 'Save Changes'}
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