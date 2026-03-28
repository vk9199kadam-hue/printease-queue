import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('cockroachlabs.cloud') ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000, 
  idleTimeoutMillis: 30000,
  max: 20
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});


interface RPCRequest {
  method: string;
  body: {
    action: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
  };
}

interface RPCResponse {
  status: (code: number) => RPCResponse;
  json: (body: unknown) => void;
}

export default async function handler(req: RPCRequest, res: RPCResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { action, payload } = req.body;
  
  let client;
  try {
    client = await pool.connect();
    
    switch (action) {
      case 'health': {
        try {
          await pool.query('SELECT 1');
          return res.json({ status: 'ok', db_connected: true, timestamp: Date.now() });
        } catch (dbErr: unknown) {
          const message = dbErr instanceof Error ? dbErr.message : String(dbErr);
          return res.status(500).json({ 
            status: 'db_error', 
            db_connected: false, 
            message,
            timestamp: Date.now() 
          });
        }
      }
      case 'fix_db': {
        const columns = [
          'ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT \'standard\'',
          'ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_number VARCHAR(255)',
          'ALTER TABLE orders ADD COLUMN IF NOT EXISTS college VARCHAR(255)',
          'ALTER TABLE orders ADD COLUMN IF NOT EXISTS department VARCHAR(255)',
          'ALTER TABLE orders ADD COLUMN IF NOT EXISTS receiving_date VARCHAR(50)',
          'ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255)',
          'ALTER TABLE shopkeepers ADD COLUMN IF NOT EXISTS contact_number VARCHAR(255)'
        ];
        for (const sql of columns) {
          try {
            await client.query(sql);
          } catch (e) {
            console.error('Migration Column Error:', e);
          }
        }
        return res.json({ status: 'db_fix_completed' });
      }
      case 'getShopkeeperProfile': {
        const { rows } = await client.query('SELECT * FROM shopkeepers WHERE email = $1', [payload.email]);
        return res.json({ data: rows[0] || null });
      }
      case 'getPublicShopInfo': {
        const { rows } = await client.query('SELECT shop_name, upi_id, contact_number FROM shopkeepers LIMIT 1');
        return res.json({ data: rows[0] || null });
      }
      case 'updateShopkeeperProfile': {
        const { email, name, shop_name, upi_id, contact_number } = payload;
        const result = await client.query(
          'UPDATE shopkeepers SET name = $2, shop_name = $3, upi_id = $4, contact_number = $5 WHERE email = $1 RETURNING *',
          [email, name, shop_name, upi_id, contact_number]
        );
        return res.json({ data: result.rows[0] });
      }
      case 'getUsers': {
        const { rows } = await client.query('SELECT * FROM users');
        return res.json({ data: rows });
      }
      case 'getUserById': {
        const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [payload.id]);
        return res.json({ data: rows[0] || null });
      }
      case 'getUserByEmail': {
        const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [payload.email]);
        return res.json({ data: rows[0] || null });
      }
      case 'getOrderById': {
        const { rows } = await client.query('SELECT * FROM orders WHERE order_id = $1', [payload.id]);
        if (rows.length > 0) {
          const files = await client.query('SELECT * FROM order_files WHERE order_id = $1', [rows[0].id]);
          rows[0].files = files.rows;
          rows[0].extra_services = { spiral_binding: !!rows[0].spiral_binding, stapling: !!rows[0].stapling };
        }
        return res.json({ data: rows[0] || null });
      }
      case 'createUser': {
        const { name, email, password, gender, student_print_id, is_verified } = payload;
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        const result = await client.query(
          'INSERT INTO users (name, email, password, gender, student_print_id, is_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [name, email, hashedPassword, gender, student_print_id, is_verified]
        );
        return res.json({ data: result.rows[0] });
      }
      case 'verifyShopkeeper': {
        const { rows } = await client.query('SELECT * FROM shopkeepers WHERE email = $1', [payload.email]);
        if (rows.length === 0) return res.json({ data: null });
        
        const shopkeeper = rows[0];
        // Handle migration: if password matches plain text, update it to hash for the future
        let isValid = false;
        if (shopkeeper.password === payload.password) {
           isValid = true;
           const newHash = await bcrypt.hash(payload.password, 10);
           await client.query('UPDATE shopkeepers SET password = $1 WHERE id = $2', [newHash, shopkeeper.id]);
        } else {
           isValid = await bcrypt.compare(payload.password, shopkeeper.password);
        }
        
        if (!isValid) return res.json({ data: null });
        
        // Remove password from returned object for security
        delete shopkeeper.password;
        return res.json({ data: shopkeeper });
      }
      case 'getPaidOrders': {
        const { rows } = await client.query('SELECT * FROM orders WHERE payment_status = \'paid\' ORDER BY created_at DESC');
        for (const order of rows) {
          const files = await client.query('SELECT * FROM order_files WHERE order_id = $1', [order.id]);
          order.files = files.rows;
          order.extra_services = { spiral_binding: !!order.spiral_binding, stapling: !!order.stapling };
        }
        return res.json({ data: rows });
      }
      case 'getOrdersByStudentId': {
        const { rows } = await client.query('SELECT * FROM orders WHERE student_id = $1 ORDER BY created_at DESC', [payload.student_id]);
        for (const order of rows) {
          const files = await client.query('SELECT * FROM order_files WHERE order_id = $1', [order.id]);
          order.files = files.rows;
          order.extra_services = { spiral_binding: !!order.spiral_binding, stapling: !!order.stapling };
        }
        return res.json({ data: rows });
      }
      case 'getAdminStats': {
        const totalUsers = await client.query('SELECT COUNT(*) FROM users');
        const totalShops = await client.query('SELECT COUNT(*) FROM shopkeepers');
        const totalOrders = await client.query('SELECT COUNT(*) FROM orders');
        const totalRevenue = await client.query("SELECT SUM(total_amount) FROM orders WHERE payment_status = 'paid'");

        return res.json({
          data: {
            total_users: parseInt(totalUsers.rows[0].count, 10),
            total_shops: parseInt(totalShops.rows[0].count, 10),
            total_orders: parseInt(totalOrders.rows[0].count, 10),
            total_revenue: parseFloat(totalRevenue.rows[0].sum || '0').toFixed(2)
          }
        });
      }
      case 'createOrder': {
        const { order_id, student_id, student_print_id, student_name, total_bw_pages, total_color_pages, total_pages, extra_services, service_fee, subtotal, total_amount, payment_status, print_status, qr_code, files, order_type, contact_number, college, department, receiving_date } = payload;
        const result = await client.query(
          'INSERT INTO orders (order_id, student_id, student_print_id, student_name, total_bw_pages, total_color_pages, total_pages, spiral_binding, stapling, service_fee, subtotal, total_amount, payment_status, print_status, qr_code, order_type, contact_number, college, department, receiving_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *',
          [order_id, student_id, student_print_id, student_name, total_bw_pages, total_color_pages, total_pages, extra_services?.spiral_binding, extra_services?.stapling, service_fee, subtotal, total_amount, payment_status, print_status, qr_code, order_type || 'standard', contact_number, college, department, receiving_date]
        );
        const newOrder = result.rows[0];
        
        if (files && files.length > 0) {
          for (const file of files) {
            await client.query(
              'INSERT INTO order_files (order_id, file_name, file_storage_key, file_type, file_extension, page_count, print_type, color_page_ranges, copies, sides, bw_pages, color_pages, file_price, student_note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
              [newOrder.id, file.file_name, file.file_storage_key, file.file_type, file.file_extension, file.page_count, file.print_type, file.color_page_ranges, file.copies, file.sides, file.bw_pages, file.color_pages, file.file_price, file.student_note]
            );
          }
        }
        return res.json({ data: newOrder });
      }
      case 'updateOrderStatus': {
        await client.query('UPDATE orders SET print_status = $1 WHERE order_id = $2', [payload.print_status, payload.order_id]);
        
        if (payload.print_status === 'completed') {
          try {
            const { rows } = await client.query('SELECT id FROM orders WHERE order_id = $1', [payload.order_id]);
            if (rows.length > 0) {
              const files = await client.query('SELECT file_storage_key FROM order_files WHERE order_id = $1', [rows[0].id]);
              const keysToDelete = files.rows.map((f: { file_storage_key: string }) => f.file_storage_key).filter(Boolean);
              
              if (keysToDelete.length > 0) {
                // Delete from CockroachDB backup storage
                await client.query('DELETE FROM file_storage WHERE key = ANY($1)', [keysToDelete])
                  .catch((e: Error) => console.error('DB Delete Error:', e.message));
                  
                // Delete permanently from Supabase Cloud to preserve 1GB free tier
                if (process.env.VITE_SUPABASE_URL) {
                  const { error } = await supabaseAdmin.storage.from('printease_files').remove(keysToDelete);

                  if (error) console.error('Supabase Cleanup Error:', error.message);
                }
              }
            }
          } catch (e) {
            console.error('File cleanup error:', e instanceof Error ? e.message : String(e));
          }
        }
        
        return res.json({ data: true });
      }
      case 'getSubmissions': {
        const { rows } = await client.query('SELECT * FROM submissions ORDER BY created_at DESC');
        for (const sub of rows) {
          const notices = await client.query('SELECT * FROM notices WHERE submission_id = $1', [sub.id]);
          sub.notices = notices.rows;
        }
        return res.json({ data: rows });
      }
      case 'createSubmission': {
        const { submission_id, student_id, student_name, roll_number, department, academic_year, guide_name, project_title, document_type, remarks, file_name, file_storage_key, validation_status } = payload;
        const result = await client.query(
          'INSERT INTO submissions (submission_id, student_id, student_name, roll_number, department, academic_year, guide_name, project_title, document_type, remarks, file_name, file_storage_key, validation_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
          [submission_id, student_id, student_name, roll_number, department, academic_year, guide_name, project_title, document_type, remarks, file_name, file_storage_key, validation_status]
        );
        return res.json({ data: result.rows[0] });
      }
      case 'updateSubmissionStatus': {
        await client.query('UPDATE submissions SET validation_status = $1 WHERE submission_id = $2', [payload.status, payload.submission_id]);
        return res.json({ data: true });
      }
      case 'addNoticeToSubmission': {
        const { rows } = await client.query('SELECT id FROM submissions WHERE submission_id = $1', [payload.submission_id]);
        if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
        await client.query('INSERT INTO notices (submission_id, type, message) VALUES ($1, $2, $3)', [rows[0].id, payload.type, payload.message]);
        return res.json({ data: true });
      }
      case 'uploadFile': {
        await client.query('INSERT INTO file_storage (key, file_data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET file_data = EXCLUDED.file_data', [payload.key, payload.base64]);
        return res.json({ data: true });
      }
      case 'downloadFile': {
        // First try to get the modern cloud URL
        const { data: publicUrlData } = supabaseAdmin.storage
          .from('printease_files')
          .getPublicUrl(payload.key);
        
        // As a fallback, check if it's a legacy file in CockroachDB
        const { rows } = await client.query('SELECT file_data FROM file_storage WHERE key = $1', [payload.key]);
        const legacyData = rows[0]?.file_data || null;

        // If it's not legacy, provide the cloud URL
        return res.json({ data: legacyData || publicUrlData.publicUrl });
      }
      case 'deleteFile': {
        await client.query('DELETE FROM file_storage WHERE key = $1', [payload.key]);
        return res.json({ data: true });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[RPC ERROR] Action: ${action} | Message: ${errorMsg}`);
    return res.status(500).json({ 
      error: 'Database operation failed', 
      details: errorMsg,
      action 
    });
  } finally {
    if (client) client.release();
  }
}
