import { Pool } from 'pg';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME || 'printease-files';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { action, payload } = req.body;

  try {
    switch (action) {
      case 'getUsers': {
        const { rows } = await pool.query('SELECT * FROM users');
        return res.json({ data: rows });
      }
      case 'getUserById': {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [payload.id]);
        return res.json({ data: rows[0] || null });
      }
      case 'getUserByEmail': {
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [payload.email]);
        return res.json({ data: rows[0] || null });
      }
      case 'createUser': {
        const { name, email, password, gender, student_print_id, is_verified } = payload;
        const result = await pool.query(
          'INSERT INTO users (name, email, password, gender, student_print_id, is_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
          [name, email, password, gender, student_print_id, is_verified]
        );
        return res.json({ data: result.rows[0] });
      }
      case 'verifyShopkeeper': {
        const { rows } = await pool.query('SELECT * FROM shopkeepers WHERE email = $1 AND password = $2', [payload.email, payload.password]);
        return res.json({ data: rows[0] || null });
      }
      case 'getPaidOrders': {
        const { rows } = await pool.query('SELECT * FROM orders WHERE payment_status = \'paid\' ORDER BY created_at DESC');
        for (const order of rows) {
          const files = await pool.query('SELECT * FROM order_files WHERE order_id = $1', [order.id]);
          order.files = files.rows;
        }
        return res.json({ data: rows });
      }
      case 'getOrdersByStudentId': {
        const { rows } = await pool.query('SELECT * FROM orders WHERE student_id = $1 ORDER BY created_at DESC', [payload.student_id]);
        for (const order of rows) {
          const files = await pool.query('SELECT * FROM order_files WHERE order_id = $1', [order.id]);
          order.files = files.rows;
        }
        return res.json({ data: rows });
      }
      case 'createOrder': {
        const { order_id, student_id, student_print_id, student_name, total_bw_pages, total_color_pages, total_pages, spiral_binding, stapling, service_fee, subtotal, total_amount, payment_status, print_status, files } = payload;
        const result = await pool.query(
          'INSERT INTO orders (order_id, student_id, student_print_id, student_name, total_bw_pages, total_color_pages, total_pages, spiral_binding, stapling, service_fee, subtotal, total_amount, payment_status, print_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
          [order_id, student_id, student_print_id, student_name, total_bw_pages, total_color_pages, total_pages, spiral_binding, stapling, service_fee, subtotal, total_amount, payment_status, print_status]
        );
        const newOrder = result.rows[0];
        
        if (files && files.length > 0) {
          for (const file of files) {
            await pool.query(
              'INSERT INTO order_files (order_id, file_name, file_storage_key, file_type, file_extension, page_count, print_type, color_page_ranges, copies, sides, bw_pages, color_pages, file_price, student_note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
              [newOrder.id, file.file_name, file.file_storage_key, file.file_type, file.file_extension, file.page_count, file.print_type, file.color_page_ranges, file.copies, file.sides, file.bw_pages, file.color_pages, file.file_price, file.student_note]
            );
          }
        }
        return res.json({ data: newOrder });
      }
      case 'updateOrderStatus': {
        await pool.query('UPDATE orders SET print_status = $1 WHERE order_id = $2', [payload.print_status, payload.order_id]);
        
        if (payload.print_status === 'completed') {
          try {
            const { rows } = await pool.query('SELECT id FROM orders WHERE order_id = $1', [payload.order_id]);
            if (rows.length > 0) {
              const files = await pool.query('SELECT file_storage_key FROM order_files WHERE order_id = $1', [rows[0].id]);
              for (const file of files.rows) {
                if (file.file_storage_key) {
                  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: file.file_storage_key });
                  await s3.send(command).catch(e => console.error('S3 Delete Error:', e));
                }
              }
            }
          } catch (e) {
            console.error('File cleanup error:', e);
          }
        }
        
        return res.json({ data: true });
      }
      case 'getSubmissions': {
        const { rows } = await pool.query('SELECT * FROM submissions ORDER BY created_at DESC');
        for (const sub of rows) {
          const notices = await pool.query('SELECT * FROM notices WHERE submission_id = $1', [sub.id]);
          sub.notices = notices.rows;
        }
        return res.json({ data: rows });
      }
      case 'createSubmission': {
        const { submission_id, student_id, student_name, roll_number, department, academic_year, guide_name, project_title, document_type, remarks, file_name, file_storage_key, validation_status } = payload;
        const result = await pool.query(
          'INSERT INTO submissions (submission_id, student_id, student_name, roll_number, department, academic_year, guide_name, project_title, document_type, remarks, file_name, file_storage_key, validation_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
          [submission_id, student_id, student_name, roll_number, department, academic_year, guide_name, project_title, document_type, remarks, file_name, file_storage_key, validation_status]
        );
        return res.json({ data: result.rows[0] });
      }
      case 'updateSubmissionStatus': {
        await pool.query('UPDATE submissions SET validation_status = $1 WHERE submission_id = $2', [payload.status, payload.submission_id]);
        return res.json({ data: true });
      }
      case 'addNoticeToSubmission': {
        const { rows } = await pool.query('SELECT id FROM submissions WHERE submission_id = $1', [payload.submission_id]);
        if (!rows.length) return res.status(404).json({ error: 'Submission not found' });
        await pool.query('INSERT INTO notices (submission_id, type, message) VALUES ($1, $2, $3)', [rows[0].id, payload.type, payload.message]);
        return res.json({ data: true });
      }
      case 'getUploadUrl': {
        const command = new PutObjectCommand({ Bucket: BUCKET, Key: payload.key, ContentType: payload.contentType });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return res.json({ data: url });
      }
      case 'getDownloadUrl': {
        const command = new GetObjectCommand({ Bucket: BUCKET, Key: payload.key });
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return res.json({ data: url });
      }
      case 'deleteFile': {
        const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: payload.key });
        await s3.send(command);
        return res.json({ data: true });
      }
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error: unknown) {
    console.error(error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res.status(500).json({ error: (error as any).message });
  }
}
