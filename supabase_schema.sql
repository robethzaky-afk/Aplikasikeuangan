-- ====================================================================
-- SKRIP SQL LENGKAP SETUP DATABASE SUPABASE (POSTGRESQL)
-- MI MA'ARIF AL IHSAN SOBOREJO, KEC. PRINGSURAT, KAB. TEMANGGUNG
-- Project URL: https://pwevnvuzhnbpugfgvcax.supabase.co
-- ====================================================================
-- CARA PENGGUNAAN:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/pwevnvuzhnbpugfgvcax
-- 2. Klik menu "SQL Editor" di bilah kiri (>_)
-- 3. Klik "+ New query"
-- 4. Paste seluruh kode di bawah ini lalu klik tombol hijau "Run" (Ctrl + Enter)
-- ====================================================================

-- 1. TABEL PROFIL MADRASAH
CREATE TABLE IF NOT EXISTS public.school_profile (
    id text PRIMARY KEY DEFAULT 'default',
    name text NOT NULL,
    institution text NOT NULL,
    nsm text,
    npsn text,
    address text,
    village text,
    district text,
    regency text,
    province text,
    postal_code text,
    phone text,
    headmaster_name text,
    headmaster_nip text,
    treasurer_name text,
    academic_year text,
    standard_syahriah numeric DEFAULT 20000,
    updated_at timestamptz DEFAULT now()
);

-- 2. TABEL DATA SISWA
CREATE TABLE IF NOT EXISTS public.students (
    id text PRIMARY KEY,
    nis text NOT NULL UNIQUE,
    nisn text,
    name text NOT NULL,
    gender text CHECK (gender IN ('L', 'P')),
    grade integer NOT NULL CHECK (grade >= 1 AND grade <= 6),
    class_group text NOT NULL,
    guardian_name text,
    guardian_phone text,
    monthly_syahriah numeric DEFAULT 20000,
    is_exempt boolean DEFAULT false,
    status text DEFAULT 'AKTIF' CHECK (status IN ('AKTIF', 'LULUS', 'PINDAH')),
    created_at timestamptz DEFAULT now()
);

-- 3. TABEL REKENING / AKUN KAS
CREATE TABLE IF NOT EXISTS public.cash_accounts (
    id text PRIMARY KEY,
    name text NOT NULL,
    account_number text,
    bank_name text,
    type text CHECK (type IN ('CASH', 'BANK')),
    balance numeric DEFAULT 0,
    description text,
    updated_at timestamptz DEFAULT now()
);

-- 4. TABEL PEMBAYARAN SYAHRIAH / SPP
CREATE TABLE IF NOT EXISTS public.syahriah_payments (
    id text PRIMARY KEY,
    receipt_no text NOT NULL,
    student_id text REFERENCES public.students(id) ON DELETE CASCADE,
    student_name text NOT NULL,
    grade integer NOT NULL,
    class_group text,
    months text[] NOT NULL,
    amount_per_month numeric NOT NULL,
    total_amount numeric NOT NULL,
    payment_date date NOT NULL,
    payment_method text NOT NULL,
    account_id text,
    received_by text NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- 5. TABEL TRANSAKSI KEUANGAN LAINNYA (BKU)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id text PRIMARY KEY,
    ref_no text NOT NULL,
    date date NOT NULL,
    type text CHECK (type IN ('INCOME', 'EXPENSE')),
    category text NOT NULL,
    category_label text NOT NULL,
    amount numeric NOT NULL,
    account_id text,
    payer_or_payee text NOT NULL,
    description text,
    proof_document_no text,
    recorded_by text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 6. TABEL TRANSFER ANTAR KAS
CREATE TABLE IF NOT EXISTS public.cash_transfers (
    id text PRIMARY KEY,
    date date NOT NULL,
    from_account_id text,
    to_account_id text,
    amount numeric NOT NULL,
    description text,
    recorded_by text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & HAK AKSES PUBLIK (ANON KEY)
-- Mengizinkan aplikasi frontend membaca dan menulis data
-- ====================================================================

ALTER TABLE public.school_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syahriah_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transfers ENABLE ROW LEVEL SECURITY;

-- Buat Policy Akses Penuh untuk Anon Key
DROP POLICY IF EXISTS "Public full access school_profile" ON public.school_profile;
CREATE POLICY "Public full access school_profile" ON public.school_profile FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access students" ON public.students;
CREATE POLICY "Public full access students" ON public.students FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access cash_accounts" ON public.cash_accounts;
CREATE POLICY "Public full access cash_accounts" ON public.cash_accounts FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access syahriah_payments" ON public.syahriah_payments;
CREATE POLICY "Public full access syahriah_payments" ON public.syahriah_payments FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access financial_transactions" ON public.financial_transactions;
CREATE POLICY "Public full access financial_transactions" ON public.financial_transactions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access cash_transfers" ON public.cash_transfers;
CREATE POLICY "Public full access cash_transfers" ON public.cash_transfers FOR ALL TO anon USING (true) WITH CHECK (true);

-- ====================================================================
-- DATA AWAL STANDAR MADRASAH & AKUN KAS
-- ====================================================================

-- Data Profil Default
INSERT INTO public.school_profile (
    id, name, institution, nsm, npsn, address, village, district, regency, province, postal_code, phone, headmaster_name, headmaster_nip, treasurer_name, academic_year, standard_syahriah
) VALUES (
    'default',
    'MI MA''ARIF AL IHSAN SOBOREJO',
    'Lembaga Pendidikan Ma''arif NU',
    '111233230045',
    '60712345',
    'Jl. Kyai Ihsan No. 12, Soborejo',
    'Soborejo',
    'Pringsurat',
    'Kabupaten Temanggung',
    'Jawa Tengah',
    '56272',
    '0852-9012-3456',
    'MUIN, S.Pd.I',
    '197804152007011018',
    'FATHURRAZAQ, S.Pd.I',
    '2024/2025',
    20000
) ON CONFLICT (id) DO UPDATE SET
    standard_syahriah = 20000;

-- Rekening & Kas
INSERT INTO public.cash_accounts (id, name, account_number, bank_name, type, balance, description)
VALUES 
    ('kas-tunai', 'Kas Tunai Bendahara', '-', 'Tunai / Cash on Hand', 'CASH', 0, 'Uang tunai fisik di brankas bendahara'),
    ('bank-bsi', 'Rekening BSI Operasional', '7145892011', 'Bank Syariah Indonesia (BSI)', 'BANK', 0, 'Rekening resmi operasional madrasah & SPP'),
    ('bank-bri', 'Rekening BRI Madrasah', '0129-01-002845-50-8', 'Bank Rakyat Indonesia (BRI)', 'BANK', 0, 'Rekening penampungan dana BOS')
ON CONFLICT (id) DO NOTHING;
