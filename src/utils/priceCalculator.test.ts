import { describe, it, expect } from 'vitest';
import { calcFilePrice, calcTotal } from './priceCalculator';
import { FileItem, Pricing, ExtraServices } from '../types';

describe('Price Calculator Unit Tests', () => {
  const dummyPricing: Pricing = {
    bw_rate: 2,
    color_rate: 10,
    spiral_binding_fee: 20,
    stapling_fee: 5,
  };

  const dummyFile: FileItem = {
    temp_id: 'tmp_1',
    file_name: 'thesis.pdf',
    file_storage_key: 'key_1',
    file_type: 'pdf',
    file_extension: 'pdf',
    page_count: 50,
    print_type: 'bw',
    color_page_ranges: '',
    copies: 1,
    sides: 'single',
    bw_pages: 50,
    color_pages: 0,
    file_price: 100, // Pre-calculated placeholder
    student_note: '',
    file_size_kb: 1024,
  };

  it('calculates file price correctly for Black and White prints', () => {
    const file = { ...dummyFile, print_type: 'bw' as const, page_count: 50 };
    const result = calcFilePrice(file, dummyPricing);
    
    expect(result.bw_pages).toBe(50);
    expect(result.color_pages).toBe(0);
    expect(result.file_price).toBe(100); // 50 * 2 = 100
  });

  it('calculates file price correctly for Color prints', () => {
    const file = { ...dummyFile, print_type: 'color' as const, page_count: 10 };
    const result = calcFilePrice(file, dummyPricing);
    
    expect(result.bw_pages).toBe(0);
    expect(result.color_pages).toBe(10);
    expect(result.file_price).toBe(100); // 10 * 10 = 100
  });

  it('calculates total cart value with extra services (Spiral & Stapling)', () => {
    const file1: FileItem = { ...dummyFile, print_type: 'bw', page_count: 20 }; // 40
    const file2: FileItem = { ...dummyFile, temp_id: 'tmp_2', print_type: 'color', page_count: 5 }; // 50
    const files = [file1, file2];
    
    // Simulate updating the FileItem references with accurate self-pricing
    const calculatedFiles = files.map(f => ({
      ...f,
      ...calcFilePrice(f, dummyPricing)
    }));
    
    const extras: ExtraServices = { spiral_binding: true, stapling: true };
    
    const total = calcTotal(calculatedFiles, extras, dummyPricing);
    
    expect(total.subtotal).toBe(90); // 40 + 50
    expect(total.service_fee).toBe(25); // 20 + 5
    expect(total.total_amount).toBe(115); // 90 + 25
  });
});
