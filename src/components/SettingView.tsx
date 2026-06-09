import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Settings, Save, CheckCircle2, ShieldCheck, Mail, Building, QrCode, Upload, X, Database, Globe, Cloud, Sparkles } from 'lucide-react';

export const SettingView: React.FC = () => {
  const { settings, updateSettings, currentUser, isDemoMode, loginWithGoogle, seedInitialData } = useBilling();

  const [isSeedingCloud, setIsSeedingCloud] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const [companyName, setCompanyName] = useState(settings.companyName);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [taxId, setTaxId] = useState(settings.taxId);
  const [currency, setCurrency] = useState(settings.currency);
  const [qrisUrl, setQrisUrl] = useState(settings.qrisUrl || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      companyName,
      address,
      phone,
      email,
      taxId,
      currency,
      qrisUrl
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const isReadOnly = currentUser?.role === 'Viewer';

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

        {/* QRIS Upload & Config Section */}
        <div className="border border-slate-150 p-4 rounded-xl bg-slate-50/50 space-y-4">
          <div className="flex items-center space-x-2 text-slate-800">
            <QrCode size={18} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Pengaturan QRIS Barcode Manual</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal font-semibold">
            Unggah gambar barcode QRIS statis / manual instansi Anda agar dapat tampil otomatis ketika klien memilih metode pembayaran QRIS di lembar tagihan atau kasir.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="flex-1 w-full">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unggah File Barcode QRIS</label>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-red-400 bg-white rounded-xl p-4 transition text-center relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  disabled={isReadOnly}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          setQrisUrl(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Upload size={20} className="text-slate-400 mx-auto mb-1.5" />
                <span className="block text-xs font-bold text-slate-700">Pilih berkas gambar atau drag & drop</span>
                <span className="block text-[10px] text-slate-400 font-semibold mt-0.5">Mendukung format PNG, JPG, GIF up to 2MB</span>
              </div>
            </div>

            {/* Thumbnail Preview component */}
            <div className="w-32 h-32 bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 relative overflow-hidden shrink-0">
              {qrisUrl ? (
                <>
                  <img
                    src={qrisUrl}
                    alt="Manual QRIS Preview"
                    className="w-full h-full object-contain"
                  />
                  {!isReadOnly && (
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
    </div>
  );
};
