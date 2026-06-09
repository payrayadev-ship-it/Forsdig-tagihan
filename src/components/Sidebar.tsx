import React from 'react';
import { useBilling } from '../context/BillingContext';
import { 
  LayoutDashboard, Users, ShoppingBag, Receipt, CreditCard, 
  AlertTriangle, ArrowDownCircle, Landmark, BarChart3, 
  Bell, ShieldCheck, Settings, LogOut, Menu, X, Database
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  mobileOpen, 
  setMobileOpen 
}) => {
  const { currentUser, logout, notifications, seedInitialData } = useBilling();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'pelanggan', label: 'Pelanggan', icon: Users, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'produk', label: 'Produk & Layanan', icon: ShoppingBag, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'invoice', label: 'Invoice (Tagihan)', icon: Receipt, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'pembayaran', label: 'Pembayaran', icon: CreditCard, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'piutang', label: 'Piutang Dues', icon: AlertTriangle, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: ArrowDownCircle, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'kas', label: 'Kas & Bank', icon: Landmark, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'laporan', label: 'Laporan Keuangan', icon: BarChart3, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'notifikasi', label: 'Notifikasi', icon: Bell, badge: notifications.filter(n => !n.isRead).length, roles: ['Super Admin', 'Admin Keuangan', 'Staff', 'Viewer'] },
    { id: 'pengguna', label: 'Hak Akses & Log', icon: ShieldCheck, roles: ['Super Admin', 'Admin Keuangan'] },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings, roles: ['Super Admin'] }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    currentUser ? item.roles.includes(currentUser.role) : false
  );

  const handleNav = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-800 border-r border-slate-200 select-none" id="sidebar-panel-container">
      {/* Header Logo */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#D32F2F] rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm transform rotate-45"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">FORSDIG<span className="text-[#D32F2F]">.</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Billing ERP</p>
          </div>
        </div>
        <button 
          onClick={() => setMobileOpen(false)} 
          className="md:hidden text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          id="close-sidebar-btn"
        >
          <X size={20} />
        </button>
      </div>

      {/* User Info Bar */}
      <div className="p-4 mx-4 my-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-[#D32F2F] flex items-center justify-center font-bold text-slate-700">
            {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs text-slate-700 truncate">{currentUser?.name}</h4>
            <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-bold bg-[#D32F2F]/5 text-[#D32F2F] rounded border border-[#D32F2F]/10">
              {currentUser?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {filteredMenuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg transition-all duration-150 cursor-pointer ${
                isActive 
                  ? 'bg-red-50 text-[#D32F2F] font-semibold border-l-2 border-[#D32F2F]' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              id={`sidebar-link-${item.id}`}
            >
              <div className="flex items-center space-x-3">
                <Icon size={18} className={isActive ? 'text-[#D32F2F]' : 'text-slate-400 group-hover:text-slate-600'} />
                <span className="text-xs">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#D32F2F] text-white rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* System Actions at bottom */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <button
          onClick={() => seedInitialData()}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition"
          title="Seed Dummy Datasets"
          id="seed-data-btn"
        >
          <Database size={13} className="text-[#D32F2F]" />
          <span>Muat Sampel Data</span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-[#D32F2F] transition duration-150 cursor-pointer"
          id="logout-btn"
        >
          <LogOut size={16} />
          <span className="text-xs font-semibold">Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Handheld topbar (mobile screen only) */}
      <div className="md:hidden bg-white text-slate-800 px-4 py-3 flex items-center justify-between border-b border-slate-200 select-none">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-[#D32F2F] flex items-center justify-center">
            <div className="w-3.5 h-3.5 bg-white rounded-sm transform rotate-45"></div>
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-800">FORSDIG<span className="text-[#D32F2F]">.</span></span>
        </div>
        <button 
          onClick={() => setMobileOpen(true)}
          className="p-1 rounded-lg hover:bg-slate-50 text-slate-600"
          id="mobile-menu-hamburger"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Large desktop persistent sidebar container */}
      <aside className="hidden md:block w-64 flex-shrink-0 border-r border-slate-200 h-screen sticky top-0" id="desktop-sidebar-container">
        <SidebarContent />
      </aside>

      {/* Handheld Slide out Sidebar menu drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" id="mobile-sidebar-drawer">
          {/* Backdrop screen */}
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity" 
            onClick={() => setMobileOpen(false)}
          />
          {/* Menu Drawer */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white border-r border-slate-200 h-full">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
