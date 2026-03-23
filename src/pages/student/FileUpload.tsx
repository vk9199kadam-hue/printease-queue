import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudUpload, X, Minus, Plus, AlertCircle } from 'lucide-react';
import { FileItem, ExtraServices } from '../../types';
import { DB } from '../../utils/db';
import { getFileType, isAllowedFile, getPageCount } from '../../utils/pageCounter';
import { fileToBase64, formatFileSize, generateStorageKey } from '../../utils/fileStorage';
import { calcTotal } from '../../utils/priceCalculator';
import FileTypeIcon from '../../components/FileTypeIcon';

export default function FileUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<(FileItem & { size?: number })[]>([]);
  const [extras, setExtras] = useState<ExtraServices>({ spiral_binding: false, stapling: false });
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState('');
  const pricing = DB.getPricing();

  const priceResult = useMemo(() => {
    if (uploadedFiles.length === 0) return null;
    return calcTotal(uploadedFiles, extras, pricing);
  }, [uploadedFiles, extras, pricing]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const processFile = async (file: File) => {
    if (!isAllowedFile(file.name)) { showToast('Unsupported file type: ' + file.name); return; }
    if (file.size > 52428800) { showToast('File too large (max 50MB)'); return; }
    const key = generateStorageKey(file.name);
    try {
      const base64 = await fileToBase64(file);
      DB.saveFile(key, base64);
      const pageCount = await getPageCount(file);
      const fileType = getFileType(file.name);
      const ext = file.name.split('.').pop() || '';
      const item: FileItem & { size?: number } = {
        temp_id: 'tmp_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        file_name: file.name,
        file_storage_key: key,
        file_type: fileType,
        file_extension: ext,
        page_count: pageCount || 0,
        print_type: 'bw',
        color_page_ranges: '',
        copies: 1,
        sides: 'single',
        bw_pages: 0,
        color_pages: 0,
        file_price: 0,
        student_note: '',
        size: file.size,
      };
      setUploadedFiles(prev => [...prev, item]);
    } catch {
      showToast('Failed to save file. Storage might be full.');
    }
  };

  const removeFile = (temp_id: string) => {
    const file = uploadedFiles.find(f => f.temp_id === temp_id);
    if (file) DB.deleteFile(file.file_storage_key);
    setUploadedFiles(prev => prev.filter(f => f.temp_id !== temp_id));
  };

  const updateFile = (temp_id: string, updates: Partial<FileItem>) => {
    setUploadedFiles(prev => prev.map(f => f.temp_id === temp_id ? { ...f, ...updates } : f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  };

  const canProceed = uploadedFiles.length > 0 && uploadedFiles.every(f => f.page_count > 0);

  return (
    <div className="min-h-screen bg-secondary pb-32">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-in-right">
          <AlertCircle size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b border-input px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => navigate('/student/dashboard')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} /> <span className="text-sm">Back</span>
        </button>
        <span className="text-sm text-muted-foreground">Step 1 of 3</span>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
            ${isDragging ? 'border-blue-primary bg-blue-light' : 'border-input hover:border-blue-primary/50'}`}
        >
          <CloudUpload size={40} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-semibold text-foreground">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, Word, PowerPoint, Images, TXT — Max 50MB each</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt"
            className="hidden"
            onChange={e => { Array.from(e.target.files || []).forEach(processFile); e.target.value = ''; }}
          />
        </div>

        {/* File cards */}
        {uploadedFiles.map(file => (
          <div key={file.temp_id} className="bg-card rounded-2xl border border-input p-4 space-y-3 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-3">
              <FileTypeIcon type={file.file_type} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size || 0)}</p>
              </div>
              <button onClick={() => removeFile(file.temp_id)} className="text-muted-foreground hover:text-destructive p-1">
                <X size={16} />
              </button>
            </div>

            {/* Page count */}
            {file.page_count > 0 ? (
              <p className="text-sm text-green-primary">📄 {file.page_count} pages detected</p>
            ) : (
              <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg">
                <AlertCircle size={14} className="text-amber-600" />
                <span className="text-xs text-amber-800">Could not detect pages</span>
                <input
                  type="number"
                  min={1}
                  placeholder="Enter"
                  className="w-16 px-2 py-1 text-xs border border-input rounded-md bg-background text-foreground"
                  onChange={e => updateFile(file.temp_id, { page_count: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}

            {/* Print type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Print Type</label>
              <div className="flex gap-2">
                {([['bw', 'B&W (₹2/pg)'], ['color', 'Color (₹10/pg)'], ['mixed', 'Mixed']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => updateFile(file.temp_id, { print_type: val })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition border-2
                      ${file.print_type === val ? 'bg-blue-primary text-primary-foreground border-blue-primary' : 'bg-background text-foreground border-input hover:border-blue-primary/50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {file.print_type === 'mixed' && (
                <div className="mt-2">
                  <input
                    placeholder="Color page ranges, e.g. 1-5, 10, 12"
                    value={file.color_page_ranges}
                    onChange={e => updateFile(file.temp_id, { color_page_ranges: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-input rounded-lg bg-background text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">All other pages printed in B&W</p>
                </div>
              )}
            </div>

            {/* Copies & Sides */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Copies</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateFile(file.temp_id, { copies: Math.max(1, file.copies - 1) })} className="w-8 h-8 rounded-lg border border-input flex items-center justify-center hover:bg-secondary">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-semibold text-foreground">{file.copies}</span>
                  <button onClick={() => updateFile(file.temp_id, { copies: Math.min(50, file.copies + 1) })} className="w-8 h-8 rounded-lg border border-input flex items-center justify-center hover:bg-secondary">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sides</label>
                <div className="flex gap-2">
                  {(['single', 'double'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => updateFile(file.temp_id, { sides: s })}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition border-2
                        ${file.sides === s ? 'bg-blue-primary text-primary-foreground border-blue-primary' : 'bg-background text-foreground border-input'}`}
                    >
                      {s === 'single' ? 'Single' : 'Double'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Instructions</label>
              <textarea
                rows={2}
                maxLength={200}
                placeholder="e.g. staple pages, print only pages 2-5..."
                value={file.student_note}
                onChange={e => updateFile(file.temp_id, { student_note: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-input rounded-lg bg-background text-foreground resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{file.student_note.length}/200</p>
            </div>
          </div>
        ))}

        {/* Extra Services */}
        {uploadedFiles.length > 0 && (
          <div className="bg-card rounded-2xl border border-input p-4">
            <h3 className="font-semibold text-sm text-foreground mb-3">Extra Services</h3>
            <label className="flex items-center gap-3 mb-2 cursor-pointer">
              <input type="checkbox" checked={extras.spiral_binding} onChange={e => setExtras(p => ({ ...p, spiral_binding: e.target.checked }))} className="w-4 h-4 rounded accent-blue-primary" />
              <span className="text-sm text-foreground">Spiral Binding</span>
              <span className="text-xs text-muted-foreground ml-auto">+₹20</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={extras.stapling} onChange={e => setExtras(p => ({ ...p, stapling: e.target.checked }))} className="w-4 h-4 rounded accent-blue-primary" />
              <span className="text-sm text-foreground">Stapling</span>
              <span className="text-xs text-muted-foreground ml-auto">+₹5</span>
            </label>
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-input p-4 shadow-lg z-30">
        <div className="max-w-lg mx-auto">
          {!priceResult ? (
            <p className="text-center text-sm text-muted-foreground">Add files to see price</p>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Grand Total</p>
                <p className="font-syne font-bold text-xl text-blue-primary">₹{priceResult.total_amount}</p>
              </div>
              <button
                onClick={() => navigate('/student/payment', { state: { files: uploadedFiles, extras } })}
                disabled={!canProceed}
                className="px-6 py-3 rounded-xl bg-blue-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                Proceed to Payment →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
