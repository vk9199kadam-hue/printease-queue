import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export function getFileType(filename: string): 'pdf' | 'word' | 'powerpoint' | 'image' | 'text' {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (ext === 'txt') return 'text';
  return 'pdf';
}

export function isAllowedFile(filename: string): boolean {
  const allowed = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt'];
  const ext = filename.toLowerCase().split('.').pop() || '';
  return allowed.includes(ext);
}

export async function getPageCount(file: File): Promise<number | null> {
  const ext = file.name.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return pdf.numPages;
    } catch {
      return null;
    }
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 1;
  if (ext === 'txt') {
    const text = await file.text();
    return Math.max(1, Math.ceil(text.length / 3000));
  }
  if (['doc', 'docx'].includes(ext)) return Math.max(1, Math.ceil(file.size / 3072));
  if (['ppt', 'pptx'].includes(ext)) return null;
  return null;
}
