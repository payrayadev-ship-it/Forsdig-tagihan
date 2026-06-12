export type UserRole = 'Super Admin' | 'Admin Keuangan' | 'Staff' | 'Viewer' | 'Sales';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'Aktif' | 'Nonaktif';
}

export interface Customer {
  id: string; // Document ID in firestore (equivalent to customerId)
  customerId: string; // Auto generated short ID e.g. CUST-001
  name: string;
  company: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  npwp: string;
  status: 'Aktif' | 'Nonaktif';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  productId: string;
  code: string;
  name: string;
  category: string;
  price: number;
  tax: number; // percentage (e.g. 11 for 11% PPN)
  unit: string;
  description: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  tax: number; // percentage
  discount: number; // nominal or discount amount
  total: number; // (price * qty * (1 + tax/100)) - discount
}

export type InvoiceStatus = 
  | 'Draft' 
  | 'Dikirim' 
  | 'Belum Dibayar' 
  | 'Sebagian Dibayar' 
  | 'Lunas' 
  | 'Jatuh Tempo' 
  | 'Dibatalkan';

export interface Invoice {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discount: number; // total discount
  tax: number; // total tax amount
  ppnAmount?: number;
  pphAmount?: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
  salesId?: string;
  salesName?: string;
  commissionRate?: number;
  commissionAmount?: number;
}

export type PaymentMethod = 'Transfer Bank' | 'Cash' | 'QRIS' | 'E-Wallet' | 'Virtual Account';

export interface Payment {
  id: string;
  paymentId: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  receiptUrl: string; // base64 mock or storage URL
  notes: string;
  isValidated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Receivable {
  id: string;
  receivableId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  dueDate: string;
  totalAmount: number;
  remainingAmount: number;
  agingDays: number;
  lastReminderSent?: string;
  notes: string;
}

export type ExpenseCategory = 'Operasional' | 'Gaji' | 'Utilitas' | 'Transportasi' | 'Pajak' | 'Lainnya';

export interface Expense {
  id: string;
  expenseId: string;
  expenseNumber: string;
  date: string;
  category: ExpenseCategory;
  vendor: string;
  amount: number;
  description: string;
  attachmentUrl: string; // base64 mock or storage link
  createdAt: string;
}

export interface CashAccount {
  id: string;
  accountId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  currency: string;
  type: 'Kas' | 'Bank';
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  notificationId: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  logId: string;
  userId: string;
  userEmail: string;
  action: string;
  category: string; // 'Pelanggan' | 'Invoice' | 'Pembayaran' | 'Auth' etc.
  ipAddress: string;
  timestamp: string;
}

export interface SystemSetting {
  id: string;
  settingId: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  qrisUrl: string; // Base64 mock or real link
  taxId?: string;
  currency?: string;
  ppnEnabled?: boolean;
  ppnRate?: number;
  pphEnabled?: boolean;
  pphRate?: number;
}

export type ContractStatus = 'Draft' | 'Menunggu Tanda Tangan' | 'Aktif' | 'Selesai' | 'Batal';

export interface RentContract {
  id: string;
  contractId: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  rentalAmount: number;
  paymentTerm: string;
  termsAndConditions: string;
  signatureDrawBase64?: string;
  signedAt?: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}
