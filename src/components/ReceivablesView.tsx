import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Search, AlertTriangle, Calendar, Phone, Mail, FileCheck, CheckCircle2, MessageSquare, Printer } from 'lucide-react';
import { Receivable } from '../types';

export const ReceivablesView: React.FC = () => {
  const { receivables, invoices, settings, addNotification, logActivity } = useBilling();
  const [search, setSearch] = useState('');
  const [agingFilter, setAgingFilter] = useState<string>('Semua');

  // Math totals
  const totalReceivable = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);
  const overdueReceivables = receivables.filter(r => {
    // Check if overdue: assuming current date is June 9, 2026. If invoice due date is < current date
    const today = new Date('2026-06-09');
    const due = new Date(r.dueDate);
    return due < today;
  });
  const totalOverdueAmount = overdueReceivables.reduce((sum, r) => sum + r.remainingAmount, 0);

  // Send WhatsApp Reminder
  const sendReminder = async (rec: Receivable) => {
    const formattedAmt = rec.remainingAmount.toLocaleString('id-ID');
    const message = `Yth. PIC Keuangan dari ${rec.customerName.split(' - ')[0]},\n\nKami mengingatkan kembali terkait tagihan Invoice *${rec.invoiceNumber}* yang telah jatuh tempo pada *${rec.dueDate}* dengan sisa pembayaran sebesar *Rp ${formattedAmt}*.\n\nHarap segera melakukan pelunasan ke rekening bank kami Mandiri **124-00-987654-3** a.n **FORSDIG Solusindo Utama**.\n\nTerima kasih atas kerja samanya.\n\nSalam,\nKolektor ${settings.companyName}`;
    
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    
    await logActivity(`Mengirimkan pengingat penagihan WhatsApp ke Klien ${rec.customerName.split(' - ')[0]}`, 'Piutang');
    await addNotification('Pengingat Terkirim', `Reminder otomatis terkirim untuk invoice ${rec.invoiceNumber}.`, 'success');
  };

  // Aging segments
  const getAgingCategory = (dueDateStr: string): string => {
    const today = new Date('2026-06-09');
    const due = new Date(dueDateStr);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Belum Jatuh Tempo';
    if (diffDays <= 30) return '1 - 30 Hari';
    if (diffDays <= 60) return '31 - 60 Hari';
    if (diffDays <= 90) return '61 - 90 Hari';
    return '> 90 Hari';
  };

  // Filtration logic
  const filteredReceivables = receivables.filter(rec => {
    const matchSearch = rec.customerName.toLowerCase().includes(search.toLowerCase()) || 
                        rec.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    
    const category = getAgingCategory(rec.dueDate);
    const matchAging = agingFilter === 'Semua' ? true : category === agingFilter;

    return matchSearch && matchAging;
  });

  return (
    <div className="space-y-6" id="receivables-view-main">
      
      {/* Header and Summary stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Penayangan Umur Piutang (Receivables Aging)</h2>
          <p className="text-xs text-slate-500 font-semibold">Pantau saldo piutang tertunggak, kategori penuaan jatuh tempo (aging schedule), dan follow-up penagihan.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center space-x-1.5 py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-705 border border-slate-250 text-xs font-semibold rounded-lg shadow-sm cursor-pointer no-print"
          id="print-ar-btn"
        >
          <Printer size={14} />
          <span>Cetak Daftar Piutang</span>
        </button>
      </div>

      {/* AR metrics boxes bento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Piutang Berjalan</span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">Rp {totalReceivable.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telah Jatuh Tempo</span>
            <h3 className="text-xl font-bold text-red-650 mt-1">Rp {totalOverdueAmount.toLocaleString()}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-650 rounded-xl">
            <AlertTriangle size={20} className="animate-pulse" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rasio Piutang Lancar</span>
            <h3 className="text-xl font-bold text-emerald-650 mt-1">
              {totalReceivable > 0 ? `${Math.round(((totalReceivable - totalOverdueAmount) / totalReceivable) * 100)}%` : '100%'}
            </h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-150 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow up Terjadwal</span>
            <h3 className="text-xl font-bold text-purple-900 mt-1">{overdueReceivables.length} Klien</h3>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <MessageSquare size={20} />
          </div>
        </div>
      </div>

      {/* Query filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari ID Invoice, Nama Perusahaan Debitur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            id="ar-search"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={agingFilter}
            onChange={(e) => setAgingFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer w-full md:w-48"
            id="ar-aging-filter"
          >
            <option value="Semua">Semua Struktur Umur</option>
            <option value="Belum Jatuh Tempo">Belum Jatuh Tempo</option>
            <option value="1 - 30 Hari">1 - 30 Hari (Lancar)</option>
            <option value="31 - 60 Hari">31 - 60 Hari (Perhatian)</option>
            <option value="61 - 90 Hari">61 - 90 Hari (Macet Ringan)</option>
            <option value="> 90 Hari">&gt; 90 Hari (Macet Total)</option>
          </select>
        </div>
      </div>

      {/* AR Table containing ledger sheets */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden" id="ar-print-area">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-150">
              <tr>
                <th className="px-6 py-4">Nama Pelanggan</th>
                <th className="px-6 py-4">Invoice Rujukan</th>
                <th className="px-6 py-4">Tenggat Waktu</th>
                <th className="px-6 py-4 text-center">Umur Piutang (Aging)</th>
                <th className="px-6 py-4">Dues Original</th>
                <th className="px-6 py-4">Sisa Tunggakan</th>
                <th className="px-6 py-4 text-right no-print">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {filteredReceivables.map(rec => {
                const agingCategory = getAgingCategory(rec.dueDate);
                return (
                  <tr key={rec.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{rec.customerName.split(' - ')[0]}</div>
                      <span className="text-[10px] text-slate-400 font-semibold">{rec.customerName.split(' - ')[1]}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-500">{rec.invoiceNumber}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{rec.dueDate}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold rounded-full ${
                        agingCategory === 'Belum Jatuh Tempo'
                          ? 'bg-emerald-50 text-emerald-700'
                          : agingCategory === '1 - 30 Hari'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700 border border-red-100 animate-pulse-light'
                      }`}>
                        {agingCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-400">Rp {rec.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-900">
                      Rp {rec.remainingAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right no-print">
                      <button
                        onClick={() => sendReminder(rec)}
                        className="inline-flex items-center space-x-1 py-1 px-2.5 bg-slate-900 hover:bg-black text-white text-[10px] font-bold rounded cursor-pointer transition border border-slate-850"
                        title="Kirim Catatan WA"
                        id={`remind-btn-${rec.id}`}
                      >
                        <Phone size={10} />
                        <span>Kirim Tagihan WA</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredReceivables.length === 0 && (
                <tr className="border-0">
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    Tidak ada piutang murni dalam aging schedule ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
