import  { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

const AgeVerification = () => {
  const videoRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [estimatedAge, setEstimatedAge] = useState(null);
  const [error, setError] = useState(null);
  const [message,setMessage]=useState("Estimating Age...")
  const guesses=[];


  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models/face';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        console.error("Error loading models:", err);
        setError("Failed to load facial recognition models.");
      }
    };

    loadModels();
  }, []);

 
  useEffect(() => {
    let stream = null;

    const startVideo = async () => {
      if (isModelLoaded) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
          setError("Please allow webcam access to verify your age.");
        }
      }
    };

    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isModelLoaded]);

  const handleVideoPlay = () => {
    const id=setInterval(async () => {
      if (videoRef.current && isModelLoaded) {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withAgeAndGender();

        if (detection) {
          guesses.push(Math.round(detection.age));
          console.log(detection.age)
          setMessage("Estimating Age...")
        }else{
          setMessage("No Face Detected")
        }
        if(guesses.length==10){
          clearInterval(id)
          setEstimatedAge(guesses.reduce((sum, val) => sum + val, 0) / 5)
        }
      }
    }, 1000); 
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'min(10%,20px)' 
    , height:'100vh',width:'100%', gap:'var(--baseFont)'}}>
      <h2>Age Verification</h2>
      <h4 style={{textAlign:'center'}}>Our website using an age verification AI to protect our underage users. <br/>This process only takes a few seconds.  Thank your for your time!</h4>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!isModelLoaded && !error ? (
        <p>Loading AI models...</p>
      ) : (
        <div style={{ position: 'relative', width: '100%', maxWidth:'640px', maxHeight: '480px' ,height:'80%', backgroundColor: '#000' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            onPlay={handleVideoPlay}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0,objectFit:'cover' }}
          />
          
          {! estimatedAge && videoRef &&
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {message}
          </div>}
        </div>
      )}
      
      {estimatedAge && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {estimatedAge >= 18 ? (
             <p style={{ color: 'green', fontSize: '18px' }}>Access Granted: You appear to be 18 or older.</p>
          ) : (
             <p style={{ color: 'red', fontSize: '18px' }}>Access Denied: You appear to be under 18.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AgeVerification;