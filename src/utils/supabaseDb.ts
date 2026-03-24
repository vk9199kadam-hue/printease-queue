import { User, Shopkeeper, Order, Pricing, Session, Submission, Notice } from '../types';

async function rpc(action: string, payload: any = {}) {
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data.data;
}

export const SupabaseDB = {
  async getUsers(): Promise<User[]> {
    return await rpc('getUsers').catch(() => []);
  },
  
  async getUserById(id: string): Promise<User | null> {
    return await rpc('getUserById', { id }).catch(() => null);
  },

  async getUserByEmail(email: string): Promise<User | null> {
    return await rpc('getUserByEmail', { email }).catch(() => null);
  },

  async createUser(data: { name: string; email: string; password?: string; gender: string }): Promise<User | null> {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return await rpc('createUser', {
      ...data,
      student_print_id: `SID-${year}-${count}`,
      is_verified: true
    }).catch(e => { console.error(e); return null; });
  },

  async verifyShopkeeper(email: string, password: string): Promise<Shopkeeper | null> {
    return await rpc('verifyShopkeeper', { email, password }).catch(() => null);
  },

  async getPaidOrders(): Promise<Order[]> {
    return await rpc('getPaidOrders').catch(() => []);
  },

  async getOrdersByStudentId(student_id: string): Promise<Order[]> {
    return await rpc('getOrdersByStudentId', { student_id }).catch(() => []);
  },

  async createOrder(data: any): Promise<Order | null> {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    data.order_id = `ORD-${year}-${count}`;
    return await rpc('createOrder', data).catch(e => { console.error(e); return null; });
  },

  async updateOrderStatus(order_id: string, print_status: string): Promise<boolean> {
    return await rpc('updateOrderStatus', { order_id, print_status }).catch(() => false);
  },

  async getSubmissions(): Promise<Submission[]> {
    return await rpc('getSubmissions').catch(() => []);
  },

  async createSubmission(data: any): Promise<Submission | null> {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    data.submission_id = `SUB-${year}-${count}`;
    data.validation_status = 'received';
    return await rpc('createSubmission', data).catch(e => { console.error(e); return null; });
  },

  async updateSubmissionStatus(submission_id: string, status: string): Promise<boolean> {
    return await rpc('updateSubmissionStatus', { submission_id, status }).catch(() => false);
  },

  async addNoticeToSubmission(submission_id: string, type: string, message: string): Promise<boolean> {
    return await rpc('addNoticeToSubmission', { submission_id, type, message }).catch(() => false);
  },

  async saveFile(key: string, base64: string): Promise<string | null> {
    try {
      const fetchResponse = await fetch(base64);
      const blob = await fetchResponse.blob();
      
      const uploadUrl = await rpc('getUploadUrl', { key, contentType: blob.type });
      if (!uploadUrl) throw new Error("Could not fetch presigned URL");

      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type },
      });
      return key;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async getFile(key: string): Promise<string | null> {
    try {
      return await rpc('getDownloadUrl', { key });
    } catch (e) {
      return null;
    }
  },

  async deleteFile(key: string): Promise<boolean> {
    return await rpc('deleteFile', { key }).catch(() => false);
  }
};
