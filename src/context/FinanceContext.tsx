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

  const [syahriahPayments, setSyahriahPayments] = useState<
    SyahriahPaymentRecord[]
  >(() => {
    const clearedFlag = localStorage.getItem('mi_soborejo_clear_students_grades1to6_v1');
    if (!clearedFlag) {
      return [];
    }

    const saved = localStorage.getItem(STORAGE_KEYS.SYAHRIAH);
    if (saved) {
      try {
        const parsed: SyahriahPaymentRecord[] = JSON.parse(saved);
        return parsed.map((p) => {
          if (p.amountPerMonth === 40000) {
            const monthsCount = p.months?.length || 1;
            return {
              ...p,
              amountPerMonth: 20000,
              totalAmount: 20000 * monthsCount,
            };
          }
          return p;
        });
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
        return JSON.parse(saved);
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
          return JSON.parse(saved);
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

  // Actions
  const updateSchoolProfile = (profile: SchoolProfile) => {
    setSchoolProfile(profile);
  };

  const addStudent = (studentData: Omit<Student, 'id'>): Student => {
    const newStudent: Student = {
      ...studentData,
      id: `std-${Date.now()}`,
    };
    setStudents((prev) => [...prev, newStudent]);
    return newStudent;
  };

  const updateStudent = (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
  };

  const deleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const clearAllStudents = (gradeFilter?: number | 'ALL') => {
    if (!gradeFilter || gradeFilter === 'ALL') {
      setStudents([]);
      setSyahriahPayments([]);
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SYAHRIAH, JSON.stringify([]));
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

    // Update account balance (Pemasukan)
    setCashAccounts((prev) =>
      prev.map((acc) =>
        acc.id === paymentData.accountId
          ? { ...acc, balance: acc.balance + paymentData.totalAmount }
          : acc
      )
    );

    return newPayment;
  };

  const deleteSyahriahPayment = (id: string) => {
    const payment = syahriahPayments.find((p) => p.id === id);
    if (!payment) return;

    // Deduct from account balance
    setCashAccounts((prev) =>
      prev.map((acc) =>
        acc.id === payment.accountId
          ? { ...acc, balance: Math.max(0, acc.balance - payment.totalAmount) }
          : acc
      )
    );

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

    // Update account balance
    setCashAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === trxData.accountId) {
          const newBalance =
            trxData.type === 'INCOME'
              ? acc.balance + trxData.amount
              : acc.balance - trxData.amount;
          return { ...acc, balance: newBalance };
        }
        return acc;
      })
    );

    return newTrx;
  };

  const deleteTransaction = (id: string) => {
    const trx = transactions.find((t) => t.id === id);
    if (!trx) return;

    // Revert account balance
    setCashAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === trx.accountId) {
          const revertedBalance =
            trx.type === 'INCOME'
              ? acc.balance - trx.amount
              : acc.balance + trx.amount;
          return { ...acc, balance: revertedBalance };
        }
        return acc;
      })
    );

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const transferCash = (
    fromId: string,
    toId: string,
    amount: number,
    description: string
  ) => {
    if (fromId === toId || amount <= 0) return;

    setCashAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === fromId) {
          return { ...acc, balance: acc.balance - amount };
        }
        if (acc.id === toId) {
          return { ...acc, balance: acc.balance + amount };
        }
        return acc;
      })
    );

    const fromAcc = cashAccounts.find((a) => a.id === fromId)?.name || fromId;
    const toAcc = cashAccounts.find((a) => a.id === toId)?.name || toId;

    // Record internal transfer entry in transactions
    const now = new Date();
    const today = now.toISOString().split('T')[0];
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
