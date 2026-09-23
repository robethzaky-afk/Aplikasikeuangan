import { createClient } from '@supabase/supabase-js';
import {
  Student,
  SyahriahPaymentRecord,
  CashAccount,
  FinancialTransaction,
  CashTransfer,
  SchoolProfile,
} from '../types';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  'https://pwevnvuzhnbpugfgvcax.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_O6ccP5rhDq8hwcskKUFThQ_DgtsTq-w';

// Inisialisasi Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// SQL Schema Lengkap untuk Dijalankan di Supabase SQL Editor
export const SUPABASE_SCHEMA_SQL = `-- ====================================================================
-- SCHEMA DATABASE SUPABASE UNTUK MI MA'ARIF AL IHSAN SOBOREJO
-- Project URL: https://pwevnvuzhnbpugfgvcax.supabase.co
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
    target_infaq_pembangunan numeric DEFAULT 500000,
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

-- Aktifkan Supabase Realtime Replication untuk semua tabel
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.school_profile;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_accounts;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.syahriah_payments;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_transactions;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_transfers;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

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
`;

// Helper: Cek Koneksi & Keberadaan Tabel di Supabase
export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  tablesFound: boolean;
  message: string;
  details?: Record<string, boolean>;
}> {
  try {
    // Uji koneksi tabel school_profile
    const { data, error } = await supabase
      .from('school_profile')
      .select('id')
      .limit(1);

    if (error) {
      if (
        error.code === '42P01' || // relation does not exist
        error.message.toLowerCase().includes('does not exist') ||
        error.message.toLowerCase().includes('relation "school_profile" does not exist') ||
        error.message.toLowerCase().includes('not found')
      ) {
        return {
          connected: true,
          tablesFound: false,
          message:
            'Terkoneksi ke Supabase, namun tabel belum dibuat. Jalankan SQL Schema di SQL Editor Supabase.',
        };
      }
      return {
        connected: false,
        tablesFound: false,
        message: `Gagal mengakses Supabase: ${error.message}`,
      };
    }

    return {
      connected: true,
      tablesFound: true,
      message: 'Koneksi Supabase aktif & tabel database siap digunakan!',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      tablesFound: false,
      message: `Koneksi gagal: ${errorMsg}`,
    };
  }
}

// Helper Mappers: Database snake_case <-> App camelCase
export function mapStudentToDb(student: Student) {
  const safeNis =
    student.nis && student.nis.trim() !== ''
      ? student.nis.trim()
      : `NIS-${student.id.replace(/^std-/, '')}`;
  return {
    id: student.id,
    nis: safeNis,
    nisn: student.nisn || null,
    name: student.name,
    gender: student.gender,
    grade: student.grade,
    class_group: student.classGroup,
    guardian_name: student.guardianName || '',
    guardian_phone: student.guardianPhone || '',
    monthly_syahriah: student.monthlySyahriah || 20000,
    is_exempt: Boolean(student.isExempt),
    status: student.status || 'AKTIF',
  };
}

export function mapDbToStudent(row: any): Student {
  return {
    id: row.id,
    nis: row.nis,
    nisn: row.nisn || undefined,
    name: row.name,
    gender: row.gender,
    grade: Number(row.grade),
    classGroup: row.class_group,
    guardianName: row.guardian_name || '',
    guardianPhone: row.guardian_phone || '',
    monthlySyahriah: Number(row.monthly_syahriah || 20000),
    isExempt: Boolean(row.is_exempt),
    status: row.status,
  };
}

export function resolvePaymentAccountId(
  accountId?: string | null,
  paymentMethod?: string | null
): string {
  if (accountId && accountId !== 'bank-bri') {
    return accountId;
  }
  if (accountId === 'bank-bri') {
    return 'bank-bri-bos';
  }
  const method = String(paymentMethod || '').toUpperCase();
  if (method.includes('BSI')) {
    return 'bank-bsi';
  }
  if (method.includes('BRI')) {
    return 'bank-bri-bos';
  }
  if (method.includes('TRANSFER')) {
    return 'bank-bsi';
  }
  return 'kas-tunai';
}

export function resolveTransactionAccountId(
  accountId?: string | null,
  category?: string | null
): string {
  if (accountId && accountId !== 'bank-bri') {
    return accountId;
  }
  if (accountId === 'bank-bri') {
    return 'bank-bri-bos';
  }
  const cat = String(category || '').toUpperCase();
  if (cat === 'DANA_BOS') {
    return 'bank-bri-bos';
  }
  if (cat.includes('INFAQ_PEMBANGUNAN') || cat.includes('GEDUNG')) {
    return 'bank-bsi';
  }
  return 'kas-tunai';
}

export function mapSyahriahToDb(rec: SyahriahPaymentRecord) {
  const accountId = resolvePaymentAccountId(rec.accountId, rec.paymentMethod);
  return {
    id: rec.id,
    receipt_no: rec.receiptNo,
    student_id: rec.studentId,
    student_name: rec.studentName,
    grade: rec.grade,
    class_group: rec.classGroup,
    months: rec.months,
    amount_per_month: rec.amountPerMonth,
    total_amount: rec.totalAmount,
    payment_date: rec.paymentDate,
    payment_method: rec.paymentMethod,
    account_id: accountId,
    received_by: rec.receivedBy,
    notes: rec.notes || null,
    created_at: rec.createdAt || new Date().toISOString(),
  };
}

