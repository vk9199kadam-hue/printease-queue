import { User, Shopkeeper, Order, Pricing, Session } from '../types';

const KEYS = {
  USERS: 'printease_users',
  SHOPKEEPER: 'printease_shopkeeper',
  ORDERS: 'printease_orders',
  FILES: 'printease_files',
  PRICING: 'printease_pricing',
  SESSION: 'printease_session'
} as const;

export const DB = {
  getUsers(): User[] {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },
  saveUsers(users: User[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },
  getUserByMobile(mobile: string): User | null {
    return this.getUsers().find(u => u.mobile === mobile) || null;
  },
  getUserById(id: string): User | null {
    return this.getUsers().find(u => u.id === id) || null;
  },
  createUser(data: { name: string; mobile: string; gender: string }): User {
    const users = this.getUsers();
    const year = new Date().getFullYear();
    const count = String(users.length + 1).padStart(3, '0');
    const user: User = {
      id: 'user_' + Date.now(),
      name: data.name,
      mobile: data.mobile,
      gender: data.gender as User['gender'],
      student_print_id: `SID-${year}-${count}`,
      is_verified: true,
      created_at: new Date().toISOString()
    };
    users.push(user);
    this.saveUsers(users);
    return user;
  },
  updateUser(id: string, updates: Partial<User>): User | null {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    this.saveUsers(users);
    return users[index];
  },
  getShopkeeper(): Shopkeeper | null {
    const data = localStorage.getItem(KEYS.SHOPKEEPER);
    return data ? JSON.parse(data) : null;
  },
  verifyShopkeeper(email: string, password: string): Shopkeeper | null {
    const shop = this.getShopkeeper();
    if (!shop) return null;
    if (shop.email === email && shop.password === password) return shop;
    return null;
  },
  getOrders(): Order[] {
    return JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
  },
  saveOrders(orders: Order[]): void {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  },
  getOrderById(order_id: string): Order | null {
    return this.getOrders().find(o => o.order_id === order_id) || null;
  },
  getOrdersByStudentId(student_id: string): Order[] {
    return this.getOrders()
      .filter(o => o.student_id === student_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  getPaidOrders(): Order[] {
    return this.getOrders()
      .filter(o => o.payment_status === 'paid')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  createOrder(data: Omit<Order, 'order_id' | 'created_at' | 'updated_at'>): Order {
    const orders = this.getOrders();
    const year = new Date().getFullYear();
    const count = String(orders.length + 1).padStart(4, '0');
    const order: Order = {
      ...data,
      order_id: `ORD-${year}-${count}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    orders.push(order);
    this.saveOrders(orders);
    return order;
  },
  updateOrderStatus(order_id: string, print_status: Order['print_status']): Order | null {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.order_id === order_id);
    if (index === -1) return null;
    orders[index].print_status = print_status;
    orders[index].updated_at = new Date().toISOString();
    this.saveOrders(orders);
    return orders[index];
  },
  updateOrderQR(order_id: string, qr_code: string): void {
    const orders = this.getOrders();
    const index = orders.findIndex(o => o.order_id === order_id);
    if (index === -1) return;
    orders[index].qr_code = qr_code;
    this.saveOrders(orders);
  },
  saveFile(key: string, base64: string): void {
    try {
      const files = JSON.parse(localStorage.getItem(KEYS.FILES) || '{}');
      files[key] = base64;
      localStorage.setItem(KEYS.FILES, JSON.stringify(files));
    } catch (e) {
      console.error('Storage full or error saving file:', e);
      throw new Error('Storage full. Please clear old orders first.');
    }
  },
  getFile(key: string): string | null {
    const files = JSON.parse(localStorage.getItem(KEYS.FILES) || '{}');
    return files[key] || null;
  },
  deleteFile(key: string): void {
    const files = JSON.parse(localStorage.getItem(KEYS.FILES) || '{}');
    delete files[key];
    localStorage.setItem(KEYS.FILES, JSON.stringify(files));
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
  getTodayAnalytics() {
    const today = new Date().toDateString();
    const orders = this.getPaidOrders().filter(o => new Date(o.created_at).toDateString() === today);
    return {
      total_orders: orders.length,
      total_pages: orders.reduce((s, o) => s + o.total_pages, 0),
      total_revenue: orders.reduce((s, o) => s + o.total_amount, 0),
      bw_pages: orders.reduce((s, o) => s + o.total_bw_pages, 0),
      color_pages: orders.reduce((s, o) => s + o.total_color_pages, 0),
      queued: orders.filter(o => o.print_status === 'queued').length,
      printing: orders.filter(o => o.print_status === 'printing').length,
      ready: orders.filter(o => o.print_status === 'ready').length,
      completed: orders.filter(o => o.print_status === 'completed').length
    };
  }
};
