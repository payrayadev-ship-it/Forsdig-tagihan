import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { 
  Plus, Edit, Trash, Search, Info, X, Check, Wrench, Clock, User, 
  RefreshCw, AlertTriangle, Play, CheckCircle, Database 
} from 'lucide-react';
import { RentalInventoryItem, RentalInventoryStatus } from '../types';

export const RentalInventoryView: React.FC = () => {
  const { 
    rentalInventory, 
    addRentalInventoryItem, 
    updateRentalInventoryItem, 
    deleteRentalInventoryItem,
    customers,
    products,
    contracts,
    currentUser 
  } = useBilling();

  // Search, Status, & Return overdue filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [overdueFilter, setOverdueFilter] = useState<string>('Semua');

  // Drawers & modals states
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [alokasiModalOpen, setAlokasiModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RentalInventoryItem | null>(null);

  // Add Item form states
  const [serialNumber, setSerialNumber] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('custom');
  const [customName, setCustomName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addStatus, setAddStatus] = useState<RentalInventoryStatus>('Tersedia');
  const [addNotes, setAddNotes] = useState('');

  // Allocation form states
  const [allocationType, setAllocationType] = useState<'contract' | 'manual'>('contract');
  const [selectedContractId, setSelectedContractId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [allocationReturnDate, setAllocationReturnDate] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');

  // Info Modal Tab / Action state
  const [infoEditNotes, setInfoEditNotes] = useState('');
  const [infoEditStatus, setInfoEditStatus] = useState<RentalInventoryStatus>('Tersedia');

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculated stats
  const totalItems = rentalInventory.length;
  const tersediaCount = rentalInventory.filter(i => i.status === 'Tersedia').length;
  const disewaCount = rentalInventory.filter(i => i.status === 'Disewa').length;
  const maintenanceCount = rentalInventory.filter(i => i.status === 'Maintenance').length;

  // Determine overdue count
  const overdueCount = rentalInventory.filter(i => {
    if (i.status !== 'Disewa' || !i.autoReturnDate) return false;
    return i.autoReturnDate < todayStr;
  }).length;

  const handleOpenAddDrawer = () => {
    setSerialNumber(`SN-POS-${Math.floor(1000 + Math.random() * 9000)}B`);
    setSelectedProductType('custom');
    setCustomName('');
    setSelectedProductId(products[0]?.id || '');
    setAddStatus('Tersedia');
    setAddNotes('');
    setAddDrawerOpen(true);
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) return;

    let finalName = '';
    if (selectedProductType === 'custom') {
      finalName = customName.trim() || 'Perangkat Forsdig POS';
    } else {
      const p = products.find(prod => prod.id === selectedProductId);
      finalName = p ? p.name : 'Perangkat Forsdig POS';
    }

    await addRentalInventoryItem({
      serialNumber,
      name: finalName,
      status: addStatus,
      notes: addNotes
    });

    setAddDrawerOpen(false);
  };

  const handleOpenAlokasi = (item: RentalInventoryItem) => {
    setSelectedItem(item);
    setAllocationType('contract');
    // Set first contract that is Active or Draft
    const usableContracts = contracts.filter(c => c.status === 'Aktif' || c.status === 'Menunggu Tanda Tangan');
    setSelectedContractId(usableContracts[0]?.id || '');
    setSelectedCustomerId(customers[0]?.id || '');
    // Default 1 year return date
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setAllocationReturnDate(nextYear.toISOString().split('T')[0]);
    setAllocationNotes(item.notes || '');
    setAlokasiModalOpen(true);
  };

  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    let customerName = '';
    let contractId = '';
    let contractNumber = '';
    let returnDate = '';

    if (allocationType === 'contract') {
      const c = contracts.find(con => con.id === selectedContractId);
      if (!c) {
        alert('Mohon pilih kontrak sewa yang valid');
        return;
      }
      customerName = c.customerName;
      contractId = c.id;
      contractNumber = c.contractNumber;
      returnDate = c.endDate;
    } else {
      const cust = customers.find(cu => cu.id === selectedCustomerId);
      if (!cust) {
        alert('Mohon pilih pelanggan yang valid');
        return;
      }
      customerName = cust.company ? `${cust.name} - ${cust.company}` : cust.name;
      returnDate = allocationReturnDate;
    }

    await updateRentalInventoryItem(selectedItem.id, {
      status: 'Disewa',
      customerName,
      associatedContractId: contractId || undefined,
      associatedContractNumber: contractNumber || undefined,
      rentedAt: todayStr,
      autoReturnDate: returnDate,
      notes: allocationNotes
    });

    setAlokasiModalOpen(false);
  };

  const handleQuickReturn = async (item: RentalInventoryItem) => {
    if (confirm(`Apakah Anda yakin ingin menerima pengembalian item ini?\nS/N: ${item.serialNumber} - ${item.name}`)) {
      await updateRentalInventoryItem(item.id, {
        status: 'Tersedia',
        customerName: undefined,
        associatedContractId: undefined,
        associatedContractNumber: undefined,
        rentedAt: undefined,
        autoReturnDate: undefined,
        notes: item.notes ? `${item.notes}\n[Siklus sewa selesai pada ${todayStr}]` : `[Siklus sewa selesai pada ${todayStr}]`
      });
    }
  };

  const handleOpenInfo = (item: RentalInventoryItem) => {
    setSelectedItem(item);
    setInfoEditNotes(item.notes || '');
    setInfoEditStatus(item.status);
    setInfoModalOpen(true);
  };

  const handleSaveInfoUpdate = async () => {
    if (!selectedItem) return;
    
    const updateObj: Partial<RentalInventoryItem> = {
      notes: infoEditNotes,
      status: infoEditStatus
    };

    // If changing to Tersedia, clear rental associations safely
    if (infoEditStatus === 'Tersedia' || infoEditStatus === 'Maintenance') {
      if (selectedItem.status === 'Disewa') {
        updateObj.customerName = undefined;
        updateObj.associatedContractId = undefined;
        updateObj.associatedContractNumber = undefined;
        updateObj.rentedAt = undefined;
        updateObj.autoReturnDate = undefined;
      }
    }

    await updateRentalInventoryItem(selectedItem.id, updateObj);
    setInfoModalOpen(false);
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus '${name}' dari inventaris sewa perusahaan?\nTindakan ini ireversibel.`)) {
      await deleteRentalInventoryItem(id);
    }
  };

  // Filter items logic
  const filteredItems = rentalInventory.filter(item => {
    // 1. Text Search filters
    const searchLower = search.toLowerCase();
    const matchesSearch = item.serialNumber.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      (item.customerName || '').toLowerCase().includes(searchLower) ||
      (item.associatedContractNumber || '').toLowerCase().includes(searchLower);

    // 2. Status filter
    const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;

    // 3. Overdue filter
    let matchesOverdue = true;
    if (overdueFilter === 'Overdue') {
      matchesOverdue = item.status === 'Disewa' && !!item.autoReturnDate && item.autoReturnDate < todayStr;
    } else if (overdueFilter === 'Jatuh Tempo Mendekat (< 7 Hari)') {
      if (item.status !== 'Disewa' || !item.autoReturnDate) {
        matchesOverdue = false;
      } else {
        const diffTime = new Date(item.autoReturnDate).getTime() - new Date(todayStr).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesOverdue = diffDays >= 0 && diffDays <= 7;
      }
    }

    return matchesSearch && matchesStatus && matchesOverdue;
  });

  return (
    <div className="space-y-6" id="rental-inventory-view-main">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 flex items-center gap-3">
            <span className="p-2 bg-[#D32F2F]/10 text-[#D32F2F] rounded-lg">
              <Database size={22} />
            </span>
            <span>Sistem Inventaris Sewa</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Lacak ketersediaan aset hardware/perangkat fisik, status pemakaian sewa, dan deteksi otomatis tanggal jatuh tempo kembali.</p>
        </div>
        <button
          onClick={handleOpenAddDrawer}
          className="px-4 py-2 text-xs font-bold text-white bg-[#D32F2F] rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-[#B71C1C] transition cursor-pointer"
        >
          <Plus size={16} />
          Register Inventaris Baru
        </button>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total stats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-xl">
            <Database size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Aset Terdaftar</span>
            <span className="text-2xl font-extrabold text-slate-900">{totalItems} <span className="text-xs font-medium text-slate-400">Unit</span></span>
          </div>
        </div>

        {/* Tersedia stats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Aset Ready (Tersedia)</span>
            <span className="text-2xl font-extrabold text-emerald-600">{tersediaCount} <span className="text-xs font-medium text-emerald-400">Unit</span></span>
          </div>
        </div>

        {/* Disewa stats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Play size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sedang Disewakan</span>
            <span className="text-2xl font-extrabold text-blue-600">{disewaCount} <span className="text-xs font-medium text-blue-400">Unit</span></span>
          </div>
        </div>

        {/* Maintenance stats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Wrench size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Maintenance (Perbaikan)</span>
            <span className="text-2xl font-extrabold text-amber-600">{maintenanceCount} <span className="text-xs font-medium text-amber-400">Unit</span></span>
          </div>
        </div>
      </div>

      {/* Warning Alert for Overdue items */}
      {overdueCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
          <div className="text-xs">
            <p className="font-bold">Perhatian: Terdapat {overdueCount} Perangkat Sewa Melewati Batas Tanggal Kembali!</p>
            <p className="text-rose-600 mt-1">Sistem mendeteksi bahwa beberapa aset telah melewati masa berlaku kontrak aktif. Mohon lakukan pengecekan, buat invoice susulan, atau terima pengembalian aset secepatnya.</p>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cari S/N, nama barang, atau penyewa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] text-xs px-3 py-2.5 pl-9 rounded-xl outline-none"
          />
          <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
        </div>

        {/* Filter Selection Grid */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Tersedia">Tersedia (Ready)</option>
              <option value="Disewa">Disewa</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          {/* Overdue Filter */}
          <div className="flex items-center space-x-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">Pengembalian:</label>
            <select
              value={overdueFilter}
              onChange={(e) => setOverdueFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none"
            >
              <option value="Semua">Semua Tenggat</option>
              <option value="Overdue">Overdue (Terlambat)</option>
              <option value="Jatuh Tempo Mendekat (< 7 Hari)">Jatuh Tempo Mendekat (&lt; 7 Hari)</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(search || statusFilter !== 'Semua' || overdueFilter !== 'Semua') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('Semua');
                setOverdueFilter('Semua');
              }}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-150 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-6">ID SKU / S/N</th>
                <th className="py-4 px-4">Nama Barang & Deskripsi</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4">Penerima Manfaat / Penyewa</th>
                <th className="py-4 px-4">Tanggal Pengembalian</th>
                <th className="py-4 text-center px-6">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => {
                // Calculate date colors/warnings
                let returnIndicator = null;
                if (item.status === 'Disewa' && item.autoReturnDate) {
                  const diffTime = new Date(item.autoReturnDate).getTime() - new Date(todayStr).getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (diffDays < 0) {
                    returnIndicator = {
                      text: `Terlambat ${Math.abs(diffDays)} hari`,
                      style: 'bg-rose-50 text-rose-700 border-rose-200 border animate-pulse',
                      icon: <AlertTriangle size={11} className="shrink-0" />
                    };
                  } else if (diffDays === 0) {
                    returnIndicator = {
                      text: 'Hari ini',
                      style: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
                      icon: <Clock size={11} className="shrink-0" />
                    };
                  } else if (diffDays <= 7) {
                    returnIndicator = {
                      text: `Sisa ${diffDays} hari`,
                      style: 'bg-amber-50 text-amber-700 border border-amber-150',
                      icon: <Clock size={11} className="shrink-0" />
                    };
                  } else {
                    returnIndicator = {
                      text: `${diffDays} hari lagi`,
                      style: 'bg-slate-50 text-slate-600 border border-slate-100',
                      icon: <Clock size={11} className="shrink-0" />
                    };
                  }
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    {/* SKU S/N */}
                    <td className="py-4 px-6 font-mono text-[11px] font-semibold text-slate-900 select-all">
                      <span className="text-[10px] text-slate-400 font-bold block">{item.itemId}</span>
                      {item.serialNumber}
                    </td>

                    {/* Hardware Name */}
                    <td className="py-4 px-4">
                      <div className="font-extrabold text-slate-900 max-w-sm">{item.name}</div>
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 mt-0.5 italic max-w-sm truncate" title={item.notes}>
                          {item.notes}
                        </p>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full ${
                        item.status === 'Tersedia' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                          : item.status === 'Disewa'
                            ? 'bg-blue-50 text-blue-700 border border-blue-150'
                            : 'bg-amber-50 text-amber-700 border border-amber-150'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Rentee and customer */}
                    <td className="py-4 px-4">
                      {item.status === 'Disewa' ? (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <User size={12} className="text-blue-500 shrink-0" />
                            <span>{item.customerName}</span>
                          </div>
                          {item.associatedContractNumber && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              Kontrak: {item.associatedContractNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Return Date auto tracking */}
                    <td className="py-4 px-4">
                      {item.status === 'Disewa' && item.autoReturnDate ? (
                        <div className="space-y-1">
                          <div className="font-mono text-[11px] text-slate-900">
                            {item.autoReturnDate}
                          </div>
                          {returnIndicator && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold ${returnIndicator.style}`}>
                              {returnIndicator.icon}
                              <span>{returnIndicator.text}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Actions Row */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {/* Info details */}
                        <button
                          onClick={() => handleOpenInfo(item)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                          title="Perbarui Detail / Catatan"
                        >
                          <Info size={14} />
                        </button>

                        {/* Hand over/Rent action */}
                        {item.status === 'Tersedia' && (
                          <button
                            onClick={() => handleOpenAlokasi(item)}
                            className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition text-[11px] font-bold flex items-center gap-1"
                            title="Alokasikan Sewa Baru"
                          >
                            <Play size={12} />
                            <span>Sewa Aset</span>
                          </button>
                        )}

                        {/* Check In / Return manual */}
                        {item.status === 'Disewa' && (
                          <button
                            onClick={() => handleQuickReturn(item)}
                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition text-[11px] font-bold flex items-center gap-1 animate-pulse"
                            title="Terima Pengembalian Unit"
                          >
                            <Check size={12} />
                            <span>Return</span>
                          </button>
                        )}

                        {/* Delete row */}
                        {currentUser?.role === 'Super Admin' && (
                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                            title="Hapus Inventaris"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold text-xs">
                    Tidak ada barang inventaris sewa yang sesuai dengan pencarian Anda. Touch "Register" untuk menambahkan!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer / Modal: Tambah Inventaris */}
      {addDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm">Register Inventaris Sewa Baru</h3>
                <button onClick={() => setAddDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="mt-5 space-y-4 text-xs">
                {/* SKU Serial */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nomor Serial (S/N) atau Kode SKU</label>
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Contoh: SN-POS-9988X"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2.5 rounded-xl outline-none"
                  />
                </div>

                {/* Name Origin Type */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Metode Penamaan Produk</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProductType('custom')}
                      className={`py-2 text-center rounded-xl border font-bold transition ${
                        selectedProductType === 'custom'
                          ? 'bg-[#D32F2F]/5 border-[#D32F2F] text-[#D32F2F]'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      Ketik Manual (Custom)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProductType('catalog')}
                      className={`py-2 text-center rounded-xl border font-bold transition ${
                        selectedProductType === 'catalog'
                          ? 'bg-[#D32F2F]/5 border-[#D32F2F] text-[#D32F2F]'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      Dari Katalog Produk
                    </button>
                  </div>
                </div>

                {/* Name Input switch */}
                {selectedProductType === 'custom' ? (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Nama Perangkat / Hardware</label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Contoh: ForsdigPOS Thermal Bluetooth Printer S5"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2.5 rounded-xl outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Pilih Produk Dari Katalog</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2.5 rounded-xl outline-none"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Awal */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status Awal</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as RentalInventoryStatus)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2.5 rounded-xl outline-none"
                  >
                    <option value="Tersedia">Tersedia (Ready Sewa)</option>
                    <option value="Maintenance">Maintenance (Proses Perbaikan)</option>
                  </select>
                </div>

                {/* Catatan Tambahan */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Keterangan / Catatan Spesifikasi</label>
                  <textarea
                    rows={3}
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    placeholder="Contoh: Android 12, baterai 5000mAh, layar IPS 6 inch, warna hitam doff"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2 rounded-xl outline-none"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    Simpan Registrasi Inventaris
                  </button>
                </div>
              </form>
            </div>

            <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-4">
              Aset yang diregistrasi akan tunduk pada sistem pencatatan log ERP.
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alokasi Sewa Perangkat */}
      {alokasiModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setAlokasiModalOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-2 pb-3 border-b border-slate-150">
              <Play size={16} className="text-[#D32F2F]" />
              <span>Alokasi Sewa Perangkat Hardware</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 mt-4 flex items-start gap-3">
              <Database size={16} className="text-slate-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-slate-900">{selectedItem.name}</div>
                <div className="font-mono text-[10px] text-slate-400 block mt-0.5">S/N: {selectedItem.serialNumber}</div>
              </div>
            </div>

            <form onSubmit={handleExecuteAllocation} className="mt-4 space-y-4 text-xs">
              {/* Allocation Type Switch */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Metode Alokasi Pendistribusian</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocationType('contract')}
                    className={`py-2 text-center rounded-xl border font-bold transition ${
                      allocationType === 'contract'
                        ? 'bg-[#D32F2F]/5 border-[#D32F2F] text-[#D32F2F]'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Hubungkan ke Kontrak Sewa
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationType('manual')}
                    className={`py-2 text-center rounded-xl border font-bold transition ${
                      allocationType === 'manual'
                        ? 'bg-[#D32F2F]/5 border-[#D32F2F] text-[#D32F2F]'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Alokasi Manual (Pelanggan Langsung)
                  </button>
                </div>
              </div>

              {allocationType === 'contract' ? (
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Pilih Kontrak Sewa Yang Aktif / Draft</label>
                  <select
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-4 py-2.5 rounded-xl outline-none"
                  >
                    {contracts.filter(c => c.status === 'Aktif' || c.status === 'Menunggu Tanda Tangan' || c.status === 'Draft').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber} — {c.customerName} ({c.propertyName})
                      </option>
                    ))}
                    {contracts.filter(c => c.status === 'Aktif' || c.status === 'Menunggu Tanda Tangan' || c.status === 'Draft').length === 0 && (
                      <option value="">(Belum Ada Surat Pengajuan Kontrak Sewa Aktif)</option>
                    )}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Saat dihubungkan ke kontrak sewa, nama penyewa dan "Tanggal Kembali Otomatis" akan sinkron penuh dengan masa akhir kontrak di sistem.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Pilih Pelanggan Penyewa</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-4 py-2.5 rounded-xl outline-none"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.company ? `${c.name} (${c.company})` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tanggal Batas Pengembalian</label>
                    <input
                      type="date"
                      required
                      value={allocationReturnDate}
                      onChange={(e) => setAllocationReturnDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-4 py-2 rounded-xl outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Allocation notes detail */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Catatan Tambahan untuk Siklus Sewa Ini</label>
                <textarea
                  rows={2}
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  placeholder="Contoh: Pengiriman via kurir internal, kelengkapan kabel power dan stand lengkap."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAlokasiModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold font-sans hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={allocationType === 'contract' && contracts.filter(c => c.status === 'Aktif' || c.status === 'Menunggu Tanda Tangan' || c.status === 'Draft').length === 0}
                  className="px-5 py-2.5 bg-[#D32F2F] text-white rounded-xl font-bold font-sans hover:bg-[#B71C1C] transition cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  Aktifkan Log Sewa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info / Quick Update modal */}
      {infoModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setInfoModalOpen(false)}
              className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <h3 className="font-extrabold text-slate-950 text-sm flex items-center gap-2 pb-3 border-b border-slate-150">
              <Info size={16} className="text-slate-800" />
              <span>Detail & Status Inventaris</span>
            </h3>

            <div className="mt-4 space-y-4 text-xs">
              {/* Readonly info */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-150">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">ID & Model Aset</span>
                <span className="font-extrabold text-slate-900 block">{selectedItem.name}</span>
                <span className="font-mono text-[10px] text-slate-500 block">ID: {selectedItem.itemId} | S/N: {selectedItem.serialNumber}</span>
                <span className="text-[9px] text-slate-450 block mt-1">Terdaftar: {selectedItem.createdAt}</span>
              </div>

              {/* Status Update selection */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status Lapangan Hardware</label>
                <select
                  value={infoEditStatus}
                  onChange={(e) => setInfoEditStatus(e.target.value as RentalInventoryStatus)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2 rounded-xl outline-none"
                >
                  <option value="Tersedia">Tersedia (Ready)</option>
                  <option value="Maintenance">Maintenance (Dalam Perbaikan)</option>
                  <option value="Disewa" disabled>Disewa (Sewa Aset di Menu Depan)</option>
                </select>
                {infoEditStatus !== selectedItem.status && infoEditStatus === 'Tersedia' && selectedItem.status === 'Disewa' && (
                  <p className="text-[10px] text-amber-600 mt-1 animate-pulse">Peringatan: Mengubah status menjadi Tersedia akan membersihkan seluruh keterkaitan kontrak & penyewa sekarang!</p>
                )}
              </div>

              {/* Notes specifications edit */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Catatan Spesifikasi / Riwayat Kerusakan</label>
                <textarea
                  rows={4}
                  value={infoEditNotes}
                  onChange={(e) => setInfoEditNotes(e.target.value)}
                  placeholder="Kelistrikan stabil, baterai original, dipasangkan casing protective, dsb."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D32F2F] px-3 py-2 rounded-xl outline-none"
                />
              </div>

              {/* Current rent allocation info if Disewa */}
              {selectedItem.status === 'Disewa' && (
                <div className="bg-blue-50 border border-blue-150 p-3.5 rounded-2xl text-[11px] text-blue-850">
                  <span className="font-bold block text-blue-900">Pemegang Sewa Aktif:</span>
                  <p className="mt-1 font-semibold">{selectedItem.customerName}</p>
                  <div className="flex justify-between mt-2 font-mono text-[10px] text-blue-650">
                    <span>Mulai: {selectedItem.rentedAt}</span>
                    <span>Kembali: {selectedItem.autoReturnDate}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setInfoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveInfoUpdate}
                  className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
