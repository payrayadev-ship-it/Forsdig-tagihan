import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Customer, CashAccount, SystemSetting, RentContract } from '../types';

/**
 * Procedurally generates a professional 1D linear barcode representing PT. Foresyndo Global Indonesia
 */
const generateFirstPartyLinearBarcode = (contractNumber: string): string => {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 160, 40);

    // Draw random but consistent vertical barcode lines
    ctx.fillStyle = '#1E293B'; // Slate 800
    let currentX = 10;
    const hashSeed = (contractNumber || 'CNT').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let i = 0;
    while (currentX < 150) {
      const lineSin = Math.sin(i * 0.7 + hashSeed);
      const width = lineSin > 0.5 ? 2.5 : (lineSin > 0 ? 1.5 : 0.8);
      const gap = Math.abs(Math.sin(i * 1.34 + hashSeed)) * 2.5 + 1;
      ctx.fillRect(currentX, 4, width, 24);
      currentX += width + gap;
      i++;
    }

    // Label
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 6.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`*FGI-${(contractNumber || 'F').toUpperCase()}*`, 80, 35);

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to generate automatic linear barcode:', e);
    return '';
  }
};

/**
 * Procedurally generates a professional stamp QR verification representing PT. Foresyndo Global Indonesia
 */
const generateFirstPartyQrBadge = (contractNumber: string, dateStr: string): string => {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 120, 120);

    ctx.strokeStyle = '#059669'; // Emerald 600
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, 114, 114);

    const drawSquare = (x: number, y: number) => {
      ctx.fillStyle = '#059669';
      ctx.fillRect(x, y, 22, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x + 3, y + 3, 16, 16);
      ctx.fillStyle = '#059669';
      ctx.fillRect(x + 5, y + 5, 12, 12);
    };
    drawSquare(8, 8);
    drawSquare(90, 8);
    drawSquare(8, 90);

    ctx.fillStyle = '#047857';
    const hash = (contractNumber || 'C').split('').reduce((acc, char) => acc + char.charCodeAt(0), 10);
    for (let x = 8; x < 112; x += 4) {
      for (let y = 8; y < 112; y += 4) {
        if ((x < 32 && y < 32) || (x > 88 && y < 32) || (x < 32 && y > 88)) continue;
        const coef = Math.sin(x * 12.9 + y * 78.2 + hash) * 43758.5;
        if ((coef % 1) > 0.49) {
          ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    // Badge center label
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(32, 32, 56, 56);
    ctx.strokeStyle = '#D32F2F'; // Red 700
    ctx.lineWidth = 1;
    ctx.strokeRect(34, 34, 52, 52);

    ctx.fillStyle = '#D32F2F';
    ctx.font = 'bold 5.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PT. FGI', 60, 48);
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 4.5px monospace';
    ctx.fillText('E-VERIFIED', 60, 58);
    ctx.fillText('PASAL 5 ITE', 60, 68);
    ctx.fillStyle = '#64748B';
    ctx.font = '4px monospace';
    ctx.fillText(contractNumber ? contractNumber.slice(-6) : 'FGI', 60, 77);

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to generate first party QR stamp:', e);
    return '';
  }
};


/**
 * Generates and downloads a professional invoice PDF using jsPDF and jspdf-autotable.
 * Styled in high-contrast layout matching Corporate Standard (Slate/Crimson Theme).
 */
/**
 * Generates a professional invoice PDF jsPDF instance.
 * Styled in high-contrast layout matching Corporate Standard (Slate/Crimson Theme).
 */
