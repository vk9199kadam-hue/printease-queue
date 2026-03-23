import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, BarChart3, LogOut, Search, Clock, AlertCircle, Inbox } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DB } from '../../utils/db';
import { Order } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import { playNotificationSound } from '../../utils/sound';

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function ShopDashboard() {
  const navigate = useNavigate();
  const { currentShop, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const prevCount = useRef(0);

  useEffect(() => {
    const load = () => {
      const paid = DB.getPaidOrders();
      if (paid.length > prevCount.current && prevCount.current > 0) {
        playNotificationSound();
      }
      prevCount.current = paid.length;
      setOrders(paid);
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = orders.filter(o => {
    if (filter !== 'all' && o.print_status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.order_id.toLowerCase().includes(q) || o.student_print_id.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    queued: orders.filter(o => o.print_status === 'queued').length,
    printing: orders.filter(o => o.print_status === 'printing').length,
    ready: orders.filter(o => o.print_status === 'ready').length,
    completed: orders.filter(o => o.print_status === 'completed' && new Date(o.created_at).toDateString() === new Date().toDateString()).length,
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const borderColor = (status: string) => {
    const map: Record<string, string> = { queued: 'border-l-amber-400', printing: 'border-l-blue-400', ready: 'border-l-green-400', completed: 'border-l-gray-300' };
    return map[status] || '';
  };

  return (
    <div className="min-h-screen bg-secondary flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col p-4 text-primary-foreground fixed h-full z-30" style={{ backgroundColor: '#061A0F' }}>
        <div className="mb-8">
          <h1 className="font-syne font-bold text-xl">Print<span className="text-green-400">Ease</span></h1>
          <p className="text-xs text-green-300/60 mt-0.5">{currentShop?.shop_name}</p>
        </div>
        <nav className="space-y-1 flex-1">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-green-primary/20 text-green-300">
            <Printer size={18} /> Print Queue
          </button>
          <button onClick={() => navigate('/shop/submissions')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-300/60 hover:text-green-300 hover:bg-green-primary/10 transition">
            <Inbox size={18} /> Submissions Inbox
          </button>
          <button onClick={() => navigate('/shop/analytics')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-green-300/60 hover:text-green-300 hover:bg-green-primary/10 transition">
            <BarChart3 size={18} /> Analytics
          </button>
        </nav>
        <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 mt-auto">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-60">
        {/* Mobile header */}
        <header className="md:hidden bg-card border-b border-input px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <h1 className="font-syne font-bold text-lg text-foreground">Print<span className="text-green-primary">Ease</span></h1>
          <div className="flex gap-2">
            <button onClick={() => navigate('/shop/analytics')} className="p-2 text-muted-foreground"><BarChart3 size={18} /></button>
            <button onClick={handleLogout} className="p-2 text-destructive"><LogOut size={18} /></button>
          </div>
        </header>

        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <h2 className="font-syne font-bold text-xl text-foreground">Print Queue</h2>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Queued', value: stats.queued, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Printing', value: stats.printing, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Ready', value: stats.ready, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Done Today', value: stats.completed, color: 'text-gray-600', bg: 'bg-gray-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search by Student ID or Order ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'queued', 'printing', 'ready', 'completed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition
                  ${filter === f ? 'bg-green-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-input hover:bg-secondary'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Orders */}
          {filtered.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center border border-input">
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(order => {
                const isNew = (Date.now() - new Date(order.created_at).getTime()) < 30000;
                return (
                  <div
                    key={order.order_id}
                    onClick={() => navigate(`/shop/order/${order.order_id}`)}
                    className={`bg-card rounded-xl p-4 border border-input border-l-4 ${borderColor(order.print_status)} hover:shadow-md transition cursor-pointer relative
                      ${isNew ? 'animate-slide-in-right' : ''}`}
                  >
                    {isNew && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                        NEW
                      </span>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm text-foreground">{order.order_id}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {timeAgo(order.created_at)}</span>
                        <StatusBadge status={order.print_status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-light text-blue-primary text-xs font-mono font-semibold px-2 py-0.5 rounded-md">{order.student_print_id}</span>
                      <span className="text-sm text-muted-foreground">{order.student_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{order.files.length} file{order.files.length !== 1 ? 's' : ''} · {order.total_pages} pages</span>
                      <span className="font-semibold text-foreground">₹{order.total_amount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
