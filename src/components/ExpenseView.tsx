import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Plus, Trash, Search, DollarSign, Calendar, Upload, FileCheck, X, Sparkles, RefreshCw } from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';

export const ExpenseView: React.FC = () => {
  const { expenses, addExpense, deleteExpense, currentUser, addNotification } = useBilling();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form states
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('Operasional');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState('');
  const [attachmentMimeType, setAttachmentMimeType] = useState('image/jpeg');

  // AI Extraction states
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const categories: ExpenseCategory[] = ['Operasional', 'Gaji', 'Utilitas', 'Transportasi', 'Pajak', 'Lainnya'];

  const extractReceipt = async (base64Data: string, mimeType: string) => {
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionSuccess(false);

    try {
      const response = await fetch('/api/extract-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success && result.data) {
        const { vendor: extVendor, amount: extAmount, category: extCategory, description: extDescription, date: extDate } = result.data;

        if (extVendor) setVendor(extVendor);
        if (extAmount !== undefined) setAmount(Number(extAmount));
        if (extCategory && categories.includes(extCategory as any)) {
          setCategory(extCategory as any);
        }
        if (extDescription) setDescription(extDescription);
        if (extDate) setDate(extDate);

        setExtractionSuccess(true);
        if (addNotification) {
          addNotification(
            'Struk Sukses Dipindai',
            `Gemini AI otomatis mengekstrak ${extVendor || 'Vendor'} senilai Rp ${Number(extAmount || 0).toLocaleString('id-ID')}.`,
            'success'
          );
        }
      } else {
        throw new Error(result.error || 'Gagal mengekstrak data dari kuitansi.');
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      setExtractionError(err.message || 'Gagal terhubung ke modul AI asisten kuitansi.');
      if (addNotification) {
        addNotification(
          'Pindaian Mandiri Gagal',
          `Sistem gagal mendeteksi struk otomatis. Kolom dapat Anda isi manual: ${err.message || err}`,
          'info'
        );
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = String(reader.result);
      setAttachmentBase64(base64Data);
      
      // Auto-extract immediately upon file upload
      extractReceipt(base64Data, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCategory('Operasional');
    setVendor('');
    setAmount(0);
    setDescription('');
    setAttachmentBase64('');
    setAttachmentMimeType('image/jpeg');
    setIsExtracting(false);
    setExtractionSuccess(false);
    setExtractionError(null);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !vendor) return;

    try {
      await addExpense({
        date,
        category,
        vendor,
        amount: Number(amount),
        description,
        attachmentUrl: attachmentBase64
      });
      setDrawerOpen(false);
    } catch (err: any) {
      console.error("Gagal menambahkan pengeluaran:", err);
      let detailedError = "Maaf, terjadi kesalahan saat merekam kas pengeluaran operasional.";
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.error) {
            detailedError = `Gagal menyimpan ke Database: ${parsed.error} (${parsed.operationType.toUpperCase()} ${parsed.path || ''})`;
          } else {
            detailedError = `Gagal menyimpan: ${err.message}`;
          }
        } catch {
          detailedError = `Gagal menyimpan: ${err.message}`;
        }
      }
      alert(detailedError + "\n\nHarap periksa kecukupan saldo Kas/Bank atau status akun Anda.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini? Saldo kas akan dipulihkan secara otomatis.')) {
      await deleteExpense(id);
    }
  };

  // Filters Computations
  const filteredExpenses = expenses.filter(exp => {
    const matchSearch = exp.vendor.toLowerCase().includes(search.toLowerCase()) || 
                        exp.expenseNumber.toLowerCase().includes(search.toLowerCase()) || 
                        exp.description.toLowerCase().includes(search.toLowerCase());
    
    const matchCat = categoryFilter === 'Semua' ? true : exp.category === categoryFilter;

    return matchSearch && matchCat;
  });

  const isReadOnly = currentUser?.role === 'Viewer';

  return (
    <div className="space-y-6" id="expenses-view-main">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Modul Buku Pengeluaran Usaha (Expenses Log)</h2>
          <p className="text-xs text-slate-500 font-semibold">Catat pengeluaran operasional, pembayaran vendor, gaji pegawai, pendaftaran utilitas kantor, dan sinkronkan mutasi kas keluar.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenForm}
            className="flex items-center space-x-1.5 py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer transition"
            id="log-expense-btn"
          >
            <Plus size={15} />
            <span>Catat Pengeluaran</span>
          </button>
        )}
      </div>

      {/* Filter and Search row */}
      <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari TRX Pengeluaran, Vendor, Deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            id="expense-search"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer w-full md:w-48"
            id="expense-category-filter"
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-150">
              <tr>
                <th className="px-6 py-4">Nomor Transaksi</th>
                <th className="px-6 py-4">Kategori Pengeluaran</th>
                <th className="px-6 py-4">Vendor Penerima</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Nominal Bayar</th>
                <th className="px-6 py-4">Nota Lampiran</th>
                {!isReadOnly && <th className="px-6 py-4 text-right">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {filteredExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{exp.expenseNumber}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{exp.date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-150">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-805">{exp.vendor}</td>
                  <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{exp.description}</td>
                  <td className="px-6 py-4 font-extrabold text-slate-900">
                    Rp {exp.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {exp.attachmentUrl ? (
                      <a 
                        href={exp.attachmentUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-red-500 hover:underline flex items-center gap-1 font-bold"
                      >
                        <FileCheck size={12} />
                        <span>Kuitansi</span>
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  {!isReadOnly && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1 text-slate-400 hover:text-red-655 rounded hover:bg-slate-100 cursor-pointer"
                        title="Hapus"
                        id={`delete-exp-${exp.id}`}
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr className="border-0">
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    Belum ada pengeluaran dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slip Add Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-55 flex justify-end bg-black/50 overflow-hidden" id="expense-form-modal">
          <div className="w-full max-w-lg bg-white h-screen flex flex-col shadow-2xl relative animate-slide-left">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Registrasi Pengeluaran Baru</h3>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                id="close-expense-drawer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 cursor-pointer"
                    id="form-expense-date"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori Pengeluaran</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 bg-white cursor-pointer"
                    id="form-expense-category"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Penerima Dana (Vendor / Supplier) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PLN Persero, PT Indihome, CV Swadaya ATK"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                  id="form-expense-vendor"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nominal Biaya (IDR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full border border-slate-200 pl-9 pr-3 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none"
                    id="form-expense-amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unggah Struk Foto Kuitansi</label>
                <div className={`border border-dashed p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer relative hover:bg-slate-100 transition ${isExtracting ? 'border-red-400 bg-red-50/20' : 'border-slate-250 bg-slate-50'}`}>
                  {isExtracting ? (
                    <div className="flex flex-col items-center text-center">
                      <RefreshCw size={26} className="text-red-655 animate-spin mb-1.5" />
                      <span className="text-xs text-red-655 font-bold flex items-center gap-1">
                        <Sparkles size={13} className="animate-pulse text-red-500" />
                        Sedang Menganalisis dengan Gemini AI...
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">Mengekstrak Vendor, Nominal, Tanggal & Kategori...</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={22} className="text-slate-400 mb-1.5" />
                      <span className="text-xs text-slate-500 font-semibold text-center">Klik untuk memilih struk scan kuitansi</span>
                      <span className="text-[10px] text-slate-400 mt-1">Data nominal & vendor akan terisi otomatis</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isExtracting}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleFileUpload}
                    id="expense-file-input"
                  />
                </div>

                {attachmentBase64 && (
                  <div className="mt-2 space-y-1.5 col-span-2">
                    <div className="text-slate-700 text-xs font-medium flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1 text-emerald-850 font-bold">
                        <FileCheck size={14} className="text-emerald-600" />
                        <span>Kuitansi terlampir</span>
                      </div>
                      
                      {!isExtracting && (
                        <button
                          type="button"
                          onClick={() => extractReceipt(attachmentBase64, attachmentMimeType)}
                          className="flex items-center gap-1.5 text-[10px] py-1 px-2.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg border border-red-200 font-bold transition cursor-pointer"
                          title="Pindai ulang gambar terunggah menggunakan AI"
                        >
                          <RefreshCw size={11} />
                          <span>Pindai Ulang (AI)</span>
                        </button>
                      )}
                    </div>

                    {isExtracting && (
                      <div className="text-[10px] text-slate-500 animate-pulse flex items-center gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span>Mengirim gambar ke Gemini AI... mohon tunggu beberapa saat.</span>
                      </div>
                    )}

                    {extractionSuccess && (
                      <div className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-150 p-2 rounded-md font-medium flex items-center gap-1">
                        <Sparkles size={12} className="text-emerald-650 animate-bounce" />
                        <span>Data nominal, vendor, dan kriteria berhasil diisi otomatis oleh Gemini AI!</span>
                      </div>
                    )}

                    {extractionError && (
                      <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-150 p-2 rounded-md font-medium flex items-center gap-1">
                        <span>Pemberitahuan: {extractionError}. Silakan mengisi kolom manual atau coba lagi.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Keterangan / Deskripsi Operasional</label>
                <textarea
                  placeholder="Spesifikasi rincian pembayaran..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 resize-none"
                  id="form-expense-description"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  id="cancel-expense-btn"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                  id="save-expense-btn"
                >
                  Catatkan Transaksi
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
