import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Calendar, FileText, Download, Printer, Percent, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ReportView: React.FC = () => {
  const { invoices, expenses, payments, cashAccounts } = useBilling();
  
  const [activeReportTab, setActiveReportTab] = useState<'rugilaba' | 'penjualan' | 'expenses'>('rugilaba');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  // Math filtering
  const filteredInvoices = invoices.filter(i => i.invoiceDate >= startDate && i.invoiceDate <= endDate);
  const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
  const filteredPayments = payments.filter(p => p.paymentDate >= startDate && p.paymentDate <= endDate && p.isValidated);

  // Profit Loss Metrics
  const revenueTotal = filteredInvoices.reduce((sum, i) => sum + i.total, 0);
  const revenueReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const expenseTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = revenueTotal - expenseTotal;

  // Monthly breakdown mock/compiled lists
  const monthlyData = [
    { name: 'Jan', sales: revenueTotal * 0.1, expenses: expenseTotal * 0.08 },
    { name: 'Feb', sales: revenueTotal * 0.12, expenses: expenseTotal * 0.1 },
    { name: 'Mar', sales: revenueTotal * 0.11, expenses: expenseTotal * 0.09 },
    { name: 'Apr', sales: revenueTotal * 0.15, expenses: expenseTotal * 0.12 },
    { name: 'May', sales: revenueTotal * 0.18, expenses: expenseTotal * 0.15 },
    { name: 'Jun', sales: revenueTotal * 0.24, expenses: expenseTotal * 0.18 },
  ];

  // Excel reporting download
  const handleExportReportExcel = () => {
    let rawData: any[] = [];
    let reportName = 'Laporan';

    if (activeReportTab === 'rugilaba') {
      reportName = 'Laporan_Rugi_Laba';
      rawData = [
        { Parameter: 'Total Pendapatan Ter-Invoice (Sales)', Akumulasi: revenueTotal },
        { Parameter: 'Total Beban Pengeluaran Operasional (Expenses)', Akumulasi: expenseTotal },
        { Parameter: 'Net Profit / Rugi Laba Usaha Bersih', Akumulasi: netEarnings },
        { Parameter: 'Realisasi Kas Masuk (Actual Receipts)', Akumulasi: revenueReceived },
      ];
    } else if (activeReportTab === 'penjualan') {
      reportName = 'Buku_Penjualan';
      rawData = filteredInvoices.map(i => ({
        'Nomor Invoice': i.invoiceNumber,
        'Pelanggan': i.customerName,
        'Tanggal': i.invoiceDate,
        'Sisa Tagihan': i.total - i.paidAmount,
        'Total': i.total,
        'Status': i.status
      }));
    } else {
      reportName = 'Buku_Pengeluaran';
      rawData = filteredExpenses.map(e => ({
        'Nomor Transaksi': e.expenseNumber,
        'Vendor': e.vendor,
        'Kategori': e.category,
        'Tanggal': e.date,
        'Deskripsi': e.description,
        'Total Pengeluaran': e.amount
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rawData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `FORSDIG_Billing_${reportName}.xlsx`);
  };

  return (
    <div className="space-y-6" id="reports-view-main">
      
      {/* Top action header and date filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Modul Laporan Keuangan (Financial Reporting)</h2>
          <p className="text-xs text-slate-500 font-semibold">Lihat rasio profitabilitas, realisasi buku kas rugi laba bersih, neraca piutang, dan unduh rekonsiliasi excel.</p>
        </div>

        {/* Date Filters block */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 border border-slate-205 bg-white px-2 py-1 rounded-xl text-xs font-semibold text-slate-650">
            <span>Dari:</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="outline-none cursor-pointer p-0.5 bg-transparent font-bold text-slate-900"
            />
          </div>
          <div className="flex items-center space-x-1 border border-slate-205 bg-white px-2 py-1 rounded-xl text-xs font-semibold text-slate-650">
            <span>Sampai:</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="outline-none cursor-pointer p-0.5 bg-transparent font-bold text-slate-900"
            />
          </div>
          
          <button 
            onClick={handleExportReportExcel}
            className="p-1 px-3 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-black"
            id="export-report-btn"
          >
            <Download size={13} />
            <span>Ekspor</span>
          </button>
        </div>
      </div>

      {/* Subtabs selectors */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setActiveReportTab('rugilaba')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'rugilaba' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="tab-report-pl"
        >
          Laporan Rugi Laba (Income Statement)
        </button>
        <button 
          onClick={() => setActiveReportTab('penjualan')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'penjualan' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="tab-report-sales"
        >
          Rincian Transaksi Penjualan
        </button>
        <button 
          onClick={() => setActiveReportTab('expenses')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'expenses' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="tab-report-expense"
        >
          Buku Beban Pengeluaran
        </button>
      </div>

      {activeReportTab === 'rugilaba' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Rugi laba statement Card and lines */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Rugi-Laba Periodik</span>
                <span className="text-[10px] text-slate-400">IDR - Akrual</span>
              </h3>

              <div className="space-y-3 font-semibold text-xs text-slate-705">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">1. Pendapatan Penjualan kotor</span>
                  <span className="font-bold text-slate-900">Rp {revenueTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">2. Diskon & Penyesuaian Harga</span>
                  <span className="text-emerald-600 font-bold">- Rp 0</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-50 bg-slate-50/50 px-2 rounded">
                  <span className="text-slate-800 font-bold">Total Pendapatan Bersih (Revenue)</span>
                  <span className="font-black text-slate-950">Rp {revenueTotal.toLocaleString()}</span>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-red-650 uppercase tracking-widest block mb-1">Beban Operasional usaha:</span>
                  {categoriesSum(filteredExpenses).map(item => (
                    <div key={item.category} className="flex justify-between items-center py-1.5 border-b border-slate-50 pl-4">
                      <span className="text-slate-500 font-semibold">{item.category}</span>
                      <span>Rp {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center py-2.5 bg-slate-100 text-slate-900 px-3 rounded-lg border border-slate-200 mt-4">
                  <span className="font-extrabold text-sm text-slate-900">Laba Bersih Sebelum Pajak (Net Income)</span>
                  <span className={`font-black text-base ${netEarnings >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    Rp {netEarnings.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick summary cards for PL */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-150 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Margin Laba Usaha</span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  {revenueTotal > 0 ? `${Math.round((netEarnings / revenueTotal) * 100)}%` : '0%'}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-3">Persentase Laba bersih yang dihasilkan dari total billing catalog yang terbit.</p>
            </div>

            <div className="bg-white border border-slate-150 p-5 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold text-slate-450">Kolektibilitas Piutang (Cash Ratio)</span>
                <h3 className="text-2xl font-black text-red-655 mt-2">
                  {revenueTotal > 0 ? `${Math.round((revenueReceived / revenueTotal) * 100)}%` : '0%'}
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-3">Rasio pemenuhan pelunasan tunai terhadap keseluruhan total tagihan diterbitkan.</p>
            </div>
          </div>

          {/* SVG Trend Comparison Chart */}
          <div className="lg:col-span-3 bg-white border border-slate-150 rounded-2xl p-6">
            <h4 className="font-bold text-slate-950 text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <BarChart3 size={15} className="text-red-600" />
              <span>Analisa Komparasi Bulanan: Penjualan vs Pengeluaran</span>
            </h4>

            {/* Custom SVG Bar Chart */}
            <div className="w-full h-64 mt-4 font-mono text-[10px]">
              <svg viewBox="0 0 600 220" className="w-full h-full">
                {/* Horizontal grid lines */}
                <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="60" x2="580" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="100" x2="580" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="140" x2="580" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="180" x2="580" y2="180" stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Left labels for balance scale */}
                <text x="5" y="24" fill="#94a3b8">200jt</text>
                <text x="5" y="64" fill="#94a3b8">150jt</text>
                <text x="5" y="104" fill="#94a3b8">100jt</text>
                <text x="5" y="144" fill="#94a3b8">50jt</text>
                <text x="15" y="184" fill="#94a3b8">0</text>

                {/* Bars looping */}
                {monthlyData.map((d, idx) => {
                  const xBase = 60 + idx * 85;
                  // normalizers for heights
                  const scale = 0.8;
                  const salesHeight = Math.max(8, d.sales / 100000);
                  const expHeight = Math.max(5, d.expenses / 100000);

                  return (
                    <g key={d.name}>
                      {/* Revenue Bar */}
                      <rect 
                        x={xBase} 
                        y={180 - salesHeight} 
                        width="24" 
                        height={salesHeight} 
                        fill="#b91c1c" 
                        rx="3" 
                        className="transition hover:opacity-85 cursor-pointer"
                      />
                      {/* Expense Bar */}
                      <rect 
                        x={xBase + 28} 
                        y={180 - expHeight} 
                        width="24" 
                        height={expHeight} 
                        fill="#cbd5e1" 
                        rx="3" 
                        className="transition hover:opacity-85 cursor-pointer"
                      />
                      {/* Name Label */}
                      <text x={xBase + 16} y="202" fill="#64748b" textAnchor="middle" className="font-bold">{d.name}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="flex items-center justify-center space-x-6 pt-2 select-none border-t border-slate-100">
                <span className="flex items-center space-x-1.5 text-xs text-slate-600 font-bold">
                  <span className="w-3 h-3 bg-red-700 rounded-sm inline-block"></span>
                  <span>Total Penjualan Kotor</span>
                </span>
                <span className="flex items-center space-x-1.5 text-xs text-slate-600 font-bold">
                  <span className="w-3 h-3 bg-slate-300 rounded-sm inline-block"></span>
                  <span>Beban Operasional Usaha</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'penjualan' && (
        <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden p-6">
          <h4 className="font-bold text-slate-900 text-sm mb-4">Mutasi Penjualan Periodik</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold border-b border-slate-150">
                <tr>
                  <th className="px-4 py-3">No Invoice</th>
                  <th className="px-4 py-3">Nama Klien</th>
                  <th className="px-4 py-3">Tanggal Terbit</th>
                  <th className="px-4 py-3">Sisa Piutang</th>
                  <th className="px-4 py-3">Total Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                {filteredInvoices.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{i.invoiceNumber}</td>
                    <td className="px-4 py-3">{i.customerName}</td>
                    <td className="px-4 py-3">{i.invoiceDate}</td>
                    <td className="px-4 py-3 text-red-600">Rp {(i.total - i.paidAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-950">Rp {i.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReportTab === 'expenses' && (
        <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden p-6">
          <h4 className="font-bold text-slate-900 text-sm mb-4">Arsip Buku Pengeluaran Operasional</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold border-b border-slate-150">
                <tr>
                  <th className="px-4 py-3">No Transaksi</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Penerima Dana</th>
                  <th className="px-4 py-3">Keterangan</th>
                  <th className="px-4 py-3 text-right">Nominal Pengeluaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{e.expenseNumber}</td>
                    <td className="px-4 py-3">{e.category}</td>
                    <td className="px-4 py-3">{e.vendor}</td>
                    <td className="px-4 py-3 max-w-sm truncate">{e.description}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-950">Rp {e.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

// Helper inside reporting
function categoriesSum(expList: any[]) {
  const sumObj: Record<string, number> = {};
  expList.forEach(e => {
    sumObj[e.category] = (sumObj[e.category] || 0) + e.amount;
  });
  return Object.keys(sumObj).map(category => ({
    category,
    amount: sumObj[category]
  }));
}
