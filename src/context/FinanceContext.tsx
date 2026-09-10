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
  deleteSyahriahPayment: (id: string) => void;
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
  deleteTransaction: (id: string) => void;
  transferCash: (
    fromId: string,
    toId: string,
    amount: number,
    description: string
  ) => void;
  activeReceipt: SyahriahPaymentRecord | null;
  setActiveReceipt: (receipt: SyahriahPaymentRecord | null) => void;
  // Cloud Sync Realtime
  cloudSyncStatus: CloudSyncStatus;
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
};

// Safe wrapper for fire-and-forget Supabase sync calls
const safeSupabase = (op: any) => {
  try {
    Promise.resolve(op).catch(() => {});
  } catch {
    // Ignore offline or uninitialized errors
  }
};

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
        return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_SCHOOL_PROFILE;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    // Check migration flag for clearing dummy students from grade 1 to 6
    const clearedFlag = localStorage.getItem('mi_soborejo_clear_students_grades1to6_v1');
    if (!clearedFlag) {
      localStorage.setItem('mi_soborejo_clear_students_grades1to6_v1', 'true');
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify([]));
      return [];
    }

    const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (saved) {
      try {
        const parsed: Student[] = JSON.parse(saved);
        return parsed.map((s) => {
          if (s.monthlySyahriah === 40000) {
            return { ...s, monthlySyahriah: 20000 };
          }
          return s;
        });
      } catch {
        // fallback
      }
    }
    return INITIAL_STUDENTS;
  });

  const FINANCE_CLEARED_KEY = 'mi_finance_cleared_v2';

  const [syahriahPayments, setSyahriahPayments] = useState<
    SyahriahPaymentRecord[]
  >(() => {
    const isCleared = localStorage.getItem(FINANCE_CLEARED_KEY) === 'true';
    if (!isCleared) {
      return [];
    }

    const saved = localStorage.getItem(STORAGE_KEYS.SYAHRIAH);
    if (saved) {
      try {
        const parsed: SyahriahPaymentRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_SYAHRIAH_PAYMENTS;
  });

  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>(() => {
    const isCleared = localStorage.getItem(FINANCE_CLEARED_KEY) === 'true';
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
              balance: !isCleared ? 0 : Number(acc.balance || 0),
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
      const isCleared = localStorage.getItem(FINANCE_CLEARED_KEY) === 'true';
      if (!isCleared) {
        return [];
      }
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (saved) {
        try {
          const parsed: FinancialTransaction[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((t) => {
              if (t.accountId === 'bank-bri') {
                return { ...t, accountId: 'bank-bri-bos' };
              }
              return t;
            });
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
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('idle');
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

  // Sinkronisasi Penuh Dua Arah (Bidirectional Auto-Sync)
  const forceFullSync = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCloudSyncStatus('offline');
      return {
        success: false,
        message: 'Koneksi internet offline. Data tetap tersimpan aman di penyimpanan lokal.',
      };
    }

    setCloudSyncStatus('syncing');
    try {
      const health = await checkSupabaseHealth();
      if (!health.connected || !health.tablesFound) {
        setCloudSyncStatus('error');
        setSyncErrorMessage(health.message);
        return {
          success: false,
          message: health.message,
        };
      }

      // 1. Bersihkan legacy 'bank-bri' dari Supabase jika ada
      await supabase.from('cash_accounts').delete().eq('id', 'bank-bri');

      // 2. Sinkronkan Profil Madrasah
      const { data: cloudProfile } = await supabase
        .from('school_profile')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (cloudProfile) {
        const mapped = mapDbToProfile(cloudProfile);
        setSchoolProfile(mapped);
      } else {
        await supabase.from('school_profile').upsert(mapProfileToDb(schoolProfile));
      }

      // 3. Sinkronkan Akun Kas & Bank
      const { data: cloudAccounts, error: accErr } = await supabase
        .from('cash_accounts')
        .select('*');

      if (!accErr && cloudAccounts && cloudAccounts.length > 0) {
        const mapped = cloudAccounts.map(mapDbToAccount);
        setCashAccounts(mapped);
      } else if (cashAccounts.length > 0) {
        await supabase.from('cash_accounts').upsert(cashAccounts.map(mapAccountToDb));
      }

      // 4. Sinkronkan Data Siswa
      const { data: cloudStudents, error: stdErr } = await supabase
        .from('students')
        .select('*')
        .order('grade', { ascending: true })
        .order('name', { ascending: true });

      if (!stdErr && cloudStudents && cloudStudents.length > 0) {
        const mapped = cloudStudents.map(mapDbToStudent);
        setStudents(mapped);
        const cloudIds = new Set(cloudStudents.map((s) => s.id));
        const missingInCloud = students.filter((s) => !cloudIds.has(s.id));
        if (missingInCloud.length > 0) {
          for (let i = 0; i < missingInCloud.length; i += 50) {
            await supabase
              .from('students')
              .upsert(missingInCloud.slice(i, i + 50).map(mapStudentToDb));
          }
        }
      } else if (students.length > 0) {
        for (let i = 0; i < students.length; i += 50) {
          await supabase
            .from('students')
            .upsert(students.slice(i, i + 50).map(mapStudentToDb));
        }
      }

      // 5. Sinkronkan Pembayaran Syahriah
      const { data: cloudSyahriah, error: syahErr } = await supabase
        .from('syahriah_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (!syahErr && cloudSyahriah && cloudSyahriah.length > 0) {
        const mapped = cloudSyahriah.map(mapDbToSyahriah);
        setSyahriahPayments(mapped);
      } else if (syahriahPayments.length > 0) {
        for (let i = 0; i < syahriahPayments.length; i += 50) {
          await supabase
            .from('syahriah_payments')
            .upsert(syahriahPayments.slice(i, i + 50).map(mapSyahriahToDb));
        }
      }

      // 6. Sinkronkan Transaksi Keuangan BKU
      const { data: cloudTransactions, error: trxErr } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });

      if (!trxErr && cloudTransactions && cloudTransactions.length > 0) {
        const mapped = cloudTransactions.map(mapDbToTransaction);
        setTransactions(mapped);
      } else if (transactions.length > 0) {
        for (let i = 0; i < transactions.length; i += 50) {
          await supabase
            .from('financial_transactions')
            .upsert(transactions.slice(i, i + 50).map(mapTransactionToDb));
        }
      }

      const now = new Date();
      setCloudSyncStatus('synced');
      setLastSyncedAt(now);
      setSyncErrorMessage(null);

      return {
        success: true,
        message: `Sinkronisasi otomatis berhasil pada ${now.toLocaleTimeString('id-ID')}. Seluruh data tersinkron dengan Supabase Cloud.`,
      };
    } catch (err: any) {
      setCloudSyncStatus('error');
      setSyncErrorMessage(err.message || String(err));
      return {
        success: false,
        message: `Gagal sinkronisasi otomatis: ${err.message || String(err)}`,
      };
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

  // Otomatis sinkronisasi saat aplikasi dibuka & event listener online/offline
  useEffect(() => {
    let isMounted = true;

    const runBootSync = async () => {
      try {
        await forceFullSync();
      } catch (err) {
        console.warn('Boot auto-sync note:', err);
      }
    };

    const timer = setTimeout(() => {
      if (isMounted) {
        runBootSync();
      }
    }, 600);

    const handleOnline = () => {
      setCloudSyncStatus('syncing');
      runBootSync();
    };

    const handleOffline = () => {
      setCloudSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
            setSyahriahPayments((prev) => {
              if (prev.some((p) => p.id === newPayment.id)) return prev;
              return [newPayment, ...prev];
            });
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
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
            setTransactions((prev) => {
              if (prev.some((t) => t.id === newTrx.id)) return prev;
              return [newTrx, ...prev];
            });
            setLastSyncedAt(new Date());
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
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

  // Sekali saat mount: jika data belum dikosongkan, kosongkan data keuangan sekarang sesuai instruksi user
  useEffect(() => {
    const isCleared = localStorage.getItem(FINANCE_CLEARED_KEY) === 'true';
    if (!isCleared) {
      // 1. Kosongkan local storage
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify([]));
      const zeroedAccounts = cashAccounts.map((acc) => ({ ...acc, balance: 0 }));
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(zeroedAccounts));
      localStorage.setItem(FINANCE_CLEARED_KEY, 'true');

      // 2. Kosongkan state lokal
      setTransactions([]);
      setSyahriahPayments([]);
      setCashAccounts(zeroedAccounts);

      // 3. Bersihkan record transaksi dan reset saldo akun di cloud Supabase
      (async () => {
        try {
          await supabase.from('financial_transactions').delete().neq('id', 'dummy-keep-all');
          await supabase.from('syahriah_payments').delete().neq('id', 'dummy-keep-all');
          await supabase.from('cash_transfers').delete().neq('id', 'dummy-keep-all');
          if (zeroedAccounts.length > 0) {
            await supabase.from('cash_accounts').upsert(zeroedAccounts.map(mapAccountToDb));
          }
        } catch {
          // Safe fail jika offline / koneksi belum disiapkan
        }
      })();
    }
  }, []);

  // Otomatis sinkronisasi akun bank & data keuangan bawaan ke Supabase jika terhubung
  useEffect(() => {
    const autoSyncTimer = setTimeout(async () => {
      try {
        // 1. Bersihkan legacy 'bank-bri' dari Supabase jika ada
        await supabase.from('cash_accounts').delete().eq('id', 'bank-bri');

        // 2. Periksa akun kas di Supabase
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
        // Safe fail jika belum ada koneksi / tabel belum dibuat
      }
    }, 1500);

    return () => clearTimeout(autoSyncTimer);
  }, []);

  // Actions dengan Sinkronisasi Otomatis ke Supabase Cloud
  const updateSchoolProfile = (profile: SchoolProfile) => {
    setSchoolProfile(profile);
    syncWithCloud(async () => {
      const { error } = await supabase
        .from('school_profile')
        .upsert(mapProfileToDb(profile));
      if (error) throw error;
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

  const deleteSyahriahPayment = (id: string) => {
    const payment = syahriahPayments.find((p) => p.id === id);
    if (!payment) return;

    let updatedAccounts: CashAccount[] = [];
    setCashAccounts((prev) => {
      updatedAccounts = prev.map((acc) =>
        acc.id === payment.accountId
          ? { ...acc, balance: Math.max(0, acc.balance - payment.totalAmount) }
          : acc
      );
      return updatedAccounts;
    });

    setSyahriahPayments((prev) => prev.filter((p) => p.id !== id));

    syncWithCloud(async () => {
      const { error: payErr } = await supabase
        .from('syahriah_payments')
        .delete()
        .eq('id', id);
      if (payErr) throw payErr;
      if (updatedAccounts.length > 0) {
        await supabase
          .from('cash_accounts')
          .upsert(updatedAccounts.map(mapAccountToDb));
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

    setTransactions((prev) => [newTrx, ...prev]);

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
      return updatedAccounts;
    });

    // Otomatis sinkronkan transaksi dan perubahan saldo ke Supabase
    syncWithCloud(async () => {
      const { error: trxErr } = await supabase
        .from('financial_transactions')
        .insert(mapTransactionToDb(newTrx));
      if (trxErr) throw trxErr;
      if (updatedAccounts.length > 0) {
        const { error: accErr } = await supabase
          .from('cash_accounts')
          .upsert(updatedAccounts.map(mapAccountToDb));
        if (accErr) throw accErr;
      }
    });

    return newTrx;
  };

  const deleteTransaction = (id: string) => {
    const trx = transactions.find((t) => t.id === id);
    if (!trx) return;

    let updatedAccounts: CashAccount[] = [];
    setCashAccounts((prev) => {
      updatedAccounts = prev.map((acc) => {
        if (acc.id === trx.accountId) {
          const revertedBalance =
            trx.type === 'INCOME'
              ? acc.balance - trx.amount
              : acc.balance + trx.amount;
          return { ...acc, balance: revertedBalance };
        }
        return acc;
      });
      return updatedAccounts;
    });

    setTransactions((prev) => prev.filter((t) => t.id !== id));

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

    let updatedAccounts: CashAccount[] = [];
    setCashAccounts((prev) => {
      updatedAccounts = prev.map((acc) => {
        if (acc.id === fromId) {
          return { ...acc, balance: acc.balance - amount };
        }
        if (acc.id === toId) {
          return { ...acc, balance: acc.balance + amount };
        }
        return acc;
      });
      return updatedAccounts;
    });

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

    syncWithCloud(async () => {
      await supabase.from('cash_transfers').insert(trfData);
      if (updatedAccounts.length > 0) {
        await supabase
          .from('cash_accounts')
          .upsert(updatedAccounts.map(mapAccountToDb));
      }
    });

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
      localStorage.setItem(FINANCE_CLEARED_KEY, 'true');

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
        deleteSyahriahPayment,
        cashAccounts,
        updateCashAccount,
        addCashAccount,
        deleteCashAccount,
        syncFinancialsWithCloud,
        clearAllFinancialData,
        transactions,
        addTransaction,
        deleteTransaction,
        transferCash,
        activeReceipt,
        setActiveReceipt,
        cloudSyncStatus,
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
