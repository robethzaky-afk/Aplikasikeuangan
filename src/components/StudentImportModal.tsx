import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertTriangle,
  X,
  Info,
  Check,
  RotateCcw,
  Users,
} from 'lucide-react';
import { Student } from '../types';
import { formatRupiah } from '../utils/formatters';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  standardSyahriah: number;
  existingStudents: Student[];
  onImportSuccess: (
    importedStudents: Omit<Student, 'id'>[],
    strategy: 'UPSERT' | 'SKIP_EXISTING'
  ) => void;
}

interface ParsedStudentRow {
  rowNumber: number;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  grade: number;
  classGroup: string;
  guardianName: string;
  guardianPhone: string;
  monthlySyahriah: number;
  isExempt: boolean;
  status: 'AKTIF' | 'LULUS' | 'PINDAH';
  isValid: boolean;
  validationErrors: string[];
  isExisting: boolean;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({
  isOpen,
  onClose,
  standardSyahriah,
  existingStudents,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [importStrategy, setImportStrategy] = useState<'UPSERT' | 'SKIP_EXISTING'>('UPSERT');
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');

  if (!isOpen) return null;

  // Existing NIS Set for collision check
  const existingNisMap = new Map<string, Student>();
  existingStudents.forEach((s) => {
    if (s.nis) existingNisMap.set(s.nis.trim().toLowerCase(), s);
  });

  // DOWNLOAD TEMPLATE EXCEL (.XLSX)
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        NIS: '2401',
        NISN: '0158921101',
        'NAMA SISWA': 'Ahmad Fauzi Rabbani',
        'JENIS KELAMIN (L/P)': 'L',
        'TINGKAT KELAS (1-6)': 1,
        'NAMA ROMBEL': 'Kelas 1',
        'NAMA WALI': 'Bpk. Santoso',
        'NO WHATSAPP WALI': '081234567890',
        'TARIF SYAHRIAH (RP)': standardSyahriah,
        'BEASISWA YATIM (YA/TIDAK)': 'TIDAK',
        'STATUS (AKTIF/LULUS/PINDAH)': 'AKTIF',
      },
      {
        NIS: '2402',
        NISN: '0158921102',
        'NAMA SISWA': 'Nur Aisyah Azzahra',
        'JENIS KELAMIN (L/P)': 'P',
        'TINGKAT KELAS (1-6)': 1,
        'NAMA ROMBEL': 'Kelas 1',
        'NAMA WALI': 'Ibu Fatimah',
        'NO WHATSAPP WALI': '081298765432',
        'TARIF SYAHRIAH (RP)': standardSyahriah,
        'BEASISWA YATIM (YA/TIDAK)': 'TIDAK',
        'STATUS (AKTIF/LULUS/PINDAH)': 'AKTIF',
      },
      {
        NIS: '2403',
        NISN: '0158921103',
        'NAMA SISWA': 'Muhammad Farhan',
        'JENIS KELAMIN (L/P)': 'L',
        'TINGKAT KELAS (1-6)': 2,
        'NAMA ROMBEL': 'Kelas 2',
        'NAMA WALI': 'Ibu Maryam (Almh)',
        'NO WHATSAPP WALI': '085712345678',
        'TARIF SYAHRIAH (RP)': 0,
        'BEASISWA YATIM (YA/TIDAK)': 'YA',
        'STATUS (AKTIF/LULUS/PINDAH)': 'AKTIF',
      },
    ];

