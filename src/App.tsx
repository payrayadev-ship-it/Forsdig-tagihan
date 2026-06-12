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
import { SalesCommissionView } from './components/SalesCommissionView';
import { UserRoleView } from './components/UserRoleView';
import { SettingView } from './components/SettingView';
import { RentContractView } from './components/RentContractView';
import { 
  Bell, Check, Shield, Lock, Mail, UserCheck, ChevronRight, X, AlertCircle, Database, Globe,
  LayoutDashboard, Users, ShoppingBag, Receipt, CreditCard, AlertTriangle, ArrowDownCircle, 
  Landmark, BarChart3, Settings, LogOut, Menu, Eye, EyeOff, Sparkles, ArrowUpRight, 
  ArrowDownRight, TrendingUp, Wallet, QrCode, Search, Building2, Activity, Plus
} from 'lucide-react';

function AppContent() {
  const { 
    currentUser, login, register, notifications, markAsRead, logActivity, settings, loginWithGoogle,
    customers, invoices, payments, expenses, cashAccounts, receivables, logs, logout
  } = useBilling();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [qrisModalOpen, setQrisModalOpen] = useState(false);

  // Authentication Fields
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<'Super Admin' | 'Admin Keuangan' | 'Staff' | 'Viewer' | 'Sales'>('Viewer');
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
      case 'sales':
        return <SalesCommissionView />;
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
      case 'sewa':
        return <RentContractView />;
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
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide block mb-2">Integrasi Firebase Cloud:</span>
              <button
                onClick={async () => {
                  try {
                    setAuthError('');
                    await loginWithGoogle();
                  } catch (err: any) {
                    setAuthError(err.message || 'Gagal login real Google SSO.');
                  }
                }}
                className="w-full flex items-center justify-between p-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl border border-red-600/30 font-extrabold transition text-[11px] cursor-pointer shadow-md shadow-red-950/10"
                id="login-google-sso-cta"
              >
                <span className="flex items-center gap-1.5">
                  <Database size={13} className="text-amber-400" />
                  <span>Koneksi Cloud (Google SSO)</span>
                </span>
                <ChevronRight size={13} />
              </button>
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
                <div className="relative">
                  <input
                    type={showAuthPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan sandi..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 pr-10 text-xs rounded-xl focus:border-red-500 outline-none"
                    id="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    id="toggle-auth-password-visibility"
                  >
                    {showAuthPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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
                    <option value="Sales">Tim Sales / Marketing</option>
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
  const mobileBalance = (cashAccounts || []).reduce((sum, acc) => sum + acc.balance, 0);
  const mobilePiutang = (receivables || []).reduce((sum, r) => sum + r.remainingAmount, 0);
  const mobileUnpaidCount = (invoices || []).filter(i => ['Belum Dibayar', 'Sebagian Dibayar', 'Dikirim'].includes(i.status)).length;

  const recentMutasi = [
    ...(payments || []).map(p => ({
      id: p.id,
      title: p.customerName || 'Transfer Masuk',
      desc: `Invoice #${p.invoiceNumber}`,
      amount: p.amount,
      type: 'IN' as const,
      date: p.paymentDate,
    })),
    ...(expenses || []).map(e => ({
      id: e.id,
      title: e.vendor || 'Beban Biaya',
      desc: e.description || `${e.category}`,
      amount: e.amount,
      type: 'OUT' as const,
      date: e.date,
    }))
  ]
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 5);

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 11) return 'Selamat Pagi';
    if (hr < 15) return 'Selamat Siang';
    if (hr < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-red-105 pb-safe">
      
      {/* ================= DESKTOP SIDEBAR ================= */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />

      {/* ================= DESKTOP SCREEN FRAME (Visible on md+) ================= */}
      <main className="hidden md:flex flex-1 flex-col min-w-0 min-h-screen">
        
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
                <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-2xl border border-slate-150 shadow-2xl p-4 space-y-3 max-h-96 overflow-y-auto font-sans">
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
              <div className="text-xs font-extrabold text-[#D32F2F] flex items-center gap-1">
                <Sparkles size={11} className="text-amber-500 animate-pulse" />
                <span>{currentUser.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{currentUser.role}</div>
            </div>
          </div>
        </header>

        {/* Dynamic Inner screens body */}
        <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {renderActiveView()}
        </div>

      </main>

      {/* ================= MODERN M-BANKING SCREEN SHELL (Visible on Mobile only <md) ================= */}
      <div className="md:hidden flex flex-1 flex-col min-h-screen bg-[#F8FAFC]">
        
        {/* Dynamic header row */}
        <header className="bg-gradient-to-r from-[#D32F2F] to-[#991B1B] text-white px-4 pt-4 pb-20 rounded-b-[2.5rem] shadow-xl relative select-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg">
                <div className="w-4 h-4 bg-[#D32F2F] rounded-sm transform rotate-45"></div>
              </div>
              <div>
                <span className="font-sans font-black text-xs block tracking-widest leading-none">FORSDIG M-BANK</span>
                <span className="text-[9px] text-red-200 font-mono tracking-widest block mt-0.5">PREMIER VIP</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setActiveTab('notifikasi')}
                className="p-1 px-1.5 bg-white/10 hover:bg-white/20 rounded-xl relative"
              >
                <Bell size={16} className={notifications.some(n => !n.isRead) ? 'animate-bounce text-yellow-300' : ''} />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full border border-[#D32F2F]"></span>
                )}
              </button>

              <button 
                onClick={logout}
                className="p-1 px-1.5 bg-black/20 hover:bg-red-955 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 border border-white/10"
              >
                <LogOut size={11} />
                <span>Keluar</span>
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center space-x-3.5 px-1">
            <div className="w-11 h-11 rounded-full bg-white/15 border border-white/30 flex items-center justify-center font-bold text-sm text-white shadow-inner">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-[10px] text-red-150 font-bold uppercase leading-none tracking-wider">{getGreeting()},</p>
              <h2 className="text-base font-extrabold tracking-tight text-white mt-1.5 flex items-center gap-1.5">
                <span>{currentUser.name.split(' ')[0]}</span>
                <Sparkles size={13} className="text-amber-300 animate-pulse" />
              </h2>
            </div>
          </div>
        </header>

        {/* Content Floating Container */}
        <div className="px-4 -mt-16 pb-28 z-10 flex-1">
          
          {/* Dashboard (Home) */}
          {activeTab === 'dashboard' ? (
            <div className="space-y-5">
              
              {/* WALLET / REKENING CARD */}
              <div className="bg-gradient-to-r from-slate-900 via-zinc-805 to-red-950 text-white rounded-3xl p-5 shadow-2xl relative overflow-hidden border border-white/10">
                {/* Decorative glow chips */}
                <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-red-650/10 to-transparent pointer-events-none" />
                <div className="absolute left-4 top-4 text-zinc-400 font-bold text-[8px] tracking-widest">FORSDIG DEBIT VIP</div>
                <div className="absolute right-4 top-4">
                  <div className="w-8 h-4 rounded bg-white/10 border border-white/20 flex items-center justify-center text-[7px] font-bold text-white uppercase italic">
                    VISA
                  </div>
                </div>

                <div className="mt-8">
                  <div className="text-[10px] text-zinc-400 font-medium tracking-wide flex items-center gap-1.5">
                    <span>Saldo Rekening Utama</span>
                    <button 
                      type="button"
                      onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                      className="text-white hover:text-red-400 p-0.5 cursor-pointer"
                    >
                      {isBalanceVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </div>
                  
                  <h3 className="text-xl font-black font-mono tracking-tight text-white mt-1.5">
                    {isBalanceVisible 
                      ? `Rp ${mobileBalance.toLocaleString('id-ID')}` 
                      : 'Rp ••••••••'
                    }
                  </h3>
                </div>

                <div className="mt-6 pt-3.5 border-t border-white/10 grid grid-cols-2 gap-4 text-left">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Piutang Tagihan</span>
                    <span className="text-xs font-extrabold text-amber-400 block mt-0.5 font-mono">
                      Rp {mobilePiutang.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Tagihan Aktif</span>
                    <span className="text-xs font-extrabold text-red-400 block mt-0.5 font-mono">
                      {mobileUnpaidCount} Lembar
                    </span>
                  </div>
                </div>

                {/* Card footer details */}
                <div className="mt-4 flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-1 pointer-events-none">
                  <span>9368-2476-4550-2026</span>
                  <span>{currentUser.role}</span>
                </div>
              </div>

              {/* QUICK TRANSFER / INVOICE SELECTION ROW */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 grid grid-cols-4 gap-2 text-center select-none">
                <button 
                  onClick={() => setActiveTab('invoice')}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-[#D32F2F] transition">
                    <Plus size={18} />
                  </div>
                  <span className="text-[10px] text-slate-800 font-bold mt-1.5 whitespace-nowrap">Tagih Baru</span>
                </button>

                <button 
                  onClick={() => setQrisModalOpen(true)}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center text-amber-600 transition">
                    <QrCode size={18} />
                  </div>
                  <span className="text-[10px] text-slate-800 font-bold mt-1.5 whitespace-nowrap">Scan QRIS</span>
                </button>

                <button 
                  onClick={() => setActiveTab('pembayaran')}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center text-teal-600 transition">
                    <Wallet size={18} />
                  </div>
                  <span className="text-[10px] text-slate-800 font-bold mt-1.5 whitespace-nowrap">Menerima</span>
                </button>

                <button 
                  onClick={() => setActiveTab('pengeluaran')}
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 transition">
                    <ArrowDownCircle size={18} />
                  </div>
                  <span className="text-[10px] text-slate-800 font-bold mt-1.5 whitespace-nowrap">Beban Biaya</span>
                </button>
              </div>

              {/* M-BANKING CENTRAL GRID (Aksi Menu 4x2) */}
              <div>
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Layanan Keuangan</h3>
                  <Activity size={12} className="text-[#D32F2F]" />
                </div>
                
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 grid grid-cols-4 gap-y-5 gap-x-2 text-center select-none">
                  
                  <button onClick={() => setActiveTab('invoice')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-red-500/10 active:scale-95 transition-transform">
                      <Receipt size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Tagihan</span>
                  </button>

                  <button onClick={() => setActiveTab('pembayaran')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/10 active:scale-95 transition-transform">
                      <CreditCard size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Setor</span>
                  </button>

                  <button onClick={() => setActiveTab('pengeluaran')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/10 active:scale-95 transition-transform">
                      <ArrowDownCircle size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Struk Biaya</span>
                  </button>

                  <button onClick={() => setActiveTab('pelanggan')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-blue-500/10 active:scale-95 transition-transform">
                      <Users size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Klien</span>
                  </button>

                  <button onClick={() => setActiveTab('produk')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-fuchsia-500/10 active:scale-95 transition-transform">
                      <ShoppingBag size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Produk</span>
                  </button>

                  <button onClick={() => setActiveTab('kas')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/10 active:scale-95 transition-transform">
                      <Landmark size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Rekening</span>
                  </button>

                  <button onClick={() => setActiveTab('laporan')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-zinc-700 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-600/10 active:scale-95 transition-transform">
                      <BarChart3 size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Laporan L/R</span>
                  </button>

                  <button onClick={() => setActiveTab('pengguna')} className="flex flex-col items-center cursor-pointer">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#D32F2F] to-slate-900 text-white flex items-center justify-center shadow-md shadow-red-900/10 active:scale-95 transition-transform">
                      <Shield size={18} />
                    </div>
                    <span className="text-[10px] text-slate-700 font-bold mt-2 truncate w-full">Log Audit</span>
                  </button>

                </div>
              </div>

              {/* TRANSACTION MUTASI FEED */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <h4 className="text-xs font-bold text-slate-800">Mutasi Rekening Terkini</h4>
                  <button 
                    onClick={() => setActiveTab('pembayaran')}
                    className="text-[10px] text-[#D32F2F] font-bold cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                <div className="space-y-4">
                  {recentMutasi.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-left">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex flex-shrink-0 items-center justify-center text-xs font-bold ${
                          item.type === 'IN' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-rose-50 text-rose-750'
                        }`}>
                          {item.type === 'IN' ? 'CR' : 'DB'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold text-slate-900 leading-tight truncate">
                            {item.title}
                          </p>
                          <span className="text-[9px] text-slate-400 block mt-0.5 leading-none truncate">
                            {item.desc}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className={`text-[11px] font-bold font-mono ${
                          item.type === 'IN' ? 'text-emerald-750' : 'text-rose-650'
                        }`}>
                          {item.type === 'IN' ? '+' : '-'}Rp {item.amount.toLocaleString('id-ID')}
                        </p>
                        <span className="text-[9px] text-slate-405 block mt-0.5 leading-none">{item.date}</span>
                      </div>
                    </div>
                  ))}
                  {recentMutasi.length === 0 && (
                    <p className="text-center text-slate-450 py-6 text-[10px]">Belum ada mutasi terdaftar.</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* Subviews screen container */
            <div className="space-y-4 pt-2 pb-10">
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="p-1 hover:bg-slate-50 text-slate-500 rounded cursor-pointer"
                  >
                    <ChevronRight size={18} className="transform rotate-180 text-[#D32F2F]" />
                  </button>
                  <span className="text-xs font-bold text-slate-800 capitalize">
                    {activeTab === 'notifikasi' ? 'Notifikasi' : activeTab === 'pengaturan' ? 'Pengaturan' : activeTab}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-[#D32F2F] font-mono bg-red-50 px-2 py-0.5 rounded">FORSDIG MOBILE</span>
              </div>
              
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 overflow-x-auto">
                {renderActiveView()}
              </div>
            </div>
          )}

        </div>

        {/* ================= PERSISTENT MOBILE BOTTOM NAVIGATION ================= */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex justify-around items-center z-50 shadow-2xl pb-safe">
          
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-550'
            }`}
          >
            <LayoutDashboard size={19} />
            <span className="text-[9px] font-bold mt-0.5">Beranda</span>
          </button>

          <button 
            onClick={() => setActiveTab('invoice')}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all cursor-pointer ${
              activeTab === 'invoice' ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-550'
            }`}
          >
            <Receipt size={19} />
            <span className="text-[9px] font-bold mt-0.5">Tagihan</span>
          </button>

          {/* Elevated Central Action (Quick Pay/Validate QRIS) */}
          <button 
            onClick={() => setQrisModalOpen(true)}
            className="flex flex-col items-center justify-center w-12 h-12 -mt-4 bg-gradient-to-tr from-[#D32F2F] to-rose-600 text-white rounded-full transition-transform active:scale-95 shadow-lg shadow-red-500/30 z-20 cursor-pointer"
          >
            <QrCode size={20} className="animate-pulse" />
          </button>

          <button 
            onClick={() => setActiveTab('kas')}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all cursor-pointer ${
              activeTab === 'kas' ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-550'
            }`}
          >
            <Landmark size={19} />
            <span className="text-[9px] font-bold mt-0.5">Kas Bank</span>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('pengaturan')}
            className={`flex flex-col items-center justify-center w-12 py-1 transition-all cursor-pointer ${
              activeTab === 'pengaturan' ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-550'
            }`}
          >
            <Settings size={19} />
            <span className="text-[9px] font-bold mt-0.5">Pengaturan</span>
          </button>

        </nav>

      </div>

      {/* ================= EXTRA QRIS STATIC SCAN MODAL FOR M-BANKING LAYOUT ================= */}
      {qrisModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden font-sans">
            {/* Design accents */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-[#D32F2F]" />
            
            <button 
              onClick={() => setQrisModalOpen(false)}
              className="absolute top-4 right-4 text-slate-405 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full transition cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="font-sans font-black text-slate-900 text-xs tracking-wider flex items-center justify-center gap-1.5 mt-2">
              <QrCode size={16} className="text-[#D32F2F]" />
              <span>GPN QRIS STANDAR INDONESIA</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">Gunakan Aplikasi m-Banking / e-Wallet apa saja untuk scan kuitansi digital</p>

            <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-150 flex flex-col items-center justify-center select-none">
              <div className="bg-white p-3 rounded-xl shadow border border-slate-100 relative">
                {settings?.qrisUrl ? (
                  <img 
                    src={settings.qrisUrl} 
                    alt="QRIS Barcode" 
                    className="w-40 h-40 object-contain rounded"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <>
                    {/* Simulated high fidelity QRIS code using placeholder vector SVG */}
                    <svg className="w-40 h-40 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                      {/* Outer border boxes */}
                      <rect x="5" y="5" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="10" y="10" width="10" height="10" />
                      
                      <rect x="75" y="5" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="80" y="10" width="10" height="10" />
                      
                      <rect x="5" y="75" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="6" />
                      <rect x="10" y="80" width="10" height="10" />
                      
                      {/* Simulated standard barcode noise blocks */}
                      <rect x="35" y="10" width="10" height="15" />
                      <rect x="55" y="10" width="15" height="5" />
                      <rect x="50" y="25" width="20" height="10" />
                      <rect x="10" y="35" width="15" height="10" />
                      <rect x="30" y="40" width="30" height="25" />
                      <rect x="70" y="45" width="20" height="15" />
                      <rect x="75" y="70" width="15" height="20" />
                      <rect x="35" y="75" width="20" height="10" />
                      <rect x="60" y="85" width="10" height="5" />
                      {/* Central QRIS ID logo */}
                      <rect x="42" y="42" width="16" height="16" rx="3" fill="#D32F2F" />
                      <circle cx="50" cy="50" r="3" fill="white" />
                    </svg>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-1.5 py-0.5 rounded text-[8px] font-black text-[#D32F2F] border border-red-200">
                      QRIS
                    </div>
                  </>
                )}
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-700 tracking-wider mt-2">ID NEGARA: ID1026045500</span>
            </div>

            <div className="bg-red-50 p-3 rounded-2xl border border-red-100 text-left text-[11px] text-[#D32F2F] leading-relaxed">
              <span className="font-extrabold block">INFO PENAGIHAN:</span>
              <p className="mt-0.5 font-semibold text-red-900">Scan QRIS ini untuk kuitansi digital instan. Dana otomatis disalurkan ke Kas/Bank Utama Anda saat pembayaran divalidasi pembayarannya.</p>
            </div>

            <button 
              type="button"
              onClick={() => setQrisModalOpen(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Unduh Kode QR / Selesai
            </button>
          </div>
        </div>
      )}

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
