import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { 
  Plus, Trash, Search, Receipt, Calendar, Printer, Send, 
  Eye, X, Check, Mail, PhoneCall, QrCode, AlertCircle 
} from 'lucide-react';
import { Invoice, InvoiceItem, Customer, Product } from '../types';

export const InvoiceView: React.FC = () => {
  const { 
    invoices, customers, products, addInvoice, updateInvoiceStatus, deleteInvoice, settings, currentUser, cashAccounts 
  } = useBilling();

  // Navigation states
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create'>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [qrisModelOpen, setQrisModelOpen] = useState(false);

  // Search state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Creation Form State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // 14 days standard terms
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Invoice['status']>('Draft');

  // Modal selector for products inside form
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);
  const [customDiscount, setCustomDiscount] = useState(0);

  // Add Item to current building list
  const handleAddItem = () => {
    if (!selectedProduct) return;

    const basePrice = customPrice > 0 ? customPrice : selectedProduct.price;
    const taxMod = selectedProduct.tax;
    
    // Tax computation
    const totalTaxable = (basePrice * qty) - customDiscount;
    const taxAmt = Math.max(0, totalTaxable * (taxMod / 100));
    const lineTotal = totalTaxable + taxAmt;

    const newItem: InvoiceItem = {
      productId: selectedProduct.productId,
      name: selectedProduct.name,
      qty,
      price: basePrice,
      tax: taxMod,
      discount: customDiscount,
      total: lineTotal
    };

    setItems(prev => [...prev, newItem]);
    setSelectedProduct(null);
    setQty(1);
    setCustomPrice(0);
    setCustomDiscount(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Submit Invoice Form
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || items.length === 0) return;

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalTax = items.reduce((sum, item) => sum + ((item.price * item.qty - item.discount) * (item.tax / 100)), 0);
    const totalItemsDiscount = items.reduce((sum, item) => sum + item.discount, 0);

    const calculatedTotal = Math.max(0, (subtotal - totalItemsDiscount - discount) + totalTax);

    await addInvoice({
      customerId: customer.id,
      customerName: `${customer.name} - ${customer.company}`,
      invoiceDate,
      dueDate,
      subtotal,
      discount: totalItemsDiscount + discount,
      tax: totalTax,
      total: calculatedTotal,
      notes,
      items,
      status
    });

    // Reset Form
    setCustomer(null);
    setItems([]);
    setDiscount(0);
    setNotes('');
    setStatus('Draft');
    setActiveSubTab('list');
  };

  // 1. WhatsApp Notification API simulation Link builder
  const handleSendWA = (inv: Invoice) => {
    const formattedAmt = inv.total.toLocaleString('id-ID');
    const custTel = customers.find(c => c.id === inv.customerId)?.phone || '';
    const message = `Yth. Bapak/Ibu, Terlampir *Tagihan Baru ${inv.invoiceNumber}* dari *${settings.companyName}* sebesar Rp *${formattedAmt}* jatuh tempo pada *${inv.dueDate}*. Pembayaran dapat dilakukan via transfer Bank Mandiri atau scan QRIS yang tersedia. Terima kasih.`;
    const waLink = `https://wa.me/${custTel.replace(/^[0]/, '62')}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
  };

  // 2. Email Mailto link
  const handleSendEmail = (inv: Invoice) => {
    const custEmail = customers.find(c => c.id === inv.customerId)?.email || '';
    const mailSubject = `Tagihan Invoice: ${inv.invoiceNumber} - ${settings.companyName}`;
    const mailBody = `Yth. Bapak/Ibu,\n\nKami menginformasikan bahwa tagihan Invoice ${inv.invoiceNumber} telah terbit sebesar Rp ${inv.total.toLocaleString()} dengan tenggat waktu ${inv.dueDate}.\n\nHormat Kami,\n${settings.companyName}`;
    const mailLink = `mailto:${custEmail}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    window.location.href = mailLink;
  };

  // Search filtering
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
                        inv.customerName.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = statusFilter === 'Semua' ? true : inv.status === statusFilter;
    
    return matchSearch && matchStatus;
  });

  const isReadOnly = currentUser?.role === 'Viewer';

  return (
    <div className="space-y-6" id="invoices-view-main">
      
      {/* Sub navigation bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveSubTab('list')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            id="subnav-invoice-list"
          >
            Daftar Tagihan
          </button>
          {!isReadOnly && (
            <button 
              onClick={() => setActiveSubTab('create')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeSubTab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              id="subnav-invoice-create"
            >
              Terbitkan Invoice
            </button>
          )}
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400">Total: {invoices.length} Invoices</span>
        </div>
      </div>

      {activeSubTab === 'list' ? (
        <>
          {/* Filters row for Invoice List */}
          <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari No Invoice, Nama Instansi Pelanggan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 text-sm rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
                id="invoice-search-input"
              />
            </div>
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer w-full md:w-44"
                id="invoice-status-filter"
              >
                <option value="Semua">Semua Status</option>
                <option value="Draft">Draft</option>
                <option value="Dikirim">Dikirim</option>
                <option value="Belum Dibayar">Belum Dibayar</option>
                <option value="Sebagian Dibayar">Sebagian Dibayar</option>
                <option value="Lunas">Lunas</option>
                <option value="Jatuh Tempo">Jatuh Tempo</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>
          </div>

          {/* Invoice Table list */}
          <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider font-bold border-b border-slate-150">
                  <tr>
                    <th className="px-6 py-4">Nomor Invoice</th>
                    <th className="px-6 py-4">Klien / Instansi</th>
                    <th className="px-6 py-4">Tanggal / Jatuh Tempo</th>
                    <th className="px-6 py-4">Total Rupiah</th>
                    <th className="px-6 py-4">Terbayar</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4 max-w-[200px] truncate leading-normal">
                        <div className="font-semibold text-slate-805">{inv.customerName.split(' - ')[0]}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{inv.customerName.split(' - ')[1]}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700">{inv.invoiceDate}</div>
                        <div className="text-red-500 font-semibold text-[10px] mt-0.5">Tempo: {inv.dueDate}</div>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900">
                        Rp {inv.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        Rp {inv.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border ${
                          inv.status === 'Lunas' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : inv.status === 'Jatuh Tempo'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : inv.status === 'Belum Dibayar'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Preview Bill */}
                          <button 
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer"
                            title="Preview Invoice"
                            id={`view-invoice-btn-${inv.id}`}
                          >
                            <Eye size={14} />
                          </button>
                          
                          {/* Send WhatsApp */}
                          <button 
                            onClick={() => handleSendWA(inv)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-100 cursor-pointer"
                            title="Kirim Komunikasi WA"
                            id={`send-wa-${inv.id}`}
                          >
                            <Send size={14} />
                          </button>

                          {/* Action update status direct */}
                          {!isReadOnly && (
                            <select
                              value={inv.status}
                              onChange={(e) => updateInvoiceStatus(inv.id, e.target.value as any)}
                              className="text-[10px] bg-slate-50 border border-slate-250 rounded px-1.5 py-0.5 font-bold cursor-pointer text-slate-600 focus:outline-none"
                              id={`status-select-${inv.id}`}
                            >
                              <option value="Draft">Draft</option>
                              <option value="Dikirim">Dikirim</option>
                              <option value="Belum Dibayar">Belum Dibayar</option>
                              <option value="Sebagian Dibayar">Sebagian Dibayar</option>
                              <option value="Lunas">Lunas</option>
                              <option value="Jatuh Tempo">Jatuh Tempo</option>
                              <option value="Dibatalkan">Dibatalkan</option>
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-slate-400">
                        Tidak ada tagihan billing terekam.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Create Invoice Form Wrapper */
        <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
          <form onSubmit={handleSaveInvoice} className="space-y-6">
            <h3 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Receipt size={18} className="text-red-600" />
              <span>Formulir Pembuatan Tagihan Baru</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Pelanggan / Instansi *</label>
                <select
                  required
                  value={customer?.id || ''}
                  onChange={(e) => {
                    const cust = customers.find(c => c.id === e.target.value);
                    setCustomer(cust || null);
                  }}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 bg-white cursor-pointer"
                  id="form-invoice-customer"
                >
                  <option value="">-- Pilih Customer --</option>
                  {customers.filter(c => c.status === 'Aktif').map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Terbit *</label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 cursor-pointer"
                  id="form-invoice-date"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Jatuh Tempo *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 cursor-pointer"
                  id="form-invoice-due-date"
                />
              </div>
            </div>

            {/* Line Items builder */}
            <div className="border border-slate-150 p-4 rounded-xl bg-slate-50 space-y-4">
              <h4 className="font-bold text-slate-805 text-sm flex items-center gap-2">
                <span>Rincian Produk & Jasa</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-white p-3.5 rounded-xl border border-dashed border-slate-200">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Produk / Jasa</label>
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                      const prod = products.find(p => p.id === e.target.value);
                      setSelectedProduct(prod || null);
                      if (prod) {
                        setCustomPrice(prod.price);
                      }
                    }}
                    className="w-full border border-slate-200 outline-none p-2 text-xs rounded-lg bg-white cursor-pointer"
                    id="form-item-selector"
                  >
                    <option value="">-- Pilih Jasa Catalog --</option>
                    {products.filter(p => p.status === 'Aktif').map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name} (Rp {p.price.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kuantitas</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full border border-slate-200 outline-none p-1.5 text-xs rounded-lg"
                    id="form-item-qty"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="py-2 px-4 bg-slate-900 border border-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-black text-center"
                  id="add-item-to-list"
                >
                  Tambah Baris
                </button>
              </div>

              {/* Items Lines List Table */}
              <div className="overflow-x-auto bg-white rounded-xl border border-slate-100">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Deskripsi Jasa</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3">Tarif / Harga</th>
                      <th className="px-4 py-3 text-center">Pajak</th>
                      <th className="px-4 py-3">Total Sub</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-700">
                    {items.map((item, idx) => (
                      <tr key={`item-${idx}`}>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-center">{item.qty}</td>
                        <td className="px-4 py-3">Rp {item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-slate-450">{item.tax}% PPN</td>
                        <td className="px-4 py-3 font-extrabold text-slate-950">Rp {item.total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 p-0.5"
                          >
                            <Trash size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                          Belum ada rincian baris ditambahkan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculations and Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              {/* Notes */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catatan Tagihan / Keterangan</label>
                  <textarea
                    placeholder="Instruksi nomor rekening transfer bank, atau rincian pengerjaan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500 resize-none"
                    id="form-invoice-notes"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Publikasi</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 bg-white cursor-pointer"
                    id="form-invoice-status"
                  >
                    <option value="Draft">Draft (Disimpan saja)</option>
                    <option value="Dikirim">Dikirim (Belum Bayar)</option>
                    <option value="Lunas">Lunas (Langsung Cetak)</option>
                  </select>
                </div>
              </div>

              {/* Subtotal blocks */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 space-y-2 h-fit">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Subtotal Dasar:</span>
                  <span>Rp {items.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-red-650">
                  <span>Total PPN (PPN Masukan):</span>
                  <span>Rp {items.reduce((sum, item) => sum + ((item.price * item.qty - item.discount) * (item.tax / 100)), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Diskon Tambahan (IDR):</span>
                  <input
                    type="number"
                    min={0}
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-28 text-right border border-slate-200 outline-none bg-white p-1 text-xs rounded"
                    id="form-invoice-discount"
                  />
                </div>
                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between text-base font-bold text-slate-900">
                  <span>Jumlah Tagihan:</span>
                  <span>
                    Rp {Math.max(
                      0, 
                      (items.reduce((sum, item) => sum + (item.price * item.qty), 0) + 
                       items.reduce((sum, item) => sum + ((item.price * item.qty - item.discount) * (item.tax / 100)), 0) -
                       discount)
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Submissions buttons */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveSubTab('list')}
                className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                id="form-invoice-cancel"
              >
                Kembali ke List
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                id="form-invoice-submit"
              >
                Simpan & Terbitkan Tagihan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Detail Preview Modal containing full printable view */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 p-4 overflow-y-auto no-print" id="invoice-detail-preview">
          <div className="bg-white rounded-2xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl relative animate-scale-up border border-slate-100">
            {/* Modal actions bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-slate-900">{selectedInvoice.invoiceNumber}</span>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                  id="modal-print-invoice"
                >
                  <Printer size={13} />
                  <span>Cetak (Unduh PDF)</span>
                </button>
                <button 
                  onClick={() => setQrisModelOpen(true)}
                  className="flex items-center space-x-1.5 py-1.5 px-3 bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                  id="modal-show-qris"
                >
                  <QrCode size={13} />
                  <span>Scan QRIS</span>
                </button>
                <button 
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  id="close-invoice-modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Real printable Invoice Card */}
            <div className="flex-1 overflow-y-auto p-8" id="invoice-bill-print-card">
              <div className="space-y-6">
                
                {/* Header branding */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{settings.companyName}</h2>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">{settings.address}</p>
                    <p className="text-xs text-slate-400 mt-1">Telp: {settings.phone} | {settings.email}</p>
                  </div>
                  <div className="text-right sm:text-right">
                    <h1 className="text-xl font-extrabold text-red-650 uppercase tracking-wider">TAGIHAN (INVOICE)</h1>
                    <div className="text-xs font-mono font-bold text-slate-805 mt-1">{selectedInvoice.invoiceNumber}</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-1">Status: {selectedInvoice.status}</div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Bill to */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-2">Ditagihkan Kepada:</h4>
                    <p className="font-bold text-sm text-slate-900">{selectedInvoice.customerName.split(' - ')[0]}</p>
                    <p className="font-semibold text-slate-700 mt-1">{selectedInvoice.customerName.split(' - ')[1]}</p>
                    <p className="text-slate-550 mt-1 font-medium">Hub: {customers.find(c => c.id === selectedInvoice.customerId)?.phone || '-'}</p>
                    <p className="text-slate-550 font-mono mt-1 text-[10px]">NPWP: {customers.find(c => c.id === selectedInvoice.customerId)?.npwp || '-'}</p>
                  </div>
                  {/* Summary payment data */}
                  <div className="p-4 rounded-xl border border-slate-100 space-y-2">
                    <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Rincian Jatuh Tempo:</h4>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Tanggal Terbit:</span>
                      <span className="font-semibold text-slate-800">{selectedInvoice.invoiceDate}</span>
                    </div>
                    <div className="flex justify-between text-red-650">
                      <span className="font-bold">Tanggal Jatuh Tempo:</span>
                      <span className="font-extrabold">{selectedInvoice.dueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-500">Metode Penagihan:</span>
                      <span className="font-semibold text-slate-800">Transfer Bank / QRIS</span>
                    </div>
                  </div>
                </div>

                {/* Items loop */}
                <div className="border border-slate-150 rounded-xl overflow-hidden mt-6">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-150 uppercase text-[9px]">
                      <tr>
                        <th className="px-4 py-3">Nama Jasa / Lisensi</th>
                        <th className="px-4 py-3 text-center">Jumlah Qty</th>
                        <th className="px-4 py-3">Tarif Satuan</th>
                        <th className="px-4 py-3">Pajak</th>
                        <th className="px-4 py-3 text-right">Subtotal Baris</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                      {selectedInvoice.items?.map((item, idx) => (
                        <tr key={`print-item-${idx}`}>
                          <td className="px-4 py-3 text-slate-900 font-bold">{item.name}</td>
                          <td className="px-4 py-3 text-center text-slate-700">{item.qty}</td>
                          <td className="px-4 py-3">Rp {item.price.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500">{item.tax}%</td>
                          <td className="px-4 py-3 text-right text-slate-900 font-extrabold">Rp {item.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals computation */}
                <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-slate-105">
                  <div className="text-xs text-slate-500 font-semibold max-w-sm">
                    <h5 className="font-bold text-slate-850 uppercase text-[9px] mb-1">Syarat & Petunjuk Pembayaran:</h5>
                    <p className="leading-relaxed">Silakan transfer pembayaran penuh sebelum jatuh tempo ke rekening resmi kami berikut:</p>
                    <div className="mt-2 space-y-1.5 font-bold text-slate-700 bg-slate-50/70 p-2.5 rounded-lg border border-slate-150">
                      {cashAccounts.filter(acc => acc.type === 'Bank').map(acc => (
                        <div key={acc.id} className="text-[11px] leading-snug">
                          {acc.bankName} No. **{acc.accountNumber}** a.n {acc.accountName}
                        </div>
                      ))}
                      {cashAccounts.filter(acc => acc.type === 'Bank').length === 0 && (
                        <div className="text-[10px] text-slate-400">Hubungi admin keuangan untuk informasi rekening bank transfer.</div>
                      )}
                    </div>
                    <p className="mt-2 font-bold text-slate-800">Keterangan internal: {selectedInvoice.notes || '-'}</p>
                  </div>
                  
                  <div className="w-full sm:w-64 space-y-2 text-xs">
                    <div className="flex justify-between font-medium text-slate-600">
                      <span>Subtotal:</span>
                      <span>Rp {selectedInvoice.subtotal?.toLocaleString()}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between font-medium text-emerald-600">
                        <span>Diskon:</span>
                        <span>- Rp {selectedInvoice.discount?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-red-650">
                      <span>Total PPN:</span>
                      <span>Rp {selectedInvoice.tax?.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-extrabold text-slate-950">
                      <span>Grand Total:</span>
                      <span>Rp {selectedInvoice.total?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-600 text-[11px] pt-1">
                      <span>Telah Dibayar:</span>
                      <span>Rp {selectedInvoice.paidAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal actions close footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                id="close-invoice-modal-footer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QRIS Scan Modal */}
      {qrisModelOpen && (
        <div className="fixed inset-0 z-56 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-100 shadow-2xl relative animate-scale-up flex flex-col items-center">
            <h3 className="font-bold text-slate-900 text-sm mb-1 uppercase tracking-wider">Metode Pembayaran QRIS</h3>
            <p className="text-[11px] text-slate-500 font-semibold mb-4 text-center">Scan QR Code di bawah menggunakan GoPay, OVO, ShopeePay, LinkAja atau m-Banking</p>
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4 flex items-center justify-center">
              <img 
                src={settings.qrisUrl || "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=qris-demo-forsdig-billing"} 
                alt="QRIS Code" 
                className="w-48 h-48 object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>

            <button 
              onClick={() => setQrisModelOpen(false)}
              className="px-6 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer"
              id="close-qris-modal"
            >
              Tutup QRIS
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
