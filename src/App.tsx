import React, { useState } from 'react';
import { BillingProvider, useBilling } from './context/BillingContext';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CustomerView } from './components/CustomerView';
import { ProductView } from './components/ProductView';
import { InvoiceView } from './components/InvoiceView';
import { PaymentView } from './components/PaymentView';
import { ReceivablesView } from './components/ReceivablesView';
import { ExpenseView } from './components/ExpenseView';
import { CashControlView } from './components/CashControlView';
import { ReportView } from './components/ReportView';
import { UserRoleView } from './components/UserRoleView';
import { SettingView } from './components/SettingView';
import { 
  Bell, Check, Shield, Lock, Mail, UserCheck, ChevronRight, X, AlertCircle
} from 'lucide-react';

function AppContent() {
  const { 
    currentUser, login, register, notifications, markAsRead, logActivity, settings 
  } = useBilling();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Authentication Fields
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<'Super Admin' | 'Admin Keuangan' | 'Staff' | 'Viewer'>('Viewer');
  const [authError, setAuthError] = useState('');

  // Notifications dropdown trigger
  const [notifOpen, setNotifOpen] = useState(false);

  // Quick Sign in Handler
  const handleQuickSignIn = async (role: 'Super Admin' | 'Admin Keuangan' | 'Staff' | 'Viewer') => {
    let mockEmail = 'super@forsdig.id';
    if (role === 'Admin Keuangan') mockEmail = 'finance@forsdig.id';
    else if (role === 'Staff') mockEmail = 'staff@forsdig.id';
    else if (role === 'Viewer') mockEmail = 'viewer@forsdig.id';

    try {
      await login(mockEmail, 'admin123');
      setAuthError('');
    } catch {
      // Register it if not exists first on the fly
      const nameMap = {
        'Super Admin': 'Royan Payraya (CEO)',
        'Admin Keuangan': 'Siti Rahma (CFO)',
        'Staff': 'Hendra Wijaya (Sales)',
        'Viewer': 'Inspektur Pajak'
      };
      await register(mockEmail, 'admin123', nameMap[role], role);
      await login(mockEmail, 'admin123');
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegisterMode) {
        if (!regName || !email || !password) {
          setAuthError('Mohon isi semua bidang pendaftaran.');
          return;
        }
        await register(email, password, regName, regRole);
        setIsRegisterMode(false);
        setAuthError('Pendaftaran berhasil! Silakan masuk.');
      } else {
        if (!email || !password) {
          setAuthError('Mohon masukkan email dan sandi.');
          return;
        }
        await login(email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Gagal melakukan verifikasi keamanan kredensial.');
    }
  };

  // Switch workspace screens
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'pelanggan':
        return <CustomerView />;
      case 'produk':
        return <ProductView />;
      case 'invoice':
        return <InvoiceView />;
      case 'pembayaran':
        return <PaymentView />;
      case 'piutang':
        return <ReceivablesView />;
      case 'pengeluaran':
        return <ExpenseView />;
      case 'kas':
        return <CashControlView />;
      case 'laporan':
        return <ReportView />;
      case 'notifikasi':
      case 'bell-panel':
        return (
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Log Notifikasi Jatuh Tempo & Penagihan</span>
              <Bell size={16} className="text-red-650" />
            </h3>
            <div className="mt-4 space-y-3">
              {notifications.map(n => (
                <div key={n.id} className={`p-4 rounded-xl border flex items-center justify-between ${
                  n.isRead ? 'bg-slate-50 border-slate-150' : 'bg-red-50/50 border-red-105'
                }`}>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{n.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-normal">{n.message}</p>
                    <span className="text-[9px] font-mono text-slate-400 block mt-1">{n.timestamp}</span>
                  </div>
                  {!n.isRead && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="px-3 py-1 bg-white hover:bg-slate-50 text-red-600 rounded-lg text-[10px] font-bold border border-red-200 cursor-pointer"
                    >
                      Tandai Dibaca
                    </button>
                  )}
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-center py-10 text-slate-400 font-semibold text-xs">Belum ada pemberitahuan baru.</p>
              )}
            </div>
          </div>
        );
      case 'pengguna':
        return <UserRoleView />;
      case 'pengaturan':
        return <SettingView />;
      default:
        return <DashboardView />;
    }
  };

  // If user is not logged in, show polished Login workspace
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 selection:bg-red-200">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-150">
          
          {/* Welcome brand left column */}
          <div className="bg-slate-900 p-8 sm:p-12 text-white flex flex-col justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-bold text-lg text-white font-sans shadow-lg shadow-red-900/30">
                FB
              </div>
              <div>
                <h1 className="font-black text-lg leading-tight tracking-tight">FORSDIG BILLING</h1>
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest">Enterprise ERP</p>
              </div>
            </div>

            <div className="my-8 space-y-4">
              <h2 className="text-2xl font-extrabold tracking-tight">Satu Platform Penagihan & Keuangan Real-Time.</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">Kelola pelanggan, buat invoice profesional, scan pembayaran QRIS otomatis, catat struk beban pengeluaran, dan dapatkan analitik rugi-laba dalam satu dashboard modern.</p>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block mb-3">Login Instan Demo (Pilih Peran):</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => handleQuickSignIn('Super Admin')}
                  className="flex items-center justify-between p-2.5 bg-red-950/40 hover:bg-red-950/80 hover:text-white text-red-400 rounded-xl border border-red-900/30 font-bold transition text-[11px] cursor-pointer"
                >
                  <span>Super Admin</span>
                  <ChevronRight size={13} />
                </button>
                <button 
                  onClick={() => handleQuickSignIn('Admin Keuangan')}
                  className="flex items-center justify-between p-2.5 bg-amber-950/40 hover:bg-amber-950/80 hover:text-white text-amber-400 rounded-xl border border-amber-900/30 font-bold transition text-[11px] cursor-pointer"
                >
                  <span>CFO Keuangan</span>
                  <ChevronRight size={13} />
                </button>
                <button 
                  onClick={() => handleQuickSignIn('Staff')}
                  className="flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl border border-slate-700/50 font-bold transition text-[11px] cursor-pointer"
                >
                  <span>Staff Pelaksana</span>
                  <ChevronRight size={13} />
                </button>
                <button 
                  onClick={() => handleQuickSignIn('Viewer')}
                  className="flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-750 hover:text-white text-slate-400 rounded-xl border border-slate-700/50 font-bold transition text-[11px] cursor-pointer"
                >
                  <span>Viewer / Auditor</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Form right column */}
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">
              {isRegisterMode ? 'Buat Akun ERP Baru' : 'Login Masuk Dashboard'}
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-semibold mt-1">Masukkan kredensial keamanan instansi Anda untuk melanjutkan.</p>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-xl mb-4 flex items-center gap-1.5 leading-snug">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleManualAuth} className="space-y-4">
              {isRegisterMode && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Royan Payraya"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-xs rounded-xl focus:border-red-500 outline-none"
                    id="login-reg-name"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alamat Email</label>
                <input
                  type="email"
                  required
                  placeholder="payrayadev@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-xs rounded-xl focus:border-red-500 outline-none"
                  id="login-email-input"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kata Sandi</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-xs rounded-xl focus:border-red-500 outline-none"
                  id="login-password-input"
                />
              </div>

              {isRegisterMode && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Daftar Sebagai Peran</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="w-full border border-slate-200 p-2.5 text-xs rounded-xl focus:border-red-500 outline-none bg-white cursor-pointer"
                    id="login-reg-role"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin Keuangan">Admin Keuangan</option>
                    <option value="Staff">Staff Pelaksana</option>
                    <option value="Viewer">Viewer (Hanya Baca)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
                id="login-submit-btn"
              >
                {isRegisterMode ? 'Daftarkan Akun Baru' : 'Masuk Ke Billing Dashboard'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setAuthError('');
                }}
                className="text-[11px] text-red-650 hover:underline font-bold"
                id="toggle-auth-mode"
              >
                {isRegisterMode ? 'Sudah memiliki akun? Masuk' : 'Belum terdaftar? Hubungi TI / Buat Akun Baru'}
              </button>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // Logged-in full application layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-red-100">
      
      {/* Side bar Navigation (We created this!) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />

      {/* Main Workspace Frame container */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top bar header workspace */}
        <header className="bg-white border-b border-slate-150 px-6 py-4 flex items-center justify-between sticky top-0 z-40 no-print">
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-red-50 text-red-650 px-2 py-0.5 rounded font-extrabold uppercase font-mono tracking-wider">
              {settings.companyName || 'FORSDIG'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Real-time notification Bell popup icon */}
            <div className="relative">
              <button 
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-1 px-2 rounded-lg hover:bg-slate-100 text-slate-500 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                id="bell-notif-trigger"
              >
                <Bell size={16} className={notifications.some(n => !n.isRead) ? 'animate-bounce text-red-600' : ''} />
                {notifications.some(n => !n.isRead) && (
                  <span className="bg-red-600 text-white rounded-full text-[9px] font-bold px-1.5 py-0.5 mb-1">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {/* Notification drop menu widget overlay */}
              {notifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-slate-150 shadow-2xl p-4 space-y-3 max-h-96 overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Pemberitahuan Tempo</span>
                    <button 
                      onClick={() => setNotifOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-[10px] font-semibold"
                    >
                      Tutup
                    </button>
                  </div>
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-2.5 rounded-lg text-[11px] ${n.isRead ? 'bg-slate-50' : 'bg-red-50/50 border border-red-50'}`}>
                      <div className="font-bold text-slate-900">{n.title}</div>
                      <p className="text-slate-500 mt-0.5 leading-relaxed font-semibold">{n.message}</p>
                      {!n.isRead && (
                        <button 
                          onClick={() => {
                            markAsRead(n.id);
                            setNotifOpen(false);
                          }}
                          className="mt-1.5 font-extrabold text-red-650 hover:underline block"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-center text-slate-400 py-4 font-semibold text-[10px]">Pemberitahuan kosong.</p>
                  )}
                </div>
              )}
            </div>

            {/* Current UTC user info block */}
            <div className="text-right hidden sm:block">
              <div className="text-xs font-extrabold text-slate-900">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentUser.role}</div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner screens body */}
        <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </div>

      </main>

    </div>
  );
}

export default function App() {
  return (
    <BillingProvider>
      <AppContent />
    </BillingProvider>
  );
}
