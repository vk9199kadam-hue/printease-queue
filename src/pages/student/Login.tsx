import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Loader2 } from 'lucide-react';
import { OTPService } from '../../utils/otp';

export default function StudentLogin() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [displayOTP, setDisplayOTP] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    const otp = OTPService.send(mobile);
    setDisplayOTP(otp);
    setOtpSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg border-l-4 border-l-blue-primary p-8 animate-fade-in-up">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm">
          <ArrowLeft size={16} /> Back to home
        </button>
        <h1 className="font-syne font-bold text-2xl text-foreground mb-1">Student Login</h1>
        <p className="text-muted-foreground text-sm mb-6">Enter your mobile number to continue</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Mobile Number</label>
          <input
            type="tel"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={mobile}
            onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition font-dm"
          />
          {error && <p className="text-destructive text-xs mt-1">{error}</p>}
        </div>

        {!otpSent ? (
          <button
            onClick={handleSendOTP}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-primary text-primary-foreground font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Sending...' : 'Get OTP →'}
          </button>
        ) : (
          <>
            <div className="mb-4 p-4 rounded-xl bg-green-light border border-green-primary/20">
              <p className="text-green-primary font-semibold text-sm flex items-center gap-2">
                <Phone size={16} /> 📱 Your OTP: <span className="font-mono text-lg">{displayOTP}</span>
              </p>
              <p className="text-xs text-green-primary/70 mt-1">(Demo mode — shown on screen)</p>
            </div>
            <button
              onClick={() => navigate('/student/otp', { state: { mobile } })}
              className="w-full py-3 rounded-xl bg-blue-primary text-primary-foreground font-semibold hover:opacity-90 transition"
            >
              Continue to OTP →
            </button>
            <button onClick={() => { setOtpSent(false); setDisplayOTP(''); }} className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground">
              Change number
            </button>
          </>
        )}
      </div>
    </div>
  );
}
