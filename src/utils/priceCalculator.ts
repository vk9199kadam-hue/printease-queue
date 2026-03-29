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

export function calcFilePrice(file: FileItem, pricing: Pricing, isCapstone: boolean = false): { bw_pages: number; color_pages: number; file_price: number } {
  let pages = file.page_count || 1;
  // Apply slides per page reduction for all files
  if (file.slidesPerPage && file.slidesPerPage > 1) {
    pages = Math.ceil(pages / file.slidesPerPage);
  }
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

  const bw_rate = (isCapstone && pricing.capstone_page_rate) ? pricing.capstone_page_rate : pricing.bw_rate;
  const color_rate = (isCapstone && pricing.capstone_page_rate) ? pricing.capstone_page_rate : pricing.color_rate;
  const file_price = bw_pages * bw_rate + color_pages * color_rate;
  return { bw_pages, color_pages, file_price };
}

export function calcTotal(files: FileItem[], extras: ExtraServices, pricing: Pricing, isCapstone: boolean = false): PriceResult {
  const itemized = files.map(file => {
    const calc = calcFilePrice(file, pricing, isCapstone);
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
  if (isCapstone) {
    if (extras.capstone_embossing === 'urgent' && pricing.capstone_urgent_fee) {
      service_fee += pricing.capstone_urgent_fee;
    } else if (extras.capstone_embossing === 'non-urgent' && pricing.capstone_non_urgent_fee) {
      service_fee += pricing.capstone_non_urgent_fee;
    }
    if (extras.spiral_binding) service_fee += pricing.spiral_binding_fee;
  } else {
    if (extras.spiral_binding) service_fee += pricing.spiral_binding_fee;
    if (extras.stapling) service_fee += pricing.stapling_fee;
  }
  return { itemized, subtotal, service_fee, total_amount: subtotal + service_fee };
}
