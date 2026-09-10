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
-- DATA AWAL STANDAR MADRASAH, REKENING BANK & KEUANGAN BAWAAN
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
    '0852-9214-8890',
    'MUIN, S.Pd.I',
    '197804152007011018',
    'FATHURRAZAQ, S.Pd.I',
    '2024/2025',
    20000
) ON CONFLICT (id) DO UPDATE SET
    standard_syahriah = 20000,
    headmaster_name = 'MUIN, S.Pd.I',
    treasurer_name = 'FATHURRAZAQ, S.Pd.I';

-- Hapus id akun lawas jika ada
DELETE FROM public.cash_accounts WHERE id = 'bank-bri';

-- 3 Akun Rekening Bank & Kas Resmi Madrasah
INSERT INTO public.cash_accounts (id, name, account_number, bank_name, type, balance, description)
VALUES 
    ('kas-tunai', 'Kas Tunai Bendahara', '-', 'Tunai / Cash on Hand', 'CASH', 4850000, 'Uang tunai brankas bendahara untuk operasional harian & penerimaan syahriah'),
    ('bank-bsi', 'BSI (Bank Syariah Indonesia)', '7145829910', 'Bank Syariah Indonesia', 'BANK', 28450000, 'Rekening utama yayasan & penampungan infaq pembangunan'),
    ('bank-bri-bos', 'BRI Rekening Khusus BOS', '0129-01-002845-53-1', 'Bank Rakyat Indonesia', 'BANK', 14200000, 'Penerimaan dan pertanggungjawaban Dana BOS Kemenag')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    account_number = EXCLUDED.account_number,
    bank_name = EXCLUDED.bank_name,
    type = EXCLUDED.type,
    balance = EXCLUDED.balance,
    description = EXCLUDED.description;

-- Data Transaksi Keuangan Bawaan (Buku Kas Umum / BKU)
INSERT INTO public.financial_transactions (id, ref_no, date, type, category, category_label, amount, account_id, payer_or_payee, description, proof_document_no, recorded_by, created_at)
VALUES 
    ('trx-001', 'KM-BOS/2024/07/01', '2024-07-10', 'INCOME', 'DANA_BOS', 'Penyaluran Dana BOS Tahap 1', 32000000, 'bank-bri-bos', 'Kementerian Agama Kab. Temanggung', 'Pencairan Dana BOS Reguler Madrasah Tahap 1 Tahun Anggaran 2024', 'SP2D-KEMENAG/089/2024', 'FATHURRAZAQ, S.Pd.I', '2024-07-10T10:00:00Z'),
    ('trx-002', 'KM-INF/2024/07/02', '2024-07-12', 'INCOME', 'INFAQ_PEMBANGUNAN', 'Infaq Pembangunan Gedung & Musholla', 5500000, 'bank-bsi', 'Alumni & Komite Madrasah Soborejo', 'Sumbangan dan infaq jariyah renovasi paving halaman dan musholla madrasah', 'KW-INF/2024/007', 'FATHURRAZAQ, S.Pd.I', '2024-07-12T13:30:00Z'),
    ('trx-003', 'KM-PDB/2024/07/03', '2024-07-14', 'INCOME', 'PPDB_SISWA_BARU', 'Pendaftaran & Seragam Siswa Baru', 4200000, 'kas-tunai', 'Wali Murid Siswa Baru Kelas 1', 'Pembayaran paket seragam identitas Ma''arif, batik, dan pramuka siswa baru', 'PDB-SERAGAM-01', 'FATHURRAZAQ, S.Pd.I', '2024-07-14T11:00:00Z'),
    ('trx-004', 'KK-GJR/2024/07/01', '2024-07-25', 'EXPENSE', 'BISAROH_GAJI_GURU', 'Bisaroh / Honor Guru & Pegawai', 11500000, 'bank-bri-bos', 'Dewan Guru & Tenaga Kependidikan MI (12 Orang)', 'Bisaroh bulanan ustadz/ustadzah MI Ma''arif Al Ihsan Soborejo bulan Juli', 'SLIP-HONOR-07/2024', 'FATHURRAZAQ, S.Pd.I', '2024-07-25T14:00:00Z'),
    ('trx-005', 'KK-OPR/2024/08/01', '2024-08-02', 'EXPENSE', 'LISTRIK_AIR_WIFI', 'Tagihan Listrik, Air & Wifi Madrasah', 680000, 'kas-tunai', 'PLN & Indihome Telkom', 'Pembayaran rekening listrik gedung madrasah dan langganan internet bulanan', 'STRUK-PLN-TELKOM-08', 'FATHURRAZAQ, S.Pd.I', '2024-08-02T10:00:00Z'),
    ('trx-006', 'KK-ATK/2024/08/02', '2024-08-08', 'EXPENSE', 'ATK_DAN_OPERASIONAL_KBM', 'Belanja ATK & Kebutuhan KBM', 1250000, 'kas-tunai', 'Toko Buku & ATK Berkah Pringsurat', 'Pengadaan kertas HVS, spidol whiteboard, tinta stempel, dan buku administrasi kelas', 'NOTA-BRK/892', 'FATHURRAZAQ, S.Pd.I', '2024-08-08T15:10:00Z'),
    ('trx-007', 'KK-PHB/2024/08/03', '2024-08-16', 'EXPENSE', 'KEGIATAN_PHBI_PORSENI', 'Kegiatan HUT RI & Lomba Pramuka', 1750000, 'kas-tunai', 'Panitia Peringatan Kemerdekaan Madrasah', 'Biaya perlengkapan upacara kemerdekaan, karnaval santri, dan konsumsi peserta', 'LPJ-HUT-79/MI', 'FATHURRAZAQ, S.Pd.I', '2024-08-16T16:00:00Z'),
    ('trx-008', 'KM-JMT/2024/08/04', '2024-08-23', 'INCOME', 'INFAQ_JUMAT_DONASI', 'Kotak Infaq Jum''at Santri & Guru', 450000, 'kas-tunai', 'Siswa & Dewan Guru', 'Penerimaan infaq keliling Jum''at berkah untuk kegiatan sosial santri', 'KOTAK-JMT-08', 'FATHURRAZAQ, S.Pd.I', '2024-08-23T11:45:00Z')
ON CONFLICT (id) DO UPDATE SET
    ref_no = EXCLUDED.ref_no,
    date = EXCLUDED.date,
    type = EXCLUDED.type,
    category = EXCLUDED.category,
    category_label = EXCLUDED.category_label,
    amount = EXCLUDED.amount,
    account_id = EXCLUDED.account_id,
    payer_or_payee = EXCLUDED.payer_or_payee,
    description = EXCLUDED.description,
    proof_document_no = EXCLUDED.proof_document_no,
    recorded_by = EXCLUDED.recorded_by;

