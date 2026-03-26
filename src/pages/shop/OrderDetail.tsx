import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Printer, CheckCircle, Package, Loader2, Download, Phone, Calendar, MessageSquare } from 'lucide-react';
import { DB } from '../../utils/db';
import { Order, FileItem } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import FileTypeIcon from '../../components/FileTypeIcon';

const statusFlow: Order['print_status'][] = ['queued', 'printing', 'ready', 'completed'];

export default function OrderDetail() {
  const navigate = useNavigate();
  const { order_id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order_id) return;
    setLoading(true);
    setError('');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      if (!order) {
        setError('Request timed out. The server might be busy.');
        setLoading(false);
      }
    }, 15000);

    DB.getOrderById(order_id)
      .then(res => {
        clearTimeout(timeout);
        if (res) setOrder(res);
        else setError('Order not found');
        setLoading(false);
      })
      .catch(err => {
        clearTimeout(timeout);
        setError('Failed to connect to database');
        setLoading(false);
        console.error(err);
      });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [order_id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary">
      <Loader2 className="animate-spin text-blue-primary mb-4" size={32} />
      <p className="text-muted-foreground">Fetching order details...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary p-4 text-center">
      <div className="bg-card p-8 rounded-2xl border border-input shadow-sm max-w-sm">
        <p className="text-destructive font-semibold mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="w-full py-2 rounded-xl bg-blue-primary text-primary-foreground font-semibold"
        >
          Retry Connection
        </button>
      </div>
    </div>
  );

  if (!order) return <Navigate to="/shop/dashboard" replace />;

  const downloadSingleFile = async (file: FileItem) => {
    try {
      const fileUrl = await DB.getFile(file.file_storage_key);
      if (fileUrl) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.target = '_blank';
        a.download = file.file_name;
        a.click();
      }
    } catch (e) {
      console.error('Failed to download file', e);
    }
  };

  const nextStatus = async () => {
    const currentIdx = statusFlow.indexOf(order.print_status);
    if (currentIdx < statusFlow.length - 1) {
      const next = statusFlow[currentIdx + 1];
      await DB.updateOrderStatus(order.order_id, next);
      if (order_id) {
        const updated = await DB.getOrderById(order_id);
        if (updated) setOrder(updated);
      }
    }
  };

  const handleDownloadAndPrint = () => {
    order.files.forEach((file, index) => {
      setTimeout(async () => {
        try {
          const fileUrl = await DB.getFile(file.file_storage_key);
          if (fileUrl) {
            const a = document.createElement('a');
            a.href = fileUrl;
            a.target = '_blank';
            a.download = file.file_name;
            a.click();
          }
        } catch (e) {
          console.error('Failed to download file', e);
        }
      }, index * 1000);
    });
    nextStatus();
  };

  const nextLabel: Record<string, string> = {
    queued: '🖨️ Start Printing',
    printing: '✅ Mark Ready',
    ready: '📦 Mark Collected',
  };

  const nextColor: Record<string, string> = {
    queued: '#1B4FFF',
    printing: '#0D6B3E',
    ready: '#0D6B3E',
  };

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-card border-b border-input px-4 py-3 flex items-center sticky top-0 z-20">
        <button onClick={() => navigate('/shop/dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} /> <span className="text-sm">Back to Queue</span>
        </button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-mono font-bold text-xl text-foreground">{order.order_id}</h1>
            <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
          </div>
          <StatusBadge status={order.print_status} />
        </div>

        {/* Student info */}
        <div className="bg-card rounded-xl border border-input p-4">
          <p className="text-sm text-muted-foreground mb-1">Student</p>
          <div className="flex items-center justify-between">
             <div>
                <p className="font-semibold text-foreground text-lg">{order.student_name}</p>
                <span className="bg-blue-light text-blue-primary text-xs font-mono font-semibold px-2 py-0.5 rounded-md mt-1 inline-block">
                  {order.student_print_id}
                </span>
             </div>
             {order.contact_number && (
                <a href={`tel:${order.contact_number}`} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition">
                   <Phone size={14} /> CALL STUDENT
                </a>
             )}
          </div>
        </div>

        {/* Project Specific Info */}
        {order.order_type === 'capstone' && (
          <div className="bg-emerald-50 rounded-xl border-2 border-emerald-600 p-4 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg uppercase tracking-widest">Capstone Project</div>
            <h3 className="font-bold text-emerald-800 text-sm mb-3">Project Submission Metadata</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-emerald-600 uppercase opacity-60">College</p>
                 <p className="text-base font-bold text-emerald-900">{order.college}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-emerald-600 uppercase opacity-60">Department</p>
                 <p className="text-base font-bold text-emerald-900">{order.department}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-emerald-600 uppercase opacity-60">Contact</p>
                 <p className="text-base font-bold text-emerald-900">{order.contact_number}</p>
              </div>
              <div className="space-y-1">
                 <p className="text-[10px] font-bold text-emerald-600 uppercase opacity-60">Recv. Date</p>
                 <p className="text-base font-bold text-emerald-900 flex items-center gap-2">
                   <Calendar size={14} /> {order.receiving_date}
                 </p>
              </div>
            </div>
          </div>
        )}

        {/* Global Student Instruction (Sticky Note) */}
        {order.files.some(f => f.student_note) && (
          <div className="bg-amber-50 rounded-xl border-2 border-amber-400 p-6 shadow-lg shadow-amber-200/50 animate-pulse-subtle">
            <div className="flex items-center gap-2 text-amber-700 font-syne font-bold uppercase tracking-wider text-xs mb-3">
               <MessageSquare size={16} /> Student Instructions (Note Down)
            </div>
            {order.files.filter(f => f.student_note).map((f, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="text-[10px] font-bold text-amber-600/60 uppercase">{f.file_name} Note:</p>
                <p className="text-xl font-bold text-amber-900 leading-tight">"{f.student_note}"</p>
              </div>
            ))}
          </div>
        )}

        {/* Files */}
        <div className="bg-card rounded-xl border border-input p-4">
          <h3 className="font-semibold text-foreground mb-3">Files ({order.files.length})</h3>
          {order.files.map((f, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-input last:border-0">
              <FileTypeIcon type={f.file_type} size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{f.file_name}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    {f.page_count} PAGES
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    f.print_type === 'bw' ? 'bg-gray-100 text-gray-700 border-gray-200' : 
                    f.print_type === 'color' ? 'bg-pink-100 text-pink-700 border-pink-200' : 
                    'bg-purple-100 text-purple-700 border-purple-200'
                  }`}>
                    {f.print_type.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                    ×{f.copies} COPIES
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 uppercase">
                    {f.sides}
                  </span>
                  {f.slidesPerPage && f.slidesPerPage > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold border border-orange-200">
                      {f.slidesPerPage} SLIDES/PG
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 uppercase">
                    {f.file_size_kb >= 1024 ? (f.file_size_kb / 1024).toFixed(1) + 'MB' : f.file_size_kb + 'KB'}
                  </span>
                </div>
                {f.student_note && (
                  <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 animate-pulse">
                    ⚠️ SPECIAL NOTE: {f.student_note}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <span className="text-sm font-semibold text-foreground">₹{f.file_price}</span>
                <button
                  onClick={() => downloadSingleFile(f)}
                  className="p-2 rounded-lg bg-blue-light text-blue-primary hover:bg-blue-primary hover:text-white transition shadow-sm border border-blue-200 flex items-center gap-1 text-[10px] font-bold"
                  title="Download this file"
                >
                  <Download size={14} /> DOWNLOAD
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-card rounded-xl border border-input p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>B&W Pages</span><span>{order.total_bw_pages}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Color Pages</span><span>{order.total_color_pages}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total Pages</span><span>{order.total_pages}</span>
            </div>
            {order.extra_services.spiral_binding && (
              <div className="flex justify-between text-muted-foreground"><span>Spiral Binding</span><span>₹{DB.getPricing().spiral_binding_fee}</span></div>
            )}
            {order.extra_services.stapling && (
              <div className="flex justify-between text-muted-foreground"><span>Stapling</span><span>₹{DB.getPricing().stapling_fee}</span></div>
            )}
            <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-input">
              <span>Total</span><span>₹{order.total_amount}</span>
            </div>
          </div>
        </div>

        {/* QR */}
        {order.qr_code && (
          <div className="bg-card rounded-xl border border-input p-4 text-center">
            <img src={order.qr_code} alt="QR Code" className="mx-auto w-32 h-32" />
          </div>
        )}

        {/* Action button */}
        {order.print_status === 'queued' ? (
          <div className="flex gap-3">
            <button
              onClick={handleDownloadAndPrint}
              className="flex-1 py-4 rounded-xl text-primary-foreground font-bold text-sm md:text-base hover:opacity-90 transition bg-amber-600 flex items-center justify-center gap-2"
            >
              📥 Download Files
            </button>
            <button
              onClick={nextStatus}
              className="flex-1 py-4 rounded-xl text-primary-foreground font-bold text-sm md:text-base hover:opacity-90 transition flex items-center justify-center gap-2"
              style={{ backgroundColor: nextColor[order.print_status] || '#1B4FFF' }}
            >
              🖨️ Automatic Print
            </button>
          </div>
        ) : order.print_status !== 'completed' ? (
          <button
            onClick={nextStatus}
            className="w-full py-4 rounded-xl text-primary-foreground font-bold text-lg hover:opacity-90 transition"
            style={{ backgroundColor: nextColor[order.print_status] || '#0D6B3E' }}
          >
            {nextLabel[order.print_status] || 'Update'}
          </button>
        ) : (
          <div className="bg-green-light rounded-xl p-4 text-center text-green-primary font-semibold flex items-center justify-center gap-2">
            <CheckCircle size={18} /> Order Completed
          </div>
        )}
      </div>
    </div>
  );
}