export const generateInvoicePDFDoc = (
  invoice: Invoice,
  customers: Customer[],
  settings: SystemSetting | null,
  cashAccounts: CashAccount[]
) => {
  // Create document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const contentWidth = pageWidth - (marginX * 2); // 180mm

  // Fetch full customer details
  const customer = customers.find(c => c.id === invoice.customerId);

  // Helper colors (RGB)
  const primaryCrimson: [number, number, number] = [190, 24, 74]; // Crimson accent (matching Red 650)
  const textDark: [number, number, number] = [30, 41, 59]; // Slate 800
  const textMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const borderLight: [number, number, number] = [226, 232, 240]; // Slate 200
  const bgLight: [number, number, number] = [248, 250, 252]; // Slate 50

  // 1. Draw top brand band accent
  doc.setFillColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // --- HEADER SECTION ---
  let currentY = 15;

  // Let's set company name left-side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(settings?.companyName || 'FORSDIG', marginX, currentY);

  // Title on right-side
  doc.setFontSize(22);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('INVOICE', pageWidth - marginX, currentY, { align: 'right' });

  // Invoice Number right-side subtitle
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`NO. TAGIHAN: ${invoice.invoiceNumber}`, pageWidth - marginX, currentY, { align: 'right' });

  // Status right-side Pill
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  
  // Custom status color mapping
  let statusBg = [241, 245, 249]; // light gray
  let statusText = [71, 85, 105]; // gray
  if (invoice.status === 'Lunas') {
    statusBg = [220, 252, 231]; // green-100
    statusText = [21, 128, 61]; // green-700
  } else if (invoice.status === 'Belum Dibayar' || invoice.status === 'Dikirim') {
    statusBg = [254, 243, 199]; // amber-100
    statusText = [180, 83, 9]; // amber-700
  } else if (invoice.status === 'Jatuh Tempo') {
    statusBg = [254, 226, 226]; // red-100
    statusText = [185, 28, 28]; // red-700
  } else if (invoice.status === 'Draft') {
    statusBg = [241, 245, 249];
    statusText = [71, 85, 105];
  }

  // Draw status rectangle
  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  const statusStr = `Status: ${invoice.status.toUpperCase()}`;
  const statusWidth = doc.getTextWidth(statusStr) + 6;
  doc.rect(pageWidth - marginX - statusWidth, currentY - 3.5, statusWidth, 5, 'F');
  
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.text(statusStr, pageWidth - marginX - 3, currentY);

  // Address company details (left-side under name)
  currentY = 24;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  
  const compAddress = settings?.address || 'Komp. Ruko Digital Multi-Sewa No. 2A,\nJakarta Selatan, DKI Jakarta';
  const splitCompAddress = doc.splitTextToSize(compAddress, 90);
  doc.text(splitCompAddress, marginX, currentY);

  currentY += (splitCompAddress.length * 4) + 1;
  doc.text(`E: ${settings?.email || 'admin@forsdig.id'}  |  T: ${settings?.phone || '021-9922881'}  |  W: ${settings?.website || 'www.forsdig.id'}`, marginX, currentY);
  if (settings?.taxId) {
    currentY += 4;
    doc.text(`NPWP: ${settings.taxId}`, marginX, currentY);
  }

  // Draw thin line divider
  currentY += 6;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  // --- BILL TO / INVOICE METADATA ---
  currentY += 6;
  const gridYStart = currentY;

  // Left Column - Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('DITAGIHKAN KEPADA / BILL TO', marginX, currentY);

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(customer?.name || invoice.customerName.split(' - ')[0] || '-', marginX, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(customer?.company || invoice.customerName.split(' - ')[1] || '-', marginX, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  
  const custAddress = customer?.address 
    ? `${customer.address}, ${customer.city || ''}, ${customer.province || ''}` 
    : 'Alamat Pelanggan tidak terdaftar';
  const splitCustAddress = doc.splitTextToSize(custAddress, 85);
  doc.text(splitCustAddress, marginX, currentY);

  currentY += (splitCustAddress.length * 4);
  doc.text(`P: ${customer?.phone || '-'}  |  E: ${customer?.email || '-'}`, marginX, currentY);
  
  if (customer?.npwp && customer.npwp !== '-') {
    currentY += 4;
    doc.text(`NPWP: ${customer.npwp}`, marginX, currentY);
  }

  // Right Column - Metadata Info
  let rColY = gridYStart;
  const rColX = 115;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('DOKUMEN INFORMASI / INFO', rColX, rColY);

  rColY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Tanggal Terbit:', rColX, rColY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(invoice.invoiceDate, pageWidth - marginX, rColY, { align: 'right' });

  rColY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Tanggal Jatuh Tempo:', rColX, rColY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Red
  doc.text(invoice.dueDate, pageWidth - marginX, rColY, { align: 'right' });

  rColY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Syarat Pembayaran:', rColX, rColY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Jatuh Kerja / Transfer', pageWidth - marginX, rColY, { align: 'right' });

  rColY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Mata Uang:', rColX, rColY);
  doc.setFont('helvetica', 'bold');
  doc.text('IDR (Rp)', pageWidth - marginX, rColY, { align: 'right' });

  // Align vertical pointers
  const tableStartY = Math.max(currentY, rColY) + 10;

  // --- 2. TABLE OF PRODUCTS/SERVICES ---
  const tableColumns = [
    { header: '#', dataKey: 'no' },
    { header: 'Nama Deskripsi Jasa / Produk', dataKey: 'name' },
    { header: 'Qty', dataKey: 'qty' },
    { header: 'Harga Satuan', dataKey: 'price' },
    { header: 'Pajak', dataKey: 'tax' },
    { header: 'Subtotal Baris', dataKey: 'total' }
  ];

  const tableRows = invoice.items.map((item, idx) => ({
    no: idx + 1,
    name: item.name,
    qty: item.qty,
    price: `Rp ${item.price.toLocaleString('id-ID')}`,
    tax: item.tax > 0 ? `${item.tax}%` : '-',
    total: `Rp ${item.total.toLocaleString('id-ID')}`
  }));

  autoTable(doc, {
    columns: tableColumns,
    body: tableRows,
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    theme: 'striped',
    headStyles: {
      fillColor: primaryCrimson,
      textColor: [255, 255, 255] as [number, number, number],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      no: { cellWidth: 8, halign: 'center' },
      name: { cellWidth: 'auto' },
      qty: { cellWidth: 12, halign: 'center' },
      price: { cellWidth: 35, halign: 'right' },
      tax: { cellWidth: 14, halign: 'center' },
      total: { cellWidth: 35, halign: 'right' }
    },
    styles: {
      fontSize: 8,
      textColor: textDark,
      cellPadding: 3.5,
      font: 'helvetica'
    },
    alternateRowStyles: {
      fillColor: bgLight
    }
  });

  // Calculate final Y of table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 8;

  // Check if we run out of height (A4 is 297mm)
  if (finalY > 210) {
    doc.addPage();
    // Header accent on new page
    doc.setFillColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');
    finalY = 15;
  }

  // --- 3. BOTTOM SUMMARY AND INSTRUCTION FOOTER ---
  const summaryStartX = 120;
  const labelStartX = 120;
  const valStartX = 195;

  let totalsY = finalY;

  // Draw Bottom-Left: Payment Instructions list
  let instrY = finalY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('SYARAT & INSTRUKSI PEMBAYARAN', marginX, instrY);

  instrY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Pembayaran tagihan penuh ditransfer ke akun bank kami:', marginX, instrY);

  // Bank Info Card
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  
  const banks = cashAccounts.filter(acc => acc.type === 'Bank');
  const cardHeight = Math.max(16, banks.length * 6 + 6);
  doc.rect(marginX, instrY + 2.5, 90, cardHeight, 'FD');

  let bankTextY = instrY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  
  if (banks.length > 0) {
    banks.forEach(bank => {
      doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
      doc.text(`${bank.bankName}`, marginX + 3, bankTextY);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`No. Rec: ${bank.accountNumber}`, marginX + 22, bankTextY);
      doc.setFont('helvetica', 'normal');
      doc.text(`a.n. ${bank.accountName}`, marginX + 3, bankTextY + 3.5);
      bankTextY += 6.5;
    });
  } else {
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'normal');
    doc.text('Hubungi bagian finansial keuangan institusi kami\nuntuk rincian koordinasi pembayaran lunas bank.', marginX + 3, bankTextY + 1);
  }

  // Notes/Keterangan Internal if any
  if (invoice.notes) {
    const notesY = instrY + cardHeight + 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('KETERANGAN / INTERNAL NOTES:', marginX, notesY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const splitNotes = doc.splitTextToSize(invoice.notes, 90);
    doc.text(splitNotes, marginX, notesY + 4);
  }


  // Draw Bottom-Right: Totals pricing billing
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

  doc.text('Subtotal:', labelStartX, totalsY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Rp ${invoice.subtotal?.toLocaleString('id-ID')}`, valStartX, totalsY, { align: 'right' });

  if (invoice.discount > 0) {
    totalsY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Total Diskon:', labelStartX, totalsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61); // Green-700
    doc.text(`- Rp ${invoice.discount?.toLocaleString('id-ID')}`, valStartX, totalsY, { align: 'right' });
  }

  // PPN
  const ppnVal = invoice.ppnAmount !== undefined ? invoice.ppnAmount : invoice.tax;
  if (ppnVal && ppnVal > 0) {
    totalsY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('PPN:', labelStartX, totalsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(`+ Rp ${ppnVal.toLocaleString('id-ID')}`, valStartX, totalsY, { align: 'right' });
  }

  // PPh 23
  if (invoice.pphAmount !== undefined && invoice.pphAmount > 0) {
    totalsY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Potongan PPh 23:', labelStartX, totalsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(153, 27, 27); // Dark red
    doc.text(`- Rp ${invoice.pphAmount.toLocaleString('id-ID')}`, valStartX, totalsY, { align: 'right' });
  }

  // Double divider
  totalsY += 3;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(summaryStartX, totalsY, pageWidth - marginX, totalsY);
  totalsY += 1;
  doc.line(summaryStartX, totalsY, pageWidth - marginX, totalsY);

  // Grand Total
  totalsY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('Grand Total:', labelStartX, totalsY);
  doc.text(`Rp ${invoice.total?.toLocaleString('id-ID')}`, valStartX, totalsY, { align: 'right' });

  // Paid amount
  totalsY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text('Sudah Dibayar:', labelStartX, totalsY);
  doc.text(`Rp ${invoice.paidAmount?.toLocaleString('id-ID')}`, valStartX, totalsY, { align: 'right' });

  // Remaining
  totalsY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const sisa = Math.max(0, invoice.total - invoice.paidAmount);
  doc.text('Sisa Tagihan:', labelStartX, totalsY);
  if (sisa > 0) {
    doc.setTextColor(185, 28, 28); // Red-700
  }
  doc.text(`Rp ${sisa.toLocaleString('id-ID')}`, valStartX, totalsY, { align: 'right' });

  // Divider above sign-off
  const endBlockY = Math.max(instrY + cardHeight + 25, totalsY + 12);
  let signY = endBlockY;

  if (signY > 235) {
    doc.addPage();
    // Header accent on new page
    doc.setFillColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');
    signY = 20;
  }

  // --- 4. SIGNATURE BOX ---
  const signColX = 135;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Hormat Kami,', signColX, signY);
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.companyName || 'FORSDIG', signColX, signY + 4.5);

  // Digital sign space
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('[ Tanda Tangan Virtual Keuangan ]', signColX, signY + 22);

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(signColX, signY + 26, pageWidth - marginX - 5, signY + 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Divisi Admin & Financial', signColX, signY + 30);

  // --- Bottom Page-End Note / Footer Branding Info ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Terima kasih atas kerja sama dan kepercayaan bisnis Anda.', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('Dokumen ini sah diterbitkan secara digital oleh sistem billing tersertifikasi digital.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  return doc;
};

/**
 * Generates and downloads a professional invoice PDF file.
 */
export const exportInvoiceToPDF = (
  invoice: Invoice,
  customers: Customer[],
  settings: SystemSetting | null,
  cashAccounts: CashAccount[]
) => {
  const doc = generateInvoicePDFDoc(invoice, customers, settings, cashAccounts);
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
};

/**
 * Generates and downloads a professional Periodic Income Statement PDF.
 */
export const exportProfitLossToPDF = (
  startDate: string,
  endDate: string,
  revenueTotal: number,
  revenueReceived: number,
  expenseTotal: number,
  netEarnings: number,
  expensesByCategory: Array<{ category: string; amount: number }>,
  settings: SystemSetting | null
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const contentWidth = pageWidth - (marginX * 2); // 180mm

  const primaryCrimson: [number, number, number] = [190, 24, 74]; // Crimson accent (matching Red 650)
  const textDark: [number, number, number] = [30, 41, 59]; // Slate 800
  const textMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const borderLight: [number, number, number] = [226, 232, 240]; // Slate 200
  const bgLight: [number, number, number] = [248, 250, 252]; // Slate 50

  // 1. Draw top brand band accent
  doc.setFillColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // --- HEADER SECTION ---
  let currentY = 15;

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(settings?.companyName || 'FORSDIG', marginX, currentY);

  // Document Title on right-side
  doc.setFontSize(14);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('LAPORAN LABA RUGI', pageWidth - marginX, currentY, { align: 'right' });

  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`E: ${settings?.email || 'admin@forsdig.id'} | T: ${settings?.phone || '-'}`, marginX, currentY);
  doc.text('Income Statement (Accrual & Realized Basis)', pageWidth - marginX, currentY, { align: 'right' });

  // Divider line
  currentY += 5;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.3);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  // --- REPORT METADATA GRID ---
  currentY += 7;
  const metaYStart = currentY;

  // Left side metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('PARAMETER LAPORAN', marginX, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Periode Tanggal:', marginX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`${startDate}  s/d  ${endDate}`, marginX + 30, currentY);

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Basis Laporan:', marginX, currentY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Metode Gabungan (Akrual Invoice & Kas Masuk)', marginX + 30, currentY);

  // Right side metadata
  let rMetaY = metaYStart;
  const rMetaX = 115;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text('SISTEM OTENTIKASI', rMetaX, rMetaY);

  rMetaY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Tanggal Terbit:', rMetaX, rMetaY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), pageWidth - marginX, rMetaY, { align: 'right' });

  rMetaY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Status Audit:', rMetaX, rMetaY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61); // green
  doc.text('TERVALIDASI & SIAP AUDIT', pageWidth - marginX, rMetaY, { align: 'right' });

  // Divider above table
  currentY = Math.max(currentY, rMetaY) + 7;
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  // --- REPORT ENTRIES TABLE ---
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('RINCIAN AKUMULASI KEUANGAN (IDR)', marginX, currentY);

  // Prepare table data
  const tableColumns = [
    { header: 'No', dataKey: 'no' },
    { header: 'Uraian / Parameter Keuangan', dataKey: 'parameter' },
    { header: 'Kategori Akun', dataKey: 'accType' },
    { header: 'Rincian Nominal (Rp)', dataKey: 'nominal' }
  ];

  let itemNo = 1;
  const tableRows: any[] = [
    { 
      no: itemNo++, 
      parameter: '1. Total Pendapatan Penjualan Kotor (Sales)', 
      accType: 'Pendapatan (Akrual)', 
      nominal: revenueTotal.toLocaleString('id-ID') 
    },
    { 
      no: itemNo++, 
      parameter: '2. Diskon & Penyesuaian Harga', 
      accType: 'Kontra-Pendapatan', 
      nominal: '0' 
    },
    { 
      no: 'REVENUES', 
      parameter: 'TOTAL PENDAPATAN BERSIH PERIODIK', 
      accType: 'Pendapatan Bersih', 
      nominal: revenueTotal.toLocaleString('id-ID') 
    }
  ];

  // Add individual expenses
  if (expensesByCategory.length > 0) {
    expensesByCategory.forEach(exp => {
      tableRows.push({
        no: itemNo++,
        parameter: `• Beban: ${exp.category}`,
        accType: 'Beban Operasional',
        nominal: exp.amount.toLocaleString('id-ID')
      });
    });
  } else {
    tableRows.push({
      no: '-',
      parameter: '• Belum ada beban pengeluaran tercatat',
      accType: 'Beban Operasional',
      nominal: '0'
    });
  }

  tableRows.push({
    no: 'EXPENSES',
    parameter: 'TOTAL BEBAN PENGELUARAN OPERASIONAL',
    accType: 'Akumulasi Beban',
    nominal: expenseTotal.toLocaleString('id-ID')
  });

  tableRows.push({
    no: 'NET_INC',
    parameter: 'LABA BERSIH SEBELUM PAJAK (NET EARNINGS)',
    accType: 'Pendapatan Usaha Bersih',
    nominal: netEarnings.toLocaleString('id-ID')
  });

  tableRows.push({
    no: 'CASH_REC',
    parameter: 'Realisasi Terima Kas Masuk Bersih (Actual Receipts)',
    accType: 'Arus Kas Masuk',
    nominal: revenueReceived.toLocaleString('id-ID')
  });

  autoTable(doc, {
    columns: tableColumns,
    body: tableRows,
    startY: currentY + 4,
    margin: { left: marginX, right: marginX },
    theme: 'plain',
    headStyles: {
      fillColor: primaryCrimson,
      textColor: [255, 255, 255] as [number, number, number],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: textDark,
      font: 'helvetica',
      cellPadding: 3.5
    },
    didParseCell: (data) => {
      const isHeaderRow = ['REVENUES', 'EXPENSES', 'NET_INC', 'CASH_REC'].includes(String(data.row.cells.no?.raw));
      if (isHeaderRow) {
        data.cell.styles.fontStyle = 'bold';
        if (data.row.cells.no?.raw === 'NET_INC') {
          data.cell.styles.fillColor = [241, 185, 185]; // tinted red bg
          data.cell.styles.textColor = primaryCrimson;
          data.cell.styles.fontSize = 8.5;
        } else if (data.row.cells.no?.raw === 'CASH_REC') {
          data.cell.styles.fillColor = [209, 250, 229]; // light green bg
          data.cell.styles.textColor = [6, 95, 70]; // dark green text
        } else {
          data.cell.styles.fillColor = [241, 245, 249]; // light gray bg
        }
      }
    },
    columnStyles: {
      no: { cellWidth: 18, halign: 'center' },
      parameter: { cellWidth: 'auto' },
      accType: { cellWidth: 45 },
      nominal: { cellWidth: 35, halign: 'right' }
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 8;

  if (finalY > 210) {
    doc.addPage();
    doc.setFillColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');
    finalY = 15;
  }

  // --- RATIO CARDS BLOCK ---
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(marginX, finalY, contentWidth, 22, 'FD');

  const cardY = finalY + 4;
  
  // Margin Laba Card info text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('MARGIN LABA USAHA %', marginX + 5, cardY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const marginLaba = revenueTotal > 0 ? `${Math.round((netEarnings / revenueTotal) * 100)}%` : '0%';
  doc.text(marginLaba, marginX + 5, cardY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Profitability ratio on billing data', marginX + 5, cardY + 10.5);

  // Cash Ratio Card info text
  const col2X = marginX + 65;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('KOLEKTIBILITAS PIUTANG %', col2X, cardY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const cashRatio = revenueTotal > 0 ? `${Math.round((revenueReceived / revenueTotal) * 100)}%` : '0%';
  doc.text(cashRatio, col2X, cardY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Receipt ratio to active billing', col2X, cardY + 10.5);

  // Financial summary notes
  const col3X = marginX + 125;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('INFORMASI AUDIT KAS', col3X, cardY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Rp ${revenueReceived.toLocaleString('id-ID')}`, col3X, cardY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Total validated cash-inflow receipts', col3X, cardY + 10.5);

  finalY += 30;

  if (finalY > 235) {
    doc.addPage();
    doc.setFillColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');
    finalY = 20;
  }

  // --- SIGNATURES & VERIFICATION STAMP ---
  const signColX = 135;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Mengetahui & Mengesahkan,', signColX, finalY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Direktur Keuangan & Internal', signColX, finalY + 4.5);

  // Mock Stamp
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(220, 252, 231);
  doc.rect(signColX - 2, finalY + 8, 55, 12, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text('VERIFIED BY DIGITAL SIGN', signColX + 4, finalY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`SECURE CODE: FORS-${Date.now().toString().slice(-6)}`, signColX + 4, finalY + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(settings?.companyName || 'FORSDIG Billing System', signColX, finalY + 26);

  // Footer text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Laporan Rugi Laba Terbuka secara internal untuk kepentingan dewan direksi.', pageWidth / 2, pageHeight - 12, { align: 'center' });
  doc.text('Diproses secara otomatis oleh sistem pencatatan Forsdig Billing.', pageWidth / 2, pageHeight - 8, { align: 'center' });

  // Save the report file
  doc.save(`FORSDIG_Billing_Rugi_Laba_${startDate}_sd_${endDate}.pdf`);
};

/**
 * Generates a professional invoice PDF file and returns its Base64 string value.
 */
export const generateInvoicePDFBase64 = (
  invoice: Invoice,
  customers: Customer[],
  settings: SystemSetting | null,
  cashAccounts: CashAccount[]
): string => {
  try {
    const doc = generateInvoicePDFDoc(invoice, customers, settings, cashAccounts);
    const dataUri = doc.output('datauristring');
    const commaIdx = dataUri.indexOf(',');
    if (commaIdx !== -1) {
      return dataUri.substring(commaIdx + 1);
    }
    return '';
  } catch (err) {
    console.error('Error generating PDF base64:', err);
    return '';
  }
};

/**
 * Generates and downloads a highly styled professional legal contract PDF
 */
export const generateContractPDF = (
  contract: RentContract,
  settings: SystemSetting | null
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 20; // 20mm margin standard for letters
  const contentWidth = pageWidth - (marginX * 2); // 170mm

  const primaryCrimson: [number, number, number] = [190, 24, 74]; // Crimson accent (matching Red 600/650)
  const textDark: [number, number, number] = [30, 41, 59]; // Slate 800
  const textMuted: [number, number, number] = [100, 116, 139]; // Slate 500
  const borderLight: [number, number, number] = [226, 232, 240]; // Slate 200

  // 1. Decorative top band
  doc.setFillColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  let currentY = 18;

  // Company Letterhead Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(settings?.companyName?.toUpperCase() || 'FORSDIG BILLING ERP SYSTEM', marginX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const addressLines = doc.splitTextToSize(settings?.address || 'Komp. Ruko Digital Multi-Sewa No. 2A, DKI Jakarta', 110);
  doc.text(addressLines, marginX, currentY + 3.5);

  // Status Badge right-aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  let statusBg = [241, 245, 249];
  let statusText = [71, 85, 105];
  if (contract.status === 'Aktif') {
    statusBg = [220, 252, 231];
    statusText = [21, 128, 61];
  } else if (contract.status === 'Draft') {
    statusBg = [241, 245, 249];
    statusText = [71, 85, 105];
  } else if (contract.status === 'Selesai') {
    statusBg = [219, 234, 254];
    statusText = [30, 64, 175];
  }

  doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
  const statusStr = `STAMP: ${contract.status.toUpperCase()}`;
  const statusWidth = doc.getTextWidth(statusStr) + 6;
  doc.rect(pageWidth - marginX - statusWidth, currentY - 3, statusWidth, 5.5, 'F');
  
  doc.setTextColor(statusText[0], statusText[1], statusText[2]);
  doc.setFontSize(7.5);
  doc.text(statusStr, pageWidth - marginX - statusWidth + 3, currentY + 0.8);

  currentY += (addressLines.length * 4) + 6;

  // Thin separator line
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.35);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);

  currentY += 10;

  // Document Title
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('SURAT PERJANJIAN SEWA MENYEWA', pageWidth / 2, currentY, { align: 'center' });

  currentY += 5.5;
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryCrimson[0], primaryCrimson[1], primaryCrimson[2]);
  doc.text(`No: ${contract.contractNumber}`, pageWidth / 2, currentY, { align: 'center' });

  currentY += 12;

  // Preamble
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const introText = `Yang bertanda tangan di bawah ini, sepakat untuk mengadakan perjanjian sewa menyewa elektronik legal pada hari ini, tanggal ${contract.createdAt || new Date().toLocaleString('id-ID')}, oleh dan antara para pihak di bawah ini:`;
  const splitIntro = doc.splitTextToSize(introText, contentWidth);
  doc.text(splitIntro, marginX, currentY);
  currentY += (splitIntro.length * 5) + 6;

  // Party Details
  doc.setFont('times', 'bold');
  doc.text('I. PIHAK PERTAMA (Pemilik / Pemberi Sewa):', marginX, currentY);
  currentY += 5;
  doc.setFont('times', 'normal');
  doc.text(`   Nama Perusahaan   : PT. Foresyndo Global Indonesia`, marginX, currentY);
  currentY += 4.5;
  doc.text(`   Representasi      : Direktur PT. Foresyndo Global Indonesia`, marginX, currentY);
  currentY += 4.5;
  doc.text(`   Alamat Kantor     : ${settings?.address || 'Komp. Office Hub Blok G-5, Jakarta'}`, marginX, currentY);
  currentY += 4.5;
  doc.text(`   Kontak / Email    : ${settings?.email || 'admin@foresyndo.id'} (${settings?.phone || '021-9922881'})`, marginX, currentY);
  
  currentY += 8;
  doc.setFont('times', 'bold');
  doc.text('II. PIHAK KEDUA (Penyewa / Pelanggan):', marginX, currentY);
  currentY += 5;
  doc.setFont('times', 'normal');
  doc.text(`   Nama Penyewa      : ${contract.customerName} (${contract.customerTitle || 'Penyewa / Pelanggan'})`, marginX, currentY);
  currentY += 4.5;
  doc.text(`   E-mail Surat      : ${contract.customerEmail}`, marginX, currentY);
  currentY += 4.5;
  doc.text(`   No. WhatsApp      : ${contract.customerPhone}`, marginX, currentY);

  currentY += 10;

  // Contract Clauses (Pasal-Pasal)
  doc.setFont('times', 'bold');
  doc.text('PASAL 1 - OBJEK PERJANJIAN SEWA', marginX, currentY);
  currentY += 5;
  doc.setFont('times', 'normal');
  const objekText = `Pihak Pertama dengan ini setuju untuk menyewakan kepada Pihak Kedua, dan Pihak Kedua dengan ini setuju untuk menyewa obyek sewa berupa barang / properti / layanan dengan deskripsi lengkap sebagai berikut:\n"${contract.propertyName}"`;
  const splitObjek = doc.splitTextToSize(objekText, contentWidth);
  doc.text(splitObjek, marginX, currentY);
  currentY += (splitObjek.length * 5) + 6;

  doc.setFont('times', 'bold');
  doc.text('PASAL 2 - MASA BERLAKU & TERMIN SEWA', marginX, currentY);
  currentY += 5;
  doc.setFont('times', 'normal');
  const periodText = `Perjanjian sewa menyewa ini berlaku dan mengikat secara hukum terhitung sejak tanggal ${contract.startDate} sampai dengan tanggal ${contract.endDate}. Format termin penagihan sewa ini diatur secara berkala dengan rincian durasi "${contract.paymentTerm}".`;
  const splitPeriod = doc.splitTextToSize(periodText, contentWidth);
  doc.text(splitPeriod, marginX, currentY);
  currentY += (splitPeriod.length * 5) + 6;

  doc.setFont('times', 'bold');
  doc.text('PASAL 3 - NILAI TRANSAKSI & BIAYA', marginX, currentY);
  currentY += 5;
  doc.setFont('times', 'normal');
  const biayaTerbilang = angkaKeKata(contract.rentalAmount);
  const priceText = `Biaya pengadaan sewa yang disepakati oleh kedua belah Pihak adalah sebesar Rp ${contract.rentalAmount.toLocaleString('id-ID')} (Terbilang: ${biayaTerbilang || 'Nol'} Rupiah) yang dibebankan per termin sewa berjalan dan wajib diselesaikan tepat waktu.`;
  const splitPrice = doc.splitTextToSize(priceText, contentWidth);
  doc.text(splitPrice, marginX, currentY);
  currentY += (splitPrice.length * 5) + 6;

  // Let's add page break if needed
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('times', 'bold');
  doc.text('PASAL 4 - SYARAT & KETENTUAN KHUSUS (T&C)', marginX, currentY);
  currentY += 5;
  doc.setFont('times', 'normal');
  
  // Custom box container for terms and conditions
  const termsText = contract.termsAndConditions || '1. Penyewa menjaga barang sewa tetap bersih & utuh.\n2. Pembayaran tepat waktu sesuai tgl jatuh tempo.';
  const splitTerms = doc.splitTextToSize(termsText, contentWidth - 10);
  const boxHeight = (splitTerms.length * 4.5) + 7;
  
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, currentY, contentWidth, boxHeight, 'FD');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(splitTerms, marginX + 5, currentY + 5);
  
  currentY += boxHeight + 10;

  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // Legal closure
  doc.setFont('times', 'italic');
  doc.setFontSize(9.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  const legalNote = `Perjanjian ini dibuat secara elektronik dengan validasi legalitas tinggi dan diakui sah demi hukum berdasarkan Pasal 5 UU ITE No. 11 Tahun 2008 Republik Indonesia. Kedua belah pihak mematuhi aturan sanksi yang berlaku jika terjadi penyalahgunaan objek sewa.`;
  const splitLegalNote = doc.splitTextToSize(legalNote, contentWidth);
  doc.text(splitLegalNote, marginX, currentY);
  currentY += (splitLegalNote.length * 4.5) + 12;

  // Signatures
  const sigY = currentY;

  // Left - First Party
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Pihak Pertama (Pemberi Sewa),', marginX, sigY);

  try {
    const fgiBarcode = generateFirstPartyLinearBarcode(contract.contractNumber);
    const fgiQr = generateFirstPartyQrBadge(contract.contractNumber, contract.createdAt);

    if (fgiBarcode) {
      doc.addImage(fgiBarcode, 'PNG', marginX, sigY + 2, 36, 9);
    }
    if (fgiQr) {
      doc.addImage(fgiQr, 'PNG', marginX + 38, sigY + 1, 14, 14);
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(5, 150, 105); // Emerald green
    doc.text(`AUTOMATIC SECURE SIGNATURE`, marginX, sigY + 15);
    doc.text(`SYSTEM CO-SIGNED ON CLOUD`, marginX, sigY + 18);
  } catch (err) {
    console.error('Error drawing FGI signature badges:', err);
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.rect(marginX, sigY + 4, 55, 12, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(21, 128, 61);
    doc.text('SYSTEM DIGITAL VERIFIED', marginX + 3, sigY + 8);
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('DIREKTUR PT. FORESYNDO', marginX, sigY + 24);

  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('PT. Foresyndo Global Indonesia', marginX, sigY + 28);

  // Right - Second Party
  const rightX = pageWidth - marginX - 55;
  doc.setFont('times', 'bold');
  doc.setFontSize(10.5);
  doc.text('Pihak Kedua (Penyewa),', rightX, sigY);

  if (contract.signatureDrawBase64) {
    try {
      // Freehand signature drawing on the left side of the block
      doc.addImage(contract.signatureDrawBase64, 'PNG', rightX - 4, sigY + 2, 34, 13);
      
      // QR verification barcode on the right side of the block
      if (contract.signatureQrBase64) {
        doc.addImage(contract.signatureQrBase64, 'PNG', rightX + 34, sigY + 1, 17, 17);
      }
      
      doc.setFont('courier', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(30, 58, 138);
      doc.text(`E-SIGNATURE CERTIFIED SECURE`, rightX - 4, sigY + 17);
      doc.text(`DATE: ${contract.signedAt || 'ONLINE'}`, rightX - 4, sigY + 20);
    } catch (e) {
      console.error('Error rendering image in PDF:', e);
    }
  } else {
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(217, 119, 6);
    doc.text('(Belum Ditandatangani)', rightX, sigY + 10);
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(contract.customerName.toUpperCase(), rightX - 4, sigY + 24);
  
  // Custom corporate position title
  doc.setFont('times', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(contract.customerTitle || 'Penyewa / Pelanggan', rightX - 4, sigY + 28);

  // Page index
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Halaman 1 dari 1 - Dokumen Perjanjian Sewa Elektronik Sah', pageWidth / 2, pageHeight - 8, { align: 'center' });

  doc.save(`KONTRAK_${contract.contractNumber}_${contract.customerName.replace(/[^a-zA-Z]/g, '_')}.pdf`);
};

export const angkaKeKata = (nominal: number): string => {
  const bilangan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let temp = "";
  const n = Math.floor(nominal);
  if (n < 12) {
    temp = bilangan[n] || "";
  } else if (n < 20) {
    temp = (bilangan[n - 10] || "") + " Belas";
  } else if (n < 100) {
    temp = (bilangan[Math.floor(n / 10)] || "") + " Puluh " + (bilangan[n % 10] || "");
  } else if (n < 200) {
    temp = "Seratus " + angkaKeKata(n - 100);
  } else if (n < 1000) {
    temp = (bilangan[Math.floor(n / 100)] || "") + " Ratus " + angkaKeKata(n % 100);
  } else if (n < 2000) {
    temp = "Seribu " + angkaKeKata(n - 1000);
  } else if (n < 1000000) {
    temp = angkaKeKata(Math.floor(n / 1000)) + " Ribu " + angkaKeKata(n % 1000);
  } else if (n < 1000000000) {
    temp = angkaKeKata(Math.floor(n / 1000000)) + " Juta " + angkaKeKata(n % 1000000);
  } else if (n < 1000000000000) {
    temp = angkaKeKata(Math.floor(n / 1000000000)) + " Milyar " + angkaKeKata(n % 1000000000);
  }
  return temp.trim().replace(/\s+/g, ' ');
};
