import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Student,
  SyahriahPaymentRecord,
  CashAccount,
  FinancialTransaction,
  SchoolProfile,
  AcademicMonth,
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
  mapStudentToDb,
  mapSyahriahToDb,
  mapAccountToDb,
  mapTransactionToDb,
  mapProfileToDb,
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
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILE: 'mi_keuangan_profile_v1',
  STUDENTS: 'mi_keuangan_students_v1',
  SYAHRIAH: 'mi_keuangan_syahriah_v1',
  ACCOUNTS: 'mi_keuangan_accounts_v1',
  TRANSACTIONS: 'mi_keuangan_transactions_v1',
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

  // Actions
  const updateSchoolProfile = (profile: SchoolProfile) => {
    setSchoolProfile(profile);
    // Background sync to Supabase
    safeSupabase(supabase.from('school_profile').upsert(mapProfileToDb(profile)));
  };

  const addStudent = (studentData: Omit<Student, 'id'>): Student => {
    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`,
    };
    setStudents((prev) => [...prev, newStudent]);

    // Background sync to Supabase
    safeSupabase(supabase.from('students').upsert(mapStudentToDb(newStudent)));

    return newStudent;
  };

  const updateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );

    // Background sync to Supabase
    safeSupabase(supabase.from('students').upsert(mapStudentToDb(updatedStudent)));
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));

    // Background sync to Supabase
    safeSupabase(supabase.from('students').delete().eq('id', id));
  };

  const clearAllStudents = (gradeFilter?: number | 'ALL') => {
    if (!gradeFilter || gradeFilter === 'ALL') {
      setStudents([]);
      setSyahriahPayments([]);
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify([]));

      // Background sync to Supabase
      safeSupabase(supabase.from('students').delete().neq('id', ''));
      safeSupabase(supabase.from('syahriah_payments').delete().neq('id', ''));
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

      // Background sync to Supabase
      safeSupabase(supabase.from('students').delete().eq('grade', gradeFilter));
      safeSupabase(supabase.from('syahriah_payments').delete().eq('grade', gradeFilter));
    }
  };

  const bulkImportStudents = (
    newStudents: Omit<Student, 'id'>[],
    strategy: 'UPSERT' | 'SKIP_EXISTING' = 'UPSERT'
  ) => {
    let addedCount = 0;
    let updatedCount = 0;

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
            // Update existing student with imported info, preserving their ID
            const existingId = nextList[existingIdx].id;
            nextList[existingIdx] = {
              ...stData,
              id: existingId,
            };
            updatedCount++;
          }
          // if SKIP_EXISTING, do nothing
        } else {
          // Add new student
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

      return nextList;
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

    // Background sync to Supabase
    safeSupabase(supabase.from('syahriah_payments').insert(mapSyahriahToDb(newPayment)));

    // Update account balance (Pemasukan)
    setCashAccounts((prev) => {
      const updated = prev.map((acc) =>
        acc.id === paymentData.accountId
          ? { ...acc, balance: acc.balance + paymentData.totalAmount }
          : acc
      );
      safeSupabase(supabase.from('cash_accounts').upsert(updated.map(mapAccountToDb)));
      return updated;
    });

    return newPayment;
  };

  const deleteSyahriahPayment = (id: string) => {
    const payment = syahriahPayments.find((p) => p.id === id);
    if (!payment) return;

    // Background sync to Supabase
    safeSupabase(supabase.from('syahriah_payments').delete().eq('id', id));

    // Deduct from account balance
    setCashAccounts((prev) => {
      const updated = prev.map((acc) =>
        acc.id === payment.accountId
          ? { ...acc, balance: Math.max(0, acc.balance - payment.totalAmount) }
          : acc
      );
      safeSupabase(supabase.from('cash_accounts').upsert(updated.map(mapAccountToDb)));
      return updated;
    });

    setSyahriahPayments((prev) => prev.filter((p) => p.id !== id));
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

    // Background sync to Supabase
    safeSupabase(supabase.from('financial_transactions').insert(mapTransactionToDb(newTrx)));

    // Update account balance
    setCashAccounts((prev) => {
      const updated = prev.map((acc) => {
        if (acc.id === trxData.accountId) {
          const newBalance =
            trxData.type === 'INCOME'
              ? acc.balance + trxData.amount
              : acc.balance - trxData.amount;
          return { ...acc, balance: newBalance };
        }
        return acc;
      });
      safeSupabase(supabase.from('cash_accounts').upsert(updated.map(mapAccountToDb)));
      return updated;
    });

    return newTrx;
  };

  const deleteTransaction = (id: string) => {
    const trx = transactions.find((t) => t.id === id);
    if (!trx) return;

    // Background sync to Supabase
    safeSupabase(supabase.from('financial_transactions').delete().eq('id', id));

    // Revert account balance
    setCashAccounts((prev) => {
      const updated = prev.map((acc) => {
        if (acc.id === trx.accountId) {
          const revertedBalance =
            trx.type === 'INCOME'
              ? acc.balance - trx.amount
              : acc.balance + trx.amount;
          return { ...acc, balance: revertedBalance };
        }
        return acc;
      });
      safeSupabase(supabase.from('cash_accounts').upsert(updated.map(mapAccountToDb)));
      return updated;
    });

    setTransactions((prev) => prev.filter((t) => t.id !== id));
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
      safeSupabase(
        supabase.from('cash_accounts').upsert(updatedAccounts.map(mapAccountToDb))
      );
      return updatedAccounts;
    });

    const fromAcc = cashAccounts.find((a) => a.id === fromId)?.name || fromId;
    const toAcc = cashAccounts.find((a) => a.id === toId)?.name || toId;

    // Record internal transfer entry in transactions
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Log to Supabase cash_transfers table
    const transferRecordId = `trf-${Date.now()}`;
    safeSupabase(
      supabase.from('cash_transfers').insert({
        id: transferRecordId,
        date: today,
        from_account_id: fromId,
        to_account_id: toId,
        amount,
        description,
        recorded_by: schoolProfile.treasurerName,
        created_at: new Date().toISOString(),
      })
    );

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
      safeSupabase(
        supabase.from('cash_accounts').upsert(mapAccountToDb(updatedAcc))
      );
      return next;
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
      safeSupabase(supabase.from('cash_accounts').upsert(mapAccountToDb(newAcc)));
      return next;
    });
    return newAcc;
  };

  const deleteCashAccount = (id: string) => {
    setCashAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      safeSupabase(supabase.from('cash_accounts').delete().eq('id', id));
      return next;
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
