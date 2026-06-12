import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { 
  TrendingUp, Award, DollarSign, Percent, Search, ShieldAlert,
  ChevronRight, Calendar, UserCheck, CheckCircle2, AlertCircle, Plus, Sparkles, Building2, UserPlus
} from 'lucide-react';
import { Invoice, UserProfile, UserRole } from '../types';

export const SalesCommissionView: React.FC = () => {
  const { 
    invoices, users, currentUser, logActivity, addNotification, updateUserRole 
  } = useBilling();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<'all' | 'realized' | 'potential'>('all');
  
  // Quick onboard user as Sales state
  const [showAddSalesModal, setShowAddSalesModal] = useState(false);
  const [newSalesName, setNewSalesName] = useState('');
  const [newSalesEmail, setNewSalesEmail] = useState('');

  // 1. Calculate General Aggregates
  // Invoices assigned to any sales agent
  const salesInvoices = invoices.filter(inv => inv.salesId);

  const totalSalesVolume = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const realizedSalesVolume = salesInvoices
    .filter(inv => inv.status === 'Lunas')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalPotentialCommission = salesInvoices.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
  const totalRealizedCommission = salesInvoices
    .filter(inv => inv.status === 'Lunas')
    .reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);

  // 2. Performance list by agent
  // To ensure any user can be assigned as sales, we retrieve unique sales IDs assigned or users with Sales / Staff role
  const salesAgents = (users || []).filter(u => u.role === 'Sales' || u.role === 'Staff');

  const agentSummaries = salesAgents.map(agent => {
    const agentInvoices = invoices.filter(inv => inv.salesId === agent.userId || inv.salesId === agent.id);
    const invoiceCount = agentInvoices.length;
    
    const invoicedTotal = agentInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidTotal = agentInvoices
      .filter(inv => inv.status === 'Lunas')
      .reduce((sum, inv) => sum + inv.total, 0);
    
    const potentialCommission = agentInvoices.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
    const realizedCommission = agentInvoices
      .filter(inv => inv.status === 'Lunas')
      .reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);

    const conversionRate = invoicedTotal > 0 ? (paidTotal / invoicedTotal) * 100 : 0;

    return {
      userId: agent.userId || agent.id,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      status: agent.status,
      invoiceCount,
      invoicedTotal,
      paidTotal,
      potentialCommission,
      realizedCommission,
      conversionRate
    };
  });

  // Handle onboarding new Sales directly
  const handleOnboardSales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesName || !newSalesEmail) {
      alert('Nama dan Email wajib diisi!');
      return;
    }

    try {
      // Find if email exists or mock registering a new Sales agent locally
      const mockId = `demo-sales-${Date.now()}`;
      
      // Since context has users, we can register them as a Sales agent role.
      // For instant offline support, we can update context's users list or register them
      // Let's call logActivity and addNotification
      if (logActivity) {
        logActivity(`Menambahkan Agen Sales Baru: ${newSalesName}`, 'Pengguna');
      }
      if (addNotification) {
        addNotification(
          'Sales Baru Terdaftar',
          `Agen Sales ${newSalesName} (${newSalesEmail}) berhasil didaftarkan ke sistem Forsdig Billing.`,
          'success'
        );
      }

      // To keep it simple and durable, we notify user and let them register via standard Auth or add user role.
      // Or we can register directly under local / state. Let's do it seamlessly.
      // Since we can use `users`, we can create a temporary user in contextual mock list.
      // To guarantee they show up, let's create them!
      const mockSalesUser = {
        id: mockId,
        userId: mockId,
        name: newSalesName,
        email: newSalesEmail,
        role: 'Sales' as UserRole,
        status: 'Aktif' as const
      };

      // We will write a function or update the users array if available, but users is backed by context state.
      // A simple and reliable way is to save new user to context users.
      // Let's check how context handles registering. Context register function allows creating users.
      // Let's use register(email, password, name, role)
      const mockPassword = 'sales123password';
      const { register } = useBilling();
      if (register) {
        await register(newSalesEmail, mockPassword, newSalesName, 'Sales');
      }

      setShowAddSalesModal(false);
      setNewSalesName('');
      setNewSalesEmail('');
    } catch (err: any) {
      console.error(err);
      alert('Gagal onboarding sales: ' + (err.message || err));
    }
  };

  // Filter commissions ledger
  const filteredInvoices = salesInvoices.filter(inv => {
    const matchSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.salesName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isLunas = inv.status === 'Lunas';
    if (commissionStatusFilter === 'realized') return matchSearch && isLunas;
    if (commissionStatusFilter === 'potential') return matchSearch && !isLunas;
    return matchSearch;
  });

  return (
    <div className="space-y-6" id="sales-commission-container">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-650">
            <TrendingUp size={20} className="animate-bounce-slow" />
            <h2 className="text-lg font-black tracking-tight text-slate-850 uppercase">Performa & Komisi Sales</h2>
          </div>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Pantau perolehan omzet, besaran komisi, dan persentase pembayaran yang diperoleh tim marketing / sales.
          </p>
        </div>
        
        <button
          onClick={() => setShowAddSalesModal(true)}
          className="flex items-center justify-center gap-2 bg-[#D32F2F] hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-red-950/10 cursor-pointer transition hover:scale-[1.02] duration-150 active:scale-[0.98]"
          id="onboard-sales-agent-btn"
        >
          <UserPlus size={15} />
          <span>Tambah Agen Sales</span>
        </button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="sales-kpi-grid">
        {/* KPI 1 : Total Volume Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Volume Sales Potensial</span>
            <span className="text-base font-black text-slate-800 leading-tight mt-1 block">
              {totalSalesVolume.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-1">Berdasarkan seluruh invoice terbit</span>
          </div>
        </div>

        {/* KPI 2 : Realized Paid Sales Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Volume Sales Terealisasi</span>
            <span className="text-base font-black text-slate-800 leading-tight mt-1 block">
              {realizedSalesVolume.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
            <span className="text-[9px] text-emerald-600 font-bold block mt-1">
              {totalSalesVolume > 0 ? `${((realizedSalesVolume / totalSalesVolume) * 100).toFixed(1)}% Lunas Terbayar` : '0%'}
            </span>
          </div>
        </div>

        {/* KPI 3 : Potential Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <Percent size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Potensi Komisi</span>
            <span className="text-base font-black text-slate-800 leading-tight mt-1 block">
              {totalPotentialCommission.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-1">Komisi dari invoice aktif / berjalan</span>
          </div>
        </div>

        {/* KPI 4 : Realized (Paid) Commission */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3.5 bg-red-50 text-red-600 rounded-xl">
            <Award size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Komisi Cair (Terealisasi)</span>
            <span className="text-base font-black text-red-650 leading-tight mt-1 block">
              {totalRealizedCommission.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
            </span>
            <span className="text-[9px] text-red-600 font-bold block mt-1">
              Siap dicairkan / dibayarkan ke sales
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns : Sales Performance Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Award size={16} className="text-red-600" />
              <span>Klasemen & Kinerja Agen Sales</span>
            </h3>
            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase tracking-wider">
              {agentSummaries.length} Anggota Tim
            </span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-450 border-b border-slate-100 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 rounded-l-lg">Nama & Peran</th>
                  <th className="p-4 text-center">Inv</th>
                  <th className="p-4 text-right">Potensi Sales</th>
                  <th className="p-4 text-right">Terealisasi</th>
                  <th className="p-4 text-right text-red-700">Komisi Cair</th>
                  <th className="p-4 rounded-r-lg text-center">Rasio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agentSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400 font-semibold text-xs">
                      Belum ada tim dengan akses Sales/Staff penagihan aktif.
                    </td>
                  </tr>
                ) : (
                  agentSummaries.map((agent, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition duration-150">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{agent.name}</div>
                        <div className="text-[10px] text-slate-450 mt-0.5">{agent.email}</div>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-700">
                        {agent.invoiceCount}
                      </td>
                      <td className="p-4 text-right font-semibold text-slate-805">
                        {agent.invoicedTotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-4 text-right font-medium text-emerald-600">
                        {agent.paidTotal.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-4 text-right font-black text-red-650">
                        {agent.realizedCommission.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <span className="font-extrabold text-[10px] text-slate-700">
                            {agent.conversionRate.toFixed(0)}%
                          </span>
                          <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-full rounded-full" 
                              style={{ width: `${Math.min(100, agent.conversionRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Columns : Detailed Commissions Log */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Calendar size={16} className="text-slate-450" />
              <span>Daftar Komisi per Invoice</span>
            </h3>
            
            <select
              value={commissionStatusFilter}
              onChange={(e) => setCommissionStatusFilter(e.target.value as any)}
              className="text-[10px] border border-slate-200 outline-none p-1 rounded-lg bg-gray-50 font-bold text-slate-600 cursor-pointer"
            >
              <option value="all">Semua Komisi</option>
              <option value="realized">Terealisasi (Lunas)</option>
              <option value="potential">Masih Potensi</option>
            </select>
          </div>

          {/* Search bar inside ledger */}
          <div className="mt-4 relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Search size={13} />
            </span>
            <input
              type="text"
              placeholder="Cari Agen, Invoice, atau Pelanggan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold pl-8 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-[#D32F2F] placeholder-slate-450"
            />
          </div>

          {/* Commission Items List */}
          <div className="mt-4 space-y-3.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs">
                Tidak ditemukan catatan komisi yang cocok.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const isLunas = inv.status === 'Lunas';
                return (
                  <div key={inv.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">#{inv.invoiceNumber}</span>
                        <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-md ${
                          isLunas 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                            : 'bg-amber-50 text-amber-700 border border-amber-150'
                        }`}>
                          {isLunas ? 'Cair' : 'Potensi'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 text-xs truncate max-w-[200px]">
                        {inv.customerName.split(' - ')[0]}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-450">
                        Sales: <span className="text-slate-700">{inv.salesName || 'Tanpa Nama'}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-red-650 text-xs">
                        {(inv.commissionAmount || 0).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 block mt-0.5">
                        Rate: {inv.commissionRate ?? 0}%
                      </div>
                      <div className="text-[8px] text-slate-405 font-medium mt-1">
                        Total Inv: Rp {inv.total.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Onboarding New Sales Modal */}
      {showAddSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="onboard-sales-modal">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setShowAddSalesModal(false)}
          />
          
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-150">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserCheck size={18} className="text-[#D32F2F]" />
              <span>Registrasi Agen Sales Baru</span>
            </h3>

            <p className="text-[11px] font-medium text-slate-405 leading-relaxed mt-2.5">
              Masukkan nama lengkap dan email sales baru. Akun akan didaftarkan sebagai peran <strong className="text-[#D32F2F]">Sales</strong> dan dapat login untuk melihat performance/komisi pribadi.
            </p>

            <form onSubmit={handleOnboardSales} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap Agen</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={newSalesName}
                  onChange={(e) => setNewSalesName(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Resmi Korporat</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: budi@company.com"
                  value={newSalesEmail}
                  onChange={(e) => setNewSalesEmail(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 placeholder-slate-400"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSalesModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D32F2F] hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  <span>Daftarkan Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
