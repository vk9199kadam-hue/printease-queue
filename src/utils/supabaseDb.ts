import { supabase } from './supabase';
import { User, Shopkeeper, Order, Pricing, Session, Submission, Notice } from '../types';

export const SupabaseDB = {
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error(error);
    return data || [];
  },
  
  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error) return null;
    return data;
  },

  async createUser(data: { name: string; email: string; password?: string; gender: string }): Promise<User | null> {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const newUser = {
      name: data.name,
      email: data.email,
      password: data.password,
      gender: data.gender,
      student_print_id: `SID-${year}-${count}`,
      is_verified: true
    };

    const { data: insertedData, error } = await supabase.from('users').insert(newUser).select().single();
    if (error) {
      console.error(error);
      return null;
    }
    return insertedData;
  },

  async verifyShopkeeper(email: string, password: string): Promise<Shopkeeper | null> {
    const { data, error } = await supabase.from('shopkeepers')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();
    if (error) return null;
    return data;
  },

  async getPaidOrders(): Promise<Order[]> {
    const { data, error } = await supabase.from('orders')
      .select('*, files:order_files(*)')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    return data || [];
  },

  async getOrdersByStudentId(student_id: string): Promise<Order[]> {
    const { data, error } = await supabase.from('orders')
      .select('*, files:order_files(*)')
      .eq('student_id', student_id)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    return data || [];
  },

  async createOrder(data: any): Promise<Order | null> {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Insert main order
    const { data: orderData, error } = await supabase.from('orders').insert({
      order_id: `ORD-${year}-${count}`,
      student_id: data.student_id,
      student_print_id: data.student_print_id,
      student_name: data.student_name,
      total_bw_pages: data.total_bw_pages,
      total_color_pages: data.total_color_pages,
      total_pages: data.total_pages,
      spiral_binding: data.extra_services?.spiral_binding || false,
      stapling: data.extra_services?.stapling || false,
      service_fee: data.service_fee,
      subtotal: data.subtotal,
      total_amount: data.total_amount,
      payment_status: data.payment_status,
      print_status: data.print_status
    }).select().single();

    if (error || !orderData) {
      console.error(error);
      return null;
    }

    // Insert files
    if (data.files && data.files.length > 0) {
      const filesToInsert = data.files.map((file: any) => ({
        order_id: orderData.id,
        file_name: file.file_name,
        file_storage_key: file.file_storage_key,
        file_type: file.file_type,
        file_extension: file.file_extension,
        page_count: file.page_count,
        print_type: file.print_type,
        color_page_ranges: file.color_page_ranges,
        copies: file.copies,
        sides: file.sides,
        bw_pages: file.bw_pages,
        color_pages: file.color_pages,
        file_price: file.file_price,
        student_note: file.student_note
      }));
      await supabase.from('order_files').insert(filesToInsert);
    }

    return orderData;
  },

  async updateOrderStatus(order_id: string, print_status: string): Promise<boolean> {
    const { error } = await supabase.from('orders').update({ print_status }).eq('order_id', order_id);
    if (error) {
      console.error(error);
      return false;
    }
    return true;
  },

  async getSubmissions(): Promise<Submission[]> {
    const { data, error } = await supabase.from('submissions')
      .select('*, notices(*)')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    return data || [];
  },

  async createSubmission(data: any): Promise<Submission | null> {
    const year = new Date().getFullYear();
    const count = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    const { data: subData, error } = await supabase.from('submissions').insert({
      submission_id: `SUB-${year}-${count}`,
      student_id: data.student_id,
      student_name: data.student_name,
      roll_number: data.roll_number,
      department: data.department,
      academic_year: data.academic_year,
      guide_name: data.guide_name,
      project_title: data.project_title,
      document_type: data.document_type,
      remarks: data.remarks,
      file_name: data.file_name,
      file_storage_key: data.file_storage_key,
      validation_status: 'received'
    }).select().single();

    if (error) {
      console.error(error);
      return null;
    }
    return subData;
  },

  async updateSubmissionStatus(submission_id: string, status: string): Promise<boolean> {
    const { error } = await supabase.from('submissions').update({ validation_status: status }).eq('submission_id', submission_id);
    return !error;
  },

  async addNoticeToSubmission(submission_id: string, type: string, message: string): Promise<boolean> {
    // We need the UUID of the submission to link the notice
    const { data: sub } = await supabase.from('submissions').select('id').eq('submission_id', submission_id).single();
    if (!sub) return false;

    const { error } = await supabase.from('notices').insert({
      submission_id: sub.id,
      type,
      message
    });
    return !error;
  },

  async saveFile(key: string, base64: string): Promise<string | null> {
    try {
      // Decode base64 
      const fetchResponse = await fetch(base64);
      const blob = await fetchResponse.blob();
      
      const { data, error } = await supabase.storage
        .from('printease_files')
        .upload(key, blob, {
          contentType: blob.type,
          upsert: true
        });
        
      if (error) {
        console.error("Storage upload error:", error);
        return null;
      }
      return key;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  async getFile(key: string): Promise<string | null> {
    const { data } = supabase.storage.from('printease_files').getPublicUrl(key);
    return data.publicUrl || null;
  },

  async deleteFile(key: string): Promise<boolean> {
    const { error } = await supabase.storage.from('printease_files').remove([key]);
    if (error) {
      console.error("Storage delete error:", error);
      return false;
    }
    return true;
  }
};
