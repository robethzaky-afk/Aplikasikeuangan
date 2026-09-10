import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { useFinance, DEFAULT_ADMIN_PASSWORD } from '../context/FinanceContext';

export const AdminAuthModal: React.FC = () => {
  const {
    adminPromptState,
    closeAdminPrompt,
    loginAdmin,
    isDefaultPassword,
  } = useFinance();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adminPromptState?.isOpen) {
      setPassword('');
      setErrorMsg(null);
      setIsSuccess(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [adminPromptState?.isOpen]);

  if (!adminPromptState?.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Masukkan password admin terlebih dahulu.');
      return;
    }

    const result = loginAdmin(password);
    if (result.success) {
      setIsSuccess(true);
      setErrorMsg(null);

      // Trigger callback action after short visual feedback
      setTimeout(() => {
        if (adminPromptState.onSuccess) {
          adminPromptState.onSuccess();
        }
        closeAdminPrompt();
      }, 350);
    } else {
      setErrorMsg(result.message);
      inputRef.current?.select();
    }
  };

  const handleUseDefault = () => {
    setPassword(DEFAULT_ADMIN_PASSWORD);
    setErrorMsg(null);
    inputRef.current?.focus();
  };

  return (
    <div
      id="admin-auth-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeAdminPrompt();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-850 p-5 text-white relative">
          <button
            type="button"
            onClick={closeAdminPrompt}
            className="absolute top-4 right-4 text-emerald-200 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs text-white border border-white/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-200 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Keamanan Bendahara</span>
              </div>
              <h3 className="text-lg font-bold text-white">Mode Admin Dilindungi</h3>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Action Context Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-amber-950">Aksi Memerlukan Akses Admin</p>
              <p className="text-amber-800 leading-relaxed">
                Untuk mencegah perubahan data yang tidak disengaja, aksi{' '}
                <strong className="text-amber-950 underline decoration-amber-400">
                  {adminPromptState.description}
                </strong>{' '}
                hanya dapat dilakukan oleh Bendahara / Admin madrasah.
              </p>
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="admin-auth-password"
              className="block text-xs font-semibold text-gray-700"
            >
              Password Admin Bendahara
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="admin-auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Masukkan password..."
                className={`w-full pl-3.5 pr-10 py-2.5 text-sm bg-gray-50 border rounded-xl focus:bg-white focus:outline-none transition-all ${
                  errorMsg
                    ? 'border-rose-400 ring-2 ring-rose-100'
                    : isSuccess
                    ? 'border-emerald-500 ring-2 ring-emerald-100'
                    : 'border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 mt-1 font-medium animate-in fade-in duration-150">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>Password benar. Membuka akses...</span>
              </div>
            )}
          </div>

          {/* Default Password Quick Helper (shown if still default) */}
          {isDefaultPassword && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Password default awal: <code className="font-mono font-bold text-emerald-950 bg-emerald-100/80 px-1 py-0.5 rounded">{DEFAULT_ADMIN_PASSWORD}</code>
                </span>
              </div>
              <button
                type="button"
                onClick={handleUseDefault}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer shrink-0"
              >
                Gunakan Ini
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeAdminPrompt}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSuccess}
              className={`px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 ${
                isSuccess
                  ? 'bg-emerald-600'
                  : 'bg-emerald-700 hover:bg-emerald-800 hover:shadow-md active:scale-98'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSuccess ? 'Terverifikasi...' : 'Buka & Lanjutkan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
