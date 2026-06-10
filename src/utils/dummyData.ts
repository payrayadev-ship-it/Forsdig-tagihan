import { Customer, Product, Invoice, Payment, Expense, CashAccount, SystemSetting, Receivable } from '../types';

export const DUMMY_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    customerId: 'CUST-001',
    name: 'Budi Santoso',
    company: 'PT Global Teknologi',
    address: 'Jl. Sudirman No. 45',
    city: 'Jakarta Selatan',
    province: 'DKI Jakarta',
    phone: '081234567890',
    email: 'budi@ptglobal.com',
    npwp: '01.234.567.8-012.000',
    status: 'Aktif',
    notes: 'Pelanggan VIP, pembayaran selalu tepat waktu.',
    createdAt: '2026-05-01',
    updatedAt: '2026-05-01'
  },
  {
    id: 'cust-2',
    customerId: 'CUST-002',
    name: 'Siti Rahma',
    company: 'CV Makmur Abadi',
    address: 'Jl. Pemuda No. 12',
    city: 'Surabaya',
    province: 'Jawa Timur',
    phone: '085678901234',
    email: 'siti@makmurabadi.co.id',
    npwp: '02.456.789.2-023.000',
    status: 'Aktif',
    notes: 'Butuh follow up berkala untuk tagihan jatuh tempo.',
    createdAt: '2026-05-10',
    updatedAt: '2026-05-10'
  },
  {
    id: 'cust-3',
    customerId: 'CUST-003',
    name: 'Andi Wijaya',
    company: 'PT Sinergi Pratama',
    address: 'Jl. Gatot Subroto Kav 22',
    city: 'Bandung',
    province: 'Jawa Barat',
    phone: '087890123456',
    email: 'andi@sinergi.id',
    npwp: '03.789.123.4-045.000',
    status: 'Nonaktif',
    notes: 'Kontrak berakhir, tidak ada layanan aktif.',
    createdAt: '2026-04-15',
    updatedAt: '2026-05-20'
  }
];

export const DUMMY_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    productId: 'prod-1',
    code: 'SRV-ENT-01',
    name: 'Layanan ERP Premium Cloud',
    category: 'Layanan Cloud',
    price: 3500000,
    tax: 11,
    unit: 'Bulan',
    description: 'Akses penuh modul ERP, Multi-user, & SLA 99.9%',
    status: 'Aktif'
  },
  {
    id: 'prod-2',
    productId: 'prod-2',
    code: 'SRV-WEB-02',
    name: 'Web Hosting & Domain Maintenance',
    category: 'Layanan Cloud',
    price: 500000,
    tax: 11,
    unit: 'Tahun',
    description: 'Hosting 20GB SSD, SSL Gratis, & backup mingguan',
    status: 'Aktif'
  },
  {
    id: 'prod-3',
    productId: 'prod-3',
    code: 'CON-DEV-03',
    name: 'Konsultasi IT & Custom Development',
    category: 'Consulting',
    price: 15000000,
    tax: 0,
    unit: 'Proyek',
    description: 'Konsultasi desain arsitektur IT dan pengembangan dashboard custom',
    status: 'Aktif'
  }
];

export const DUMMY_INVOICES: Invoice[] = [
  {
    id: 'inv-1',
    invoiceId: 'inv-1',
    invoiceNumber: 'INV/202606/0001',
    customerId: 'cust-1',
    customerName: 'Budi Santoso - PT Global Teknologi',
    invoiceDate: '2026-06-01',
    dueDate: '2026-06-15',
    subtotal: 3500000,
    discount: 500000,
    tax: 330000, // 11% dari (3500k - 500k)
    total: 3330000,
    paidAmount: 3330000,
    status: 'Lunas',
    notes: 'Terima kasih atas kerja samanya.',
    items: [
      {
        productId: 'prod-1',
        name: 'Layanan ERP Premium Cloud',
        qty: 1,
        price: 3500000,
        tax: 11,
        discount: 500000,
        total: 3330000
      }
    ],
    createdAt: '2026-06-01',
    updatedAt: '2026-06-03'
  },
  {
    id: 'inv-2',
    invoiceId: 'inv-2',
    invoiceNumber: 'INV/202606/0002',
    customerId: 'cust-2',
    customerName: 'Siti Rahma - CV Makmur Abadi',
    invoiceDate: '2026-05-15',
    dueDate: '2026-05-30', // Overdue
    subtotal: 1000000,
    discount: 0,
    tax: 110000,
    total: 1110000,
    paidAmount: 0,
    status: 'Jatuh Tempo',
    notes: 'Tagihan hosting tahunan.',
    items: [
      {
        productId: 'prod-2',
        name: 'Web Hosting & Domain Maintenance',
        qty: 2,
        price: 500000,
        tax: 11,
        discount: 0,
        total: 1110000
      }
    ],
    createdAt: '2026-05-15',
    updatedAt: '2026-05-15'
  },
  {
    id: 'inv-3',
    invoiceId: 'inv-3',
    invoiceNumber: 'INV/202606/0003',
    customerId: 'cust-1',
    customerName: 'Budi Santoso - PT Global Teknologi',
    invoiceDate: '2026-06-05',
    dueDate: '2026-06-20',
    subtotal: 15000000,
    discount: 0,
    tax: 0,
    total: 15000000,
    paidAmount: 5000000,
    status: 'Sebagian Dibayar',
    notes: 'DP 30% Custom Development Sisa dibayar setelah serah terima.',
    items: [
      {
        productId: 'prod-3',
        name: 'Konsultasi IT & Custom Development',
        qty: 1,
        price: 15000000,
        tax: 0,
        discount: 0,
        total: 15000000
      }
    ],
    createdAt: '2026-06-05',
    updatedAt: '2026-06-06'
  }
];

