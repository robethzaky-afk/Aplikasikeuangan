import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Terminal,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SCHEMA_SQL,
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
import { useFinance } from '../context/FinanceContext';

export const SupabaseManager: React.FC = () => {
  const {
    schoolProfile,
    updateSchoolProfile,
    students,
    syahriahPayments,
    cashAccounts,
    transactions,
  } = useFinance();

  const [status, setStatus] = useState<{
    loading: boolean;
    connected: boolean;
    tablesFound: boolean;
    message: string;
  }>({
    loading: false,
    connected: false,
    tablesFound: false,
    message: 'Belum diuji',
  });

  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [syncLoading, setSyncLoading] = useState<'upload' | 'download' | null>(null);
  const [syncNotification, setSyncNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Test connection on mount
  useEffect(() => {
    runConnectionTest();
  }, []);

  const runConnectionTest = async () => {
    setStatus((prev) => ({ ...prev, loading: true, message: 'Menguji koneksi ke Supabase...' }));
    const result = await checkSupabaseHealth();
    setStatus({
      loading: false,
      connected: result.connected,
      tablesFound: result.tablesFound,
      message: result.message,
    });
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Upload Local Data to Supabase
  const handleUploadToCloud = async () => {
    if (!status.tablesFound) {
      alert(
        'Tabel database Supabase belum dibuat! Harap jalankan script SQL Schema di SQL Editor Supabase terlebih dahulu.'
      );
      return;
    }

    setSyncLoading('upload');
    setSyncNotification(null);

    try {
      // 1. Upload School Profile
      const { error: profileError } = await supabase
        .from('school_profile')
        .upsert(mapProfileToDb(schoolProfile));
      if (profileError) throw new Error(`Profil: ${profileError.message}`);

      // 2. Upload Cash Accounts
      if (cashAccounts.length > 0) {
        const { error: accError } = await supabase
          .from('cash_accounts')
          .upsert(cashAccounts.map(mapAccountToDb));
        if (accError) throw new Error(`Akun Kas: ${accError.message}`);
      }

      // 3. Upload Students
      if (students.length > 0) {
        const { error: stdError } = await supabase
          .from('students')
          .upsert(students.map(mapStudentToDb));
        if (stdError) throw new Error(`Data Siswa: ${stdError.message}`);
      }

      // 4. Upload Syahriah Payments
      if (syahriahPayments.length > 0) {
        const { error: syahError } = await supabase
          .from('syahriah_payments')
          .upsert(syahriahPayments.map(mapSyahriahToDb));
        if (syahError) throw new Error(`Syahriah: ${syahError.message}`);
      }

      // 5. Upload Transactions
      if (transactions.length > 0) {
        const { error: trxError } = await supabase
          .from('financial_transactions')
          .upsert(transactions.map(mapTransactionToDb));
        if (trxError) throw new Error(`Transaksi: ${trxError.message}`);
      }

      setSyncNotification({
        type: 'success',
        message: `Berhasil mengunggah seluruh data ke Cloud Supabase (${students.length} Siswa, ${cashAccounts.length} Akun Kas, ${syahriahPayments.length} Pembayaran, ${transactions.length} Transaksi).`,
      });
    } catch (err: any) {
      setSyncNotification({
        type: 'error',
        message: `Gagal mengunggah ke Cloud: ${err.message}`,
      });
    } finally {
      setSyncLoading(null);
    }
  };

  // Download Cloud Data to Local App
  const handleDownloadFromCloud = async () => {
    if (!status.tablesFound) {
      alert(
        'Tabel database Supabase belum dibuat! Harap jalankan script SQL Schema di SQL Editor Supabase terlebih dahulu.'
      );
      return;
    }

    if (
      !window.confirm(
        'Apakah Anda ingin mengunduh data dari Supabase dan memperbarui data lokal saat ini?'
      )
    ) {
      return;
    }

    setSyncLoading('download');
    setSyncNotification(null);

    try {
      // 1. Download Profile
      const { data: profileRows } = await supabase
        .from('school_profile')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (profileRows) {
        updateSchoolProfile(mapDbToProfile(profileRows));
      }

      // 2. Download Students
      const { data: stdRows, error: stdError } = await supabase
        .from('students')
        .select('*')
        .order('grade', { ascending: true })
        .order('name', { ascending: true });
      if (stdError) throw stdError;

      // 3. Download Syahriah
      const { data: syahRows, error: syahError } = await supabase
        .from('syahriah_payments')
        .select('*')
        .order('payment_date', { ascending: false });
      if (syahError) throw syahError;

      // 4. Download Accounts
      const { data: accRows, error: accError } = await supabase
        .from('cash_accounts')
        .select('*');
      if (accError) throw accError;

      // 5. Download Transactions
      const { data: trxRows, error: trxError } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });
      if (trxError) throw trxError;

      // Save directly to localStorage and reload context
      if (stdRows) {
        localStorage.setItem(
          'mi_keuangan_students_v1',
          JSON.stringify(stdRows.map(mapDbToStudent))
        );
      }
      if (syahRows) {
        localStorage.setItem(
          'mi_keuangan_syahriah_v1',
          JSON.stringify(syahRows.map(mapDbToSyahriah))
        );
      }
      if (accRows && accRows.length > 0) {
        localStorage.setItem(
          'mi_keuangan_accounts_v1',
          JSON.stringify(accRows.map(mapDbToAccount))
        );
      }
      if (trxRows) {
        localStorage.setItem(
          'mi_keuangan_transactions_v1',
          JSON.stringify(trxRows.map(mapDbToTransaction))
        );
      }

      setSyncNotification({
        type: 'success',
        message: 'Data Supabase berhasil diunduh! Halaman akan diperbarui...',
      });

      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setSyncNotification({
        type: 'error',
        message: `Gagal mengunduh dari Cloud: ${err.message}`,
      });
    } finally {
      setSyncLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-emerald-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  Cloud PostgreSQL
                </span>
                <span className="text-xs text-emerald-300/80 font-mono">
                  v2.0 Realtime Sync
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white tracking-tight">
                Integrasi Database Supabase Cloud
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5 max-w-xl">
                Menghubungkan aplikasi Bendahara MI Ma'arif Al Ihsan Soborejo ke server database cloud Supabase untuk penyimpanan terpusat dan aman.
              </p>
            </div>
          </div>

          {/* Health Status Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div
              className={`px-3.5 py-2 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                status.tablesFound
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : status.connected
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                  : 'bg-rose-950/80 border-rose-500 text-rose-300'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  status.tablesFound
                    ? 'bg-emerald-400'
                    : status.connected
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              <div>
                <div className="font-bold">
                  {status.loading
                    ? 'Mengecek...'
                    : status.tablesFound
                    ? 'Supabase Cloud Aktif & Siap'
                    : status.connected
                    ? 'Terkoneksi (Tabel Belum Dibuat)'
                    : 'Koneksi Gagal / Offline'}
                </div>
                <div className="text-[10px] opacity-80 truncate max-w-[200px]">
                  {status.message}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={runConnectionTest}
              disabled={status.loading}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status.loading ? 'animate-spin' : ''}`} />
              <span>Cek Koneksi</span>
            </button>
          </div>
        </div>

        {/* Credentials Preview */}
        <div className="mt-5 pt-4 border-t border-emerald-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-black/30 rounded-lg p-2.5 border border-white/10 flex items-center justify-between">
            <span className="text-emerald-300 font-mono">Project URL:</span>
            <span className="font-mono text-white text-[11px] truncate max-w-[240px]">
              {SUPABASE_URL}
            </span>
          </div>
          <div className="bg-black/30 rounded-lg p-2.5 border border-white/10 flex items-center justify-between">
            <span className="text-emerald-300 font-mono">Publishable Key:</span>
            <span className="font-mono text-emerald-200 text-[11px]">
              {SUPABASE_ANON_KEY.substring(0, 16)}...{SUPABASE_ANON_KEY.slice(-6)}
            </span>
          </div>
        </div>
      </div>

      {/* Sync Notifications */}
      {syncNotification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            syncNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{syncNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotification(null)}
            className="text-gray-400 hover:text-gray-600 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Two Columns: Left Guide (7 cols), Right SQL & Action (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Panduan Langkah-Langkah Setting Database (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  1-6
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Panduan Lengkap Setting Database Supabase
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Ikuti langkah di bawah ini untuk membuat tabel otomatis di dashboard Supabase Anda.
                  </p>
                </div>
              </div>

              <a
                href="https://supabase.com/dashboard/project/pwevnvuzhnbpugfgvcax"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
              >
                <span>Buka Dashboard Supabase</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Step-by-Step Interactive Guide */}
            <div className="space-y-3 text-xs">
              {/* Step 1 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 1
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50'
                }`}
                onClick={() => setActiveStep(1)}
              >
                <div className="flex items-start gap-3 cursor-pointer">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      Buka Dashboard Proyek Supabase
                    </h4>
                    <p className="text-gray-600 mt-1 leading-relaxed">
                      Kunjungi link proyek Supabase Anda:{' '}
                      <a
                        href="https://supabase.com/dashboard/project/pwevnvuzhnbpugfgvcax"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 font-medium underline font-mono text-[11px]"
                      >
                        https://supabase.com/dashboard/project/pwevnvuzhnbpugfgvcax
                      </a>{' '}
                      dan pastikan Anda sudah login ke akun Supabase Anda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 2
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50'
                }`}
                onClick={() => setActiveStep(2)}
              >
                <div className="flex items-start gap-3 cursor-pointer">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      Masuk ke Menu "SQL Editor"
                    </h4>
                    <p className="text-gray-600 mt-1 leading-relaxed">
                      Di bilah navigasi sebelah kiri (sidebar) Supabase, klik ikon terminal /{' '}
                      <strong className="text-gray-800 font-semibold">SQL Editor</strong> (ikon bertuliskan <code className="bg-gray-200 px-1 py-0.5 rounded text-[11px]">&gt;_</code>).
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 3
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50'
                }`}
                onClick={() => setActiveStep(3)}
              >
                <div className="flex items-start gap-3 cursor-pointer">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      Klik "+ New Query"
                    </h4>
                    <p className="text-gray-600 mt-1 leading-relaxed">
                      Pilih tombol hijau <strong className="text-gray-800 font-semibold">+ New query</strong> untuk membuka lembar kerja editor SQL yang baru dan bersih.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 4
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50'
                }`}
                onClick={() => setActiveStep(4)}
              >
                <div className="flex items-start gap-3 cursor-pointer">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    4
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      Salin & Tempel Kode SQL Schema
                    </h4>
                    <p className="text-gray-600 mt-1 leading-relaxed">
                      Klik tombol hijau <strong className="text-emerald-700">"Salin Skrip SQL"</strong> di panel sebelah kanan, lalu paste (Ctrl + V / Cmd + V) ke dalam SQL Editor Supabase.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedSql ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Tersalin ke Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Skrip SQL Sekarang</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 5
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50'
                }`}
                onClick={() => setActiveStep(5)}
              >
                <div className="flex items-start gap-3 cursor-pointer">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    5
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      Klik Tombol "Run" (Jalankan)
                    </h4>
                    <p className="text-gray-600 mt-1 leading-relaxed">
                      Di pojok kanan bawah SQL Editor Supabase, klik tombol hijau{' '}
                      <strong className="text-emerald-700 font-semibold">"Run"</strong> (atau tekan shortcut keyboard{' '}
                      <code className="bg-gray-200 px-1 py-0.5 rounded text-[11px]">Ctrl + Enter</code>). Tunggu beberapa detik sampai muncul notifikasi hijau <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-[11px]">Success. No rows returned</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 6 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  activeStep === 6
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-gray-200 bg-gray-50/40 hover:bg-gray-50'
                }`}
                onClick={() => setActiveStep(6)}
              >
                <div className="flex items-start gap-3 cursor-pointer">
                  <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    6
                  </span>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">
                      Klik "Cek Koneksi" & Sinkronkan
                    </h4>
                    <p className="text-gray-600 mt-1 leading-relaxed">
                      Kembali ke aplikasi ini dan klik tombol <strong className="text-gray-900">"Cek Koneksi"</strong> di atas. Status akan berubah menjadi hijau (🟢 Aktif). Kemudian Anda dapat langsung mengklik tombol <strong className="text-emerald-700">"Unggah Data Lokal ke Cloud"</strong>!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: SQL Schema Code & Sync Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sync Action Box */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-700" />
              <span>Sinkronisasi Data Cloud</span>
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Kirimkan data keuangan madrasah (siswa, pembayaran syahriah, saldo kas) ke cloud Supabase atau tarik data terbaru.
            </p>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleUploadToCloud}
                disabled={syncLoading !== null}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <UploadCloud className={`w-4 h-4 ${syncLoading === 'upload' ? 'animate-bounce' : ''}`} />
                <span>
                  {syncLoading === 'upload'
                    ? 'Sedang Mengunggah...'
                    : 'Unggah Data Lokal ke Cloud Supabase'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadFromCloud}
                disabled={syncLoading !== null}
                className="w-full py-2.5 px-4 bg-white hover:bg-blue-50 disabled:opacity-50 text-blue-700 border border-blue-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <DownloadCloud className={`w-4 h-4 ${syncLoading === 'download' ? 'animate-bounce' : ''}`} />
                <span>
                  {syncLoading === 'download'
                    ? 'Sedang Mengunduh...'
                    : 'Unduh Data dari Cloud Supabase'}
                </span>
              </button>
            </div>

            <div className="pt-2 text-[11px] text-gray-400 border-t border-gray-100 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>
                Data juga tetap tersimpan aman di peramban (offline-first).
              </span>
            </div>
          </div>

          {/* SQL Script Box */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 text-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-gray-200">
                  Skrip SQL Schema Supabase
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin SQL</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              Skrip ini otomatis membuat 6 tabel: <code>school_profile</code>, <code>students</code>, <code>cash_accounts</code>, <code>syahriah_payments</code>, <code>financial_transactions</code>, dan <code>cash_transfers</code> beserta kebijakan hak akses RLS (Row Level Security).
            </p>

            {/* Collapsible SQL Preview */}
            <div>
              <button
                type="button"
                onClick={() => setShowSqlCode(!showSqlCode)}
                className="w-full py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 rounded-lg text-xs text-gray-300 font-mono flex items-center justify-between transition-colors"
              >
                <span>{showSqlCode ? 'Sembunyikan Kode' : 'Lihat Pratinjau Kode SQL'}</span>
                {showSqlCode ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showSqlCode && (
                <pre className="mt-2 p-3 bg-black/60 border border-slate-700 rounded-lg text-[10px] text-emerald-300 font-mono max-h-56 overflow-y-auto leading-relaxed select-all">
                  {SUPABASE_SCHEMA_SQL}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
