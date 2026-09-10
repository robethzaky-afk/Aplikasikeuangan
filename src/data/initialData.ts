import {
  Student,
  SyahriahPaymentRecord,
  CashAccount,
  FinancialTransaction,
  SchoolProfile,
} from '../types';

export const INITIAL_SCHOOL_PROFILE: SchoolProfile = {
  name: "MI Ma'arif Al Ihsan Soborejo",
  institution: "Lembaga Pendidikan Ma'arif NU",
  nsm: '111233230045',
  npsn: '60712345',
  address: 'Jl. Kyai Ihsan No. 12, Soborejo',
  village: 'Soborejo',
  district: 'Pringsurat',
  regency: 'Kabupaten Temanggung',
  province: 'Jawa Tengah',
  postalCode: '56272',
  phone: '0852-9214-8890',
  headmasterName: 'MUIN, S.Pd.I',
  headmasterNip: '197804152007011018',
  treasurerName: 'FATHURRAZAQ, S.Pd.I',
  academicYear: '2024/2025',
  standardSyahriah: 20000,
};

export const INITIAL_CASH_ACCOUNTS: CashAccount[] = [
  {
    id: 'kas-tunai',
    name: 'Kas Tunai Bendahara',
    bankName: 'Tunai / Cash on Hand',
    type: 'CASH',
    balance: 0,
    description: 'Uang tunai brankas bendahara untuk operasional harian & penerimaan syahriah',
  },
  {
    id: 'bank-bsi',
    name: 'BSI (Bank Syariah Indonesia)',
    bankName: 'Bank Syariah Indonesia',
    accountNumber: '7145829910',
    type: 'BANK',
    balance: 0,
    description: 'Rekening utama yayasan & penampungan infaq pembangunan',
  },
  {
    id: 'bank-bri-bos',
    name: 'BRI Rekening Khusus BOS',
    bankName: 'Bank Rakyat Indonesia',
    accountNumber: '0129-01-002845-53-1',
    type: 'BANK',
    balance: 0,
    description: 'Penerimaan dan pertanggungjawaban Dana BOS Kemenag',
  },
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_SYAHRIAH_PAYMENTS: SyahriahPaymentRecord[] = [];

export const INITIAL_TRANSACTIONS: FinancialTransaction[] = [];

export const OTHER_INCOME_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'DANA_BOS', label: 'Dana BOS Kemenag', icon: 'Landmark' },
  { id: 'INFAQ_PEMBANGUNAN', label: 'Infaq Pembangunan / Gedung', icon: 'Building2' },
  { id: 'PPDB_SISWA_BARU', label: 'Pendaftaran / PPDB Siswa Baru', icon: 'UserPlus' },
  { id: 'SERAGAM_DAN_ATRIBUT', label: 'Seragam & Atribut Madrasah', icon: 'Shirt' },
  { id: 'KITAB_DAN_LKS', label: 'Buku Paket, LKS & Kitab', icon: 'BookOpen' },
  { id: 'TABUNGAN_SISWA_SETOR', label: 'Setoran Tabungan Siswa', icon: 'PiggyBank' },
  { id: 'INFAQ_JUMAT_DONASI', label: 'Infaq Jum\'at & Donatur / ZIS', icon: 'HeartHandshake' },
  { id: 'LAIN_LAIN', label: 'Pemasukan Lain-lain', icon: 'PlusCircle' },
];

export const EXPENSE_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'BISAROH_GAJI_GURU', label: 'Bisaroh / Gaji Guru & Karyawan', icon: 'Users' },
  { id: 'SARPRAS_PEMELIHARAAN', label: 'Sarana, Prasarana & Perbaikan', icon: 'Wrench' },
  { id: 'ATK_DAN_OPERASIONAL_KBM', label: 'ATK & Operasional Belajar Mengajar', icon: 'FileSpreadsheet' },
  { id: 'LISTRIK_AIR_WIFI', label: 'Langganan Listrik, Air & Wifi', icon: 'Zap' },
  { id: 'KEGIATAN_PHBI_PORSENI', label: 'Kegiatan PHBI, Pramuka & Lomba', icon: 'Trophy' },
  { id: 'UJIAN_ASESMEN_MADRASAH', label: 'Asesmen Madrasah / Ujian PAS-PAT', icon: 'GraduationCap' },
  { id: 'TABUNGAN_SISWA_TARIK', label: 'Penarikan Tabungan Siswa', icon: 'Coins' },
  { id: 'KONSUMSI_DAN_RAPAT', label: 'Konsumsi Rapat & Pertemuan Komite', icon: 'Coffee' },
  { id: 'LAIN_LAIN', label: 'Pengeluaran Lain-lain', icon: 'MinusCircle' },
];