export const DUMMY_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    paymentId: 'pay-1',
    paymentNumber: 'PAY-0001',
    customerId: 'cust-1',
    customerName: 'Budi Santoso',
    invoiceId: 'inv-1',
    invoiceNumber: 'INV/202606/0001',
    paymentDate: '2026-06-03',
    paymentMethod: 'Transfer Bank',
    amount: 3330000,
    receiptUrl: '',
    notes: 'Lunas untuk tagihan ERP Juni',
    isValidated: true,
    createdAt: '2026-06-03',
    updatedAt: '2026-06-03'
  },
  {
    id: 'pay-2',
    paymentId: 'pay-2',
    paymentNumber: 'PAY-0002',
    customerId: 'cust-1',
    customerName: 'Budi Santoso',
    invoiceId: 'inv-3',
    invoiceNumber: 'INV/202606/0003',
    paymentDate: '2026-06-06',
    paymentMethod: 'QRIS',
    amount: 5000000,
    receiptUrl: '',
    notes: 'DP 30% IT Project',
    isValidated: true,
    createdAt: '2026-06-06',
    updatedAt: '2026-06-06'
  }
];

export const DUMMY_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    expenseId: 'exp-1',
    expenseNumber: 'EXP-0001',
    date: '2026-06-02',
    category: 'Utilitas',
    vendor: 'PLN Persero',
    amount: 450000,
    description: 'Tagihan listrik kantor utama bulan Mei',
    attachmentUrl: '',
    createdAt: '2026-06-02'
  },
  {
    id: 'exp-2',
    expenseId: 'exp-2',
    expenseNumber: 'EXP-0002',
    date: '2026-06-05',
    category: 'Operasional',
    vendor: 'Indihome',
    amount: 850000,
    description: 'Abonemen Internet Biz Kantor',
    attachmentUrl: '',
    createdAt: '2026-06-05'
  }
];

export const DUMMY_CASH_ACCOUNTS: CashAccount[] = [
  {
    id: 'acc-1',
    accountId: 'acc-1',
    accountName: 'Operasional Mandiri',
    accountNumber: '124-00-987654-3',
    bankName: 'Bank Mandiri',
    balance: 55000000,
    currency: 'IDR',
    type: 'Bank',
    createdAt: '2026-01-01'
  },
  {
    id: 'acc-2',
    accountId: 'acc-2',
    accountName: 'Kas Kecil Kantor',
    accountNumber: '-',
    bankName: 'Cash',
    balance: 3200000,
    currency: 'IDR',
    type: 'Kas',
    createdAt: '2026-01-01'
  }
];

export const DUMMY_RECEIVABLES: Receivable[] = [
  {
    id: 'rec-1',
    receivableId: 'rec-1',
    invoiceId: 'inv-2',
    invoiceNumber: 'INV/202606/0002',
    customerId: 'cust-2',
    customerName: 'Siti Rahma - CV Makmur Abadi',
    dueDate: '2026-05-30',
    totalAmount: 1110000,
    remainingAmount: 1110000,
    agingDays: 10, // Assuming June 9 current date
    notes: 'Tagihan maintenance domain'
  },
  {
    id: 'rec-2',
    receivableId: 'rec-2',
    invoiceId: 'inv-3',
    invoiceNumber: 'INV/202606/0003',
    customerId: 'cust-1',
    customerName: 'Budi Santoso - PT Global Teknologi',
    dueDate: '2026-06-20',
    totalAmount: 15000000,
    remainingAmount: 10000000,
    agingDays: 0,
    notes: 'Sisa Pembayaran Custom IT Solution'
  }
];

export const DUMMY_SETTING: SystemSetting = {
  id: 'set-global',
  settingId: 'set-global',
  companyName: 'FORSDIG Solusindo Utama',
  phone: '021-99887766',
  email: 'billing@forsdig.id',
  address: 'Sopo Del Office Tower Lt. 18, Mega Kuningan, Jakarta Selatan',
  website: 'www.forsdig.id',
  qrisUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=qris-demo-forsdig-billing',
  ppnEnabled: true,
  ppnRate: 11,
  pphEnabled: false,
  pphRate: 2
};
