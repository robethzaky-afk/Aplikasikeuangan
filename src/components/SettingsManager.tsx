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
  Lock,
  Unlock,
  Shield,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
  Scale,
  Calculator,
  Info,
  AlertCircle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { SchoolProfile, CashAccount } from '../types';
import { formatRupiah } from '../utils/formatters';
import { SupabaseManager } from './SupabaseManager';

interface SettingsManagerProps {
  initialTab?: 'supabase' | 'accounts' | 'profile' | 'security';
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
    isAdmin,
    requireAdmin,
    openAdminPrompt,
    logoutAdmin,
    changeAdminPassword,
    isDefaultPassword,
    autoLockMinutes,
    setAutoLockMinutes,
    cashDiscrepancy,
    cashReconciliationDetails,
    reconcileCashBalances,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'supabase' | 'accounts' | 'profile' | 'security'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [formData, setFormData] = useState<SchoolProfile>({ ...schoolProfile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    setFormData({ ...schoolProfile });
  }, [schoolProfile]);

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
  const [isReconciling, setIsReconciling] = useState(false);

  const handleReconcileCash = () => {
    requireAdmin(async () => {
      setIsReconciling(true);
      const res = await reconcileCashBalances();
      setIsReconciling(false);
      setAccountSaveNotice(res.message);
      setTimeout(() => setAccountSaveNotice(null), 6000);
    }, 'Rekonsiliasi & Penyelarasan Saldo Kas dengan Buku Kas Umum (BKU)');
  };

  // Admin Security Password State
  const [pwdForm, setPwdForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdNotice, setPwdNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdNotice(null);

    if (pwdForm.newPassword.length < 4) {
      setPwdNotice({
        type: 'error',
        message: 'Password baru minimal harus 4 karakter!',
      });
      return;
    }

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdNotice({
        type: 'error',
        message: 'Konfirmasi password baru tidak cocok!',
      });
      return;
    }

    setIsSubmittingPwd(true);
    const res = changeAdminPassword(pwdForm.oldPassword, pwdForm.newPassword);
    setIsSubmittingPwd(false);

