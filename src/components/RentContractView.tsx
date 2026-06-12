import React, { useState, useRef, useEffect } from 'react';
import { useBilling } from '../context/BillingContext';
import { RentContract, Customer } from '../types';
import { 
  FileText, PenTool, CheckCircle, Send, Trash2, Mail, Phone, Clock,
  Plus, Search, User, Eye, Download, ShieldCheck, ChevronRight
} from 'lucide-react';

export const RentContractView: React.FC = () => {
  const { 
    contracts, customers, addContract, updateContract, deleteContract, signContract,
    logActivity, addNotification, currentUser 
  } = useBilling();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedContract, setSelectedContract] = useState<RentContract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [propertyName, setPropertyName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [rentalAmount, setRentalAmount] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('Bulanan');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Pihak Penyewa berkewajiban menjaga kebersihan dan keutuhan properti/barang selama masa sewa.\n' +
    '2. Pembayaran sewa dilakukan tepat waktu sesuai dengan ketentuan termin yang telah disepakati.\n' +
    '3. Kerusakan properti/barang sewa yang disebabkan oleh kelalaian penyewa menjadi tanggung jawab penuh penyewa.\n' +
    '4. Kontrak ini tunduk pada hukum Republik Indonesia yang berlaku secara sah.'
  );

  // Signature Canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);

  // Delivery state
  const [deliveryStatus, setDeliveryStatus] = useState<{ email?: 'idle' | 'sending' | 'success'; wa?: 'idle' | 'sending' | 'success' }>({});

  useEffect(() => {
    if (customers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(customers[0]);
    }
  }, [customers]);

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Silakan pilih pelanggan terlebih dahulu!');
      return;
    }
    if (!propertyName || !rentalAmount) {
      alert('Mohon lengkapi seluruh kolom formulir kontrak!');
      return;
    }

    try {
      const created = await addContract({
        customerId: selectedCustomer.id || selectedCustomer.customerId,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email,
        propertyName,
        startDate,
        endDate,
        rentalAmount: parseFloat(rentalAmount) || 0,
        paymentTerm,
        termsAndConditions
      });

      // Clear formulate inputs
      setPropertyName('');
      setRentalAmount('');
      setActiveTab('list');
      setSelectedContract(created);
    } catch (err) {
      console.error(err);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1E3A8A'; // Blue deep coordinates
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleElectronicSignatureSubmit = () => {
    if (!selectedContract) return;
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      alert('Silakan gambar tanda tangan Anda pada kanvas terlebih dahulu.');
      return;
    }

    const signatureBase64 = canvas.toDataURL('image/png');
    signContract(selectedContract.id, signatureBase64);
    
    // Update selected view
    setSelectedContract(prev => prev ? {
      ...prev,
      status: 'Aktif',
      signatureDrawBase64: signatureBase64,
      signedAt: new Date().toLocaleString('id-ID')
    } : null);

    setIsSignModalOpen(false);
    clearCanvas();
  };

  // Dispatchers & Reminders
  const handleSendEmail = async () => {
    if (!selectedContract) return;
    setDeliveryStatus(prev => ({ ...prev, email: 'sending' }));

    // Simulate direct dispatch
    setTimeout(async () => {
      setDeliveryStatus(prev => ({ ...prev, email: 'success' }));
      await logActivity(
        `Mengirim dokumen Kontrak Elektronik ${selectedContract.contractNumber} ke email ${selectedContract.customerEmail}`,
        'Kontrak Sewa'
      );
      await addNotification(
        'Email Kontrak Sewa Terkirim',
        `Salinan dokumen ${selectedContract.contractNumber} sukses dikirim ke ${selectedContract.customerEmail}`,
        'success'
      );
    }, 1200);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedContract) return;
    setDeliveryStatus(prev => ({ ...prev, wa: 'sending' }));

    // Precomposed professional message link
    const message = `Halo *${selectedContract.customerName}*,\n\nBerikut terlampir dokumen Kontrak Sewa Elektronik Anda dengan nomor korespondensi negara *${selectedContract.contractNumber}*.\n\n` +
      `*Rincian Sewa:*\n` +
      `- Unit/Properti: ${selectedContract.propertyName}\n` +
      `- Periode Sewa: ${selectedContract.startDate} s/d ${selectedContract.endDate}\n` +
      `- Nominal Sewa: Rp ${selectedContract.rentalAmount.toLocaleString('id-ID')} (${selectedContract.paymentTerm})\n` +
      `- Status Kontrak: *${selectedContract.status.toUpperCase()}*\n\n` +
      `Silakan pelajari kontrak dan simpan dokumen ini sebagai tanda bukti legalitas yang sah.\n\nTerima kasih atas kerja samanya.\n*FORSDIG Billing ERP System*`;

    const waLink = `https://api.whatsapp.com/send?phone=${encodeURIComponent(selectedContract.customerPhone)}&text=${encodeURIComponent(message)}`;
    
    setTimeout(async () => {
      setDeliveryStatus(prev => ({ ...prev, wa: 'success' }));
      await logActivity(
        `Mengirim tautan dokumen Kontrak Elektronik ${selectedContract.contractNumber} ke WhatsApp ${selectedContract.customerPhone}`,
        'Kontrak Sewa'
      );
      await addNotification(
        'WhatsApp Notifikasi Terkirim',
        `Pesan tanda kontrak ${selectedContract.contractNumber} diproses untuk nomor ${selectedContract.customerPhone}`,
        'success'
      );
      
      // Open in a safe real way
      window.open(waLink, '_blank');
    }, 1000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kontrak sewa ini secara permanen dari basis data?')) {
      await deleteContract(id);
      setSelectedContract(null);
    }
  };

  // Filter list
  const filteredContracts = contracts.filter(c => {
    const searchLow = searchQuery.toLowerCase();
    return (
      c.contractNumber.toLowerCase().includes(searchLow) ||
      c.customerName.toLowerCase().includes(searchLow) ||
      c.propertyName.toLowerCase().includes(searchLow)
    );
  });

  return (
    <div className="space-y-6" id="rental-contracts-view-container">
      {/* Upper header action board */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <PenTool className="text-[#D32F2F]" size={22} />
            <span>Manajemen Kontrak Sewa Elektronik</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-0.5">
            Buat draf, tanda tangani secara elektronik, dan distribusikan langsung via WhatsApp dan Email.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-0.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => { setActiveTab('list'); setSelectedContract(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'list' && !selectedContract
                ? 'bg-white text-slate-800 shadow'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar Kontrak ({contracts.length})
          </button>
          <button
            onClick={() => { setActiveTab('create'); setSelectedContract(null); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'create'
                ? 'bg-white text-slate-800 shadow'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Buat Kontrak Baru
          </button>
        </div>
      </div>

      {/* Main split dashboard view */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Contracts Sidebar List */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-150 p-4 shadow-sm h-[calc(100vh-220px)] flex flex-col">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-3.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Cari kontrak, nomor, pelanggan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-red-500 bg-slate-50"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredContracts.map(c => {
                const isSelected = selectedContract?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedContract(c);
                      setDeliveryStatus({});
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-red-400 bg-red-50/40 shadow-sm'
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#D32F2F]">
                        {c.contractNumber}
                      </span>
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded-md ${
                        c.status === 'Aktif'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : c.status === 'Draft'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-amber-50 text-amber-700 border border-amber-105'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-xs mt-2 truncate">
                      {c.propertyName}
                    </h4>
                    
                    <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-sans">
                      <span className="font-semibold text-slate-650 truncate max-w-[120px]">
                        {c.customerName}
                      </span>
                      <span className="font-bold text-slate-700">
                        Rp {c.rentalAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredContracts.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto text-slate-300 mb-2" size={28} />
                  <p className="text-xs font-semibold text-slate-400">Kontrak sewa tidak ditemukan.</p>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Legal Contract Page Rendering */}
          <div className="lg:col-span-8 flex flex-col space-y-6">
            {selectedContract ? (
              <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm min-h-[calc(100vh-220px)] flex flex-col justify-between">
                
                {/* Contract toolbar utilities */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">DETAIL KONTRAK SEWA ELEKTRONIK</span>
                    <h3 className="font-bold text-slate-800 text-sm">{selectedContract.contractNumber}</h3>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {selectedContract.status !== 'Aktif' && (
                      <button
                        onClick={() => {
                          setIsSignModalOpen(true);
                          setSignerName(selectedContract.customerName);
                        }}
                        className="px-3.5 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-red-950/10 cursor-pointer transition"
                      >
                        <PenTool size={13} />
                        <span>Tanda Tangani</span>
                      </button>
                    )}

                    {/* Integrated Delivery Channels */}
                    <button
                      onClick={handleSendEmail}
                      disabled={deliveryStatus.email === 'sending'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition border ${
                        deliveryStatus.email === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title="Kirim Salinan Kontrak via Email"
                    >
                      <Mail size={13} />
                      <span>{deliveryStatus.email === 'success' ? 'Email Terkirim' : 'Email'}</span>
                    </button>

                    <button
                      onClick={handleSendWhatsApp}
                      disabled={deliveryStatus.wa === 'sending'}
                      className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-md shadow-emerald-950/10 cursor-pointer transition"
                      title="Kirim Notifikasi via WhatsApp"
                    >
                      <Phone size={13} />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleDelete(selectedContract.id)}
                      className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                      title="Hapus Kontrak"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Simulated Paper Legal Document */}
                <div className="my-6 p-8 border border-slate-150 rounded-xl bg-slate-50/50 relative overflow-hidden font-serif leading-relaxed text-sm text-slate-800 max-w-full">
                  
                  {/* Digital Legal Watermark Background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5 rotate-12">
                    <div className="border-8 border-slate-900 rounded-full p-16 font-sans font-black text-4xl tracking-widest text-center">
                      FORSDIG LEGAL
                    </div>
                  </div>

                  <div className="text-center space-y-1 mb-8">
                    <h2 className="font-sans font-extrabold text-slate-900 text-base tracking-wide uppercase">SURAT PERJANJIAN SEWA MENYEWA</h2>
                    <p className="font-sans font-mono text-[10px] text-slate-500">Nomor Registry: {selectedContract.contractNumber}</p>
                  </div>

                  {/* Body Clauses */}
                  <div className="space-y-4 text-xs font-serif leading-relaxed">
                    <p>
                      Pada hari ini, tanggal <span className="font-sans font-semibold underline">{selectedContract.createdAt}</span>, 
                      telah diselenggarakan kesepakatan tertulis sewa menyewa elektronik antara pihak sebagai berikut:
                    </p>

                    <div className="pl-4 space-y-1 my-3 font-sans text-xs">
                      <div className="grid grid-cols-3">
                        <span className="text-slate-500 font-bold">I. NAMA PERUSAHAAN</span>
                        <span className="col-span-2 font-black">: FORSDIG Billing ERP System</span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="text-slate-500 font-bold">II. PELANGGAN / PENYEWA</span>
                        <span className="col-span-2 font-black">: {selectedContract.customerName}</span>
                      </div>
                      <div className="grid grid-cols-3">
                        <span className="text-slate-500 font-bold">CONTACT INFO</span>
                        <span className="col-span-2 font-semibold">: {selectedContract.customerEmail} / {selectedContract.customerPhone}</span>
                      </div>
                    </div>

                    <p>
                      Para pihak sepakat mengikat diri dalam kontrak sewa-menyewa atas unit/properti/barang:
                      <span className="font-sans font-bold text-slate-900 underline block my-1">
                        &ldquo;{selectedContract.propertyName}&rdquo;
                      </span>
                    </p>

                    <div className="space-y-2 my-4">
                      <h4 className="font-sans font-bold text-slate-900 text-xs">PASAL 1: PERIODE & TERMIN</h4>
                      <p className="pl-4">
                        Sewa menyewa ini berlaku terhitung mulai tanggal <span className="font-sans font-semibold underline">{selectedContract.startDate}</span> sampai 
                        dengan tanggal <span className="font-sans font-semibold underline">{selectedContract.endDate}</span>.
                      </p>
                    </div>

                    <div className="space-y-2 my-4">
                      <h4 className="font-sans font-bold text-slate-900 text-xs">PASAL 2: NILAI TRANSAKSI SEWA</h4>
                      <p className="pl-4">
                        Biaya sewa yang disetujui bersama adalah sebesar <span className="font-sans font-bold text-red-700 underline">Rp {selectedContract.rentalAmount.toLocaleString('id-ID')}</span> dengan 
                        metode penagihan berkala secara <span className="font-sans font-bold">{selectedContract.paymentTerm}</span>.
                      </p>
                    </div>

                    <div className="space-y-2 my-4">
                      <h4 className="font-sans font-bold text-slate-900 text-xs">PASAL 3: KETENTUAN KHUSUS (T&C)</h4>
                      <pre className="pl-4 whitespace-pre-wrap font-sans text-[11px] text-slate-600 leading-normal bg-white p-3 rounded-lg border border-slate-100">
                        {selectedContract.termsAndConditions}
                      </pre>
                    </div>

                    <p className="text-[10px] italic text-slate-400 font-sans mt-6">
                      Perjanjian ini dibuat dan disepakati secara sadar melalui media elektronik digital tepercaya yang diakui sah UU ITE Pasal 5 Ayat 1.
                    </p>
                  </div>

                  {/* Signatures Field Container */}
                  <div className="flex items-end justify-between mt-10 pt-6 border-t border-dashed border-slate-200">
                    <div>
                      <p className="font-sans text-[10px] text-slate-400">Pemberi Sewa,</p>
                      <div className="h-14 flex items-center">
                        <div className="border border-emerald-200 bg-emerald-50/50 px-2 py-1 rotate-1 rounded font-sans text-[9px] font-bold text-emerald-800 tracking-wider">
                          SIGNED ON CLOUD BY FORSDIG SYSTEM
                        </div>
                      </div>
                      <p className="font-sans font-bold text-xs text-slate-700">Direktur Forsdig ERP</p>
                    </div>

                    <div className="text-right">
                      <p className="font-sans text-[10px] text-slate-400">Penerima Sewa / Penyewa,</p>
                      <div className="h-16 flex items-center justify-end">
                        {selectedContract.signatureDrawBase64 ? (
                          <div className="border border-blue-100 bg-blue-50/30 p-1.5 rounded-lg max-w-[120px] shadow-sm relative">
                            <img 
                              src={selectedContract.signatureDrawBase64} 
                              alt="Tanda Tangan Elektronik"
                              className="max-h-12 w-auto border-0"
                            />
                            <span className="text-[7px] block font-mono text-blue-800 text-center scale-90 mt-0.5">
                              {selectedContract.signedAt}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-amber-500 font-sans font-bold flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                            <Clock size={10} /> Menunggu Tangan Elektronik
                          </span>
                        )}
                      </div>
                      <p className="font-sans font-bold text-xs text-slate-700">{selectedContract.customerName}</p>
                    </div>
                  </div>

                </div>

                {/* Informative system stamp footer */}
                <div className="bg-slate-50 p-4 border border-slate-150 rounded-xl flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="text-emerald-600" size={16} />
                    <span><b>Otentikasi Legalitas:</b> Kontrak dijamin aman sesuai UU ITE No 11/2008 Pasal 5.</span>
                  </div>
                  <span className="font-mono text-slate-400">SECURE: {selectedContract.id.slice(-8).toUpperCase()}</span>
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-500 shadow-sm flex flex-col justify-center items-center h-[calc(100vh-220px)]">
                <PenTool className="text-slate-300 animate-bounce mb-3" size={40} />
                <h3 className="font-bold text-slate-800 text-sm">Pilih Dokumen Kontrak Sewa</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">
                  Gunakan panel di sebelah kiri untuk melihat detail draf, memantau riwayat pengiriman PDF sewa, atau ketuk tombol di atas untuk membuat memorandum baru.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation form */}
      {activeTab === 'create' && (
        <form onSubmit={handleCreateContract} className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Draf Surat Perjanjian Sewa</h3>
            <p className="text-xs text-slate-400 mt-0.5">Lengkapi isian kesepakatan draf berikut guna diproses ke dalam nomor seri legalitas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Customer Picker */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-2">Pihak Kedua (Pelanggan / Penyewa)</label>
              <select
                value={selectedCustomer ? selectedCustomer.id : ''}
                onChange={(e) => {
                  const target = customers.find(c => c.id === e.target.value);
                  if (target) setSelectedCustomer(target);
                }}
                className="w-full border border-slate-200 outline-none p-3 text-sm rounded-xl focus:border-red-500 bg-white cursor-pointer shadow-inner"
                id="contract-customer-picker"
              >
                <option value="">-- Pilih Pelanggan Terdaftar --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.company || 'Pribadi'})</option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="mt-2 text-[10px] text-slate-400 font-semibold flex items-center gap-4 pl-1">
                  <span>Email: {selectedCustomer.email}</span>
                  <span>WA: {selectedCustomer.phone}</span>
                </div>
              )}
            </div>

            {/* Property Name */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-2">Nama Barang / Properti Sewa</label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="Contoh: Server VPS Dedicated Pro - RAM 64GB"
                className="w-full border border-slate-200 outline-none p-3 text-sm rounded-xl focus:border-red-500 bg-white"
                id="contract-property-input"
              />
            </div>

            {/* Rental Rates Details */}
            <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">Nilai Sewa (Rupiah)</label>
                <input
                  type="number"
                  value={rentalAmount}
                  onChange={(e) => setRentalAmount(e.target.value)}
                  placeholder="IDR Nominal per termin"
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 bg-white"
                  id="contract-amount-input"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">Termin Pembayaran berkala</label>
                <select
                  value={paymentTerm}
                  onChange={(e) => setPaymentTerm(e.target.value)}
                  className="w-full border border-slate-200 outline-none p-2.5 text-sm rounded-xl focus:border-red-500 bg-white cursor-pointer"
                  id="contract-term-selector"
                >
                  <option value="Sekali Bayar">Sekali Bayar (Lump Sum)</option>
                  <option value="Bulanan">Bulanan (Monthly Recurrent)</option>
                  <option value="Tahunan">Tahunan (Yearly Recurrent)</option>
                </select>
              </div>
            </div>

            {/* Date Picker Range */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-2">Tanggal Mulai Berlaku</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-200 outline-none p-3 text-sm rounded-xl focus:border-red-500 bg-white"
                id="contract-startdate-input"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-2">Tanggal Berakhir Kontrak</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-200 outline-none p-3 text-sm rounded-xl focus:border-red-500 bg-white"
                id="contract-enddate-input"
              />
            </div>

            {/* Detailed terms and conditions clauses */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-2">Pasal Syarat & Ketentuan Tambahan (T&C)</label>
              <textarea
                rows={4}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full border border-slate-200 outline-none p-3.5 text-xs rounded-xl focus:border-red-500 bg-white font-sans text-slate-650 leading-relaxed"
                id="contract-terms-textarea"
              />
            </div>

          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
            >
              Kembali ke Daftar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-red-950/10 transition"
              id="submit-contract-creator-btn"
            >
              Simpan & Terbitkan Draf
            </button>
          </div>
        </form>
      )}

      {/* Touch Signature Pad Canvas Modal */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" id="signature-canvas-modal">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 md:p-8 w-full max-w-md space-y-4">
            
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <PenTool className="text-red-600 font-black" size={16} />
                <span>Kanvas Tanda Tangan Elektronik</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Gunakan Mouse/Jari untuk menggambar tanda tangan Anda yang terenkripsi.</p>
            </div>

            {/* Canvas Element Wrapper */}
            <div className="border-2 border-dashed border-red-200 bg-slate-50 rounded-xl p-1 relative">
              <canvas
                ref={canvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-white rounded-lg cursor-crosshair h-40 block touching-none"
                id="sign-canvas-area"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Gambar Tanda Tangan Anda Disini
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Nama Terang Penandatangan</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full border border-slate-200 outline-none p-2.5 text-xs rounded-xl focus:border-red-500"
                id="signer-name-modal-input"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="px-3.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl transition"
              >
                Reset Kanvas
              </button>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!hasDrawn}
                  onClick={handleElectronicSignatureSubmit}
                  className={`px-5 py-2 rounded-xl text-xs font-extrabold shadow transition ${
                    hasDrawn
                      ? 'bg-red-650 hover:bg-red-700 text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  Sahkan Tanda Tangan
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