    const instructionsData = [
      {
        KOLOM: 'NIS',
        WAJIB: 'Wajib',
        KETERANGAN: 'Nomor Induk Siswa lokal madrasah (unik). Digunakan sebagai kunci pembeda.',
        CONTOH: '2401',
      },
      {
        KOLOM: 'NISN',
        WAJIB: 'Opsional',
        KETERANGAN: 'Nomor Induk Siswa Nasional (10 digit angka dari Kemdikbud/EMIS).',
        CONTOH: '0158921101',
      },
      {
        KOLOM: 'NAMA SISWA',
        WAJIB: 'Wajib',
        KETERANGAN: 'Nama lengkap santri sesuai akta kelahiran / ijazah.',
        CONTOH: 'Ahmad Fauzi Rabbani',
      },
      {
        KOLOM: 'JENIS KELAMIN (L/P)',
        WAJIB: 'Wajib',
        KETERANGAN: 'Tulis L untuk Laki-laki atau P untuk Perempuan.',
        CONTOH: 'L atau P',
      },
      {
        KOLOM: 'TINGKAT KELAS (1-6)',
        WAJIB: 'Wajib',
        KETERANGAN: 'Tulis angka tingkat kelas: 1, 2, 3, 4, 5, atau 6.',
        CONTOH: '1',
      },
      {
        KOLOM: 'NAMA ROMBEL',
        WAJIB: 'Opsional',
        KETERANGAN: 'Nama rombongan belajar. Jika kosong, otomatis diisi "Kelas {Tingkat}".',
        CONTOH: 'Kelas 1, Kelas 2, Kelas 3A',
      },
      {
        KOLOM: 'NAMA WALI',
        WAJIB: 'Wajib',
        KETERANGAN: 'Nama orang tua/wali santri penanggung jawab.',
        CONTOH: 'Bpk. Santoso',
      },
      {
        KOLOM: 'NO WHATSAPP WALI',
        WAJIB: 'Opsional',
        KETERANGAN: 'Nomor WhatsApp wali murid untuk kirim kwitansi & pengingat (awali 08 atau 62).',
        CONTOH: '081234567890',
      },
      {
        KOLOM: 'TARIF SYAHRIAH (RP)',
        WAJIB: 'Opsional',
        KETERANGAN: `Nominal iuran syahriah bulanan. Standar madrasah adalah Rp ${standardSyahriah.toLocaleString('id-ID')}.`,
        CONTOH: '20000',
      },
      {
        KOLOM: 'BEASISWA YATIM (YA/TIDAK)',
        WAJIB: 'Opsional',
        KETERANGAN: 'Isi YA jika santri bebas biaya (yatim/dhuafa). Jika YA, tarif syahriah otomatis Rp 0.',
        CONTOH: 'TIDAK atau YA',
      },
      {
        KOLOM: 'STATUS (AKTIF/LULUS/PINDAH)',
        WAJIB: 'Opsional',
        KETERANGAN: 'Status siswa. Pilihan: AKTIF, LULUS, atau PINDAH (default: AKTIF).',
        CONTOH: 'AKTIF',
      },
    ];

    const wb = XLSX.utils.book_new();

