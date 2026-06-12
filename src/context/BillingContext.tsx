import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch 
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  Customer, Product, ProductCategory, Invoice, Payment, Expense, CashAccount, 
  SystemNotification, ActivityLog, SystemSetting, Receivable, UserProfile, UserRole, RentContract,
  CommissionPayout, SalesTarget, PayoutStatus
} from '../types';
import { 
  DUMMY_CUSTOMERS, DUMMY_PRODUCTS, DUMMY_INVOICES, DUMMY_PAYMENTS, 
  DUMMY_EXPENSES, DUMMY_CASH_ACCOUNTS, DUMMY_SETTING, DUMMY_RECEIVABLES 
} from '../utils/dummyData';
import { generateInvoicePDFBase64 } from '../utils/pdfGenerator';

interface BillingContextProps {
  currentUser: UserProfile | null;
  loading: boolean;
  isDemoMode: boolean;
  customers: Customer[];
  products: Product[];
  productCategories: ProductCategory[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  cashAccounts: CashAccount[];
  receivables: Receivable[];
  notifications: SystemNotification[];
  logs: ActivityLog[];
  settings: SystemSetting;
  users: (UserProfile & { id: string })[];
  contracts: RentContract[];
  payouts: CommissionPayout[];
  targets: SalesTarget[];
  
  // Auth operations
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  logout: () => Promise<void>;
  updateUserRole: (userId: string, role: UserRole, commissionRate?: number) => Promise<void>;
  updateLocalUserRole: (userId: string, role: UserRole, commissionRate?: number) => Promise<void>;
  
  // DB actions
  addCustomer: (data: Omit<Customer, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  
  addProduct: (data: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addProductCategory: (name: string) => Promise<void>;
  updateProductCategory: (id: string, name: string) => Promise<void>;
  deleteProductCategory: (id: string) => Promise<void>;
  
  addInvoice: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'paidAmount' | 'createdAt' | 'updatedAt'>) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  updateInvoiceStatus: (id: string, status: Invoice['status']) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  
  addPayment: (data: Omit<Payment, 'id' | 'paymentNumber' | 'isValidated' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  validatePayment: (id: string) => Promise<void>;
  
  addExpense: (data: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  transferCash: (fromId: string, toId: string, amount: number) => Promise<void>;
  updateCashAccountBalance: (id: string, newBalance: number) => Promise<void>;
  addCashAccount: (data: Omit<CashAccount, 'id' | 'createdAt'>) => Promise<void>;
  
  updateSettings: (data: Partial<SystemSetting>) => Promise<void>;
  logActivity: (action: string, category: string) => Promise<void>;
  addNotification: (title: string, message: string, type: SystemNotification['type']) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  seedInitialData: () => Promise<void>;
  runOverdueInvoicesCheck: () => Promise<number>;
  sendOverdueReminderEmail: (id: string) => Promise<boolean>;
  sendAllOverdueEmailReminders: () => Promise<number>;
  
  // Contracts actions
  addContract: (data: Omit<RentContract, 'id' | 'contractId' | 'contractNumber' | 'status' | 'createdAt' | 'updatedAt' | 'signatureDrawBase64' | 'signedAt'>) => Promise<RentContract>;
  updateContract: (id: string, data: Partial<RentContract>) => Promise<void>;
  deleteContract: (id: string) => Promise<void>;
  signContract: (id: string, signatureBase64: string, signatureQrBase64?: string) => Promise<void>;

  // Sales & Commission Actions
  addPayoutRequest: (data: Omit<CommissionPayout, 'id' | 'payoutId' | 'payoutNumber' | 'status' | 'requestedAt'>) => Promise<CommissionPayout>;
  updatePayoutStatus: (id: string, status: PayoutStatus, notes?: string) => Promise<void>;
  updateSalesTarget: (salesId: string, salesName: string, month: string, targetAmount: number) => Promise<void>;
}

const BillingContext = createContext<BillingContextProps | undefined>(undefined);

const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat-1', name: 'Layanan Cloud' },
  { id: 'cat-2', name: 'Consulting' },
  { id: 'cat-3', name: 'Lisensi Software' },
  { id: 'cat-4', name: 'Hardware Maintenance' },
  { id: 'cat-5', name: 'Lainnya' }
];

const DEFAULT_USERS: (UserProfile & { id: string })[] = [
  {
    id: 'demo-payrayadev',
    userId: 'demo-payrayadev',
    email: 'payrayadev@gmail.com',
    name: 'Royan Payraya (CEO)',
    role: 'Super Admin',
    status: 'Aktif',
  },
  {
    id: 'demo-super',
    userId: 'demo-super',
    email: 'super@forsdig.id',
    name: 'Royan Payraya (CEO)',
    role: 'Super Admin',
    status: 'Aktif',
  },
  {
    id: 'demo-finance',
    userId: 'demo-finance',
    email: 'finance@forsdig.id',
    name: 'Siti Rahma (CFO)',
    role: 'Admin Keuangan',
    status: 'Aktif',
  },
  {
    id: 'demo-staff',
    userId: 'demo-staff',
    email: 'staff@forsdig.id',
    name: 'Hendra Wijaya (Sales)',
    role: 'Staff',
    status: 'Aktif',
  },
  {
    id: 'demo-viewer',
    userId: 'demo-viewer',
    email: 'viewer@forsdig.id',
    name: 'Inspektur Pajak',
    role: 'Viewer',
    status: 'Aktif',
  }
];

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Core records state (used/hydrated depending on demo/firebase online)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<SystemSetting>(DUMMY_SETTING);
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [contracts, setContracts] = useState<RentContract[]>([]);
  const [payouts, setPayouts] = useState<CommissionPayout[]>([]);
  const [targets, setTargets] = useState<SalesTarget[]>([]);

  // Path resolution helper for absolute data segregation
  const getUserColPath = (col: string) => {
    if (isDemoMode || !currentUser?.userId) {
      return col;
    }
    if (col === 'users') return 'users';
    return `users/${currentUser.userId}/${col}`;
  };

  // 1. Auth states sync with Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsDemoMode(false);
        // Sync user role from Firestore
        const userRef = doc(db, 'users', user.uid);
        onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setCurrentUser({
              userId: user.uid,
              email: user.email || '',
              name: user.displayName || 'Enterprise User',
              role: data.role || 'Staff',
              status: 'Aktif',
            });
          } else {
            // First time registration
            const defaultProfile: UserProfile = {
              userId: user.uid,
              email: user.email || '',
              name: user.displayName || 'Enterprise User',
              role: user.email === 'payrayadev@gmail.com' ? 'Super Admin' : 'Staff', // Bootstrapped Admin from metadata
              status: 'Aktif',
            };
            setDoc(userRef, defaultProfile)
              .then(() => setCurrentUser(defaultProfile))
              .catch(err => console.error('Failed to create user profile', err));
          }
          setLoading(false);
        }, (error) => {
          console.error("User profile read denied, falling back to default.", error);
          setCurrentUser({
            userId: user.uid,
            email: user.email || '',
            name: user.displayName || 'Enterprise User',
            role: 'Staff',
            status: 'Aktif',
          });
          setLoading(false);
        });
      } else {
        // Retrieve persisted demo session from localStorage if present
        const persistedDemoSession = localStorage.getItem('forsdig_demo_user_session');
        if (persistedDemoSession) {
          try {
            const parsed = JSON.parse(persistedDemoSession);
            setCurrentUser(parsed);
            setIsDemoMode(true);
            setLoading(false);
            return;
          } catch (e) {
            console.error('Failed to parse persisted demo session', e);
          }
        }
        // No auto-login anymore as user wants "Login Instan Demo" removed
        setCurrentUser(null);
        setIsDemoMode(true);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // 1b. Ensure collections exist and are initialized with proper data types inside user sandbox
  const ensureCollectionsSetup = async () => {
    if (isDemoMode || !currentUser?.userId) return;
    try {
      console.log("[Setup] Checking Firestore user-sandbox collections initialization...");
      const targetSettingsPath = getUserColPath('settings');
      const settingsSnap = await getDocs(collection(db, targetSettingsPath));
      if (settingsSnap.empty) {
        const defaultSetting = { ...DUMMY_SETTING };
        await setDoc(doc(db, targetSettingsPath, defaultSetting.id), defaultSetting);
        console.log("[Setup] Initialized user settings collection in tenant space.");
      }

      const targetCashPath = getUserColPath('cash_accounts');
      const cashSnap = await getDocs(collection(db, targetCashPath));
      if (cashSnap.empty) {
        for (const account of DUMMY_CASH_ACCOUNTS) {
          const typedAccount = {
            ...account,
            balance: Number(account.balance),
            createdAt: account.createdAt || new Date().toISOString()
          };
          await setDoc(doc(db, targetCashPath, account.id), typedAccount);
        }
        console.log("[Setup] Initialized user cash/bank accounts in tenant space.");
      }

      const targetCatPath = getUserColPath('product_categories');
      const categorySnap = await getDocs(collection(db, targetCatPath));
      if (categorySnap.empty) {
        for (const cat of DEFAULT_CATEGORIES) {
          await setDoc(doc(db, targetCatPath, cat.id), cat);
        }
        console.log("[Setup] Initialized default categories inside user space.");
      }
      
      console.log("[Setup] Firestore user-sandbox schemas successfully validated.");
    } catch (err) {
      console.warn("[Setup] Optional auto-initialization verification completed.", err);
    }
  };

  // 2. Load and listen of database collections
  useEffect(() => {
    if (isDemoMode) {
      // Hydrate from localStorage or Fallback to dummy data
      const localCust = localStorage.getItem('forsdig_customers');
      const localProd = localStorage.getItem('forsdig_products');
      const localCats = localStorage.getItem('forsdig_product_categories');
      const localInv = localStorage.getItem('forsdig_invoices');
      const localPay = localStorage.getItem('forsdig_payments');
      const localExp = localStorage.getItem('forsdig_expenses');
      const localCash = localStorage.getItem('forsdig_cash');
      const localRec = localStorage.getItem('forsdig_receivables');
      const localNotif = localStorage.getItem('forsdig_notifications');
      const localLogs = localStorage.getItem('forsdig_logs');
      const localSet = localStorage.getItem('forsdig_settings');

      const localUsers = localStorage.getItem('forsdig_users');
      const localContracts = localStorage.getItem('forsdig_contracts');
      const localPayouts = localStorage.getItem('forsdig_payouts');
      const localTargets = localStorage.getItem('forsdig_targets');

      setCustomers(localCust ? JSON.parse(localCust) : DUMMY_CUSTOMERS);
      setProducts(localProd ? JSON.parse(localProd) : DUMMY_PRODUCTS);
      setProductCategories(localCats ? JSON.parse(localCats) : DEFAULT_CATEGORIES);
      setInvoices(localInv ? JSON.parse(localInv) : DUMMY_INVOICES);
      setPayments(localPay ? JSON.parse(localPay) : DUMMY_PAYMENTS);
      setExpenses(localExp ? JSON.parse(localExp) : DUMMY_EXPENSES);
      setCashAccounts(localCash ? JSON.parse(localCash) : DUMMY_CASH_ACCOUNTS);
      setReceivables(localRec ? JSON.parse(localRec) : DUMMY_RECEIVABLES);
      setNotifications(localNotif ? JSON.parse(localNotif) : []);
      setLogs(localLogs ? JSON.parse(localLogs) : []);
      setSettings(localSet ? JSON.parse(localSet) : DUMMY_SETTING);
      setUsers(localUsers ? JSON.parse(localUsers) : DEFAULT_USERS);
      setContracts(localContracts ? JSON.parse(localContracts) : []);
      setPayouts(localPayouts ? JSON.parse(localPayouts) : []);
      setTargets(localTargets ? JSON.parse(localTargets) : []);
    } else {
      // Wait for complete authenticated user profile initialization before loading subcollections
      if (!currentUser?.userId) return;

      ensureCollectionsSetup();
      const unsubs = [
        onSnapshot(collection(db, getUserColPath('users')), (snap) => {
          setUsers(snap.docs.map(d => ({ id: d.id, userId: d.id, ...d.data() } as UserProfile & { id: string })));
        }, err => handleFirestoreError(err, OperationType.LIST, 'users')),
        onSnapshot(collection(db, getUserColPath('product_categories')), (snap) => {
          setProductCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductCategory)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'product_categories')),
        onSnapshot(collection(db, getUserColPath('customers')), (snap) => {
          setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'customers')),
        
        onSnapshot(collection(db, getUserColPath('products')), (snap) => {
          setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'products')),

        onSnapshot(collection(db, getUserColPath('invoices')), (snap) => {
          setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'invoices')),

        onSnapshot(collection(db, getUserColPath('payments')), (snap) => {
          setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'payments')),

        onSnapshot(collection(db, getUserColPath('expenses')), (snap) => {
          setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'expenses')),

        onSnapshot(collection(db, getUserColPath('cash_accounts')), (snap) => {
          setCashAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as CashAccount)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'cash_accounts')),

        onSnapshot(collection(db, getUserColPath('receivables')), (snap) => {
          setReceivables(snap.docs.map(d => ({ id: d.id, ...d.data() } as Receivable)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'receivables')),

        onSnapshot(collection(db, getUserColPath('notifications')), (snap) => {
          setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemNotification)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'notifications')),

        onSnapshot(collection(db, getUserColPath('activity_logs')), (snap) => {
          setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'activity_logs')),

        onSnapshot(collection(db, getUserColPath('contracts')), (snap) => {
          setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() } as RentContract)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'contracts')),

        onSnapshot(collection(db, getUserColPath('payouts')), (snap) => {
          setPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommissionPayout)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'payouts')),

        onSnapshot(collection(db, getUserColPath('targets')), (snap) => {
          setTargets(snap.docs.map(d => ({ id: d.id, ...d.data() } as SalesTarget)));
        }, err => handleFirestoreError(err, OperationType.LIST, 'targets')),

        onSnapshot(collection(db, getUserColPath('settings')), (snap) => {
          if (!snap.empty) {
            setSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as SystemSetting);
          }
        }, err => handleFirestoreError(err, OperationType.LIST, 'settings'))
      ];

      return () => {
        unsubs.forEach(un => un());
      };
    }
  }, [isDemoMode, currentUser?.userId]);

  // Sync state to local storage when in Demo mode
  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('forsdig_customers', JSON.stringify(customers));
      localStorage.setItem('forsdig_products', JSON.stringify(products));
      localStorage.setItem('forsdig_product_categories', JSON.stringify(productCategories));
      localStorage.setItem('forsdig_invoices', JSON.stringify(invoices));
      localStorage.setItem('forsdig_payments', JSON.stringify(payments));
      localStorage.setItem('forsdig_expenses', JSON.stringify(expenses));
      localStorage.setItem('forsdig_cash', JSON.stringify(cashAccounts));
      localStorage.setItem('forsdig_receivables', JSON.stringify(receivables));
      localStorage.setItem('forsdig_notifications', JSON.stringify(notifications));
      localStorage.setItem('forsdig_logs', JSON.stringify(logs));
      localStorage.setItem('forsdig_settings', JSON.stringify(settings));
      localStorage.setItem('forsdig_users', JSON.stringify(users));
      localStorage.setItem('forsdig_contracts', JSON.stringify(contracts));
      localStorage.setItem('forsdig_payouts', JSON.stringify(payouts));
      localStorage.setItem('forsdig_targets', JSON.stringify(targets));
    }
  }, [isDemoMode, customers, products, productCategories, invoices, payments, expenses, cashAccounts, receivables, notifications, logs, settings, users, contracts, payouts, targets]);

  // Automatic Background Overdue Detector
  useEffect(() => {
    if (invoices.length > 0) {
      const timer = setTimeout(() => {
        runOverdueInvoicesCheck();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [invoices.length]);

  // 3. Setup helpers for write log
  const logActivity = async (action: string, category: string) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      logId: `log-${Date.now()}`,
      userId: currentUser?.userId || 'anonymous',
      userEmail: currentUser?.email || 'guest@forsdig.id',
      action,
      category,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString()
    };

    if (isDemoMode) {
      setLogs(prev => [newLog, ...prev]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('activity_logs'), newLog.id), newLog);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `activity_logs/${newLog.id}`);
      }
    }
  };

  // Notification Logger
  const addNotification = async (title: string, message: string, type: SystemNotification['type']) => {
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      notificationId: `notif-${Date.now()}`,
      userId: currentUser?.userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    if (isDemoMode) {
      setNotifications(prev => [newNotif, ...prev]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('notifications'), newNotif.id), newNotif);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `notifications/${newNotif.id}`);
      }
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (isDemoMode) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('notifications'), id), { isRead: true }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
      }
    }
  };

  // 4. Seeder for blank DB
  const seedInitialData = async () => {
    if (isDemoMode) {
      setCustomers(DUMMY_CUSTOMERS);
      setProducts(DUMMY_PRODUCTS);
      setProductCategories(DEFAULT_CATEGORIES);
      setInvoices(DUMMY_INVOICES);
      setPayments(DUMMY_PAYMENTS);
      setExpenses(DUMMY_EXPENSES);
      setCashAccounts(DUMMY_CASH_ACCOUNTS);
      setReceivables(DUMMY_RECEIVABLES);
      setSettings(DUMMY_SETTING);
      await logActivity('Melakukan reset & seeding sampel data (Mode Demo)', 'Sistem');
      await addNotification('Seeding Berhasil', 'Sampel data berhasil dimuat di browser!', 'success');
    } else {
      try {
        // Seeding database via multi-write batch
        const batch = writeBatch(db);
        
        DUMMY_CUSTOMERS.forEach(cust => {
          batch.set(doc(db, getUserColPath('customers'), cust.id), cust);
        });
        DUMMY_PRODUCTS.forEach(prod => {
          batch.set(doc(db, getUserColPath('products'), prod.id), prod);
        });
        DEFAULT_CATEGORIES.forEach(cat => {
          batch.set(doc(db, getUserColPath('product_categories'), cat.id), cat);
        });
        DUMMY_INVOICES.forEach(inv => {
          batch.set(doc(db, getUserColPath('invoices'), inv.id), inv);
        });
        DUMMY_PAYMENTS.forEach(pay => {
          batch.set(doc(db, getUserColPath('payments'), pay.id), pay);
        });
        DUMMY_EXPENSES.forEach(exp => {
          batch.set(doc(db, getUserColPath('expenses'), exp.id), exp);
        });
        DUMMY_CASH_ACCOUNTS.forEach(cash => {
          batch.set(doc(db, getUserColPath('cash_accounts'), cash.id), cash);
        });
        DUMMY_RECEIVABLES.forEach(rec => {
          batch.set(doc(db, getUserColPath('receivables'), rec.id), rec);
        });
        batch.set(doc(db, getUserColPath('settings'), DUMMY_SETTING.id), DUMMY_SETTING);

        await batch.commit();
        await logActivity('Melakukan seeding data awal ke Cloud Firestore', 'Sistem');
        await addNotification('Database Seeded', 'Data ERP FORSDIG Berhasil diunggah ke cloud database!', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'multi-collection-seed');
      }
    }
  };

  // Auth Operations
  const login = async (email: string, password: string) => {
    if (isDemoMode) {
      let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        // Automatically register the user on-the-fly in demo mode to prevent any login blockers!
        const username = email.split('@')[0];
        const cleanName = username.split(/[._-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const newUser: UserProfile & { id: string } = {
          id: `demo-${Date.now()}`,
          userId: `demo-${Date.now()}`,
          email: email.toLowerCase(),
          name: cleanName || 'Pengguna Baru',
          role: 'Super Admin',
          status: 'Aktif',
        };
        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        localStorage.setItem('forsdig_users', JSON.stringify(updatedUsers));
        user = newUser;
      }
      setCurrentUser(user);
      localStorage.setItem('forsdig_demo_user_session', JSON.stringify(user));
      setIsDemoMode(true);
      await addNotification('Login Berhasil', `Selamat datang kembali, ${user.name}!`, 'success');
      await logActivity(`Login masuk sebagai ${user.name}`, 'Auth');
    } else {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        await logActivity('Login menggunakan email & password', 'Auth');
      } catch (err: any) {
        throw new Error(err.message || 'Email atau kata sandi tidak cocok.');
      }
    }
  };

  const register = async (email: string, password: string, name: string, role: UserRole) => {
    if (isDemoMode) {
      const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        throw new Error('Alamat email sudah terdaftar.');
      }
      const newUser: UserProfile & { id: string } = {
        id: `demo-${Date.now()}`,
        userId: `demo-${Date.now()}`,
        email,
        name,
        role,
        status: 'Aktif'
      };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('forsdig_users', JSON.stringify(updatedUsers));
      
      await addNotification('Pendaftaran Akun', `Akun baru atas nama ${name} berhasil didaftarkan (Mode Demo)`, 'success');
      await logActivity(`Mendaftarkan akun baru: ${name} (${role})`, 'Auth');
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const newUserProfile: UserProfile = {
          userId: user.uid,
          email: user.email || email,
          name,
          role,
          status: 'Aktif'
        };
        await setDoc(doc(db, 'users', user.uid), newUserProfile);
        await logActivity(`Mendaftarkan akun baru ${name} ke database`, 'Auth');
      } catch (err: any) {
        throw new Error(err.message || 'Gagal mendaftarkan pengguna baru.');
      }
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      await logActivity('Login ke system menggunakan Google SSO', 'Auth');
    } catch (err) {
      console.error('Failed Google Sign In, trying offline demo mode', err);
      loginAsDemo('Super Admin');
    }
  };

  const loginAsDemo = (role: UserRole) => {
    setIsDemoMode(true);
    const mockEmail = `${role.toLowerCase().replace(' ', '')}@forsdig.id`;
    const user = users.find(u => u.email.toLowerCase() === mockEmail.toLowerCase()) || {
      userId: `demo-${role.toLowerCase().replace(' ', '-')}`,
      email: mockEmail,
      name: `Demo ${role}`,
      role: role,
      status: 'Aktif',
    };
    setCurrentUser(user);
    localStorage.setItem('forsdig_demo_user_session', JSON.stringify(user));
    logActivity(`Login ke sistem sebagai demo [${role}]`, 'Auth');
    addNotification('Login Mode Demo', `Pengguna berhasil login sebagai ${role}`, 'info');
  };

  const logout = async () => {
    localStorage.removeItem('forsdig_demo_user_session');
    await logActivity('Keluar dari aplikasi', 'Auth');
    if (!isDemoMode) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setIsDemoMode(true);
  };

  const updateUserRole = async (userId: string, role: UserRole, commissionRate?: number) => {
    if (isDemoMode) {
      const updatedUsers = users.map(u => {
        if (u.userId === userId || u.id === userId) {
          return { 
            ...u, 
            role, 
            commissionRate: role === 'Sales' ? (commissionRate !== undefined ? Number(commissionRate) : u.commissionRate) : undefined 
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      localStorage.setItem('forsdig_users', JSON.stringify(updatedUsers));

      if (currentUser && (currentUser.userId === userId || currentUser.userId === `demo-${userId}`)) {
        setCurrentUser(p => p ? { 
          ...p, 
          role, 
          commissionRate: role === 'Sales' ? (commissionRate !== undefined ? Number(commissionRate) : p.commissionRate) : undefined 
        } : null);
      }
      
      const details = role === 'Sales' && commissionRate !== undefined ? ` dengan komisi ${commissionRate}%` : '';
      await logActivity(`Mengubah role user ${userId} menjadi ${role}${details}`, 'Pengguna');
    } else {
      try {
        const updateData: any = { role };
        if (role === 'Sales' && commissionRate !== undefined) {
          updateData.commissionRate = Number(commissionRate);
        } else if (role !== 'Sales') {
          updateData.commissionRate = null;
        }
        await setDoc(doc(db, 'users', userId), updateData, { merge: true });
        
        const details = role === 'Sales' && commissionRate !== undefined ? ` dengan komisi ${commissionRate}%` : '';
        await logActivity(`Mengubah role user ${userId} menjadi ${role}${details}`, 'Pengguna');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      }
    }
  };

  const updateLocalUserRole = async (userId: string, role: UserRole, commissionRate?: number) => {
    await updateUserRole(userId, role, commissionRate);
  };

  // 5. customer CRUD
  const addCustomer = async (data: Omit<Customer, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>) => {
    const id = `cust-${Date.now()}`;
    const nextNum = customers.length + 1;
    const customerId = `CUST-${String(nextNum).padStart(3, '0')}`;
    const timestamp = new Date().toISOString().split('T')[0];
    
    const newCust: Customer = {
      id,
      customerId,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (isDemoMode) {
      setCustomers(prev => [...prev, newCust]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('customers'), id), newCust);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `customers/${id}`);
      }
    }
    await logActivity(`Menambahkan pelanggan baru: ${data.name} (${data.company})`, 'Pelanggan');
    await addNotification('Pelanggan Baru', `Berhasil mendaftarkan pelanggan ${data.name}.`, 'success');
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (isDemoMode) {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: timestamp } : c));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('customers'), id), { ...data, updatedAt: timestamp }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `customers/${id}`);
      }
    }
    await logActivity(`Memperbarui data pelanggan ID: ${id}`, 'Pelanggan');
  };

  const deleteCustomer = async (id: string) => {
    const cust = customers.find(c => c.id === id);
    if (isDemoMode) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    } else {
      try {
        await deleteDoc(doc(db, getUserColPath('customers'), id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `customers/${id}`);
      }
    }
    await logActivity(`Menghapus pelanggan: ${cust?.name || id}`, 'Pelanggan');
  };

  // 6. Product CRUD
  const addProduct = async (data: Omit<Product, 'id'>) => {
    const id = `prod-${Date.now()}`;
    const newProduct: Product = { 
      id, 
      ...data,
      price: Number(data.price),
      tax: Number(data.tax || 0)
    };

    if (isDemoMode) {
      setProducts(prev => [...prev, newProduct]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('products'), id), newProduct);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `products/${id}`);
      }
    }
    await logActivity(`Menambah produk katalog: ${data.name}`, 'Produk');
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    const cleanedData = { ...data };
    if (cleanedData.price !== undefined) {
      cleanedData.price = Number(cleanedData.price);
    }
    if (cleanedData.tax !== undefined) {
      cleanedData.tax = Number(cleanedData.tax);
    }

    if (isDemoMode) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...cleanedData } : p));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('products'), id), cleanedData, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
      }
    }
    await logActivity(`Memperbarui katalog produk ID: ${id}`, 'Produk');
  };

  const deleteProduct = async (id: string) => {
    if (isDemoMode) {
      setProducts(prev => prev.filter(p => p.id !== id));
    } else {
      try {
        await deleteDoc(doc(db, getUserColPath('products'), id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    }
    await logActivity(`Menghapus produk ID: ${id}`, 'Produk');
  };

  const addProductCategory = async (name: string) => {
    const id = `cat-${Date.now()}`;
    const newCategory: ProductCategory = { id, name };

    if (isDemoMode) {
      setProductCategories(prev => [...prev, newCategory]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('product_categories'), id), newCategory);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `product_categories/${id}`);
      }
    }
    await logActivity(`Menambah kategori produk: ${name}`, 'Produk');
  };

  const updateProductCategory = async (id: string, name: string) => {
    if (isDemoMode) {
      setProductCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('product_categories'), id), { name }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `product_categories/${id}`);
      }
    }
    await logActivity(`Memperbarui kategori produk ID: ${id} menjadi ${name}`, 'Produk');
  };

  const deleteProductCategory = async (id: string) => {
    if (isDemoMode) {
      setProductCategories(prev => prev.filter(c => c.id !== id));
    } else {
      try {
        await deleteDoc(doc(db, getUserColPath('product_categories'), id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `product_categories/${id}`);
      }
    }
    await logActivity(`Menghapus kategori produk ID: ${id}`, 'Produk');
  };

  // 7. Invoice CRUD
  const addInvoice = async (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'paidAmount' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
    const id = `inv-${Date.now()}`;
    const nextNum = invoices.length + 1;
    const formattedDate = data.invoiceDate.replace(/-/g, '');
    const invoiceNumber = `INV/${formattedDate}/${String(nextNum).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().split('T')[0];

    // Enforce proper numeric data types on invoice fields & items
    const typedItems = data.items.map(item => ({
      productId: item.productId,
      name: item.name,
      qty: Number(item.qty),
      price: Number(item.price),
      tax: Number(item.tax || 0),
      discount: Number(item.discount || 0),
      total: Number(item.total)
    }));

    const newInvoice: Invoice = {
      id,
      invoiceId: id,
      invoiceNumber,
      paidAmount: 0,
      ...data,
      subtotal: Number(data.subtotal),
      discount: Number(data.discount || 0),
      tax: Number(data.tax || 0),
      total: Number(data.total),
      items: typedItems,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (isDemoMode) {
      setInvoices(prev => [...prev, newInvoice]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('invoices'), id), newInvoice);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `invoices/${id}`);
      }
    }

    // Auto add to receivables if status is not draft or canceled
    if (newInvoice.status !== 'Draft' && newInvoice.status !== 'Dibatalkan' && newInvoice.status !== 'Lunas') {
      const recId = `rec-${Date.now()}`;
      const newRec: Receivable = {
        id: recId,
        receivableId: recId,
        invoiceId: id,
        invoiceNumber,
        customerId: data.customerId,
        customerName: data.customerName,
        dueDate: data.dueDate,
        totalAmount: Number(data.total),
        remainingAmount: Number(data.total),
        agingDays: 0,
        notes: data.notes
      };
      
      if (isDemoMode) {
        setReceivables(prev => [...prev, newRec]);
      } else {
        try {
          await setDoc(doc(db, getUserColPath('receivables'), recId), newRec);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `receivables/${recId}`);
        }
      }
    }

    await logActivity(`Membuat Invoice baru ${invoiceNumber}`, 'Invoice');
    await addNotification('Invoice Baru Terbit', `Invoice ${invoiceNumber} telah tercatat sebagai ${data.status}.`, 'info');
    return newInvoice;
  };

  const updateInvoice = async (id: string, data: Partial<Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>>) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    const updatedInvoice = {
      ...invoice,
      ...data,
      updatedAt: timestamp
    };

    if (isDemoMode) {
      setInvoices(prev => prev.map(i => i.id === id ? updatedInvoice : i));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('invoices'), id), updatedInvoice, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
      }
    }

    // Update corresponding receivable
    const relatedRec = receivables.find(r => r.invoiceId === id);
    
    if (updatedInvoice.status === 'Draft' || updatedInvoice.status === 'Dibatalkan' || updatedInvoice.status === 'Lunas') {
      // should delete receivable if it exists
      if (relatedRec) {
        if (isDemoMode) {
          setReceivables(prev => prev.filter(r => r.invoiceId !== id));
        } else {
          try {
            await deleteDoc(doc(db, getUserColPath('receivables'), relatedRec.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `receivables/${relatedRec.id}`);
          }
        }
      }
    } else {
      // update or create receivable
      if (relatedRec) {
        const updatedRec = {
          ...relatedRec,
          customerId: updatedInvoice.customerId,
          customerName: updatedInvoice.customerName,
          dueDate: updatedInvoice.dueDate,
          totalAmount: Number(updatedInvoice.total),
          remainingAmount: Number(updatedInvoice.total) - Number(updatedInvoice.paidAmount),
          notes: updatedInvoice.notes
        };
        if (isDemoMode) {
          setReceivables(prev => prev.map(r => r.invoiceId === id ? updatedRec : r));
        } else {
          try {
            await setDoc(doc(db, getUserColPath('receivables'), relatedRec.id), updatedRec, { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `receivables/${relatedRec.id}`);
          }
        }
      } else {
        const recId = `rec-${Date.now()}`;
        const newRec = {
          id: recId,
          receivableId: recId,
          invoiceId: id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          customerId: updatedInvoice.customerId,
          customerName: updatedInvoice.customerName,
          dueDate: updatedInvoice.dueDate,
          totalAmount: Number(updatedInvoice.total),
          remainingAmount: Number(updatedInvoice.total) - Number(updatedInvoice.paidAmount),
          agingDays: 0,
          notes: updatedInvoice.notes
        };
        if (isDemoMode) {
          setReceivables(prev => [...prev, newRec]);
        } else {
          try {
            await setDoc(doc(db, getUserColPath('receivables'), recId), newRec);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `receivables/${recId}`);
          }
        }
      }
    }

    await logActivity(`Memperbarui Invoice ${invoice.invoiceNumber}`, 'Invoice');
    await addNotification('Invoice Diperbarui', `Invoice ${invoice.invoiceNumber} telah sukses diperbarui oleh admin.`, 'info');
  };

  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    if (isDemoMode) {
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status, updatedAt: timestamp } : i));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('invoices'), id), { status, updatedAt: timestamp }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `invoices/${id}`);
      }
    }

    // Update corresponding receivable
    const relatedRec = receivables.find(r => r.invoiceId === id);
    if (status === 'Lunas' && relatedRec) {
      // Remove or set remaining is 0
      if (isDemoMode) {
        setReceivables(prev => prev.filter(r => r.invoiceId !== id));
      } else {
        try {
          await deleteDoc(doc(db, getUserColPath('receivables'), relatedRec.id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `receivables/${relatedRec.id}`);
        }
      }
    }

    await logActivity(`Mengubah status invoice ${invoice.invoiceNumber} menjadi ${status}`, 'Invoice');
  };

  const deleteInvoice = async (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    if (isDemoMode) {
      setInvoices(prev => prev.filter(i => i.id !== id));
      setReceivables(prev => prev.filter(r => r.invoiceId !== id));
    } else {
      try {
        await deleteDoc(doc(db, getUserColPath('invoices'), id));
        const relatedRec = receivables.find(r => r.invoiceId === id);
        if (relatedRec) {
          await deleteDoc(doc(db, getUserColPath('receivables'), relatedRec.id));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `invoices/${id}`);
      }
    }
    await logActivity(`Menghapus invoice ${invoice?.invoiceNumber || id}`, 'Invoice');
  };

  // Automatic & Manual Automation for Overdue Invoices
  const runOverdueInvoicesCheck = async () => {
    const today = new Date().toISOString().split('T')[0];
    let updatedCount = 0;

    // Filter invoices that are not paid/draft/cancelled and whose dueDate < today
    const overdueList = invoices.filter(inv => {
      const isUnpaid = inv.status !== 'Lunas' && inv.status !== 'Dibatalkan' && inv.status !== 'Draft';
      const isPastDue = inv.dueDate < today;
      return isUnpaid && isPastDue;
    });

    for (const inv of overdueList) {
      // 1. If status is not 'Jatuh Tempo', transition it automatically to 'Jatuh Tempo'
      if (inv.status !== 'Jatuh Tempo') {
        updatedCount++;
        const timestamp = new Date().toISOString().split('T')[0];
        if (isDemoMode) {
          setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'Jatuh Tempo', updatedAt: timestamp } : i));
        } else {
          try {
            await setDoc(doc(db, getUserColPath('invoices'), inv.id), { status: 'Jatuh Tempo', updatedAt: timestamp }, { merge: true });
          } catch (e) {
            console.error("Auto transition overdue error:", e);
          }
        }

        // Log this system transition
        await logActivity(
          `Sistem mendeteksi otomatis Invoice ${inv.invoiceNumber} jatuh tempo (tenggat ${inv.dueDate})`,
          'Sistem_Otomatisasi'
        );
      }

      // 2. Add system notification if there isn't one already for this invoice
      const hasNotification = notifications.some(notif => notif.title.includes(inv.invoiceNumber));
      if (!hasNotification) {
        await addNotification(
          `⚠️ Tagihan Jatuh Tempo: ${inv.invoiceNumber}`,
          `Invoice dari pelanggan ${inv.customerName} sebesar Rp ${inv.total.toLocaleString()} melewati tenggat waktu ${inv.dueDate}. Pengingat pembayaran siap dikirim.`,
          'danger'
        );
      }
    }

    return updatedCount;
  };

  const sendOverdueReminderEmail = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return false;

    const cust = customers.find(c => c.id === inv.customerId);
    const clientEmail = cust?.email || 'klien@perusahaan.com';

    const formattedAmt = inv.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
    const itemDetails = (inv.items || [])
      .map(item => `- ${item.name || 'Layanan'} (${item.qty} x Rp ${item.price.toLocaleString('id-ID')})`)
      .join('\n');
    const message = `Yth. ${cust?.name || inv.customerName},\n\n` +
      `Ini adalah surat pengingat resmi bahwa pembayaran Invoice #${inv.invoiceNumber} dari ${settings.companyName || 'FORSDIG'} senilai ${formattedAmt} telah MELEWATI JATUH TEMPO (${inv.dueDate}).\n\n` +
      `Ringkasan Item:\n${itemDetails}\n\n` +
      `Mohon segera lakukan pelunasan tagihan melalui scan QRIS atau transfer ke rekening resmi kami.\n\n` +
      `Terima kasih,\n${settings.companyName || 'FORSDIG'}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: #D32F2F; color: #ffffff; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.05em; font-weight: 800;">${settings.companyName || 'FORSDIG'} - PENGINGAT JATUH TEMPO</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.8);">Peringatan Keterlambatan Pembayaran</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff; font-size: 13px; line-height: 1.6;">
          <p style="margin-top: 0; font-weight: bold;">Yth. Klien,</p>
          <p style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
          <div style="margin: 20px 0; padding: 15px; background-color: #fbd5d5; border-radius: 8px; border-left: 4px solid #D32F2F; font-size: 12px; color: #9b1c1c;">
            <strong>PEMBERITAHUAN JATUH TEMPO:</strong> Invoice ini telah melewati batas waktu pembayaran. Harap segera melunasi untuk menghindari denda administratif atau penangguhan layanan.
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          <p style="margin: 4px 0;">Hubungi kami: Telepon ${settings.phone || '-'} | Email: ${settings.email || '-'}</p>
          <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} ${settings.companyName || 'FORSDIG'}. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    `;

    let attachments: any[] = [];
    try {
      const base64Pdf = generateInvoicePDFBase64(inv, customers, settings, cashAccounts);
      if (base64Pdf) {
        attachments.push({
          filename: `Invoice-${inv.invoiceNumber}.pdf`,
          content: base64Pdf
        });
      }
    } catch (errPdf) {
      console.error("Gagal men-generate PDF lampiran:", errPdf);
    }

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: clientEmail,
          subject: `[PERINGATAN JATUH TEMPO] Invoice #${inv.invoiceNumber} - Telah Melewati Batas Waktu`,
          html: htmlBody,
          companyName: settings.companyName,
          invoiceNumber: inv.invoiceNumber,
          message,
          attachments
        })
      });

      const resData = await response.json().catch(() => ({}));
      if (response.ok && resData.success) {
        const typeLog = resData.sandbox ? " (Sandbox Mode)" : " (Resend API)";
        
        // Generate dashboard notification
        await addNotification(
          `Email Pengingat Terkirim: ${inv.invoiceNumber}`,
          `Dokumen peringatan keterlambatan pembayaran Invoice ${inv.invoiceNumber} berhasil terkirim ke email ${clientEmail}${typeLog}.`,
          'success'
        );

        // Write log activity
        await logActivity(
          `Sistem otomatisasi sukses mengirim surat tagihan pengingat untuk Invoice ${inv.invoiceNumber} ke ${clientEmail}${typeLog}`,
          'Komunikasi_Email'
        );
        return true;
      } else {
        throw new Error(resData.error || `HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.error("Gagal mengirim email pengingat otomatis:", err);
      await addNotification(
        `Gagal Kirim Pengingat: ${inv.invoiceNumber}`,
        `Sistem gagal mengirimkan email pengingat ke ${clientEmail}: ${err.message || err}`,
        'danger'
      );
      return false;
    }
  };

  const sendAllOverdueEmailReminders = async () => {
    const today = new Date().toISOString().split('T')[0];
    const overdueList = invoices.filter(inv => {
      const isUnpaid = inv.status !== 'Lunas' && inv.status !== 'Dibatalkan' && inv.status !== 'Draft';
      const isPastDue = inv.dueDate < today;
      return isUnpaid && isPastDue;
    });

    let count = 0;
    for (const inv of overdueList) {
      const success = await sendOverdueReminderEmail(inv.id);
      if (success) count++;
    }
    return count;
  };

  // 8. Payment Handling
  const addPayment = async (data: Omit<Payment, 'id' | 'paymentNumber' | 'isValidated' | 'createdAt' | 'updatedAt'>) => {
    const id = `pay-${Date.now()}`;
    const nextNum = payments.length + 1;
    const paymentNumber = `PAY-${String(nextNum).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().split('T')[0];

    const newPayment: Payment = {
      id,
      paymentId: id,
      paymentNumber,
      isValidated: false,
      ...data,
      amount: Number(data.amount),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (isDemoMode) {
      setPayments(prev => [...prev, newPayment]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('payments'), id), newPayment);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `payments/${id}`);
      }
    }

    await logActivity(`Mencatat Pembayaran ${paymentNumber} untuk Invoice ${data.invoiceNumber}`, 'Pembayaran');
    await addNotification('Pembayaran Masuk', `Pembayaran ${paymentNumber} sebesar Rp ${data.amount.toLocaleString()} diterima. Butuh konfirmasi.`, 'warning');
  };

  const validatePayment = async (id: string) => {
    const payment = payments.find(p => p.id === id);
    if (!payment) return;

    const timestamp = new Date().toISOString().split('T')[0];

    // 1. Mark Payment Validated
    if (isDemoMode) {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, isValidated: true, updatedAt: timestamp } : p));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('payments'), id), { isValidated: true, updatedAt: timestamp }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `payments/${id}`);
      }
    }

    // 2. Adjust Invoices paidAmount and Status
    const invoice = invoices.find(inv => inv.id === payment.invoiceId);
    if (invoice) {
      const newPaid = invoice.paidAmount + payment.amount;
      const status: Invoice['status'] = newPaid >= invoice.total ? 'Lunas' : 'Sebagian Dibayar';
      
      if (isDemoMode) {
        setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, paidAmount: newPaid, status, updatedAt: timestamp } : i));
      } else {
        try {
          await setDoc(doc(db, getUserColPath('invoices'), invoice.id), { paidAmount: newPaid, status, updatedAt: timestamp }, { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `invoices/${invoice.id}`);
        }
      }

      // 3. Update Receivable (Aging Piutang)
      const relatedRec = receivables.find(r => r.invoiceId === invoice.id);
      if (relatedRec) {
        const newRem = Math.max(0, relatedRec.remainingAmount - payment.amount);
        if (newRem <= 0) {
          // Clean/remove if fully paid
          if (isDemoMode) {
            setReceivables(prev => prev.filter(r => r.invoiceId !== invoice.id));
          } else {
            try {
              await deleteDoc(doc(db, getUserColPath('receivables'), relatedRec.id));
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `receivables/${relatedRec.id}`);
            }
          }
        } else {
          // Adjust remaining amount
          if (isDemoMode) {
            setReceivables(prev => prev.map(r => r.id === relatedRec.id ? { ...r, remainingAmount: newRem } : r));
          } else {
            try {
              await setDoc(doc(db, getUserColPath('receivables'), relatedRec.id), { remainingAmount: newRem }, { merge: true });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `receivables/${relatedRec.id}`);
            }
          }
        }
      }

      // 4. Update Cash Account Balance (if bank selected)
      const primaryCashAcc = cashAccounts[0]; // Auto add to first bank
      if (primaryCashAcc) {
        await updateCashAccountBalance(primaryCashAcc.id, primaryCashAcc.balance + payment.amount);
      }
    }

    await logActivity(`Memvalidasi slip pembayaran ${payment.paymentNumber}`, 'Pembayaran');
    await addNotification('Pembayaran Terverifikasi', `Konfirmasi dana mutasi sebesar Rp ${payment.amount.toLocaleString()} telah masuk ke Kas Bank.`, 'success');
  };

  // 9. Expenses
  const addExpense = async (data: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'>) => {
    const id = `exp-${Date.now()}`;
    const expenseNumber = `EXP-${String(expenses.length + 1).padStart(4, '0')}`;
    const newExpense: Expense = {
      id,
      expenseId: id,
      expenseNumber,
      createdAt: new Date().toISOString(),
      ...data,
      amount: Number(data.amount)
    };

    if (isDemoMode) {
      setExpenses(prev => [...prev, newExpense]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('expenses'), id), newExpense);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `expenses/${id}`);
      }
    }

    // Deduct from primary Cash account
    const primaryCashAcc = cashAccounts[0];
    if (primaryCashAcc) {
      await updateCashAccountBalance(primaryCashAcc.id, primaryCashAcc.balance - data.amount);
    }

    await logActivity(`Mencatat pengeluaran usaha ${expenseNumber} sebesar Rp ${data.amount.toLocaleString()}`, 'Pengeluaran');
  };

  const deleteExpense = async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;

    if (isDemoMode) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    } else {
      try {
        await deleteDoc(doc(db, getUserColPath('expenses'), id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
      }
    }

    // Refund cash account balance
    const primaryCashAcc = cashAccounts[0];
    if (primaryCashAcc) {
      await updateCashAccountBalance(primaryCashAcc.id, primaryCashAcc.balance + exp.amount);
    }

    await logActivity(`Menghapus transaksi pengeluaran ${exp.expenseNumber}`, 'Pengeluaran');
  };

  // 10. Cash handling
  const updateCashAccountBalance = async (id: string, newBalance: number) => {
    if (isDemoMode) {
      setCashAccounts(prev => prev.map(c => c.id === id ? { ...c, balance: newBalance } : c));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('cash_accounts'), id), { balance: newBalance }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `cash_accounts/${id}`);
      }
    }
  };

  const addCashAccount = async (data: Omit<CashAccount, 'id' | 'createdAt'>) => {
    const id = `acc-${Date.now()}`;
    const newAcc: CashAccount = {
      id,
      accountId: id,
      createdAt: new Date().toISOString(),
      ...data,
      balance: Number(data.balance)
    };

    if (isDemoMode) {
      setCashAccounts(prev => [...prev, newAcc]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('cash_accounts'), id), newAcc);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `cash_accounts/${id}`);
      }
    }
    await logActivity(`Membuat akun kas/rekening baru: ${data.accountName}`, 'Kas & Bank');
  };

  const transferCash = async (fromId: string, toId: string, amount: number) => {
    const fromAcc = cashAccounts.find(c => c.id === fromId);
    const toAcc = cashAccounts.find(c => c.id === toId);
    if (!fromAcc || !toAcc) return;

    await updateCashAccountBalance(fromId, fromAcc.balance - amount);
    await updateCashAccountBalance(toId, toAcc.balance + amount);

    await logActivity(`Transfer saldo sebesar Rp ${amount.toLocaleString()} dari ${fromAcc.accountName} ke ${toAcc.accountName}`, 'Kas & Bank');
    await addNotification('Mutasi Pemindahan Kas', `Transfer kas sukses senilai Rp ${amount.toLocaleString()}`, 'info');
  };

  // 11. Settings
  const updateSettings = async (data: Partial<SystemSetting>) => {
    const newSettings = { ...settings, ...data };
    if (isDemoMode) {
      setSettings(newSettings);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('settings'), settings.id || 'set-global'), newSettings, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `settings/${settings.id || 'set-global'}`);
      }
    }
    await logActivity('Memperbarui profil & preferensi billing perusahaan', 'Sistem');
  };

  // 12. Rental Contracts
  const addContract = async (data: Omit<RentContract, 'id' | 'contractId' | 'contractNumber' | 'status' | 'createdAt' | 'updatedAt' | 'signatureDrawBase64' | 'signedAt'>): Promise<RentContract> => {
    const id = `cnt-${Date.now()}`;
    const nextNum = contracts.length + 1;
    const contractNumber = `CNT/${new Date().toISOString().replace(/-/g, '').slice(0, 8)}/${String(nextNum).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().split('T')[0];

    const newContract: RentContract = {
      id,
      contractId: id,
      contractNumber,
      status: 'Draft',
      createdAt: timestamp,
      updatedAt: timestamp,
      ...data,
      rentalAmount: Number(data.rentalAmount)
    };

    if (isDemoMode) {
      setContracts(prev => [...prev, newContract]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('contracts'), id), newContract);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `contracts/${id}`);
      }
    }

    await logActivity(`Membuat draf kontrak sewa baru: ${contractNumber} untuk ${data.customerName}`, 'Kontrak Sewa');
    await addNotification('Kontrak Sewa Baru Tercatat', `Draf kontrak ${contractNumber} berhasil dibuat`, 'success');
    return newContract;
  };

  const updateContract = async (id: string, data: Partial<RentContract>) => {
    const timestamp = new Date().toISOString().split('T')[0];
    if (isDemoMode) {
      setContracts(prev => prev.map(c => c.id === id ? { ...c, ...data, updatedAt: timestamp } : c));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('contracts'), id), { ...data, updatedAt: timestamp }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `contracts/${id}`);
      }
    }
    await logActivity(`Memperbarui kontrak sewa ID: ${id}`, 'Kontrak Sewa');
  };

  const deleteContract = async (id: string) => {
    if (isDemoMode) {
      setContracts(prev => prev.filter(c => c.id !== id));
    } else {
      try {
        await deleteDoc(doc(db, getUserColPath('contracts'), id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `contracts/${id}`);
      }
    }
    await logActivity(`Menghapus kontrak sewa ID: ${id}`, 'Kontrak Sewa');
  };

  const signContract = async (id: string, signatureBase64: string, signatureQrBase64?: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;

    const signatureTime = new Date().toLocaleString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (isDemoMode) {
      setContracts(prev => prev.map(c => c.id === id ? { 
        ...c, 
        status: 'Aktif', 
        signatureDrawBase64: signatureBase64, 
        signatureQrBase64: signatureQrBase64 || c.signatureQrBase64,
        signedAt: signatureTime,
        updatedAt: timestamp 
      } : c));
    } else {
      try {
        const updateObj: any = { 
          status: 'Aktif', 
          signatureDrawBase64: signatureBase64, 
          signedAt: signatureTime,
          updatedAt: timestamp 
        };
        if (signatureQrBase64) {
          updateObj.signatureQrBase64 = signatureQrBase64;
        }
        await setDoc(doc(db, getUserColPath('contracts'), id), updateObj, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `contracts/${id}`);
      }
    }

    await logActivity(`Kontrak sewa ${contract.contractNumber} telah ditandatangani secara elektronik`, 'Kontrak Sewa');
    await addNotification('Tanda Tangan Kontrak Sewa', `Kontrak ${contract.contractNumber} telah aktif setelah ditandatangani`, 'success');
  };

  const addPayoutRequest = async (data: Omit<CommissionPayout, 'id' | 'payoutId' | 'payoutNumber' | 'status' | 'requestedAt'>): Promise<CommissionPayout> => {
    const id = `payo-${Date.now()}`;
    const nextNum = payouts.length + 1;
    const payoutNumber = `PAYO/${new Date().toISOString().replace(/-/g, '').slice(0, 8)}/${String(nextNum).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().split('T')[0];

    const newPayout: CommissionPayout = {
      id,
      payoutId: id,
      payoutNumber,
      status: 'Diajukan',
      requestedAt: timestamp,
      ...data,
      amount: Number(data.amount)
    };

    if (isDemoMode) {
      setPayouts(prev => [...prev, newPayout]);
    } else {
      try {
        await setDoc(doc(db, getUserColPath('payouts'), id), newPayout);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `payouts/${id}`);
      }
    }

    await logActivity(`Mengajukan pencairan komisi Rp ${newPayout.amount.toLocaleString('id-ID')} untuk ${data.salesName}`, 'Sales & Komisi');
    await addNotification('Pengajuan Pencairan Komisi', `Pengajuan ${payoutNumber} senilai Rp ${newPayout.amount.toLocaleString('id-ID')} berhasil diajukan`, 'success');
    return newPayout;
  };

  const updatePayoutStatus = async (id: string, status: PayoutStatus, notes?: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const payout = payouts.find(p => p.id === id);
    if (!payout) return;

    const dataUpdate: Partial<CommissionPayout> = {
      status,
      processedAt: timestamp,
      notes: notes || ''
    };

    if (isDemoMode) {
      setPayouts(prev => prev.map(p => p.id === id ? { ...p, ...dataUpdate } : p));
    } else {
      try {
        await setDoc(doc(db, getUserColPath('payouts'), id), dataUpdate, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `payouts/${id}`);
      }
    }

    await logActivity(`Mengubah status pencairan komisi ${payout.payoutNumber} menjadi ${status}`, 'Sales & Komisi');
    await addNotification('Status Pencairan Diperbarui', `Pengajuan ${payout.payoutNumber} kini berstatus ${status}`, status === 'Selesai' ? 'success' : 'warning');
  };

  const updateSalesTarget = async (salesId: string, salesName: string, month: string, targetAmount: number) => {
    const id = `trg-${salesId}-${month}`;
    const newTarget: SalesTarget = {
      id,
      salesId,
      salesName,
      month,
      targetAmount: Number(targetAmount)
    };

    if (isDemoMode) {
      setTargets(prev => {
        const filtered = prev.filter(t => t.id !== id);
        return [...filtered, newTarget];
      });
    } else {
      try {
        await setDoc(doc(db, getUserColPath('targets'), id), newTarget);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `targets/${id}`);
      }
    }

    await logActivity(`Memperbarui target penjualan ${salesName} untuk bulan ${month} sebesar Rp ${Number(targetAmount).toLocaleString('id-ID')}`, 'Sales & Komisi');
  };

  return (
    <BillingContext.Provider value={{
      currentUser,
      loading,
      isDemoMode,
      customers,
      products,
      productCategories,
      invoices,
      payments,
      expenses,
      cashAccounts,
      receivables,
      notifications,
      logs,
      settings,
      users,
      contracts,
      payouts,
      targets,
      login,
      register,
      loginWithGoogle,
      loginAsDemo,
      logout,
      updateUserRole,
      updateLocalUserRole,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addProduct,
      updateProduct,
      deleteProduct,
      addProductCategory,
      updateProductCategory,
      deleteProductCategory,
      addInvoice,
      updateInvoice,
      updateInvoiceStatus,
      deleteInvoice,
      addPayment,
      validatePayment,
      addExpense,
      deleteExpense,
      transferCash,
      updateCashAccountBalance,
      addCashAccount,
      updateSettings,
      logActivity,
      addNotification,
      markNotificationAsRead,
      markAsRead: markNotificationAsRead,
      seedInitialData,
      runOverdueInvoicesCheck,
      sendOverdueReminderEmail,
      sendAllOverdueEmailReminders,
      addContract,
      updateContract,
      deleteContract,
      signContract,
      addPayoutRequest,
      updatePayoutStatus,
      updateSalesTarget
    }}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used inside a BillingProvider');
  }
  return context;
};
