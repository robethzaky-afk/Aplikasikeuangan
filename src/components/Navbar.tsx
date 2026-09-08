import React, { useState } from 'react';
import {
  School,
  LayoutDashboard,
  GraduationCap,
  Wallet,
  BookOpenCheck,
  Users,
  FileText,
  Settings,
  PlusCircle,
  Menu,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatRupiah } from '../utils/formatters';

export type NavTab =
  | 'dashboard'
  | 'syahriah'
  | 'other-finances'
  | 'bku'
  | 'students'
  | 'reports'
  | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenQuickSyahriah: () => void;
  onOpenQuickTrx: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenQuickSyahriah,
  onOpenQuickTrx,
}) => {
  const { schoolProfile, totalCashBalance } = useFinance();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'syahriah', label: 'Pembayaran Syahriah', icon: GraduationCap },
    { id: 'other-finances', label: 'Keuangan Lainnya', icon: Wallet },
    { id: 'bku', label: 'Buku Kas Umum (BKU)', icon: BookOpenCheck },
    { id: 'students', label: 'Data Siswa', icon: Users },
    { id: 'reports', label: 'Laporan & Rekap', icon: FileText },
    { id: 'settings', label: 'Pengaturan & Backup', icon: Settings },
  ];

  const handleTabClick = (tabId: NavTab) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="print:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-xs">
      {/* Top Banner with Ma'arif Brand */}
      <div className="bg-emerald-800 text-white px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <School className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-700 text-emerald-200 px-2 py-0.5 rounded font-medium tracking-wide">
                  LP MA'ARIF NU
                </span>
                <span className="text-xs text-emerald-300 hidden sm:inline">
                  {schoolProfile.village}, Kec. {schoolProfile.district}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                {schoolProfile.name}
              </h1>
            </div>
          </div>

          {/* Quick Stats & Action Buttons */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-700/50">
              <span className="text-[11px] text-emerald-300">Total Saldo Kas Aktif</span>
              <span className="text-sm font-bold font-mono text-white">
                {formatRupiah(totalCashBalance)}
              </span>
            </div>

            <button
              id="btn-quick-syahriah-nav"
              type="button"
              onClick={onOpenQuickSyahriah}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-900" />
              <span>Bayar Syahriah</span>
            </button>

            <button
              id="btn-quick-trx-nav"
              type="button"
              onClick={onOpenQuickTrx}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Catat Kas</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              id="btn-mobile-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden lg:block bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none" aria-label="Tabs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs border border-emerald-200'
                      : 'text-gray-600 hover:text-emerald-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div id="mobile-navigation-dropdown" className="lg:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="pb-2 mb-2 border-b border-gray-100 flex justify-between items-center text-xs text-gray-500">
            <span>Tahun Pelajaran: <strong className="text-gray-800">{schoolProfile.academicYear}</strong></span>
            <span>Kas: <strong className="font-mono text-emerald-700">{formatRupiah(totalCashBalance)}</strong></span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-tab-${item.id}`}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-900 font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenQuickSyahriah();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 text-xs font-semibold bg-amber-400 text-amber-950 rounded-lg text-center"
            >
              + Bayar Syahriah
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenQuickTrx();
                setMobileMenuOpen(false);
              }}
              className="w-full py-2 px-3 text-xs font-semibold bg-emerald-700 text-white rounded-lg text-center"
            >
              + Catat Kas Lain
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
