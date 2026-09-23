import React, { useState, useMemo } from 'react';
import {
  Wallet,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Building2,
  Landmark,
  ArrowRight,
  Clock,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Receipt,
  PiggyBank,
  Plus,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  HardHat,
  Users,
  Info,
  ShieldCheck,
  Lock,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { NavTab } from './Navbar';
import { ACADEMIC_MONTHS, AcademicMonth } from '../types';

interface DashboardProps {
  onNavigate: (tab: NavTab, subTab?: 'supabase' | 'accounts' | 'profile') => void;
  onOpenQuickSyahriah: () => void;
  onOpenQuickTrx: (type?: 'INCOME' | 'EXPENSE') => void;
  onOpenQuickPembangunan?: (action?: 'INCOME' | 'EXPENSE' | 'MUTATION') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onOpenQuickSyahriah,
  onOpenQuickTrx,
  onOpenQuickPembangunan,
}) => {
  const {
    schoolProfile,
    totalCashBalance,
    totalSyahriahIncome,
    totalOtherIncome,
    totalExpenseOverall,
    netIncomeOverall,
    cashDiscrepancy,
    cashAccounts,
    students,
    syahriahPayments,
    transactions,
    isMonthPaid,
    setActiveReceipt,
    isAdmin,
    requireAdmin,
    openAdminPrompt,
    reconcileCashBalances,
  } = useFinance();

  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);

  const handleQuickReconcile = async () => {
    setIsReconciling(true);
    const res = await reconcileCashBalances();
    setIsReconciling(false);
    setReconcileNotice(res.message);
    setTimeout(() => setReconcileNotice(null), 6000);
  };

  // Current month in Indonesian school year
  const currentMonthIdx = new Date().getMonth(); // 0-11
  // Map standard calendar month to academic months (July = month index 6, but index 0 in academic year)
  // Let's pick current month name or default to 'September' for the sample year
  const currentAcademicMonth: AcademicMonth = 'September';

  // Calculate Syahriah progress for current month
  const activeStudents = students.filter((s) => s.status === 'AKTIF');
  const paidCount = activeStudents.filter((s) => isMonthPaid(s.id, currentAcademicMonth)).length;
  const unpaidCount = activeStudents.length - paidCount;
  const progressPercent = activeStudents.length > 0 ? Math.round((paidCount / activeStudents.length) * 100) : 0;

  // Class by class syahriah stats
  const classProgress = [1, 2, 3, 4, 5, 6].map((grade) => {
    const classStudents = activeStudents.filter((s) => s.grade === grade);
    const classPaid = classStudents.filter((s) => isMonthPaid(s.id, currentAcademicMonth)).length;
    const pct = classStudents.length > 0 ? Math.round((classPaid / classStudents.length) * 100) : 0;
    return {
      grade,
      label: `Kelas ${grade}`,
      total: classStudents.length,
      paid: classPaid,
      percent: pct,
    };
  });

  // Comprehensive Pembangunan metrics for dashboard monitoring
  const pembangunanTrx = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.isPembangunan ||
        t.category === 'INFAQ_PEMBANGUNAN' ||
        t.category.startsWith('INFAQ_PEMBANGUNAN_') ||
        t.category === 'MUTASI_SUBSIDI_MADRASAH' ||
        t.category.startsWith('BANGUNAN_') ||
        t.category === 'WAKAF_PEMBANGUNAN' ||
        t.category === 'PEMBANGUNAN_INCOME_LAIN'
    );
  }, [transactions]);

  const pembangunanIncome = useMemo(() => {
    return pembangunanTrx
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [pembangunanTrx]);

  const pembangunanMurniIncome = useMemo(() => {
    return pembangunanTrx
      .filter((t) => t.type === 'INCOME' && t.category !== 'MUTASI_SUBSIDI_MADRASAH')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [pembangunanTrx]);

  const pembangunanSubsidiIncome = useMemo(() => {
    return pembangunanTrx
      .filter((t) => t.type === 'INCOME' && t.category === 'MUTASI_SUBSIDI_MADRASAH')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [pembangunanTrx]);

  const pembangunanExpense = useMemo(() => {
    return pembangunanTrx
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [pembangunanTrx]);

  const materialExpense = useMemo(() => {
    return pembangunanTrx
      .filter((t) => t.type === 'EXPENSE' && t.category === 'BANGUNAN_MATERIAL')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [pembangunanTrx]);

  const upahExpense = useMemo(() => {
    return pembangunanTrx
      .filter((t) => t.type === 'EXPENSE' && t.category === 'BANGUNAN_UPAH_TUKANG')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [pembangunanTrx]);

  const otherPembangunanExpense = pembangunanExpense - (materialExpense + upahExpense);

  const pembangunanBalance = pembangunanIncome - pembangunanExpense;

  // Student infaq aggregation
  const targetPerStudent = schoolProfile.targetInfaqPembangunan || 500000;
  const studentInfaqMap = useMemo(() => {
    const map = new Map<string, number>();
    pembangunanTrx.forEach((t) => {
      if (t.type === 'INCOME' && t.studentId) {
        map.set(t.studentId, (map.get(t.studentId) || 0) + t.amount);
      }
    });
    return map;
  }, [pembangunanTrx]);

  const lunasStudentCount = students.filter(
    (s) => (studentInfaqMap.get(s.id) || 0) >= targetPerStudent
  ).length;
  const mengangsurStudentCount = students.length - lunasStudentCount;
  const totalInfaqSiswaTerkumpul = students.reduce(
    (sum, s) => sum + (studentInfaqMap.get(s.id) || 0),
    0
  );
  const totalTargetSiswa = students.length * targetPerStudent;
  const progressSiswaPercent =
    totalTargetSiswa > 0
      ? Math.min(100, Math.round((totalInfaqSiswaTerkumpul / totalTargetSiswa) * 100))
      : 0;

  // 4 latest pembangunan transactions
  const recentPembangunanTrx = useMemo(() => {
    return [...pembangunanTrx]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id))
      .slice(0, 4);
  }, [pembangunanTrx]);

  // Recent 6 activities (combining syahriah and general transactions)
  const recentSyahriah = syahriahPayments.slice(0, 4).map((p) => ({
    id: p.id,
    type: 'SYAHRIAH' as const,
    title: `Syahriah: ${p.studentName} (${p.classGroup})`,
    subtitle: `Bulan ${p.months.join(', ')} • ${p.receiptNo}`,
    amount: p.totalAmount,
    date: p.paymentDate,
    rawPayment: p,
  }));

  const recentTransactions = transactions.slice(0, 4).map((t) => ({
    id: t.id,
    type: t.type,
    title: t.categoryLabel,
    subtitle: `${t.payerOrPayee} • ${t.refNo}`,
    amount: t.amount,
    date: t.date,
    rawPayment: null,
  }));

  const combinedRecent = [...recentSyahriah, ...recentTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-900/60 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-200 mb-2 border border-emerald-600/40">
              <span>Tahun Ajaran {schoolProfile.academicYear}</span>
              <span>•</span>
              <span>Bendahara: {schoolProfile.treasurerName}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Sistem Keuangan Bendahara Madrasah
            </h2>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Pengelolaan terpadu Syahriah santri, Kas Operasional, Dana BOS Kemenag, dan Infaq Pembangunan {schoolProfile.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-dash-pay-syahriah"
              type="button"
              onClick={() => requireAdmin(onOpenQuickSyahriah, 'Pencatatan Pembayaran Syahriah')}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl font-semibold text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <GraduationCap className="w-4 h-4 text-amber-900" />
              <span>+ Bayar Syahriah</span>
            </button>
            <button
              id="btn-dash-income"
              type="button"
              onClick={() => requireAdmin(() => onOpenQuickTrx('INCOME'), 'Pencatatan Pemasukan Kas')}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <TrendingUp className="w-4 h-4 text-emerald-200" />
              <span>+ Kas Masuk</span>
            </button>
            <button
              id="btn-dash-expense"
              type="button"
              onClick={() => requireAdmin(() => onOpenQuickTrx('EXPENSE'), 'Pencatatan Pengeluaran Kas')}
              className="px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl font-medium text-sm border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <TrendingDown className="w-4 h-4 text-rose-300" />
              <span>+ Kas Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Security Banner (shown when in Guest / Read-Only mode) */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                Mode Akses Terproteksi (Hanya Lihat)
              </h4>
              <p className="text-xs text-amber-850">
                Seluruh laporan, mutasi kas, dan rekap syahriah dapat dipantau. Untuk mencatat pembayaran atau mengubah data keuangan, masukkan password admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openAdminPrompt('Buka Akses Penuh Admin Bendahara')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Buka Mode Admin</span>
          </button>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kas */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Saldo Seluruh Kas
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-gray-900">
              {formatRupiah(totalCashBalance)}
            </h3>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-medium">Aktif</span> di 3 rekening madrasah
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bku')}
            className="mt-3 pt-3 border-t border-gray-100 text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center justify-between cursor-pointer"
          >
            <span>Buka Buku Kas Umum</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total Syahriah */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Penerimaan Syahriah
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-blue-900">
              {formatRupiah(totalSyahriahIncome)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Dari {syahriahPayments.length} transaksi pembayaran
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('syahriah')}
            className="mt-3 pt-3 border-t border-gray-100 text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center justify-between cursor-pointer"
          >
            <span>Kelola Syahriah Siswa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pemasukan Lainnya */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pemasukan Lainnya (BOS, dll)
            </span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-teal-900">
              {formatRupiah(totalOtherIncome)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              BOS, Infaq Gedung, PPDB & Donasi
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('other-finances')}
            className="mt-3 pt-3 border-t border-gray-100 text-xs font-medium text-teal-700 hover:text-teal-800 flex items-center justify-between cursor-pointer"
          >
            <span>Rincian Pemasukan Lain</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Pengeluaran Kas
            </span>
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-700">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold font-mono text-rose-900">
              {formatRupiah(totalExpenseOverall)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Gaji Guru, Sarpras, ATK, Listrik/Wifi
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('other-finances')}
            className="mt-3 pt-3 border-t border-gray-100 text-xs font-medium text-rose-700 hover:text-rose-800 flex items-center justify-between cursor-pointer"
          >
            <span>Rincian Pengeluaran</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAMPILAN MONITORING KEUANGAN KHUSUS INFAK PEMBANGUNAN     */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-emerald-800/40 relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute right-0 top-0 bottom-0 opacity-5 pointer-events-none flex items-center pr-6">
          <Building2 className="w-80 h-80 text-emerald-100" />
        </div>

        <div className="relative z-10 space-y-6">
          {/* Header Monitoring */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950 uppercase tracking-wider shadow-xs">
                  <Building2 className="w-3.5 h-3.5" />
                  Pos Khusus Dana Pembangunan
                </span>
                <span className="text-xs text-emerald-300 font-mono">
                  LP Ma'arif NU Al Ihsan Soborejo
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Monitoring Ketersediaan Dana Pembangunan</span>
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/85 mt-1 max-w-2xl leading-relaxed">
                Pemantauan real-time saldo kas pembangunan, serapan belanja material &amp; upah tukang, serta alokasi subsidi dari kas madrasah umum untuk memudahkan bendahara.
              </p>
            </div>

            {/* Aksi Cepat Bendahara Langsung dari Dashboard */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  requireAdmin(
                    () => (onOpenQuickPembangunan ? onOpenQuickPembangunan('INCOME') : onNavigate('pembangunan')),
                    'Pencatatan Pemasukan Infak Pembangunan'
                  )
                }
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-950" />
                <span>+ Catat Infak</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  requireAdmin(
                    () => (onOpenQuickPembangunan ? onOpenQuickPembangunan('EXPENSE') : onNavigate('pembangunan')),
                    'Pencatatan Belanja Pembangunan'
                  )
                }
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MinusCircle className="w-4 h-4" />
                <span>+ Belanja Gedung</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  requireAdmin(
                    () => (onOpenQuickPembangunan ? onOpenQuickPembangunan('MUTATION') : onNavigate('pembangunan')),
                    'Mutasi Subsidi Kas Madrasah ke Pembangunan'
                  )
                }
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-slate-950" />
                <span>↔ Mutasi Kas Madrasah</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('pembangunan')}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Buka Tab Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4 Cards Grid Khusus Monitoring Pembangunan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Ketersediaan Saldo Kas Pembangunan */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-4.5 flex flex-col justify-between hover:bg-white/[0.13] transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Sisa Kas Pembangunan
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h4 className="text-xl sm:text-2xl font-black font-mono text-white">
                    {formatRupiah(pembangunanBalance)}
                  </h4>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pembangunanBalance >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {pembangunanBalance >= 0 ? '✓ Dana Tersedia' : '⚠ Perlu Tambahan Dana'}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-100/70 mt-3 pt-2.5 border-t border-white/10">
                Saldo siap digunakan untuk pembayaran material &amp; upah tukang.
              </p>
            </div>

            {/* Card 2: Total Penerimaan & Porsi Subsidi */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-4.5 flex flex-col justify-between hover:bg-white/[0.13] transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Total Dana Dihimpun
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-400 text-slate-950 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h4 className="text-xl sm:text-2xl font-black font-mono text-emerald-300">
                    {formatRupiah(pembangunanIncome)}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-emerald-100/80">
                    <span>Infaq Murni: <strong className="text-white">{formatRupiah(pembangunanMurniIncome)}</strong></span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-emerald-100/70">Subsidi Kas Madrasah:</span>
                <span className="font-mono font-bold text-amber-300">
                  {formatRupiah(pembangunanSubsidiIncome)}
                </span>
              </div>
            </div>

            {/* Card 3: Realisasi Belanja & Upah */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-4.5 flex flex-col justify-between hover:bg-white/[0.13] transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Realisasi Belanja &amp; Upah
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-400 text-slate-950 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h4 className="text-xl sm:text-2xl font-black font-mono text-rose-300">
                    {formatRupiah(pembangunanExpense)}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-rose-100/80">
                    <span>Material: <strong className="text-white">{formatRupiah(materialExpense)}</strong></span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-rose-100/70">Upah Tukang &amp; Pekerja:</span>
                <span className="font-mono font-bold text-white">
                  {formatRupiah(upahExpense)}
                </span>
              </div>
            </div>

            {/* Card 4: Capaian Infak Siswa / Santri */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-4.5 flex flex-col justify-between hover:bg-white/[0.13] transition-colors">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Infak Terkumpul Santri
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-sky-400 text-slate-950 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h4 className="text-xl sm:text-2xl font-black font-mono text-sky-200">
                    {formatRupiah(totalInfaqSiswaTerkumpul)}
                  </h4>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1 bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all"
                        style={{ width: `${progressSiswaPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300">
                      {progressSiswaPercent}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-emerald-100/70">Status Santri:</span>
                <span className="font-semibold text-emerald-300">
                  {lunasStudentCount} Lunas • {mengangsurStudentCount} Mengangsur
                </span>
              </div>
            </div>
          </div>

          {/* Lower Section: Recent Pembangunan Feed & Kas Madrasah Support */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            {/* Feed Transaksi Terkini Pembangunan (Span 2) */}
            <div className="lg:col-span-2 bg-black/25 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Arus Transaksi Terkini Pembangunan
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('pembangunan')}
                  className="text-[11px] font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Semua Buku Kas</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {recentPembangunanTrx.length === 0 ? (
                <div className="py-6 text-center text-xs text-emerald-200/60">
                  Belum ada transaksi pembangunan tercatat. Klik tombol <strong>+ Catat Infak</strong> atau <strong>↔ Mutasi Kas Madrasah</strong> di atas untuk memulai pencatatan.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentPembangunanTrx.map((trx) => {
                    const isIncome = trx.type === 'INCOME';
                    const isMutation = trx.category === 'MUTASI_SUBSIDI_MADRASAH';
                    return (
                      <div
                        key={trx.id}
                        className="bg-white/5 hover:bg-white/10 rounded-lg p-2.5 border border-white/5 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isMutation
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                : isIncome
                                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-rose-400/20 text-rose-300 border border-rose-400/40'
                            }`}
                          >
                            {isMutation ? (
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            ) : isIncome ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate">
                                {trx.payerOrPayee}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  isMutation
                                    ? 'bg-amber-900/60 text-amber-200'
                                    : isIncome
                                    ? 'bg-emerald-900/60 text-emerald-200'
                                    : 'bg-rose-900/60 text-rose-200'
                                }`}
                              >
                                {isMutation ? 'Subsidi Madrasah' : isIncome ? 'Infak Masuk' : 'Belanja'}
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-100/70 truncate mt-0.5">
                              {trx.description || trx.categoryLabel}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-bold font-mono ${
                              isIncome ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatRupiah(trx.amount)}
                          </span>
                          <span className="block text-[10px] text-emerald-100/50">
                            {formatDateIndo(trx.date)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rekomendasi & Dukungan Kas Madrasah Umum */}
            <div className="bg-black/25 rounded-xl p-4 border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-white/10">
                  <Landmark className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    Dukungan Kas Madrasah Umum
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-3">
                  <span className="text-[11px] text-emerald-200/80 block">
                    Saldo Tersedia Seluruh Kas Madrasah:
                  </span>
                  <span className="text-lg font-bold font-mono text-amber-300">
                    {formatRupiah(totalCashBalance)}
                  </span>
                </div>

                <p className="text-xs text-emerald-100/80 leading-relaxed">
                  Jika infak santri belum mencukupi kebutuhan pembelanjaan material atau upah tukang yang mendesak, bendahara dapat mengalokasikan subsidi kas umum ke pos pembangunan.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  requireAdmin(
                    () => (onOpenQuickPembangunan ? onOpenQuickPembangunan('MUTATION') : onNavigate('pembangunan')),
                    'Mutasi Subsidi Kas Madrasah ke Pembangunan'
                  )
                }
                className="mt-4 w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Salurkan Subsidi ke Pembangunan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rincian Akun Kas Madrasah */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Rincian Pos Kas & Rekening Bank</h3>
            <p className="text-xs text-gray-500">Saldo riil yang tersimpan di kas tunai dan rekening resmi madrasah</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => requireAdmin(() => onNavigate('settings', 'accounts'), 'Pengelolaan Rekening Bank & Kas')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs border border-emerald-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah / Kelola Bank</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('bku')}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Mutasi Kas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notice Rekonsiliasi Sukses */}
        {reconcileNotice && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{reconcileNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setReconcileNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Status Sinkronisasi & Rekonsiliasi Saldo Kas */}
        {cashDiscrepancy !== 0 ? (
          <div className="mb-4 p-4 rounded-xl bg-amber-50/95 border border-amber-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-amber-950">
                    Terdeteksi Selisih Saldo Kas: {formatRupiah(Math.abs(cashDiscrepancy))}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    Perlu Penyelarasan
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
                  Saldo akun tercatat ({formatRupiah(totalCashBalance)}) berbeda dengan akumulasi bersih BKU ({formatRupiah(netIncomeOverall)}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleQuickReconcile}
                disabled={isReconciling}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
                <span>{isReconciling ? 'Menyelaraskan...' : 'Selaraskan Saldo (1-Klik)'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('settings', 'accounts')}
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Rincian Audit
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 px-3.5 py-2 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">
                Saldo Seluruh Kas 100% Klop &amp; Sesuai Mutasi Transaksi BKU
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('settings', 'accounts')}
              className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              Lihat Audit Akun
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cashAccounts.map((account) => {
            const isCash = account.type === 'CASH';
            return (
              <div
                key={account.id}
                className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white hover:border-emerald-300 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {isCash ? 'Kas Tunai' : 'Rekening Bank'}
                    </span>
                    {isCash ? (
                      <PiggyBank className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Landmark className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mt-2">{account.name}</h4>
                  {account.accountNumber && (
                    <p className="text-xs font-mono text-gray-500">
                      {account.bankName} • {account.accountNumber}
                    </p>
                  )}
                  <div className="mt-3">
                    <span className="text-xs text-gray-500">Saldo Saat Ini:</span>
                    <p className="text-xl font-bold font-mono text-emerald-800">
                      {formatRupiah(account.balance)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-[11px] text-gray-500 line-clamp-1 flex-1">{account.description || '-'}</p>
                  <button
                    type="button"
                    onClick={() => requireAdmin(() => onNavigate('settings', 'accounts'), 'Pengelolaan Rekening Kas')}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    Edit / Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Columns: Syahriah Collection Progress & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Syahriah Status per Class (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Target Syahriah Bulan {currentAcademicMonth}
                </h3>
                <p className="text-xs text-gray-500">Tingkat kepatuhan pembayaran SPP per kelas</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                {progressPercent}% Terkumpul
              </span>
            </div>

            {/* Main Progress Bar */}
            <div className="space-y-1 mb-5">
              <div className="flex justify-between text-xs font-medium text-gray-700">
                <span>{paidCount} Siswa Lunas</span>
                <span className="text-rose-600">{unpaidCount} Belum Lunas</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Per Class Breakdown */}
            <div className="space-y-3">
              {classProgress.map((item) => (
                <div key={item.grade} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-800">{item.label}</span>
                    <span className="text-gray-500">
                      <strong className="text-emerald-700 font-bold">{item.paid}</strong> / {item.total} siswa ({item.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        item.percent === 100
                          ? 'bg-emerald-600'
                          : item.percent > 50
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('syahriah')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Matriks Lengkap (12 Bulan)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-gray-400">Tarif: {formatRupiah(schoolProfile.standardSyahriah)}/bln</span>
          </div>
        </div>

        {/* Right: Recent Financial Activities Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Aktivitas Transaksi Terbaru</h3>
                <p className="text-xs text-gray-500">Catatan mutasi syahriah dan pos keuangan madrasah</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('bku')}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Seluruh Kas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {combinedRecent.map((item) => {
                const isExpense = item.type === 'EXPENSE';
                const isSyahriah = item.type === 'SYAHRIAH';

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50/60 rounded-lg px-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSyahriah
                            ? 'bg-blue-100 text-blue-700'
                            : isExpense
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isSyahriah ? (
                          <Receipt className="w-4 h-4" />
                        ) : isExpense ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {formatDateIndo(item.date)} • {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span
                          className={`text-sm font-bold font-mono block ${
                            isExpense ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {isExpense ? '-' : '+'}
                          {formatRupiah(item.amount)}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase">
                          {isSyahriah ? 'Syahriah' : isExpense ? 'Keluar' : 'Masuk'}
                        </span>
                      </div>

                      {item.rawPayment && (
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(item.rawPayment)}
                          title="Cetak Kwitansi"
                          className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Sistem pencatatan real-time bendahara
            </span>
            <span className="text-emerald-700 font-medium">MI Ma'arif Al Ihsan Soborejo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
