import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { Plus, Edit, Trash, Search, DollarSign, Tag, Info, X, Check, FileText } from 'lucide-react';
import { Product } from '../types';

export const ProductView: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    productCategories, 
    addProductCategory, 
    updateProductCategory, 
    deleteProductCategory, 
    currentUser 
  } = useBilling();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Layanan Cloud');
  const [price, setPrice] = useState(0);
  const [tax, setTax] = useState(11); // default 11% PPN
  const [unit, setUnit] = useState('Bulan');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Product['status']>('Aktif');

  // Category management modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatValue, setEditingCatValue] = useState('');

  const categoriesList = productCategories && productCategories.length > 0
    ? productCategories
    : [
        { id: 'cat-1', name: 'Layanan Cloud' },
        { id: 'cat-2', name: 'Consulting' },
        { id: 'cat-3', name: 'Lisensi Software' },
        { id: 'cat-4', name: 'Hardware Maintenance' },
        { id: 'cat-5', name: 'Lainnya' }
      ];

  const categoriesNames = categoriesList.map(c => c.name);
  const units = ['Bulan', 'Tahun', 'Hari', 'Jam', 'Pcs', 'Proyek', 'Paket'];

  const openAddDrawer = () => {
    setEditingItem(null);
    setCode(`PROD-${products.length + 101}`);
    setName('');
    setCategory(categoriesNames[0] || 'Layanan Cloud');
    setPrice(0);
    setTax(11);
    setUnit('Bulan');
    setDescription('');
    setStatus('Aktif');
    setDrawerOpen(true);
  };

  const openEditDrawer = (item: Product) => {
    setEditingItem(item);
    setCode(item.code);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price);
    setTax(item.tax);
    setUnit(item.unit);
    setDescription(item.description);
    setStatus(item.status);
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price < 0) return;

    const payload = {
      code,
      name,
      category,
      price: Number(price),
      tax: Number(tax),
      unit,
      description,
      status
    };

    if (editingItem) {
      await updateProduct(editingItem.id, payload);
    } else {
      await addProduct(payload);
    }
    setDrawerOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini dari catalog?')) {
      await deleteProduct(id);
    }
  };

  // Computations
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                        p.code.toLowerCase().includes(search.toLowerCase()) ||
                        p.category.toLowerCase().includes(search.toLowerCase());
    
    const matchCat = categoryFilter === 'Semua' ? true : p.category === categoryFilter;

    return matchSearch && matchCat;
  });

  const isReadOnly = currentUser?.role === 'Viewer';

  return (
    <div className="space-y-6" id="products-view-main">
      
      {/* Header and Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Modul Produk & Layanan</h2>
          <p className="text-xs text-slate-500 font-medium">Atur inventaris katalog produk, paket maintenance, lisensi, dan tarif jasa billing.</p>
        </div>
        {!isReadOnly && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCategoryModalOpen(true)}
              className="flex items-center space-x-1.5 py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-sm cursor-pointer transition"
              id="manage-categories-btn"
            >
              <Tag size={15} className="text-slate-500" />
              <span>Kelola Kategori</span>
            </button>
            <button
              onClick={openAddDrawer}
              className="flex items-center space-x-1.5 py-1.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md cursor-pointer transition"
              id="add-product-btn"
            >
              <Plus size={15} />
              <span>Tambah Layanan</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search row */}
      <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari Kode, Nama Layanan, Deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
            id="product-search-input"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer w-full md:w-44"
            id="product-category-filter"
          >
            <option value="Semua">Semua Kategori</option>
            {categoriesNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-150">
              <tr>
                <th className="px-6 py-4">Kode / Layanan</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Harga Dasar</th>
                <th className="px-6 py-4">Pajak (PPN)</th>
                <th className="px-6 py-4">Satuan Tarif</th>
                <th className="px-6 py-4 text-center">Status</th>
                {!isReadOnly && <th className="px-6 py-4 text-right">Tindakan</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    Katalog produk atau layanan kosong. Sila tambahkan produk baru.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] font-mono font-bold text-red-650 mt-0.5">{p.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded border border-slate-150">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      Rp {p.price.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {p.tax > 0 ? `${p.tax}% PPN` : 'Bebas Pajak'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">/{p.unit}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                        p.status === 'Aktif' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    {!isReadOnly && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button 
                            onClick={() => openEditDrawer(p)}
                            className="p-1 text-slate-400 hover:text-red-650 rounded hover:bg-slate-100 cursor-pointer"
                            title="Edit"
                            id={`edit-prod-btn-${p.id}`}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer"
                            title="Hapus"
                            id={`delete-prod-btn-${p.id}`}
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

      {/* Add/Edit Drawer Modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-55 flex justify-end bg-black/50 overflow-hidden" id="product-form-modal">
          <div className="w-full max-w-lg bg-white h-screen flex flex-col shadow-2xl relative animate-slide-left">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                {editingItem ? 'Edit Produk / Layanan' : 'Konfigurasi Layanan Baru'}
              </h3>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                id="close-product-drawer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kode Produk (SKU) *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: SRV-ENT-05"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none"
                    id="form-product-code"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategori Catalog</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none cursor-pointer bg-white"
                    id="form-product-category"
                  >
                    {categoriesNames.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nama Produk / Layanan *</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Managed VPS Cloud Bisnis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none"
                  id="form-product-name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Harga Dasar (IDR) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                    <input 
                      type="number"
                      required
                      min={0}
                      placeholder="1500000"
                      value={price || ''}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full border border-slate-200 pl-9 pr-3 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none"
                      id="form-product-price"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pajak (PPN %)</label>
                  <input 
                    type="number"
                    min={0}
                    max={100}
                    placeholder="11"
                    value={tax === 0 ? '' : tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none"
                    id="form-product-tax"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Satuan Harga</label>
                  <select 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none cursor-pointer bg-white"
                    id="form-product-unit"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>per {u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Penjualan</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-200 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none cursor-pointer bg-white"
                    id="form-product-status"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Informasi Deskripsi Produk</label>
                <textarea 
                  placeholder="Detail spesifikasi, cakupan proyek, batas SLA, dll..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 p-2.5 text-sm rounded-xl focus:border-red-500 outline-none resize-none"
                  id="form-product-description"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  id="cancel-product-btn"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer animate-pulse-light"
                  id="save-product-btn"
                >
                  {editingItem ? 'Simpan' : 'Tambahkan'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 p-4" id="category-manager-modal">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Tag size={18} className="text-red-500" />
                <h3 className="font-bold text-base text-slate-800">Kelola Kategori Layanan</h3>
              </div>
              <button 
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
                id="close-category-modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Add New Category Form */}
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newCatName.trim()) return;
                await addProductCategory(newCatName.trim());
                setNewCatName('');
              }} className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Nama kategori baru..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full border border-slate-200 pl-3 pr-3 py-2 text-sm rounded-xl focus:border-red-500 outline-none"
                    id="new-category-input"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm cursor-pointer transition flex items-center space-x-1"
                  id="add-category-submit"
                >
                  <Plus size={14} />
                  <span>Tambah</span>
                </button>
              </form>

              {/* List of current categories */}
              <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50/50">
                {categoriesList.map((cat, idx) => (
                  <div key={cat.id || idx} className="p-3 flex items-center justify-between text-sm hover:bg-white transition">
                    <div className="flex-1 mr-2">
                      {editingCatId === cat.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingCatValue}
                            onChange={(e) => setEditingCatValue(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                await updateProductCategory(cat.id, editingCatValue);
                                setEditingCatId(null);
                              }
                            }}
                            className="flex-1 border border-slate-200 px-2 py-1 text-xs rounded-lg focus:border-red-500 outline-none bg-white"
                            id={`edit-category-input-${cat.id}`}
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              await updateProductCategory(cat.id, editingCatValue);
                              setEditingCatId(null);
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded transition cursor-pointer"
                            id={`save-category-btn-${cat.id}`}
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-700 font-medium">{cat.name}</span>
                      )}
                    </div>
                    {editingCatId !== cat.id && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatValue(cat.name);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          id={`edit-category-trigger-${cat.id}`}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
                              await deleteProductCategory(cat.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                          id={`delete-category-trigger-${cat.id}`}
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                id="close-category-manager-btn"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
