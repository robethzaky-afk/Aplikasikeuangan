import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Student,
  SyahriahPaymentRecord,
  CashAccount,
  FinancialTransaction,
  SchoolProfile,
  AcademicMonth,
  CloudSyncStatus,
  AdminPromptState,
} from '../types';
import {
  INITIAL_SCHOOL_PROFILE,
  INITIAL_CASH_ACCOUNTS,
  INITIAL_STUDENTS,
  INITIAL_SYAHRIAH_PAYMENTS,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';
import {
  supabase,
  checkSupabaseHealth,
  mapStudentToDb,
  mapDbToStudent,
  mapSyahriahToDb,
  mapDbToSyahriah,
  mapAccountToDb,
  mapDbToAccount,
  mapTransactionToDb,
  mapDbToTransaction,
  mapProfileToDb,
  mapDbToProfile,
  resolvePaymentAccountId,
  resolveTransactionAccountId,
} from '../lib/supabase';

interface FinanceContextType {
  schoolProfile: SchoolProfile;
  updateSchoolProfile: (profile: SchoolProfile) => void;
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => Student;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  clearAllStudents: (gradeFilter?: number | 'ALL') => void;
  bulkImportStudents: (
    newStudents: Omit<Student, 'id'>[],
    strategy?: 'UPSERT' | 'SKIP_EXISTING'
  ) => { added: number; updated: number; total: number };
  syahriahPayments: SyahriahPaymentRecord[];
  recordSyahriahPayment: (
    payment: Omit<SyahriahPaymentRecord, 'id' | 'receiptNo' | 'createdAt'>
  ) => SyahriahPaymentRecord;
  updateSyahriahPayment: (payment: SyahriahPaymentRecord) => void;
  deleteSyahriahPayment: (id: string) => void;
  editingSyahriahPayment: SyahriahPaymentRecord | null;
  setEditingSyahriahPayment: (payment: SyahriahPaymentRecord | null) => void;
  cashAccounts: CashAccount[];
  updateCashAccount: (account: CashAccount) => void;
  addCashAccount: (account: Omit<CashAccount, 'id'>) => CashAccount;
  deleteCashAccount: (id: string) => void;
  syncFinancialsWithCloud: () => Promise<{ success: boolean; message: string }>;
  clearAllFinancialData: () => Promise<{ success: boolean; message: string }>;
  transactions: FinancialTransaction[];
  addTransaction: (
    trx: Omit<FinancialTransaction, 'id' | 'refNo' | 'createdAt'>
  ) => FinancialTransaction;
  updateTransaction: (trx: FinancialTransaction) => void;
  deleteTransaction: (id: string) => void;
  editingTransaction: FinancialTransaction | null;
  setEditingTransaction: (trx: FinancialTransaction | null) => void;
  transferCash: (
    fromId: string,
    toId: string,
    amount: number,
    description: string
  ) => void;
  mutateMadrasahToPembangunan: (params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description: string;
    refNo?: string;
  }) => void;
  activeReceipt: SyahriahPaymentRecord | null;
  setActiveReceipt: (receipt: SyahriahPaymentRecord | null) => void;
  // Cloud Sync Realtime
  cloudSyncStatus: CloudSyncStatus;
  isInitialSyncing: boolean;
  lastSyncedAt: Date | null;
  syncErrorMessage: string | null;
  forceFullSync: () => Promise<{ success: boolean; message: string }>;
  // Calculations
  getStudentPaidMonths: (studentId: string) => AcademicMonth[];
  isMonthPaid: (studentId: string, month: AcademicMonth) => boolean;
  totalCashBalance: number;
  totalIncomeOverall: number;
  totalExpenseOverall: number;
  totalSyahriahIncome: number;
  totalOtherIncome: number;
  netIncomeOverall: number;
  cashDiscrepancy: number;
  cashReconciliationDetails: {
    accountId: string;
    accountName: string;
    bankName?: string;
    accountNumber?: string;
    type: 'CASH' | 'BANK';
    syahriahIn: number;
    trxIn: number;
    trxOut: number;
    computedBalance: number;
    recordedBalance: number;
    discrepancy: number;
    isBalanced: boolean;
  }[];
  reconcileCashBalances: () => Promise<{
    success: boolean;
    message: string;
    reconciledCount: number;
  }>;
  // Backup & Restore
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => boolean;
  resetToDefault: () => void;
  // Admin & Security Mode
  isAdmin: boolean;
  loginAdmin: (password: string) => { success: boolean; message: string };
  logoutAdmin: () => void;
  changeAdminPassword: (
    oldPassword: string,
    newPassword: string
  ) => { success: boolean; message: string };
  requireAdmin: (action: () => void, actionDescription?: string) => boolean;
  adminPromptState: AdminPromptState | null;
  openAdminPrompt: (description?: string, onSuccess?: () => void) => void;
  closeAdminPrompt: () => void;
  isDefaultPassword: boolean;
  autoLockMinutes: number;
  setAutoLockMinutes: (minutes: number) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const hashPassword = (pwd: string): string => {
  let hash = 0;
  const salted = `mi_sobo_secure_${pwd}_bendahara_2025`;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
};

export const DEFAULT_ADMIN_PASSWORD = 'admin123';

const STORAGE_KEYS = {
  PROFILE: 'mi_keuangan_profile_v1',
  STUDENTS: 'mi_keuangan_students_v1',
  SYAHRIAH: 'mi_keuangan_syahriah_v1',
  ACCOUNTS: 'mi_keuangan_accounts_v1',
  TRANSACTIONS: 'mi_keuangan_transactions_v1',
  ADMIN_PWD: 'mi_keuangan_admin_pwd_v1',
  ADMIN_SESSION: 'mi_keuangan_admin_session_v1',
  ADMIN_AUTOLOCK: 'mi_keuangan_admin_autolock_v1',
  DELETED_TRX: 'mi_keuangan_deleted_trx_ids_v1',
  DELETED_SYAHRIAH: 'mi_keuangan_deleted_syahriah_ids_v1',
  PENDING_UPLOAD_TRX: 'mi_keuangan_pending_upload_trx_v1',
  PENDING_UPLOAD_SYAHRIAH: 'mi_keuangan_pending_upload_syahriah_v1',
};

// Helper untuk melacak ID yang telah dihapus atau menunggu upload offline
const getStoredIdSet = (key: string): Set<string> => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const addStoredId = (key: string, id: string) => {
  if (!id) return;
  const set = getStoredIdSet(key);
  set.add(id);
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
};

const removeStoredId = (key: string, id: string) => {
  if (!id) return;
  const set = getStoredIdSet(key);
  if (set.has(id)) {
    set.delete(id);
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(set)));
    } catch {}
  }
};

// Safe wrapper for fire-and-forget Supabase sync calls
const safeSupabase = (op: any) => {
  try {
    Promise.resolve(op).catch(() => {});
  } catch {
    // Ignore offline or uninitialized errors
  }
};

