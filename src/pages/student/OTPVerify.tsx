import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { OTPService } from '../../utils/otp';
import { DB } from '../../utils/db';
import { useAuth } from '../../context/AuthContext';

export default function OTPVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const mobile = (location.state as any)?.mobile;

  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!mobile) { navigate('/student/login'); return; }
    inputRefs.current[0]?.focus();
  }, [mobile, navigate]);

  useEffect(() => {
    if (resendTimer <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
    if (newDigits.every(d => d !== '')) {
      setTimeout(() => handleSubmit(newDigits), 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (currentDigits?: string[]) => {
    const d = currentDigits || digits;
    const enteredOTP = d.join('');
    if (enteredOTP.length !== 4) return;
    setLoading(true);
    const result = OTPService.verify(mobile, enteredOTP);
    if (result === 'valid') {
      const user = DB.getUserByMobile(mobile);
      if (user) {
        login(user, 'student');
        navigate('/student/dashboard');
      } else {
        navigate('/student/profile', { state: { mobile } });
      }
    } else if (result === 'wrong') {
      setError('Incorrect OTP. Please try again.');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setDigits(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } else if (result === 'expired') {
      setError('OTP has expired. Request a new one.');
      setCanResend(true);
      setResendTimer(0);
    } else {
      setError('OTP not found. Please request a new one.');
    }
    setLoading(false);
  };

  const handleResend = () => {
    OTPService.send(mobile);
    setResendTimer(60);
    setCanResend(false);
    setDigits(['', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 animate-fade-in-up">
        <button onClick={() => navigate('/student/login')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="font-syne font-bold text-2xl text-foreground mb-1">Enter OTP</h1>
        <p className="text-muted-foreground text-sm mb-8">Sent to {mobile}</p>

        <div className={`flex gap-4 justify-center mb-6 ${shaking ? 'animate-shake' : ''}`}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-16 h-16 text-center text-2xl font-mono font-bold rounded-xl border-2 outline-none transition-all
                ${error ? 'border-destructive' : 'border-input focus:border-blue-primary focus:ring-2 focus:ring-ring'}
                bg-background text-foreground`}
            />
          ))}
        </div>

        {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}

        {loading && (
          <div className="flex justify-center mb-4">
            <Loader2 size={24} className="animate-spin text-blue-primary" />
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          {canResend ? (
            <button onClick={handleResend} className="text-blue-primary font-semibold hover:underline">
              Resend OTP
            </button>
          ) : (
            <span>Resend OTP in {resendTimer}s</span>
          )}
        </div>
      </div>
    </div>
  );
}