    // Sheet 1: Template Data
    const wsTemplate = XLSX.utils.json_to_sheet(templateData);
    wsTemplate['!cols'] = [
      { wch: 12 }, // NIS
      { wch: 16 }, // NISN
      { wch: 28 }, // NAMA SISWA
      { wch: 22 }, // JENIS KELAMIN
      { wch: 20 }, // TINGKAT KELAS
      { wch: 18 }, // NAMA ROMBEL
      { wch: 24 }, // NAMA WALI
      { wch: 20 }, // NO WHATSAPP WALI
      { wch: 22 }, // TARIF SYAHRIAH
      { wch: 26 }, // BEASISWA YATIM
      { wch: 26 }, // STATUS
    ];
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'DATA SISWA');

    // Sheet 2: Petunjuk
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [
      { wch: 26 },
      { wch: 12 },
      { wch: 60 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'PETUNJUK PENGISIAN');

    XLSX.writeFile(wb, 'Template_Impor_Siswa_MI_Soborejo.xlsx');
  };

  // DOWNLOAD TEMPLATE CSV
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'NIS,NISN,NAMA SISWA,JENIS KELAMIN (L/P),TINGKAT KELAS (1-6),NAMA ROMBEL,NAMA WALI,NO WHATSAPP WALI,TARIF SYAHRIAH (RP),BEASISWA YATIM (YA/TIDAK),STATUS\n' +
      `2401,0158921101,Ahmad Fauzi Rabbani,L,1,Kelas 1,Bpk. Santoso,081234567890,${standardSyahriah},TIDAK,AKTIF\n` +
      `2402,0158921102,Nur Aisyah Azzahra,P,1,Kelas 1,Ibu Fatimah,081298765432,${standardSyahriah},TIDAK,AKTIF\n` +
      '2403,0158921103,Muhammad Farhan,L,2,Kelas 2,Ibu Maryam (Almh),085712345678,0,YA,AKTIF\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Impor_Siswa_MI_Soborejo.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PARSE FILE (EXCEL OR CSV)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', raw: false });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Parse sheet to array of rows (header: 1 gets 2D array)
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length <= 1) {
          alert('Berkas kosong atau tidak memiliki baris data.');
          setIsParsing(false);
          return;
        }

        // Detect header column positions
        const headerRow = rows[0].map((cell: any) => String(cell).trim().toLowerCase());

        const getColIndex = (...candidates: string[]) => {
          return headerRow.findIndex((col) =>
            candidates.some((c) => col.includes(c.toLowerCase()))
          );
        };

        const idxNis = getColIndex('nis', 'nomor induk', 'no induk');
        const idxNisn = getColIndex('nisn');
        const idxName = getColIndex('nama', 'siswa', 'santri');
        const idxGender = getColIndex('jenis kelamin', 'kelamin', 'jk', 'l/p', 'gender');
        const idxGrade = getColIndex('tingkat', 'kelas', 'grade');
        const idxClassGroup = getColIndex('rombel', 'kelompok');
        const idxGuardian = getColIndex('wali', 'orang tua', 'ortu');
        const idxPhone = getColIndex('whatsapp', 'wa', 'telepon', 'hp', 'telp', 'kontak');
        const idxSyahriah = getColIndex('tarif', 'syahriah', 'spp', 'nominal', 'biaya');
        const idxExempt = getColIndex('beasiswa', 'yatim', 'bebas', 'keringanan');
        const idxStatus = getColIndex('status');

        const parsedList: ParsedStudentRow[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          // Skip empty row
          if (!row || row.every((c: any) => String(c).trim() === '')) {
            continue;
          }

          const rawNis = idxNis !== -1 ? String(row[idxNis] || '').trim() : '';
          const rawNisn = idxNisn !== -1 ? String(row[idxNisn] || '').trim() : '';
          const rawName = idxName !== -1 ? String(row[idxName] || '').trim() : '';
          const rawGender = idxGender !== -1 ? String(row[idxGender] || '').trim().toUpperCase() : '';
          const rawGrade = idxGrade !== -1 ? String(row[idxGrade] || '').trim() : '';
          const rawClassGroup = idxClassGroup !== -1 ? String(row[idxClassGroup] || '').trim() : '';
          const rawGuardian = idxGuardian !== -1 ? String(row[idxGuardian] || '').trim() : '';
          const rawPhone = idxPhone !== -1 ? String(row[idxPhone] || '').trim() : '';
          const rawSyahriah = idxSyahriah !== -1 ? String(row[idxSyahriah] || '').trim() : '';
          const rawExempt = idxExempt !== -1 ? String(row[idxExempt] || '').trim().toUpperCase() : '';
          const rawStatus = idxStatus !== -1 ? String(row[idxStatus] || '').trim().toUpperCase() : '';

          const validationErrors: string[] = [];

          // Clean NIS
          const nis = rawNis.replace(/['"\s]/g, '');
          if (!nis) {
            validationErrors.push('NIS wajib diisi');
          }

          // Clean Name
          const name = rawName;
          if (!name) {
            validationErrors.push('Nama siswa wajib diisi');
          }

          // Clean Gender
          let gender: 'L' | 'P' = 'L';
          if (
            rawGender.startsWith('P') ||
            rawGender.includes('WANITA') ||
            rawGender.includes('PEREMPUAN')
          ) {
            gender = 'P';
          } else if (
            rawGender.startsWith('L') ||
            rawGender.includes('PRIA') ||
            rawGender.includes('LAKI')
          ) {
            gender = 'L';
          } else if (rawGender) {
            validationErrors.push('Jenis kelamin harus L atau P');
          }

          // Clean Grade
          let grade = 1;
          const gradeMatch = rawGrade.match(/[1-6]/);
          if (gradeMatch) {
            grade = parseInt(gradeMatch[0], 10);
          } else if (rawGrade) {
            validationErrors.push('Kelas harus angka 1 s.d. 6');
          }

          // Class group
          const classGroup = rawClassGroup || `Kelas ${grade}`;

          // Guardian
          const guardianName = rawGuardian || 'Wali Murid';

          // Clean Phone
          let guardianPhone = rawPhone.replace(/[^0-9+]/g, '');
          if (guardianPhone.startsWith('+62')) {
            guardianPhone = '0' + guardianPhone.slice(3);
          } else if (guardianPhone.startsWith('62')) {
            guardianPhone = '0' + guardianPhone.slice(2);
          }

          // Exempt check
          const isExempt =
            rawExempt === 'YA' ||
            rawExempt === 'Y' ||
            rawExempt === 'TRUE' ||
            rawExempt === '1' ||
            rawExempt.includes('BEBAS') ||
            rawExempt.includes('YATIM');

          // Monthly Syahriah
          let monthlySyahriah = standardSyahriah;
          if (isExempt) {
            monthlySyahriah = 0;
          } else if (rawSyahriah) {
            const parsedNum = parseFloat(rawSyahriah.replace(/[^0-9]/g, ''));
            if (!isNaN(parsedNum) && parsedNum >= 0) {
              monthlySyahriah = parsedNum;
            }
          }

          // Status
          let status: 'AKTIF' | 'LULUS' | 'PINDAH' = 'AKTIF';
          if (rawStatus.includes('LULUS')) status = 'LULUS';
          else if (rawStatus.includes('PINDAH') || rawStatus.includes('KELUAR')) status = 'PINDAH';

          const isExisting = nis ? existingNisMap.has(nis.toLowerCase()) : false;

          parsedList.push({
            rowNumber: i + 1,
            nis,
            nisn: rawNisn,
            name,
            gender,
            grade,
            classGroup,
            guardianName,
            guardianPhone,
            monthlySyahriah,
            isExempt,
            status,
            isValid: validationErrors.length === 0,
            validationErrors,
            isExisting,
          });
        }

        setParsedRows(parsedList);
        setActiveTab('preview');
        setIsParsing(false);
      } catch (err) {
        console.error(err);
        alert('Gagal membaca berkas. Pastikan berkas adalah Excel (.xlsx/.xls) atau CSV yang valid.');
        setIsParsing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // EXECUTE IMPORT
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);

    if (validRows.length === 0) {
      alert('Tidak ada baris data siswa yang valid untuk diimpor.');
      return;
    }

    const studentsToImport: Omit<Student, 'id'>[] = validRows.map((r) => ({
      nis: r.nis,
      nisn: r.nisn || undefined,
      name: r.name,
      gender: r.gender,
      grade: r.grade,
      classGroup: r.classGroup,
      guardianName: r.guardianName,
      guardianPhone: r.guardianPhone,
      monthlySyahriah: r.isExempt ? 0 : r.monthlySyahriah,
      isExempt: r.isExempt,
      status: r.status,
    }));

    onImportSuccess(studentsToImport, importStrategy);
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const existingCount = parsedRows.filter((r) => r.isExisting && r.isValid).length;
  const newCount = validCount - existingCount;

  const displayedRows = parsedRows.filter((r) => {
    if (filterMode === 'VALID') return r.isValid;
    if (filterMode === 'INVALID') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-200 my-6 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-800 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Impor Data Siswa Madrasah</h3>
              <p className="text-xs text-emerald-200">
                Unggah data santri massal dari berkas Excel (.xlsx) atau CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-700/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs / Step Navigation */}
        <div className="bg-emerald-50/50 border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>1. Unggah Berkas & Template</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              disabled={parsedRows.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : parsedRows.length > 0
                  ? 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                  : 'text-gray-400 opacity-50 cursor-not-allowed'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                2. Verifikasi Data ({parsedRows.length} Siswa)
              </span>
            </button>
          </div>

          {/* Quick template download in header */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="text-xs text-emerald-800 bg-white hover:bg-emerald-100/70 border border-emerald-300 font-semibold px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3 text-emerald-700" />
              <span>Template Excel</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="text-xs text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 font-medium px-2 py-1 rounded-md flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <FileText className="w-3 h-3 text-gray-500" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'upload' ? (
            <div className="space-y-6">
              {/* Template Download Banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800 shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Belum Memiliki Format Excel / CSV?
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      Gunakan template resmi MI Ma'arif Al Ihsan Soborejo yang telah dilengkapi contoh data dan petunjuk kolom untuk mempermudah pengisian.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Template (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-xs font-medium shadow-2xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-colors shadow-2xs">
                  <Upload className="w-7 h-7" />
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Klik di sini untuk memilih berkas atau geser (drag & drop) berkas ke area ini
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mendukung format Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) dan berkas <strong>.csv</strong>
                  </p>
                </div>

                {selectedFile && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-medium text-emerald-900 shadow-2xs">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>{selectedFile.name}</span>
                    <span className="text-gray-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {/* Guidelines Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-gray-900">
                  <Info className="w-4 h-4 text-blue-700" />
                  <span>Petunjuk Kolom yang Dikenali Otomatis:</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 list-disc list-inside">
                  <li><strong>NIS</strong>: Nomor Induk Siswa (kunci pembeda unik)</li>
                  <li><strong>Nama Siswa</strong>: Nama lengkap santri</li>
                  <li><strong>Jenis Kelamin</strong>: Diisi <strong>L</strong> atau <strong>P</strong></li>
                  <li><strong>Tingkat Kelas</strong>: Angka 1 s.d. 6</li>
                  <li><strong>Nama Wali</strong>: Nama orang tua/wali santri</li>
                  <li><strong>No WhatsApp</strong>: No HP aktif (contoh: 08123456789)</li>
                  <li><strong>Tarif Syahriah</strong>: Nominal angka bulanan (Rp)</li>
                  <li><strong>Beasiswa Yatim</strong>: Isi <strong>YA</strong> jika gratis</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats & Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[11px] text-gray-500 block">Total Baris</span>
                  <span className="text-xl font-bold font-mono text-gray-900">
                    {parsedRows.length}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 block">Siap Diimpor (Valid)</span>
                  <span className="text-xl font-bold font-mono text-emerald-800">
                    {validCount}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="text-[11px] text-blue-700 block">Siswa Baru / Terdaftar</span>
                  <span className="text-xl font-bold font-mono text-blue-800">
                    {newCount} / {existingCount}
                  </span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-[11px] text-rose-700 block">Perlu Diperbaiki</span>
                  <span className="text-xl font-bold font-mono text-rose-800">
                    {invalidCount}
                  </span>
                </div>
              </div>

              {/* Strategy and filter options */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">Jika NIS sudah ada:</span>
                  <select
                    value={importStrategy}
                    onChange={(e) => setImportStrategy(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white font-medium focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="UPSERT">Perbarui data siswa yang cocok (Update)</option>
                    <option value="SKIP_EXISTING">Lewati (hanya tambah siswa yang belum ada)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700 mr-1">Filter Tampilan:</span>
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      filterMode === 'ALL'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Semua ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('VALID')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      filterMode === 'VALID'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-gray-200 text-gray-600'
                    }`}
                  >
                    Valid ({validCount})
                  </button>
                  {invalidCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('INVALID')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        filterMode === 'INVALID'
                          ? 'bg-rose-700 text-white'
                          : 'bg-white border border-rose-200 text-rose-700'
                      }`}
                    >
                      Bermasalah ({invalidCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[11px] sticky top-0 z-10 border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">Baris</th>
                        <th className="py-2.5 px-3 w-16">Status</th>
                        <th className="py-2.5 px-3 w-20">NIS</th>
                        <th className="py-2.5 px-4 min-w-[170px]">Nama Siswa</th>
                        <th className="py-2.5 px-2 text-center w-12">L/P</th>
                        <th className="py-2.5 px-3 text-center w-16">Kelas</th>
                        <th className="py-2.5 px-3 min-w-[130px]">Nama Wali</th>
                        <th className="py-2.5 px-3 min-w-[110px]">No WA</th>
                        <th className="py-2.5 px-3 text-right">Syahriah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={`hover:bg-gray-50/70 transition-colors ${
                            !row.isValid ? 'bg-rose-50/40' : row.isExisting ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center font-mono text-gray-400">
                            {row.rowNumber}
                          </td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  row.isExisting
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                                <span>{row.isExisting ? 'Update' : 'Baru'}</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800"
                                title={row.validationErrors.join(', ')}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Bermasalah</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-gray-900">
                            {row.nis || '-'}
                          </td>
                          <td className="py-2 px-4 font-semibold text-gray-900">
                            <div className="flex items-center gap-1.5">
                              <span>{row.name || '-'}</span>
                              {row.isExempt && (
                                <span className="text-[9px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-bold">
                                  Yatim
                                </span>
                              )}
                            </div>
                            {!row.isValid && (
                              <p className="text-[10px] text-rose-600 font-normal mt-0.5">
                                {row.validationErrors.join(' • ')}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center text-gray-600 font-medium">
                            {row.gender}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-gray-700">
                            {row.classGroup}
                          </td>
                          <td className="py-2 px-3 text-gray-800">
                            {row.guardianName}
                          </td>
                          <td className="py-2 px-3 font-mono text-gray-600">
                            {row.guardianPhone || '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-gray-800">
                            {row.isExempt ? 'Bebas' : formatRupiah(row.monthlySyahriah)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div>
            {activeTab === 'preview' && (
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pilih Berkas Lain</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>

            {activeTab === 'preview' && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Konfirmasi Impor ({validCount} Siswa)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
