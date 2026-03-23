import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DB } from '../../utils/db';
import { useAuth } from '../../context/AuthContext';
import { playSuccessSound } from '../../utils/sound';

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const mobile = (location.state as any)?.mobile;

  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!mobile) { navigate('/student/login'); return null; }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!gender) { setError('Please select your gender'); return; }
    setLoading(true);
    const user = DB.createUser({ name: name.trim(), mobile, gender });
    login(user, 'student');
    playSuccessSound();
    await new Promise(r => setTimeout(r, 500));
    navigate('/student/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 animate-fade-in-up">
        <h1 className="font-syne font-bold text-2xl text-foreground mb-1">Complete Your Profile</h1>
        <p className="text-muted-foreground text-sm mb-6">Tell us about yourself — just once</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">Gender</label>
          <div className="flex gap-2">
            {(['Male', 'Female', 'Other'] as const).map(g => (
              <button
                key={g}
                onClick={() => { setGender(g); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border-2
                  ${gender === g ? 'bg-blue-primary text-primary-foreground border-blue-primary' : 'bg-background text-foreground border-input hover:border-blue-primary/50'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-primary text-primary-foreground font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {loading ? 'Creating...' : 'Create My Account →'}
        </button>
      </div>
    </div>
  );
}
