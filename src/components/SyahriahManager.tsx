import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Receipt,
  MessageSquare,
  Printer,
  Calendar,
  Wallet,
  AlertTriangle,
  History,
  Table,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  AcademicMonth,
  ACADEMIC_MONTHS,
  Student,
  SyahriahPaymentRecord,
} from '../types';
import {
  formatRupiah,
  formatDateIndo,
  getTodayDateString,
} from '../utils/formatters';

interface SyahriahManagerProps {
  initialOpenPayModal?: boolean;
}

export const SyahriahManager: React.FC<SyahriahManagerProps> = ({
  initialOpenPayModal = false,
}) => {
  const {
    students,
    syahriahPayments,
    cashAccounts,
    schoolProfile,
    recordSyahriahPayment,
    deleteSyahriahPayment,
    getStudentPaidMonths,
    isMonthPaid,
    setActiveReceipt,
    setEditingSyahriahPayment,
    isAdmin,
    requireAdmin,
  } = useFinance();

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'arrears' | 'history'>('matrix');

  // Filter states
  const [selectedGrade, setSelectedGrade] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Form Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(initialOpenPayModal);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedMonths, setSelectedMonths] = useState<AcademicMonth[]>([]);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<string>('TUNAI');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('kas-tunai');
  const [notes, setNotes] = useState('');

  // WhatsApp Reminder Modal / Action state
  const [reminderMonth, setReminderMonth] = useState<AcademicMonth>('September');

  // Delete Confirmation state for safe in-app deletion without window.confirm
  const [recordToDelete, setRecordToDelete] = useState<SyahriahPaymentRecord | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);

  // Selected student object
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId]
  );

  // Filtered students for matrix view
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => s.status === 'AKTIF')
      .filter((s) => (selectedGrade === 'ALL' ? true : s.grade === selectedGrade))
      .filter((s) => {
        const query = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(query) ||
          s.nis.toLowerCase().includes(query) ||
          s.classGroup.toLowerCase().includes(query) ||
          s.guardianName.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
  }, [students, selectedGrade, searchQuery]);

  // Open pay modal for specific student & pre-selected month
  const handleOpenPayForStudent = (student: Student, month?: AcademicMonth) => {
    requireAdmin(() => {
      setSelectedStudentId(student.id);
      const paid = getStudentPaidMonths(student.id);

      if (month && !paid.includes(month)) {
        setSelectedMonths([month]);
      } else {
        // Find first unpaid month
        const firstUnpaid = ACADEMIC_MONTHS.find((m) => !paid.includes(m));
        setSelectedMonths(firstUnpaid ? [firstUnpaid] : []);
      }
      setPaymentDate(getTodayDateString());
      setSelectedAccountId('kas-tunai');
      setPaymentMethod('TUNAI');
      setNotes('');
      setIsPayModalOpen(true);
    }, `Pencatatan Pembayaran Syahriah (${student.name})`);
  };

  // Toggle month selection in modal
  const toggleMonth = (month: AcademicMonth) => {
    if (!selectedStudent) return;
    const alreadyPaid = isMonthPaid(selectedStudent.id, month);
    if (alreadyPaid && !selectedStudent.isExempt) return;

    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter((m) => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  // Submit payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || selectedMonths.length === 0) return;

    const rate = selectedStudent.monthlySyahriah || schoolProfile.standardSyahriah;
    const totalAmount = rate * selectedMonths.length;

    const paymentRecord = recordSyahriahPayment({
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      grade: selectedStudent.grade,
      classGroup: selectedStudent.classGroup,
      months: selectedMonths,
      amountPerMonth: rate,
      totalAmount,
      paymentDate,
      paymentMethod,
      accountId: selectedAccountId,
      receivedBy: schoolProfile.treasurerName,
      notes,
    });

    setIsPayModalOpen(false);
    // Show printable receipt immediately!
    setActiveReceipt(paymentRecord);
  };

  // WhatsApp reminder generator
  const sendWhatsAppReminder = (student: Student, unpaidMonths: AcademicMonth[]) => {
    let cleanPhone = student.guardianPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const rate = student.monthlySyahriah || schoolProfile.standardSyahriah;
    const totalTagihan = rate * unpaidMonths.length;

    const message =
      `*PEMBERITAHUAN SYAHRIAH / SPP MADRASAH*\n` +
      `*${schoolProfile.name}*\n` +
      `------------------------------------------\n` +
      `Kepada Yth. *${student.guardianName}*\n` +
      `Wali dari ananda: *${student.name}* (${student.classGroup})\n\n` +
      `Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\n` +
      `Kami sampaikan informasi kewajiban syahriah ananda untuk bulan:\n` +
      `📅 *${unpaidMonths.join(', ')}*\n` +
      `💰 Nominal: *${formatRupiah(totalTagihan)}*\n\n` +
      `Pembayaran dapat dititipkan secara tunai di kantor bendahara madrasah, atau via transfer:\n` +
      `🏦 *Bank Syariah Indonesia (BSI)*\n` +
      `No. Rekening: *7145829910*\n` +
      `A.n: *MI Ma'arif Al Ihsan Soborejo*\n\n` +
      `Konfirmasi pembayaran dapat menghubungi:\n` +
      `Ibu ${schoolProfile.treasurerName} (Bendahara) - ${schoolProfile.phone}\n\n` +
      `_Jazakumullahu khairan katsiran atas perhatian dan kerjasamanya._\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Compute unpaid students for the arrears tab
  const arrearsData = useMemo(() => {
    return students
      .filter((s) => s.status === 'AKTIF' && !s.isExempt)
      .map((student) => {
        const paid = getStudentPaidMonths(student.id);
        const unpaidMonths = ACADEMIC_MONTHS.filter((m) => !paid.includes(m));
        const rate = student.monthlySyahriah || schoolProfile.standardSyahriah;
        const isArrearForSelectedMonth = !paid.includes(reminderMonth);

        return {
          student,
          paidCount: paid.length,
          unpaidMonths,
          unpaidTotal: unpaidMonths.length * rate,
          isArrearForSelectedMonth,
        };
      })
      .filter((item) => item.unpaidMonths.length > 0)
      .sort((a, b) => b.unpaidMonths.length - a.unpaidMonths.length);
  }, [students, reminderMonth, getStudentPaidMonths, schoolProfile.standardSyahriah]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Modul Syahriah Santri
            </span>
            <span className="text-xs text-gray-500">
              Standar: {formatRupiah(schoolProfile.standardSyahriah)}/bulan
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Pembayaran Syahriah / SPP Siswa
          </h2>
          <p className="text-xs text-gray-500">
            Pencatatan iuran bulanan, penerbitan kwitansi sah, dan pelacakan tunggakan 12 bulan.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-open-syahriah-modal"
            type="button"
            onClick={() => {
              requireAdmin(() => {
                setSelectedStudentId(students[0]?.id || '');
                setSelectedMonths(['Juli']);
                setIsPayModalOpen(true);
              }, 'Pencatatan Pembayaran Syahriah');
            }}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-sm shadow-sm transition-colors cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pembayaran Syahriah</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Matriks, Lacak Tunggakan, Riwayat */}
      <div className="flex border-b border-gray-200 bg-white px-4 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('matrix')}
          className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'matrix'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Matriks 12 Bulan (Juli - Juni)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('arrears')}
          className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'arrears'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Lacak Tunggakan & Kirim WA ({arrearsData.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`py-3.5 px-4 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'history'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Transaksi & Kwitansi ({syahriahPayments.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: MATRIX VIEW (12 MONTHS) */}
      {activeSubTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            {/* Grade Tabs */}
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
                Semua Kelas ({students.length})
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

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa / NIS..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Matrix Legend */}
          <div className="px-4 py-2 bg-emerald-50/40 border-b border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <span className="font-semibold text-emerald-900">Keterangan:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-flex items-center justify-center text-white text-[9px] font-bold">✓</span>
              <span>Lunas</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-300 inline-block"></span>
              <span>Belum Bayar (Klik untuk bayar)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-purple-100 border border-purple-300 text-purple-800 inline-flex items-center justify-center text-[9px] font-bold">B</span>
              <span>Beasiswa / Yatim (Bebas)</span>
            </span>
          </div>

          {/* Responsive Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[170px]">Nama Siswa</th>
                  <th className="py-3 px-2 w-16 text-center">Kelas</th>
                  <th className="py-3 px-2 w-20 text-right">Tarif</th>
                  {ACADEMIC_MONTHS.map((month) => (
                    <th key={month} className="py-3 px-1.5 text-center min-w-[48px]">
                      {month.slice(0, 3)}
                    </th>
                  ))}
                  <th className="py-3 px-2 text-center w-16">Total</th>
                  <th className="py-3 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-gray-500">
                      <p className="text-sm font-semibold text-gray-700">Belum ada data siswa</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Silakan tambahkan data siswa di menu Data Siswa atau impor melalui Excel/CSV
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                  const paidMonths = getStudentPaidMonths(student.id);
                  const isExempt = student.isExempt;
                  const rate = student.monthlySyahriah || schoolProfile.standardSyahriah;

                  return (
                    <tr key={student.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="py-2.5 px-3 text-center text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{student.name}</span>
                          {isExempt && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold shrink-0">
                              Yatim/Afirmasi
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">NIS: {student.nis}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium text-gray-600">
                        {student.classGroup}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-gray-600">
                        {isExempt ? 'Rp 0' : formatRupiah(rate)}
                      </td>

                      {/* 12 Months Status Cells */}
                      {ACADEMIC_MONTHS.map((month) => {
                        const paid = isMonthPaid(student.id, month);

                        if (isExempt) {
                          return (
                            <td key={month} className="py-2 px-1 text-center">
                              <span
                                title="Bebas Biaya (Afirmasi)"
                                className="w-7 h-7 rounded-md bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center justify-center font-bold text-[10px]"
                              >
                                B
                              </span>
                            </td>
                          );
                        }

                        if (paid) {
                          const paymentRecord = syahriahPayments.find(
                            (p) =>
                              p.studentId === student.id &&
                              p.months &&
                              p.months.includes(month)
                          );
                          return (
                            <td key={month} className="py-2 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (paymentRecord) {
                                    setActiveReceipt(paymentRecord);
                                  }
                                }}
                                title={`Lunas bulan ${month}. Klik untuk lihat bukti atau koreksi pembayaran`}
                                className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white inline-flex items-center justify-center font-bold text-[11px] shadow-2xs cursor-pointer transition-colors"
                              >
                                ✓
                              </button>
                            </td>
                          );
                        }

                        // Unpaid: clickable button to pay directly
                        return (
                          <td key={month} className="py-2 px-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenPayForStudent(student, month)}
                              title={`Klik untuk bayar bulan ${month} (${formatRupiah(rate)})`}
                              className="w-7 h-7 rounded-md bg-gray-50 border border-gray-200 hover:bg-amber-100 hover:border-amber-400 text-gray-300 hover:text-amber-800 inline-flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer"
                            >
                              -
                            </button>
                          </td>
                        );
                      })}

                      {/* Total Months Paid */}
                      <td className="py-2.5 px-2 text-center font-semibold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            isExempt || paidMonths.length === 12
                              ? 'bg-emerald-100 text-emerald-800'
                              : paidMonths.length > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isExempt ? '12/12' : `${paidMonths.length}/12`}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenPayForStudent(student)}
                          className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-md border border-emerald-200 transition-colors cursor-pointer"
                        >
                          Bayar
                        </button>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: LACAK TUNGGAKAN & WA REMINDER */}
      {activeSubTab === 'arrears' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Daftar Tunggakan Syahriah Siswa
              </h3>
              <p className="text-xs text-gray-500">
                Lacak siswa yang belum lunas dan kirim pengingat santun melalui WhatsApp ke wali murid
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700">Fokus Bulan:</label>
              <select
                value={reminderMonth}
                onChange={(e) => setReminderMonth(e.target.value as AcademicMonth)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {ACADEMIC_MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {arrearsData.map(({ student, unpaidMonths, unpaidTotal, isArrearForSelectedMonth }) => (
              <div
                key={student.id}
                className={`p-4 rounded-xl border transition-all ${
                  isArrearForSelectedMonth
                    ? 'border-amber-300 bg-amber-50/30'
                    : 'border-gray-200 bg-gray-50/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700 uppercase">
                      {student.classGroup}
                    </span>
                    <h4 className="font-bold text-sm text-gray-900 mt-1">{student.name}</h4>
                    <p className="text-xs text-gray-500">Wali: {student.guardianName}</p>
                    <p className="text-xs font-mono text-gray-500">HP: {student.guardianPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {unpaidMonths.length} Bln Nunggak
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200/60">
                  <div className="text-xs text-gray-600 mb-2">
                    <span>Bulan belum bayar: </span>
                    <span className="font-medium text-gray-800">
                      {unpaidMonths.slice(0, 3).join(', ')}
                      {unpaidMonths.length > 3 ? ` +${unpaidMonths.length - 3} bln` : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-gray-800 mb-3">
                    <span>Total Tunggakan:</span>
                    <span className="font-mono text-sm text-rose-700">
                      {formatRupiah(unpaidTotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPayForStudent(student)}
                      className="py-1.5 px-2.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer text-center"
                    >
                      Bayar Sekarang
                    </button>
                    <button
                      type="button"
                      onClick={() => sendWhatsAppReminder(student, unpaidMonths)}
                      className="py-1.5 px-2.5 text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Kirim WA</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {arrearsData.length === 0 && (
            <div className="p-8 text-center bg-emerald-50 rounded-xl text-emerald-900 border border-emerald-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-base">Alhamdulillah, Tidak Ada Tunggakan!</h4>
              <p className="text-xs text-emerald-700 mt-1">
                Seluruh siswa telah melunasi kewajiban syahriah.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: RIWAYAT PEMBAYARAN SYAHRIAH */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Riwayat Kwitansi & Pembayaran Syahriah
              </h3>
              <p className="text-xs text-gray-500">
                Daftar kwitansi pembayaran syahriah yang telah diterbitkan bendahara
              </p>
            </div>
            <span className="text-xs font-medium text-gray-600 bg-white px-2.5 py-1 rounded-md border border-gray-200">
              Total Transaksi: <strong className="text-emerald-700">{syahriahPayments.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-100 text-gray-700 uppercase font-semibold text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">No. Kwitansi</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-2 text-center">Kelas</th>
                  <th className="py-3 px-3">Bulan Dibayar</th>
                  <th className="py-3 px-3 text-right">Total Bayar</th>
                  <th className="py-3 px-3">Metode</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {syahriahPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gray-800">
                      {payment.receiptNo}
                    </td>
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                      {formatDateIndo(payment.paymentDate)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900">
                      {payment.studentName}
                    </td>
                    <td className="py-3 px-2 text-center font-medium text-gray-600">
                      {payment.classGroup}
                    </td>
                    <td className="py-3 px-3 text-emerald-800 font-medium">
                      {payment.months.join(', ')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatRupiah(payment.totalAmount)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 uppercase">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveReceipt(payment)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Lihat, Simpan & Cetak Bukti Pembayaran"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Bukti</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            requireAdmin(() => {
                              setEditingSyahriahPayment(payment);
                            }, `Koreksi Kwitansi ${payment.receiptNo} (${payment.studentName})`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          title="Koreksi / Edit Pembayaran Ini"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            requireAdmin(() => {
                              setRecordToDelete(payment);
                            }, `Hapus Kwitansi ${payment.receiptNo} (${payment.studentName})`);
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Pembayaran"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM MODAL: CATAT PEMBAYARAN SYAHRIAH */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-800 text-white">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">Input Pembayaran Syahriah Siswa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-sm">
              {/* Select Student */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pilih Siswa *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setSelectedMonths([]);
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students
                    .filter((s) => s.status === 'AKTIF')
                    .sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.classGroup}] {s.name} - NIS: {s.nis} {s.isExempt ? '(Bebas Biaya)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Student Details Preview */}
              {selectedStudent && (
                <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Kelas / Tingkat:</span>
                    <p className="font-semibold text-gray-900">{selectedStudent.classGroup}</p>
                    <span className="text-gray-500">Wali Murid:</span>
                    <p className="font-semibold text-gray-900">{selectedStudent.guardianName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tarif per Bulan:</span>
                    <p className="font-bold text-emerald-800 font-mono">
                      {selectedStudent.isExempt
                        ? 'Rp 0 (Afirmasi/Yatim)'
                        : formatRupiah(selectedStudent.monthlySyahriah || schoolProfile.standardSyahriah)}
                    </p>
                    <span className="text-gray-500">No. WhatsApp Wali:</span>
                    <p className="font-semibold text-gray-900">{selectedStudent.guardianPhone}</p>
                  </div>
                </div>
              )}

              {/* Month Selection Grid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Pilih Bulan yang Dibayarkan *
                  </label>
                  <span className="text-xs text-gray-500">Bisa pilih lebih dari 1 bulan</span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ACADEMIC_MONTHS.map((month) => {
                    const alreadyPaid = selectedStudent ? isMonthPaid(selectedStudent.id, month) : false;
                    const isSelected = selectedMonths.includes(month);

                    return (
                      <button
                        key={month}
                        type="button"
                        disabled={alreadyPaid}
                        onClick={() => toggleMonth(month)}
                        className={`py-2 px-2.5 text-xs rounded-lg font-medium transition-all text-center border cursor-pointer ${
                          alreadyPaid
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs font-bold'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
                        }`}
                      >
                        {month}
                        {alreadyPaid ? ' (Lunas)' : isSelected ? ' ✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Account Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Pembayaran
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentMethod(val);
                      if (val === 'TUNAI') {
                        const cashAcc = cashAccounts.find((a) => a.type === 'CASH');
                        if (cashAcc) setSelectedAccountId(cashAcc.id);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="TUNAI">Uang Tunai (Kas Bendahara)</option>
                    {cashAccounts
                      .filter((a) => a.type === 'BANK')
                      .map((b) => (
                        <option
                          key={b.id}
                          value={`TRANSFER_${b.bankName ? b.bankName.toUpperCase().replace(/\s+/g, '_') : b.name.toUpperCase().replace(/\s+/g, '_')}`}
                        >
                          Transfer {b.bankName || b.name}
                        </option>
                      ))}
                    {cashAccounts.every((a) => a.type !== 'BANK') && (
                      <option value="TRANSFER_BANK">Transfer Bank</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Destination Cash Account */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Masuk ke Pos Kas / Rekening Penerima:
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    const accId = e.target.value;
                    setSelectedAccountId(accId);
                    const acc = cashAccounts.find((a) => a.id === accId);
                    if (acc?.type === 'CASH') {
                      setPaymentMethod('TUNAI');
                    } else if (acc?.type === 'BANK') {
                      setPaymentMethod(
                        `TRANSFER_${acc.bankName ? acc.bankName.toUpperCase().replace(/\s+/g, '_') : acc.name.toUpperCase().replace(/\s+/g, '_')}`
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {cashAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} {acc.accountNumber ? `(${acc.bankName || 'Bank'} - ${acc.accountNumber})` : '(Kas Tunai)'} — Saldo: {formatRupiah(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Titip lewat wali kelas, transfer jam 10 pagi, dll."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 bg-gray-100 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500">Jumlah Bulan:</span>
                  <p className="font-bold text-gray-900">{selectedMonths.length} Bulan</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Total yang Diterima:</span>
                  <p className="text-xl font-bold font-mono text-emerald-800">
                    {formatRupiah(
                      (selectedStudent?.monthlySyahriah || schoolProfile.standardSyahriah) *
                        selectedMonths.length
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!selectedStudent || selectedMonths.length === 0}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Simpan & Buka Bukti Pembayaran</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL KONFIRMASI HAPUS PEMBAYARAN SYAHRIAH */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-rose-200">
            <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Hapus Pembayaran Syahriah?
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  Tindakan ini akan membatalkan kwitansi dan mengembalikan saldo kas.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-sm text-gray-700">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">No. Kwitansi:</span>
                  <span className="font-mono font-bold text-gray-900">{recordToDelete.receiptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Santri / Siswa:</span>
                  <span className="font-semibold text-gray-900">{recordToDelete.studentName} ({recordToDelete.classGroup})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bulan:</span>
                  <span className="text-emerald-700 font-semibold">{recordToDelete.months.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Nominal:</span>
                  <span className="font-mono font-bold text-rose-700">{formatRupiah(recordToDelete.totalAmount)}</span>
                </div>
              </div>

              <div className="text-xs text-gray-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                <p className="font-semibold text-amber-900 mb-1">Dampak Penghapusan:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                  <li>Saldo kas akan otomatis dikurangi sebesar {formatRupiah(recordToDelete.totalAmount)}.</li>
                  <li>Bulan {recordToDelete.months.join(', ')} akan kembali berstatus tunggakan.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeletingRecord}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (recordToDelete) {
                    setIsDeletingRecord(true);
                    deleteSyahriahPayment(recordToDelete.id);
                    setIsDeletingRecord(false);
                    setRecordToDelete(null);
                  }
                }}
                disabled={isDeletingRecord}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingRecord ? 'Menghapus...' : 'Ya, Hapus Pembayaran'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
