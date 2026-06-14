import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Settings, Save, CheckCircle2, ShieldCheck, Mail, Building, QrCode, Upload, X, Database, Globe, Cloud, Sparkles, Percent, FileSpreadsheet, Download, Calendar, Loader2 } from 'lucide-react';

export const SettingView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    currentUser, 
    isDemoMode, 
    loginWithGoogle, 
    seedInitialData,
    invoices,
    payments,
    expenses
  } = useBilling();

  const [isSeedingCloud, setIsSeedingCloud] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [taxId, setTaxId] = useState(settings.taxId || '');
  const [currency, setCurrency] = useState(settings.currency || 'IDR');
  const [qrisUrl, setQrisUrl] = useState(settings.qrisUrl || '');

  // PPN & PPh states
  const [ppnEnabled, setPpnEnabled] = useState<boolean>(settings.ppnEnabled ?? true);
  const [ppnRate, setPpnRate] = useState<number>(settings.ppnRate ?? 11);
  const [pphEnabled, setPphEnabled] = useState<boolean>(settings.pphEnabled ?? false);
  const [pphRate, setPphRate] = useState<number>(settings.pphRate ?? 2);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      companyName,
      address,
      phone,
      email,
      taxId,
      currency,
      qrisUrl,
      ppnEnabled,
      ppnRate,
      pphEnabled,
      pphRate
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isReadOnly = currentUser?.role === 'Viewer';

  // Export CSV States
  const [exportType, setExportType] = useState<'invoices' | 'payments' | 'expenses' | 'all'>('invoices');
  const [exportMonth, setExportMonth] = useState<string>('Semua');
  const [exportYear, setExportYear] = useState<string>('2026');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const monthsList = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  const yearsList = Array.from(new Set([
    '2026',
    '2025',
    '2024',
    ...invoices.map(i => i.invoiceDate?.split('-')[0]),
    ...payments.map(p => p.paymentDate?.split('-')[0]),
    ...expenses.map(e => e.date?.split('-')[0])
  ].filter(Boolean))).sort((a,b) => b!.localeCompare(a!));

  const handleExportData = () => {
    // Helper to generic check date matching
    const matchesFilter = (dateString?: string) => {
      if (!dateString) return false;
      const [year, month] = dateString.split('-');
      const yearMatch = exportYear === 'Semua' || year === exportYear;
      const monthMatch = exportMonth === 'Semua' || month === exportMonth;
      return yearMatch && monthMatch;
    };

    const triggerDownload = (headers: string[], rows: string[][], filename: string) => {
      const csvStr = [
        headers.join(','),
        ...rows.map(r => r.map(v => {
          const clean = (v ?? '').toString().replace(/"/g, '""');
          return `"${clean}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    let count = 0;
    const timeSuffix = `${exportMonth !== 'Semua' ? monthsList.find(m => m.value === exportMonth)?.label : 'Semua-Bulan'}_${exportYear}`;

    if (exportType === 'invoices' || exportType === 'all') {
      const filtered = invoices.filter(inv => matchesFilter(inv.invoiceDate));
      if (filtered.length > 0) {
        const headers = ["Nomor Invoice", "Nama Pelanggan", "Tanggal Invoice", "Jatuh Tempo", "Subtotal", "Diskon", "PPN", "PPh 23", "Total Akhir", "Jumlah Dibayar", "Status", "Catatan"];
        const rows = filtered.map(inv => [
          inv.invoiceNumber,
          inv.customerName,
          inv.invoiceDate,
          inv.dueDate,
          inv.subtotal.toString(),
          inv.discount.toString(),
          (inv.ppnAmount ?? 0).toString(),
          (inv.pphAmount ?? 0).toString(),
          inv.total.toString(),
          inv.paidAmount.toString(),
          inv.status,
          inv.notes || ''
        ]);
        triggerDownload(headers, rows, `Laporan_Tagihan_${timeSuffix}.csv`);
        count += filtered.length;
      }
    }

    if (exportType === 'payments' || exportType === 'all') {
      const filtered = payments.filter(pay => matchesFilter(pay.paymentDate));
      if (filtered.length > 0) {
        const headers = ["Nomor Pembayaran", "Nomor Invoice", "Nama Pelanggan", "Tanggal Pembayaran", "Metode", "Jumlah Diterima", "Validasi", "Catatan"];
        const rows = filtered.map(pay => [
          pay.paymentNumber,
          pay.invoiceNumber,
          pay.customerName,
          pay.paymentDate,
          pay.paymentMethod,
          pay.amount.toString(),
          pay.isValidated ? 'TERVALIDASI' : 'PENDING',
          pay.notes || ''
        ]);
        triggerDownload(headers, rows, `Laporan_Pembayaran_Masuk_${timeSuffix}.csv`);
        count += filtered.length;
      }
    }

    if (exportType === 'expenses' || exportType === 'all') {
      const filtered = expenses.filter(exp => matchesFilter(exp.date));
      if (filtered.length > 0) {
        const headers = ["Nomor Pengeluaran", "Tanggal", "Kategori", "Vendor/Penerima", "Jumlah Pengeluaran", "Deskripsi"];
        const rows = filtered.map(exp => [
          exp.expenseNumber,
          exp.date,
          exp.category,
          exp.vendor,
          exp.amount.toString(),
          exp.description || ''
        ]);
        triggerDownload(headers, rows, `Laporan_Pengeluaran_Kas_${timeSuffix}.csv`);
        count += filtered.length;
      }
    }

    if (count > 0) {
      setExportFeedback(`✓ Berhasil mengekspor ${count} data transaksi bulanan ke file CSV.`);
      setTimeout(() => setExportFeedback(null), 5050);
    } else {
      setExportFeedback(`ℹ Tidak ditemukan data transaksi untuk periode bulan/tahun yang dipilih.`);
      setTimeout(() => setExportFeedback(null), 5050);
    }
  };

  return (
    <div className="max-w-2xl bg-white border border-slate-150 rounded-2xl p-6 shadow-sm" id="settings-view-main">
      <h3 className="font-bold text-slate-933 text-sm pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Pengaturan Instansi & Invoice Template</span>
        <Settings size={16} className="text-red-650 animate-spin-slow" />
      </h3>
      <p className="text-xs text-slate-500 font-semibold mt-1 mb-6 leading-normal">Ubah nama perusahaan, alamat surat menyurat, taging perpajakan, nomor NPWP instansi asal yang akan tampil pada lembar ekspor PDF / Print.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nama Instansi / Badan Usaha *</label>
            <input
              type="text"
              required
              disabled={isReadOnly}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400"
              id="settings-company-name"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">NPWP Badan Usaha</label>
            <input
              type="text"
              disabled={isReadOnly}
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400"
              id="settings-tax-id"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alamat Kantor Utama</label>
          <textarea
            disabled={isReadOnly}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 resize-none disabled:bg-slate-50 disabled:text-slate-400"
            id="settings-address"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">No. Kontak Perusahaan *</label>
            <input
              type="text"
              required
              disabled={isReadOnly}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400"
              id="settings-phone"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Resmi Penagihan *</label>
            <input
              type="email"
              required
              disabled={isReadOnly}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400"
              id="settings-email"
            />
          </div>
        </div>

        {/* Currency configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mata Uang Acuan</label>
            <select
              disabled={isReadOnly}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-slate-200 p-2.5 text-xs rounded-xl focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400 bg-white"
              id="settings-currency"
            >
              <option value="IDR">Rupiah Indonesia (Rp / IDR)</option>
              <option value="USD">U Dollar Amerika ($ / USD)</option>
            </select>
          </div>
        </div>

        {/* Tax (PPN & PPh) Configuration */}
        <div className="border border-slate-150 p-4 rounded-xl bg-slate-50/50 space-y-4" id="tax-config-panel">
          <div className="flex items-center space-x-2 text-slate-800">
            <Percent className="text-red-500" size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Pengaturan Pajak Default (PPN &amp; PPh)</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal font-semibold">
            Tentukan tarif pajak default instansi Anda. Pajak yang aktif akan otomatis diakumulasikan lalu dihitung saat pembuatan invoice baru secara live.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PPN Setup */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Pajak Pertambahan Nilai (PPN)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={ppnEnabled}
                    onChange={(e) => setPpnEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-650"></div>
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tarif PPN (%)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    disabled={isReadOnly || !ppnEnabled}
                    value={ppnRate}
                    onChange={(e) => setPpnRate(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-200 outline-none p-2 text-xs rounded-lg focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
            </div>

            {/* PPh Setup */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 font-sans">Pajak Penghasilan (PPh 23)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={pphEnabled}
                    onChange={(e) => setPphEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-650"></div>
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tarif PPh (%)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    disabled={isReadOnly || !pphEnabled}
                    value={pphRate}
                    onChange={(e) => setPphRate(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-200 outline-none p-2 text-xs rounded-lg focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400 font-semibold"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QRIS Upload & Config Section */}
        <div className="border border-slate-150 p-4 rounded-xl bg-slate-50/50 space-y-4">
          <div className="flex items-center space-x-2 text-slate-800">
            <QrCode size={18} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Pengaturan QRIS Barcode Manual</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal font-semibold">
            Unggah gambar barcode QRIS statis / manual instansi Anda agar dapat tampil otomatis ketika klien memilih metode pembayaran QRIS di lembar tagihan atau kasir.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-start">
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unggah File Barcode QRIS</label>
                
                <div className={`border-2 border-dashed rounded-xl p-4 transition text-center relative cursor-pointer ${
                  isUploading 
                    ? 'border-red-400 bg-red-50/10 cursor-not-allowed' 
                    : 'border-slate-200 hover:border-red-400 bg-white'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isReadOnly || isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Limit to 5MB
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Ukuran gambar terlalu besar. Batas maksimal adalah 5MB.");
                        return;
                      }

                      setIsUploading(true);
                      setUploadProgress("Membaca berkas...");
                      
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          setQrisUrl(reader.result);
                        }
                        setIsUploading(false);
                        setUploadProgress("");
                      };
                      reader.onerror = () => {
                        alert("Gagal membaca berkas gambar.");
                        setIsUploading(false);
                        setUploadProgress("");
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {isUploading ? (
                    <>
                      <Loader2 className="animate-spin text-red-500 mx-auto mb-1.5" size={20} />
                      <span className="block text-xs font-bold text-red-750">Sedang Memproses Gambar...</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{uploadProgress}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} className="text-slate-400 mx-auto mb-1.5" />
                      <span className="block text-xs font-bold text-slate-700">Pilih berkas gambar atau drag & drop</span>
                      <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">
                        Mendukung format gambar up to 5MB (Disimpan sebagai Base64)
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Atau Tulis / Edit Tautan (URL) QRIS Manual</label>
                <input
                  type="text"
                  disabled={isReadOnly || isUploading}
                  value={qrisUrl}
                  onChange={(e) => setQrisUrl(e.target.value)}
                  placeholder="Contoh: https://perusahaan.id/qris-statis.png"
                  className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 disabled:bg-slate-50 disabled:text-slate-400 font-semibold text-slate-800"
                  id="settings-qris-url"
                />

                {/* Live verification preview directly under URL field */}
                {qrisUrl ? (
                  <div className="mt-3 p-3 bg-white border border-slate-205 rounded-xl space-y-2">
                    <span className="block text-[9px] font-extrabold text-slate-450 uppercase tracking-wider">Live Preview dari URL / Kode Anda (Belum Disimpan)</span>
                    <div className="flex items-center justify-center p-3 bg-slate-50 border border-slate-100 rounded-lg min-h-44 relative">
                      <img
                        src={qrisUrl}
                        alt="Verifikasi Live QRIS Preview"
                        className="max-h-40 max-w-full object-contain rounded"
                        id="live-qris-image"
                        onError={(e) => {
                          const imgEl = e.currentTarget;
                          imgEl.style.display = 'none';
                          const errEl = imgEl.parentElement?.querySelector('#qris-error-view');
                          if (errEl) {
                            errEl.classList.remove('hidden');
                          }
                        }}
                        onLoad={(e) => {
                          const imgEl = e.currentTarget;
                          imgEl.style.display = 'block';
                          const errEl = imgEl.parentElement?.querySelector('#qris-error-view');
                          if (errEl) {
                            errEl.classList.add('hidden');
                          }
                        }}
                      />
                      <div id="qris-error-view" className="hidden text-center p-4 text-red-500 max-w-xs">
                        <X size={20} className="mx-auto mb-1 text-red-400" />
                        <span className="block text-[10px] font-bold uppercase tracking-wide">Gambar Gagal Dimuat</span>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
                          Pastikan link mengarah ke file gambar asli (JPG/PNG) yg dapat diakses publik.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Side Static Thumbnail Preview component */}
            <div className="w-32 h-32 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden shrink-0 mt-6 sm:mt-0">
              {qrisUrl ? (
                <>
                  <img
                    src={qrisUrl}
                    alt="Manual QRIS Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.opacity = '20%';
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.opacity = '100%';
                    }}
                  />
                  {!isReadOnly && !isUploading && (
                    <button
                      type="button"
                      onClick={() => setQrisUrl('')}
                      className="absolute top-1 right-1 bg-red-100 hover:bg-red-200 text-red-600 p-1 rounded-full shadow transition-all duration-150"
                      title="Hapus barcode"
                    >
                      <X size={10} />
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center p-2 text-slate-400">
                  <QrCode size={24} className="mx-auto mb-1 opacity-40" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Belum ada barcode</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Saved feedback */}
        {savedSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1 border border-emerald-100">
            <CheckCircle2 size={15} />
            <span>Berhasil menyimpan file parameter instansi dan re-seeding config invoice template.</span>
          </div>
        )}

        {/* Submissions button */}
        {!isReadOnly && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-md"
              id="save-settings-btn"
            >
              <Save size={14} />
              <span>Simpan Parameter</span>
            </button>
          </div>
        )}

      </form>

      {/* Firebase Cloud Connection Panel */}
      <div className="mt-8 border-t border-slate-150 pt-6 space-y-4" id="firebase-integration-panel">
        <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <Database size={14} className="text-[#D32F2F] animate-pulse" />
          <span>Integrasi Cloud Firebase &amp; Sinkronisasi</span>
        </h4>
        <p className="text-xs text-slate-500 leading-normal font-semibold">
          Aplikasi mendukung penyimpanan berbasis cloud terdistribusi dengan sinkronisasi multi-pengguna lewat platform Google Firebase. Rekam parameter project ID: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] select-all text-slate-800 font-bold">forsdig-tagihan</span>.
        </p>

        {isDemoMode ? (
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-amber-900 leading-relaxed">
              <span className="font-bold text-amber-950">Status: Mode Sandbox Demo (Offline Lokal)</span>
              <p className="text-[11px] text-amber-700/90 mt-1 leading-relaxed font-semibold">
                Data Anda saat ini hanya tersimpan di memori lokal web browser. Jika halaman direfresh, dibersihkan, atau dibuka pada gawai/perangkat lain, rekam penagihan tidak akan bersinkronisasi.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch (err) {
                    console.error("Popup closed or failed", err);
                  }
                }}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition active:scale-95 cursor-pointer"
                id="cloud-google-login-btn"
              >
                <Globe size={13} className="text-amber-400" />
                <span>Aktifkan Integrasi Cloud via Google SSO</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-4">
            <div className="text-xs font-semibold text-emerald-950 leading-relaxed space-y-2">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-extrabold text-emerald-900">Status: Terintegrasi Cloud Firebase (Online Aktif)</span>
              </div>
              <p className="text-[11px] text-emerald-700/90 leading-relaxed font-semibold">
                Koneksi aman terjalin secara real-time. Seluruh perubahan transaksi, kustomer, produk, dan pembayaran langsung tersimpan di cloud terdistribusi untuk kolaborasi multi-user instansi Anda.
              </p>
              <div className="text-[10px] text-slate-500 font-mono mt-1 bg-white/80 p-2 rounded border border-emerald-100 inline-block font-medium">
                Email Terhubung: <span className="font-bold text-emerald-850 select-all">{currentUser?.email}</span>
              </div>
            </div>

            {/* Cloud Database Seeding Section */}
            <div className="border-t border-emerald-100 pt-3 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Alat Seeder Sampel Cloud Firestore</div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                Jika database Cloud Firebase Anda masih bersih/kosong, gunakan tombol seeder di bawah untuk langsung menyuntikkan seluruh database dummy (invoice, kustomer, kas bank, settings) ke Firestore cloud Anda sekali klik.
              </p>
              
              <div className="flex items-center space-x-3 pt-1">
                <button
                  type="button"
                  disabled={isSeedingCloud}
                  onClick={async () => {
                    setIsSeedingCloud(true);
                    setSeedSuccess(false);
                    try {
                      await seedInitialData();
                      setSeedSuccess(true);
                    } catch (err) {
                      console.error("Failed cloud seeding", err);
                    } finally {
                      setIsSeedingCloud(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-[#D32F2F] hover:bg-red-700 disabled:bg-slate-300 text-white text-[11px] font-extrabold rounded-xl flex items-center space-x-2 shadow-md transition active:scale-95 cursor-pointer"
                  id="cloud-db-seeder-btn"
                >
                  <Sparkles size={11} className="text-amber-300 animate-pulse" />
                  <span>{isSeedingCloud ? 'Mengunggah Sampel Data ke Cloud...' : 'Seed Data Sampel ke Cloud Firestore'}</span>
                </button>

                {seedSuccess && (
                  <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 animate-bounce">
                    ✓ Sukses Seeding!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Data Export Panel */}
      <div className="mt-8 border-t border-slate-150 pt-6 space-y-4" id="monthly-export-panel">
        <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <FileSpreadsheet size={15} className="text-[#D32F2F]" />
          <span>Arsip Manual &amp; Ekspor Data Bulanan</span>
        </h4>
        <p className="text-xs text-slate-500 leading-normal font-semibold">
          Unduh rekaman transaksi keuangan lembaga Anda secara periodik dalam format file spreadsheet (CSV) untuk pelaporan atau arsip manual eksternal.
        </p>

        <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-4 font-sans">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Year Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Tahun</label>
              <select
                value={exportYear}
                onChange={(e) => setExportYear(e.target.value)}
                className="w-full border border-slate-200 outline-none p-2 text-xs rounded-xl bg-white font-bold text-slate-700 focus:border-[#D32F2F]"
              >
                <option value="Semua">Semua Tahun</option>
                {yearsList.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Bulan</label>
              <select
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="w-full border border-slate-200 outline-none p-2 text-xs rounded-xl bg-white font-bold text-slate-700 focus:border-[#D32F2F]"
              >
                <option value="Semua">Semua Bulan</option>
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Type Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jenis Laporan</label>
              <select
                value={exportType}
                onChange={(e) => setExportType(e.target.value as any)}
                className="w-full border border-slate-200 outline-none p-2 text-xs rounded-xl bg-white font-bold text-slate-700 focus:border-[#D32F2F]"
              >
                <option value="invoices">Daftar Tagihan (Invoice)</option>
                <option value="payments">Daftar Pembayaran Masuk</option>
                <option value="expenses">Daftar Pengeluaran Kas</option>
                <option value="all">Semua Data (Ekspor Terpisah)</option>
              </select>
            </div>
          </div>

          {/* Action indicator summarizing match live */}
          {(() => {
            const matchesFilter = (dateString?: string) => {
              if (!dateString) return false;
              const [year, month] = dateString.split('-');
              const yearMatch = exportYear === 'Semua' || year === exportYear;
              const monthMatch = exportMonth === 'Semua' || month === exportMonth;
              return yearMatch && monthMatch;
            };

            const invoiceCount = invoices.filter(inv => matchesFilter(inv.invoiceDate)).length;
            const paymentCount = payments.filter(p => matchesFilter(p.paymentDate)).length;
            const expenseCount = expenses.filter(e => matchesFilter(e.date)).length;

            let explanationStr = "";
            let matchCount = 0;
            if (exportType === 'invoices') {
              matchCount = invoiceCount;
              explanationStr = `${invoiceCount} Tagihan`;
            } else if (exportType === 'payments') {
              matchCount = paymentCount;
              explanationStr = `${paymentCount} Pembayaran Masuk`;
            } else if (exportType === 'expenses') {
              matchCount = expenseCount;
              explanationStr = `${expenseCount} Pengeluaran Kas`;
            } else {
              matchCount = invoiceCount + paymentCount + expenseCount;
              explanationStr = `${invoiceCount} Tagihan, ${paymentCount} Pembayaran, ${expenseCount} Pengeluaran`;
            }

            return (
              <div className="bg-white border border-slate-100 p-3 rounded-lg text-[11px] font-semibold text-slate-600 flex justify-between items-center">
                <span>Ditemukan: <span className="font-extrabold text-[#D32F2F]">{explanationStr}</span> untuk kriteria periode dipilih.</span>
                <span className="text-[10px] text-[#D32F2F] font-mono font-bold uppercase tracking-wider">{matchCount > 0 ? '✓ Siap Unduh' : 'Kosong'}</span>
              </div>
            );
          })()}

          {/* Export Action Trigger */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1 justify-between items-center">
            <button
              type="button"
              onClick={handleExportData}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl flex items-center justify-center space-x-2 shadow-md transition active:scale-95 cursor-pointer font-sans"
              id="download-monthly-csv-btn"
            >
              <Download size={13} className="text-amber-400" />
              <span>Unduh Laporan CSV</span>
            </button>

            {exportFeedback && (
              <div className={`p-2.5 rounded-lg text-[11px] font-extrabold animate-bounce ${
                exportFeedback.startsWith('✓') 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {exportFeedback}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
