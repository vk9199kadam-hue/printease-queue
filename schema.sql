-- Supabase Database Schema for PrintEase
-- Copy and paste this into your Supabase SQL Editor

-- 1. Users Table (Students)
CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text,
  gender text CHECK (gender IN ('Male', 'Female', 'Other')),
  student_print_id text UNIQUE NOT NULL,
  is_verified boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Shopkeepers Table
CREATE TABLE public.shopkeepers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL, -- NOTE: In production, rely on Supabase Auth
  shop_name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Print Orders Table
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text UNIQUE NOT NULL,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  student_print_id text NOT NULL,
  student_name text NOT NULL,
  total_bw_pages integer DEFAULT 0,
  total_color_pages integer DEFAULT 0,
  total_pages integer DEFAULT 0,
  spiral_binding boolean DEFAULT false,
  stapling boolean DEFAULT false,
  service_fee numeric(10,2) DEFAULT 0,
  subtotal numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) DEFAULT 0,
  payment_status text CHECK (payment_status IN ('unpaid', 'paid', 'failed')) DEFAULT 'unpaid',
  print_status text CHECK (print_status IN ('queued', 'printing', 'ready', 'completed')) DEFAULT 'queued',
  qr_code text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Order Files Table
CREATE TABLE public.order_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_storage_key text NOT NULL,
  file_type text NOT NULL,
  file_extension text NOT NULL,
  page_count integer DEFAULT 1,
  print_type text CHECK (print_type IN ('bw', 'color', 'mixed')) NOT NULL,
  color_page_ranges text,
  copies integer DEFAULT 1,
  sides text CHECK (sides IN ('single', 'double')) NOT NULL,
  bw_pages integer DEFAULT 0,
  color_pages integer DEFAULT 0,
  file_price numeric(10,2) DEFAULT 0,
  student_note text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Document Submissions Table
CREATE TABLE public.submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id text UNIQUE NOT NULL,
  student_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  roll_number text NOT NULL,
  department text NOT NULL,
  academic_year text NOT NULL,
  guide_name text NOT NULL,
  project_title text NOT NULL,
  document_type text NOT NULL,
  remarks text,
  file_name text NOT NULL,
  file_storage_key text NOT NULL,
  validation_status text CHECK (validation_status IN ('received', 'under_review', 'approved', 'rejected', 'resubmit')) DEFAULT 'received',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. Notices Table (For Submissions)
CREATE TABLE public.notices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid REFERENCES public.submissions(id) ON DELETE CASCADE,
  type text CHECK (type IN ('acknowledgment', 'missing', 'approved', 'rejected', 'resubmit')) NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Optional: Create basic updated_at trigger for orders and submissions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_modtime
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_submissions_modtime
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
