import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  GraduationCap,
  Phone,
  ShieldCheck,
  Filter,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Student } from '../types';
import { formatRupiah } from '../utils/formatters';
import { StudentImportModal } from './StudentImportModal';

export const StudentManager: React.FC = () => {
  const {
    students,
    schoolProfile,
    addStudent,
    updateStudent,
    deleteStudent,
    clearAllStudents,
    bulkImportStudents,
    getStudentPaidMonths,
  } = useFinance();

  const [selectedGrade, setSelectedGrade] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [importNotification, setImportNotification] = useState<{
    message: string;
    detail: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    name: '',
    gender: 'L' as 'L' | 'P',
    grade: 1,
    classGroup: 'Kelas 1',
    guardianName: '',
    guardianPhone: '',
    monthlySyahriah: schoolProfile.standardSyahriah.toString(),
    isExempt: false,
    status: 'AKTIF' as const,
  });

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      nis: (2400 + students.length + 1).toString(),
      nisn: '',
      name: '',
      gender: 'L',
      grade: 1,
      classGroup: 'Kelas 1',
      guardianName: '',
      guardianPhone: '',
      monthlySyahriah: schoolProfile.standardSyahriah.toString(),
      isExempt: false,
      status: 'AKTIF',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nis: student.nis,
      nisn: student.nisn || '',
      name: student.name,
      gender: student.gender,
      grade: student.grade,
      classGroup: student.classGroup,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      monthlySyahriah: student.monthlySyahriah.toString(),
      isExempt: student.isExempt,
      status: student.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = formData.isExempt ? 0 : parseFloat(formData.monthlySyahriah.replace(/\D/g, '')) || schoolProfile.standardSyahriah;

    if (editingStudent) {
      updateStudent({
        ...editingStudent,
        nis: formData.nis,
        nisn: formData.nisn,
        name: formData.name,
        gender: formData.gender,
        grade: Number(formData.grade),
        classGroup: formData.classGroup,
        guardianName: formData.guardianName,
        guardianPhone: formData.guardianPhone,
        monthlySyahriah: rate,
        isExempt: formData.isExempt,
        status: formData.status,
      });
    } else {
      addStudent({
        nis: formData.nis,
        nisn: formData.nisn,
        name: formData.name,
        gender: formData.gender,
        grade: Number(formData.grade),
        classGroup: formData.classGroup,
        guardianName: formData.guardianName,
        guardianPhone: formData.guardianPhone,
        monthlySyahriah: rate,
        isExempt: formData.isExempt,
        status: formData.status,
      });
    }

    setIsModalOpen(false);
  };

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => (selectedGrade === 'ALL' ? true : s.grade === selectedGrade))
      .filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.toLowerCase().includes(q)) ||
          s.guardianName.toLowerCase().includes(q) ||
          s.classGroup.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
  }, [students, selectedGrade, searchQuery]);

  const handleImportSuccess = (
    importedStudents: Omit<Student, 'id'>[],
    strategy: 'UPSERT' | 'SKIP_EXISTING'
  ) => {
    const result = bulkImportStudents(importedStudents, strategy);
    setImportNotification({
      message: `Impor Berhasil: ${result.total} Data Santri Diproses`,
      detail: `${result.added} siswa baru berhasil ditambahkan, ${result.updated} data siswa diperbarui di database.`,
    });
    setTimeout(() => {
      setImportNotification(null);
    }, 7000);
  };

  const handleConfirmDeleteAll = () => {
    clearAllStudents();
    setIsConfirmDeleteAllOpen(false);
    setImportNotification({
      message: 'Semua Data Siswa Berhasil Dihapus',
      detail: 'Seluruh data santri kelas 1 sampai 6 telah dibersihkan. Anda dapat mengimpor data santri yang baru kapan saja.',
    });
    setTimeout(() => {
      setImportNotification(null);
    }, 7000);
  };

  const handleExportData = () => {
    const dataToExport = filteredStudents.map((s, idx) => ({
      'No': idx + 1,
      'NIS': s.nis,
      'NISN': s.nisn || '',
      'Nama Siswa': s.name,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Tingkat': s.grade,
      'Rombel': s.classGroup,
      'Nama Wali': s.guardianName,
      'No WA Wali': s.guardianPhone,
      'Syahriah Bulanan (Rp)': s.monthlySyahriah,
      'Status Biaya': s.isExempt ? 'Bebas Biaya / Yatim' : 'Reguler',
      'Status Siswa': s.status,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(
      wb,
      `Data_Siswa_MI_Soborejo_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      {/* Import Success Notification */}
      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl shadow-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">
                {importNotification.message}
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                {importNotification.detail}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="p-1 text-emerald-700 hover:text-emerald-900 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Master Data Siswa
            </span>
            <span className="text-xs text-gray-500">
              Total: {students.length} Siswa Terdaftar
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Data Siswa & Wali Murid MI
          </h2>
          <p className="text-xs text-gray-500">
            Kelola data santri, impor massal via Excel/CSV, dan pengaturan tarif syahriah
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Export Data Button */}
          <button
            type="button"
            onClick={handleExportData}
            title="Ekspor daftar siswa saat ini ke Excel"
            className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl font-medium text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-gray-600" />
            <span>Ekspor Excel</span>
          </button>

          {/* Import Modal Button */}
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-semibold text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700" />
            <span>Impor Data Siswa</span>
            <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-md font-bold ml-0.5">
              Excel / CSV
            </span>
          </button>

          {/* Manual Add Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Siswa</span>
          </button>

          {/* Delete All Students Button */}
          {students.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteAllOpen(true)}
              title="Hapus semua data siswa dari kelas 1 sampai kelas 6"
              className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-medium text-xs shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Semua Siswa</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedGrade('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                selectedGrade === 'ALL'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              Semua ({students.length})
            </button>
            {[1, 2, 3, 4, 5, 6].map((gr) => (
              <button
                key={gr}
                type="button"
                onClick={() => setSelectedGrade(gr)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedGrade === gr
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Kelas {gr}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIS, wali..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[11px] border-b border-gray-200">
              <tr>
                <th className="py-3 px-3 text-center w-10">No</th>
                <th className="py-3 px-4 min-w-[170px]">Nama Lengkap Siswa</th>
                <th className="py-3 px-3 w-20">NIS / NISN</th>
                <th className="py-3 px-2 text-center w-16">Kelas</th>
                <th className="py-3 px-2 text-center w-12">L/P</th>
                <th className="py-3 px-3 min-w-[140px]">Wali Murid</th>
                <th className="py-3 px-3 min-w-[120px]">No. WhatsApp</th>
                <th className="py-3 px-3 text-right">Syahriah</th>
                <th className="py-3 px-3 text-center">Status Bayar</th>
                <th className="py-3 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-700">Tidak ada data siswa ditemukan</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {searchQuery ? 'Coba ubah kata kunci pencarian atau filter kelas' : 'Belum ada data siswa terdaftar'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(''); setSelectedGrade('ALL'); }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer"
                        >
                          Reset Pencarian
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Impor Data Siswa (Excel/CSV)</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                const paid = getStudentPaidMonths(student.id);
                return (
                  <tr key={student.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-center text-gray-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <span>{student.name}</span>
                        {student.isExempt && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold shrink-0">
                            Beasiswa Yatim
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">
                      <div>{student.nis}</div>
                      {student.nisn && <div className="text-[10px] text-gray-400">{student.nisn}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-center font-medium text-gray-700">
                      {student.classGroup}
                    </td>
                    <td className="py-2.5 px-2 text-center font-medium text-gray-500">
                      {student.gender}
                    </td>
                    <td className="py-2.5 px-3 text-gray-800">
                      {student.guardianName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">
                      {student.guardianPhone ? (
                        <a
                          href={`https://wa.me/${student.guardianPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{student.guardianPhone}</span>
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-800">
                      {student.isExempt ? 'Bebas' : formatRupiah(student.monthlySyahriah)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          student.isExempt || paid.length === 12
                            ? 'bg-emerald-100 text-emerald-800'
                            : paid.length > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {student.isExempt ? 'Lunas 100%' : `${paid.length} bln lunas`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus siswa ${student.name}?`)) {
                              deleteStudent(student.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: TAMBAH / EDIT SISWA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-800 text-white">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">
                  {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rayhan Firdaus"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    NIS (Nomor Induk Siswa) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 2405"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    NISN (Nasional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0158921105"
                    value={formData.nisn}
                    onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tingkat Kelas *
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => {
                      const gr = Number(e.target.value);
                      setFormData({
                        ...formData,
                        grade: gr,
                        classGroup: `Kelas ${gr}`,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <option key={g} value={g}>
                        Kelas {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Rombel
                  </label>
                  <input
                    type="text"
                    value={formData.classGroup}
                    onChange={(e) => setFormData({ ...formData, classGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Nama Wali Murid *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bpk. Haryono"
                    value={formData.guardianName}
                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    No. WhatsApp Wali *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08123456789"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              {/* Syahriah Rate & Beasiswa */}
              <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isExempt}
                      onChange={(e) => setFormData({ ...formData, isExempt: e.target.checked })}
                      className="w-4 h-4 text-emerald-700 rounded focus:ring-emerald-500"
                    />
                    <span>Siswa Beasiswa / Yatim Piatu (Bebas Biaya Syahriah)</span>
                  </label>
                </div>

                {!formData.isExempt && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nominal Syahriah per Bulan (Rp)
                    </label>
                    <input
                      type="text"
                      value={formData.monthlySyahriah}
                      onChange={(e) => setFormData({ ...formData, monthlySyahriah: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Standar madrasah: {formatRupiah(schoolProfile.standardSyahriah)}/bulan
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Import Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        standardSyahriah={schoolProfile.standardSyahriah}
        existingStudents={students}
        onImportSuccess={handleImportSuccess}
      />

      {/* Confirm Delete All Modal */}
      {isConfirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Hapus Semua Data Siswa?
                </h3>
                <p className="text-xs text-gray-500">
                  Tindakan ini akan menghapus data siswa Kelas 1 s.d. 6
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-rose-50/70 p-3.5 rounded-xl border border-rose-100">
              Apakah Anda yakin ingin menghapus seluruh data siswa ({students.length} santri)? 
              Data yang telah dihapus dapat diisi kembali menggunakan tombol <strong>Impor Data Siswa (Excel/CSV)</strong> atau input manual.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Semua Siswa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
