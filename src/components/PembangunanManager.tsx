import React, { useState, useMemo } from 'react';
import {
  Building2,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  Printer,
  Search,
  Filter,
  Users,
  Wallet,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  School,
  HardHat,
  Layers,
  Hammer,
  Truck,
  Coffee,
  Zap,
  FileText,
  HeartHandshake,
  Landmark,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  FinancialTransaction,
  Student,
  PembangunanIncomeCategory,
  PembangunanExpenseCategory,
} from '../types';
import {
  formatRupiah,
  formatDateIndo,
  terbilang,
} from '../utils/formatters';
import {
  PEMBANGUNAN_INCOME_CATEGORIES,
  PEMBANGUNAN_EXPENSE_CATEGORIES,
} from '../data/initialData';
import { PembangunanReceiptModal } from './PembangunanReceiptModal';

interface PembangunanManagerProps {
  initialOpenModal?: 'INCOME' | 'EXPENSE' | 'MUTATION' | null;
  initialSubTab?: 'buku-kas' | 'siswa' | 'rekap';
}

export const PembangunanManager: React.FC<PembangunanManagerProps> = ({
  initialOpenModal = null,
  initialSubTab = 'buku-kas',
}) => {
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    setEditingTransaction,
    mutateMadrasahToPembangunan,
    cashAccounts,
    students,
    schoolProfile,
    updateSchoolProfile,
    requireAdmin,
  } = useFinance();

  // Sub-tabs in Pembangunan Manager
  const [activeSubTab, setActiveSubTab] = useState<'buku-kas' | 'siswa' | 'rekap'>(initialSubTab);

  // Modals
  const [showIncomeModal, setShowIncomeModal] = useState(initialOpenModal === 'INCOME');
  const [showExpenseModal, setShowExpenseModal] = useState(initialOpenModal === 'EXPENSE');
  const [showMutationModal, setShowMutationModal] = useState(initialOpenModal === 'MUTATION');
  const [activeReceiptTrx, setActiveReceiptTrx] = useState<FinancialTransaction | null>(null);

  // Quick Edit Target Infaq Pembangunan Modal
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetInput, setTargetInput] = useState<number>(schoolProfile.targetInfaqPembangunan || 500000);

  // Sync targetInput with schoolProfile
  React.useEffect(() => {
    setTargetInput(schoolProfile.targetInfaqPembangunan || 500000);
  }, [schoolProfile.targetInfaqPembangunan]);

  React.useEffect(() => {
    if (initialOpenModal === 'INCOME') setShowIncomeModal(true);
    if (initialOpenModal === 'EXPENSE') setShowExpenseModal(true);
    if (initialOpenModal === 'MUTATION') setShowMutationModal(true);
  }, [initialOpenModal]);

  React.useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Filters for Buku Kas
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'MUTASI' | 'EXPENSE'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'THIS_YEAR'>('ALL');

  // Filters for Siswa
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>('ALL');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | 'LUNAS' | 'BELUM_LUNAS'>('ALL');

  // Selected student for quick infaq payment
  const [prefilledStudent, setPrefilledStudent] = useState<Student | null>(null);

  // Target Infaq per Siswa (from school profile or default 500.000)
  const targetPerStudent = schoolProfile.targetInfaqPembangunan || 500000;

  // 1. Identify all Pembangunan Transactions
  const isPembangunanTransaction = (t: FinancialTransaction): boolean => {
    if (t.isPembangunan === true) return true;
    if (t.category === 'INFAQ_PEMBANGUNAN') return true;
    if (t.category.startsWith('INFAQ_PEMBANGUNAN_')) return true;
    if (t.category === 'WAKAF_PEMBANGUNAN') return true;
    if (t.category === 'MUTASI_SUBSIDI_MADRASAH') return true;
    if (t.category.startsWith('BANGUNAN_')) return true;
    if (t.category === 'PEMBANGUNAN_INCOME_LAIN') return true;
    return false;
  };

  const pembangunanTransactions = useMemo(() => {
    return transactions
      .filter(isPembangunanTransaction)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }, [transactions]);

  // 2. Metrics & Calculations
  const metrics = useMemo(() => {
    let totalMurniInfaq = 0;
    let totalSubsidiMadrasah = 0;
    let totalExpense = 0;
    let materialExpense = 0;
    let upahExpense = 0;
    let otherExpense = 0;

    pembangunanTransactions.forEach((t) => {
      if (t.type === 'INCOME') {
        if (t.category === 'MUTASI_SUBSIDI_MADRASAH') {
          totalSubsidiMadrasah += t.amount;
        } else {
          totalMurniInfaq += t.amount;
        }
      } else if (t.type === 'EXPENSE') {
        totalExpense += t.amount;
        if (t.category === 'BANGUNAN_MATERIAL') {
          materialExpense += t.amount;
        } else if (t.category === 'BANGUNAN_UPAH_TUKANG') {
          upahExpense += t.amount;
        } else {
          otherExpense += t.amount;
        }
      }
    });

    const totalIncome = totalMurniInfaq + totalSubsidiMadrasah;
    const currentBalance = totalIncome - totalExpense;
    const persentaseSubsidi = totalIncome > 0 ? (totalSubsidiMadrasah / totalIncome) * 100 : 0;
    const persentaseMurni = totalIncome > 0 ? (totalMurniInfaq / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalMurniInfaq,
      totalSubsidiMadrasah,
      totalExpense,
      materialExpense,
      upahExpense,
      otherExpense,
      currentBalance,
      persentaseSubsidi,
      persentaseMurni,
    };
  }, [pembangunanTransactions]);

  // 3. Filtered Transactions for Buku Kas
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return pembangunanTransactions.filter((t) => {
      // Type Filter
      if (typeFilter === 'INCOME' && (t.type !== 'INCOME' || t.category === 'MUTASI_SUBSIDI_MADRASAH')) {
        return false;
      }
      if (typeFilter === 'MUTASI' && t.category !== 'MUTASI_SUBSIDI_MADRASAH') {
        return false;
      }
      if (typeFilter === 'EXPENSE' && t.type !== 'EXPENSE') {
        return false;
      }

      // Date Filter
      if (dateFilter === 'THIS_MONTH') {
        const d = new Date(t.date);
        if (d.getFullYear() !== currentYear || d.getMonth() !== currentMonth) return false;
      } else if (dateFilter === 'THIS_YEAR') {
        const d = new Date(t.date);
        if (d.getFullYear() !== currentYear) return false;
      }

      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchPayer = (t.payerOrPayee || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchRef = (t.refNo || '').toLowerCase().includes(q);
        const matchCategory = (t.categoryLabel || '').toLowerCase().includes(q);
        const matchProof = (t.proofDocumentNo || '').toLowerCase().includes(q);
        return matchPayer || matchDesc || matchRef || matchCategory || matchProof;
      }

      return true;
    });
  }, [pembangunanTransactions, typeFilter, dateFilter, searchTerm]);

  // 4. Running Balance Computation for filtered list
  const computedListWithBalance = useMemo(() => {
    // Sort chronological ascending first to get correct running balance
    const sortedAsc = [...pembangunanTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id)
    );

    let running = 0;
    const balanceMap = new Map<string, number>();

    sortedAsc.forEach((t) => {
      if (t.type === 'INCOME') {
        running += t.amount;
      } else {
        running -= t.amount;
      }
      balanceMap.set(t.id, running);
    });

    return filteredTransactions.map((t) => ({
      ...t,
      runningBalance: balanceMap.get(t.id) ?? 0,
    }));
  }, [filteredTransactions, pembangunanTransactions]);

  // 5. Student Infaq Tracking Aggregation
  const studentInfaqList = useMemo(() => {
    // Calculate total paid per student from pembangunan transactions
    const paidMap = new Map<string, { total: number; count: number; lastDate: string }>();

    pembangunanTransactions.forEach((t) => {
      if (t.type === 'INCOME' && t.studentId) {
        const current = paidMap.get(t.studentId) || { total: 0, count: 0, lastDate: t.date };
        paidMap.set(t.studentId, {
          total: current.total + t.amount,
          count: current.count + 1,
          lastDate: t.date > current.lastDate ? t.date : current.lastDate,
        });
      }
    });

    return students.map((std) => {
      const stats = paidMap.get(std.id) || { total: 0, count: 0, lastDate: '-' };
      const paid = stats.total;
      const target = targetPerStudent;
      const remaining = Math.max(0, target - paid);
      const isLunas = paid >= target;
      const percent = target > 0 ? Math.min(100, Math.round((paid / target) * 100)) : 100;

      return {
        student: std,
        paid,
        target,
        remaining,
        isLunas,
        percent,
        paymentCount: stats.count,
        lastDate: stats.lastDate,
      };
    });
  }, [students, pembangunanTransactions, targetPerStudent]);

  // 6. Filtered Students
  const filteredStudents = useMemo(() => {
    return studentInfaqList.filter((item) => {
      if (studentGradeFilter !== 'ALL' && String(item.student.grade) !== studentGradeFilter) {
        return false;
      }

      if (studentStatusFilter === 'LUNAS' && !item.isLunas) return false;
      if (studentStatusFilter === 'BELUM_LUNAS' && item.isLunas) return false;

      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = item.student.name.toLowerCase().includes(q);
        const matchNis = (item.student.nis || '').toLowerCase().includes(q);
        const matchClass = (item.student.classGroup || '').toLowerCase().includes(q);
        return matchName || matchNis || matchClass;
      }

      return true;
    });
  }, [studentInfaqList, studentGradeFilter, studentStatusFilter, studentSearch]);

  const studentSummary = useMemo(() => {
    const totalStudents = studentInfaqList.length;
    const lunasCount = studentInfaqList.filter((s) => s.isLunas).length;
    const belumLunasCount = totalStudents - lunasCount;
    const totalTerkumpul = studentInfaqList.reduce((acc, s) => acc + s.paid, 0);
    const totalPotensi = totalStudents * targetPerStudent;

    return {
      totalStudents,
      lunasCount,
      belumLunasCount,
      totalTerkumpul,
      totalPotensi,
    };
  }, [studentInfaqList, targetPerStudent]);

  // Action: Open quick pay for a specific student
  const handleQuickPayStudent = (student: Student) => {
    setPrefilledStudent(student);
    setShowIncomeModal(true);
  };

  // Action: Delete transaction with admin protection
  const handleDeleteTransaction = (trx: FinancialTransaction) => {
    requireAdmin(() => {
      const confirmDelete = window.confirm(
        `Apakah Anda yakin ingin menghapus transaksi ${trx.refNo} (${trx.categoryLabel} - ${formatRupiah(
          trx.amount
        )})?\n\nSaldo kas akan otomatis disesuaikan kembali.`
      );
      if (confirmDelete) {
        deleteTransaction(trx.id);
      }
    }, `Hapus Transaksi Pembangunan ${trx.refNo}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner & Title */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Building2 className="w-64 h-64 text-emerald-100" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-100 border border-emerald-600/40">
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              Pos Khusus Keuangan Madrasah
            </span>
            <span className="text-xs text-emerald-300 font-mono">
              LP Ma'arif NU Al Ihsan Soborejo
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Pengelolaan Infak &amp; Keuangan Pembangunan
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 max-w-3xl leading-relaxed">
            Pencatatan terpusat untuk penerimaan infak gedung, donatur, belanja material,
            upah tukang, serta fasilitas <strong>mutasi keuangan dari kas madrasah umum</strong> ke kas pembangunan.
          </p>

          {/* Quick Action Buttons on Header */}
          <div className="flex flex-wrap gap-2.5 sm:gap-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setPrefilledStudent(null);
                setShowIncomeModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-950" />
              <span>+ Pemasukan Infak</span>
            </button>

            <button
              type="button"
              onClick={() => setShowExpenseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <MinusCircle className="w-4 h-4" />
              <span>+ Pengeluaran Pembangunan</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMutationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-slate-950" />
              <span>↔ Mutasi Kas Madrasah Umum</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold rounded-xl border border-white/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Dana Masuk */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Dana Masuk
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-950">
            {formatRupiah(metrics.totalIncome)}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>Infaq Murni:</span>
            <strong className="font-mono text-gray-800">{formatRupiah(metrics.totalMurniInfaq)}</strong>
          </div>
        </div>

        {/* Card 2: Mutasi Subsidi Kas Madrasah */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Subsidi Kas Madrasah
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-900">
            {formatRupiah(metrics.totalSubsidiMadrasah)}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>Porsi Subsidi:</span>
            <span className="font-semibold text-amber-700">
              {metrics.persentaseSubsidi.toFixed(1)}% dari Total Dana
            </span>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-950">
            {formatRupiah(metrics.totalExpense)}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>Material &amp; Upah:</span>
            <strong className="font-mono text-gray-800">
              {formatRupiah(metrics.materialExpense + metrics.upahExpense)}
            </strong>
          </div>
        </div>

        {/* Card 4: Sisa Saldo Kas Pembangunan */}
        <div className="bg-white rounded-2xl p-5 border border-teal-100 shadow-xs hover:shadow-md transition-shadow bg-linear-to-br from-white to-teal-50/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sisa Saldo Kas Pembangunan
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-bold font-mono ${metrics.currentBalance < 0 ? 'text-rose-600' : 'text-teal-900'}`}>
            {formatRupiah(metrics.currentBalance)}
          </div>
          <div className="mt-3 pt-3 border-t border-teal-100/60 flex items-center justify-between text-xs text-gray-600">
            <span>Status Kas:</span>
            <span className={`font-semibold ${metrics.currentBalance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {metrics.currentBalance >= 0 ? 'Tersedia Surplus' : 'Defisit Anggaran'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('buku-kas')}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'buku-kas'
              ? 'bg-emerald-800 text-white shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Buku Kas Pembangunan</span>
          <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-white/20 text-current">
            {pembangunanTransactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('siswa')}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'siswa'
              ? 'bg-emerald-800 text-white shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Monitoring Infak Siswa</span>
          <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-white/20 text-current">
            {studentInfaqList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('rekap')}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'rekap'
              ? 'bg-emerald-800 text-white shadow-xs font-semibold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rincian &amp; Realisasi Anggaran</span>
        </button>
      </div>

      {/* 4. SUB-TAB 1: BUKU KAS PEMBANGUNAN */}
      {activeSubTab === 'buku-kas' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-gray-200 bg-slate-50/70 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari transaksi, siswa, donatur, toko material, nomor nota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs"
              />
            </div>

            {/* Type & Date Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl p-1 shadow-2xs text-xs">
                <span className="text-gray-400 pl-1.5">
                  <Filter className="w-3.5 h-3.5" />
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="bg-transparent border-0 py-1 pr-6 pl-1 font-medium text-gray-700 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Jenis Transaksi</option>
                  <option value="INCOME">Hanya Infak &amp; Donasi</option>
                  <option value="MUTASI">Hanya Mutasi Subsidi Madrasah</option>
                  <option value="EXPENSE">Hanya Belanja &amp; Upah Pembangunan</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl p-1 shadow-2xs text-xs">
                <span className="text-gray-400 pl-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-transparent border-0 py-1 pr-6 pl-1 font-medium text-gray-700 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Periode</option>
                  <option value="THIS_MONTH">Bulan Ini</option>
                  <option value="THIS_YEAR">Tahun Ini</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-100/90 text-gray-700 uppercase font-semibold text-[11px] tracking-wider border-b border-gray-200">
                  <th className="py-3 px-4">Tanggal &amp; No Ref</th>
                  <th className="py-3 px-4">Jenis &amp; Kategori</th>
                  <th className="py-3 px-4">Pihak / Rekanan</th>
                  <th className="py-3 px-4">Uraian &amp; Bukti</th>
                  <th className="py-3 px-4">Akun Kas</th>
                  <th className="py-3 px-4 text-right">Penerimaan (Debit)</th>
                  <th className="py-3 px-4 text-right">Pengeluaran (Kredit)</th>
                  <th className="py-3 px-4 text-right">Saldo Kas</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {computedListWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="w-10 h-10 text-gray-300" />
                        <p className="font-semibold text-gray-700">Belum ada transaksi pembangunan</p>
                        <p className="text-xs text-gray-400 max-w-sm">
                          Mulai dengan mencatat pemasukan infak siswa, donatur, atau melakukan mutasi subsidi dari kas madrasah umum.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  computedListWithBalance.map((trx) => {
                    const isIncome = trx.type === 'INCOME';
                    const isMutation = trx.category === 'MUTASI_SUBSIDI_MADRASAH';
                    const account = cashAccounts.find((a) => a.id === trx.accountId);

                    return (
                      <tr
                        key={trx.id}
                        className={`hover:bg-gray-50/80 transition-colors ${
                          isMutation ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* 1. Date & Ref */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {formatDateIndo(trx.date)}
                          </div>
                          <div className="font-mono text-[11px] text-gray-500 mt-0.5">
                            {trx.refNo}
                          </div>
                        </td>

                        {/* 2. Type & Category */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            {isMutation ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <ArrowRightLeft className="w-3 h-3" />
                                Subsidi Kas Madrasah
                              </span>
                            ) : isIncome ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <TrendingUp className="w-3 h-3" />
                                Penerimaan Infak
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                <TrendingDown className="w-3 h-3" />
                                Belanja Pembangunan
                              </span>
                            )}
                            <span className="text-xs font-medium text-gray-800 line-clamp-1">
                              {trx.categoryLabel}
                            </span>
                          </div>
                        </td>

                        {/* 3. Payer or Payee */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">
                            {trx.payerOrPayee}
                          </div>
                          {trx.classGroup && (
                            <span className="inline-block mt-0.5 text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                              Kelas {trx.classGroup}
                            </span>
                          )}
                        </td>

                        {/* 4. Description & Proof */}
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-xs text-gray-700 line-clamp-2">
                            {trx.description || '-'}
                          </p>
                          {trx.proofDocumentNo && (
                            <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
                              No. Nota: {trx.proofDocumentNo}
                            </span>
                          )}
                        </td>

                        {/* 5. Cash Account */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-600">
                          <span className="font-medium text-gray-800 block">
                            {account?.name || trx.accountId}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {account?.type === 'BANK' ? account.bankName : 'Tunai'}
                          </span>
                        </td>

                        {/* 6. Debit (Income) */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {isIncome ? formatRupiah(trx.amount) : '-'}
                        </td>

                        {/* 7. Credit (Expense) */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                          {!isIncome ? formatRupiah(trx.amount) : '-'}
                        </td>

                        {/* 8. Running Balance */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          {formatRupiah(trx.runningBalance)}
                        </td>

                        {/* 9. Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* Kwitansi */}
                            <button
                              type="button"
                              onClick={() => setActiveReceiptTrx(trx)}
                              title="Cetak Kuitansi / Berita Acara Resmi"
                              className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => setEditingTransaction(trx)}
                              title="Edit Pencatatan Transaksi"
                              className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(trx)}
                              title="Hapus Transaksi"
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 font-medium">
            <span>
              Menampilkan <strong>{computedListWithBalance.length}</strong> transaksi pembangunan
            </span>
            <div className="flex items-center gap-4">
              <span>
                Total Penerimaan: <strong className="text-emerald-800 font-mono">{formatRupiah(metrics.totalIncome)}</strong>
              </span>
              <span>
                Total Pengeluaran: <strong className="text-rose-800 font-mono">{formatRupiah(metrics.totalExpense)}</strong>
              </span>
              <span>
                Saldo Akhir: <strong className="text-teal-900 font-mono text-sm">{formatRupiah(metrics.currentBalance)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 2: MONITORING INFAK SISWA */}
      {activeSubTab === 'siswa' && (
        <div className="space-y-4">
          {/* Siswa Metrics Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs text-gray-500 font-semibold block uppercase">Total Siswa Terdata</span>
              <span className="text-2xl font-bold text-gray-900 font-mono">{studentSummary.totalStudents}</span>
              <span className="text-xs text-gray-400 block mt-1">Santri MI Ma'arif Al Ihsan</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs text-emerald-700 font-semibold block uppercase">Siswa Lunas Target</span>
              <span className="text-2xl font-bold text-emerald-800 font-mono">{studentSummary.lunasCount}</span>
              <span className="text-xs text-emerald-600 block mt-1">
                {studentSummary.totalStudents > 0
                  ? ((studentSummary.lunasCount / studentSummary.totalStudents) * 100).toFixed(1)
                  : 0}
                % Tuntas Pelunasan
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-xs text-amber-700 font-semibold block uppercase">Belum Lunas / Mengangsur</span>
              <span className="text-2xl font-bold text-amber-800 font-mono">{studentSummary.belumLunasCount}</span>
              <span className="text-xs text-amber-600 block mt-1">Perlu Pembayaran Bertahap</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-xs text-teal-700 font-semibold block uppercase">Total Infak Terkumpul Siswa</span>
                <span className="text-xl font-bold text-teal-900 font-mono">{formatRupiah(studentSummary.totalTerkumpul)}</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Target: <strong className="font-mono text-gray-800">{formatRupiah(targetPerStudent)}</strong> / anak
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTargetInput(targetPerStudent);
                    setIsTargetModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 transition-colors cursor-pointer"
                  title="Klik untuk mengubah nilai target infak per siswa"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Ubah Target</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Filter controls */}
            <div className="p-4 sm:p-5 border-b border-gray-200 bg-slate-50/70 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari siswa berdasarkan nama atau NIS..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={studentGradeFilter}
                  onChange={(e) => setStudentGradeFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Semua Tingkat Kelas</option>
                  <option value="1">Kelas 1</option>
                  <option value="2">Kelas 2</option>
                  <option value="3">Kelas 3</option>
                  <option value="4">Kelas 4</option>
                  <option value="5">Kelas 5</option>
                  <option value="6">Kelas 6</option>
                </select>

                <select
                  value={studentStatusFilter}
                  onChange={(e) => setStudentStatusFilter(e.target.value as any)}
                  className="bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 shadow-2xs focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Semua Status Pelunasan</option>
                  <option value="LUNAS">Hanya yang Sudah Lunas</option>
                  <option value="BELUM_LUNAS">Hanya yang Belum Lunas</option>
                </select>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-100/90 text-gray-700 uppercase font-semibold text-[11px] tracking-wider border-b border-gray-200">
                    <th className="py-3 px-4">Nama Siswa &amp; NIS</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4 text-right">Target Infak</th>
                    <th className="py-3 px-4 text-right">Telah Terbayar</th>
                    <th className="py-3 px-4 text-right">Sisa Tagihan</th>
                    <th className="py-3 px-4">Progres Pelunasan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        Tidak ada data siswa yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((item) => (
                      <tr key={item.student.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900">{item.student.name}</div>
                          <div className="text-[11px] font-mono text-gray-500">
                            NIS: {item.student.nis || '-'}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-mono text-xs font-semibold">
                            Kelas {item.student.classGroup || item.student.grade}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-gray-700 whitespace-nowrap">
                          {formatRupiah(item.target)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {formatRupiah(item.paid)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-rose-700 whitespace-nowrap font-medium">
                          {item.remaining > 0 ? formatRupiah(item.remaining) : 'Rp 0'}
                        </td>

                        <td className="py-3 px-4 min-w-36">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.isLunas ? 'bg-emerald-600' : 'bg-amber-500'
                                }`}
                                style={{ width: `${item.percent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono font-semibold text-gray-600">
                              {item.percent}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {item.isLunas ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              Lunas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-700" />
                              Mengangsur
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleQuickPayStudent(item.student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Setor Infak</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 3: REKAPITULASI & REALISASI ANGGARAN */}
      {activeSubTab === 'rekap' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Rincian Sumber Dana */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Komposisi Sumber Dana Pembangunan
                </h3>
                <p className="text-xs text-gray-500">
                  Perbandingan infak masyarakat/santri dengan subsidi kas madrasah umum
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-baseline mb-1.5 text-xs font-medium">
                  <span className="text-gray-700">Infaq Murni Santri &amp; Donatur Masyarakat</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {formatRupiah(metrics.totalMurniInfaq)} ({metrics.persentaseMurni.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.persentaseMurni}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1.5 text-xs font-medium">
                  <span className="text-gray-700">Subsidi Mutasi dari Kas Umum Madrasah</span>
                  <span className="font-mono font-bold text-amber-800">
                    {formatRupiah(metrics.totalSubsidiMadrasah)} ({metrics.persentaseSubsidi.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${metrics.persentaseSubsidi}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-gray-600 mt-6 leading-relaxed">
                <p className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-700" />
                  Keterangan Kebijakan Subsidi Silang Madrasah:
                </p>
                Ketika infak pembangunan dari siswa atau donatur belum mencukupi untuk memenuhi
                tenggat belanja material atau upah tukang, madrasah dapat mengalokasikan kas umum
                melalui fitur <strong>Mutasi Kas Madrasah</strong> secara sah, transparan, dan tercatat otomatis
                di Buku Kas Umum (BKU).
              </div>
            </div>
          </div>

          {/* Card Rincian Alokasi Belanja */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <HardHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Realisasi Belanja &amp; Pekerjaan Gedung
                </h3>
                <p className="text-xs text-gray-500">
                  Pembagian pengeluaran berdasarkan kategori konstruksi
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {PEMBANGUNAN_EXPENSE_CATEGORIES.map((cat) => {
                const totalInCat = pembangunanTransactions
                  .filter((t) => t.category === cat.id && t.type === 'EXPENSE')
                  .reduce((sum, t) => sum + t.amount, 0);

                const percentOfExpense =
                  metrics.totalExpense > 0 ? (totalInCat / metrics.totalExpense) * 100 : 0;

                return (
                  <div key={cat.id}>
                    <div className="flex justify-between items-baseline mb-1 text-xs">
                      <span className="font-medium text-gray-800">{cat.label}</span>
                      <span className="font-mono font-bold text-gray-900">
                        {formatRupiah(totalInCat)} ({percentOfExpense.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentOfExpense}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: FORM CATAT PEMASUKAN INFAK PEMBANGUNAN          */}
      {/* ======================================================== */}
      {showIncomeModal && (
        <PembangunanIncomeModal
          prefilledStudent={prefilledStudent}
          onClose={() => {
            setShowIncomeModal(false);
            setPrefilledStudent(null);
          }}
          onSuccess={(trx) => {
            setShowIncomeModal(false);
            setPrefilledStudent(null);
            setActiveReceiptTrx(trx);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 2: FORM CATAT PENGELUARAN PEMBANGUNAN             */}
      {/* ======================================================== */}
      {showExpenseModal && (
        <PembangunanExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSuccess={(trx) => {
            setShowExpenseModal(false);
            setActiveReceiptTrx(trx);
          }}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 3: FORM MUTASI KAS MADRASAH KE PEMBANGUNAN        */}
      {/* ======================================================== */}
      {showMutationModal && (
        <PembangunanMutationModal
          onClose={() => setShowMutationModal(false)}
          onSuccess={() => setShowMutationModal(false)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 4: KWITANSI RESMI TANDA TERIMA PEMBANGUNAN        */}
      {/* ======================================================== */}
      {activeReceiptTrx && (
        <PembangunanReceiptModal
          transaction={activeReceiptTrx}
          onClose={() => setActiveReceiptTrx(null)}
        />
      )}

      {/* ======================================================== */}
      {/* MODAL 5: UBAH TARGET INFAK PEMBANGUNAN PER SISWA        */}
      {/* ======================================================== */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-teal-200">
            <div className="p-5 bg-gradient-to-r from-teal-900 to-emerald-900 text-white flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    Ubah Target Infak per Santri
                  </h3>
                  <p className="text-xs text-teal-200/80 mt-0.5">
                    Patokan pelunasan infak pembangunan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (targetInput <= 0) return;
                requireAdmin(() => {
                  updateSchoolProfile({
                    ...schoolProfile,
                    targetInfaqPembangunan: Number(targetInput),
                  });
                  setIsTargetModalOpen(false);
                }, `Ubah Target Infak Menjadi ${formatRupiah(targetInput)}`);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Nominal Target Infak (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="10000"
                    step="50000"
                    required
                    value={targetInput}
                    onChange={(e) => setTargetInput(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 focus:bg-white border border-gray-300 rounded-xl font-mono text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <span className="text-xs text-teal-700 font-semibold block mt-1">
                  Terbaca: {formatRupiah(targetInput)} per siswa
                </span>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                  Pilihan Cepat Target:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[250000, 500000, 750000, 1000000, 1500000, 2000000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetInput(preset)}
                      className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        targetInput === preset
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-teal-50 hover:border-teal-300'
                      }`}
                    >
                      {formatRupiah(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-900 leading-relaxed">
                <p className="font-semibold text-teal-950 mb-0.5">ℹ️ Catatan Sistem:</p>
                Nilai target ini akan menjadi acuan perhitungan status pelunasan santri di seluruh tabel monitoring, laporan infak, serta widget Infak Pembangunan di Dashboard utama.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Target Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ====================================================================
// SUB-COMPONENT: MODAL PEMASUKAN INFAK PEMBANGUNAN
// ====================================================================
interface IncomeModalProps {
  prefilledStudent: Student | null;
  onClose: () => void;
  onSuccess: (newTrx: FinancialTransaction) => void;
}

const PembangunanIncomeModal: React.FC<IncomeModalProps> = ({
  prefilledStudent,
  onClose,
  onSuccess,
}) => {
  const { addTransaction, cashAccounts, students, schoolProfile } = useFinance();

  const [sourceType, setSourceType] = useState<'SISWA' | 'DONATUR'>(
    prefilledStudent ? 'SISWA' : 'SISWA'
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    prefilledStudent?.id || (students[0]?.id ?? '')
  );
  const [donaturName, setDonaturName] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('INFAQ_PEMBANGUNAN_SISWA');
  const [amount, setAmount] = useState<number | ''>(50000);
  const [accountId, setAccountId] = useState<string>(() => {
    // Prefer BSI or Kas Tunai
    const bsi = cashAccounts.find((a) => a.id === 'bank-bsi');
    return bsi ? bsi.id : cashAccounts[0]?.id || 'kas-tunai';
  });
  const [description, setDescription] = useState<string>('Infaq Pembangunan Gedung Madrasah');
  const [proofDocNo, setProofDocNo] = useState<string>('');

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      alert('Nominal infak harus lebih dari 0.');
      return;
    }

    let payer = '';
    let studentId: string | undefined = undefined;
    let studentName: string | undefined = undefined;
    let classGroup: string | undefined = undefined;

    if (sourceType === 'SISWA') {
      if (!selectedStudent) {
        alert('Mohon pilih siswa terlebih dahulu.');
        return;
      }
      payer = selectedStudent.name;
      studentId = selectedStudent.id;
      studentName = selectedStudent.name;
      classGroup = selectedStudent.classGroup || String(selectedStudent.grade);
    } else {
      if (!donaturName.trim()) {
        alert('Mohon masukkan nama donatur / penyetor.');
        return;
      }
      payer = donaturName.trim();
    }

    const catObj = PEMBANGUNAN_INCOME_CATEGORIES.find((c) => c.id === category);
    const categoryLabel = catObj?.label || 'Infaq Pembangunan';

    const newTrx = addTransaction({
      date,
      type: 'INCOME',
      category,
      categoryLabel,
      amount: finalAmount,
      accountId,
      payerOrPayee: payer,
      description,
      proofDocumentNo: proofDocNo || undefined,
      recordedBy: schoolProfile.treasurerName,
      isPembangunan: true,
      studentId,
      studentName,
      classGroup,
    });

    onSuccess(newTrx);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-emerald-300" />
            <h3 className="font-bold text-base">Catat Penerimaan Infak Pembangunan</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipe Penyetor */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Sumber Penerimaan
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSourceType('SISWA');
                  setCategory('INFAQ_PEMBANGUNAN_SISWA');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  sourceType === 'SISWA'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <span>Siswa / Santri MI</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType('DONATUR');
                  setCategory('INFAQ_PEMBANGUNAN_DONATUR');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  sourceType === 'DONATUR'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                }`}
              >
                <HeartHandshake className="w-4 h-4 text-emerald-700" />
                <span>Donatur / Umum / Alumni</span>
              </button>
            </div>
          </div>

          {/* If Siswa: Select Student */}
          {sourceType === 'SISWA' ? (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Pilih Siswa
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - Kelas {s.classGroup || s.grade} (NIS: {s.nis || '-'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Nama Donatur / Pihak Penyetor
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: H. Ahmad Fauzi / Hamba Allah / Alumni 2015"
                value={donaturName}
                onChange={(e) => setDonaturName(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Kategori Penerimaan */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Kategori Infak Pembangunan
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {PEMBANGUNAN_INCOME_CATEGORIES.filter((c) => c.id !== 'MUTASI_SUBSIDI_MADRASAH').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal & Akun Kas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Tanggal Masuk
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Rekening Penampung
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nominal Rupiah */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nominal Setoran Infak (Rp)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-sm sm:text-base font-bold font-mono border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            {Number(amount) > 0 && (
              <p className="text-[11px] text-emerald-800 italic mt-1 font-serif">
                "{terbilang(Number(amount))} Rupiah"
              </p>
            )}
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Keterangan / Peruntukan
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Infak pembangunan ruang kelas baru lantai 2"
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Simpan &amp; Lihat Kwitansi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ====================================================================
// SUB-COMPONENT: MODAL PENGELUARAN PEMBANGUNAN
// ====================================================================
interface ExpenseModalProps {
  onClose: () => void;
  onSuccess: (newTrx: FinancialTransaction) => void;
}

const PembangunanExpenseModal: React.FC<ExpenseModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { addTransaction, cashAccounts, schoolProfile } = useFinance();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('BANGUNAN_MATERIAL');
  const [payee, setPayee] = useState<string>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [accountId, setAccountId] = useState<string>(() => {
    // Prefer BSI or Kas Tunai
    const bsi = cashAccounts.find((a) => a.id === 'bank-bsi');
    return bsi ? bsi.id : cashAccounts[0]?.id || 'kas-tunai';
  });
  const [description, setDescription] = useState<string>('');
  const [proofDocNo, setProofDocNo] = useState<string>('');

  const selectedAccount = cashAccounts.find((a) => a.id === accountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      alert('Nominal pengeluaran harus lebih dari 0.');
      return;
    }

    if (!payee.trim()) {
      alert('Mohon masukkan nama penerima pembayaran / nama toko material.');
      return;
    }

    const catObj = PEMBANGUNAN_EXPENSE_CATEGORIES.find((c) => c.id === category);
    const categoryLabel = catObj?.label || 'Pengeluaran Pembangunan';

    const newTrx = addTransaction({
      date,
      type: 'EXPENSE',
      category,
      categoryLabel,
      amount: finalAmount,
      accountId,
      payerOrPayee: payee.trim(),
      description: description || categoryLabel,
      proofDocumentNo: proofDocNo || undefined,
      recordedBy: schoolProfile.treasurerName,
      isPembangunan: true,
    });

    onSuccess(newTrx);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MinusCircle className="w-5 h-5 text-rose-300" />
            <h3 className="font-bold text-base">Catat Belanja &amp; Upah Pembangunan</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-rose-200 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Kategori Pengeluaran */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Kategori Pengeluaran Gedung
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              {PEMBANGUNAN_EXPENSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Penerima / Toko */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Dibayarkan Kepada (Toko Material / Kepala Tukang / Rekanan)
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: TB Berkah Makmur / Pak Tukang Slamet & Tim"
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Tanggal & Akun Kas Sumber */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Tanggal Pengeluaran
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Sumber Dana Kas
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatRupiah(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nominal Rupiah */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nominal Pengeluaran (Rp)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-sm sm:text-base font-bold font-mono border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none text-rose-900"
            />
            {Number(amount) > 0 && (
              <p className="text-[11px] text-rose-800 italic mt-1 font-serif">
                "{terbilang(Number(amount))} Rupiah"
              </p>
            )}
          </div>

          {/* Nomor Nota / Faktur */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nomor Nota / Bukti Pembelian Toko (Opsional)
            </label>
            <input
              type="text"
              value={proofDocNo}
              onChange={(e) => setProofDocNo(e.target.value)}
              placeholder="Contoh: NOTA-TB-0912 / KWT-TUKANG-01"
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Uraian Rinci */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Uraian Rincian Belanja / Catatan
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Beli 50 sak Semen Gresik @ Rp 68.000 + 2 rit pasir kali Muntilan"
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ====================================================================
// SUB-COMPONENT: MODAL MUTASI KAS MADRASAH UMUM KE PEMBANGUNAN
// ====================================================================
interface MutationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PembangunanMutationModal: React.FC<MutationModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { mutateMadrasahToPembangunan, cashAccounts, requireAdmin } = useFinance();

  const [fromAccountId, setFromAccountId] = useState<string>(() => {
    // Prefer Kas Tunai or BRI BOS
    const kas = cashAccounts.find((a) => a.id === 'kas-tunai');
    return kas ? kas.id : cashAccounts[0]?.id || 'kas-tunai';
  });

  const [toAccountId, setToAccountId] = useState<string>(() => {
    // Prefer BSI for pembangunan
    const bsi = cashAccounts.find((a) => a.id === 'bank-bsi');
    return bsi ? bsi.id : cashAccounts[0]?.id || 'kas-tunai';
  });

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>(500000);
  const [description, setDescription] = useState<string>(
    'Alokasi subsidi kas operasional madrasah untuk biaya pembangunan gedung'
  );
  const [refNo, setRefNo] = useState<string>(() => {
    const d = new Date();
    return `BA-MUT/MAD-BG/${d.getFullYear()}/${Date.now().toString().slice(-4)}`;
  });

  const fromAccount = cashAccounts.find((a) => a.id === fromAccountId);
  const toAccount = cashAccounts.find((a) => a.id === toAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = Number(amount);
    if (!finalAmount || finalAmount <= 0) {
      alert('Nominal mutasi harus lebih besar dari 0.');
      return;
    }

    if (fromAccount && fromAccount.balance < finalAmount) {
      const confirmDeficit = window.confirm(
        `Perhatian: Saldo ${fromAccount.name} saat ini (${formatRupiah(
          fromAccount.balance
        )}) lebih kecil dari nominal subsidi yang diajukan (${formatRupiah(
          finalAmount
        )}).\n\nApakah Anda tetap ingin melanjutkan mutasi subsidi ini?`
      );
      if (!confirmDeficit) return;
    }

    requireAdmin(() => {
      mutateMadrasahToPembangunan({
        fromAccountId,
        toAccountId,
        amount: finalAmount,
        date,
        description: description || 'Subsidi kas madrasah umum ke keuangan pembangunan',
        refNo,
      });

      alert(
        `Mutasi berhasil!\nDana sebesar ${formatRupiah(
          finalAmount
        )} telah dialokasikan ke Kas Pembangunan dan tercatat di Buku Kas Umum (BKU).`
      );
      onSuccess();
    }, 'Otorisasi Mutasi Dana Kas Madrasah ke Pembangunan');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Mutasi Kas Madrasah ke Pembangunan</h3>
              <p className="text-[11px] text-slate-300">Subsidi Silang dari Keuangan Umum</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-amber-50 border-b border-amber-200 p-4 text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Fitur ini memindahkan dana dari pos <strong>keuangan madrasah umum</strong> ke{' '}
            <strong>dana pembangunan gedung</strong>. Transaksi ini akan tercatat ganda secara akurat di Buku Kas Umum (BKU) sebagai pengeluaran kas umum dan penerimaan kas pembangunan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Akun Kas Madrasah Sumber */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Dari Akun Kas Madrasah Umum (Sumber Dana)
            </label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {cashAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — Saldo: {formatRupiah(acc.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Akun Kas Pembangunan Tujuan */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Ke Akun Kas Pembangunan (Penerima Subsidi)
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {cashAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} — Saldo Saat Ini: {formatRupiah(acc.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Nominal Rupiah */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Nominal Subsidi Mutasi (Rp)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-sm sm:text-base font-bold font-mono border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none text-slate-900"
            />
            {Number(amount) > 0 && (
              <p className="text-[11px] text-amber-900 italic mt-1 font-serif">
                "{terbilang(Number(amount))} Rupiah"
              </p>
            )}
          </div>

          {/* Tanggal & No Berita Acara */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Tanggal Mutasi
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                No. Berita Acara Alokasi
              </label>
              <input
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="w-full text-xs sm:text-sm font-mono border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Uraian / Keterangan Keperluan
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Alokasi subsidi kas operasional madrasah untuk percepatan pengecoran dak lantai 2"
              className="w-full text-xs sm:text-sm border border-gray-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              Eksekusi Mutasi Kas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
