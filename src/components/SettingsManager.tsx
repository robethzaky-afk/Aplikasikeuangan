import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  School,
  ShieldAlert,
  Database,
  Landmark,
  PiggyBank,
  Edit,
  RefreshCw,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { SchoolProfile, CashAccount } from '../types';
import { formatRupiah } from '../utils/formatters';
import { SupabaseManager } from './SupabaseManager';

interface SettingsManagerProps {
  initialTab?: 'supabase' | 'accounts' | 'profile';
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  initialTab = 'accounts',
}) => {
  const {
    schoolProfile,
    updateSchoolProfile,
    cashAccounts,
    updateCashAccount,
    addCashAccount,
    deleteCashAccount,
    syncFinancialsWithCloud,
    clearAllFinancialData,
    exportDataJson,
    importDataJson,
    resetToDefault,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'supabase' | 'accounts' | 'profile'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [formData, setFormData] = useState<SchoolProfile>({ ...schoolProfile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Editing cash account state
  const [editingAccount, setEditingAccount] = useState<CashAccount | null>(null);
  const [accountSaveNotice, setAccountSaveNotice] = useState<string | null>(null);
  const [isSyncingAccounts, setIsSyncingAccounts] = useState(false);

  // Add new bank account state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAccountData, setNewAccountData] = useState<Omit<CashAccount, 'id'>>({
    name: '',
    bankName: '',
    accountNumber: '',
    type: 'BANK',
    balance: 0,
    description: '',
  });

  // Clear financial data state
  const [isClearingFinancialData, setIsClearingFinancialData] = useState(false);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `backup_keuangan_mi_soborejo_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDataJson(content);
        if (success) {
          setImportStatus('Data berhasil dipulihkan dari file cadangan!');
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          alert('Format file cadangan tidak valid atau rusak.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    if (
      window.confirm(
        "PERINGATAN: Apakah Anda yakin ingin mereset seluruh data aplikasi kembali ke data contoh awal MI Ma'arif Al Ihsan Soborejo?"
      )
    ) {
      resetToDefault();
      alert('Data berhasil direset ke kondisi awal.');
      window.location.reload();
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountData.name.trim()) {
      alert('Nama akun / pos kas wajib diisi!');
      return;
    }

    const created = addCashAccount(newAccountData);
    setIsAddModalOpen(false);
    setNewAccountData({
      name: '',
      bankName: '',
      accountNumber: '',
      type: 'BANK',
      balance: 0,
      description: '',
    });
    setAccountSaveNotice(
      `Rekening "${created.name}" berhasil ditambahkan dan disinkronkan ke Supabase Cloud.`
    );
    setTimeout(() => setAccountSaveNotice(null), 5000);
  };

  const handleDeleteAccount = (account: CashAccount) => {
    if (cashAccounts.length <= 1) {
      alert('Minimal harus tersisa satu akun kas/bank pada sistem.');
      return;
    }
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus rekening "${account.name}" (${account.bankName || 'Kas Tunai'})?\n\nRekening ini akan dihapus dari aplikasi dan database Supabase Cloud.`
      )
    ) {
      deleteCashAccount(account.id);
      if (editingAccount?.id === account.id) {
        setEditingAccount(null);
      }
      setAccountSaveNotice(`Rekening "${account.name}" berhasil dihapus.`);
      setTimeout(() => setAccountSaveNotice(null), 5000);
    }
  };

  const handleClearAllFinancials = async () => {
    const confirmed = window.confirm(
      `⚠️ KONFIRMASI PENGOSONGAN DATA KEUANGAN:\n\nApakah Anda yakin ingin MENGOSONGKAN SELURUH DATA KEUANGAN saat ini?\n\nYang akan dikosongkan:\n1. Seluruh transaksi Buku Kas Umum (BKU)\n2. Seluruh riwayat pembayaran syahriah / SPP siswa\n3. Seluruh mutasi kas antar-rekening\n4. Saldo seluruh rekening bank & kas diatur ke Rp 0\n\nCatatan: Data profil madrasah dan data siswa tetap aman tersimpan.`
    );
    if (!confirmed) return;

    setIsClearingFinancialData(true);
    const res = await clearAllFinancialData();
    setIsClearingFinancialData(false);
    setAccountSaveNotice(res.message);
    setTimeout(() => setAccountSaveNotice(null), 7000);
  };

  return (
    <div className="space-y-6">
      {/* Header Card with Navigation Tabs */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Konfigurasi Sistem
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Pengaturan & Database Cloud
          </h2>
          <p className="text-xs text-gray-500">
            Kelola database cloud Supabase, identitas resmi madrasah, tarif standar syahriah, dan cadangan data.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'supabase'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Database Supabase Cloud</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'accounts'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Landmark className="w-4 h-4 text-emerald-600" />
            <span>Rekening Bank & Kas ({cashAccounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <School className="w-4 h-4 text-emerald-600" />
            <span>Profil & Backup Lokal</span>
          </button>
        </div>
      </div>

      {/* Supabase Tab View */}
      {activeTab === 'supabase' && <SupabaseManager />}

      {/* Accounts & Bank Management Tab View */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {accountSaveNotice && (
            <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{accountSaveNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setAccountSaveNotice(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Accounts Header Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-700" />
                <span>Pos Kas Tunai & Rekening Bank Madrasah</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Kelola daftar rekening bank resmi dan pos kas tunai. Data otomatis tersinkron dengan cloud Supabase.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Bank / Pos Kas Baru</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setIsSyncingAccounts(true);
                  const res = await syncFinancialsWithCloud();
                  setIsSyncingAccounts(false);
                  setAccountSaveNotice(res.message);
                  setTimeout(() => setAccountSaveNotice(null), 5000);
                }}
                disabled={isSyncingAccounts}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingAccounts ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncingAccounts
                    ? 'Menyinkronkan...'
                    : 'Sinkronkan ke Cloud'}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Action: Kosongkan Semua Data Keuangan */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-950">
                  Kosongkan Semua Data Keuangan Saat Ini
                </h4>
                <p className="text-xs text-amber-800/90 mt-0.5 max-w-2xl leading-relaxed">
                  Menghapus seluruh transaksi Buku Kas Umum (BKU), mutasi kas, dan riwayat pembayaran syahriah serta mereset saldo semua rekening bank/kas ke Rp 0. Data profil madrasah &amp; santri tetap aman.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearAllFinancials}
              disabled={isClearingFinancialData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isClearingFinancialData ? 'animate-spin' : ''}`} />
              <span>{isClearingFinancialData ? 'Mengosongkan...' : 'Kosongkan Data Keuangan'}</span>
            </button>
          </div>

          {/* Cards Grid of Accounts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cashAccounts.map((account) => {
              const isCash = account.type === 'CASH';
              return (
                <div
                  key={account.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {isCash ? 'Kas Tunai' : 'Rekening Bank'}
                      </span>
                      {isCash ? (
                        <PiggyBank className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Landmark className="w-5 h-5 text-blue-600" />
                      )}
                    </div>

                    <h4 className="text-base font-bold text-gray-900 mt-3">
                      {account.name}
                    </h4>

                    {account.bankName && (
                      <div className="mt-1 text-xs">
                        <span className="text-gray-500 font-medium">Nama Bank: </span>
                        <span className="font-semibold text-gray-800">
                          {account.bankName}
                        </span>
                      </div>
                    )}

                    {account.accountNumber && (
                      <div className="text-xs mt-0.5">
                        <span className="text-gray-500 font-medium">No. Rekening: </span>
                        <span className="font-mono font-bold text-emerald-700">
                          {account.accountNumber}
                        </span>
                      </div>
                    )}

                    <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="text-[11px] text-gray-500 block">Saldo Saat Ini:</span>
                      <span className="text-xl font-bold font-mono text-emerald-800">
                        {formatRupiah(account.balance)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                      {account.description || 'Tidak ada catatan tambahan.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-gray-400 truncate max-w-[80px]">
                      {account.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(account)}
                        title="Hapus Rekening"
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAccount({ ...account })}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edit Account Modal / Inline Drawer */}
          {editingAccount && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Edit Data Rekening & Pos Kas
                      </h3>
                      <p className="text-xs text-gray-500">
                        ID: <span className="font-mono">{editingAccount.id}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editingAccount) return;
                    updateCashAccount(editingAccount);
                    setAccountSaveNotice(
                      `Rekening ${editingAccount.name} berhasil diperbarui & otomatis tersinkron ke Supabase!`
                    );
                    setEditingAccount(null);
                    setTimeout(() => setAccountSaveNotice(null), 4000);
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Label / Nama Akun di Aplikasi
                    </label>
                    <input
                      type="text"
                      required
                      value={editingAccount.name}
                      onChange={(e) =>
                        setEditingAccount({ ...editingAccount, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Nama Bank Resmi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Bank Syariah Indonesia"
                        value={editingAccount.bankName || ''}
                        onChange={(e) =>
                          setEditingAccount({
                            ...editingAccount,
                            bankName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Nomor Rekening
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 7145829910"
                        value={editingAccount.accountNumber || ''}
                        onChange={(e) =>
                          setEditingAccount({
                            ...editingAccount,
                            accountNumber: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Tipe Akun
                      </label>
                      <select
                        value={editingAccount.type}
                        onChange={(e) =>
                          setEditingAccount({
                            ...editingAccount,
                            type: e.target.value as 'CASH' | 'BANK',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="BANK">Rekening Bank</option>
                        <option value="CASH">Kas Tunai</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Saldo Kas (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={editingAccount.balance}
                        onChange={(e) =>
                          setEditingAccount({
                            ...editingAccount,
                            balance: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Deskripsi / Keterangan Pos Kas
                    </label>
                    <textarea
                      rows={2}
                      value={editingAccount.description || ''}
                      onChange={(e) =>
                        setEditingAccount({
                          ...editingAccount,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(editingAccount)}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Rekening</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAccount(null)}
                        className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>Simpan & Sinkron ke Supabase</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Add New Bank / Account Modal */}
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Tambah Rekening Bank / Pos Kas Baru
                      </h3>
                      <p className="text-xs text-gray-500">
                        Data rekening baru akan disimpan dan disinkronkan ke Supabase Cloud.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Nama / Label Pos Kas *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bank Jateng Operasional, BCA Yayasan, dll"
                      value={newAccountData.name}
                      onChange={(e) =>
                        setNewAccountData({ ...newAccountData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Nama Bank Resmi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Bank Jateng, BCA, Mandiri"
                        value={newAccountData.bankName || ''}
                        onChange={(e) =>
                          setNewAccountData({
                            ...newAccountData,
                            bankName: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Nomor Rekening
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 1029384756"
                        value={newAccountData.accountNumber || ''}
                        onChange={(e) =>
                          setNewAccountData({
                            ...newAccountData,
                            accountNumber: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Tipe Akun *
                      </label>
                      <select
                        value={newAccountData.type}
                        onChange={(e) =>
                          setNewAccountData({
                            ...newAccountData,
                            type: e.target.value as 'CASH' | 'BANK',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="BANK">Rekening Bank</option>
                        <option value="CASH">Kas Tunai</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Saldo Awal (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={newAccountData.balance}
                        onChange={(e) =>
                          setNewAccountData({
                            ...newAccountData,
                            balance: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Deskripsi / Peruntukan Rekening
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Digunakan untuk penampungan dana bantuan dan operasional madrasah"
                      value={newAccountData.description || ''}
                      onChange={(e) =>
                        setNewAccountData({
                          ...newAccountData,
                          description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Simpan & Tambah ke Cloud</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile & Local Backup Tab View */}
      {activeTab === 'profile' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: School Profile Form (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
            <div className="flex items-center gap-2">
              <School className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-base text-gray-900">
                Profil Identitas Madrasah & Pejabat
              </h3>
            </div>
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Perubahan tersimpan
              </span>
            )}
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Madrasah
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lembaga Naungan
                </label>
                <input
                  type="text"
                  required
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  NSM (Nomor Statistik)
                </label>
                <input
                  type="text"
                  value={formData.nsm}
                  onChange={(e) => setFormData({ ...formData, nsm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  NPSN
                </label>
                <input
                  type="text"
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  No. Telepon / WA Madrasah
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Alamat Jalan & No
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kabupaten / Kota
                </label>
                <input
                  type="text"
                  value={formData.regency}
                  onChange={(e) => setFormData({ ...formData, regency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Kepala Madrasah (Beserta Gelar)
                </label>
                <input
                  type="text"
                  required
                  value={formData.headmasterName}
                  onChange={(e) => setFormData({ ...formData, headmasterName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  NIP Kepala Madrasah (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.headmasterNip || ''}
                  onChange={(e) => setFormData({ ...formData, headmasterNip: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Bendahara Madrasah
                </label>
                <input
                  type="text"
                  required
                  value={formData.treasurerName}
                  onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tahun Pelajaran Aktif
                </label>
                <input
                  type="text"
                  required
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tarif Standar Syahriah (Rp/Bulan)
                </label>
                <input
                  type="number"
                  required
                  value={formData.standardSyahriah}
                  onChange={(e) => setFormData({ ...formData, standardSyahriah: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Backup, Restore & Reset (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Backup Box */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Cadangkan Data (Backup)</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Simpan seluruh data siswa, riwayat pembayaran syahriah, transaksi kas, dan pengaturan ke komputer dalam format JSON aman.
            </p>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File Cadangan (.JSON)</span>
            </button>
          </div>

          {/* Restore Box */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-700" />
              <span>Pulihkan Data (Restore)</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Upload file cadangan JSON yang pernah diunduh untuk mengembalikan data keuangan sebelumnya.
            </p>

            {importStatus && (
              <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs">
                {importStatus}
              </div>
            )}

            <label className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 block text-center">
              <Upload className="w-4 h-4 inline" />
              <span>Pilih File Backup (.JSON)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Clear Financials Box */}
          <div className="bg-amber-50/60 p-5 rounded-xl border border-amber-200 space-y-3">
            <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>Kosongkan Semua Data Keuangan</span>
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Mengosongkan Buku Kas Umum (BKU), mutasi kas, dan riwayat pembayaran syahriah serta mereset saldo bank/kas ke Rp 0. Data santri & profil madrasah tetap utuh.
            </p>
            <button
              type="button"
              onClick={handleClearAllFinancials}
              disabled={isClearingFinancialData}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isClearingFinancialData ? 'animate-spin' : ''}`} />
              <span>{isClearingFinancialData ? 'Sedang Mengosongkan...' : 'Kosongkan Data Keuangan'}</span>
            </button>
          </div>

          {/* Reset Box */}
          <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-200 space-y-3">
            <h3 className="font-bold text-sm text-rose-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Reset ke Contoh Awal</span>
            </h3>
            <p className="text-xs text-rose-700 leading-relaxed">
              Kembalikan data ke contoh sampel asli MI Ma'arif Al Ihsan Soborejo (berguna untuk latihan atau demonstrasi).
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2 px-3 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Sampel</span>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
