import React, { useState } from 'react';
import { useBilling } from '../context/BillingContext';
import { User, Shield, Terminal, Clock, Settings, UserCheck, AlertCircle } from 'lucide-react';

export const UserRoleView: React.FC = () => {
  const { users, currentUser, updateLocalUserRole, logs } = useBilling();
  
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newRole, setNewRole] = useState<'Super Admin' | 'Admin Keuangan' | 'Staff' | 'Viewer' | 'Sales'>('Viewer');
  const [newCommissionRate, setNewCommissionRate] = useState<number | ''>(5);

  const handleRoleChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    updateLocalUserRole(
      selectedUserId, 
      newRole, 
      newRole === 'Sales' ? (newCommissionRate === '' ? 5 : Number(newCommissionRate)) : undefined
    );
    setSelectedUserId('');
  };

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="userrole-view-main">
      
      {/* Col 1 & 2: User management and settings info */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Manajemen Pengguna & Hak Akses (RBAC)</span>
            <Shield size={16} className="text-red-600" />
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-1 mb-4 leading-normal">Super Admin dapat menetapkan kewenangan bertingkat. Batasi akses staff agar keuangan perusahaan terjamin aman.</p>

          <div className="space-y-4">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-xl hover:bg-slate-100/50 transition">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-bold text-xs rounded-full shadow-inner border border-slate-700">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">{u.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold font-mono">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {u.role === 'Sales' && (
                    <span className="text-[10px] text-slate-500 font-extrabold mr-1 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
                      Komisi: {u.commissionRate !== undefined ? `${u.commissionRate}%` : '5% (Default)'}
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 text-[9px] font-extrabold rounded-full ${
                    u.role === 'Super Admin'
                      ? 'bg-red-50 text-red-600 border border-red-105'
                      : u.role === 'Admin Keuangan'
                      ? 'bg-amber-50 text-amber-700 border border-amber-105'
                      : u.role === 'Staff'
                      ? 'bg-blue-50 text-blue-700'
                      : u.role === 'Sales'
                      ? 'bg-purple-50 text-purple-700 border border-purple-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {u.role}
                  </span>
                  {isSuperAdmin && u.id !== currentUser?.id && (
                    <button
                      onClick={() => {
                        setSelectedUserId(u.id);
                        setNewRole(u.role);
                        setNewCommissionRate(u.commissionRate !== undefined ? u.commissionRate : 5);
                      }}
                      className="px-2 py-1 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-bold text-slate-600 cursor-pointer"
                      id={`edit-role-btn-${u.id}`}
                    >
                      Ubah Akses
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical Audit Trail log */}
        <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm">
          <h3 className="font-bold text-slate-930 text-sm pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Log Audit Trail Aktivitas Pengguna (Log Trail)</span>
            <Terminal size={16} className="text-slate-500" />
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-1 mb-4">Setiap tindakan krusial disimpan secara otomatis oleh sistem.</p>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {logs.map((log, index) => (
              <div key={log.id || index} className="flex space-x-3 text-xs">
                {/* Timeline circle dot */}
                <div className="relative flex flex-col items-center">
                  <div className="w-2 h-2 bg-red-600 rounded-full ring-4 ring-red-50 mt-1"></div>
                  {index < logs.length - 1 && <div className="w-0.5 bg-slate-150 flex-1 my-1"></div>}
                </div>
                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex justify-between items-start text-[10px] font-bold text-slate-400">
                    <span className="text-red-650 bg-red-50 px-1.5 py-0.5 rounded uppercase">{log.module}</span>
                    <span className="flex items-center space-x-1 font-semibold text-slate-500">
                      <Clock size={11} />
                      <span>{log.timestamp}</span>
                    </span>
                  </div>
                  <p className="font-bold text-slate-805 mt-1">{log.action}</p>
                  <p className="text-[10px] text-slate-405 font-semibold mt-0.5">Oleh: {log.userEmail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Role Changer popup modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-105 shadow-2xl animate-scale-up">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Atur Peranan Pengguna</h4>
            <form onSubmit={handleRoleChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pilih Peranan</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full border border-slate-200 p-2 text-xs rounded-lg bg-white cursor-pointer"
                  id="form-user-role-select"
                >
                  <option value="Super Admin">Super Admin (Akses Penuh)</option>
                  <option value="Admin Keuangan">Admin Keuangan (Validasi & Jurnal)</option>
                  <option value="Staff">Staff (Catat & Cetak)</option>
                  <option value="Sales">Sales (Kawal Omzet & Komisi)</option>
                  <option value="Viewer">Viewer (Hanya Membaca)</option>
                </select>
              </div>

              {newRole === 'Sales' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Persentase Komisi (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full border border-slate-200 p-2 text-xs rounded-lg bg-white outline-none focus:border-red-500"
                    id="form-user-commission-rate"
                    placeholder="Contoh: 5"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Ditetapkan khusus sebagai dasar penghitungan komisi sales ini.</p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserId('')}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                  id="cancel-role-btn"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow"
                  id="save-role-btn"
                >
                  Update Akses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
