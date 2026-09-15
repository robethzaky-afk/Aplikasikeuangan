import React, { useState, useMemo } from 'react';
import {
  X,
  Edit3,
  TrendingUp,
  TrendingDown,
  Save,
  AlertCircle,
  Building2,
  Calendar,
  Wallet,
  Receipt,
  FileText,
  User,
} from 'lucide-react';
import {
  FinancialTransaction,
  TransactionType,
} from '../types';
import { useFinance } from '../context/FinanceContext';
import {
  OTHER_INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
} from '../data/initialData';
import {
  formatRupiah,
} from '../utils/formatters';

interface EditTransactionModalProps {
  transaction: FinancialTransaction;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  onClose,
}) => {
  const { cashAccounts, schoolProfile, updateTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [date, setDate] = useState<string>(transaction.date);
  const [category, setCategory] = useState<string>(transaction.category);
  const [categoryLabel, setCategoryLabel] = useState<string>(
    transaction.categoryLabel || ''
  );
  const [amountFormatted, setAmountFormatted] = useState<string>(() => {
    return new Intl.NumberFormat('id-ID').format(transaction.amount || 0);
  });
  const [accountId, setAccountId] = useState<string>(
    transaction.accountId || cashAccounts[0]?.id || 'kas-tunai'
  );
  const [payerOrPayee, setPayerOrPayee] = useState<string>(
    transaction.payerOrPayee || ''
  );
  const [description, setDescription] = useState<string>(
    transaction.description || ''
  );
  const [proofDocumentNo, setProofDocumentNo] = useState<string>(
    transaction.proofDocumentNo || ''
  );

  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Category list based on active type
  const availableCategories = useMemo(() => {
    return type === 'INCOME' ? OTHER_INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }, [type]);

  const handleTypeChange = (newType: TransactionType) => {
    if (newType === type) return;
    setType(newType);
    const catList = newType === 'INCOME' ? OTHER_INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setCategory(catList[0].id);
    setCategoryLabel(catList[0].label);
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategory(newCatId);
    const found = availableCategories.find((c) => c.id === newCatId);
    if (found) {
      setCategoryLabel(found.label);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setAmountFormatted('');
      return;
    }
    const num = Number(rawDigits);
    setAmountFormatted(new Intl.NumberFormat('id-ID').format(num));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    const numericAmount = parseFloat(amountFormatted.replace(/\D/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorNotice('Nominal transaksi harus lebih dari Rp 0!');
      return;
    }

    if (!description.trim()) {
      setErrorNotice('Uraian transaksi tidak boleh kosong!');
      return;
    }

    if (!payerOrPayee.trim()) {
      setErrorNotice(
        type === 'INCOME'
          ? 'Pihak penyetor / sumber dana wajib diisi!'
          : 'Pihak penerima pembayaran wajib diisi!'
      );
      return;
    }

    setIsSaving(true);
    try {
      const updated: FinancialTransaction = {
        ...transaction,
        type,
        date,
        category,
        categoryLabel: categoryLabel || category,
        amount: numericAmount,
        accountId,
        payerOrPayee: payerOrPayee.trim(),
        description: description.trim(),
        proofDocumentNo: proofDocumentNo.trim() || undefined,
        recordedBy: schoolProfile.treasurerName || transaction.recordedBy,
      };

      updateTransaction(updated);
      onClose();
    } catch (err: any) {
      setErrorNotice(err.message || 'Gagal menyimpan pembaruan transaksi.');
      setIsSaving(false);
    }
  };

  return (
    <div
      id="edit-transaction-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="edit-transaction-modal-card"
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 my-8 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 text-white ${
            type === 'INCOME' ? 'bg-emerald-800' : 'bg-rose-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                type === 'INCOME' ? 'bg-emerald-700' : 'bg-rose-700'
              }`}
            >
              {type === 'INCOME' ? (
                <TrendingUp className="w-5 h-5 text-emerald-200" />
              ) : (
                <TrendingDown className="w-5 h-5 text-rose-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">
                  Edit Catatan Transaksi Kas
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold">
                  {transaction.refNo}
                </span>
              </div>
              <p className="text-xs text-white/80">
                Ubah rincian, nominal, tanggal, atau pos kas yang terpengaruh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {errorNotice && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Toggle Jenis Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Jenis Mutasi Transaksi *
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'INCOME'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Pemasukan Kas (Debit)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'EXPENSE'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Pengeluaran Kas (Kredit)</span>
              </button>
            </div>
          </div>

          {/* Nominal Transaksi */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Jumlah Nominal (Rupiah) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-gray-500 font-mono text-base">
                Rp
              </span>
              <input
                type="text"
                required
                value={amountFormatted}
                onChange={handleAmountChange}
                placeholder="Contoh: 1.500.000"
                className={`w-full pl-12 pr-4 py-2.5 border rounded-xl text-base font-mono font-bold focus:outline-none focus:ring-2 ${
                  type === 'INCOME'
                    ? 'border-emerald-300 focus:ring-emerald-500 text-emerald-900 bg-emerald-50/20'
                    : 'border-rose-300 focus:ring-rose-500 text-rose-900 bg-rose-50/20'
                }`}
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Saldo pos kas lama akan dipulihkan dan disesuaikan otomatis dengan nominal baru.
            </p>
          </div>

          {/* Tanggal & Kategori */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tanggal Transaksi *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Kategori Pos *
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                {!availableCategories.some((c) => c.id === category) && (
                  <option value={category}>{categoryLabel || category}</option>
                )}
              </select>
            </div>
          </div>

          {/* Pos Kas / Rekening */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {type === 'INCOME' ? 'Masuk ke Pos Kas / Rekening *' : 'Diambil dari Pos Kas / Rekening *'}
            </label>
            <div className="relative">
              <Wallet className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo saat ini: {formatRupiah(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pihak Terkait */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {type === 'INCOME'
                ? 'Diterima Dari (Penyetor / Sumber Dana) *'
                : 'Dibayarkan Kepada (Penerima / Rekanan / Toko) *'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={payerOrPayee}
                onChange={(e) => setPayerOrPayee(e.target.value)}
                placeholder={
                  type === 'INCOME'
                    ? 'Contoh: Kemenag Temanggung, Donatur, Komite'
                    : 'Contoh: Ust. Ahmad Fauzi, Toko ATK Berkah, PLN'
                }
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Uraian Keperluan */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Uraian / Keterangan Keperluan *
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rincian peruntukan dana atau kegiatan secara lengkap..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm resize-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Nomor Bukti / Dokumen */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nomor Bukti / Kuitansi / Nota / SP2D (Opsional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={proofDocumentNo}
                onChange={(e) => setProofDocumentNo(e.target.value)}
                placeholder="Contoh: NOTA/892, SP2D-KEMENAG/089"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                type === 'INCOME'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              } ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