    if (res.success) {
      setPwdNotice({
        type: 'success',
        message: res.message,
      });
      setPwdForm({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setPwdNotice(null), 6000);
    } else {
      setPwdNotice({
        type: 'error',
        message: res.message,
      });
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requireAdmin(() => {
      updateSchoolProfile(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 'Simpan Perubahan Profil Madrasah');
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

    requireAdmin(() => {
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
    }, 'Pulihkan Data Keuangan Dari Backup JSON');
  };

  const handleReset = () => {
    requireAdmin(() => {
      if (
        window.confirm(
          "PERINGATAN: Apakah Anda yakin ingin mereset seluruh data aplikasi kembali ke data contoh awal MI Ma'arif Al Ihsan Soborejo?"
        )
      ) {
        resetToDefault();
        alert('Data berhasil direset ke kondisi awal.');
        window.location.reload();
      }
    }, 'Reset Data ke Contoh Awal');
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountData.name.trim()) {
      alert('Nama akun / pos kas wajib diisi!');
      return;
    }

    requireAdmin(() => {
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
    }, 'Tambah Rekening Kas/Bank Baru');
  };

  const handleDeleteAccount = (account: CashAccount) => {
    if (cashAccounts.length <= 1) {
      alert('Minimal harus tersisa satu akun kas/bank pada sistem.');
      return;
    }
    requireAdmin(() => {
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
    }, `Hapus Rekening ${account.name}`);
  };

  const handleClearAllFinancials = async () => {
    requireAdmin(async () => {
      const confirmed = window.confirm(
        `⚠️ KONFIRMASI PENGOSONGAN DATA KEUANGAN:\n\nApakah Anda yakin ingin MENGOSONGKAN SELURUH DATA KEUANGAN saat ini?\n\nYang akan dikosongkan:\n1. Seluruh transaksi Buku Kas Umum (BKU)\n2. Seluruh riwayat pembayaran syahriah / SPP siswa\n3. Seluruh mutasi kas antar-rekening\n4. Saldo seluruh rekening bank & kas diatur ke Rp 0\n\nCatatan: Data profil madrasah dan data siswa tetap aman tersimpan.`
      );
      if (!confirmed) return;

      setIsClearingFinancialData(true);
      const res = await clearAllFinancialData();
      setIsClearingFinancialData(false);
      setAccountSaveNotice(res.message);
      setTimeout(() => setAccountSaveNotice(null), 7000);
    }, 'Kosongkan Seluruh Data Keuangan');
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

          <button
            id="tab-btn-security"
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {isAdmin ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <Lock className="w-4 h-4 text-amber-600" />
            )}
            <span>Keamanan & Mode Admin</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                isAdmin
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isAdmin ? 'Aktif' : 'Terkunci'}
            </span>
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
                onClick={() => {
                  requireAdmin(() => {
                    setIsAddModalOpen(true);
                  }, 'Tambah Rekening Kas/Bank Baru');
                }}
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

          {/* Audit & Rekonsiliasi Saldo Kas vs Buku Kas Umum */}
          <div
            className={`p-5 rounded-xl border transition-all ${
              cashDiscrepancy === 0
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-amber-50/90 border-amber-300 shadow-xs'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    cashDiscrepancy === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-200 text-amber-900'
                  }`}
                >
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-gray-900">
                      Audit &amp; Rekonsiliasi Saldo Kas vs Buku Kas Umum (BKU)
                    </h4>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        cashDiscrepancy === 0
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-200 text-amber-900 border border-amber-400 animate-pulse'
                      }`}
                    >
                      {cashDiscrepancy === 0
                        ? '100% Klop (Sesuai BKU)'
                        : `Selisih: ${formatRupiah(Math.abs(cashDiscrepancy))}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 max-w-3xl leading-relaxed">
                    {cashDiscrepancy === 0
                      ? 'Seluruh saldo yang tersimpan di akun kas madrasah telah terverifikasi dan sesuai dengan akumulasi mutasi transaksi Buku Kas Umum (BKU) dan pembayaran Syahriah santri.'
                      : 'Terdeteksi selisih antara saldo yang tersimpan di kartu akun dengan catatan transaksi riil BKU. Ini bisa terjadi karena pemindahan kas/tarik tunai lama, saldo awal, atau koreksi nominal. Anda dapat menekan tombol di samping untuk langsung menyelaraskan kembali saldo akun secara otomatis.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleReconcileCash}
                  disabled={isReconciling}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs ${
                    cashDiscrepancy === 0
                      ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                      : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white ring-2 ring-emerald-600 ring-offset-1'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
                  <span>
                    {isReconciling
                      ? 'Menyelaraskan...'
                      : cashDiscrepancy === 0
                      ? 'Verifikasi Ulang Saldo'
                      : 'Hitung Ulang & Selaraskan Saldo (1-Klik)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Rincian Audit Per Rekening */}
            <div className="mt-4 pt-4 border-t border-gray-200/80 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="text-gray-500 font-semibold border-b border-gray-200/80">
                    <th className="pb-2">Nama Akun / Rekening</th>
                    <th className="pb-2 text-right">Syahriah Masuk</th>
                    <th className="pb-2 text-right">BKU Masuk</th>
                    <th className="pb-2 text-right">BKU Keluar</th>
                    <th className="pb-2 text-right">Saldo Riil BKU</th>
                    <th className="pb-2 text-right">Saldo di Akun</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cashReconciliationDetails.map((item) => (
                    <tr key={item.accountId} className="hover:bg-white/50">
                      <td className="py-2.5 font-medium text-gray-900">
                        <div>{item.accountName}</div>
                        {item.accountNumber && (
                          <div className="text-[10px] text-gray-400 font-mono">
                            {item.bankName} - {item.accountNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-700">
                        {formatRupiah(item.syahriahIn)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-teal-700">
                        {formatRupiah(item.trxIn)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-rose-700">
                        {formatRupiah(item.trxOut)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-gray-900">
                        {formatRupiah(Math.max(0, item.computedBalance))}
                      </td>
                      <td className="py-2.5 text-right font-mono text-gray-700">
                        {formatRupiah(item.recordedBalance)}
                      </td>
                      <td className="py-2.5 text-center">
                        {item.isBalanced ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Klop
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            Selisih {formatRupiah(Math.abs(item.discrepancy))}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                        onClick={() => {
                          requireAdmin(() => {
                            setEditingAccount({ ...account });
                          }, `Ubah Konfigurasi Rekening ${account.name}`);
                        }}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            {/* Bagian Patokan Tarif & Target Siswa */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-emerald-700" />
                <span>Patokan Tarif Standar & Target Pembayaran Santri</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-950">
                    Tarif Standar Syahriah (Rp/Bulan)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.standardSyahriah ?? ''}
                    onChange={(e) => setFormData({ ...formData, standardSyahriah: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    Besaran iuran syahriah bulanan standar untuk setiap santri (default: Rp 20.000/bulan).
                  </p>
                </div>

                <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200/80 space-y-1.5">
                  <label className="block text-xs font-bold text-teal-950">
                    Target Infak Pembangunan per Siswa (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formData.targetInfaqPembangunan ?? ''}
                    onChange={(e) => setFormData({ ...formData, targetInfaqPembangunan: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg text-sm font-mono font-bold text-teal-900 focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                  <p className="text-[11px] text-teal-700 leading-relaxed">
                    Target patokan kewajiban infak pembangunan yang harus dilunasi setiap siswa/santri (default: Rp 500.000).
                  </p>
                </div>
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

      {/* Security & Admin Mode Tab View */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Status Hero Card */}
          <div
            className={`p-6 rounded-2xl border transition-all ${
              isAdmin
                ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border-emerald-300 shadow-sm'
                : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border-amber-300 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isAdmin
                      ? 'bg-emerald-700 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {isAdmin ? (
                    <ShieldCheck className="w-7 h-7" />
                  ) : (
                    <Lock className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-emerald-200 text-emerald-950'
                          : 'bg-amber-200 text-amber-950'
                      }`}
                    >
                      {isAdmin ? 'Mode Admin Aktif' : 'Aplikasi Terkunci (Mode Tamu)'}
                    </span>
                    {isDefaultPassword && (
                      <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md font-semibold">
                        Password Bawaan
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mt-1.5">
                    {isAdmin
                      ? 'Hak Akses Penuh Bendahara Aktif'
                      : 'Transaksi & Pencatatan Keuangan Dilindungi'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-2xl leading-relaxed">
                    {isAdmin
                      ? 'Anda dapat mencatat pembayaran syahriah, transaksi kas umum, memutasi dana kas, mengubah data siswa, dan mengelola rekening bank.'
                      : 'Siapapun dapat melihat saldo dan mencetak laporan, namun setiap aksi pencatatan atau perubahan transaksi keuangan wajib memasukkan password admin.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Keluar dari Mode Admin dan kunci aplikasi ke Mode Tamu sekarang?')) {
                        logoutAdmin();
                      }
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-rose-600" />
                    <span>Kunci Aplikasi Sekarang</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAdminPrompt('Aktivasi Hak Akses Admin Bendahara')}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Buka Kunci Akses Admin</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Change Password Form (7 cols) */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-700" />
                  <span>Ubah Password Admin Bendahara</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Perbarui kata sandi admin untuk menjaga keamanan buku kas dan data pembayaran siswa.
                </p>
              </div>

              {isDefaultPassword && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Peringatan Keamanan:</span> Saat ini aplikasi masih menggunakan kata sandi bawaan pabrik (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">admin123</code>). Segera ubah password Anda di bawah ini!
                  </div>
                </div>
              )}

              {pwdNotice && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    pwdNotice.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {pwdNotice.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{pwdNotice.message}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                {/* Old Password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Password Lama Saat Ini *
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPwd ? 'text' : 'password'}
                      required
                      placeholder="Masukkan password saat ini (default: admin123)"
                      value={pwdForm.oldPassword}
                      onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                      className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPwd(!showOldPwd)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Password Baru *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="Minimal 4 karakter"
                        value={pwdForm.newPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                        className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Konfirmasi Password Baru *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPwd ? 'text' : 'password'}
                        required
                        minLength={4}
                        placeholder="Ketik ulang password baru"
                        value={pwdForm.confirmPassword}
                        onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                        className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    Password disimpan terenkripsi secara aman pada perangkat lokal bendahara.
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingPwd}
                    className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSubmittingPwd ? 'Menyimpan...' : 'Perbarui Password Admin'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Auto-Lock & Privileges (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Inactivity Auto-Lock Setting Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-700" />
                    <span>Kunci Otomatis (Auto-Lock)</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Sistem akan secara otomatis kembali ke Mode Tamu jika tidak ada aktivitas dalam waktu yang ditentukan untuk mencegah akses tanpa izin saat komputer ditinggal.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Batas Waktu Ketidakaktifan:
                  </label>
                  <select
                    value={autoLockMinutes}
                    onChange={(e) => {
                      const mins = Number(e.target.value);
                      setAutoLockMinutes(mins);
                    }}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={5}>5 Menit (Sangat Aman)</option>
                    <option value={10}>10 Menit</option>
                    <option value={15}>15 Menit</option>
                    <option value={30}>30 Menit (Standar Rekomendasi)</option>
                    <option value={60}>60 Menit (1 Jam)</option>
                    <option value={0}>Nonaktif (Hanya Kunci Manual)</option>
                  </select>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    {autoLockMinutes === 0
                      ? '⚠️ Auto-lock dinonaktifkan. Pastikan mengunci aplikasi secara manual.'
                      : `✓ Aplikasi akan mengunci otomatis setelah ${autoLockMinutes} menit tanpa aktivitas mouse/keyboard.`}
                  </p>
                </div>
              </div>

              {/* Security Privileges Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  <span>Daftar Hak Akses & Proteksi Data</span>
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Pencatatan & Hapus Syahriah</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Dilindungi Password
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Kas Masuk, Kas Keluar & Mutasi</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Dilindungi Password
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Tambah/Ubah Rekening Bank</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Dilindungi Password
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Kelola & Impor Data Santri</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Dilindungi Password
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="text-gray-700 font-medium">Lihat Saldo & Cetak Laporan BKU</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                      Mode Tamu (Bebas)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
