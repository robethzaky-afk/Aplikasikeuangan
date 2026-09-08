import React from 'react';
import { Printer, MessageSquare, X, CheckCircle2, School } from 'lucide-react';
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
  const { schoolProfile, students } = useFinance();
  const student = students.find((s) => s.id === receipt.studentId);

  const handlePrint = () => {
    window.print();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="receipt-modal-container"
        className="bg-white text-gray-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-emerald-100 my-8"
      >
        {/* Header Actions - hidden when printing */}
        <div
          id="receipt-modal-actions-header"
          className="print:hidden flex items-center justify-between px-6 py-4 bg-emerald-800 text-white"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <span className="font-semibold text-base">Kwitansi Bukti Pembayaran</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              id="btn-print-receipt"
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs font-medium cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Cetak / PDF
            </button>
            <button
              id="btn-wa-receipt"
              onClick={handleSendWhatsApp}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shadow-xs font-medium cursor-pointer"
              title="Kirim bukti ke nomor WhatsApp wali murid"
            >
              <MessageSquare className="w-4 h-4" />
              Kirim WA
            </button>
            <button
              id="btn-close-receipt"
              onClick={onClose}
              type="button"
              className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

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

        {/* Footer Note */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center print:hidden">
          <span>Metode: <strong className="text-gray-700">{receipt.paymentMethod}</strong></span>
          <span className="italic">Simpan kwitansi ini sebagai bukti pembayaran yang sah.</span>
        </div>
      </div>
    </div>
  );
};
