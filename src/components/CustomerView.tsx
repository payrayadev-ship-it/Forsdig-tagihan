import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { 
  Plus, Edit, Trash, Search, Filter, Download, Upload, Printer, X, Check, AlertCircle 
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

  // Form States
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [npwp, setNpwp] = useState('');
  const [status, setStatus] = useState<Customer['status']>('Aktif');
  const [notes, setNotes] = useState('');

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
      status,
      notes
    };

    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, payload);
    } else {
      await addCustomer(payload);
    }
    setDrawerOpen(false);
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
      'Alamat Kantor': c.address,
      'Kabupaten/Kota': c.city,
      'Provinsi': c.province,
      'NPWP': c.npwp,
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
                  <tr key={cust.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{cust.name}</div>
                      <div className="text-[10px] font-mono font-bold text-red-650 mt-0.5">{cust.customerId}</div>
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
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-right no-print">
                        <div className="flex items-center justify-end space-x-1.5">
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
                        </div>
                      </td>
                    )}
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

    </div>
  );
};
