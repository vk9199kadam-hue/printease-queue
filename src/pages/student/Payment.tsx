import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DB } from '../../utils/db';
import { calcTotal, calcFilePrice } from '../../utils/priceCalculator';
import { generateQR } from '../../utils/qrCode';
import { playSuccessSound } from '../../utils/sound';
import { FileItem, ExtraServices } from '../../types';
import FileTypeIcon from '../../components/FileTypeIcon';

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const state = location.state as { files: FileItem[]; extras: ExtraServices } | null;

  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [step, setStep] = useState(1); // 1: Method, 2: Show QR
  const [upiQR, setUpiQR] = useState('');
  const [error, setError] = useState('');

  if (!state || !currentUser) { navigate('/student/upload'); return null; }

  const pricing = DB.getPricing();
  const filesWithPrices = state.files.map(f => {
    const calc = calcFilePrice(f, pricing);
    return { ...f, bw_pages: calc.bw_pages, color_pages: calc.color_pages, file_price: calc.file_price };
  });
  const priceResult = calcTotal(state.files, state.extras, pricing);

  const handleGenerateQR = async () => {
    if (!selectedPayment) { setError('Select a payment app'); return; }
    setProcessing(true);
    setError('');
    
    // In a real app, this UPI ID should come from the Shopkeeper's profile
    const shopUPI = "vk9199kadam@oksbi"; // Example UPI placeholder
    const amount = priceResult.total_amount;
    const orderId = 'ORD-' + Date.now();
    
    // Standard UPI Payment URI
    const upiLink = `upi://pay?pa=${shopUPI}&pn=PrintEase&am=${amount}&tr=${orderId}&cu=INR`;
    
    try {
      const qrData = await generateQR(upiLink);
      setUpiQR(qrData);
      setStep(2);
    } catch (e) {
      setError('Failed to generate payment QR');
    } finally {
      setProcessing(false);
    }
  };

  const handleFinishPayment = async () => {
    setProcessing(true);
    setError('');

    const tempId = 'ORD-' + Date.now();
    const qr = await generateQR(tempId);
    const order = await DB.createOrder({
      student_id: currentUser.id,
      student_print_id: currentUser.student_print_id,
      student_name: currentUser.name,
      // Remove the base64 string from the file list to avoid hitting Vercel's 4.5MB request limit
      files: filesWithPrices.map(({ base64, ...rest }) => rest),
      total_bw_pages: filesWithPrices.reduce((s, f) => s + f.bw_pages, 0),
      total_color_pages: filesWithPrices.reduce((s, f) => s + f.color_pages, 0),
      total_pages: filesWithPrices.reduce((s, f) => s + (f.page_count * f.copies), 0),
      extra_services: state.extras,
      service_fee: priceResult.service_fee,
      subtotal: priceResult.subtotal,
      total_amount: priceResult.total_amount,
      payment_status: 'paid',
      print_status: 'queued',
      qr_code: qr,
    });
    if (order) {
      playSuccessSound();
      navigate('/student/confirmed', { state: { order: { ...order, qr_code: qr } }, replace: true });
    } else {
      setProcessing(false);
      setError('Database error. If you registered earlier, try logging out and logging back in.');
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      {/* Processing overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-card rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
            <Loader2 size={48} className="animate-spin text-blue-primary mx-auto mb-4" />
            <h3 className="font-syne font-bold text-lg text-foreground mb-2">Processing Payment...</h3>
            <p className="text-sm text-muted-foreground mb-1">₹{priceResult.total_amount} via {selectedPayment || 'UPI'}</p>
            <p className="text-xs text-muted-foreground mb-4">Please do not close this page</p>
            {error && <p className="text-destructive text-sm mt-4 font-semibold">{error}</p>}
          </div>
        </div>
      )}

      <header className="bg-card border-b border-input px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate('/student/upload')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} /> <span className="text-sm">Back</span>
        </button>
        <span className="text-sm text-muted-foreground">Step 2 of 3</span>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Order summary */}
        <div className="bg-card rounded-2xl border border-input p-4">
          <h2 className="font-syne font-semibold text-lg text-foreground mb-3">Order Summary</h2>
          {filesWithPrices.map((f, i) => (
            <div key={i} className="flex items-start gap-3 py-3 border-b border-input last:border-0">
              <FileTypeIcon type={f.file_type} size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">{f.page_count}pg · {f.print_type} · ×{f.copies} · {f.sides}</p>
                {f.student_note && <p className="text-xs text-muted-foreground italic mt-0.5">"{f.student_note}"</p>}
              </div>
              <span className="text-sm font-semibold text-foreground">₹{f.file_price}</span>
            </div>
          ))}
          {(state.extras.spiral_binding || state.extras.stapling) && (
            <div className="pt-2 border-t border-input mt-2 space-y-1">
              {state.extras.spiral_binding && <div className="flex justify-between text-xs text-muted-foreground"><span>Spiral Binding</span><span>₹{pricing.spiral_binding_fee}</span></div>}
              {state.extras.stapling && <div className="flex justify-between text-xs text-muted-foreground"><span>Stapling</span><span>₹{pricing.stapling_fee}</span></div>}
            </div>
          )}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-input">
            <span className="font-semibold text-foreground">Total Amount</span>
            <span className="font-syne font-bold text-xl text-blue-primary">₹{priceResult.total_amount}</span>
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-card rounded-2xl border border-input p-4">
          {step === 1 ? (
            <>
              <h3 className="font-semibold text-foreground mb-3">Pay with UPI</h3>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[['gpay', '🟢 GPay'], ['phonepe', '🟣 PhonePe'], ['paytm', '🔵 Paytm']].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedPayment(key); setError(''); }}
                    className={`py-3 rounded-xl text-sm font-semibold transition border-2
                      ${selectedPayment === key ? 'border-blue-primary bg-blue-light text-blue-primary' : 'border-input bg-background text-foreground hover:border-blue-primary/50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock size={12} /> Secure direct transfer — No Fees
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <h3 className="font-bold text-foreground">Scan to Pay ₹{priceResult.total_amount}</h3>
              <div className="bg-white p-4 rounded-xl border border-input inline-block">
                <img src={upiQR} alt="UPI QR" className="w-48 h-48" />
              </div>
              <p className="text-xs text-muted-foreground">Open your UPI app and scan the QR above</p>
              <button 
                onClick={() => setStep(1)}
                className="text-xs text-blue-primary font-semibold hover:underline"
              >
                ← Use different app
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm text-center font-bold px-4">{error}</p>}

        <button
          onClick={step === 1 ? handleGenerateQR : handleFinishPayment}
          disabled={processing}
          className="w-full py-4 rounded-xl bg-blue-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {processing ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            step === 1 ? 'Generate QR Code 🔐' : 'I have Payed — Send My Print ✅'
          )}
        </button>
      </div>
    </div>
  );
}
