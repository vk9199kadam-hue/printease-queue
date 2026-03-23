import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero header */}
      <div className="text-center py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-blue-primary animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
        <h1 className="font-syne font-extrabold text-4xl md:text-6xl text-blue-dark tracking-tight relative z-10">
          Print<span className="text-blue-primary">Ease</span>
        </h1>
        <p className="mt-2 text-lg text-muted-foreground font-dm relative z-10">
          Skip the queue. Print smarter.
        </p>
      </div>

      {/* Split panels */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Student panel */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-10 md:p-16 text-center"
          style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1B4FFF 100%)' }}
        >
          <div className="mb-8">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto animate-float">
              <rect x="15" y="20" width="50" height="40" rx="4" stroke="white" strokeWidth="2.5" fill="none" />
              <rect x="25" y="30" width="30" height="4" rx="1" fill="white" opacity="0.6" />
              <rect x="25" y="38" width="20" height="4" rx="1" fill="white" opacity="0.4" />
              <circle cx="40" cy="15" r="8" stroke="white" strokeWidth="2" fill="none" />
              <path d="M32 15 L48 15" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="font-syne font-bold text-3xl text-primary-foreground mb-3">I'm a Student</h2>
          <p className="text-blue-200 mb-8 font-dm">Upload files from your room</p>
          <button
            onClick={() => navigate('/student/login')}
            className="px-8 py-3.5 rounded-xl font-semibold text-blue-primary bg-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-200 font-dm"
          >
            Get Started →
          </button>
        </div>

        {/* Shopkeeper panel */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-10 md:p-16 text-center"
          style={{ background: 'linear-gradient(135deg, #061A0F 0%, #0D6B3E 100%)' }}
        >
          <div className="mb-8">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto animate-float" style={{ animationDelay: '1.5s' }}>
              <rect x="10" y="35" width="60" height="30" rx="4" stroke="white" strokeWidth="2.5" fill="none" />
              <path d="M20 35V25a20 20 0 0 1 40 0v10" stroke="white" strokeWidth="2" fill="none" />
              <rect x="30" y="45" width="20" height="10" rx="2" fill="white" opacity="0.3" />
              <line x1="10" y1="50" x2="70" y2="50" stroke="white" strokeWidth="1" opacity="0.2" />
            </svg>
          </div>
          <h2 className="font-syne font-bold text-3xl text-primary-foreground mb-3">I'm the Shopkeeper</h2>
          <p className="text-green-200 mb-8 font-dm">Manage your print queue</p>
          <button
            onClick={() => navigate('/shop/login')}
            className="px-8 py-3.5 rounded-xl font-semibold text-green-primary bg-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-200 font-dm"
          >
            Open Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
