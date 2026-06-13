import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Calendar, FileText, Download, Printer, Percent, BarChart3, TrendingUp, DollarSign, ShieldCheck, FileSpreadsheet, Users, ChevronDown, CheckCircle, HelpCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportProfitLossToPDF, exportTaxReportToPDF } from '../utils/pdfGenerator';

export const ReportView: React.FC = () => {
  const { invoices, expenses, payments, cashAccounts, customers, settings } = useBilling();
  
  const [activeReportTab, setActiveReportTab] = useState<'rugilaba' | 'penjualan' | 'expenses' | 'pajak'>('rugilaba');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // States for tax compliance calculation
  const [taxBasis, setTaxBasis] = useState<'accrual' | 'cash'>('accrual');
  const [ppnRate, setPpnRate] = useState<number>(11);
  const [pphRate, setPphRate] = useState<number>(2);
  const [reportedMonths, setReportedMonths] = useState<Record<string, 'Draft' | 'Siap Lapor' | 'Sudah Dilaporkan'>>({});

  // Math filtering
  const filteredInvoices = invoices.filter(i => i.invoiceDate >= startDate && i.invoiceDate <= endDate);
  const filteredExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
  const filteredPayments = payments.filter(p => p.paymentDate >= startDate && p.paymentDate <= endDate && p.isValidated);

  // Profit Loss Metrics
  const revenueTotal = filteredInvoices.reduce((sum, i) => sum + i.total, 0);
  const revenueReceived = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const expenseTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netEarnings = revenueTotal - expenseTotal;

  // Paid/partially paid invoices based on date filters for tax calculations
  const paidInvoices = filteredInvoices.filter(
    i => i.paidAmount > 0 || i.status === 'Lunas' || i.status === 'Sebagian Dibayar'
  );

  const taxCalculations = paidInvoices.map(i => {
    // If taxBasis is accrual: Base DPP is either subtotal (minus discount) or total / (1 + PPN) if subtotal is zero
    const dpp = taxBasis === 'accrual'
      ? (i.subtotal ? (i.subtotal - (i.discount || 0)) : (i.total / (1 + ppnRate/100)))
      : (i.paidAmount / (1 + ppnRate/100));
    
    // PPN is DPP * ppnRate%
    const ppn = dpp * (ppnRate / 100);
    // PPh 23 is DPP * pphRate%
    const pph = dpp * (pphRate / 100);

    return {
      invoice: i,
      dpp,
      ppn,
      pph
    };
  });

  const totalTaxDPP = taxCalculations.reduce((sum, item) => sum + item.dpp, 0);
  const totalTaxPPN = taxCalculations.reduce((sum, item) => sum + item.ppn, 0);
  const totalTaxPPh = taxCalculations.reduce((sum, item) => sum + item.pph, 0);

  const getMonthYearString = (dateStr: string) => {
    if (!dateStr) return 'Masa Lainnya';
    const parts = dateStr.split('-');
    if (parts.length < 2) return 'Masa Lainnya';
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNames[monthIdx]} ${year}`;
    }
    return dateStr;
  };

  const sptMasaSummary = React.useMemo(() => {
    const monthlyMap: Record<string, {
      monthKey: string;
      monthLabel: string;
      invoicesCount: number;
      dppSum: number;
      ppnSum: number;
      pphSum: number;
    }> = {};

    taxCalculations.forEach(item => {
      const dateStr = item.invoice.invoiceDate;
      if (!dateStr) return;
      const key = dateStr.substring(0, 7); // "YYYY-MM"
      const label = getMonthYearString(dateStr);

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          monthKey: key,
          monthLabel: label,
          invoicesCount: 0,
          dppSum: 0,
          ppnSum: 0,
          pphSum: 0
        };
      }

      monthlyMap[key].invoicesCount += 1;
      monthlyMap[key].dppSum += item.dpp;
      monthlyMap[key].ppnSum += item.ppn;
      monthlyMap[key].pphSum += item.pph;
    });

    return Object.values(monthlyMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [taxCalculations, taxBasis, ppnRate, pphRate]);

  const handleExportPDF = () => {
    if (activeReportTab === 'pajak') {
      exportTaxReportToPDF(
        startDate,
        endDate,
        ppnRate,
        pphRate,
        taxBasis,
        totalTaxDPP,
        totalTaxPPN,
        totalTaxPPh,
        taxCalculations,
        sptMasaSummary,
        settings
      );
    } else {
      exportProfitLossToPDF(
        startDate,
        endDate,
        revenueTotal,
        revenueReceived,
        expenseTotal,
        netEarnings,
        categoriesSum(filteredExpenses),
        settings
      );
    }
  };

  // Monthly breakdown mock/compiled lists
  const monthlyData = [
    { name: 'Jan', sales: revenueTotal * 0.1, expenses: expenseTotal * 0.08 },
    { name: 'Feb', sales: revenueTotal * 0.12, expenses: expenseTotal * 0.1 },
    { name: 'Mar', sales: revenueTotal * 0.11, expenses: expenseTotal * 0.09 },
    { name: 'Apr', sales: revenueTotal * 0.15, expenses: expenseTotal * 0.12 },
    { name: 'May', sales: revenueTotal * 0.18, expenses: expenseTotal * 0.15 },
    { name: 'Jun', sales: revenueTotal * 0.24, expenses: expenseTotal * 0.18 },
  ];

  // Excel or CSV reporting & customer database download
  const handleExportData = (format: 'xlsx' | 'csv', type: 'report' | 'customers') => {
    let rawData: any[] = [];
    let fileName = '';

    if (type === 'customers') {
      fileName = 'Daftar_Pelanggan';
      rawData = (customers || []).map(c => ({
        'ID Pelanggan': c.customerId,
        'Nama Klien': c.name,
        'Nama Perusahaan': c.company,
        'Alamat': c.address,
        'Kota': c.city,
        'Provinsi': c.province,
        'No Telepon': c.phone,
        'Email': c.email,
        'NPWP': c.npwp || '-',
        'Status': c.status || 'Aktif',
        'Catatan': c.notes || '-',
        'Tanggal Dibuat': c.createdAt
      }));
    } else {
      // Type is report
      if (activeReportTab === 'rugilaba') {
        fileName = 'Laporan_Rugi_Laba';
        rawData = [
          { Parameter: 'Total Pendapatan Ter-Invoice (Sales)', Akumulasi: revenueTotal },
          { Parameter: 'Total Beban Pengeluaran Operasional (Expenses)', Akumulasi: expenseTotal },
          { Parameter: 'Net Profit / Rugi Laba Usaha Bersih', Akumulasi: netEarnings },
          { Parameter: 'Realisasi Kas Masuk (Actual Receipts)', Akumulasi: revenueReceived },
          ...categoriesSum(filteredExpenses).map(item => ({
            Parameter: `Beban: ${item.category}`,
            Akumulasi: item.amount
          }))
        ];
      } else if (activeReportTab === 'penjualan') {
        fileName = 'Buku_Penjualan';
        rawData = filteredInvoices.map(i => ({
          'Nomor Invoice': i.invoiceNumber,
          'Pelanggan': i.customerName,
          'Tanggal': i.invoiceDate,
          'Jatuh Tempo': i.dueDate,
          'Terbayar': i.paidAmount,
          'Sisa Tagihan': i.total - i.paidAmount,
          'Total Tagihan': i.total,
          'Status': i.status
        }));
      } else if (activeReportTab === 'pajak') {
        fileName = 'Laporan_Kepatuhan_Pajak';
        rawData = taxCalculations.map(item => ({
          'Nomor Invoice': item.invoice.invoiceNumber,
          'Pelanggan': item.invoice.customerName,
          'Tanggal Invoice': item.invoice.invoiceDate,
          'Total Tagihan': item.invoice.total,
          'Total Terbayar': item.invoice.paidAmount,
          'Dasar Pengenaan Pajak (DPP)': Math.round(item.dpp),
          'PPN Terutang': Math.round(item.ppn),
          'PPh 23 Dipotong': Math.round(item.pph),
          'Status Invoice': item.invoice.status
        }));
      } else {
        fileName = 'Buku_Pengeluaran';
        rawData = filteredExpenses.map(e => ({
          'Nomor Transaksi': e.expenseNumber,
          'Penerima Dana': e.vendor,
          'Kategori': e.category,
          'Tanggal': e.date,
          'Deskripsi': e.description,
          'Total Pengeluaran': e.amount
        }));
      }
    }

    if (rawData.length === 0) {
      alert('Tidak ada data yang tersedia untuk diekspor pada filter ini.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rawData);
    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit_Data');
      XLSX.writeFile(wb, `FORSDIG_Billing_${fileName}_${startDate}_sd_${endDate}.xlsx`);
    } else {
      const csvContent = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FORSDIG_Billing_${fileName}_${startDate}_sd_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setExportDropdownOpen(false);
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
            onClick={handleExportPDF}
            className="p-1 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-slate-950/10 transition hover:scale-[1.02] active:scale-[0.98]"
            id="export-pdf-direct-btn"
          >
            <FileText size={13} className="text-red-400" />
            <span>Ekspor ke PDF</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="p-1 px-3 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-100/50 transition-all border border-transparent"
              id="export-dropdown-toggle-btn"
            >
              <Download size={13} />
              <span>Ekspor Data Audit</span>
              <ChevronDown size={11} className={`transform transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {exportDropdownOpen && (
              <>
                {/* Backdrop dummy to dismiss */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setExportDropdownOpen(false)} 
                />
                
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-150 shadow-2xl py-2 z-20 text-xs text-slate-705 animate-scale-up">
                  <div className="px-3 py-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 mb-1">
                    Laporan Keuangan ({activeReportTab === 'rugilaba' ? 'Statement' : activeReportTab === 'penjualan' ? 'Penjualan' : 'Beban'})
                  </div>
                  <button 
                    onClick={() => handleExportData('xlsx', 'report')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 font-bold cursor-pointer text-slate-700 hover:text-red-600 transition"
                    id="export-active-xlsx"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-600" />
                    <span>Format Excel (.XLSX)</span>
                  </button>
                  <button 
                    onClick={() => handleExportData('csv', 'report')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 font-bold cursor-pointer text-slate-705 hover:text-slate-900 transition"
                    id="export-active-csv"
                  >
                    <FileText size={13} className="text-slate-500" />
                    <span>Format CSV (.CSV)</span>
                  </button>
                  <button 
                    onClick={() => {
                      handleExportPDF();
                      setExportDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 font-bold cursor-pointer text-slate-700 hover:text-red-650 transition border-t border-slate-100/50"
                    id="export-active-pdf"
                  >
                    <FileText size={13} className="text-red-600" />
                    <span>Format Dokumen PDF (.PDF)</span>
                  </button>

                  <div className="my-1.5 border-t border-slate-100" />

                  <div className="px-3 py-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 mb-1">
                    Database Pelanggan
                  </div>
                  <button 
                    onClick={() => handleExportData('xlsx', 'customers')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 font-bold cursor-pointer text-slate-700 hover:text-red-705 transition"
                    id="export-cust-xlsx"
                  >
                    <Users size={13} className="text-blue-600" />
                    <span>Format Excel (.XLSX)</span>
                  </button>
                  <button 
                    onClick={() => handleExportData('csv', 'customers')}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center space-x-2 font-bold cursor-pointer text-slate-705 hover:text-slate-900 transition"
                    id="export-cust-csv"
                  >
                    <FileText size={13} className="text-slate-500" />
                    <span>Format CSV (.CSV)</span>
                  </button>
                  
                  <div className="my-1.5 border-t border-slate-100" />
                  
                  <div className="px-3 py-1 bg-slate-50 text-[9px] text-slate-400 flex items-center space-x-1 font-bold rounded-b-xl border-t border-slate-100">
                    <ShieldCheck size={11} className="text-emerald-500" />
                    <span>Terotentikasi & Siap Audit</span>
                  </div>
                </div>
              </>
            )}
          </div>
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
        <button 
          onClick={() => setActiveReportTab('pajak')}
          className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeReportTab === 'pajak' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="tab-report-tax"
        >
          Kepatuhan Pajak (VAT & Income Tax)
        </button>
      </div>

      {activeReportTab === 'rugilaba' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Rugi laba statement Card and lines */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-150 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>Rugi-Laba Periodik</span>
                  <button 
                    onClick={handleExportPDF}
                    className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-[#D32F2F] rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition border border-red-200/40"
                    title="Unduh Laporan Laba Rugi PDF"
                    id="export-pdf-statement-btn"
                  >
                    <FileText size={11} />
                    <span>Ekspor ke PDF</span>
                  </button>
                </span>
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

      {activeReportTab === 'pajak' && (
        <div className="space-y-6" id="tax-compliance-module">
          
          {/* Configuration Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm border border-slate-750 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full inline-block">
                Tax Compliance Automated Engine
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Percent size={18} className="text-red-400" />
                <span>Otomasi Kepatuhan Pajak (PPN & PPh 23)</span>
              </h3>
              <p className="text-xs text-red-200/80 font-medium max-w-xl">
                Menghitung PPN Masukan/Keluaran dan PPh Pasal 23 secara otomatis dari seluruh bilyet invoice terbayar (Lunas/Sebagian) pada periode yang dipilih.
              </p>
            </div>

            {/* Inputs & Configurations */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="block text-slate-300 text-[10px] font-bold uppercase tracking-wider">Basis Pengakuan</label>
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-750">
                  <button
                    onClick={() => setTaxBasis('accrual')}
                    type="button"
                    className={`px-3 py-1 bg-transparent rounded-md text-[11px] font-black cursor-pointer transition ${taxBasis === 'accrual' ? 'bg-red-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Akrual (Invoice)
                  </button>
                  <button
                    onClick={() => setTaxBasis('cash')}
                    type="button"
                    className={`px-3 py-1 bg-transparent rounded-md text-[11px] font-black cursor-pointer transition ${taxBasis === 'cash' ? 'bg-red-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Kas (Realisasi)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 w-16">
                <label className="block text-slate-300 text-[10px] font-bold uppercase tracking-wider">Tarif PPN</label>
                <div className="relative">
                  <input
                    type="number"
                    value={ppnRate}
                    onChange={(e) => setPpnRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-1 px-2 rounded-lg font-bold focus:outline-none focus:border-red-500"
                  />
                  <span className="absolute right-2 top-1.5 text-slate-400 text-[10px]">%</span>
                </div>
              </div>

              <div className="space-y-1.5 w-16">
                <label className="block text-slate-300 text-[10px] font-bold uppercase tracking-wider">Tarif PPh 23</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pphRate}
                    onChange={(e) => setPphRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-1 px-2 rounded-lg font-bold focus:outline-none focus:border-red-500"
                  />
                  <span className="absolute right-2 top-1.5 text-slate-400 text-[10px]">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-150 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Invoice Pajak</span>
                <span className="text-slate-400 font-bold block mt-0.5 text-[10px]">({paidInvoices.length} Faktur)</span>
                <h3 className="text-xl font-black text-slate-950 mt-2">
                  Rp {paidInvoices.reduce((sum, i) => sum + i.paidAmount, 0).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-3">Jumlah total kas/nominal yang tercatat lunas atau terbayar sebagian.</p>
            </div>

            <div className="bg-white border border-slate-150 p-5 rounded-2xl flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Dasar Pengenaan (DPP)</span>
                <span className="text-slate-400 font-bold block mt-0.5 text-[10px]">({taxBasis === 'accrual' ? 'Nilai Pokok Invoice' : 'Pokok Kas Diterima'})</span>
                <h3 className="text-xl font-black text-slate-950 mt-2">
                  Rp {Math.round(totalTaxDPP).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-3">Jumlah nilai pokok transaksi setelah dikurangi diskon sebelum ditambah beban pajak.</p>
            </div>

            <div className="bg-white border border-slate-150 p-5 rounded-2xl flex flex-col justify-between shadow-sm border-l-4 border-l-red-500">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-red-650">PPN Terutang ({ppnRate}%)</span>
                <span className="text-slate-400 font-bold block mt-0.5 text-[10px]">(Pajak Keluaran Terestimasi)</span>
                <h3 className="text-xl font-black text-red-700 mt-2">
                  Rp {Math.round(totalTaxPPN).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-3">Estimasi Pajak Pertambahan Nilai yang wajib dipungut dari pihak pelanggan.</p>
            </div>

            <div className="bg-white border border-slate-150 p-5 rounded-2xl flex flex-col justify-between shadow-sm border-l-4 border-l-emerald-500">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-emerald-700">Estimasi PPh 23 ({pphRate}%)</span>
                <span className="text-slate-400 font-bold block mt-0.5 text-[10px]">(Pajak Jasa & Sewa Alat)</span>
                <h3 className="text-xl font-black text-emerald-705 mt-2">
                  Rp {Math.round(totalTaxPPh).toLocaleString()}
                </h3>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-3">Estimasi Pajak Penghasilan Pasal 23 yang dipotong jasa sewa oleh pelanggan.</p>
            </div>
          </div>

          {/* SPT Masa Summary Section */}
          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileText className="text-red-650" size={16} />
                  <span>Ringkasan SPT Masa Pajak (e-Faktur Portal Ready)</span>
                </h4>
                <p className="text-[10px] text-slate-500 font-medium font-semibold">Buku laporan bulanan masa pajak yang teragregasi secara otomatis siap salin ke djp online.</p>
              </div>

              {/* CSV Export All */}
              <button
                onClick={() => {
                  let csvStr = "Masa Pajak;Jumlah Transaksi;Total DPP;Total PPN;Total PPh 23;Status\n";
                  sptMasaSummary.forEach(row => {
                    csvStr += `"${row.monthLabel}";${row.invoicesCount};${Math.round(row.dppSum)};${Math.round(row.ppnSum)};${Math.round(row.pphSum)};"${reportedMonths[row.monthKey] || 'Draft'}"\n`;
                  });
                  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `FORSDIG_Ringkasan_SPT_Masa_${startDate}_sd_${endDate}.csv`;
                  link.click();
                }}
                className="p-1 px-3 border border-slate-200 hover:bg-slate-50 text-slate-705 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <Download size={12} className="text-slate-500" />
                <span>Unduh Semua SPT (.CSV)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-650">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-3">Masa Pajak (Bulan)</th>
                    <th className="px-4 py-3">Jumlah Transaksi</th>
                    <th className="px-4 py-3">Total Dasar Pengenaan (DPP)</th>
                    <th className="px-4 py-3">PPN Terutang ({ppnRate}%)</th>
                    <th className="px-4 py-3">PPh 23 Dipotong ({pphRate}%)</th>
                    <th className="px-4 py-3">Status SPT</th>
                    <th className="px-4 py-3 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                  {sptMasaSummary.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-bold whitespace-nowrap">
                        <HelpCircle className="mx-auto text-slate-300 mb-2" size={24} />
                        Tidak ada masa pajak terpakai pada rentang tanggal filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    sptMasaSummary.map(row => {
                      const currentStatus = reportedMonths[row.monthKey] || 'Draft';
                      return (
                        <tr key={row.monthKey} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-900">{row.monthLabel}</td>
                          <td className="px-4 py-3 text-slate-500">{row.invoicesCount} Faktur Terbayar</td>
                          <td className="px-4 py-3 text-slate-900 font-bold">Rp {Math.round(row.dppSum).toLocaleString()}</td>
                          <td className="px-4 py-3 text-red-600 font-bold">Rp {Math.round(row.ppnSum).toLocaleString()}</td>
                          <td className="px-4 py-3 text-emerald-700 font-bold">Rp {Math.round(row.pphSum).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <select
                              value={currentStatus}
                              onChange={(e) => {
                                setReportedMonths(prev => ({
                                  ...prev,
                                  [row.monthKey]: e.target.value as any
                                }));
                              }}
                              className={`text-[10px] font-bold py-0.5 px-2 rounded-full border border-slate-200 cursor-pointer focus:outline-none transition-colors ${
                                currentStatus === 'Sudah Dilaporkan'
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : currentStatus === 'Siap Lapor'
                                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              <option value="Draft">Draft SPT</option>
                              <option value="Siap Lapor">Siap Lapor</option>
                              <option value="Sudah Dilaporkan">Sudah Dilapor ✓</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                // CSV specific DJP format download for this month
                                const monthInvoices = taxCalculations.filter(tc => tc.invoice.invoiceDate.substring(0, 7) === row.monthKey);
                                let csvStr = "FPM;NPWP_REKANAN;NAMA_REKANAN;NOMOR_FAKTUR;TANGGAL_FAKTUR;MASA_PAJAK;TAHUN_PAJAK;DPP;PPN;PPH\n";
                                monthInvoices.forEach(item => {
                                  csvStr += `FPA;""";"${item.invoice.customerName}";"${item.invoice.invoiceNumber}";"${item.invoice.invoiceDate}";"${row.monthKey.split('-')[1]}";"${row.monthKey.split('-')[0]}";${Math.round(item.dpp)};${Math.round(item.ppn)};${Math.round(item.pph)}\n`;
                                });
                                const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvStr], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `EFaktur_DJP_Masa_${row.monthKey}.csv`;
                                link.click();
                              }}
                              className="p-1 px-2.5 bg-red-50 hover:bg-red-100 text-[#D32F2F] rounded-lg text-[10px] font-black inline-flex items-center gap-1 cursor-pointer transition border border-red-200/40"
                              title="Ekspor CSV lampiran untuk DJP online"
                            >
                              <FileSpreadsheet size={11} />
                              <span>Unduh e-Faktur CSV</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed component breakdown table */}
          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 overflow-hidden">
            <h4 className="font-bold text-slate-900 text-sm mb-4">Rincian Perhitungan Komponen Pajak per Faktur Terbayar</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold border-b border-slate-150">
                  <tr>
                    <th className="px-4 py-3">Faktur Invoice</th>
                    <th className="px-4 py-3">Nama Pelanggan</th>
                    <th className="px-4 py-3">Tgl Terbit</th>
                    <th className="px-4 py-3">Total Invoice</th>
                    <th className="px-4 py-3">Gross Terbayar</th>
                    <th className="px-4 py-3">pokok DPP</th>
                    <th className="px-4 py-3">PPN ({ppnRate}%)</th>
                    <th className="px-4 py-3">PPh 23 ({pphRate}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                  {taxCalculations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-bold">
                        Tidak ada invoice berstatus Lunas / Sebagian Terbayar pada periode filter ini.
                      </td>
                    </tr>
                  ) : (
                    taxCalculations.map((item) => (
                      <tr key={item.invoice.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.invoice.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-800">{item.invoice.customerName}</td>
                        <td className="px-4 py-3 text-slate-500">{item.invoice.invoiceDate}</td>
                        <td className="px-4 py-3 text-slate-950 font-bold">Rp {item.invoice.total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-700 font-bold">Rp {item.invoice.paidAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-950 font-bold bg-slate-50/30">Rp {Math.round(item.dpp).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-600 font-bold">Rp {Math.round(item.ppn).toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-800 font-bold">Rp {Math.round(item.pph).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
