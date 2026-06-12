import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { 
  Plus, Edit, Trash, Search, Filter, Download, Upload, Printer, X, Check, AlertCircle, Eye, User
} from 'lucide-react';
import { Customer } from '../types';
import * as XLSX from 'xlsx';

export const CustomerView: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, currentUser } = useBilling();
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [npwp, setNpwp] = useState('');
  const [nik, setNik] = useState('');
  const [gender, setGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [photoUrl, setPhotoUrl] = useState('');
  const [ktpUrl, setKtpUrl] = useState('');
  const [status, setStatus] = useState<Customer['status']>('Aktif');
  const [notes, setNotes] = useState('');

  // Handle image conversion to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'ktp') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran berkas terlalu besar! Batas maksimal adalah 2MB agar muat dalam database.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const resultString = evt.target?.result as string;
      if (type === 'photo') {
        setPhotoUrl(resultString);
      } else {
        setKtpUrl(resultString);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Add Form
  const openAddDrawer = () => {
    setEditingCustomer(null);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setProvince('');
    setNpwp('');
    setNik('');
    setGender('Laki-laki');
    setPhotoUrl('');
    setKtpUrl('');
    setStatus('Aktif');
    setNotes('');
    setDrawerOpen(true);
  };

  // Open Edit Form
  const openEditDrawer = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setCompany(cust.company);
    setEmail(cust.email);
    setPhone(cust.phone);
    setAddress(cust.address);
    setCity(cust.city);
    setProvince(cust.province);
    setNpwp(cust.npwp);
    setNik(cust.nik || '');
    setGender(cust.gender || 'Laki-laki');
    setPhotoUrl(cust.photoUrl || '');
    setKtpUrl(cust.ktpUrl || '');
    setStatus(cust.status);
    setNotes(cust.notes);
    setDrawerOpen(true);
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const payload = {
      name,
      company,
      email,
      phone,
      address,
      city,
      province,
      npwp,
      nik,
      gender,
      photoUrl,
      ktpUrl,
      status,
      notes
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
      } else {
        await addCustomer(payload);
      }
      setDrawerOpen(false);
    } catch (err: any) {
      console.error("Gagal menyimpan klien:", err);
      let detailedError = "Maaf, terjadi kesalahan saat menyimpan data klien.";
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
      alert(detailedError + "\n\nHarap periksa koneksi internet atau status kelayakan akun Anda.");
    }
  };

  // Delete Action Confirm
  const handleDelete = async () => {
    if (deleteId) {
      await deleteCustomer(deleteId);
      setDeleteId(null);
    }
  };

  // 1. Process Excel Import (Redux/XLSX Helper)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          alert('Excel kosong atau format salah!');
          return;
        }

        data.forEach(async (row) => {
          await addCustomer({
            name: row['Nama Pelanggan'] || row['Nama'] || row['name'] || 'Imported User',
            company: row['Perusahaan'] || row['Company'] || row['company'] || '',
            email: row['Email'] || row['email'] || 'import@forsdig.id',
            phone: String(row['Telepon'] || row['Phone'] || row['phone'] || ''),
            address: row['Alamat'] || row['Address'] || row['address'] || '',
            city: row['Kota'] || row['City'] || row['city'] || '',
            province: row['Provinsi'] || row['Province'] || row['province'] || '',
            npwp: row['NPWP'] || row['npwp'] || '',
            nik: String(row['NIK'] || row['nik'] || ''),
            gender: row['Jenis Kelamin'] === 'Perempuan' || row['gender'] === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
            photoUrl: row['Photo URL'] || row['photoUrl'] || '',
            ktpUrl: row['KTP URL'] || row['ktpUrl'] || '',
            status: row['Status'] === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
            notes: row['Catatan'] || row['Notes'] || 'Diimport otomatis lewat berkas Excel.'
          });
        });
      } catch (err) {
        console.error('Failed to import Excel worksheet: ', err);
        alert('Terjadi kesalahan saat memproses file Excel.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // 2. Excel Sheet Export trigger
  const handleExportExcel = () => {
    const sortedData = filteredCustomers.map(c => ({
      'ID Pelanggan': c.customerId,
      'Nama Lengkap': c.name,
      'Perusahaan': c.company,
      'Email': c.email,
      'No Telepon': c.phone,
      'NIK': c.nik || '',
      'Jenis Kelamin': c.gender || 'Laki-laki',
      'Alamat Kantor': c.address,
      'Kabupaten/Kota': c.city,
      'Provinsi': c.province,
      'NPWP': c.npwp || '',
      'Status': c.status,
      'Catatan Tagihan': c.notes,
      'Joined At': c.createdAt
    }));

    const ws = XLSX.utils.json_to_sheet(sortedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Pelanggan');
    XLSX.writeFile(wb, 'FORSDIG_Billing_Pelanggan.xlsx');
  };

  // 3. Print Data block
  const handlePrint = () => {
    window.print();
  };

  // Search/Filters computations
  const filteredCustomers = customers.filter(c => {
    const matchQuery = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customerId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'Semua' ? true : c.status === statusFilter;

    return matchQuery && matchStatus;
  });

  const isReadOnly = currentUser?.role === 'Viewer';

  return (
    <div className="space-y-6" id="customers-view-main">
      
      {/* Header and Toolbar actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Modul Master Pelanggan</h2>
          <p className="text-xs text-slate-500">Kelola dan update profil penagihan instansi, NPWP, dan kontak klien.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Print button */}
          <button 
            onClick={handlePrint}
            className="flex items-center space-x-1 py-1.5 px-3 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
            id="print-cust-btn"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {/* Export to Excel */}
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-1 py-1.5 px-3 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
            id="export-cust-btn"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Excel Import label button */}
          {!isReadOnly && (
            <label className="flex items-center space-x-1 py-1.5 px-3 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm cursor-pointer transition">
              <Upload size={14} />
              <span className="hidden sm:inline">Import Excel</span>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={handleImportExcel}
                id="import-excel-input"
              />
            </label>
          )}

          {/* Add New Customer */}
          {!isReadOnly && (
            <button
              onClick={openAddDrawer}
              className="flex items-center space-x-1.5 py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md transition cursor-pointer"
              id="add-customer-btn"
            >
              <Plus size={15} />
              <span>Tambah Pelanggan</span>
            </button>
          )}
        </div>
      </div>

      {/* Query Filter and Search row */}
      <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari ID, Nama, PT, Kota, No Telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            id="customer-search-query"
          />
        </div>
        {/* Filter Status */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={15} className="text-slate-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer w-full md:w-44"
            id="customer-status-filter"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Print printable-only content section wrapper */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden" id="print-sheet-area">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-150">
              <tr>
                <th className="px-6 py-4">ID / Klien</th>
                <th className="px-6 py-4">Instansi</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">Lokasi / NPWP</th>
                <th className="px-6 py-4 text-center">Status</th>
                {!isReadOnly && <th className="px-6 py-4 text-right no-print">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400">
                    Tidak ada pelanggan ditemukan. Sila tambahkan atau rubah kecocokan pencarian.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/55 transition border-b border-slate-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {cust.photoUrl ? (
                          <img 
                            src={cust.photoUrl} 
                            alt={cust.name} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                            <User size={16} />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{cust.name}</span>
                            {cust.gender && (
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                cust.gender === 'Laki-laki' 
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                                  : 'bg-pink-50 text-pink-600 border border-pink-100'
                              }`}>
                                {cust.gender === 'Laki-laki' ? 'L' : 'P'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-red-650 mt-0.5 flex items-center gap-2">
                            <span>{cust.customerId}</span>
                            {cust.nik && <span className="text-slate-400 font-normal">NIK: {cust.nik}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{cust.company}</td>
                    <td className="px-6 py-4">
                      <div>{cust.email}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5 leading-normal">{cust.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{cust.city}, {cust.province}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">NPWP: {cust.npwp || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 mt-1 text-[10px] font-extrabold rounded-full ${
                        cust.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {cust.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right no-print">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button 
                          onClick={() => setViewingCustomer(cust)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Lihat Detail Profil & Dokumen"
                          id={`view-cust-btn-${cust.id}`}
                        >
                          <Eye size={14} />
                        </button>
                        {!isReadOnly && (
                          <>
                            <button 
                              onClick={() => openEditDrawer(cust)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 cursor-pointer"
                              title="Edit"
                              id={`edit-cust-btn-${cust.id}`}
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => setDeleteId(cust.id)}
                              className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer"
                              title="Delete"
                              id={`delete-cust-btn-${cust.id}`}
                            >
                              <Trash size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slideout Form Drawer Modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-55 flex justify-end bg-black/50 overflow-hidden" id="customer-form-modal">
          <div className="w-full max-w-lg bg-white h-screen flex flex-col shadow-2xl relative animate-slide-left">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCustomer ? 'Perbarui Profil Pelanggan' : 'Daftarkan Pelanggan Baru'}
              </h3>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                id="close-customer-drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Lengkap Klien *</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                  id="form-customer-name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Perusahaan / Instansi</label>
                <input 
                  type="text"
                  placeholder="Contoh: PT Swadaya Sentosa"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                  id="form-customer-company"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alamat Email *</label>
                  <input 
                    type="email"
                    required
                    placeholder="Contoh: accounts@swadaya.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                    id="form-customer-email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">No. Telepon / WhatsApp</label>
                  <input 
                    type="text"
                    placeholder="Contoh: 08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                    id="form-customer-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alamat Lengkap</label>
                <textarea 
                  placeholder="Jl. Thamrin kav. 12 lt.8"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 resize-none"
                  id="form-customer-address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kota / Kabupaten</label>
                  <input 
                    type="text"
                    placeholder="Sleman"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                    id="form-customer-city"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Provinsi</label>
                  <input 
                    type="text"
                    placeholder="DI Yogyakarta"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                    id="form-customer-province"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nomor NIK *</label>
                  <input 
                    type="text"
                    required
                    maxLength={16}
                    placeholder="16-digit nomor NIK"
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 font-mono"
                    id="form-customer-nik"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Jenis Kelamin</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 cursor-pointer bg-white"
                    id="form-customer-gender"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Foto Pelanggan</label>
                  {photoUrl ? (
                    <div className="relative group">
                      <img src={photoUrl} alt="Foto Pelanggan" className="w-full h-32 object-cover rounded-lg border border-slate-200 shadow-inner" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrl('')}
                        className="absolute top-1.5 right-1.5 bg-red-650 hover:bg-red-700 text-white rounded-full p-1 opacity-90 transition shadow cursor-pointer"
                        title="Hapus foto"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg p-4 h-32 bg-white text-center cursor-pointer relative hover:bg-slate-50 transition">
                      <Upload size={20} className="text-slate-400 mb-2" />
                      <span className="text-[10px] text-slate-500 font-bold">Pilih Foto</span>
                      <span className="text-[9px] text-slate-400">JPG/PNG (Maks 2MB)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => handleFileChange(e, 'photo')} 
                      />
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">KTP Pelanggan</label>
                  {ktpUrl ? (
                    <div className="relative group">
                      <img src={ktpUrl} alt="KTP Pelanggan" className="w-full h-32 object-cover rounded-lg border border-slate-200 shadow-inner" />
                      <button
                        type="button"
                        onClick={() => setKtpUrl('')}
                        className="absolute top-1.5 right-1.5 bg-red-650 hover:bg-red-700 text-white rounded-full p-1 opacity-90 transition shadow cursor-pointer"
                        title="Hapus KTP"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-lg p-4 h-32 bg-white text-center cursor-pointer relative hover:bg-slate-50 transition">
                      <Upload size={20} className="text-slate-400 mb-2" />
                      <span className="text-[10px] text-slate-500 font-bold">Pilih KTP</span>
                      <span className="text-[9px] text-slate-400">JPG/PNG (Maks 2MB)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={(e) => handleFileChange(e, 'ktp')} 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NPWP Perusahaan</label>
                  <input 
                    type="text"
                    placeholder="01.234.567.8-012.000"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500"
                    id="form-customer-npwp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status Keaktifan</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 cursor-pointer bg-white"
                    id="form-customer-status"
                  >
                    <option value="Aktif">Aktif (Taging Lancar)</option>
                    <option value="Nonaktif">Nonaktif (Banned/Selesai)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Catatan Internal</label>
                <textarea 
                  placeholder="Tulis instruksi khusus penagihan jika ada..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 resize-none"
                  id="form-customer-notes"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  id="cancel-customer-btn"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer"
                  id="save-customer-btn"
                >
                  {editingCustomer ? 'Simpan Perubahan' : 'Daftarkan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-xl animate-scale-up">
            <div className="flex items-center space-x-3 text-red-600 mb-3">
              <AlertCircle size={22} />
              <h4 className="font-bold text-slate-900 text-sm">Hapus Pelanggan</h4>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-normal">
              Apakah Anda yakin ingin menghapus pelanggan ini? Tindakan ini tidak dapat dibatalkan dan semua metadata penagihan akan diarsipkan.
            </p>
            <div className="flex items-center justify-end space-x-1.5">
              <button 
                onClick={() => setDeleteId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                id="cancel-delete-cust"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow"
                id="confirm-delete-cust"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewing Customer profile details & document modal card */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 p-4 overflow-y-auto" id="customer-profile-viewer-modal">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up text-left">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900">Dossier Detail Pelanggan</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">ID Registrasi Resmi: <span className="font-mono text-red-650 font-bold">{viewingCustomer.customerId}</span></p>
              </div>
              <button 
                onClick={() => setViewingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer"
                id="close-cust-viewer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                {viewingCustomer.photoUrl ? (
                  <img 
                    src={viewingCustomer.photoUrl} 
                    alt={viewingCustomer.name} 
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-md flex-shrink-0" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center border-2 border-slate-200 text-slate-400 flex-shrink-0">
                    <User size={32} />
                  </div>
                )}
                <div>
                  <h4 className="text-lg font-extrabold text-slate-900">{viewingCustomer.name}</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{viewingCustomer.company || 'Pribadi / Perorangan'}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full ${
                      viewingCustomer.status === 'Aktif' 
                        ? 'bg-emerald-100 text-emerald-850' 
                        : 'bg-slate-100 text-slate-650'
                    }`}>
                      {viewingCustomer.status}
                    </span>
                    {viewingCustomer.gender && (
                      <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 rounded-full">
                        {viewingCustomer.gender}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data parameters Grid layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Nomor NIK</span>
                  <span className="text-slate-800 font-mono text-xs font-bold bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 block">
                    {viewingCustomer.nik || 'Tidak ditentukan'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">NPWP Surat Pajak</span>
                  <span className="text-slate-800 font-mono text-xs font-bold bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 block">
                    {viewingCustomer.npwp || 'Tidak ditentukan'}
                  </span>
                </div>

                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Email Penagihan</span>
                  <span className="text-slate-800 block text-xs break-all bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono">
                    {viewingCustomer.email}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Nomor Telepon</span>
                  <span className="text-slate-800 block text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 font-mono">
                    {viewingCustomer.phone || '-'}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">Alamat Kantor / Rumah</span>
                  <span className="text-slate-800 block text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 leading-relaxed">
                    {viewingCustomer.address || '-'} {viewingCustomer.city && `, ${viewingCustomer.city}`} {viewingCustomer.province && `, ${viewingCustomer.province}`}
                  </span>
                </div>

                {viewingCustomer.notes && (
                  <div className="sm:col-span-2 p-3 bg-red-50/20 rounded-xl border border-red-100 text-xs">
                    <span className="block text-[10px] uppercase font-bold text-red-650 tracking-wider mb-0.5">Catatan Internal Administrasi</span>
                    <p className="text-slate-700 italic">"{viewingCustomer.notes}"</p>
                  </div>
                )}
              </div>

              {/* Verified Uploaded ID Card slot elements */}
              <div className="pt-4 border-t border-slate-100">
                <span className="block text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">Dokumen legalitas KTP</span>
                {viewingCustomer.ktpUrl ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2 shadow-inner">
                    <img 
                      src={viewingCustomer.ktpUrl} 
                      alt="Kartu KTP Pelanggan" 
                      className="w-full h-auto max-h-64 object-contain rounded-lg mx-auto" 
                    />
                    <div className="text-center text-[10px] text-slate-400 py-1 font-semibold">
                      KTP terverifikasi secara elektronik oleh sistem penagihan
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-slate-250 rounded-xl p-6 text-center text-slate-400 text-xs bg-slate-50/30 font-semibold">
                    Klien belum melampirkan berkas KTP.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button 
                onClick={() => setViewingCustomer(null)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow transition cursor-pointer"
              >
                Tutup dossier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
