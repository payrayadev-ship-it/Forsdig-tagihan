import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Settings, Save, CheckCircle2, ShieldCheck, Mail, Building, QrCode, Upload, X } from 'lucide-react';

export const SettingView: React.FC = () => {
  const { settings, updateSettings, currentUser } = useBilling();

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
    </div>
  );
};
