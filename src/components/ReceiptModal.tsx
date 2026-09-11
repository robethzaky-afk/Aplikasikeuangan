import React, { useState } from 'react';
import {
  Printer,
  MessageSquare,
  X,
  CheckCircle2,
  School,
  Download,
  Loader2,
  Check,
  Edit3,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { SyahriahPaymentRecord } from '../types';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah, terbilang, formatDateIndo } from '../utils/formatters';

interface ReceiptModalProps {
  receipt: SyahriahPaymentRecord;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  onClose,
}) => {
  const {
    schoolProfile,
    students,
    requireAdmin,
    setEditingSyahriahPayment,
  } = useFinance();
  const student = students.find((s) => s.id === receipt.studentId);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleEdit = () => {
    requireAdmin(() => {
      onClose();
      setEditingSyahriahPayment(receipt);
    }, `Koreksi Kwitansi ${receipt.receiptNo}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveImage = async () => {
    const receiptElement = document.getElementById('printable-receipt-content');
    if (!receiptElement) return;

    try {
      setIsSavingImage(true);
      setSaveSuccessMsg(null);

      // Render the receipt DOM node to a high-resolution canvas
      const canvas = await html2canvas(receiptElement, {
        scale: 2.5, // High DPI for crisp printing/sharing
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: receiptElement.scrollWidth || 800,
      });

      const imgData = canvas.toDataURL('image/png');
      const cleanStudent = (receipt.studentName || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
      const cleanNo = (receipt.receiptNo || 'KW').replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `Bukti-Pembayaran-${cleanNo}-${cleanStudent}.png`;

      // Trigger browser download
      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSaveSuccessMsg('Bukti pembayaran berhasil disimpan sebagai gambar (PNG)!');
      setTimeout(() => setSaveSuccessMsg(null), 4500);
    } catch (err) {
      console.error('Gagal menyimpan bukti pembayaran:', err);
      alert('Maaf, terjadi kendala saat menyimpan gambar bukti pembayaran. Anda dapat menggunakan tombol "Cetak Bukti" untuk mencetak atau menyimpan sebagai PDF.');
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleSendWhatsApp = () => {
    const guardianPhone = student?.guardianPhone || '';
    // Format phone to 62...
    let cleanPhone = guardianPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const message = `*BUKTI PEMBAYARAN SYAHRIAH / SPP*\n` +
      `*${schoolProfile.name}*\n` +
      `----------------------------------------\n` +
      `No. Kwitansi: ${receipt.receiptNo}\n` +
      `Nama Siswa: *${receipt.studentName}*\n` +
      `Kelas: ${receipt.classGroup}\n` +
      `Bulan: *${receipt.months.join(', ')}*\n` +
      `Total Pembayaran: *${formatRupiah(receipt.totalAmount)}*\n` +
      `Tanggal: ${formatDateIndo(receipt.paymentDate)}\n` +
      `Metode: ${receipt.paymentMethod === 'TUNAI' ? 'Tunai' : 'Transfer Bank'}\n` +
      `Status: *LUNAS (Alhamdulillah)*\n` +
      `----------------------------------------\n` +
      `_Jazakumullahu khairan katsiran atas amanah dan kerjasamanya. Semoga ananda senantiasa diberikan keberkahan ilmu._\n\n` +
      `Bendahara: ${receipt.receivedBy}`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div
      id="receipt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:static print:bg-transparent print:overflow-visible"
    >
      <div
        id="receipt-modal-container"
        className="bg-white text-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-emerald-100 my-8 print:my-0 print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none"
      >
        {/* Header Actions - hidden when printing */}
        <div
          id="receipt-modal-actions-header"
          className="print:hidden flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-emerald-800 text-white"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
            <div>
              <span className="font-bold text-base block">Bukti Pembayaran Syahriah</span>
              <span className="text-xs text-emerald-200">No: {receipt.receiptNo}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Koreksi / Edit Pembayaran */}
            <button
              id="btn-edit-receipt-header"
              onClick={handleEdit}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-lg transition-all shadow-xs font-semibold cursor-pointer"
              title="Koreksi / Edit data pembayaran ini jika terjadi kekeliruan atau complain"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit / Koreksi</span>
            </button>

            {/* Simpan Bukti (Download PNG) */}
            <button
              id="btn-save-receipt-header"
              onClick={handleSaveImage}
              disabled={isSavingImage}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-teal-600 hover:bg-teal-500 active:scale-95 disabled:opacity-60 text-white rounded-lg transition-all shadow-xs font-semibold cursor-pointer"
              title="Unduh bukti pembayaran sebagai file gambar (PNG)"
            >
              {isSavingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isSavingImage ? 'Menyimpan...' : 'Simpan Bukti'}</span>
            </button>

            {/* Cetak Bukti (Print / PDF) */}
            <button
              id="btn-print-receipt-header"
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg transition-all shadow-xs font-semibold cursor-pointer"
              title="Cetak langsung ke printer atau simpan sebagai PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Bukti</span>
            </button>

            {/* Kirim WhatsApp */}
            <button
              id="btn-wa-receipt-header"
              onClick={handleSendWhatsApp}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-xs font-medium cursor-pointer"
              title="Kirim bukti ke nomor WhatsApp wali murid"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WA</span>
            </button>

            {/* Tutup Modal */}
            <button
              id="btn-close-receipt-header"
              onClick={onClose}
              type="button"
              className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer ml-1"
              title="Tutup Bukti Pembayaran"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner if image saved */}
        {saveSuccessMsg && (
          <div className="print:hidden bg-emerald-100 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-900 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Printable Official Receipt Area */}
        <div id="printable-receipt-content" className="p-6 md:p-8 bg-white text-gray-900 print:p-0">
          {/* Madrasah Letterhead / Kop Surat */}
          <div className="border-b-2 border-emerald-800 pb-3 text-center relative">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0 border border-emerald-300 print:border-black">
                <School className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900 print:text-black">
                  {schoolProfile.institution}
                </p>
                <h2 className="text-lg md:text-xl font-bold text-emerald-900 tracking-tight print:text-black uppercase">
                  {schoolProfile.name}
                </h2>
                <p className="text-xs text-gray-600 print:text-gray-700">
                  {schoolProfile.address}, {schoolProfile.village}, Kec. {schoolProfile.district}, {schoolProfile.regency} - Telp: {schoolProfile.phone}
                </p>
                <p className="text-[11px] text-gray-500 print:text-gray-700">
                  NSM: {schoolProfile.nsm} | NPSN: {schoolProfile.npsn}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt Title & Meta */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider print:border print:border-black">
                BUKTI PEMBAYARAN SYAHRIAH
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Tahun Ajaran: <span className="font-semibold text-gray-800">{schoolProfile.academicYear}</span>
              </p>
            </div>
            <div className="text-right sm:text-right">
              <p className="text-xs text-gray-500">No. Bukti:</p>
              <p className="text-sm font-mono font-bold text-gray-800">{receipt.receiptNo}</p>
              <p className="text-xs text-gray-500">
                Tanggal: <span className="text-gray-800 font-medium">{formatDateIndo(receipt.paymentDate)}</span>
              </p>
            </div>
          </div>

          {/* Student Info Grid */}
          <div className="grid grid-cols-2 gap-3 my-4 bg-gray-50 p-3 rounded-lg text-sm border border-gray-200 print:bg-white print:border-gray-300">
            <div>
              <p className="text-xs text-gray-500">Telah Diterima Dari Siswa:</p>
              <p className="font-bold text-gray-900 text-base">{receipt.studentName}</p>
              <p className="text-xs text-gray-600">
                NIS: <span className="font-mono">{student?.nis || '-'}</span> | NISN: <span className="font-mono">{student?.nisn || '-'}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tingkat / Kelas:</p>
              <p className="font-semibold text-gray-800">{receipt.classGroup}</p>
              <p className="text-xs text-gray-600">
                Wali Murid: <span className="font-medium">{student?.guardianName || '-'}</span>
              </p>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="mt-4 overflow-hidden border border-gray-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50 text-emerald-900 text-xs uppercase font-semibold border-b border-gray-200 print:bg-gray-100">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Uraian Pembayaran</th>
                  <th className="py-2.5 px-3 text-center">Bulan</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipt.months.map((month, idx) => (
                  <tr key={month} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 text-xs text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-gray-800">
                      Iuran Syahriah / SPP Bulanan
                    </td>
                    <td className="py-2 px-3 text-center font-semibold text-emerald-800">
                      {month}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-gray-800">
                      {formatRupiah(receipt.amountPerMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t-2 border-emerald-800 print:bg-white">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-xs text-gray-700">
                    Total Pembayaran:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-base text-emerald-800 print:text-black">
                    {formatRupiah(receipt.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Terbilang Box */}
          <div className="mt-3 p-3 bg-emerald-50/60 rounded-md border border-emerald-200 text-xs print:bg-transparent print:border-gray-300">
            <span className="font-semibold text-emerald-900">Terbilang: </span>
            <span className="italic font-medium text-gray-800 capitalize">
              "{terbilang(receipt.totalAmount)}"
            </span>
          </div>

          {receipt.notes && (
            <p className="mt-2 text-xs text-gray-500 italic">
              Catatan: {receipt.notes}
            </p>
          )}

          {/* Signature Area */}
          <div className="mt-6 pt-4 grid grid-cols-2 text-center text-xs text-gray-700">
            <div>
              <p className="text-gray-500">Wali Santri / Penyetor,</p>
              <div className="h-16 flex items-end justify-center">
                <span className="font-medium text-gray-800 border-b border-gray-400 pb-0.5 px-6">
                  ( {student?.guardianName || '............................'} )
                </span>
              </div>
            </div>
            <div>
              <p className="text-gray-500">
                Soborejo, {formatDateIndo(receipt.paymentDate)}
              </p>
              <p className="text-gray-500 font-medium">Bendahara Madrasah,</p>
              <div className="h-16 flex items-end justify-center">
                <div className="text-center">
                  <span className="font-bold text-gray-900 border-b border-gray-400 pb-0.5 px-4 block">
                    {receipt.receivedBy}
                  </span>
                  <span className="text-[10px] text-gray-500">Cap & Tanda Tangan Sah</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions & Metadata - hidden when printing */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              Lunas
            </span>
            <span className="text-gray-500">
              Metode: <strong className="text-gray-800">{receipt.paymentMethod === 'TUNAI' ? 'Kas Tunai' : 'Transfer Bank'}</strong>
            </span>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <span className="text-gray-500 hidden sm:inline">
              No: <strong className="font-mono text-gray-800">{receipt.receiptNo}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Tombol Edit / Koreksi Pembayaran */}
            <button
              id="btn-edit-receipt-footer"
              onClick={handleEdit}
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              title="Koreksi atau perbaiki data pembayaran ini jika ada komplain atau kesalahan input"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit / Koreksi</span>
            </button>

            {/* Tombol Simpan Bukti (Download PNG) */}
            <button
              id="btn-save-receipt-footer"
              onClick={handleSaveImage}
              disabled={isSavingImage}
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 active:scale-95 disabled:opacity-60 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              title="Unduh bukti pembayaran sebagai gambar (PNG)"
            >
              {isSavingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isSavingImage ? 'Menyimpan...' : 'Simpan Bukti'}</span>
            </button>

            {/* Tombol Cetak Bukti (Printer / PDF) */}
            <button
              id="btn-print-receipt-footer"
              onClick={handlePrint}
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              title="Cetak kwitansi ke printer atau PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Bukti</span>
            </button>

            {/* Tombol Kirim WA */}
            <button
              id="btn-wa-receipt-footer"
              onClick={handleSendWhatsApp}
              type="button"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
              title="Kirim bukti ke nomor WhatsApp wali murid"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Kirim WA</span>
            </button>

            {/* Tombol Tutup */}
            <button
              id="btn-close-receipt-footer"
              onClick={onClose}
              type="button"
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
