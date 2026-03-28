import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudUpload, X, AlertCircle, Calendar, User, Phone, School, BookOpen } from 'lucide-react';
import { FileItem, ExtraServices } from '../../types';
import { DB } from '../../utils/db';
import { getFileType, isAllowedFile, getPageCount } from '../../utils/pageCounter';
import { uploadFileToCloud, generateStorageKey } from '../../utils/fileStorage';
import FileTypeIcon from '../../components/FileTypeIcon';

export default function CapstoneUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Step 1: Metadata
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    college: '',
    department: '',
    receiving_date: ''
  });
  
  // Step 2: File
  const [uploadedFile, setUploadedFile] = useState<FileItem | null>(null);
  const [extras, setExtras] = useState<ExtraServices>({ spiral_binding: true, stapling: false }); // Default spiral for projects
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState('');
  const [step, setStep] = useState(1); // 1: Form, 2: Upload

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const processFile = async (file: File) => {
    if (!isAllowedFile(file.name)) { showToast('Unsupported file type: ' + file.name); return; }
    if (file.size > 4194304) { showToast('File too large (max 4MB due to Vercel limits). Please split your document.'); return; }
    const key = generateStorageKey(file.name);
    try {
      const publicUrl = await uploadFileToCloud(file, key);

      const pageCount = await getPageCount(file);
      const fileType = getFileType(file.name);
      const item: FileItem = {
        temp_id: 'tmp_' + Date.now(),
        file_name: file.name,
        file_storage_key: key,
        file_type: fileType,
        file_extension: file.name.split('.').pop() || '',
        page_count: pageCount || 0,
        print_type: 'bw',
        color_page_ranges: '',
        copies: 1,
        sides: 'single',
        slidesPerPage: 1,
        bw_pages: 0,
        color_pages: 0,
        file_price: 0,
        student_note: 'Capstone Project Submission',
        file_size_kb: Math.round(file.size / 1024),
      };
      setUploadedFile(item);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Supabase Upload Error:', err);
      showToast('Cloud Upload Failed: ' + (err.message || 'Check bucket permissions.'));
    }
  };

  const handleProceed = () => {
    if (!uploadedFile) return;
    navigate('/student/payment', { 
      state: { 
        files: [uploadedFile], 
        extras,
        isCapstone: true,
        capstoneData: formData
      } 
    });
  };

  return (
    <div className="min-h-screen bg-secondary pb-32">
      {/* Header */}
      <header className="bg-card border-b border-input px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button onClick={() => step === 1 ? navigate('/student/dashboard') : setStep(1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} /> <span className="text-sm">Back</span>
        </button>
        <span className="text-sm font-bold text-emerald-600">Capstone Project</span>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {step === 1 ? (
          <div className="bg-card rounded-2xl border border-input p-6 space-y-4 animate-fade-in-up">
            <h2 className="font-syne font-bold text-xl text-foreground">Project Details</h2>
            <p className="text-xs text-muted-foreground italic mb-4 text-center">Please provide your project information before uploading the report.</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Contact Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    required
                    placeholder="Your mobile number"
                    value={formData.contact}
                    onChange={e => setFormData({ ...formData, contact: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">College</label>
                  <div className="relative">
                    <School size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      placeholder="College Name"
                      value={formData.college}
                      onChange={e => setFormData({ ...formData, college: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Department</label>
                  <div className="relative">
                    <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS, IT"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">File Submission Receipt Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    required
                    value={formData.receiving_date}
                    onChange={e => setFormData({ ...formData, receiving_date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.contact || !formData.college}
              className="w-full py-4 mt-6 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              Continue to Upload →
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {/* File drop zone - limited to 1 file for project */}
            {!uploadedFile ? (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => { e.preventDefault(); setIsDragging(false); Array.from(e.dataTransfer.files).slice(0, 1).forEach(processFile); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
                  ${isDragging ? 'border-emerald-600 bg-emerald-50' : 'border-input hover:border-emerald-600/50'}`}
              >
                <CloudUpload size={48} className="mx-auto mb-3 text-emerald-600" />
                <p className="font-bold text-foreground">Upload Project Report</p>
                <p className="text-xs text-muted-foreground mt-1">PDF preferred for project reports</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
                />
              </div>
            ) : (
              <div className="bg-card rounded-2xl border-2 border-emerald-600 p-4 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] px-3 py-1 font-bold rounded-bl-lg uppercase">Selected</div>
                <div className="flex items-center gap-3">
                  <FileTypeIcon type={uploadedFile.file_type} size={24} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{uploadedFile.file_name}</p>
                    <p className="text-xs text-muted-foreground">{uploadedFile.page_count} pages detected</p>
                  </div>
                  <button onClick={() => setUploadedFile(null)} className="text-destructive hover:bg-red-50 p-2 rounded-full transition">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-input">
                   <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Print Style</label>
                    <div className="flex gap-2">
                       {['bw', 'color'].map(t => (
                         <button 
                           key={t}
                           onClick={() => setUploadedFile(uploadedFile ? { ...uploadedFile, print_type: t as 'bw' | 'color' } : null)}
                           className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition
                             ${uploadedFile?.print_type === t ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-input hover:border-emerald-200'}`}
                         >
                           {t === 'bw' ? 'B&W' : 'COLOR'}
                         </button>
                       ))}
                    </div>
                   </div>
                   <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Binding</label>
                    <div className="flex gap-2">
                         <button 
                           onClick={() => setExtras({ ...extras, spiral_binding: !extras.spiral_binding })}
                           className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition
                             ${extras.spiral_binding ? 'bg-amber-500 border-amber-500 text-white' : 'border-input hover:border-amber-200'}`}
                         >
                           SPIRAL
                         </button>
                    </div>
                   </div>
                </div>

                <div className="pt-4 border-t border-input">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">Pages per sheet</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([1, 2, 4] as const).map(num => (
                      <button
                        key={num}
                        onClick={() => setUploadedFile(uploadedFile ? { ...uploadedFile, slidesPerPage: num } : null)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition border-2
                          ${(uploadedFile?.slidesPerPage || 1) === num ? 'bg-blue-primary text-white border-blue-primary' : 'bg-background text-foreground border-input hover:border-blue-primary/30'}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 italic">Save paper! Select how many pages to print on one side.</p>
                </div>
              </div>
            )}

            {/* Receipt Summary */}
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-start gap-3">
              <AlertCircle size={20} className="text-emerald-700 mt-1" />
              <div>
                <h4 className="font-bold text-emerald-800 text-sm">Submission Receipt Info</h4>
                <div className="text-[11px] text-emerald-700 mt-1 space-y-0.5">
                  <p><strong>To:</strong> {formData.college} - {formData.department}</p>
                  <p><strong>Submitting on:</strong> {formData.receiving_date}</p>
                </div>
              </div>
            </div>

            <button
               onClick={handleProceed}
               disabled={!uploadedFile}
               className="w-full py-4 mt-6 rounded-xl bg-blue-primary text-white font-bold hover:opacity-90 shadow-xl shadow-blue-500/30 transition disabled:opacity-50"
            >
              Confirm & Pay →
            </button>
          </div>
        )}
      </div>
      
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-in-right">
          <AlertCircle size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
