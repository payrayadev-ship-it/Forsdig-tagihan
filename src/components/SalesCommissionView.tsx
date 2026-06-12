import React, { useState, useEffect } from 'react';
import { useBilling } from '../context/BillingContext';
import { 
  TrendingUp, Award, DollarSign, Percent, Search, ShieldAlert,
  ChevronRight, Calendar, UserCheck, CheckCircle2, AlertCircle, Plus, 
  Sparkles, Building2, UserPlus, Wallet, ArrowUpRight, Sliders, 
  Download, Clock, Check, X, CreditCard, History, Medal, HelpCircle, Flame
} from 'lucide-react';
import { Invoice, UserProfile, UserRole, CommissionPayout, SalesTarget, PayoutStatus } from '../types';

export const SalesCommissionView: React.FC = () => {
  const { 
    invoices = [], 
    users = [], 
    currentUser, 
    payouts = [], 
    targets = [],
    addPayoutRequest,
    updatePayoutStatus,
    updateSalesTarget,
    logActivity, 
    addNotification 
  } = useBilling();

  const [activeTab, setActiveTab] = useState<'performance' | 'payouts' | 'ledger'>('performance');
  const [searchTerm, setSearchTerm] = useState('');
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<'all' | 'realized' | 'potential'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  
  // Modals state
  const [showAddSalesModal, setShowAddSalesModal] = useState(false);
  const [newSalesName, setNewSalesName] = useState('');
  const [newSalesEmail, setNewSalesEmail] = useState('');
  
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState('');
  const [targetAmountVal, setTargetAmountVal] = useState('');
  
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmountVal, setPayoutAmountVal] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('Transfer Bank');
  const [payoutBankAccount, setPayoutBankAccount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  // Process Payout Notes
  const [processNotes, setProcessNotes] = useState('');
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);

  // Default target month (June 2026)
  const currentMonth = '2026-06';

  // 1. Calculations & Aggregates
  const salesInvoices = invoices.filter(inv => inv.salesId);

  // Filter out users with roles 'Sales' or 'Staff'
  const salesAgents = users.filter(u => u.role === 'Sales' || u.role === 'Staff');

  // Multi-metrics performance mapping per agent
  const agentSummaries = salesAgents.map(agent => {
    const agentId = agent.userId || agent.id;
    const agentInvoices = invoices.filter(inv => inv.salesId === agentId);
    
    const invoicedTotal = agentInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidTotal = agentInvoices
      .filter(inv => inv.status === 'Lunas')
      .reduce((sum, inv) => sum + inv.total, 0);
    
    // Earned commissions totals
    const potentialCommission = agentInvoices.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
    const realizedCommission = agentInvoices
      .filter(inv => inv.status === 'Lunas')
      .reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);

    // Total already paid out or requested
    const agentPayouts = payouts.filter(p => p.salesId === agentId);
    const requestedPayoutsTotal = agentPayouts
      .filter(p => p.status === 'Diajukan' || p.status === 'Diproses')
      .reduce((sum, p) => sum + p.amount, 0);
    const finalizedPayoutsTotal = agentPayouts
      .filter(p => p.status === 'Selesai')
      .reduce((sum, p) => sum + p.amount, 0);

    const claimableCommission = Math.max(0, realizedCommission - (requestedPayoutsTotal + finalizedPayoutsTotal));

    const conversionRate = invoicedTotal > 0 ? (paidTotal / invoicedTotal) * 100 : 0;

    // Monthly Target
    const monthlyTarget = targets.find(t => t.salesId === agentId && t.month === currentMonth)?.targetAmount || 0;
    const targetAchievedPercent = monthlyTarget > 0 ? (paidTotal / monthlyTarget) * 100 : 0;

    // Commission Tier Level
    let tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
    let nextTierVal = 10000000;
    let progressToNext = 0;

    if (paidTotal >= 150000000) {
      tier = 'Platinum';
      nextTierVal = 0;
      progressToNext = 100;
    } else if (paidTotal >= 50000000) {
      tier = 'Gold';
      nextTierVal = 150000000;
      progressToNext = ((paidTotal - 50000000) / 100000000) * 100;
    } else if (paidTotal >= 10000000) {
      tier = 'Silver';
      nextTierVal = 50000000;
      progressToNext = ((paidTotal - 10000000) / 40000000) * 100;
    } else {
      tier = 'Bronze';
      nextTierVal = 10000000;
      progressToNext = (paidTotal / 10000000) * 100;
    }

    return {
      userId: agentId,
      name: agent.name,
      email: agent.email,
      role: agent.role,
      status: agent.status,
      invoiceCount: agentInvoices.length,
      invoicedTotal,
      paidTotal,
      potentialCommission,
      realizedCommission,
      requestedPayoutsTotal,
      finalizedPayoutsTotal,
      claimableCommission,
      conversionRate,
      monthlyTarget,
      targetAchievedPercent,
      tier,
      nextTierVal,
      progressToNext
    };
  });

  // Calculate global summary (Respects user filters)
  const totalSalesVolume = salesInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const realizedSalesVolume = salesInvoices
    .filter(inv => inv.status === 'Lunas')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalPotentialCommission = salesInvoices.reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);
  const totalRealizedCommission = salesInvoices
    .filter(inv => inv.status === 'Lunas')
    .reduce((sum, inv) => sum + (inv.commissionAmount || 0), 0);

  const totalFinalizedPayouts = payouts
    .filter(p => p.status === 'Selesai')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalUnclaimedCommission = Math.max(0, totalRealizedCommission - payouts.reduce((sum, p) => p.status !== 'Ditolak' ? sum + p.amount : sum, 0));

  // Find Leader / Sales Champion of the month
  const champion = agentSummaries.length > 0 
    ? [...agentSummaries].sort((a, b) => b.paidTotal - a.paidTotal)[0]
    : null;

  // Filter commissions ledger
  const filteredInvoices = salesInvoices.filter(inv => {
    const matchSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.salesName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchAgent = agentFilter === 'all' || inv.salesId === agentFilter;

    const isLunas = inv.status === 'Lunas';
    const matchStatus = 
      commissionStatusFilter === 'realized' ? isLunas :
      commissionStatusFilter === 'potential' ? !isLunas : true;

    return matchSearch && matchAgent && matchStatus;
  });

  // 2. Action Handlers
  const handleOnboardSales = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalesName || !newSalesEmail) {
      alert('Nama dan Email wajib diisi!');
      return;
    }

    try {
      const { register } = useBilling();
      if (register) {
        await register(newSalesEmail, 'sales123password', newSalesName, 'Sales');
      } else {
        throw new Error('Metode registrasi tidak tersedia di runtime.');
      }
      setShowAddSalesModal(false);
      setNewSalesName('');
      setNewSalesEmail('');
    } catch (err: any) {
      console.error(err);
      alert('Gagal onboarding sales: ' + (err.message || 'Error occurred'));
    }
  };

  const handleSetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAgentId || !targetAmountVal) {
      alert('Mohon pilih agen sales dan ketik besaran target!');
      return;
    }

    const agent = salesAgents.find(u => (u.userId || u.id) === targetAgentId);
    if (!agent) return;

    try {
      await updateSalesTarget(targetAgentId, agent.name, currentMonth, parseFloat(targetAmountVal));
      setShowTargetModal(false);
      setTargetAgentId('');
      setTargetAmountVal('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const myId = currentUser.userId || currentUser.id;
    const mySummary = agentSummaries.find(a => a.userId === myId);
    
    if (!mySummary) {
      alert('Error: Data personal Anda tidak terdeteksi sebagai sales.');
      return;
    }

    const amount = parseFloat(payoutAmountVal);
    if (isNaN(amount) || amount <= 0) {
      alert('Jumlah pencairan harus berupa angka positif!');
      return;
    }

    if (amount > mySummary.claimableCommission) {
      alert(`Batas dana tersisa Anda adalah Rp ${mySummary.claimableCommission.toLocaleString('id-ID')}. Anda tidak dapat menarik melebihi dana tersebut.`);
      return;
    }

    try {
      await addPayoutRequest({
        salesId: myId,
        salesName: currentUser.name,
        amount,
        paymentMethod: payoutMethod,
        bankAccount: payoutBankAccount,
        notes: payoutNotes
      });
      setShowPayoutModal(false);
      setPayoutAmountVal('');
      setPayoutBankAccount('');
      setPayoutNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleProcessPayoutAction = async (id: string, status: PayoutStatus) => {
    try {
      await updatePayoutStatus(id, status, processNotes);
      setProcessingPayoutId(null);
      setProcessNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Nomor Invoice,Tanggal Terbit,Pelanggan,Agen Sales,Rate (%),Nominal Komisi,Status Jurnal\n';
    const csvRows = filteredInvoices.map(inv => {
      const isLunas = inv.status === 'Lunas';
      return `"${inv.invoiceNumber}","${inv.invoiceDate}","${inv.customerName.replace(/"/g, '""')}","${(inv.salesName || 'Tanpa Nama').replace(/"/g, '""')}","${inv.commissionRate ?? 0}","${inv.commissionAmount ?? 0}","${isLunas ? 'Cair (Lunas)' : 'Potensi'}"`;
    });
    const blob = new Blob([headers + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Forsdig-Laporan-Komisi-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine role-based view limits
  const isManagement = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin Keuangan';
  const myId = currentUser?.userId || currentUser?.id;
  const myAgentSummary = agentSummaries.find(a => a.userId === myId);

  return (
    <div className="space-y-6" id="optimized-sales-comms-module">
      
      {/* Page header and tab triggers */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-150 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-[#D32F2F]" />
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Performa Penjualan & Komisi Elektronik</h2>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Manajemen pencapaian omzet, insentif komisi multilevel, pengajuan tarikan dana secara aman.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'performance' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Kinerja & Target Tim
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all relative ${
                activeTab === 'payouts' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>Pencairan Dana</span>
              {isManagement && payouts.filter(p => p.status === 'Diajukan').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white">
                  {payouts.filter(p => p.status === 'Diajukan').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'ledger' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Jurnal Komisi
            </button>
          </div>

          {/* Quick action buttons based on Roles */}
          <div className="flex gap-1.5">
            {isManagement ? (
              <>
                <button
                  onClick={() => setShowTargetModal(true)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Sliders size={13} />
                  <span>Setel Target</span>
                </button>
                <button
                  onClick={() => setShowAddSalesModal(true)}
                  className="px-3.5 py-1.5 bg-[#D32F2F] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow shadow-red-950/10"
                >
                  <UserPlus size={13} />
                  <span>Onboard Sales</span>
                </button>
              </>
            ) : (
              myAgentSummary && (
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Wallet size={13} />
                  <span>Tarik Komisi (Rp {myAgentSummary.claimableCommission.toLocaleString('id-ID')})</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* KPI dashboard widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="comms-enhanced-widgets">
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Omset Bersama</span>
            <span className="text-lg font-black text-slate-800 leading-none block">
              Rp {totalSalesVolume.toLocaleString('id-ID')}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold block">Dari invoices ber-agen sales</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-650 rounded-xl">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Omset Berhasil Lunas</span>
            <span className="text-lg font-black text-emerald-600 leading-none block">
              Rp {realizedSalesVolume.toLocaleString('id-ID')}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] text-slate-400 font-semibold">Tingkat Penagihan:</span>
              <span className="text-[9px] text-emerald-600 font-black">
                {totalSalesVolume > 0 ? `${((realizedSalesVolume / totalSalesVolume) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-650 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Hak Komisi (Earned)</span>
            <span className="text-lg font-black text-slate-800 block">
              Rp {totalRealizedCommission.toLocaleString('id-ID')}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold block">Dari seluruh invoice terbayar</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Percent size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Komisi Belum Cair</span>
            <span className="text-lg font-black text-[#D32F2F] block">
              Rp {totalUnclaimedCommission.toLocaleString('id-ID')}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] text-slate-400 font-semibold">Telah Ditransfer:</span>
              <span className="text-[9px] text-emerald-600 font-black">Rp {totalFinalizedPayouts.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Award size={20} />
          </div>
        </div>
      </div>

      {/* Conditional Tabs render container */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          
          {/* Champion of the month and personal goal center */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sales leader of the month card */}
            <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-lg">
              <div className="absolute right-0 top-0 translate-y-1/10 translate-x-1/15 opacity-10 blur-xs">
                <Medal size={240} className="text-yellow-400" />
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full border border-white/15 w-fit">
                  <Flame size={12} className="text-amber-400 animate-pulse" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-amber-200">Agen Sales Unggulan</span>
                </div>

                {champion && champion.paidTotal > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">SALES CHAMPION BULAN INI</p>
                    <h3 className="text-xl font-black">{champion.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold">{champion.email}</p>
                    
                    <div className="pt-4 grid grid-cols-2 gap-4 border-t border-white/10 mt-4">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Volume Realisasi</span>
                        <span className="text-sm font-extrabold text-amber-300">
                          Rp {champion.paidTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold uppercase">Komisi Dicairkan</span>
                        <span className="text-sm font-extrabold text-emerald-400">
                          Rp {champion.realizedCommission.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 py-6">Belum ada omset penjualan terbayar bulan ini.</h3>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/5 relative z-10 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-mono">FORSDIG MOTIVATION ENGINE</span>
                <span className="bg-red-650 text-white px-2 py-0.5 rounded-md font-bold tracking-wider font-sans uppercase">Enterprise ERP</span>
              </div>
            </div>

            {/* General instruction & Tier Info */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 mb-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <span>Insentif Multilevel & Sistem Penilaian Kinerja</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Sistem komisi disetarakan berdasarkan total akumulasi pembayaran lunas yang diperoleh sales agent. 
                  Semakin besar performa realisasi penjualan, semakin tinggi tingkatan yang didapatkan guna komisi yang lebih besar pada invoice berikutnya.
                </p>

                {/* Tier benchmarks cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-5">
                  <div className="p-3 bg-amber-50/20 border border-amber-100 rounded-xl relative overflow-hidden">
                    <span className="text-[8px] uppercase font-black text-amber-600 tracking-wider">BRONZE LEVEL</span>
                    <p className="text-lg font-black text-slate-700 mt-1">2.5% - 5%</p>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Sales &lt; Rp 10 Jt</span>
                  </div>
                  <div className="p-3 bg-zinc-50/30 border border-zinc-200 rounded-xl">
                    <span className="text-[8px] uppercase font-black text-zinc-500 tracking-wider">SILVER LEVEL</span>
                    <p className="text-lg font-black text-slate-700 mt-1">5% - 7.5%</p>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Sales Rp 10 Jt - Rp 50 Jt</span>
                  </div>
                  <div className="p-3 bg-yellow-50/20 border border-yellow-250 rounded-xl">
                    <span className="text-[8px] uppercase font-black text-yellow-600 tracking-wider">GOLD LEVEL</span>
                    <p className="text-lg font-black text-slate-700 mt-1">7.5% - 10%</p>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Sales Rp 100 Jt+</span>
                  </div>
                  <div className="p-3 bg-blue-50/15 border border-blue-150 rounded-xl">
                    <span className="text-[8px] uppercase font-black text-blue-600 tracking-wider">PLATINUM LEVEL</span>
                    <p className="text-lg font-black text-slate-700 mt-1">10% - 15%</p>
                    <span className="text-[9px] text-slate-400 block font-semibold mt-0.5">Sales &gt; Rp 150 Jt</span>
                  </div>
                </div>
              </div>

              {/* Personal level progress render if logged in as search/sales */}
              {!isManagement && myAgentSummary && (
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-1">
                      <span>Tingkat Insentif Anda:</span>
                      <span className="px-2 py-0.5 text-[9px] bg-red-50 text-red-700 rounded-md uppercase font-black tracking-wide">
                        {myAgentSummary.tier}
                      </span>
                    </div>
                    {myAgentSummary.tier !== 'Platinum' && (
                      <span className="text-slate-400">
                        Butuh Rp {(myAgentSummary.nextTierVal - myAgentSummary.paidTotal).toLocaleString('id-ID')} ke Level Selanjutnya
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#D32F2F] h-full rounded-full transition-all duration-300"
                      style={{ width: `${myAgentSummary.progressToNext}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Leaders Board Classification Table */}
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
            <h3 className="font-extrabold text-slate-900 text-sm pb-4 border-b border-indigo-50 flex items-center justify-between">
              <span>Rincian Penjualan & Progress Target Bulanan ({currentMonth})</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-lg font-bold">
                {agentSummaries.length} Anggota Tim
              </span>
            </h3>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-450 border-b border-indigo-50 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4 rounded-l-xl">Nama Agen</th>
                    <th className="p-4 text-center">Inv Aktif</th>
                    <th className="p-4 text-right">Potensi Volume</th>
                    <th className="p-4 text-right">Volume Terbayar (Akurasi)</th>
                    <th className="p-4 text-right text-red-700">Akumulasi Komisi</th>
                    <th className="p-4 text-right">Progress Target ({currentMonth})</th>
                    <th className="p-4 rounded-r-xl text-center">Tingkatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {agentSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-12 text-slate-400 font-semibold text-xs">
                        Belum ada Tim dengan peran Sales/marketing terdaftar.
                      </td>
                    </tr>
                  ) : (
                    agentSummaries.map((agent, i) => {
                      const isMe = agent.userId === myId;
                      return (
                        <tr key={i} className={`hover:bg-slate-50/55 transition duration-150 ${isMe ? 'bg-red-50/20' : ''}`}>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border flex items-center justify-center font-bold text-slate-650">
                                {agent.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                  <span>{agent.name}</span>
                                  {isMe && <span className="px-1 py-0.5 text-[7px] bg-[#D32F2F] text-white rounded uppercase font-black leading-none">Saya</span>}
                                </div>
                                <div className="text-[10px] text-slate-450 font-medium mt-0.5">{agent.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center font-bold text-slate-700">
                            {agent.invoiceCount}
                          </td>
                          <td className="p-4 text-right font-bold text-slate-800">
                            Rp {agent.invoicedTotal.toLocaleString('id-ID')}
                          </td>
                          <td className="p-4 text-right">
                            <div className="font-black text-emerald-600">
                              Rp {agent.paidTotal.toLocaleString('id-ID')}
                            </div>
                            <div className="text-[9px] text-slate-405 font-bold">
                              Conversion: {agent.conversionRate.toFixed(1)}%
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="font-black text-[#D32F2F]">
                              Rp {agent.realizedCommission.toLocaleString('id-ID')}
                            </div>
                            <div className="text-[8px] text-slate-450">
                              Claimable: <b className="text-emerald-700">Rp {agent.claimableCommission.toLocaleString('id-ID')}</b>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {agent.monthlyTarget > 0 ? (
                              <div className="space-y-1 w-40 ml-auto">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-slate-500">Target: Rp {agent.monthlyTarget.toLocaleString('id-ID')}</span>
                                  <span className="text-[#D32F2F]">{agent.targetAchievedPercent.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-red-500 h-full rounded-full" 
                                    style={{ width: `${Math.min(100, agent.targetAchievedPercent)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Target Belum Ditentukan</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] tracking-wider uppercase ${
                              agent.tier === 'Platinum' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              agent.tier === 'Gold' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                              agent.tier === 'Silver' ? 'bg-slate-100 text-slate-600' :
                              'bg-amber-50/45 text-amber-800'
                            }`}>
                              {agent.tier}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Action form on Left (Dynamic based on your role) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Wallet Balance Board */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow">
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">KOMISI TERSEDIA DICAIRKAN</span>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black">
                    Rp {isManagement 
                      ? totalUnclaimedCommission.toLocaleString('id-ID')
                      : (myAgentSummary?.claimableCommission || 0).toLocaleString('id-ID')
                    }
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {isManagement 
                      ? 'Total gabungan sisa dana komisi agen yang terutang'
                      : 'Komisi Anda dari invoice lunas terbayar yang belum ditarik'
                    }
                  </p>
                </div>
              </div>

              {!isManagement && myAgentSummary && myAgentSummary.claimableCommission > 0 && (
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Wallet size={14} />
                  <span>Ajukan Penarikan Sekarang</span>
                </button>
              )}
            </div>

            {/* Instruction / Rules Box */}
            <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 mb-2">
                <AlertCircle className="text-indigo-600" size={14} />
                <span>Ketentuan S&K Tarikan Komisi</span>
              </h4>
              <ul className="text-[11px] text-slate-500 space-y-2 list-disc pl-4 font-medium leading-relaxed">
                <li>Komisi hanya berstatus <b>Cair/Eligible</b> jika Invoice ber-salesId dirubah status pembayarannya menjadi <b>Lunas</b>.</li>
                <li>Ajukan klaim melalui modal tarikan untuk nominal berapapun di bawah limit tersedia.</li>
                <li>Super Admin atau Admin Keuangan berkewajiban mentransfer dan memperbarui status tarikan menjadi <b>Selesai</b>.</li>
                <li>Setiap transaksi mutasi dicatat dalam log logistik audit secara riil demi transparansi legal korporat.</li>
              </ul>
            </div>
          </div>

          {/* Commissions payout request logs table */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm pb-3 border-b border-slate-100 flex items-center justify-between">
                <span>Daftar Mutasi Penarikan / Payouts Komisi</span>
                <span className="text-[10px] bg-indigo-50 border text-indigo-700 font-bold px-2.5 py-0.5 rounded-lg uppercase">
                  {payouts.length} Total Tarikan
                </span>
              </h3>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-450 border-b border-indigo-50 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4 rounded-l-lg">Nomor No</th>
                      <th className="p-4">Agen Sales</th>
                      <th className="p-4 text-right">Jumlah Tarik</th>
                      <th className="p-4 text-center font-bold">Metode / Detail</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 rounded-r-lg text-center">Aksi Manajemen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-12 text-slate-400 font-semibold">
                          Belum ada aktivitas mutasi penarikan komisi.
                        </td>
                      </tr>
                    ) : (
                      payouts.map((pay) => {
                        const canManagePayout = isManagement && pay.status === 'Diajukan';
                        return (
                          <tr key={pay.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-4 font-mono font-bold text-[#D32F2F]">
                              {pay.payoutNumber}
                              <span className="block text-[8px] text-slate-400 font-sans mt-0.5">{pay.requestedAt}</span>
                            </td>
                            <td className="p-4 font-bold text-slate-750">
                              {pay.salesName}
                            </td>
                            <td className="p-4 text-right font-black text-slate-800">
                              Rp {pay.amount.toLocaleString('id-ID')}
                            </td>
                            <td className="p-4 text-center">
                              <span className="font-semibold text-slate-700 block">{pay.paymentMethod}</span>
                              {pay.bankAccount && <span className="text-[9px] font-mono text-slate-400 block">{pay.bankAccount}</span>}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black border uppercase ${
                                pay.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                pay.status === 'Diproses' ? 'bg-blue-50 text-blue-700 border-blue-105' :
                                pay.status === 'Diajukan' ? 'bg-amber-50 text-amber-700 border-amber-105' :
                                'bg-red-50 text-red-700 border-red-105'
                              }`}>
                                {pay.status}
                              </span>
                              {pay.notes && (
                                <span className="block text-[8px] text-slate-400 max-w-[120px] truncate mx-auto mt-0.5" title={pay.notes}>
                                  Ket: {pay.notes}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {canManagePayout ? (
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => handleProcessPayoutAction(pay.id, 'Selesai')}
                                    className="p-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-100 transition mr-1 cursor-pointer"
                                    title="Selesaikan Transfer & Selesaikan"
                                  >
                                    <Check size={11} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt('Masukkan alasan penolakan:');
                                      if (reason !== null) {
                                        updatePayoutStatus(pay.id, 'Ditolak', reason);
                                      }
                                    }}
                                    className="p-1 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition cursor-pointer"
                                    title="Tolak Pengajuan"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold italic">Not available</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col">
          
          {/* Sub-ledger toolbar triggers */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Calendar size={16} className="text-slate-400" />
              <span>Buku Pembesar Komisi per Invoice Organisasi</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter by Agency list */}
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="text-[11px] border border-slate-200 outline-none p-2 rounded-xl bg-slate-50 font-bold text-slate-650 cursor-pointer"
              >
                <option value="all">Semua Agen Sales</option>
                {salesAgents.map(a => (
                  <option key={a.id} value={a.userId || a.id}>{a.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={commissionStatusFilter}
                onChange={(e) => setCommissionStatusFilter(e.target.value as any)}
                className="text-[11px] border border-slate-200 outline-none p-2 rounded-xl bg-slate-50 font-bold text-slate-650 cursor-pointer"
              >
                <option value="all">Semua Status Jurnal</option>
                <option value="realized">Terealisasi (Cair)</option>
                <option value="potential">Potensi Berjalan</option>
              </select>

              {/* CSV Export */}
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] border rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Download size={12} />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Large Ledger Table listing */}
          <div className="mt-4 relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Cari Agen, Invoice, atau Pelanggan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-150 rounded-xl outline-none focus:border-[#D32F2F] placeholder-slate-450"
            />
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-450 border-b border-indigo-50 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 rounded-l-lg">Nomor Invoice</th>
                  <th className="p-4">Tanggal Terbit</th>
                  <th className="p-4">Pelanggan</th>
                  <th className="p-4">Agen Sales</th>
                  <th className="p-4 text-right">Invoice Brutto</th>
                  <th className="p-4 text-center">Insentif Rate</th>
                  <th className="p-4 rounded-r-lg text-right text-red-700">Komisi Bersih</th>
                  <th className="p-4 text-center font-bold">Status Jurnal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-12 text-slate-400 font-semibold">
                      Tidak ditemukan log komisi invoice yang memenuhi kriteria pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const isLunas = inv.status === 'Lunas';
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-mono font-bold text-slate-800">
                          #{inv.invoiceNumber}
                        </td>
                        <td className="p-4 font-semibold text-slate-500">
                          {inv.invoiceDate}
                        </td>
                        <td className="p-4 font-bold text-slate-700">
                          {inv.customerName}
                        </td>
                        <td className="p-4 font-bold text-slate-650">
                          {inv.salesName || 'Tanpa Nama'}
                        </td>
                        <td className="p-4 text-right font-semibold text-slate-750">
                          Rp {inv.total.toLocaleString()}
                        </td>
                        <td className="p-4 text-center font-black text-indigo-750">
                          {inv.commissionRate ?? 0}%
                        </td>
                        <td className="p-4 text-right font-black text-[#D32F2F]">
                          Rp {(inv.commissionAmount ?? 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 text-[8px] font-black rounded-md uppercase border ${
                            isLunas 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-105'
                          }`}>
                            {isLunas ? 'Cair (Lunas)' : 'Potensi (Berjalan)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboarding New Sales Modal */}
      {showAddSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setShowAddSalesModal(false)} />
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-150">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-indigo-50">
              <UserCheck size={18} className="text-[#D32F2F]" />
              <span>Registrasi Agen Sales Baru</span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 leading-relaxed mt-2.5">
              Masukkan nama lengkap dan email sales baru. Akun baru didaftarkan ke sistem dengan kata sandi bawaan <strong className="text-[#D32F2F]">sales123password</strong>.
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

      {/* Target Setting Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setShowTargetModal(false)} />
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-150">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-indigo-50">
              <Sliders size={18} className="text-[#D32F2F]" />
              <span>Atur Target Bulanan Agen</span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-404 mt-2 mb-4">
              Pilih agen sales dan masukkan nominal target omset penjualan lunas yang diharapkan tercapai pada periode <b>{currentMonth}</b>.
            </p>
            <form onSubmit={handleSetTarget} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Agen Sales</label>
                <select
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 bg-white cursor-pointer"
                >
                  <option value="">-- Pilih Agen --</option>
                  {salesAgents.map(a => (
                    <option key={a.id} value={a.userId || a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Omset Lunas (Rupiah)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 50000000"
                  value={targetAmountVal}
                  onChange={(e) => setTargetAmountVal(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D32F2F] hover:bg-red-700 text-white text-xs font-black rounded-xl transition"
                >
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Submission Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={() => setShowPayoutModal(false)} />
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-150">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 pb-3 border-b border-indigo-50">
              <Wallet size={18} className="text-emerald-600" />
              <span>Pengajuan Penarikan Komisi</span>
            </h3>
            {myAgentSummary && (
              <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 mt-2 text-[11px] text-emerald-800 font-bold flex justify-between">
                <span>Maksimum Tarik:</span>
                <span>Rp {myAgentSummary.claimableCommission.toLocaleString('id-ID')}</span>
              </div>
            )}
            <form onSubmit={handleRequestPayout} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nominal yang Ditarik (IDR)</label>
                <input
                  type="number"
                  required
                  placeholder="Contoh: 1500000"
                  value={payoutAmountVal}
                  onChange={(e) => setPayoutAmountVal(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Metode Penerimaan</label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-emerald-500 bg-white"
                >
                  <option value="Transfer Bank">Transfer Bank (Manual)</option>
                  <option value="GoPay">Dana Digital GoPay</option>
                  <option value="OVO">Dana Digital OVO</option>
                  <option value="Cash">Cash / Kas Tunai</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Detail Rekening / No E-Wallet</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank BCA 80455xxx a.n Budi"
                  value={payoutBankAccount}
                  onChange={(e) => setPayoutBankAccount(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan keperluan tarikan"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-emerald-500 font-sans"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow"
                >
                  Kirim Pengajuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
