import React, { useState } from 'react';
import Cookies from 'js-cookie';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://localhost:3003/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            console.log(data);
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // --- Store in Cookies ---
            // expires: 7 means the cookie lasts for 7 days (matches your JWT)
            Cookies.set('token', data.token, { expires: 7, secure: true, sameSite: 'strict' });
            Cookies.set('userId', data.user._doc._id, { expires: 7, secure: true, sameSite: 'strict' });

            console.log('Login Successful! , '+data.user._doc._id);
            // Redirect user to the Match/Video page
            window.location.href = '/myAccount'; 

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleLogin} style={styles.form}>
                <h2>Login to VideoChat</h2>
                
                {error && <p style={styles.error}>{error}</p>}

                <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={styles.input}
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    style={styles.input}
                />

                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
};

// Simple inline styles for quick testing
const styles = {
    container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f4f4' },
    form: { backgroundColor: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', width: '300px' },
    input: { marginBottom: '15px', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' },
    button: { padding: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    error: { color: 'red', fontSize: '14px', marginBottom: '10px' }
};

export default Login;