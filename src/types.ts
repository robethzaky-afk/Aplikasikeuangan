export type AcademicMonth =
  | 'Juli'
  | 'Agustus'
  | 'September'
  | 'Oktober'
  | 'November'
  | 'Desember'
  | 'Januari'
  | 'Februari'
  | 'Maret'
  | 'April'
  | 'Mei'
  | 'Juni';

export const ACADEMIC_MONTHS: AcademicMonth[] = [
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
];

export interface Student {
  id: string;
  nis: string;
  nisn?: string;
  name: string;
  gender: 'L' | 'P';
  grade: number; // 1 to 6
  classGroup: string; // '1', '2', '3A', '3B', etc.
  guardianName: string;
  guardianPhone: string;
  monthlySyahriah: number; // default per student or specific
  isExempt: boolean; // bebas biaya (yatim/dhuafa)
  status: 'AKTIF' | 'LULUS' | 'PINDAH';
}

export interface SyahriahPaymentRecord {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  grade: number;
  classGroup: string;
  months: AcademicMonth[]; // List of months paid in this transaction
  amountPerMonth: number;
  totalAmount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'TUNAI' | 'TRANSFER_BSI' | 'TRANSFER_BRI' | string;
  accountId: string; // Destination cash account
  receivedBy: string;
  notes?: string;
  createdAt: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface CashAccount {
  id: string;
  name: string;
  accountNumber?: string;
  bankName?: string;
  type: 'CASH' | 'BANK';
  balance: number;
  description: string;
}

export type OtherIncomeCategory =
  | 'DANA_BOS'
  | 'INFAQ_PEMBANGUNAN'
  | 'PPDB_SISWA_BARU'
  | 'SERAGAM_DAN_ATRIBUT'
  | 'KITAB_DAN_LKS'
  | 'TABUNGAN_SISWA_SETOR'
  | 'INFAQ_JUMAT_DONASI'
  | 'LAIN_LAIN';

export type ExpenseCategory =
  | 'BISAROH_GAJI_GURU'
  | 'SARPRAS_PEMELIHARAAN'
  | 'ATK_DAN_OPERASIONAL_KBM'
  | 'LISTRIK_AIR_WIFI'
  | 'KEGIATAN_PHBI_PORSENI'
  | 'UJIAN_ASESMEN_MADRASAH'
  | 'TABUNGAN_SISWA_TARIK'
  | 'KONSUMSI_DAN_RAPAT'
  | 'LAIN_LAIN';

export interface FinancialTransaction {
  id: string;
  refNo: string;
  date: string;
  type: TransactionType;
  category: OtherIncomeCategory | ExpenseCategory | string;
  categoryLabel: string;
  amount: number;
  accountId: string; // Kas source/destination
  payerOrPayee: string; // e.g. "Kemenag Kab. Temanggung", "Ust. Abdullah", "Toko ATK Berkah"
  description: string;
  proofDocumentNo?: string;
  recordedBy: string;
  createdAt: string;
}

export interface CashTransfer {
  id: string;
  date: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  recordedBy: string;
  createdAt: string;
}

export interface SchoolProfile {
  name: string;
  institution: string; // "Lembaga Pendidikan Ma'arif NU"
  nsm: string; // Nomor Statistik Madrasah
  npsn: string;
  address: string;
  village: string; // "Soborejo"
  district: string; // "Pringsurat"
  regency: string; // "Kabupaten Temanggung"
  province: string; // "Jawa Tengah"
  postalCode: string;
  phone: string;
  headmasterName: string;
  headmasterNip?: string;
  treasurerName: string;
  academicYear: string; // e.g. "2024/2025"
  standardSyahriah: number; // e.g. 20000
}

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
