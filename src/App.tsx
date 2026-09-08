/**
 * Sistem Pengelolaan Keuangan Bendahara
 * MI Ma'arif Al Ihsan Soborejo, Kec. Pringsurat, Kab. Temanggung
 */

import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SyahriahManager } from './components/SyahriahManager';
import { OtherFinances } from './components/OtherFinances';
import { GeneralLedger } from './components/GeneralLedger';
import { StudentManager } from './components/StudentManager';
import { FinancialReports } from './components/FinancialReports';
import { SettingsManager } from './components/SettingsManager';
import { ReceiptModal } from './components/ReceiptModal';
import { School, Heart, ShieldCheck } from 'lucide-react';

function MainContent() {
  const { activeReceipt, setActiveReceipt, schoolProfile } = useFinance();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [openSyahriahModalTrigger, setOpenSyahriahModalTrigger] = useState(false);
  const [openTrxTypeTrigger, setOpenTrxTypeTrigger] = useState<'INCOME' | 'EXPENSE' | null>(null);

  const handleOpenQuickSyahriah = () => {
    setActiveTab('syahriah');
    setOpenSyahriahModalTrigger(true);
    // Reset trigger after tick
    setTimeout(() => setOpenSyahriahModalTrigger(false), 200);
  };

  const handleOpenQuickTrx = (type: 'INCOME' | 'EXPENSE' = 'INCOME') => {
    setActiveTab('other-finances');
    setOpenTrxTypeTrigger(type);
    setTimeout(() => setOpenTrxTypeTrigger(null), 200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-900 antialiased selection:bg-emerald-200">
      {/* Navbar Component */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenQuickSyahriah={handleOpenQuickSyahriah}
        onOpenQuickTrx={() => handleOpenQuickTrx('INCOME')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            onNavigate={setActiveTab}
            onOpenQuickSyahriah={handleOpenQuickSyahriah}
            onOpenQuickTrx={handleOpenQuickTrx}
          />
        )}

        {activeTab === 'syahriah' && (
          <SyahriahManager initialOpenPayModal={openSyahriahModalTrigger} />
        )}

        {activeTab === 'other-finances' && (
          <OtherFinances initialOpenType={openTrxTypeTrigger} />
        )}

        {activeTab === 'bku' && <GeneralLedger />}

        {activeTab === 'students' && <StudentManager />}

        {activeTab === 'reports' && <FinancialReports />}

        {activeTab === 'settings' && <SettingsManager />}
      </main>

      {/* Global Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          receipt={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Footer - hidden when printing */}
      <footer className="print:hidden border-t border-gray-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-800">
              <School className="w-3.5 h-3.5" />
            </div>
            <span>
              <strong className="text-gray-800">{schoolProfile.name}</strong> •{' '}
              {schoolProfile.institution}
            </span>
          </div>
          <div className="text-center sm:text-right">
            <p>
              Desa {schoolProfile.village}, Kec. {schoolProfile.district}, {schoolProfile.regency}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Sistem Informasi Keuangan & Administrasi Bendahara Madrasah Ibtidaiyah
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainContent />
    </FinanceProvider>
  );
}
