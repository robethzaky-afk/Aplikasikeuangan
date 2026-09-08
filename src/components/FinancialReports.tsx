import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  CheckCircle2,
  Table,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import {
  formatRupiah,
  formatDateIndo,
  terbilang,
  getTodayDateString,
} from '../utils/formatters';
import { ACADEMIC_MONTHS } from '../types';

export const FinancialReports: React.FC = () => {
  const {
    schoolProfile,
    totalCashBalance,
    totalSyahriahIncome,
    totalOtherIncome,
    totalIncomeOverall,
    totalExpenseOverall,
    cashAccounts,
    students,
    syahriahPayments,
    transactions,
    isMonthPaid,
  } = useFinance();

  const [reportPeriod, setReportPeriod] = useState<string>('SEMESTER_1');

  // Class Syahriah Recap
  const classRecap = [1, 2, 3, 4, 5, 6].map((grade) => {
    const classStudents = students.filter((s) => s.grade === grade && s.status === 'AKTIF');
    const exemptStudents = classStudents.filter((s) => s.isExempt);
    const payingStudents = classStudents.filter((s) => !s.isExempt);

    // Target for 12 months (or current period)
    const standardRate = schoolProfile.standardSyahriah;
    const totalTargetYearly = payingStudents.length * standardRate * 12;

    // Realized payments for this class
    const paymentsForClass = syahriahPayments.filter((p) => p.grade === grade);
    const totalRealized = paymentsForClass.reduce((sum, p) => sum + p.totalAmount, 0);

    const percentRealized = totalTargetYearly > 0 ? Math.round((totalRealized / totalTargetYearly) * 100) : 100;

    return {
      grade,
      label: `Kelas ${grade}`,
      studentCount: classStudents.length,
      exemptCount: exemptStudents.length,
      totalTargetYearly,
      totalRealized,
      arrears: Math.max(0, totalTargetYearly - totalRealized),
      percent: percentRealized,
    };
  });

  // Group Other Incomes by Category
  const incomeCategoriesMap = transactions
    .filter((t) => t.type === 'INCOME' && !t.category.startsWith('MUTASI_'))
    .reduce<Record<string, { label: string; amount: number; count: number }>>((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { label: t.categoryLabel, amount: 0, count: 0 };
      }
      acc[t.category].amount += t.amount;
      acc[t.category].count += 1;
      return acc;
    }, {});

  // Group Expenses by Category
  const expenseCategoriesMap = transactions
    .filter((t) => t.type === 'EXPENSE' && !t.category.startsWith('MUTASI_'))
    .reduce<Record<string, { label: string; amount: number; count: number }>>((acc, t) => {
      if (!acc[t.category]) {
        acc[t.category] = { label: t.categoryLabel, amount: 0, count: 0 };
      }
      acc[t.category].amount += t.amount;
      acc[t.category].count += 1;
      return acc;
    }, {});

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `LAPORAN KEUANGAN ${schoolProfile.name}\n`;
    csvContent += `Tahun Pelajaran,${schoolProfile.academicYear}\n`;
    csvContent += `Tanggal Cetak,${new Date().toLocaleDateString('id-ID')}\n\n`;

    csvContent += '--- REKAPITULASI PENERIMAAN SYAHRIAH PER KELAS ---\n';
    csvContent += 'Kelas,Jumlah Siswa,Bebas Biaya,Target Setahun,Realisasi Terkumpul,Sisa Tunggakan,Persentase\n';
    classRecap.forEach((c) => {
      csvContent += `${c.label},${c.studentCount},${c.exemptCount},${c.totalTargetYearly},${c.totalRealized},${c.arrears},${c.percent}%\n`;
    });

    csvContent += '\n--- POS PENGELUARAN MADRASAH ---\n';
    csvContent += 'Kategori Pengeluaran,Jumlah Transaksi,Total Nominal (Rp)\n';
    Object.values(expenseCategoriesMap).forEach((e) => {
      csvContent += `"${e.label}",${e.count},${e.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_MI_Soborejo_${schoolProfile.academicYear.replace('/', '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - hidden when printing */}
      <div className="print:hidden bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              Laporan & Rekapitulasi
            </span>
            <span className="text-xs text-gray-500">
              Tahun Ajaran {schoolProfile.academicYear}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-1">
            Laporan Keuangan & Rekapitulasi Syahriah
          </h2>
          <p className="text-xs text-gray-500">
            Cetak laporan pertanggungjawaban resmi madrasah dan ekspor data ke format spreadsheet
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-xs sm:text-sm shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV / Excel</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan Resmi</span>
          </button>
        </div>
      </div>

      {/* Printable Official Document Container */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-xs print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Official Header / Kop Madrasah */}
        <div className="border-b-2 border-black pb-4 text-center">
          <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-emerald-900 print:text-black">
            {schoolProfile.institution} KABUPATEN TEMANGGUNG
          </p>
          <h1 className="text-lg md:text-2xl font-black uppercase tracking-tight text-emerald-900 print:text-black mt-0.5">
            {schoolProfile.name}
          </h1>
          <p className="text-xs text-gray-700 mt-1">
            Alamat: {schoolProfile.address}, Desa {schoolProfile.village}, Kec. {schoolProfile.district}, {schoolProfile.regency} {schoolProfile.postalCode}
          </p>
          <p className="text-[11px] text-gray-600 print:text-gray-800">
            NSM: {schoolProfile.nsm} | NPSN: {schoolProfile.npsn} | Telp/WA: {schoolProfile.phone}
          </p>
        </div>

        {/* Title of the Report */}
        <div className="text-center">
          <h2 className="text-base md:text-lg font-bold text-gray-900 uppercase underline">
            LAPORAN PERTANGGUNGJAWABAN KEUANGAN MADRASAH
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Periode Tahun Pelajaran {schoolProfile.academicYear} • Per Tanggal {formatDateIndo(getTodayDateString())}
          </p>
        </div>

        {/* Executive Summary Cards / Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 print:bg-white print:border-gray-400 text-sm">
          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Total Seluruh Penerimaan:</span>
            <p className="text-xl font-bold font-mono text-emerald-800 print:text-black mt-1">
              {formatRupiah(totalIncomeOverall)}
            </p>
            <p className="text-[11px] text-gray-500">
              Syahriah: {formatRupiah(totalSyahriahIncome)} + Lainnya: {formatRupiah(totalOtherIncome)}
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Total Seluruh Pengeluaran:</span>
            <p className="text-xl font-bold font-mono text-rose-800 print:text-black mt-1">
              {formatRupiah(totalExpenseOverall)}
            </p>
            <p className="text-[11px] text-gray-500">
              Bisaroh guru, sarpras, ATK & operasional
            </p>
          </div>

          <div>
            <span className="text-xs text-gray-500 uppercase font-semibold">Sisa Saldo Kas Riil:</span>
            <p className="text-xl font-bold font-mono text-blue-900 print:text-black mt-1">
              {formatRupiah(totalCashBalance)}
            </p>
            <p className="text-[11px] text-gray-500">
              Tersimpan di Brankas & Rekening Bank
            </p>
          </div>
        </div>

        {/* SECTION 1: REKAPITULASI SYAHRIAH PER KELAS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <h3 className="font-bold text-sm text-gray-900 uppercase">
              I. Rekapitulasi Pembayaran Syahriah Santri (Kelas 1 - 6)
            </h3>
            <span className="text-xs text-gray-500">
              Tarif Dasar: {formatRupiah(schoolProfile.standardSyahriah)}/bulan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-300">
              <thead className="bg-emerald-50 text-emerald-950 font-semibold uppercase text-[11px] border-b border-gray-300 print:bg-gray-100">
                <tr>
                  <th className="py-2.5 px-3 border-r border-gray-300">Tingkat Kelas</th>
                  <th className="py-2.5 px-3 text-center border-r border-gray-300">Siswa Aktif</th>
                  <th className="py-2.5 px-3 text-center border-r border-gray-300">Bebas/Yatim</th>
                  <th className="py-2.5 px-3 text-right border-r border-gray-300">Target 1 Tahun</th>
                  <th className="py-2.5 px-3 text-right border-r border-gray-300">Terkumpul</th>
                  <th className="py-2.5 px-3 text-right border-r border-gray-300">Sisa Tunggakan</th>
                  <th className="py-2.5 px-3 text-center">Persentase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classRecap.map((c) => (
                  <tr key={c.grade} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 font-semibold text-gray-900 border-r border-gray-200">
                      {c.label}
                    </td>
                    <td className="py-2 px-3 text-center text-gray-700 border-r border-gray-200">
                      {c.studentCount} anak
                    </td>
                    <td className="py-2 px-3 text-center text-gray-500 border-r border-gray-200">
                      {c.exemptCount > 0 ? `${c.exemptCount} anak` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-gray-700 border-r border-gray-200">
                      {formatRupiah(c.totalTargetYearly)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 print:text-black border-r border-gray-200">
                      {formatRupiah(c.totalRealized)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-rose-700 print:text-black border-r border-gray-200">
                      {formatRupiah(c.arrears)}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-gray-800">
                      {c.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-400 print:bg-white text-xs">
                <tr>
                  <td className="py-2.5 px-3 border-r border-gray-300 uppercase">
                    Total Syahriah:
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-gray-300">
                    {students.length} Siswa
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-gray-300">
                    {students.filter((s) => s.isExempt).length} Siswa
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono border-r border-gray-300">
                    {formatRupiah(classRecap.reduce((s, c) => s + c.totalTargetYearly, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800 print:text-black border-r border-gray-300">
                    {formatRupiah(totalSyahriahIncome)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-800 print:text-black border-r border-gray-300">
                    {formatRupiah(classRecap.reduce((s, c) => s + c.arrears, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {Math.round(
                      (totalSyahriahIncome /
                        (classRecap.reduce((s, c) => s + c.totalTargetYearly, 0) || 1)) *
                        100
                    )}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* SECTION 2: POS PEMASUKAN LAIN & PENGELUARAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Pos Pemasukan Lainnya */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 uppercase border-b border-gray-200 pb-2">
              II. Rincian Pemasukan Lainnya
            </h3>
            <table className="w-full text-left text-xs border border-gray-300">
              <thead className="bg-gray-100 uppercase font-semibold text-[11px] border-b border-gray-300">
                <tr>
                  <th className="py-2 px-3">Kategori Pemasukan</th>
                  <th className="py-2 px-3 text-center w-16">Trx</th>
                  <th className="py-2 px-3 text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.values(incomeCategoriesMap).map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-medium text-gray-800">{item.label}</td>
                    <td className="py-2 px-3 text-center text-gray-500">{item.count}x</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-800 print:text-black">
                      {formatRupiah(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t border-gray-300 text-xs">
                <tr>
                  <td colSpan={2} className="py-2 px-3 uppercase text-right">
                    Subtotal Pemasukan Lain:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-800 print:text-black">
                    {formatRupiah(totalOtherIncome)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pos Pengeluaran */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-gray-900 uppercase border-b border-gray-200 pb-2">
              III. Rincian Pengeluaran Operasional
            </h3>
            <table className="w-full text-left text-xs border border-gray-300">
              <thead className="bg-gray-100 uppercase font-semibold text-[11px] border-b border-gray-300">
                <tr>
                  <th className="py-2 px-3">Kategori Pengeluaran</th>
                  <th className="py-2 px-3 text-center w-16">Trx</th>
                  <th className="py-2 px-3 text-right">Jumlah (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {Object.values(expenseCategoriesMap).map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-medium text-gray-800">{item.label}</td>
                    <td className="py-2 px-3 text-center text-gray-500">{item.count}x</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-rose-800 print:text-black">
                      {formatRupiah(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t border-gray-300 text-xs">
                <tr>
                  <td colSpan={2} className="py-2 px-3 uppercase text-right">
                    Total Pengeluaran:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-rose-800 print:text-black">
                    {formatRupiah(totalExpenseOverall)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Terbilang Saldo Kas */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-300 text-xs">
          <span className="font-semibold text-gray-700">Saldo Kas Akhir Berjalan: </span>
          <strong className="font-mono text-gray-900 text-sm">{formatRupiah(totalCashBalance)}</strong>
          <span className="italic text-gray-600 block mt-0.5">
            Terbilang: "{terbilang(totalCashBalance)}"
          </span>
        </div>

        {/* Official Signatures Block */}
        <div className="pt-6 grid grid-cols-2 text-center text-xs text-gray-900">
          <div>
            <p>Mengetahui dan Mengesahkan,</p>
            <p className="font-bold">Kepala MI Ma'arif Al Ihsan Soborejo</p>
            <div className="h-24 flex items-end justify-center">
              <div>
                <p className="font-bold underline uppercase tracking-wide">
                  {schoolProfile.headmasterName}
                </p>
                <p className="text-[11px] text-gray-600">
                  NIP: {schoolProfile.headmasterNip || '-'}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p>Soborejo, {formatDateIndo(getTodayDateString())}</p>
            <p className="font-bold">Bendahara Madrasah</p>
            <div className="h-24 flex items-end justify-center">
              <div>
                <p className="font-bold underline uppercase tracking-wide">
                  {schoolProfile.treasurerName}
                </p>
                <p className="text-[11px] text-gray-600">
                  NIP / NUPTK: -
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
