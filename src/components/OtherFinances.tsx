import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Receipt,
  FileText,
  Building2,
  Landmark,
  Calendar,
  Check,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  FinancialTransaction,
  TransactionType,
} from '../types';
import {
  OTHER_INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../data/initialData';
import {
  formatRupiah,
  formatDateIndo,
  getTodayDateString,
} from '../utils/formatters';

interface OtherFinancesProps {
  initialOpenType?: 'INCOME' | 'EXPENSE' | null;
}

export const OtherFinances: React.FC<OtherFinancesProps> = ({
  initialOpenType = null,
}) => {
  const {
    transactions,
    cashAccounts,
    schoolProfile,
    addTransaction,
    deleteTransaction,
    setEditingTransaction,
    isAdmin,
    requireAdmin,
    openAdminPrompt,
  } = useFinance();

  // Active filter tab
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(initialOpenType !== null);
  const [modalType, setModalType] = useState<TransactionType>(initialOpenType || 'INCOME');
  const [formData, setFormData] = useState({
    date: getTodayDateString(),
    category: OTHER_INCOME_CATEGORIES[0].id,
    categoryLabel: OTHER_INCOME_CATEGORIES[0].label,
    amount: '',
    accountId: cashAccounts[0]?.id || 'kas-tunai',
    payerOrPayee: '',
    description: '',
    proofDocumentNo: '',
  });

  const openAddModal = (type: TransactionType) => {
    requireAdmin(() => {
      setModalType(type);
      const defaultCat =
        type === 'INCOME'
          ? OTHER_INCOME_CATEGORIES[0]
          : EXPENSE_CATEGORIES[0];

      // default account: if BOS category, default to BRI BOS account
      const defaultAccount =
        defaultCat.id === 'DANA_BOS'
          ? cashAccounts.find((a) => a.id === 'bank-bri-bos')?.id || cashAccounts[0]?.id
          : cashAccounts[0]?.id;

      setFormData({
        date: getTodayDateString(),
        category: defaultCat.id,
        categoryLabel: defaultCat.label,
        amount: '',
        accountId: defaultAccount || 'kas-tunai',
        payerOrPayee: '',
        description: '',
        proofDocumentNo: '',
      });
      setIsModalOpen(true);
    }, type === 'INCOME' ? 'Pencatatan Pemasukan Kas Baru' : 'Pencatatan Pengeluaran Kas Baru');
  };

  const handleCategoryChange = (catId: string) => {
    const list = modalType === 'INCOME' ? OTHER_INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const found = list.find((c) => c.id === catId);
    let targetAcc = formData.accountId;

    // auto select account for BOS
    if (catId === 'DANA_BOS') {
      const bosAcc = cashAccounts.find((a) => a.id === 'bank-bri-bos');
      if (bosAcc) targetAcc = bosAcc.id;
    } else if (catId === 'INFAQ_PEMBANGUNAN') {
      const bsiAcc = cashAccounts.find((a) => a.id === 'bank-bsi');
      if (bsiAcc) targetAcc = bsiAcc.id;
    }

    setFormData((prev) => ({
      ...prev,
      category: catId,
      categoryLabel: found?.label || catId,
      accountId: targetAcc,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formData.amount.replace(/\D/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Mohon masukkan jumlah nominal yang valid!');
      return;
    }

    addTransaction({
      date: formData.date,
      type: modalType,
      category: formData.category,
      categoryLabel: formData.categoryLabel,
      amount: numericAmount,
      accountId: formData.accountId,
      payerOrPayee: formData.payerOrPayee || (modalType === 'INCOME' ? 'Penyetor Kas' : 'Penerima Pembayaran'),
      description: formData.description,
      proofDocumentNo: formData.proofDocumentNo,
      recordedBy: schoolProfile.treasurerName,
    });

    setIsModalOpen(false);
  };

  // Filtered transactions (excluding internal mutasi for clarity)
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => !t.category.startsWith('MUTASI_'))
      .filter((t) => (filterType === 'ALL' ? true : t.type === filterType))
      .filter((t) => (selectedCategory === 'ALL' ? true : t.category === selectedCategory))
      .filter((t) => {
        const q = searchQuery.toLowerCase();
        return (
          t.categoryLabel.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.payerOrPayee.toLowerCase().includes(q) ||
          t.refNo.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterType, selectedCategory, searchQuery]);

  // Totals for the current filtered view
  const summaryIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const summaryExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
              Pos Keuangan Operasional
            </span>
            <span className="text-xs text-gray-500">
              Dana BOS, Infaq Gedung, Gaji Guru, ATK & Kegiatan
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Pengelolaan Keuangan Lainnya
          </h2>
          <p className="text-xs text-gray-500">
            Catatan penerimaan non-syahriah dan seluruh pengeluaran operasional madrasah
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => openAddModal('INCOME')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            <span>+ Catat Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => openAddModal('EXPENSE')}
            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <TrendingDown className="w-4 h-4" />
            <span>+ Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Notice Tab Khusus Pembangunan */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold text-emerald-900 block">
              Tersedia Tab Khusus: Pengelolaan Infak Pembangunan &amp; Mutasi Kas Madrasah
            </span>
            <span className="text-emerald-800/90">
              Kelola infak siswa &amp; donatur, belanja material/upah tukang, serta mutasi subsidi kas madrasah umum secara terpusat di menu <strong>Infak Pembangunan</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards for Filtered Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Total Pemasukan Lain Terfilter
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-emerald-800 mt-2">
            {formatRupiah(summaryIncome)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Total Pengeluaran Terfilter
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-mono text-rose-800 mt-2">
            {formatRupiah(summaryExpense)}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Surplus / Defisit Periode
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-xl font-bold font-mono mt-2 ${
              summaryIncome - summaryExpense >= 0 ? 'text-blue-800' : 'text-amber-800'
            }`}
          >
            {formatRupiah(summaryIncome - summaryExpense)}
          </p>
        </div>
      </div>

      {/* Main Transactions Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          {/* Type Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Semua Pos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('INCOME')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterType === 'INCOME'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pemasukan Saja
            </button>
            <button
              type="button"
              onClick={() => setFilterType('EXPENSE')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                filterType === 'EXPENSE'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Pengeluaran Saja
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari uraian, pihak terkait, no ref..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">No. Bukti / Ref</th>
                <th className="py-3 px-3">Tanggal</th>
                <th className="py-3 px-3">Pos & Kategori</th>
                <th className="py-3 px-3">Uraian / Keterangan</th>
                <th className="py-3 px-3">Pihak / Rekanan</th>
                <th className="py-3 px-3">Akun Kas</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((t) => {
                const isIncome = t.type === 'INCOME';
                const accountName = cashAccounts.find((a) => a.id === t.accountId)?.name || t.accountId;

                return (
                  <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-800">
                      {t.refNo}
                    </td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                      {formatDateIndo(t.date)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.categoryLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-900 max-w-xs">
                      <p className="line-clamp-2">{t.description}</p>
                      {t.proofDocumentNo && (
                        <span className="text-[10px] font-mono text-gray-400">
                          Doc: {t.proofDocumentNo}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-700">
                      {t.payerOrPayee}
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px]">
                        {accountName}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold text-sm whitespace-nowrap ${
                        isIncome ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isIncome ? '+' : '-'} {formatRupiah(t.amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            requireAdmin(() => {
                              setEditingTransaction(t);
                            }, `Edit Transaksi Kas ${t.refNo}`);
                          }}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Catatan Transaksi"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            requireAdmin(() => {
                              if (
                                window.confirm(
                                  `Hapus transaksi ${t.refNo} (${formatRupiah(t.amount)})? Saldo kas akan dipulihkan otomatis.`
                                )
                              ) {
                                deleteTransaction(t.id);
                              }
                            }, `Hapus Transaksi Kas ${t.refNo}`);
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Belum ada catatan transaksi pada filter ini.</p>
          </div>
        )}
      </div>

      {/* FORM MODAL: CATAT PEMASUKAN / PENGELUARAN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 my-8">
            <div
              className={`flex items-center justify-between px-6 py-4 text-white ${
                modalType === 'INCOME' ? 'bg-emerald-800' : 'bg-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {modalType === 'INCOME' ? (
                  <TrendingUp className="w-5 h-5 text-emerald-300" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-rose-300" />
                )}
                <h3 className="font-bold text-base">
                  {modalType === 'INCOME'
                    ? 'Catat Pemasukan Kas Madrasah'
                    : 'Catat Pengeluaran Kas Madrasah'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              {/* Type Toggle in Modal */}
              <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  type="button"
                  onClick={() => openAddModal('INCOME')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    modalType === 'INCOME'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pemasukan (Kas Masuk)
                </button>
                <button
                  type="button"
                  onClick={() => openAddModal('EXPENSE')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    modalType === 'EXPENSE'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pengeluaran (Kas Keluar)
                </button>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kategori Pos Keuangan *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {(modalType === 'INCOME'
                    ? OTHER_INCOME_CATEGORIES
                    : EXPENSE_CATEGORIES
                  ).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Jumlah Nominal (Rupiah) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1.500.000"
                    value={formData.amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFormData({
                        ...formData,
                        amount: val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '',
                      });
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-base font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Date & Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Transaksi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {modalType === 'INCOME' ? 'Masuk ke Pos Kas' : 'Diambil dari Pos Kas'} *
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {cashAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatRupiah(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payer or Payee */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {modalType === 'INCOME' ? 'Diterima Dari (Penyetor / Sumber Dana)' : 'Dibayarkan Kepada (Penerima / Toko / Guru)'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    modalType === 'INCOME'
                      ? 'Contoh: Kemenag Temanggung, Donatur, Wali Santri'
                      : 'Contoh: Ust. Ahmad Fauzi, Toko ATK Berkah, PLN'
                  }
                  value={formData.payerOrPayee}
                  onChange={(e) => setFormData({ ...formData, payerOrPayee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Uraian / Keterangan Keperluan *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Rincian peruntukan dana atau kegiatan..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                />
              </div>

              {/* Proof Document Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nomor Bukti / Kuitansi / Nota / SP2D (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: NOTA/892, SP2D-KEMENAG/089"
                  value={formData.proofDocumentNo}
                  onChange={(e) => setFormData({ ...formData, proofDocumentNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-colors cursor-pointer ${
                    modalType === 'INCOME'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
