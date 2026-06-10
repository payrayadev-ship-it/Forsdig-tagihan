import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Customer, CashAccount, SystemSetting } from '../types';

/**
 * Generates and downloads a professional invoice PDF using jsPDF and jspdf-autotable.
 * Styled in high-contrast layout matching Corporate Standard (Slate/Crimson Theme).
 */
export const exportInvoiceToPDF = (
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

  // Save/Download PDF named beautifully
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
};
