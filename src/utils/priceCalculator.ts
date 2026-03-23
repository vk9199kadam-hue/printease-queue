import { FileItem, ExtraServices, Pricing, PriceResult } from '../types';

function parseColorPageRanges(rangeStr: string, totalPages: number): number {
  if (!rangeStr || !rangeStr.trim()) return 0;
  const pages = new Set<number>();
  rangeStr.split(',').forEach(part => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      const validEnd = Math.min(end, totalPages);
      for (let i = start; i <= validEnd; i++) {
        if (i >= 1) pages.add(i);
      }
    } else {
      const page = Number(trimmed);
      if (page >= 1 && page <= totalPages) pages.add(page);
    }
  });
  return pages.size;
}

export function calcFilePrice(file: FileItem, pricing: Pricing): { bw_pages: number; color_pages: number; file_price: number } {
  const pages = file.page_count || 1;
  const copies = file.copies || 1;
  let bw_pages = 0;
  let color_pages = 0;

  switch (file.print_type) {
    case 'bw':
      bw_pages = pages * copies;
      break;
    case 'color':
      color_pages = pages * copies;
      break;
    case 'mixed': {
      const colorCount = parseColorPageRanges(file.color_page_ranges, pages);
      color_pages = colorCount * copies;
      bw_pages = (pages - colorCount) * copies;
      break;
    }
  }

  if (file.sides === 'double') {
    bw_pages = Math.ceil(bw_pages / 2);
    color_pages = Math.ceil(color_pages / 2);
  }

  const file_price = bw_pages * pricing.bw_rate + color_pages * pricing.color_rate;
  return { bw_pages, color_pages, file_price };
}

export function calcTotal(files: FileItem[], extras: ExtraServices, pricing: Pricing): PriceResult {
  const itemized = files.map(file => {
    const calc = calcFilePrice(file, pricing);
    return {
      file_name: file.file_name,
      bw_pages: calc.bw_pages,
      color_pages: calc.color_pages,
      copies: file.copies,
      file_price: calc.file_price
    };
  });
  const subtotal = itemized.reduce((sum, item) => sum + item.file_price, 0);
  let service_fee = 0;
  if (extras.spiral_binding) service_fee += pricing.spiral_binding_fee;
  if (extras.stapling) service_fee += pricing.stapling_fee;
  return { itemized, subtotal, service_fee, total_amount: subtotal + service_fee };
}
