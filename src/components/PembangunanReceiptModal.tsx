import React, { useState } from 'react';
import {
  Printer,
  Download,
  X,
  Building2,
  CheckCircle2,
  School,
  Loader2,
  Check,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { FinancialTransaction } from '../types';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah, terbilang, formatDateIndo } from '../utils/formatters';

interface PembangunanReceiptModalProps {
  transaction: FinancialTransaction;
  onClose: () => void;
}

export const PembangunanReceiptModal: React.FC<PembangunanReceiptModalProps> = ({
  transaction,
  onClose,
}) => {
  const { schoolProfile, cashAccounts } = useFinance();
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const account = cashAccounts.find((a) => a.id === transaction.accountId);
  const isIncome = transaction.type === 'INCOME';
  const isMutation = transaction.category === 'MUTASI_SUBSIDI_MADRASAH';

  const handlePrint = () => {
    window.print();
  };

  const handleSaveImage = async () => {
    const receiptElement = document.getElementById('printable-pembangunan-receipt');
    if (!receiptElement) return;

    try {
      setIsSavingImage(true);
      setSaveSuccessMsg(null);

      const canvas = await html2canvas(receiptElement, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: receiptElement.scrollWidth || 800,
      });

      const imgData = canvas.toDataURL('image/png');
      const cleanRef = (transaction.refNo || 'BG').replace(/[^a-zA-Z0-9]/g, '-');
      const cleanName = (transaction.payerOrPayee || 'Pembangunan').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Kwitansi-Pembangunan-${cleanRef}-${cleanName}.png`;

      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSaveSuccessMsg('Bukti transaksi berhasil disimpan sebagai gambar (PNG)!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Gagal menyimpan gambar kuitansi:', err);
      alert('Gagal membuat file gambar kuitansi.');
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col my-auto border border-emerald-900/10 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header Controls (Hidden on Print) */}
        <div className="print:hidden bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm sm:text-base">
              {isMutation
                ? 'Berita Acara Mutasi Subsidi Kas Madrasah ke Pembangunan'
                : isIncome
                ? 'Kwitansi Resmi Tanda Terima Infak Pembangunan'
                : 'Bukti Pengeluaran Kas Pembangunan Gedung'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar (Hidden on Print) */}
        <div className="print:hidden bg-slate-100/90 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-gray-600 font-mono font-medium">
            Ref: <strong className="text-gray-900">{transaction.refNo}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={isSavingImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSavingImage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span>{isSavingImage ? 'Menyimpan...' : 'Simpan PNG'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Dokumen</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="print:hidden bg-emerald-50 text-emerald-800 text-xs px-5 py-2 flex items-center gap-2 border-b border-emerald-200">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Printable Receipt Canvas */}
        <div className="p-4 sm:p-7 overflow-y-auto max-h-[75vh] bg-white">
          <div
            id="printable-pembangunan-receipt"
            className="border-2 border-emerald-900/30 p-6 sm:p-7 rounded-xl relative bg-linear-to-b from-emerald-50/20 via-white to-amber-50/20 font-serif"
          >
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <Building2 className="w-72 h-72 text-emerald-950" />
            </div>

            {/* Official Kop Surat */}
            <div className="flex items-center gap-4 pb-4 border-b-2 border-emerald-900">
              <div className="w-14 h-14 rounded-xl bg-emerald-800 flex items-center justify-center text-white shrink-0 shadow-md">
                <School className="w-8 h-8 text-emerald-200" />
              </div>
              <div className="flex-1 text-center pr-10">
                <p className="text-[11px] font-sans font-bold tracking-widest text-emerald-900 uppercase">
                  {schoolProfile.institution}
                </p>
                <h2 className="text-lg sm:text-xl font-bold font-sans tracking-tight text-emerald-950 uppercase">
                  {schoolProfile.name}
                </h2>
                <p className="text-[11px] font-sans text-gray-700">
                  {schoolProfile.address}, Kec. {schoolProfile.district}, {schoolProfile.regency}
                </p>
                <p className="text-[10px] font-sans font-mono text-gray-500 mt-0.5">
                  NSM: {schoolProfile.nsm} | NPSN: {schoolProfile.npsn} | Telp: {schoolProfile.phone}
                </p>
              </div>
            </div>

            {/* Receipt Title */}
            <div className="text-center my-4">
              <span className="inline-block border-b-2 border-dashed border-gray-700 pb-0.5 text-base sm:text-lg font-bold font-sans uppercase tracking-wider text-gray-900">
                {isMutation
                  ? 'BERITA ACARA MUTASI / SUBSIDI KAS MADRASAH'
                  : isIncome
                  ? 'KUITANSI RESMI TANDA TERIMA INFAK PEMBANGUNAN'
                  : 'BUKTI PENGELUARAN DANA PEMBANGUNAN'}
              </span>
              <p className="text-xs font-mono font-bold text-emerald-900 mt-1">
                Nomor: {transaction.refNo}
              </p>
            </div>

            {/* Receipt Content Table */}
            <div className="space-y-3 font-sans text-sm text-gray-800 my-5">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="w-36 text-xs text-gray-600 font-semibold shrink-0">
                  {isIncome ? 'Telah Diterima Dari' : 'Dibayarkan Kepada'}
                </span>
                <span className="hidden sm:inline text-gray-400">:</span>
                <span className="font-bold text-gray-950 flex-1 border-b border-dotted border-gray-300 pb-0.5">
                  {transaction.payerOrPayee}
                  {transaction.classGroup && (
                    <span className="ml-2 text-xs font-normal text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      Kelas {transaction.classGroup}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="w-36 text-xs text-gray-600 font-semibold shrink-0">
                  Uang Sejumlah
                </span>
                <span className="hidden sm:inline text-gray-400">:</span>
                <span className="font-bold text-emerald-900 font-mono text-base flex-1 border-b border-dotted border-gray-300 pb-0.5">
                  {formatRupiah(transaction.amount)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="w-36 text-xs text-gray-600 font-semibold shrink-0">
                  Terbilang
                </span>
                <span className="hidden sm:inline text-gray-400">:</span>
                <span className="italic text-gray-800 font-serif bg-slate-50/80 px-2.5 py-1 rounded border border-slate-200 flex-1 leading-relaxed">
                  "{terbilang(transaction.amount)} Rupiah"
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="w-36 text-xs text-gray-600 font-semibold shrink-0">
                  Untuk Keperluan
                </span>
                <span className="hidden sm:inline text-gray-400">:</span>
                <div className="flex-1 border-b border-dotted border-gray-300 pb-0.5">
                  <span className="font-semibold text-emerald-950 block">
                    {transaction.categoryLabel}
                  </span>
                  <span className="text-xs text-gray-700 leading-relaxed block mt-0.5">
                    {transaction.description || '-'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                <span className="w-36 text-xs text-gray-600 font-semibold shrink-0">
                  Akun Kas / Bank
                </span>
                <span className="hidden sm:inline text-gray-400">:</span>
                <span className="text-xs font-mono text-gray-700 flex-1">
                  {account?.name || transaction.accountId}
                  {account?.accountNumber && ` (${account.bankName} - No: ${account.accountNumber})`}
                </span>
              </div>

              {transaction.proofDocumentNo && (
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="w-36 text-xs text-gray-600 font-semibold shrink-0">
                    No. Bukti / Nota
                  </span>
                  <span className="hidden sm:inline text-gray-400">:</span>
                  <span className="text-xs font-mono font-medium text-gray-800 flex-1">
                    {transaction.proofDocumentNo}
                  </span>
                </div>
              )}
            </div>

            {/* Total Highlight Badge */}
            <div className="my-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-sans">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                Total Mutasi
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono text-emerald-900">
                {formatRupiah(transaction.amount)}
              </span>
            </div>

            {/* Signature Area */}
            <div className="pt-4 border-t border-gray-200 flex justify-between items-end font-sans text-xs text-gray-800">
              <div className="text-center w-40">
                <p className="text-gray-500 mb-14">
                  {isIncome ? 'Penyetor / Wali Murid,' : 'Penerima / Rekanan,'}
                </p>
                <p className="font-bold underline text-gray-950">
                  ( {transaction.payerOrPayee || '............................'} )
                </p>
              </div>

              <div className="text-center w-52">
                <p className="text-gray-600 mb-1">
                  {schoolProfile.village}, {formatDateIndo(transaction.date)}
                </p>
                <p className="text-gray-500 mb-14">
                  {isMutation ? 'Bendahara Madrasah,' : 'Panitia Pembangunan / Bendahara,'}
                </p>
                <p className="font-bold underline text-emerald-950 uppercase">
                  {transaction.recordedBy || schoolProfile.treasurerName}
                </p>
                <p className="text-[10px] text-gray-500">Bendahara Madrasah</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 pt-2 border-t border-dashed border-gray-200 text-center font-sans text-[10px] text-gray-400 flex items-center justify-between">
              <span>Dicetak otomatis oleh Sistem Keuangan LP Ma'arif NU</span>
              <span>Dokumen sah &amp; tercatat resmi di Buku Kas Madrasah</span>
            </div>
          </div>
        </div>

        {/* Footer (Hidden on Print) */}
        <div className="print:hidden bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
