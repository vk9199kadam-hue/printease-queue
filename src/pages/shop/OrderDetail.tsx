import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, CheckCircle, Package } from 'lucide-react';
import { DB } from '../../utils/db';
import { Order, FileItem } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import FileTypeIcon from '../../components/FileTypeIcon';
import { Download } from 'lucide-react';

const statusFlow: Order['print_status'][] = ['queued', 'printing', 'ready', 'completed'];

export default function OrderDetail() {
  const navigate = useNavigate();
  const { order_id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!order_id) return;
    DB.getOrderById(order_id).then(setOrder).catch(console.error);
  }, [order_id]);

  if (!order) return <div className="min-h-screen flex items-center justify-center bg-secondary"><p className="text-muted-foreground">Loading...</p></div>;

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
          <p className="font-semibold text-foreground">{order.student_name}</p>
          <span className="bg-blue-light text-blue-primary text-xs font-mono font-semibold px-2 py-0.5 rounded-md mt-1 inline-block">
            {order.student_print_id}
          </span>
        </div>

        {/* Files */}
        <div className="bg-card rounded-xl border border-input p-4">
          <h3 className="font-semibold text-foreground mb-3">Files ({order.files.length})</h3>
          {order.files.map((f, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-input last:border-0">
              <FileTypeIcon type={f.file_type} size={18} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {f.page_count}pg · {f.print_type} · ×{f.copies} · {f.sides}
                </p>
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
