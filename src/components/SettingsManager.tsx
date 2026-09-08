import React, { useState } from 'react';
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
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { SchoolProfile } from '../types';
import { formatRupiah } from '../utils/formatters';

export const SettingsManager: React.FC = () => {
  const {
    schoolProfile,
    updateSchoolProfile,
    exportDataJson,
    importDataJson,
    resetToDefault,
  } = useFinance();

  const [formData, setFormData] = useState<SchoolProfile>({ ...schoolProfile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Konfigurasi Sistem
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Pengaturan Profil & Cadangan Data
          </h2>
          <p className="text-xs text-gray-500">
            Identitas resmi madrasah, tarif standar syahriah, dan ekspor/impor cadangan data bendahara.
          </p>
        </div>
      </div>

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
    </div>
  );
};
