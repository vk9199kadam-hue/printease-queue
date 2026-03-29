import { Shopkeeper, Pricing } from '../types';

export function initializeApp(): void {
  if (!localStorage.getItem('printease_shopkeeper')) {
    const shopkeeper: Shopkeeper = {
      id: 'shop_001',
      name: 'Shop Owner',
      email: 'shop@printease.com',
      password: 'shop123',
      shop_name: 'College Print Center',
      is_active: true
    };
    localStorage.setItem('printease_shopkeeper', JSON.stringify(shopkeeper));
  }
  if (!localStorage.getItem('printease_pricing')) {
    const pricing: Pricing = {
      bw_rate: 1,
      color_rate: 4,
      spiral_binding_fee: 20,
      stapling_fee: 5,
      capstone_page_rate: 4,
      capstone_urgent_fee: 180,
      capstone_non_urgent_fee: 140
    };
    localStorage.setItem('printease_pricing', JSON.stringify(pricing));
  }
  if (!localStorage.getItem('printease_orders')) {
    localStorage.setItem('printease_orders', '[]');
  }
  if (!localStorage.getItem('printease_users')) {
    localStorage.setItem('printease_users', '[]');
  }
  if (!localStorage.getItem('printease_files')) {
    localStorage.setItem('printease_files', '{}');
  }
}