export function mapDbToSyahriah(row: any): SyahriahPaymentRecord {
  const accountId = resolvePaymentAccountId(row.account_id, row.payment_method);
  return {
    id: row.id,
    receiptNo: row.receipt_no,
    studentId: row.student_id,
    studentName: row.student_name,
    grade: Number(row.grade),
    classGroup: row.class_group,
    months: row.months || [],
    amountPerMonth: Number(row.amount_per_month),
    totalAmount: Number(row.total_amount),
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    accountId,
    receivedBy: row.received_by,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export function mapAccountToDb(acc: CashAccount) {
  return {
    id: acc.id,
    name: acc.name,
    account_number: acc.accountNumber || '-',
    bank_name: acc.bankName || '',
    type: acc.type,
    balance: acc.balance,
    description: acc.description || '',
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToAccount(row: any): CashAccount {
  const isLegacyBri = row.id === 'bank-bri';
  const id = isLegacyBri ? 'bank-bri-bos' : row.id;
  const name = isLegacyBri
    ? 'BRI Rekening Khusus BOS'
    : row.id === 'bank-bsi'
    ? 'BSI (Bank Syariah Indonesia)'
    : row.name;
  const bankName =
    row.bank_name && row.bank_name !== ''
      ? row.bank_name
      : row.id === 'bank-bsi'
      ? 'Bank Syariah Indonesia'
      : id === 'bank-bri-bos'
      ? 'Bank Rakyat Indonesia'
      : undefined;
  const accountNumber =
    row.account_number && row.account_number !== '-'
      ? row.account_number
      : row.id === 'bank-bsi'
      ? '7145829910'
      : id === 'bank-bri-bos'
      ? '0129-01-002845-53-1'
      : undefined;

  return {
    id,
    name,
    accountNumber,
    bankName,
    type: row.type || (id.startsWith('bank-') ? 'BANK' : 'CASH'),
    balance: Number(row.balance || 0),
    description: row.description || '',
  };
}

export function mapTransactionToDb(t: FinancialTransaction) {
  const accountId = resolveTransactionAccountId(t.accountId, t.category);
  return {
    id: t.id,
    ref_no: t.refNo,
    date: t.date,
    type: t.type,
    category: t.category,
    category_label: t.categoryLabel,
    amount: t.amount,
    account_id: accountId,
    payer_or_payee: t.payerOrPayee,
    description: t.description || '',
    proof_document_no: t.proofDocumentNo || null,
    recorded_by: t.recordedBy,
    created_at: t.createdAt || new Date().toISOString(),
  };
}

export function mapDbToTransaction(row: any): FinancialTransaction {
  const accountId = resolveTransactionAccountId(row.account_id, row.category);
  return {
    id: row.id,
    refNo: row.ref_no,
    date: row.date,
    type: row.type,
    category: row.category,
    categoryLabel: row.category_label,
    amount: Number(row.amount),
    accountId,
    payerOrPayee: row.payer_or_payee,
    description: row.description || '',
    proofDocumentNo: row.proof_document_no || undefined,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

export function mapProfileToDb(p: SchoolProfile) {
  return {
    id: 'default',
    name: p.name,
    institution: p.institution,
    nsm: p.nsm,
    npsn: p.npsn,
    address: p.address,
    village: p.village,
    district: p.district,
    regency: p.regency,
    province: p.province,
    postal_code: p.postalCode,
    phone: p.phone,
    headmaster_name: p.headmasterName,
    headmaster_nip: p.headmasterNip || null,
    treasurer_name: p.treasurerName,
    academic_year: p.academicYear,
    standard_syahriah: p.standardSyahriah || 20000,
    target_infaq_pembangunan: p.targetInfaqPembangunan || 500000,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbToProfile(row: any): SchoolProfile {
  return {
    name: row.name,
    institution: row.institution,
    nsm: row.nsm || '',
    npsn: row.npsn || '',
    address: row.address || '',
    village: row.village || '',
    district: row.district || '',
    regency: row.regency || '',
    province: row.province || '',
    postalCode: row.postal_code || '',
    phone: row.phone || '',
    headmasterName: row.headmaster_name || '',
    headmasterNip: row.headmaster_nip || undefined,
    treasurerName: row.treasurer_name || '',
    academicYear: row.academic_year || '2024/2025',
    standardSyahriah: Number(row.standard_syahriah || 20000),
    targetInfaqPembangunan: row.target_infaq_pembangunan
      ? Number(row.target_infaq_pembangunan)
      : (row.targetInfaqPembangunan ? Number(row.targetInfaqPembangunan) : 500000),
  };
}

export function mapTransferToDb(trf: CashTransfer) {
  return {
    id: trf.id,
    date: trf.date,
    from_account_id: trf.fromAccountId,
    to_account_id: trf.toAccountId,
    amount: trf.amount,
    description: trf.description,
    recorded_by: trf.recordedBy,
    created_at: trf.createdAt || new Date().toISOString(),
  };
}

export function mapDbToTransfer(row: any): CashTransfer {
  return {
    id: row.id,
    date: row.date,
    fromAccountId: row.from_account_id,
    toAccountId: row.to_account_id,
    amount: Number(row.amount),
    description: row.description || '',
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  };
}

