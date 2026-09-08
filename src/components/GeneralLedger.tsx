import React, { useState, useMemo } from 'react';
import {
  BookOpenCheck,
  Printer,
  ArrowLeftRight,
  Filter,
  Download,
  Calendar,
  Wallet,
  TrendingUp,
  TrendingDown,
  Building2,
  CheckCircle,
  Receipt,
  Search,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  formatRupiah,
  formatDateIndo,
  getTodayDateString,
} from '../utils/formatters';

export const GeneralLedger: React.FC = () => {
  const {
    schoolProfile,
    cashAccounts,
    transactions,
    syahriahPayments,
    transferCash,
    setActiveReceipt,
  } = useFinance();

  // Filters
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountId: cashAccounts[0]?.id || 'kas-tunai',
    toAccountId: cashAccounts[1]?.id || 'bank-bsi',
    amount: '',
    description: 'Tarik tunai untuk operasional harian madrasah',
  });

  // Handle transfer
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(transferData.amount.replace(/\D/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Masukkan jumlah nominal mutasi yang valid!');
      return;
    }
    if (transferData.fromAccountId === transferData.toAccountId) {
      alert('Akun asal dan akun tujuan tidak boleh sama!');
      return;
    }

    const sourceAcc = cashAccounts.find((a) => a.id === transferData.fromAccountId);
    if (sourceAcc && sourceAcc.balance < numericAmount) {
      alert(`Saldo pada ${sourceAcc.name} tidak mencukupi!`);
      return;
    }

    transferCash(
      transferData.fromAccountId,
      transferData.toAccountId,
      numericAmount,
      transferData.description
    );

    setIsTransferModalOpen(false);
  };

  // Build unified chronological ledger entries
  const unifiedEntries = useMemo(() => {
    // 1. Syahriah payments as income entries
    const syahriahEntries = syahriahPayments.map((p) => ({
      id: p.id,
      date: p.paymentDate,
      refNo: p.receiptNo,
      type: 'INCOME' as const,
      category: 'SYAHRIAH',
      categoryLabel: 'Penerimaan Syahriah / SPP',
      description: `Syahriah ${p.studentName} (${p.classGroup}) bulan ${p.months.join(', ')}`,
      payerOrPayee: p.studentName,
      accountId: p.accountId,
      debit: p.totalAmount, // Masuk (Debit)
      kredit: 0, // Keluar (Kredit)
      rawPayment: p,
      createdAt: p.createdAt,
    }));

    // 2. Other financial transactions
    const otherEntries = transactions.map((t) => ({
      id: t.id,
      date: t.date,
      refNo: t.refNo,
      type: t.type,
      category: t.category,
      categoryLabel: t.categoryLabel,
      description: t.description,
      payerOrPayee: t.payerOrPayee,
      accountId: t.accountId,
      debit: t.type === 'INCOME' ? t.amount : 0,
      kredit: t.type === 'EXPENSE' ? t.amount : 0,
      rawPayment: null,
      createdAt: t.createdAt,
    }));

    // Combine and sort chronologically ascending (older to newer) for correct running balance calculation
    const all = [...syahriahEntries, ...otherEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Apply account filter before calculating running balance if specific account chosen
    const filteredByAccount =
      selectedAccountId === 'ALL'
        ? all
        : all.filter((entry) => entry.accountId === selectedAccountId);

    // Calculate running balance
    let currentBalance = 0;
    const withRunningBalance = filteredByAccount.map((entry) => {
      currentBalance = currentBalance + entry.debit - entry.kredit;
      return {
        ...entry,
        runningBalance: currentBalance,
      };
    });

    // Sort descending (newest on top) for convenient user viewing in the app
    return withRunningBalance.reverse();
  }, [syahriahPayments, transactions, selectedAccountId]);

  // Filter by search query
  const displayedEntries = useMemo(() => {
    return unifiedEntries.filter((e) => {
      const q = searchQuery.toLowerCase();
      return (
        e.refNo.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.categoryLabel.toLowerCase().includes(q) ||
        e.payerOrPayee.toLowerCase().includes(q)
      );
    });
  }, [unifiedEntries, searchQuery]);

  const totalDebit = displayedEntries.reduce((sum, e) => sum + e.debit, 0);
  const totalKredit = displayedEntries.reduce((sum, e) => sum + e.kredit, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - hidden when printing */}
      <div className="print:hidden bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Buku Kas Umum (BKU)
            </span>
            <span className="text-xs text-gray-500">
              Standar Administrasi Keuangan Madrasah
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Buku Kas Umum & Mutasi Keuangan
          </h2>
          <p className="text-xs text-gray-500">
            Pencatatan arus kas masuk (debit), kas keluar (kredit), dan saldo berjalan secara otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Pindah Kas / Tarik Tunai</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak BKU Resmi</span>
          </button>
        </div>
      </div>

      {/* Printable Header (Visible ONLY during print) */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-4">
        <h2 className="text-sm font-semibold uppercase">{schoolProfile.institution}</h2>
        <h1 className="text-xl font-bold uppercase">{schoolProfile.name}</h1>
        <p className="text-xs">
          {schoolProfile.address}, {schoolProfile.village}, Kec. {schoolProfile.district}, {schoolProfile.regency}
        </p>
        <p className="text-xs">NSM: {schoolProfile.nsm} | NPSN: {schoolProfile.npsn}</p>
        <div className="mt-3">
          <h3 className="text-base font-bold underline uppercase">BUKU KAS UMUM (BKU) MADRASAH</h3>
          <p className="text-xs">Tahun Pelajaran {schoolProfile.academicYear}</p>
        </div>
      </div>

      {/* Account Balance Snapshot */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cashAccounts.map((acc) => (
          <div
            key={acc.id}
            onClick={() => setSelectedAccountId(selectedAccountId === acc.id ? 'ALL' : acc.id)}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedAccountId === acc.id
                ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{acc.name}</span>
              {selectedAccountId === acc.id && (
                <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                  Aktif Filter
                </span>
              )}
            </div>
            <p className="text-xl font-bold font-mono text-gray-900 mt-1">
              {formatRupiah(acc.balance)}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">{acc.description}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar - hidden when printing */}
      <div className="print:hidden bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">Filter Kas:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Semua Pos Kas (Gabungan)</option>
            {cashAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari no. bukti, uraian, pihak..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-emerald-800 text-white uppercase font-semibold text-[11px] print:bg-gray-100 print:text-black">
              <tr>
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3 min-w-[95px]">Tanggal</th>
                <th className="py-3 px-3 min-w-[130px]">No. Bukti</th>
                <th className="py-3 px-4 min-w-[240px]">Uraian Transaksi</th>
                <th className="py-3 px-3 min-w-[120px]">Pihak / Rekanan</th>
                <th className="py-3 px-3 text-right min-w-[110px]">Pemasukan (Debit)</th>
                <th className="py-3 px-3 text-right min-w-[110px]">Pengeluaran (Kredit)</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Saldo Kas</th>
                <th className="py-3 px-2 text-center w-14 print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayedEntries.map((entry, idx) => {
                const isIncome = entry.debit > 0;
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-gray-500 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-gray-700">
                      {formatDateIndo(entry.date)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-gray-800">
                      {entry.refNo}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-gray-900">
                      <span className="block">{entry.description}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        Kategori: {entry.categoryLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {entry.payerOrPayee}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                      {entry.debit > 0 ? formatRupiah(entry.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-semibold whitespace-nowrap">
                      {entry.kredit > 0 ? formatRupiah(entry.kredit) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-gray-900 whitespace-nowrap bg-gray-50/50 print:bg-white">
                      {formatRupiah(entry.runningBalance)}
                    </td>
                    <td className="py-2.5 px-2 text-center print:hidden">
                      {entry.rawPayment && (
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(entry.rawPayment)}
                          title="Cetak Kwitansi"
                          className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-bold border-t-2 border-emerald-800 text-xs text-gray-900 print:bg-white">
              <tr>
                <td colSpan={5} className="py-3 px-4 text-right uppercase">
                  Jumlah Mutasi Pada Halaman Ini:
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-800">
                  {formatRupiah(totalDebit)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-rose-800">
                  {formatRupiah(totalKredit)}
                </td>
                <td colSpan={2} className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Printable Signatures block */}
        <div className="hidden print:grid grid-cols-2 mt-12 text-center text-xs text-gray-800">
          <div>
            <p>Mengetahui,</p>
            <p className="font-semibold">Kepala MI Ma'arif Al Ihsan Soborejo</p>
            <div className="h-20 flex items-end justify-center">
              <div>
                <p className="font-bold underline uppercase">{schoolProfile.headmasterName}</p>
                <p className="text-[10px]">NIP: {schoolProfile.headmasterNip || '-'}</p>
              </div>
            </div>
          </div>
          <div>
            <p>Soborejo, ....................................</p>
            <p className="font-semibold">Bendahara Madrasah</p>
            <div className="h-20 flex items-end justify-center">
              <div>
                <p className="font-bold underline uppercase">{schoolProfile.treasurerName}</p>
                <p className="text-[10px]">NIP / NUPTK: -</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: PINDAH KAS / MUTASI INTERNAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-800 text-white">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-base">Pindah Kas / Tarik Tunai Bank</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-blue-200 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4 text-sm">
              <p className="text-xs text-gray-500">
                Pencatatan perpindahan saldo antar pos kas madrasah (misalnya dari rekening bank ke kas tunai bendahara atau sebaliknya).
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dari Akun Kas (Sumber Dana) *
                </label>
                <select
                  value={transferData.fromAccountId}
                  onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatRupiah(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ke Akun Kas (Tujuan Masuk) *
                </label>
                <select
                  value={transferData.toAccountId}
                  onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatRupiah(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Jumlah Nominal Mutasi (Rupiah) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 2.000.000"
                    value={transferData.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTransferData({
                        ...transferData,
                        amount: val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '',
                      });
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-base font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Keterangan / Keperluan Mutasi
                </label>
                <input
                  type="text"
                  required
                  value={transferData.description}
                  onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                  placeholder="Contoh: Tarik tunai untuk operasional harian"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Proses Mutasi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
