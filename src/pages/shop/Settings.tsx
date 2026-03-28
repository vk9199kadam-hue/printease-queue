import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, LogOut, Printer, Zap, Inbox, BookOpen, BarChart3, Settings as SettingsIcon, User, Phone, Globe, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DB } from '../../utils/db';

async function rpc(action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data.data;
}

export default function ShopSettings() {
  const navigate = useNavigate();
  const { currentShop, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    shop_name: '',
    email: '',
    upi_id: '',
    contact_number: ''
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (currentShop?.email) {
        try {
          const profile = await rpc('getShopkeeperProfile', { email: currentShop.email });
          if (profile) {
            setFormData({
              name: profile.name || '',
              shop_name: profile.shop_name || '',
              email: profile.email || '',
              upi_id: profile.upi_id || '',
              contact_number: profile.contact_number || ''
            });
          }
        } catch (e) {
          console.error('Failed to load profile', e);
        }
      }
    };
    loadProfile();
  }, [currentShop]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await rpc('updateShopkeeperProfile', formData);
      if (updated) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (e) {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-secondary flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col p-4 text-primary-foreground fixed h-full z-30" style={{ backgroundColor: '#061A0F' }}>
        <div className="mb-8">
          <h1 className="font-syne font-bold text-xl">Print<span className="text-green-400">Ease</span></h1>
          <p className="text-xs text-green-300/60 mt-0.5">{currentShop?.shop_name}</p>
        </div>
        <nav className="space-y-1 flex-1">
          <button onClick={() => navigate('/shop/dashboard')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-300/60 hover:text-green-300 hover:bg-green-primary/10 transition">
            <Printer size={18} /> All Orders
          </button>
          <button onClick={() => navigate('/shop/capstone')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-300/60 hover:text-green-300 hover:bg-green-primary/10 transition">
            <BookOpen size={18} /> Capstone Projects
          </button>
          <button onClick={() => navigate('/shop/submissions')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-300/60 hover:text-green-300 hover:bg-green-primary/10 transition">
            <Inbox size={18} /> Submissions Inbox
          </button>
          <button onClick={() => navigate('/shop/analytics')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-300/60 hover:text-green-300 hover:bg-green-primary/10 transition">
            <BarChart3 size={18} /> Analytics
          </button>
          <button onClick={() => navigate('/shop/settings')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-green-primary/20 text-green-300">
            <SettingsIcon size={18} /> Settings
          </button>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 mt-auto">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main className="flex-1 md:ml-60">
        <header className="bg-card border-b border-input px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => navigate('/shop/dashboard')} className="p-2 hover:bg-secondary rounded-lg transition">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-syne font-bold text-xl">Shop Profile Settings</h2>
        </header>

        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 animate-fade-in">
             <AlertCircle className="text-amber-600 mt-1 shrink-0" size={24} />
             <div>
               <h4 className="font-bold text-amber-950">Connection Support Active</h4>
               <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                 Updating these settings will change your UPI ID and contact details for all current and future student print requests. Ensure your UPI ID is correct to receive payments accurately.
               </p>
             </div>
          </div>

          <form onSubmit={handleSave} className="bg-card border border-input rounded-2xl p-6 space-y-6 shadow-sm animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><User size={14}/> Shopkeeper Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-secondary/30 focus:ring-2 focus:ring-green-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Globe size={14}/> Shop Name</label>
                <input 
                  type="text" 
                  value={formData.shop_name} 
                  onChange={e => setFormData({...formData, shop_name: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-secondary/30 focus:ring-2 focus:ring-green-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><CreditCard size={14}/> Shop UPI ID (for QR Payments)</label>
                <input 
                  type="text" 
                  placeholder="e.g. yourname@upi"
                  value={formData.upi_id} 
                  onChange={e => setFormData({...formData, upi_id: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-amber-50/30 border-amber-200 text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <p className="text-[10px] text-amber-700 font-medium">Changing this will update all student payment QRs immediately.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Phone size={14}/> Support Mobile Number</label>
                <input 
                  type="tel" 
                  value={formData.contact_number} 
                  onChange={e => setFormData({...formData, contact_number: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-secondary/30 focus:ring-2 focus:ring-green-primary outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-input">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-green-primary text-primary-foreground py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {loading ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-in-right z-50">
          <CheckCircle size={20} />
          <span className="font-bold text-sm">Profile updated successfully!</span>
        </div>
      )}
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={`animate-spin h-5 w-5 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
