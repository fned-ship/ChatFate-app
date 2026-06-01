import { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import './AgeVerification.css';

const AgeVerification = ({ age, stopEstimating, goback }) => {
  const videoRef = useRef(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [estimatedAge, setEstimatedAge] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("Estimating Age…");
  const [guessCount, setGuessCount] = useState(0);
  const guesses = [];

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
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          console.error("Error accessing webcam:", err);
          setError("Please allow webcam access to verify your age.");
        }
      }
    };
    startVideo();
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [isModelLoaded]);

  const handleVideoPlay = () => {
    const id = setInterval(async () => {
      if (videoRef.current && isModelLoaded) {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withAgeAndGender();
        if (detection) {
          guesses.push(Math.round(detection.age));
          setMessage("Estimating Age…");
          setGuessCount(guesses.length);
        } else {
          setMessage("No Face Detected");
        }
        if (guesses.length === 5) {
          clearInterval(id);
          const a = guesses.reduce((sum, val) => sum + val, 0) / 5;
          setEstimatedAge(a);
          setTimeout(() => {
            stopEstimating(false);
            if ((age < 18 && a > 18) || (age > 18 && a < 18)) goback(1);
          }, 1200);
        }
      }
    }, 1000);
  };

  const ageMatch = estimatedAge !== null &&
    !((age < 18 && estimatedAge > 18) || (age > 18 && estimatedAge < 18));

  return (
    <div className="age-page">
      {/* subtle bg glow */}
      <div className="age-bg-glow" />

      <div className="age-card">

        {/* Icon + title */}
        <div className="age-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill="rgba(168,85,247,0.9)"/>
          </svg>
        </div>

        <h2 className="age-title">Age Verification</h2>
        <p className="age-subtitle">
          Our platform uses AI to protect underage users.<br />
          This process only takes a few seconds. Thank you for your patience!
        </p>

        {/* Error */}
        {error && <div className="age-error">{error}</div>}

        {/* Loading models */}
        {!isModelLoaded && !error && (
          <div className="age-loading">
            <span className="age-spinner" />
            Loading AI models…
          </div>
        )}

        {/* Video */}
        {isModelLoaded && !error && (
          <div className="age-video-wrap">
            <video
              ref={videoRef}
              autoPlay
              muted
              onPlay={handleVideoPlay}
              className="age-video"
            />

            {/* Scan overlay lines */}
            <div className="age-scan-line" />

            {/* Corner brackets */}
            <div className="age-corner tl" />
            <div className="age-corner tr" />
            <div className="age-corner bl" />
            <div className="age-corner br" />

            {/* Message badge */}
            {!estimatedAge && (
              <div className="age-message-badge">
                {message === "No Face Detected"
                  ? <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 9v4m0 4h.01M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  : <span className="age-pulse-dot" />
                }
                {message}
                {message !== "No Face Detected" && guessCount > 0 && (
                  <span className="age-progress">{guessCount}/5</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress dots */}
        {!estimatedAge && isModelLoaded && (
          <div className="age-dots">
            {[0,1,2,3,4].map(i => (
              <div key={i} className={`age-dot ${i < guessCount ? 'filled' : ''}`} />
            ))}
          </div>
        )}

        {/* Result */}
        {estimatedAge !== null && (
          <div className={`age-result ${ageMatch ? 'success' : 'fail'}`}>
            {ageMatch
              ? <>
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M9 12l2 2 4-4M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Age verified successfully
                </>
              : <>
                  <svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M12 9v4m0 4h.01M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  Age doesn't match. Please verify your birthdate.
                </>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default AgeVerification;