// Helper untuk menyeimbangkan saldo akun kas agar defisit mutasi non-transfer terserap wajar
export function balanceAccountDeficits(accounts: CashAccount[]): CashAccount[] {
  const allPositive = accounts.every((a) => a.balance >= 0);
  if (allPositive) {
    return accounts;
  }
  const result = accounts.map((a) => ({ ...a }));
  let deficit = 0;
  for (const acc of result) {
    if (acc.balance < 0) {
      deficit += Math.abs(acc.balance);
      acc.balance = 0;
    }
  }
  const richest = [...result].sort((a, b) => b.balance - a.balance)[0];
  if (richest && deficit > 0) {
    const target = result.find((a) => a.id === richest.id);
    if (target) {
      target.balance = Math.max(0, target.balance - deficit);
    }
  }
  return result;
}

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.headmasterName === 'H. Ahmad Muzakki, S.Pd.I') {
          parsed.headmasterName = 'MUIN, S.Pd.I';
        }
        if (parsed.treasurerName === 'Siti Maimunah, S.E.') {
          parsed.treasurerName = 'FATHURRAZAQ, S.Pd.I';
        }
        if (parsed.standardSyahriah === 40000 || !parsed.standardSyahriah) {
          parsed.standardSyahriah = 20000;
        }
        if (!parsed.targetInfaqPembangunan || parsed.targetInfaqPembangunan <= 0) {
          parsed.targetInfaqPembangunan = 500000;
        }
        return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_SCHOOL_PROFILE;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (saved) {
      try {
        const parsed: Student[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s) => {
            if (s.monthlySyahriah === 40000) {
              return { ...s, monthlySyahriah: 20000 };
            }
            return s;
          });
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_STUDENTS;
  });

  const [syahriahPayments, setSyahriahPayments] = useState<
    SyahriahPaymentRecord[]
  >(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SYAHRIAH);
    if (saved) {
      try {
        const parsed: SyahriahPaymentRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p) => ({
            ...p,
            accountId: resolvePaymentAccountId(p.accountId, p.paymentMethod),
          }));
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_SYAHRIAH_PAYMENTS;
  });

  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (saved) {
      try {
        const parsed: CashAccount[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((acc) => {
            // Normalisasi data rekening bank
            const isLegacyBri = acc.id === 'bank-bri';
            const id = isLegacyBri ? 'bank-bri-bos' : acc.id;
            const name = isLegacyBri ? 'BRI Rekening Khusus BOS' : acc.name;
            const bankName =
              acc.bankName ||
              (id === 'bank-bri-bos'
                ? 'Bank Rakyat Indonesia'
                : id === 'bank-bsi'
                ? 'Bank Syariah Indonesia'
                : 'Tunai / Cash on Hand');
            const accountNumber =
              acc.accountNumber ||
              (id === 'bank-bri-bos'
                ? '0129-01-002845-53-1'
                : id === 'bank-bsi'
                ? '7145829910'
                : undefined);

            return {
              ...acc,
              id,
              name,
              bankName,
              accountNumber,
              balance: Number(acc.balance || 0),
            };
          });
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_CASH_ACCOUNTS;
  });

  const [transactions, setTransactions] = useState<FinancialTransaction[]>(
    () => {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        try {
          const parsed: FinancialTransaction[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((t) => ({
              ...t,
              accountId: resolveTransactionAccountId(t.accountId, t.category),
            }));
          }
        } catch {
          // fallback
        }
      }
      return INITIAL_TRANSACTIONS;
    }
  );

  const [activeReceipt, setActiveReceipt] =
    useState<SyahriahPaymentRecord | null>(null);
  const [editingSyahriahPayment, setEditingSyahriahPayment] =
    useState<SyahriahPaymentRecord | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<FinancialTransaction | null>(null);

  // Live state refs untuk mencegah stale closures pada sync background & event listener
  const transactionsRef = React.useRef<FinancialTransaction[]>(transactions);
  const syahriahRef = React.useRef<SyahriahPaymentRecord[]>(syahriahPayments);
  const cashAccountsRef = React.useRef<CashAccount[]>(cashAccounts);
  const studentsRef = React.useRef<Student[]>(students);
  const schoolProfileRef = React.useRef<SchoolProfile>(schoolProfile);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    syahriahRef.current = syahriahPayments;
  }, [syahriahPayments]);

  useEffect(() => {
    cashAccountsRef.current = cashAccounts;
  }, [cashAccounts]);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    schoolProfileRef.current = schoolProfile;
  }, [schoolProfile]);

  // Admin & Security Mode State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
    } catch {
      return false;
    }
  });

  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTOLOCK);
      return saved ? parseInt(saved, 10) : 30; // default 30 menit
    } catch {
      return 30;
    }
  });

  const [adminPromptState, setAdminPromptState] = useState<AdminPromptState | null>(null);
  const lastAdminActivityRef = React.useRef<number>(Date.now());

  const [isDefaultPassword, setIsDefaultPassword] = useState<boolean>(() => {
    try {
      const savedHash = localStorage.getItem(STORAGE_KEYS.ADMIN_PWD);
      return !savedHash || savedHash === hashPassword(DEFAULT_ADMIN_PASSWORD);
    } catch {
      return true;
    }
  });

  const setAutoLockMinutes = (minutes: number) => {
    setAutoLockMinutesState(minutes);
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_AUTOLOCK, minutes.toString());
    } catch {}
  };

  const loginAdmin = (password: string): { success: boolean; message: string } => {
    try {
      const savedHash =
        localStorage.getItem(STORAGE_KEYS.ADMIN_PWD) ||
        hashPassword(DEFAULT_ADMIN_PASSWORD);
      if (hashPassword(password.trim()) === savedHash) {
        setIsAdmin(true);
        lastAdminActivityRef.current = Date.now();
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
        return { success: true, message: 'Autentikasi Mode Admin Berhasil!' };
      } else {
        return {
          success: false,
          message: 'Password salah! Periksa kembali password admin Anda.',
        };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal memproses autentikasi.' };
    }
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    } catch {}
  };

  const changeAdminPassword = (
    oldPassword: string,
    newPassword: string
  ): { success: boolean; message: string } => {
    try {
      const savedHash =
        localStorage.getItem(STORAGE_KEYS.ADMIN_PWD) ||
        hashPassword(DEFAULT_ADMIN_PASSWORD);
      if (hashPassword(oldPassword.trim()) !== savedHash) {
        return {
          success: false,
          message: 'Password lama tidak cocok! Mohon periksa kembali.',
        };
      }
      if (!newPassword || newPassword.trim().length < 4) {
        return {
          success: false,
          message: 'Password baru minimal harus 4 karakter.',
        };
      }
      const newHash = hashPassword(newPassword.trim());
      localStorage.setItem(STORAGE_KEYS.ADMIN_PWD, newHash);
      setIsDefaultPassword(newPassword.trim() === DEFAULT_ADMIN_PASSWORD);
      return { success: true, message: 'Password Admin berhasil diperbarui!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal menyimpan password baru.' };
    }
  };

  const requireAdmin = (action: () => void, actionDescription?: string): boolean => {
    lastAdminActivityRef.current = Date.now();
    if (isAdmin) {
      action();
      return true;
    }
    setAdminPromptState({
      isOpen: true,
      description: actionDescription || 'Otorisasi Transaksi Keuangan Bendahara',
      onSuccess: () => {
        action();
      },
    });
    return false;
  };

  const openAdminPrompt = (description?: string, onSuccess?: () => void) => {
    setAdminPromptState({
      isOpen: true,
      description: description || 'Masuk Mode Admin Bendahara',
      onSuccess,
    });
  };

  const closeAdminPrompt = () => {
    setAdminPromptState(null);
  };

  // Auto-lock timer effect untuk melindungi jika admin meninggalkan komputer
  useEffect(() => {
    if (!isAdmin || autoLockMinutes <= 0) return;

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastAdminActivityRef.current;
      if (idleTime >= autoLockMinutes * 60 * 1000) {
        logoutAdmin();
      }
    }, 20000);

    const handleUserActivity = () => {
      lastAdminActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
    };
  }, [isAdmin, autoLockMinutes]);

  // Realtime Cloud Auto-Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('syncing');
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  // Helper untuk sinkronisasi otomatis per-aksi (Mutation auto-sync)
  const syncWithCloud = async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCloudSyncStatus('offline');
      return null;
    }
    setCloudSyncStatus('syncing');
    try {
      const res = await operation();
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncErrorMessage(null);
      return res;
    } catch (err: any) {
      console.warn('Auto-sync notice:', err);
      setCloudSyncStatus('error');
      setSyncErrorMessage(err.message || String(err));
      return null;
    }
  };

  // Sinkronisasi Penuh Dua Arah (Bidirectional Auto-Sync Antar-Komputer)
  const forceFullSync = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCloudSyncStatus('offline');
      setIsInitialSyncing(false);
      return {
        success: false,
        message: 'Koneksi internet offline. Data tetap tersimpan aman di penyimpanan lokal.',
      };
    }

    setCloudSyncStatus('syncing');
    try {
      // 1. Bersihkan legacy 'bank-bri' dari Supabase jika ada
      safeSupabase(supabase.from('cash_accounts').delete().eq('id', 'bank-bri'));

      // 2. Sinkronkan Profil Madrasah
      try {
        const { data: cloudProfile } = await supabase
          .from('school_profile')
          .select('*')
          .eq('id', 'default')
          .maybeSingle();

        if (cloudProfile) {
          const mapped = mapDbToProfile(cloudProfile);
          setSchoolProfile(mapped);
          try {
            localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(mapped));
          } catch {}
        } else {
          await supabase.from('school_profile').upsert(mapProfileToDb(schoolProfile));
        }
      } catch (profErr) {
        console.warn('Profile sync note:', profErr);
      }

      // 3. Sinkronkan Akun Kas & Bank
      const { data: cloudAccounts, error: accErr } = await supabase
        .from('cash_accounts')
        .select('*');

      let currentAccounts = cashAccounts;
      if (!accErr && cloudAccounts && cloudAccounts.length > 0) {
        currentAccounts = cloudAccounts.map(mapDbToAccount);
      }

      // 4. Sinkronkan Data Siswa (Dua arah: Cloud + Lokal)
      const { data: cloudStudents, error: stdErr } = await supabase
        .from('students')
        .select('*')
        .range(0, 4999)
        .order('grade', { ascending: true })
        .order('name', { ascending: true });

      if (!stdErr && cloudStudents && cloudStudents.length > 0) {
        const mapped = cloudStudents.map(mapDbToStudent);
        const cloudIds = new Set(cloudStudents.map((s) => s.id));
        const missingInCloud = students.filter((s) => !cloudIds.has(s.id));
        if (missingInCloud.length > 0) {
          for (let i = 0; i < missingInCloud.length; i += 50) {
            await supabase
              .from('students')
              .upsert(missingInCloud.slice(i, i + 50).map(mapStudentToDb));
          }
        }
        const mergedStudents = [...mapped, ...missingInCloud];
        setStudents(mergedStudents);
        try {
          localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(mergedStudents));
        } catch {}
      } else if (students.length > 0) {
        for (let i = 0; i < students.length; i += 50) {
          await supabase
            .from('students')
            .upsert(students.slice(i, i + 50).map(mapStudentToDb));
        }
      }

      // 5. Sinkronkan Pembayaran Syahriah (Dua arah aman tanpa membangkitkan data terhapus)
      const deletedSyahIds = getStoredIdSet(STORAGE_KEYS.DELETED_SYAHRIAH);
      if (deletedSyahIds.size > 0) {
        const ids = Array.from(deletedSyahIds);
        for (let i = 0; i < ids.length; i += 50) {
          safeSupabase(
            supabase.from('syahriah_payments').delete().in('id', ids.slice(i, i + 50))
          );
        }
      }

      const { data: cloudSyahriah, error: syahErr } = await supabase
        .from('syahriah_payments')
        .select('*')
        .range(0, 4999)
        .order('payment_date', { ascending: false });

      let effectiveSyahriah = syahriahRef.current;
      if (!syahErr && cloudSyahriah) {
        const mappedCloud = cloudSyahriah
          .map(mapDbToSyahriah)
          .filter((p) => !deletedSyahIds.has(p.id));

        // Hanya unggah pembayaran yang berstatus pending upload offline
        const pendingSyah = getStoredIdSet(STORAGE_KEYS.PENDING_UPLOAD_SYAHRIAH);
        const offlinePending = syahriahRef.current.filter(
          (p) => pendingSyah.has(p.id) && !deletedSyahIds.has(p.id)
        );

        if (offlinePending.length > 0) {
          for (let i = 0; i < offlinePending.length; i += 50) {
            await supabase
              .from('syahriah_payments')
              .upsert(offlinePending.slice(i, i + 50).map(mapSyahriahToDb));
          }
          offlinePending.forEach((p) =>
            removeStoredId(STORAGE_KEYS.PENDING_UPLOAD_SYAHRIAH, p.id)
          );
        }

        effectiveSyahriah = [...mappedCloud, ...offlinePending];
        setSyahriahPayments(effectiveSyahriah);
        try {
          localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify(effectiveSyahriah));
        } catch {}
      }

      // 6. Sinkronkan Transaksi Keuangan BKU (Dua arah aman tanpa membangkitkan data terhapus)
      const deletedTrxIds = getStoredIdSet(STORAGE_KEYS.DELETED_TRX);
      if (deletedTrxIds.size > 0) {
        const ids = Array.from(deletedTrxIds);
        for (let i = 0; i < ids.length; i += 50) {
          safeSupabase(
            supabase.from('financial_transactions').delete().in('id', ids.slice(i, i + 50))
          );
        }
      }

      const { data: cloudTransactions, error: trxErr } = await supabase
        .from('financial_transactions')
        .select('*')
        .range(0, 4999)
        .order('date', { ascending: false });

      let effectiveTransactions = transactionsRef.current;
      if (!trxErr && cloudTransactions) {
        const mappedCloud = cloudTransactions
          .map(mapDbToTransaction)
          .filter((t) => !deletedTrxIds.has(t.id));

        // Hanya unggah transaksi yang berstatus pending upload offline
        const pendingTrx = getStoredIdSet(STORAGE_KEYS.PENDING_UPLOAD_TRX);
        const offlinePending = transactionsRef.current.filter(
          (t) => pendingTrx.has(t.id) && !deletedTrxIds.has(t.id)
        );

        if (offlinePending.length > 0) {
          for (let i = 0; i < offlinePending.length; i += 50) {
            await supabase
              .from('financial_transactions')
              .upsert(offlinePending.slice(i, i + 50).map(mapTransactionToDb));
          }
          offlinePending.forEach((t) =>
            removeStoredId(STORAGE_KEYS.PENDING_UPLOAD_TRX, t.id)
          );
        }

        effectiveTransactions = [...mappedCloud, ...offlinePending];
        setTransactions(effectiveTransactions);
        try {
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(effectiveTransactions));
        } catch {}
      }

      // 7. Otomatis selaraskan saldo kas setiap akun agar tidak 0 dan 100% klop dengan transaksi BKU
      const rawAccounts = currentAccounts.map((acc) => {
        const syIn = effectiveSyahriah
          .filter((p) => resolvePaymentAccountId(p.accountId, p.paymentMethod) === acc.id)
          .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

        const tIn = effectiveTransactions
          .filter((t) => resolveTransactionAccountId(t.accountId, t.category) === acc.id && t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const tOut = effectiveTransactions
          .filter((t) => resolveTransactionAccountId(t.accountId, t.category) === acc.id && t.type === 'EXPENSE')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
          ...acc,
          balance: syIn + tIn - tOut,
        };
      });

      const balancedAccounts = balanceAccountDeficits(rawAccounts);
      setCashAccounts(balancedAccounts);
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(balancedAccounts));
      } catch {}

      // Sinkronkan saldo terkoreksi kembali ke Supabase Cloud
      await supabase.from('cash_accounts').upsert(balancedAccounts.map(mapAccountToDb));

      const now = new Date();
      setCloudSyncStatus('synced');
      setLastSyncedAt(now);
      setSyncErrorMessage(null);

      return {
        success: true,
        message: `Data keuangan 100% online & tersinkron pada ${now.toLocaleTimeString('id-ID')} (${effectiveTransactions.length} transaksi BKU, ${effectiveSyahriah.length} pembayaran syahriah).`,
      };
    } catch (err: any) {
      console.warn('Sync error details:', err);
      setCloudSyncStatus('error');
      setSyncErrorMessage(err.message || String(err));
      return {
        success: false,
        message: `Gagal sinkronisasi otomatis: ${err.message || String(err)}`,
      };
    } finally {
      setIsInitialSyncing(false);
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(schoolProfile));
  }, [schoolProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify(syahriahPayments));
  }, [syahriahPayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(cashAccounts));
  }, [cashAccounts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  // Ref untuk forceFullSync agar background timers & listener selalu memanggil fungsi terkini
  const forceFullSyncRef = React.useRef(forceFullSync);
  useEffect(() => {
    forceFullSyncRef.current = forceFullSync;
  });

  // Otomatis sinkronisasi saat aplikasi dibuka & event listener online/offline & periodic polling
  useEffect(() => {
    let isMounted = true;

    const runBootSync = async () => {
      try {
        await forceFullSyncRef.current();
      } catch (err) {
        console.warn('Boot auto-sync note:', err);
      } finally {
        if (isMounted) {
          setIsInitialSyncing(false);
        }
      }
    };

    // Jalankan sinkronisasi cloud SEGERA saat aplikasi dimuat
    runBootSync();

    const handleOnline = () => {
      setCloudSyncStatus('syncing');
      runBootSync();
    };

    const handleOffline = () => {
      setCloudSyncStatus('offline');
    };

    // Sinkronisasi otomatis saat tab/jendela kembali aktif (Multi-komputer sync)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        forceFullSyncRef.current();
      }
    };

    // Polling background setiap 20 detik agar data dari komputer lain otomatis ditarik
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        forceFullSyncRef.current();
      }
    }, 20000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  // Supabase Realtime Subscription Listener (Multi-tab / Multi-device realtime updates)
  useEffect(() => {
    let isMounted = true;

    const channel = supabase
      .channel('mi-sobo-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'school_profile' },
        (payload) => {
          if (!isMounted) return;
          if (payload.new && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
            setSchoolProfile(mapDbToProfile(payload.new));
            setLastSyncedAt(new Date());
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const newStudent = mapDbToStudent(payload.new);
            setStudents((prev) => {
              if (prev.some((s) => s.id === newStudent.id)) return prev;
              return [...prev, newStudent];
            });
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToStudent(payload.new);
            setStudents((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            );
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setStudents((prev) => prev.filter((s) => s.id !== deletedId));
              setLastSyncedAt(new Date());
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_accounts' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const newAcc = mapDbToAccount(payload.new);
            setCashAccounts((prev) => {
              if (prev.some((a) => a.id === newAcc.id)) return prev;
              return [...prev, newAcc];
            });
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToAccount(payload.new);
            setCashAccounts((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            );
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setCashAccounts((prev) => prev.filter((a) => a.id !== deletedId));
              setLastSyncedAt(new Date());
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'syahriah_payments' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const newPayment = mapDbToSyahriah(payload.new);
            const deletedSyah = getStoredIdSet(STORAGE_KEYS.DELETED_SYAHRIAH);
            if (deletedSyah.has(newPayment.id)) {
              safeSupabase(supabase.from('syahriah_payments').delete().eq('id', newPayment.id));
              return;
            }
            setSyahriahPayments((prev) => {
              if (prev.some((p) => p.id === newPayment.id)) return prev;
              return [newPayment, ...prev];
            });
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToSyahriah(payload.new);
            const deletedSyah = getStoredIdSet(STORAGE_KEYS.DELETED_SYAHRIAH);
            if (deletedSyah.has(updated.id)) return;
            setSyahriahPayments((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
            setActiveReceipt((curr) => (curr?.id === updated.id ? updated : curr));
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              addStoredId(STORAGE_KEYS.DELETED_SYAHRIAH, deletedId);
              removeStoredId(STORAGE_KEYS.PENDING_UPLOAD_SYAHRIAH, deletedId);
              setSyahriahPayments((prev) => prev.filter((p) => p.id !== deletedId));
              setLastSyncedAt(new Date());
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_transactions' },
        (payload) => {
          if (!isMounted) return;
          if (payload.eventType === 'INSERT') {
            const newTrx = mapDbToTransaction(payload.new);
            const deletedTrx = getStoredIdSet(STORAGE_KEYS.DELETED_TRX);
            if (deletedTrx.has(newTrx.id)) {
              safeSupabase(supabase.from('financial_transactions').delete().eq('id', newTrx.id));
              return;
            }
            setTransactions((prev) => {
              if (prev.some((t) => t.id === newTrx.id)) return prev;
              return [newTrx, ...prev];
            });
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToTransaction(payload.new);
            const deletedTrx = getStoredIdSet(STORAGE_KEYS.DELETED_TRX);
            if (deletedTrx.has(updated.id)) return;
            setTransactions((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              addStoredId(STORAGE_KEYS.DELETED_TRX, deletedId);
              removeStoredId(STORAGE_KEYS.PENDING_UPLOAD_TRX, deletedId);
              setTransactions((prev) => prev.filter((t) => t.id !== deletedId));
              setLastSyncedAt(new Date());
            }
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Otomatis sinkronisasi akun bank bawaan ke Supabase jika terhubung
  useEffect(() => {
    const autoSyncTimer = setTimeout(async () => {
      try {
        await supabase.from('cash_accounts').delete().eq('id', 'bank-bri');
        const { data: cloudAccs, error: accErr } = await supabase
          .from('cash_accounts')
          .select('id, name, bank_name, balance');

        if (!accErr) {
          const hasBriBos = cloudAccs?.some((a) => a.id === 'bank-bri-bos');
          if (!hasBriBos || (cloudAccs && cloudAccs.length < cashAccounts.length)) {
            await supabase
              .from('cash_accounts')
              .upsert(cashAccounts.map(mapAccountToDb));
          }
        }
      } catch {
        // Safe fail jika belum ada koneksi
      }
    }, 1500);

    return () => clearTimeout(autoSyncTimer);
  }, []);

  // Actions dengan Sinkronisasi Otomatis ke Supabase Cloud
  const updateSchoolProfile = (profile: SchoolProfile) => {
    setSchoolProfile(profile);
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch {}

    syncWithCloud(async () => {
      const payload = mapProfileToDb(profile);
      const { error } = await supabase
        .from('school_profile')
        .upsert(payload);

      if (error) {
        // Jika kolom target_infaq_pembangunan belum dibuat di cloud Supabase, coba tanpa kolom tersebut
        if (error.message && error.message.toLowerCase().includes('target_infaq_pembangunan')) {
          const { target_infaq_pembangunan, ...restPayload } = payload as any;
          const { error: retryErr } = await supabase
            .from('school_profile')
            .upsert(restPayload);
          if (retryErr) throw retryErr;
        } else {
          throw error;
        }
      }
    });
  };

  const addStudent = (studentData: Omit<Student, 'id'>): Student => {
    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`,
    };
    setStudents((prev) => [...prev, newStudent]);

    syncWithCloud(async () => {
      const { error } = await supabase
        .from('students')
        .upsert(mapStudentToDb(newStudent));
      if (error) throw error;
    });

    return newStudent;
  };

  const updateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );

    syncWithCloud(async () => {
      const { error } = await supabase
        .from('students')
        .upsert(mapStudentToDb(updatedStudent));
      if (error) throw error;
    });
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));

    syncWithCloud(async () => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    });
  };

  const clearAllStudents = (gradeFilter?: number | 'ALL') => {
    if (!gradeFilter || gradeFilter === 'ALL') {
      setStudents([]);
      setSyahriahPayments([]);
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify([]));

      syncWithCloud(async () => {
        await supabase.from('students').delete().neq('id', 'keep-none');
        await supabase.from('syahriah_payments').delete().neq('id', 'keep-none');
      });
    } else {
      setStudents((prev) => {
        const remaining = prev.filter((s) => s.grade !== gradeFilter);
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(remaining));
        return remaining;
      });
      setSyahriahPayments((prev) => {
        const remaining = prev.filter((p) => p.grade !== gradeFilter);
        localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify(remaining));
        return remaining;
      });

      syncWithCloud(async () => {
        await supabase.from('students').delete().eq('grade', gradeFilter);
        await supabase.from('syahriah_payments').delete().eq('grade', gradeFilter);
      });
    }
  };

  const bulkImportStudents = (
    newStudents: Omit<Student, 'id'>[],
    strategy: 'UPSERT' | 'SKIP_EXISTING' = 'UPSERT'
  ) => {
    let addedCount = 0;
    let updatedCount = 0;
    let importedListToSync: Student[] = [];

    setStudents((prev) => {
      const nextList = [...prev];
      const existingMapByNis = new Map<string, number>();
      nextList.forEach((st, idx) => {
        if (st.nis) {
          existingMapByNis.set(st.nis.trim(), idx);
        }
      });

      newStudents.forEach((stData, index) => {
        const cleanNis = stData.nis ? stData.nis.trim() : '';
        const existingIdx = cleanNis ? existingMapByNis.get(cleanNis) : undefined;

        if (existingIdx !== undefined) {
          if (strategy === 'UPSERT') {
            const existingId = nextList[existingIdx].id;
            nextList[existingIdx] = {
              ...stData,
              id: existingId,
            };
            updatedCount++;
          }
        } else {
          const newId = `std-imp-${Date.now()}-${index}`;
          const newStudent: Student = {
            ...stData,
            id: newId,
          };
          nextList.push(newStudent);
          if (cleanNis) {
            existingMapByNis.set(cleanNis, nextList.length - 1);
          }
          addedCount++;
        }
      });

      importedListToSync = nextList;
      return nextList;
    });

    // Otomatis sinkronkan seluruh hasil import ke Supabase dalam batch
    syncWithCloud(async () => {
      if (importedListToSync.length > 0) {
        for (let i = 0; i < importedListToSync.length; i += 50) {
          const chunk = importedListToSync.slice(i, i + 50);
          const { error } = await supabase
            .from('students')
            .upsert(chunk.map(mapStudentToDb));
          if (error) throw error;
        }
      }
    });

    return {
      added: addedCount,
      updated: updatedCount,
      total: newStudents.length,
    };
  };

  const recordSyahriahPayment = (
    paymentData: Omit<SyahriahPaymentRecord, 'id' | 'receiptNo' | 'createdAt'>
  ): SyahriahPaymentRecord => {
    const count = syahriahPayments.length + 1;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(count).padStart(3, '0');
    const receiptNo = `KW-SYH/${year}/${month}/${seq}`;

    const newPayment: SyahriahPaymentRecord = {
      ...paymentData,
      id: `syah-${Date.now()}`,
      receiptNo,
      createdAt: now.toISOString(),
    };

    setSyahriahPayments((prev) => [newPayment, ...prev]);

    let updatedAccounts: CashAccount[] = [];
    setCashAccounts((prev) => {
      updatedAccounts = prev.map((acc) =>
        acc.id === paymentData.accountId
          ? { ...acc, balance: acc.balance + paymentData.totalAmount }
          : acc
      );
      return updatedAccounts;
    });

    // Otomatis sinkronkan pembayaran dan perubahan saldo ke Supabase
    syncWithCloud(async () => {
      const { error: payErr } = await supabase
        .from('syahriah_payments')
        .insert(mapSyahriahToDb(newPayment));
      if (payErr) throw payErr;
      if (updatedAccounts.length > 0) {
        const { error: accErr } = await supabase
          .from('cash_accounts')
          .upsert(updatedAccounts.map(mapAccountToDb));
        if (accErr) throw accErr;
      }
    });

    return newPayment;
  };

  const updateSyahriahPayment = (updatedPayment: SyahriahPaymentRecord) => {
    // 1. Cari data lama dan perbarui daftar pembayaran syahriah
    let oldPayment: SyahriahPaymentRecord | undefined;

    setSyahriahPayments((prev) => {
      oldPayment = prev.find(
        (p) => String(p.id).trim() === String(updatedPayment.id).trim()
      );

      const exists = !!oldPayment;
      const nextList = exists
        ? prev.map((p) =>
            String(p.id).trim() === String(updatedPayment.id).trim()
              ? updatedPayment
              : p
          )
        : [updatedPayment, ...prev];

      try {
        localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify(nextList));
      } catch {}

      return nextList;
    });

    // Fallback jika oldPayment tidak ditemukan di state lama
    const effectiveOldPayment = oldPayment || updatedPayment;

    // 2. Sesuaikan saldo akun kas / bank penerima
    let accountsToSync: CashAccount[] = [];
    setCashAccounts((prev) => {
      let nextAccounts = [...prev];

      if (effectiveOldPayment.accountId === updatedPayment.accountId) {
        // Akun sama: cukup sesuaikan selisih nominal
        const diff = updatedPayment.totalAmount - effectiveOldPayment.totalAmount;
        if (diff !== 0) {
          nextAccounts = nextAccounts.map((acc) =>
            acc.id === updatedPayment.accountId
              ? { ...acc, balance: Math.max(0, acc.balance + diff) }
              : acc
          );
        }
      } else {
        // Akun berbeda: kurangi akun lama, tambahkan ke akun baru
        nextAccounts = nextAccounts.map((acc) => {
          if (acc.id === effectiveOldPayment.accountId) {
            return {
              ...acc,
              balance: Math.max(0, acc.balance - effectiveOldPayment.totalAmount),
            };
          }
          if (acc.id === updatedPayment.accountId) {
            return {
              ...acc,
              balance: acc.balance + updatedPayment.totalAmount,
            };
          }
          return acc;
        });
      }

      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(nextAccounts));
      } catch {}

      accountsToSync = nextAccounts.filter(
        (a) =>
          a.id === effectiveOldPayment.accountId ||
          a.id === updatedPayment.accountId
      );
      return nextAccounts;
    });

    // 3. Perbarui activeReceipt jika sedang terbuka
    setActiveReceipt((curr) =>
      curr?.id === updatedPayment.id ? updatedPayment : curr
    );

    // 4. Sinkronkan pembaruan data dan perubahan saldo kas ke Supabase Cloud
    syncWithCloud(async () => {
      const { error: payErr } = await supabase
        .from('syahriah_payments')
        .upsert(mapSyahriahToDb(updatedPayment));
      if (payErr) {
        console.warn('Gagal sinkron syahriah_payments:', payErr);
      }

      if (accountsToSync.length > 0) {
        const { error: accErr } = await supabase
          .from('cash_accounts')
          .upsert(accountsToSync.map(mapAccountToDb));
        if (accErr) {
          console.warn('Gagal sinkron cash_accounts:', accErr);
        }
      }
    });
  };

  const deleteSyahriahPayment = (id: string) => {
    const cleanId = String(id).trim();
    addStoredId(STORAGE_KEYS.DELETED_SYAHRIAH, cleanId);
    removeStoredId(STORAGE_KEYS.PENDING_UPLOAD_SYAHRIAH, cleanId);

    // Cari data pembayaran dari ref atau state
    const payment =
      syahriahRef.current.find((p) => String(p.id).trim() === cleanId) ||
      syahriahPayments.find((p) => String(p.id).trim() === cleanId);

    let updatedAccounts: CashAccount[] = [];
    if (payment && payment.accountId && payment.totalAmount > 0) {
      setCashAccounts((prev) => {
        updatedAccounts = prev.map((acc) =>
          acc.id === payment.accountId
            ? { ...acc, balance: Math.max(0, acc.balance - payment.totalAmount) }
            : acc
        );
        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
        } catch {}
        return updatedAccounts;
      });
    }

    // Pastikan selalu terhapus dari state dan localStorage tanpa memandang apakah payment objek ditemukan
    const nextList = (syahriahRef.current.length > 0 ? syahriahRef.current : syahriahPayments).filter(
      (p) => String(p.id).trim() !== cleanId
    );
    syahriahRef.current = nextList;
    setSyahriahPayments(nextList);
    try {
      localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify(nextList));
    } catch {}

    // Tutup modal edit atau modal kwitansi jika sedang menampilkan transaksi ini
    setActiveReceipt((curr) => (curr && String(curr.id).trim() === cleanId ? null : curr));
    setEditingSyahriahPayment((curr) => (curr && String(curr.id).trim() === cleanId ? null : curr));

    syncWithCloud(async () => {
      try {
        const { error: payErr } = await supabase
          .from('syahriah_payments')
          .delete()
          .eq('id', cleanId);
        if (payErr) {
          console.warn('Sync delete syahriah notice:', payErr);
        }
      } catch (e) {
        console.warn('Gagal sinkron delete syahriah ke Supabase:', e);
      }

      if (updatedAccounts.length > 0) {
        try {
          await supabase
            .from('cash_accounts')
            .upsert(updatedAccounts.map(mapAccountToDb));
        } catch (e) {
          console.warn('Gagal sinkron cash_accounts update ke Supabase:', e);
        }
      }
    });
  };

  const addTransaction = (
    trxData: Omit<FinancialTransaction, 'id' | 'refNo' | 'createdAt'>
  ): FinancialTransaction => {
    const count = transactions.length + 1;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(count).padStart(3, '0');
    const prefix = trxData.type === 'INCOME' ? 'KM' : 'KK';
    const refNo = `${prefix}-${trxData.category.slice(0, 3)}/${year}/${month}/${seq}`;

    const newTrx: FinancialTransaction = {
      ...trxData,
      id: `trx-${Date.now()}`,
      refNo,
      createdAt: now.toISOString(),
    };

    addStoredId(STORAGE_KEYS.PENDING_UPLOAD_TRX, newTrx.id);

    const nextTrxs = [newTrx, ...transactions];
    setTransactions(nextTrxs);
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTrxs));
    } catch {}

    let updatedAccounts: CashAccount[] = [];
    setCashAccounts((prev) => {
      updatedAccounts = prev.map((acc) => {
        if (acc.id === trxData.accountId) {
          const newBalance =
            trxData.type === 'INCOME'
              ? acc.balance + trxData.amount
              : acc.balance - trxData.amount;
          return { ...acc, balance: newBalance };
        }
        return acc;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
      } catch {}
      return updatedAccounts;
    });

    // Otomatis sinkronkan transaksi dan perubahan saldo ke Supabase
    syncWithCloud(async () => {
      const { error: trxErr } = await supabase
        .from('financial_transactions')
        .insert(mapTransactionToDb(newTrx));
      if (trxErr) throw trxErr;
      removeStoredId(STORAGE_KEYS.PENDING_UPLOAD_TRX, newTrx.id);
      if (updatedAccounts.length > 0) {
        const { error: accErr } = await supabase
          .from('cash_accounts')
          .upsert(updatedAccounts.map(mapAccountToDb));
        if (accErr) throw accErr;
      }
    });

    return newTrx;
  };

  const updateTransaction = (updatedTrx: FinancialTransaction) => {
    const currentTrxs = transactionsRef.current;
    const oldTrx = currentTrxs.find((t) => t.id === updatedTrx.id);
    if (!oldTrx) return;

    let updatedAccounts: CashAccount[] = [];
    setCashAccounts((prev) => {
      let accounts = [...prev];

      // 1. Pulihkan efek saldo akun lama
      accounts = accounts.map((acc) => {
        if (acc.id === oldTrx.accountId) {
          const reverted =
            oldTrx.type === 'INCOME'
              ? acc.balance - oldTrx.amount
              : acc.balance + oldTrx.amount;
          return { ...acc, balance: Math.max(0, reverted) };
        }
        return acc;
      });

      // 2. Terapkan efek saldo akun baru
      accounts = accounts.map((acc) => {
        if (acc.id === updatedTrx.accountId) {
          const applied =
            updatedTrx.type === 'INCOME'
              ? acc.balance + updatedTrx.amount
              : acc.balance - updatedTrx.amount;
          return { ...acc, balance: Math.max(0, applied) };
        }
        return acc;
      });

      updatedAccounts = accounts.filter(
        (a) => a.id === oldTrx.accountId || a.id === updatedTrx.accountId
      );
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
      } catch {}
      return accounts;
    });

    const nextTrxs = currentTrxs.map((t) => (t.id === updatedTrx.id ? updatedTrx : t));
    setTransactions(nextTrxs);
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTrxs));
    } catch {}

    // Auto-sync pembaruan transaksi dan saldo ke Supabase
    syncWithCloud(async () => {
      const { error: trxErr } = await supabase
        .from('financial_transactions')
        .upsert(mapTransactionToDb(updatedTrx));
      if (trxErr) throw trxErr;
      if (updatedAccounts.length > 0) {
        const { error: accErr } = await supabase
          .from('cash_accounts')
          .upsert(updatedAccounts.map(mapAccountToDb));
        if (accErr) throw accErr;
      }
    });
  };

  const deleteTransaction = (id: string) => {
    addStoredId(STORAGE_KEYS.DELETED_TRX, id);
    removeStoredId(STORAGE_KEYS.PENDING_UPLOAD_TRX, id);

    const currentTrxs = transactionsRef.current;
    const trx = currentTrxs.find((t) => t.id === id);
    if (!trx) return;

    let updatedAccounts: CashAccount[] = [];
    setCashAccounts((prev) => {
      updatedAccounts = prev.map((acc) => {
        if (acc.id === trx.accountId) {
          const revertedBalance =
            trx.type === 'INCOME'
              ? Math.max(0, acc.balance - trx.amount)
              : acc.balance + trx.amount;
          return { ...acc, balance: revertedBalance };
        }
        return acc;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
      } catch {}
      return updatedAccounts;
    });

    const nextTrxs = currentTrxs.filter((t) => t.id !== id);
    setTransactions(nextTrxs);
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(nextTrxs));
    } catch {}

    syncWithCloud(async () => {
      const { error: trxErr } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);
      if (trxErr) throw trxErr;
      if (updatedAccounts.length > 0) {
        await supabase
          .from('cash_accounts')
          .upsert(updatedAccounts.map(mapAccountToDb));
      }
    });
  };

  const transferCash = (
    fromId: string,
    toId: string,
    amount: number,
    description: string
  ) => {
    if (fromId === toId || amount <= 0) return;

    const fromAcc = cashAccounts.find((a) => a.id === fromId)?.name || fromId;
    const toAcc = cashAccounts.find((a) => a.id === toId)?.name || toId;

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const transferRecordId = `trf-${Date.now()}`;
    const trfData = {
      id: transferRecordId,
      date: today,
      from_account_id: fromId,
      to_account_id: toId,
      amount,
      description,
      recorded_by: schoolProfile.treasurerName,
      created_at: new Date().toISOString(),
    };

    // Sinkronkan catatan mutasi transfer ke cloud
    syncWithCloud(async () => {
      await supabase.from('cash_transfers').insert(trfData);
    });

    // Catat mutasi kas keluar dari akun asal (addTransaction otomatis memotong saldo akun asal & sync cloud)
    addTransaction({
      date: today,
      type: 'EXPENSE',
      category: 'MUTASI_KAS_KELUAR',
      categoryLabel: `Pindah Kas (${fromAcc} ke ${toAcc})`,
      amount,
      accountId: fromId,
      payerOrPayee: toAcc,
      description: `Mutasi Kas keluar: ${description}`,
      recordedBy: schoolProfile.treasurerName,
    });

    // Catat mutasi kas masuk ke akun tujuan (addTransaction otomatis menambah saldo akun tujuan & sync cloud)
    addTransaction({
      date: today,
      type: 'INCOME',
      category: 'MUTASI_KAS_MASUK',
      categoryLabel: `Pindah Kas (${fromAcc} ke ${toAcc})`,
      amount,
      accountId: toId,
      payerOrPayee: fromAcc,
      description: `Mutasi Kas masuk: ${description}`,
      recordedBy: schoolProfile.treasurerName,
    });
  };

  const mutateMadrasahToPembangunan = (params: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    date: string;
    description: string;
    refNo?: string;
  }) => {
    const { fromAccountId, toAccountId, amount, date, description, refNo } = params;
    if (amount <= 0) return;

    const fromAcc = cashAccounts.find((a) => a.id === fromAccountId)?.name || 'Kas Madrasah Umum';
    const toAcc = cashAccounts.find((a) => a.id === toAccountId)?.name || 'Kas Pembangunan';

    const now = new Date();
    const timeSuffix = Date.now().toString().slice(-4);
    const baNo = refNo || `BA-MUT/MAD-BG/${now.getFullYear()}/${timeSuffix}`;

    // 1. Catat Pengeluaran dari Kas Madrasah Umum (alokasi subsidi)
    addTransaction({
      date: date || now.toISOString().split('T')[0],
      type: 'EXPENSE',
      category: 'MUTASI_SUBSIDI_MADRASAH_KELUAR',
      categoryLabel: `Subsidi Kas Madrasah (${fromAcc} ke ${toAcc})`,
      amount,
      accountId: fromAccountId,
      payerOrPayee: `Kas Dana Pembangunan (${toAcc})`,
      description: `[Mutasi Kas Keluar] Subsidi Kas Madrasah ke Pembangunan: ${description}`,
      proofDocumentNo: baNo,
      recordedBy: schoolProfile.treasurerName,
      isPembangunan: false,
    });

    // 2. Catat Pemasukan ke Kas Pembangunan (penerimaan subsidi)
    addTransaction({
      date: date || now.toISOString().split('T')[0],
      type: 'INCOME',
      category: 'MUTASI_SUBSIDI_MADRASAH',
      categoryLabel: 'Mutasi / Subsidi dari Kas Madrasah Umum',
      amount,
      accountId: toAccountId,
      payerOrPayee: `Kas Umum Madrasah (${fromAcc})`,
      description: `[Mutasi Kas Masuk] Subsidi dari Kas Umum Madrasah: ${description}`,
      proofDocumentNo: baNo,
      recordedBy: schoolProfile.treasurerName,
      isPembangunan: true,
    });
  };

  // CRUD Akun Kas & Rekening Bank
  const updateCashAccount = (updatedAcc: CashAccount) => {
    setCashAccounts((prev) => {
      const next = prev.map((a) => (a.id === updatedAcc.id ? updatedAcc : a));
      return next;
    });

    syncWithCloud(async () => {
      const { error } = await supabase
        .from('cash_accounts')
        .upsert(mapAccountToDb(updatedAcc));
      if (error) throw error;
    });
  };

  const addCashAccount = (
    accountData: Omit<CashAccount, 'id'>
  ): CashAccount => {
    const newAcc: CashAccount = {
      ...accountData,
      id: `acc-${Date.now()}`,
    };
    setCashAccounts((prev) => {
      const next = [...prev, newAcc];
      return next;
    });

    syncWithCloud(async () => {
      const { error } = await supabase
        .from('cash_accounts')
        .upsert(mapAccountToDb(newAcc));
      if (error) throw error;
    });

    return newAcc;
  };

  const deleteCashAccount = (id: string) => {
    setCashAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      return next;
    });

    syncWithCloud(async () => {
      const { error } = await supabase
        .from('cash_accounts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    });
  };

  // Sinkronisasi Manual Data Rekening & Keuangan Bawaan ke Supabase
  const syncFinancialsWithCloud = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      // 1. Bersihkan legacy 'bank-bri' dari Supabase
      await supabase.from('cash_accounts').delete().eq('id', 'bank-bri');

      // 2. Upload School Profile
      const { error: profErr } = await supabase
        .from('school_profile')
        .upsert(mapProfileToDb(schoolProfile));
      if (profErr) throw new Error(`Profil Madrasah: ${profErr.message}`);

      // 3. Upload Akun Kas & Rekening Bank (Beserta Nama Bank Lengkap & Saldo Riil)
      const { error: accErr } = await supabase
        .from('cash_accounts')
        .upsert(cashAccounts.map(mapAccountToDb));
      if (accErr) throw new Error(`Akun Kas & Bank: ${accErr.message}`);

      // 4. Upload Transaksi Keuangan Bawaan (BKU)
      if (transactions.length > 0) {
        const { error: trxErr } = await supabase
          .from('financial_transactions')
          .upsert(transactions.map(mapTransactionToDb));
        if (trxErr) throw new Error(`Transaksi BKU: ${trxErr.message}`);
      }

      return {
        success: true,
        message: `Berhasil sinkronisasi nama bank, rekening kas (${cashAccounts.length} akun), dan seluruh data keuangan bawaan (${transactions.length} transaksi) ke database Supabase.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal sinkronisasi ke Supabase: ${err.message || String(err)}`,
      };
    }
  };

  // Kosongkan Seluruh Data Keuangan (Transaksi BKU, Riwayat Syahriah, dan Reset Saldo Kas ke 0)
  const clearAllFinancialData = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      // 1. Reset state lokal
      setTransactions([]);
      setSyahriahPayments([]);
      const zeroedAccounts = cashAccounts.map((acc) => ({
        ...acc,
        balance: 0,
      }));
      setCashAccounts(zeroedAccounts);

      // 2. Bersihkan localStorage
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(zeroedAccounts));
      localStorage.removeItem(STORAGE_KEYS.DELETED_TRX);
      localStorage.removeItem(STORAGE_KEYS.DELETED_SYAHRIAH);
      localStorage.removeItem(STORAGE_KEYS.PENDING_UPLOAD_TRX);
      localStorage.removeItem(STORAGE_KEYS.PENDING_UPLOAD_SYAHRIAH);

      // 3. Bersihkan cloud database Supabase jika terhubung
      await safeSupabase(
        supabase.from('financial_transactions').delete().neq('id', 'dummy-never-delete')
      );
      await safeSupabase(
        supabase.from('syahriah_payments').delete().neq('id', 'dummy-never-delete')
      );
      await safeSupabase(
        supabase.from('cash_transfers').delete().neq('id', 'dummy-never-delete')
      );
      if (zeroedAccounts.length > 0) {
        await safeSupabase(
          supabase.from('cash_accounts').upsert(zeroedAccounts.map(mapAccountToDb))
        );
      }

      return {
        success: true,
        message:
          'Seluruh data keuangan (Buku Kas Umum, Pembayaran Syahriah, dan Saldo Rekening) berhasil dikosongkan secara lokal dan di Cloud Supabase.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Gagal mengosongkan data cloud: ${err.message || String(err)}`,
      };
    }
  };

  // Helper functions
  const getStudentPaidMonths = (studentId: string): AcademicMonth[] => {
    const studentPayments = syahriahPayments.filter(
      (p) => p.studentId === studentId
    );
    const paidSet = new Set<AcademicMonth>();
    studentPayments.forEach((p) => {
      p.months.forEach((m) => paidSet.add(m));
    });
    return Array.from(paidSet);
  };

  const isMonthPaid = (studentId: string, month: AcademicMonth): boolean => {
    const student = students.find((s) => s.id === studentId);
    if (student?.isExempt) return true; // Siswa beasiswa/yatim dianggap tuntas
    return getStudentPaidMonths(studentId).includes(month);
  };

  // Aggregations
  const totalCashBalance = useMemo(() => {
    return cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  }, [cashAccounts]);

  const totalSyahriahIncome = useMemo(() => {
    return syahriahPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  }, [syahriahPayments]);

  const totalOtherIncome = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'INCOME' && !t.category.startsWith('MUTASI_'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalIncomeOverall = useMemo(() => {
    return totalSyahriahIncome + totalOtherIncome;
  }, [totalSyahriahIncome, totalOtherIncome]);

  const totalExpenseOverall = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'EXPENSE' && !t.category.startsWith('MUTASI_'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Arus kas bersih berdasarkan seluruh transaksi operasional riil (Penerimaan - Pengeluaran)
  const netIncomeOverall = useMemo(() => {
    return totalIncomeOverall - totalExpenseOverall;
  }, [totalIncomeOverall, totalExpenseOverall]);

  // Selisih antara akumulasi saldo akun kas saat ini dengan arus kas bersih BKU
  const cashDiscrepancy = useMemo(() => {
    return totalCashBalance - netIncomeOverall;
  }, [totalCashBalance, netIncomeOverall]);

  // Rincian audit dan rekonsiliasi kas per akun
  const cashReconciliationDetails = useMemo(() => {
    return cashAccounts.map((acc) => {
      // 1. Penerimaan Syahriah ke akun ini (dengan normalisasi accountId)
      const syahriahIn = syahriahPayments
        .filter((p) => resolvePaymentAccountId(p.accountId, p.paymentMethod) === acc.id)
        .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

      // 2. Transaksi BKU Masuk ke akun ini (termasuk mutasi kas masuk)
      const trxIn = transactions
        .filter((t) => resolveTransactionAccountId(t.accountId, t.category) === acc.id && t.type === 'INCOME')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // 3. Transaksi BKU Keluar dari akun ini (termasuk mutasi kas keluar)
      const trxOut = transactions
        .filter((t) => resolveTransactionAccountId(t.accountId, t.category) === acc.id && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const computedBalance = syahriahIn + trxIn - trxOut;
      const discrepancy = acc.balance - computedBalance;

      return {
        accountId: acc.id,
        accountName: acc.name,
        bankName: acc.bankName,
        accountNumber: acc.accountNumber,
        type: acc.type,
        syahriahIn,
        trxIn,
        trxOut,
        computedBalance,
        recordedBalance: acc.balance,
        discrepancy,
        isBalanced: Math.abs(discrepancy) < 1,
      };
    });
  }, [cashAccounts, syahriahPayments, transactions]);

  // Auto-healing: Jika saldo kas bernilai 0 padahal ada transaksi operasional riil BKU / Syahriah
  useEffect(() => {
    const totalRecorded = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
    const hasHistory = transactions.length > 0 || syahriahPayments.length > 0;
    if (totalRecorded === 0 && hasHistory && netIncomeOverall > 0) {
      const rawAccounts: CashAccount[] = cashAccounts.map((acc) => {
        const syIn = syahriahPayments
          .filter((p) => resolvePaymentAccountId(p.accountId, p.paymentMethod) === acc.id)
          .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

        const tIn = transactions
          .filter((t) => resolveTransactionAccountId(t.accountId, t.category) === acc.id && t.type === 'INCOME')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const tOut = transactions
          .filter((t) => resolveTransactionAccountId(t.accountId, t.category) === acc.id && t.type === 'EXPENSE')
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        return {
          ...acc,
          balance: syIn + tIn - tOut,
        };
      });

      const balanced = balanceAccountDeficits(rawAccounts);
      if (balanced.some((a) => a.balance > 0)) {
        setCashAccounts(balanced);
        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(balanced));
        } catch {}
        safeSupabase(
          supabase.from('cash_accounts').upsert(balanced.map(mapAccountToDb))
        );
      }
    }
  }, [transactions, syahriahPayments, cashAccounts, netIncomeOverall]);

  // Fungsi 1-Klik Rekonsiliasi & Sinkronisasi Ulang Saldo Kas Otomatis
  const reconcileCashBalances = async (): Promise<{
    success: boolean;
    message: string;
    reconciledCount: number;
  }> => {
    const reconList = cashReconciliationDetails;
    const rawAccounts: CashAccount[] = reconList.map((item) => {
      const originalAcc = cashAccounts.find((a) => a.id === item.accountId);
      return {
        ...(originalAcc || {
          id: item.accountId,
          name: item.accountName,
          type: item.type,
          description: '',
        }),
        balance: item.computedBalance,
      };
    });

    const updatedAccounts = balanceAccountDeficits(rawAccounts);

    setCashAccounts(updatedAccounts);
    try {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
    } catch {}

    let syncMsg = '';
    try {
      const { error } = await supabase
        .from('cash_accounts')
        .upsert(updatedAccounts.map(mapAccountToDb));
      if (!error) {
        syncMsg = ' dan berhasil tersinkronisasi ke Cloud Supabase.';
      }
    } catch {
      syncMsg = ' (tersimpan di lokal browser).';
    }

    const changedCount = reconList.filter((r) => !r.isBalanced).length;
    return {
      success: true,
      message: `Rekonsiliasi berhasil! ${
        changedCount > 0
          ? `${changedCount} akun kas telah diselaraskan dengan mutasi transaksi BKU & Syahriah`
          : 'Seluruh akun kas sudah 100% klop dengan mutasi BKU'
      }${syncMsg}`,
      reconciledCount: changedCount,
    };
  };

  // Backup & restore
  const exportDataJson = (): string => {
    const fullBackup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schoolProfile,
      cashAccounts,
      students,
      syahriahPayments,
      transactions,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importDataJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.schoolProfile && data.students && data.cashAccounts) {
        setSchoolProfile(data.schoolProfile);
        setStudents(data.students);
        setCashAccounts(data.cashAccounts);
        if (Array.isArray(data.syahriahPayments)) {
          setSyahriahPayments(data.syahriahPayments);
        }
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }

        // Otomatis sinkronkan seluruh data import JSON ke Supabase
        syncWithCloud(async () => {
          await supabase
            .from('school_profile')
            .upsert(mapProfileToDb(data.schoolProfile));

          if (data.cashAccounts.length > 0) {
            await supabase
              .from('cash_accounts')
              .upsert(data.cashAccounts.map(mapAccountToDb));
          }

          if (data.students.length > 0) {
            for (let i = 0; i < data.students.length; i += 50) {
              const chunk = data.students.slice(i, i + 50);
              await supabase.from('students').upsert(chunk.map(mapStudentToDb));
            }
          }

          if (Array.isArray(data.syahriahPayments) && data.syahriahPayments.length > 0) {
            for (let i = 0; i < data.syahriahPayments.length; i += 50) {
              const chunk = data.syahriahPayments.slice(i, i + 50);
              await supabase
                .from('syahriah_payments')
                .upsert(chunk.map(mapSyahriahToDb));
            }
          }

          if (Array.isArray(data.transactions) && data.transactions.length > 0) {
            for (let i = 0; i < data.transactions.length; i += 50) {
              const chunk = data.transactions.slice(i, i + 50);
              await supabase
                .from('financial_transactions')
                .upsert(chunk.map(mapTransactionToDb));
            }
          }
        });

        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const resetToDefault = () => {
    setSchoolProfile(INITIAL_SCHOOL_PROFILE);
    setStudents(INITIAL_STUDENTS);
    setSyahriahPayments(INITIAL_SYAHRIAH_PAYMENTS);
    setCashAccounts(INITIAL_CASH_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.SYAHRIAH);
    localStorage.removeItem(STORAGE_KEYS.ACCOUNTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  };

  return (
    <FinanceContext.Provider
      value={{
        schoolProfile,
        updateSchoolProfile,
        students,
        addStudent,
        updateStudent,
        deleteStudent,
        clearAllStudents,
        bulkImportStudents,
        syahriahPayments,
        recordSyahriahPayment,
        updateSyahriahPayment,
        deleteSyahriahPayment,
        editingSyahriahPayment,
        setEditingSyahriahPayment,
        cashAccounts,
        updateCashAccount,
        addCashAccount,
        deleteCashAccount,
        syncFinancialsWithCloud,
        clearAllFinancialData,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        editingTransaction,
        setEditingTransaction,
        transferCash,
        mutateMadrasahToPembangunan,
        activeReceipt,
        setActiveReceipt,
        cloudSyncStatus,
        isInitialSyncing,
        lastSyncedAt,
        syncErrorMessage,
        forceFullSync,
        getStudentPaidMonths,
        isMonthPaid,
        totalCashBalance,
        totalIncomeOverall,
        totalExpenseOverall,
        totalSyahriahIncome,
        totalOtherIncome,
        netIncomeOverall,
        cashDiscrepancy,
        cashReconciliationDetails,
        reconcileCashBalances,
        exportDataJson,
        importDataJson,
        resetToDefault,
        isAdmin,
        loginAdmin,
        logoutAdmin,
        changeAdminPassword,
        requireAdmin,
        adminPromptState,
        openAdminPrompt,
        closeAdminPrompt,
        isDefaultPassword,
        autoLockMinutes,
        setAutoLockMinutes,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
