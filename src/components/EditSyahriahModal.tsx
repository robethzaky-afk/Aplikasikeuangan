import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Save,
  Info,
  Loader2,
  Check,
} from 'lucide-react';
import {
  SyahriahPaymentRecord,
  AcademicMonth,
  ACADEMIC_MONTHS,
  Student,
} from '../types';
import { useFinance } from '../context/FinanceContext';
import {
  formatRupiah,
  formatDateIndo,
  getTodayDateString,
} from '../utils/formatters';

interface EditSyahriahModalProps {
  payment: SyahriahPaymentRecord;
  onClose: () => void;
}

export const EditSyahriahModal: React.FC<EditSyahriahModalProps> = ({
  payment,
  onClose,
}) => {
  const {
    students,
    schoolProfile,
    cashAccounts,
    syahriahPayments,
    updateSyahriahPayment,
    setActiveReceipt,
  } = useFinance();

  // Ensure selected student exists even if students list is empty or student is archived
  const studentList = useMemo(() => {
    const active = students.filter((s) => s.status === 'AKTIF');
    if (payment.studentId && !active.some((s) => s.id === payment.studentId)) {
      const existing = students.find((s) => s.id === payment.studentId);
      if (existing) {
        return [existing, ...active];
      } else {
        const fallbackStudent: Student = {
          id: payment.studentId,
          nis: '',
          name: payment.studentName,
          grade: payment.grade || 1,
          classGroup: payment.classGroup || '1A',
          gender: 'L',
          guardianName: '',
          guardianPhone: '',
          monthlySyahriah:
            payment.amountPerMonth || schoolProfile.standardSyahriah || 20000,
          isExempt: false,
          status: 'AKTIF',
        };
        return [fallbackStudent, ...active];
      }
    }
    return active.length > 0
      ? active
      : [
          {
            id: payment.studentId,
            nis: '',
            name: payment.studentName,
            grade: payment.grade || 1,
            classGroup: payment.classGroup || '1A',
            gender: 'L',
            guardianName: '',
            guardianPhone: '',
            monthlySyahriah:
              payment.amountPerMonth || schoolProfile.standardSyahriah || 20000,
            isExempt: false,
            status: 'AKTIF',
          },
        ];
  }, [students, payment, schoolProfile.standardSyahriah]);

  // Selected Student state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    payment.studentId || (studentList[0]?.id ?? '')
  );

  const selectedStudent: Student = useMemo(() => {
    return (
      students.find((s) => s.id === selectedStudentId) ||
      studentList.find((s) => s.id === selectedStudentId) || {
        id: payment.studentId,
        nis: '',
        name: payment.studentName,
        grade: payment.grade || 1,
        classGroup: payment.classGroup || '1A',
        gender: 'L',
        guardianName: '',
        guardianPhone: '',
        monthlySyahriah:
          payment.amountPerMonth || schoolProfile.standardSyahriah || 20000,
        isExempt: false,
        status: 'AKTIF',
      }
    );
  }, [students, studentList, selectedStudentId, payment, schoolProfile.standardSyahriah]);

  // Months
  const [selectedMonths, setSelectedMonths] = useState<AcademicMonth[]>(
    payment.months && payment.months.length > 0 ? payment.months : ['Juli']
  );

  // Rate & Amounts
  const initialRate =
    payment.amountPerMonth ||
    selectedStudent.monthlySyahriah ||
    schoolProfile.standardSyahriah ||
    20000;
  const [amountPerMonth, setAmountPerMonth] = useState<number>(initialRate);
  const [isCustomTotal, setIsCustomTotal] = useState<boolean>(
    payment.totalAmount !== initialRate * (payment.months?.length || 1)
  );
  const [customTotalAmount, setCustomTotalAmount] = useState<number>(
    payment.totalAmount || initialRate
  );

  // Date formatted to YYYY-MM-DD for HTML input
  const initialDateString = useMemo(() => {
    if (payment.paymentDate) {
      const raw = payment.paymentDate.trim();
      if (raw.includes('T')) return raw.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    }
    return getTodayDateString();
  }, [payment.paymentDate]);

  const [paymentDate, setPaymentDate] = useState<string>(initialDateString);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    payment.paymentMethod || 'TUNAI'
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    payment.accountId || cashAccounts[0]?.id || 'kas-tunai'
  );

  // Notes & Received By
  const [notes, setNotes] = useState<string>(payment.notes || '');
  const [receivedBy, setReceivedBy] = useState<string>(
    payment.receivedBy || schoolProfile.treasurerName || 'FATHURRAZAQ, S.Pd.I'
  );

  // Validation and saving states
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // When student changes, update rate if appropriate
  const handleStudentChange = (newStudentId: string) => {
    setSelectedStudentId(newStudentId);
    const newStudent = studentList.find((s) => s.id === newStudentId);
    if (newStudent) {
      const rate =
        newStudent.monthlySyahriah || schoolProfile.standardSyahriah || 20000;
      setAmountPerMonth(rate);
      if (!isCustomTotal) {
        setCustomTotalAmount(rate * selectedMonths.length);
      }
    }
    setFormError(null);
  };

  // Calculate which months are already paid in OTHER transactions for this student
  const otherPaidMonths = useMemo(() => {
    return syahriahPayments
      .filter(
        (p) =>
          String(p.studentId) === String(selectedStudentId) &&
          String(p.id).trim() !== String(payment.id).trim()
      )
      .flatMap((p) => p.months || []);
  }, [syahriahPayments, selectedStudentId, payment.id]);

  const toggleMonth = (month: AcademicMonth) => {
    if (otherPaidMonths.includes(month)) return; // Can't select month paid in another transaction
    setFormError(null);

    setSelectedMonths((prev) => {
      const next = prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month];

      // Sort by academic order
      return ACADEMIC_MONTHS.filter((m) => next.includes(m));
    });
  };

  // Recalculate total amount when months or rate change (if not custom total)
  useEffect(() => {
    if (!isCustomTotal) {
      setCustomTotalAmount(amountPerMonth * selectedMonths.length);
    }
  }, [selectedMonths, amountPerMonth, isCustomTotal]);

  const finalTotalAmount = isCustomTotal
    ? customTotalAmount
    : amountPerMonth * selectedMonths.length;

  // Comparison with old payment
  const amountDiff = finalTotalAmount - (payment.totalAmount || 0);
  const isAccountChanged = selectedAccountId !== payment.accountId;
  const oldAccount = cashAccounts.find((a) => a.id === payment.accountId);
  const newAccount = cashAccounts.find((a) => a.id === selectedAccountId);

  // Explicit Save Handler
  const handleSave = () => {
    setFormError(null);

    if (!selectedStudent) {
      setFormError('Silakan tentukan data siswa/santri.');
      return;
    }

    if (selectedMonths.length === 0) {
      setFormError('Pilih minimal 1 bulan yang dibayarkan.');
      return;
    }

    if (finalTotalAmount <= 0) {
      setFormError('Total nominal pembayaran harus lebih besar dari Rp 0.');
      return;
    }

    if (!paymentDate) {
      setFormError('Tanggal pembayaran tidak boleh kosong.');
      return;
    }

    if (!selectedAccountId) {
      setFormError('Silakan pilih pos rekening kas/bank penerima.');
      return;
    }

    setIsSaving(true);

    try {
      const calculatedPerMonth = isCustomTotal
        ? Math.round(finalTotalAmount / Math.max(1, selectedMonths.length))
        : amountPerMonth;

      const updatedRecord: SyahriahPaymentRecord = {
        ...payment, // Keep id, receiptNo, createdAt
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        grade: selectedStudent.grade,
        classGroup: selectedStudent.classGroup,
        months: selectedMonths,
        amountPerMonth: calculatedPerMonth,
        totalAmount: finalTotalAmount,
        paymentDate,
        paymentMethod,
        accountId: selectedAccountId,
        receivedBy:
          receivedBy.trim() ||
          schoolProfile.treasurerName ||
          'Bendahara Madrasah',
        notes: notes.trim() || undefined,
      };

      // 1. Jalankan update di state dan cloud
      updateSyahriahPayment(updatedRecord);

      // 2. Beri indikasi visual sukses
      setIsSaving(false);
      setIsSuccess(true);

      // 3. Tutup modal edit dan buka kwitansi terbarui
      setTimeout(() => {
        onClose();
        setActiveReceipt(updatedRecord);
      }, 400);
    } catch (err: any) {
      setIsSaving(false);
      setFormError(
        `Terjadi kesalahan saat menyimpan: ${err.message || String(err)}`
      );
    }
  };

  return (
    <div
      id="edit-syahriah-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="edit-syahriah-modal-container"
        className="bg-white text-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-amber-200 my-8 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-emerald-800 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-amber-200 shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">
                  Edit / Koreksi Pembayaran Syahriah
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/30 text-amber-100 border border-amber-400/30">
                  {payment.receiptNo}
                </span>
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Koreksi kekeliruan bulan, nominal, rekening, atau komplain wali murid
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Info Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">
              Penyesuaian Saldo Otomatis:
            </span>
            <span>
              Perubahan bulan, nominal, atau rekening tujuan akan otomatis
              dihitung ulang ke saldo buku kas/bank penerima dan status lunas
              santri. Nomor kwitansi tetap{' '}
              <strong>{payment.receiptNo}</strong>.
            </span>
          </div>
        </div>

        {/* Error Alert if any */}
        {formError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{formError}</div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-5 text-xs sm:text-sm">
          {/* Siswa (Dapat diubah jika salah input santri) */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Pilih Santri / Siswa:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {studentList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} — Kelas {st.classGroup} (NIS: {st.nis || '-'}){' '}
                  {st.isExempt ? '[Bebas Biaya]' : ''}
                </option>
              ))}
            </select>

            {selectedStudent && (
              <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Wali Murid: </span>
                  <strong className="text-gray-800">
                    {selectedStudent.guardianName || '-'}
                  </strong>
                  <span className="text-gray-400 mx-2">•</span>
                  <span className="text-gray-500">No. WA: </span>
                  <span className="font-mono text-gray-700">
                    {selectedStudent.guardianPhone || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Tarif Standar Siswa: </span>
                  <strong className="text-emerald-700 font-mono">
                    {formatRupiah(
                      selectedStudent.monthlySyahriah ||
                        schoolProfile.standardSyahriah ||
                        20000
                    )}
                    /bln
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Pemilihan Bulan Pembayaran */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-gray-700">
                Bulan yang Dibayarkan *
              </label>
              <span className="text-xs text-gray-500">
                {selectedMonths.length} bulan terpilih
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {ACADEMIC_MONTHS.map((month) => {
                const isPaidInOther = otherPaidMonths.includes(month);
                const isSelected = selectedMonths.includes(month);
                const wasInOriginal = payment.months?.includes(month);

                return (
                  <button
                    key={month}
                    type="button"
                    disabled={isPaidInOther}
                    onClick={() => toggleMonth(month)}
                    className={`py-2 px-2 text-xs rounded-lg font-medium transition-all text-center border cursor-pointer relative ${
                      isPaidInOther
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : isSelected
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs font-bold'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    <span>{month}</span>
                    {isPaidInOther && (
                      <span className="block text-[9px] text-gray-400 leading-tight">
                        (Lunas Lain)
                      </span>
                    )}
                    {isSelected && <span className="ml-1">✓</span>}
                    {isSelected && !wasInOriginal && (
                      <span className="block text-[9px] text-emerald-200 leading-tight font-normal">
                        + Ditambah
                      </span>
                    )}
                    {!isSelected && wasInOriginal && (
                      <span className="block text-[9px] text-rose-500 leading-tight font-normal">
                        - Dihapus
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tarif per Bulan & Custom Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Tarif per Bulan (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={amountPerMonth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setAmountPerMonth(val);
                }}
                disabled={isCustomTotal}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-500 font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-gray-700">
                  Total Nominal Pembayaran (Rp)
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-amber-700 hover:text-amber-800">
                  <input
                    type="checkbox"
                    checked={isCustomTotal}
                    onChange={(e) => {
                      setIsCustomTotal(e.target.checked);
                      if (!e.target.checked) {
                        setCustomTotalAmount(
                          amountPerMonth * selectedMonths.length
                        );
                      }
                    }}
                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Kustom Total</span>
                </label>
              </div>
              <input
                type="number"
                min="0"
                step="1000"
                value={finalTotalAmount}
                onChange={(e) => setCustomTotalAmount(Number(e.target.value))}
                disabled={!isCustomTotal}
                className={`w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold ${
                  isCustomTotal
                    ? 'border-amber-400 bg-amber-50/50 text-gray-900'
                    : 'border-gray-300 bg-gray-100 text-emerald-800'
                }`}
              />
            </div>
          </div>

          {/* Tanggal & Metode Bayar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Tanggal Pembayaran:
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => {
                  setPaymentDate(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Metode Pembayaran:
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="TUNAI">Kas Tunai (Bendahara)</option>
                <option value="TRANSFER_BSI">
                  Transfer BSI (Bank Syariah Indonesia)
                </option>
                <option value="TRANSFER_BRI">Transfer BRI</option>
                <option value="TRANSFER_BANK">Transfer Bank Lain</option>
              </select>
            </div>
          </div>

          {/* Pos Rekening Kas/Bank */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Rekening Kas/Bank Penerima Dana:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {cashAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}{' '}
                  {acc.accountNumber
                    ? `(${acc.bankName || 'Bank'} - ${acc.accountNumber})`
                    : '(Kas Tunai)'}{' '}
                  — Saldo Saat Ini: {formatRupiah(acc.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Catatan / Alasan Koreksi */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Catatan / Alasan Koreksi (Opsional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Klarifikasi komplain wali murid, pembetulan bulan pembayaran"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Nama Penerima / Bendahara */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Penerima / Bendahara:
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Nama bendahara penerima"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* Perbandingan & Dampak Keuangan (Diff Box) */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Ringkasan Rekonsiliasi Perubahan:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-white border border-gray-200">
                <span className="text-gray-400 block text-[11px]">
                  Sebelum Diedit:
                </span>
                <span className="font-semibold text-gray-800">
                  {payment.months?.join(', ') || '-'}
                </span>
                <span className="block font-mono text-gray-700">
                  {formatRupiah(payment.totalAmount || 0)}
                </span>
                <span className="text-[11px] text-gray-500">
                  Akun: {oldAccount?.name || payment.accountId}
                </span>
              </div>

              <div className="p-2 rounded bg-emerald-50/70 border border-emerald-200">
                <span className="text-emerald-700 block text-[11px] font-bold">
                  Sesudah Diedit:
                </span>
                <span className="font-bold text-emerald-900">
                  {selectedMonths.join(', ') || '-'}
                </span>
                <span className="block font-mono font-bold text-emerald-800">
                  {formatRupiah(finalTotalAmount)}
                </span>
                <span className="text-[11px] text-emerald-700">
                  Akun: {newAccount?.name || selectedAccountId}
                </span>
              </div>
            </div>

            {/* Selisih Kas Notification */}
            {amountDiff !== 0 && (
              <div
                className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium ${
                  amountDiff > 0
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-rose-100 text-rose-900'
                }`}
              >
                <span>Selisih Nominal:</span>
                <span className="font-mono font-bold">
                  {amountDiff > 0
                    ? `+${formatRupiah(amountDiff)} (Kas Bertambah)`
                    : `-${formatRupiah(Math.abs(amountDiff))} (Kas Berkurang)`}
                </span>
              </div>
            )}

            {isAccountChanged && (
              <div className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
                <span>Pemindahan Rekening: </span>
                <strong>{formatRupiah(payment.totalAmount || 0)}</strong> akan
                dipindahkan dari <strong>{oldAccount?.name}</strong> ke{' '}
                <strong>{newAccount?.name}</strong>.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isSuccess}
              className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-600'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
              } disabled:opacity-75`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : isSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Perubahan Disimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan & Terbitkan Kwitansi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
