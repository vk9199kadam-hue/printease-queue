import { User, Shopkeeper, Order, Pricing, Session, Submission, Notice } from '../types';
import { SupabaseDB } from './supabaseDb';

const KEYS = {
  SESSION: 'printease_session',
  PRICING: 'printease_pricing',
} as const;

export const DB = {
  async getUsers(): Promise<User[]> {
    return SupabaseDB.getUsers();
  },
  async getUserByEmail(email: string): Promise<User | null> {
    return SupabaseDB.getUserByEmail(email);
  },
  async getUserById(id: string): Promise<User | null> {
    return SupabaseDB.getUserById(id);
  },
  async createUser(data: { name: string; email: string; password?: string; gender: string }): Promise<User | null> {
    return SupabaseDB.createUser(data);
  },
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    // We don't have an updateUser rpc yet but let's mock it or ignore for now
    return null;
  },
  getShopkeeper(): Shopkeeper | null {
    // Only used locally or from session normally, but let's hit server if needed
    // Actually not used directly often, usually verifyShopkeeper is used
    return null; 
  },
  async verifyShopkeeper(email: string, password: string): Promise<Shopkeeper | null> {
    return SupabaseDB.verifyShopkeeper(email, password);
  },
  async getOrders(): Promise<Order[]> {
    return []; // Not used directly in UI usually
  },
  async getOrderById(order_id: string): Promise<Order | null> {
    // SupabaseDB doesn't have getOrderById natively, so we fetch all and filter or we can add it.
    // Let's add it to SupabaseDB or implement here.
    const res = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getOrderById', payload: { id: order_id } }) });
    const data = await res.json();
    return data.data || null;
  },
  async getOrdersByStudentId(student_id: string): Promise<Order[]> {
    return SupabaseDB.getOrdersByStudentId(student_id);
  },
  async getPaidOrders(): Promise<Order[]> {
    return SupabaseDB.getPaidOrders();
  },
  async createOrder(data: Omit<Order, 'order_id' | 'created_at' | 'updated_at'>): Promise<Order | null> {
    return SupabaseDB.createOrder(data);
  },
  async updateOrderStatus(order_id: string, print_status: Order['print_status']): Promise<boolean> {
    return SupabaseDB.updateOrderStatus(order_id, print_status);
  },
  async updateOrderQR(order_id: string, qr_code: string): Promise<void> {
    // Not critical for now
  },
  async saveFile(key: string, base64: string): Promise<void> {
    await SupabaseDB.saveFile(key, base64);
  },
  async getFile(key: string): Promise<string | null> {
    return SupabaseDB.getFile(key);
  },
  async deleteFile(key: string): Promise<void> {
    await SupabaseDB.deleteFile(key);
  },
  getPricing(): Pricing {
    const data = localStorage.getItem(KEYS.PRICING);
    return data ? JSON.parse(data) : { bw_rate: 2, color_rate: 10, spiral_binding_fee: 20, stapling_fee: 5 };
  },
  getSession(): Session | null {
    const data = localStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },
  setSession(user: User | Shopkeeper, role: Session['role']): void {
    localStorage.setItem(KEYS.SESSION, JSON.stringify({ user, role }));
  },
  clearSession(): void {
    localStorage.removeItem(KEYS.SESSION);
  },
  async getTodayAnalytics() {
    const orders = await SupabaseDB.getPaidOrders();
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
    return {
      total_orders: todayOrders.length,
      total_pages: todayOrders.reduce((s, o) => s + (o.total_pages || 0), 0),
      total_revenue: todayOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      bw_pages: todayOrders.reduce((s, o) => s + (o.total_bw_pages || 0), 0),
      color_pages: todayOrders.reduce((s, o) => s + (o.total_color_pages || 0), 0),
      queued: todayOrders.filter(o => o.print_status === 'queued').length,
      printing: todayOrders.filter(o => o.print_status === 'printing').length,
      ready: todayOrders.filter(o => o.print_status === 'ready').length,
      completed: todayOrders.filter(o => o.print_status === 'completed').length
    };
  },
  async getSubmissions(): Promise<Submission[]> {
    return SupabaseDB.getSubmissions();
  },
  async getSubmissionsByStudent(student_id: string): Promise<Submission[]> {
    const subs = await SupabaseDB.getSubmissions();
    return subs.filter(s => s.student_id === student_id);
  },
  async createSubmission(data: Omit<Submission, 'submission_id' | 'validation_status' | 'notices' | 'created_at' | 'updated_at'>): Promise<Submission | null> {
    return SupabaseDB.createSubmission(data);
  },
  async updateSubmissionStatus(submission_id: string, status: Submission['validation_status']): Promise<boolean> {
    return SupabaseDB.updateSubmissionStatus(submission_id, status);
  },
  async addNoticeToSubmission(submission_id: string, type: Notice['type'], message: string): Promise<boolean> {
    return SupabaseDB.addNoticeToSubmission(submission_id, type, message);
  }
};
