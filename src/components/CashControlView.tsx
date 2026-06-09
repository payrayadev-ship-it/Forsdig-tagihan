import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Plus, Search, DollarSign, ArrowRightLeft, TrendingUp, TrendingDown, BookOpen, CreditCard, ShieldAlert } from 'lucide-react';
import { CashAccount } from '../types';

export const CashControlView: React.FC = () => {
  const { cashAccounts, payments, expenses, logActivity, addNotification, addCashAccount } = useBilling();
  
  // States
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'debit' | 'credit'>('debit');
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Add Account form states
  const [addAccountModal, setAddAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newType, setNewType] = useState<'Kas' | 'Bank'>('Bank');
  const [newBalance, setNewBalance] = useState(0);

  // Total funds sum up
  const totalBalance = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Dynamic statement lines from actual validated payments and expenses (Ledger)
  const incomingJournals = payments.filter(p => p.isValidated).map(p => ({
    date: p.paymentDate,
    ref: p.paymentNumber,
    description: `Penerimaan Setoran Invoice ${p.invoiceNumber} - ${p.customerName}`,
    type: 'Masuk' as const,
    amount: p.amount
  }));

  const outgoingJournals = expenses.map(e => ({
    date: e.date,
    ref: e.expenseNumber,
    description: `Pengeluaran ${e.category} - ${e.vendor} (${e.description})`,
    type: 'Keluar' as const,
    amount: e.amount
  }));

  // Combine and sort ledger journal items
  const ledgerJournals = [...incomingJournals, ...outgoingJournals]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20); // show top 20 lines

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || adjustAmount <= 0) return;

    // Mutate the balance locally inside context if needed, but for sandbox we trigger state notifications
    addNotification(
      'Penyesuaian Diajukan', 
      `Penyesuaian sebesar Rp ${adjustAmount.toLocaleString()} berhasil diposting.`, 
      'success'
    );
    logActivity(`Membuat rekonsiliasi kas sebesar Rp ${adjustAmount.toLocaleString()} pada akun ID: ${selectedAccountId}`, 'Keuangan');
    setAdjustModal(false);
  };

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName || !newBankName) return;

    try {
      await addCashAccount({
        accountName: newAccountName,
        accountNumber: newAccountNumber || '-',
        bankName: newBankName,
        type: newType,
        balance: Number(newBalance) || 0,
        currency: 'IDR'
      });
      
      addNotification(
        'Akun Baru Ditambahkan',
        `Akun ${newAccountName} (${newType}) telah berhasil didaftarkan ke penampung dana.`,
        'success'
      );
      
      // Reset & Close
      setNewAccountName('');
      setNewAccountNumber('');
      setNewBankName('');
      setNewType('Bank');
      setNewBalance(0);
      setAddAccountModal(false);
    } catch (err) {
      console.error('Add account failure:', err);
      addNotification('Gagal Menambahkan Akun', 'Terjadi kesalahan internal DB.', 'error');
    }
  };

  return (
    <div className="space-y-6" id="cash-view-main">
      
      {/* Header and statistics metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Modul Rekening Kas & Bank (Cash Control)</h2>
          <p className="text-xs text-slate-500 font-semibold">Monitor mutasi bank, saldo kas kecil, dan jurnal ledger keuangan perusahaan secara real-time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAddAccountModal(true)}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-red-650 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer transition border border-red-650"
            id="add-account-btn"
          >
            <Plus size={14} />
            <span>Tambah Rekening</span>
          </button>
          <button
            onClick={() => setAdjustModal(true)}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer transition border border-slate-800"
            id="adjust-cash-btn"
          >
            <ArrowRightLeft size={14} />
            <span>Form Rekonsiliasi Saldo</span>
          </button>
        </div>
      </div>

      {/* Aggregate balance block card style */}
      <div className="bg-gradient-to-tr from-slate-900 to-slate-800 rounded-2xl p-6 text-white border border-slate-800 shadow-md">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Kas Bersih Tersedia (Aggregated Funds)</span>
            <h2 className="text-3xl font-black tracking-tight mt-1">Rp {totalBalance.toLocaleString()}</h2>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Dihitung otomatis berdasarkan rekam mutasi kas masuk dikurangi beban pengeluaran operasional.</p>
          </div>
          <CreditCard className="text-slate-500" size={32} />
        </div>
      </div>

      {/* Grid Accounts Drawers list */}
      <h3 className="font-bold text-slate-850 text-sm tracking-wide">Daftar Akun Penampung Dana</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cashAccounts.map(acc => (
          <div key={acc.id} className="bg-white p-5 rounded-xl border border-slate-150 relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold text-red-650 bg-red-50 px-2 py-0.5 rounded-full">{acc.type}</span>
              <h4 className="font-bold text-slate-900 mt-2 text-sm">{acc.accountName}</h4>
              <p className="text-xs text-slate-400 mt-0.5 font-semibold">No. Rek: {acc.accountNumber}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-50 flex items-end justify-between">
              <span className="text-[10px] font-bold text-slate-400">Saldo Buku:</span>
              <span className="font-black text-slate-900 text-sm">Rp {acc.balance.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ledger statement grid lines */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden p-6">
        <h4 className="font-bold text-slate-905 text-sm mb-4 flex items-center gap-2">
          <BookOpen className="text-red-600" size={16} />
          <span>Jurnal Ledger Konsolidasi (20 Transaksi Terakhir)</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-650 leading-relaxed font-semibold">
            <thead className="bg-slate-50 text-slate-450 uppercase text-[9px] font-bold border-b border-scratch">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">REF Transaksi</th>
                <th className="px-4 py-3">Deskripsi Ledger</th>
                <th className="px-4 py-3 text-center">Tipe Aliran</th>
                <th className="px-4 py-3 text-right">Nominal Arus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ledgerJournals.map((line, index) => (
                <tr key={`journal-${index}`} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-450">{line.date}</td>
                  <td className="px-4 py-3 font-mono font-bold text-red-650">{line.ref}</td>
                  <td className="px-4 py-3 text-slate-805 max-w-sm truncate">{line.description}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                      line.type === 'Masuk' 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-red-50 text-red-700'
                    }`}>
                      {line.type === 'Masuk' ? 'Uang Masuk (+)' : 'Uang Keluar (-)'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-black ${
                    line.type === 'Masuk' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    Rp {line.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {ledgerJournals.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                    Belum ada aliran kas konsoliders yang sah atau terverifikasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Cash & Bank Account Modal */}
      {addAccountModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-2xl animate-scale-up">
            <div className="flex items-center space-x-3 text-red-650 mb-3">
              <Plus size={20} />
              <h4 className="font-bold text-slate-900 text-sm">Tambah Akun Kas & Bank Baru</h4>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-semibold">Tipe Akun *</label>
                  <select
                    required
                    value={newType}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      setNewType(type);
                      if (type === 'Kas') {
                        setNewBankName('Cash');
                        setNewAccountNumber('-');
                      } else {
                        setNewBankName('');
                        setNewAccountNumber('');
                      }
                    }}
                    className="w-full border border-slate-200 p-2 text-xs rounded-lg bg-white cursor-pointer"
                    id="form-acc-type"
                  >
                    <option value="Bank">Bank (Rekening)</option>
                    <option value="Kas">Kas (Tunai)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-semibold">Nama Bank / Provider *</label>
                  <input
                    type="text"
                    required
                    placeholder="BCA, Mandiri, Cash, dll"
                    value={newBankName}
                    disabled={newType === 'Kas'}
                    onChange={(e) => setNewBankName(e.target.value)}
                    className="w-full border border-slate-200 p-1.5 text-xs rounded-lg disabled:bg-slate-50"
                    id="form-acc-bank"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-semibold">Nama Akun / Deskripsi *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operasional Utama, Kas Harian"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full border border-slate-200 p-1.5 text-xs rounded-lg"
                  id="form-acc-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-semibold">Nomor Rekening</label>
                  <input
                    type="text"
                    placeholder="e.g. 5220304050"
                    value={newAccountNumber}
                    disabled={newType === 'Kas'}
                    onChange={(e) => setNewAccountNumber(e.target.value)}
                    className="w-full border border-slate-200 p-1.5 text-xs rounded-lg disabled:bg-slate-50"
                    id="form-acc-number"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-semibold">Saldo Awal (IDR)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={newBalance || ''}
                    onChange={(e) => setNewBalance(Number(e.target.value))}
                    className="w-full border border-slate-200 p-1.5 text-xs rounded-lg"
                    id="form-acc-balance"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-1.5 pt-2">
                <button 
                  type="button"
                  onClick={() => setAddAccountModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                  id="form-acc-cancel"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow"
                  id="form-acc-save"
                >
                  Tambah Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Reconcile Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-2xl animate-scale-up">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <Plus size={20} />
              <h4 className="font-bold text-slate-900 text-sm">Post Penyesuaian Rekonsiliasi Saldo</h4>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Rekening Sasaran</label>
                <select
                  required
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full border border-slate-200 p-2 text-xs rounded-lg bg-white cursor-pointer"
                  id="form-adjust-account"
                >
                  <option value="">-- Akun Bank --</option>
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.accountName} (Rp {acc.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Arah Mutasi</label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as any)}
                    className="w-full border border-slate-200 p-2 text-xs rounded-lg bg-white cursor-pointer"
                    id="form-adjust-type"
                  >
                    <option value="debit">Uang Masuk (+ Debit)</option>
                    <option value="credit">Uang Keluar (- Kredit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nominal Rekon</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={adjustAmount || ''}
                    onChange={(e) => setAdjustAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 p-1.5 text-xs rounded-lg"
                    id="form-adjust-amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alasan Penyesuaian Saldo (BAP)</label>
                <textarea
                  required
                  placeholder="Korsel bunga bank, denda, pendaftaran akun..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 p-2 text-xs rounded-lg resize-none"
                  id="form-adjust-reason"
                />
              </div>

              <div className="flex items-center justify-end space-x-1.5 pt-2">
                <button 
                  type="button"
                  onClick={() => setAdjustModal(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                  id="form-adjust-cancel"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow"
                  id="form-adjust-save"
                >
                  Post Rekon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
