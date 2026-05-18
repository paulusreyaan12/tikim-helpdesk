/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Ticket as TicketIcon, 
  PlusCircle, 
  Search, 
  User, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Filter,
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  FileText,
  ArrowLeft,
  Settings,
  Layers,
  Download,
  Phone,
  Send,
  UserCheck,
  Wrench,
  BarChart3,
  Eye,
  XCircle,
  CheckCircle,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { User as UserType, Ticket, TicketMessage, Category, SLAPolicy } from './types';

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string, key?: React.Key }) => (
  <div className={`backdrop-blur-xl bg-white/30 border border-white/40 shadow-lg rounded-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, status, className = "" }: { children: React.ReactNode, status?: string, className?: string }) => {
  const getStatusStyle = (s: string) => {
    switch(s) {
      case 'DITERIMA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DIVERIFIKASI_ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'DIPROSES_TEKNISI': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'PENDING': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'SELESAI': return 'bg-green-100 text-green-700 border-green-200';
      case 'DITOLAK': return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH': case 'CRITICAL': return 'bg-red-50 text-red-600 border-red-100';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'LOW': return 'bg-green-50 text-green-600 border-green-100';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(status || children as string)} ${className}`}>
      {children}
    </span>
  );
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
  />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea 
    {...props} 
    className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400 min-h-[100px]"
  />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select 
    {...props} 
    className="w-full px-4 py-2.5 rounded-xl border border-white/50 bg-white/50 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/50"
  />
);

const Button = ({ children, variant = 'primary', size = 'md', ...props }: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'white', size?: 'sm' | 'md' | 'lg' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200',
    secondary: 'bg-white/50 text-gray-700 hover:bg-white/80 border border-white/60',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-red-200',
    ghost: 'bg-transparent text-gray-600 hover:bg-white/40',
    white: 'bg-white text-blue-600 hover:bg-blue-50 shadow-sm',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-4 text-base',
  };
  return (
    <button 
      {...props} 
      className={`${sizes[size]} rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg flex items-center justify-center gap-2 ${variants[variant]}`}
    >
      {children}
    </button>
  );
};

// --- Main App ---

type ViewState = 'landing' | 'public-create' | 'public-track' | 'dashboard' | 'tickets' | 'detail' | 'verification' | 'assignment' | 'reports' | 'categories' | 'sla';

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [view, setView] = useState<ViewState>('landing');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<(Ticket & { messages: TicketMessage[] }) | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Forms
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [trackForm, setTrackForm] = useState({ ticket_no: '', contact: '' });
  const [trackResult, setTrackResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedKtpFile, setSelectedKtpFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({ note: '', status: '', file: null as File | null });
  const [feedbackPreview, setFeedbackPreview] = useState<string | null>(null);
  const [complaintType, setComplaintType] = useState<'EXTERNAL' | 'INTERNAL'>('EXTERNAL');
  const [complaintForm, setComplaintForm] = useState({
    reporter_name: '',
    reporter_contact: '', // wa_number for external, internal_contact for internal
    reporter_unit: '',
    category_id: '',
    subject: '',
    description: '',
    priority: 'MEDIUM',
    other_category: ''
  });

  const isOtherCategory = useMemo(() => {
    const cat = categories.find(c => c.id === parseInt(complaintForm.category_id));
    return cat?.name === 'Lainnya';
  }, [complaintForm.category_id, categories]);

  const [reportConfig, setReportConfig] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'EXTERNAL' as 'EXTERNAL' | 'INTERNAL',
    category_group: 'KEIMIGRASIAN' as 'KEIMIGRASIAN' | 'NON_KEIMIGRASIAN'
  });

  useEffect(() => {
    checkDbStatus();
    fetchCategories();
    if (user) {
      fetchTickets();
      fetchDashboard();
      fetchUsers();
    }
  }, [user]);

  const safeFetch = async (url: string, options?: RequestInit, retries = 15) => {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get("content-type");
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) {
          // Retry on 503 Service Unavailable (often means DB connecting or server starting)
          if (res.status === 503 && retries > 0) {
            console.warn(`Server returned 503 for ${url}, retrying in 4s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 4000));
            return safeFetch(url, options, retries - 1);
          }
          console.error(`API Error (${res.status}) for ${url}:`, data);
          throw new Error(data.message || `Server error: ${res.status}`);
        }
        return data;
      } else {
        const text = await res.text();
        
        // If we get HTML but expected JSON, it might be the infrastructure loading page
        if (text.includes("<!doctype html>") || text.includes("<html")) {
          if (retries > 0) {
            console.warn(`Got HTML for ${url}, retrying in 4s... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 4000));
            return safeFetch(url, options, retries - 1);
          }
          throw new Error("Server is Masih Menyiapkan Sistem. Mohon tunggu sebentar dan refresh halaman.");
        }

        console.error(`Non-JSON response (${res.status}) for ${url}. Content-Type: ${contentType}. Body:`, text.substring(0, 200));
        
        if (!res.ok) {
          throw new Error(`Server error (${res.status}): ${text.substring(0, 50)}...`);
        }
        throw new Error("Server returned non-JSON response. Check server logs.");
      }
    } catch (e: any) {
      const isNetworkError = e.message.includes("Failed to fetch") || e.message.includes("NetworkError");
      const isStartingUp = e.message.includes("Server error: 503") || e.message.includes("Database not connected");
      
      if (retries > 0 && (isNetworkError || isStartingUp)) {
        console.warn(`Fetch failed for ${url} (${e.message}), retrying in 4s... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 4000));
        return safeFetch(url, options, retries - 1);
      }
      console.error(`Fetch error for ${url}:`, e);
      throw e;
    }
  };

  const checkDbStatus = async () => {
    try {
      const data = await safeFetch('/api/db-status');
      if (!data.connected) setDbError("Database tidak terhubung.");
    } catch (e) {
      setDbError("Gagal cek status database.");
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await safeFetch('/api/categories');
      setCategories(data);
    } catch (e) { console.error(e); }
  };

  const fetchTickets = async () => {
    if (!user) return;
    try {
      const data = await safeFetch(`/api/tickets?role=${user.role}&userId=${user.id}`);
      setTickets(data);
    } catch (e) { console.error(e); }
  };

  const fetchDashboard = async () => {
    try {
      const data = await safeFetch('/api/dashboard/stats');
      setStats(data);
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const data = await safeFetch('/api/users');
      setUsers(data);
    } catch (e) { console.error(e); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userData = await safeFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      setUser(userData);
      setView('dashboard');
    } catch (e) {
      alert("Login gagal. Periksa kembali username dan password.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File terlalu besar. Maksimum 5MB.");
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setFilePreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
            if (!selectedKtpFile) {
              alert("File KTP wajib diupload.");
              return;
            }
            const formData = new FormData();
      formData.append('type', complaintType);
      formData.append('reporter_name', complaintForm.reporter_name);
      formData.append('reporter_contact', complaintForm.reporter_contact);
      formData.append('reporter_unit', complaintType === 'INTERNAL' ? complaintForm.reporter_unit : '');
      formData.append('category_id', complaintForm.category_id);
      formData.append('subject', complaintForm.subject);
      formData.append('description', complaintForm.description);
      formData.append('priority', complaintForm.priority);
      formData.append('other_category', complaintForm.other_category);
      
      if (selectedFile) {
        formData.append('attachment', selectedFile);
      }
      
      if (selectedKtpFile) {
        formData.append('ktp_file', selectedKtpFile);
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert(`Tiket ${complaintType === 'EXTERNAL' ? 'Pengaduan' : 'Helpdesk'} berhasil dikirim!\nNomor Tiket: ${data.ticket_no}\nSimpan nomor ini untuk melacak status tiket Anda.`);
        setComplaintForm({
          reporter_name: '',
          reporter_contact: '',
          reporter_unit: '',
          category_id: '',
          subject: '',
          description: '',
          priority: 'MEDIUM',
          other_category: ''
        });
        setSelectedFile(null);
        setSelectedKtpFile(null);
        setFilePreview(null);
        setView('landing');
      } else {
        alert("Gagal mengirim tiket: " + (data.message || "Terjadi kesalahan"));
      }
    } catch (e: any) {
      alert("Terjadi kesalahan saat mengirim tiket: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await safeFetch('/api/tickets/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackForm)
      });
      setTrackResult(data);
    } catch (e) {
      setTrackResult(null);
      alert("Tiket tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: number, action: 'valid' | 'spam') => {
    try {
      const data = await safeFetch(`/api/tickets/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, admin_id: user?.id })
      });
      if (data.success) {
        fetchTickets();
        fetchDashboard();
        if (selectedTicket?.id === id) {
          const detailData = await safeFetch(`/api/tickets/${id}`);
          setSelectedTicket(detailData);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleAssign = async (id: number, technicianId: number) => {
    try {
      const data = await safeFetch(`/api/tickets/${id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: technicianId })
      });
      if (data.success) {
        fetchTickets();
        fetchDashboard();
        if (selectedTicket?.id === id) {
          const detailData = await safeFetch(`/api/tickets/${id}`);
          setSelectedTicket(detailData);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleAddMessage = async (ticketId: number, message: string) => {
    try {
      const data = await safeFetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user?.id, message })
      });
      if (data.success) {
        // Refresh ticket detail
        const detailData = await safeFetch(`/api/tickets/${ticketId}`);
        setSelectedTicket(detailData);
      }
    } catch (e) { console.error(e); }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('note', feedbackForm.note);
      formData.append('status', feedbackForm.status);
      formData.append('user_id', String(user?.id));
      if (feedbackForm.file) {
        formData.append('feedback_file', feedbackForm.file);
      }

      const res = await fetch(`/api/tickets/${selectedTicket.id}/feedback`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Berhasil mengirim hasil penanganan.");
        setFeedbackForm({ note: '', status: '', file: null });
        setFeedbackPreview(null);
        // Refresh detail
        const detailData = await safeFetch(`/api/tickets/${selectedTicket.id}`);
        setSelectedTicket(detailData);
        fetchTickets();
        fetchDashboard();
      } else {
        alert("Gagal mengirim feedback: " + (data.message || "Server error"));
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string, note?: string) => {
    try {
      const data = await safeFetch(`/api/tickets/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, technician_note: note })
      });
      if (data.success) {
        fetchTickets();
        fetchDashboard();
        if (selectedTicket?.id === id) {
          const detailData = await safeFetch(`/api/tickets/${id}`);
          setSelectedTicket(detailData);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleDownloadReport = async () => {
    window.open(`/api/reports/monthly?month=${reportConfig.month}&year=${reportConfig.year}`, '_blank');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await safeFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      });
      if (data.id) {
        fetchCategories();
        setCategoryForm({ name: '', type: 'EXTERNAL', category_group: 'KEIMIGRASIAN' });
        alert("Kategori berhasil ditambahkan.");
      }
    } catch (e) { alert("Gagal tambah kategori."); }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      await safeFetch(`/api/categories/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (e) { alert("Gagal hapus kategori."); }
  };

  // --- UI Layouts ---

  if (view === 'landing' || view === 'public-create' || view === 'public-track') {
    return (
      <div className="min-h-screen relative font-sans text-gray-900 selection:bg-blue-200 overflow-x-hidden">
        {/* Background Image for Landing */}
        {view === 'landing' && (
          <div className="absolute inset-0 z-0">
            <img 
              src="/kantor.png" 
              alt="Background" 
              className="w-full h-full object-cover opacity-50"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-blue-800/40 to-blue-900/80"></div>
          </div>
        )}

        {/* Background Gradient for other public views */}
        {view !== 'landing' && (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700"></div>
        )}
        
        {/* Navbar */}
        <nav className="relative z-10 p-6 flex justify-between items-center max-w-7xl mx-auto backdrop-blur-md bg-white/10 border-b border-white/20 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <img 
                src="/logo-kemenimipas.png" 
                alt="Logo Kemenimipas" 
                className="h-12 w-auto drop-shadow-md"
                referrerPolicy="no-referrer"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <img 
                src="/logo-imigrasi.webp" 
                alt="Logo Imigrasi" 
                className="h-12 w-auto drop-shadow-md"
                referrerPolicy="no-referrer"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
            <div className="h-10 w-[1px] bg-white/30 mx-2"></div>
            <span className="text-white font-black text-xl tracking-tight">TIKIM <span className="font-light">Helpdesk</span></span>
          </div>
          <div className="flex gap-4">
            <Button variant="white" onClick={() => setView('dashboard')}>Login Petugas</Button>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto p-6 pt-12">
          {view === 'landing' && (
            <div className="grid lg:grid-cols-2 gap-12 items-center py-12">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
                <Badge status="DITERIMA" className="mb-6 bg-white-500/20 text-white-100 border-blue-400/30">Layanan Kantor Imigrasi Kelas I TPI Jayapura</Badge>
                <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight mb-6 drop-shadow-lg">
                  Pengaduan Masyarakat <br />
                  <span className="text-blue-300">Kantor Imigrasi Jayapura</span>
                </h1>
                <p className="text-blue-50 text-xl mb-10 leading-relaxed max-w-xl drop-shadow-md">
                  Sampaikan aspirasi, keluhan, dan pengaduan Anda secara digital untuk pelayanan keimigrasian yang lebih transparan dan akuntabel.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" variant="white" className="px-10 py-5 text-lg" onClick={() => setView('public-create')}>
                    <PlusCircle size={24} /> Kirim Pengaduan
                  </Button>
                  <Button size="lg" variant="secondary" className="bg-blue-800/40 text-white border-blue-400/30 px-10 py-5 text-lg backdrop-blur-md" onClick={() => setView('public-track')}>
                    <Search size={24} /> Cek Status Pengaduan
                  </Button>
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hidden lg:block">
                <GlassCard className="p-12 aspect-square flex items-center justify-center relative overflow-hidden border-white/20 bg-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-40 h-40 bg-white/20 backdrop-blur-md rounded-[40px] mx-auto mb-8 flex items-center justify-center border border-white/30 shadow-2xl">
                      <Phone className="text-white" size={80} />
                    </div>
                    <h3 className="text-white text-3xl font-black mb-4">Pusat Bantuan</h3>
                    <p className="text-blue-100 text-lg">Kami siap melayani Anda</p>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          )}

          {view === 'public-create' && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
              <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setView('landing')} className="p-2 hover:bg-white/20 rounded-lg text-white transition-all">
                      <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-3xl font-black text-white">Buat Tiket</h2>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-white/20 p-1 rounded-xl mb-8 border border-white/30">
                  <button 
                    onClick={() => setComplaintType('EXTERNAL')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${complaintType === 'EXTERNAL' ? 'bg-white text-blue-600 shadow-lg' : 'text-white hover:bg-white/10'}`}
                  >
                    Masyarakat
                  </button>
                  <button 
                    onClick={() => setComplaintType('INTERNAL')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${complaintType === 'INTERNAL' ? 'bg-white text-blue-600 shadow-lg' : 'text-white hover:bg-white/10'}`}
                  >
                    Internal (Pegawai)
                  </button>
                </div>

                <form onSubmit={handleCreateComplaint} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-blue-50 ml-1">Nama Lengkap</label>
                      <Input 
                        placeholder="Masukkan nama Anda" 
                        required 
                        value={complaintForm.reporter_name}
                        onChange={e => setComplaintForm({...complaintForm, reporter_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-blue-50 ml-1">
                        {complaintType === 'EXTERNAL' ? 'Nomor HP / WA' : 'Kontak Internal'}
                      </label>
                      <Input 
                        placeholder={complaintType === 'EXTERNAL' ? 'Contoh: 08123456789' : 'Ext / No HP'} 
                        required 
                        value={complaintForm.reporter_contact}
                        onChange={e => setComplaintForm({...complaintForm, reporter_contact: e.target.value})}
                      />
                    </div>
                  </div>

                  {complaintType === 'INTERNAL' && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-blue-50 ml-1">Unit Kerja</label>
                      <Input 
                        placeholder="Contoh: Lalu Lintas / TIKIM" 
                        required 
                        value={complaintForm.reporter_unit}
                        onChange={e => setComplaintForm({...complaintForm, reporter_unit: e.target.value})}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-50 ml-1">Kategori {complaintType === 'EXTERNAL' ? 'Pengaduan' : 'Layanan'}</label>
                    <Select 
                      required 
                      value={complaintForm.category_id}
                      onChange={e => setComplaintForm({...complaintForm, category_id: e.target.value})}
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.length === 0 ? (
                        <option disabled>Kategori belum tersedia</option>
                      ) : (
                        complaintType === 'EXTERNAL' ? (
                          <>
                            <optgroup label="Keimigrasian">
                              {categories.filter(c => c.type === 'EXTERNAL' && c.category_group === 'KEIMIGRASIAN').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Lainnya">
                              {categories.filter(c => c.type === 'EXTERNAL' && c.category_group === 'NON_KEIMIGRASIAN').map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          categories.filter(c => c.type === 'INTERNAL').map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))
                        )
                      )}
                    </Select>
                  </div>

                  {isOtherCategory && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                      <label className="text-sm font-bold text-blue-50 ml-1">Jelaskan kategori lainnya (Subkategori)</label>
                      <Input 
                        placeholder="Contoh: Pengaduan terkait X..." 
                        required 
                        value={complaintForm.other_category}
                        onChange={e => setComplaintForm({...complaintForm, other_category: e.target.value})}
                      />
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-50 ml-1">Judul Laporan</label>
                    <Input 
                      placeholder="Ringkasan singkat masalah" 
                      required 
                      value={complaintForm.subject}
                      onChange={e => setComplaintForm({...complaintForm, subject: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-50 ml-1">Isi Laporan</label>
                    <TextArea 
                      placeholder="Jelaskan secara detail pengaduan Anda..." 
                      required 
                      value={complaintForm.description}
                      onChange={e => setComplaintForm({...complaintForm, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-50 ml-1">Upload Bukti (Opsional)</label>
                    <label className="text-sm font-bold text-blue-50 ml-1">Lampiran Dokumen (Opsional - Maks 5MB)</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        id="attachment-upload"
                        className="hidden" 
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg"
                      />
                      <label 
                        htmlFor="attachment-upload"
                        className={`flex flex-col items-center justify-center w-full min-h-[120px] rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-white/10 ${selectedFile ? 'border-green-400/50 bg-green-400/5' : 'border-white/30 hover:border-white/50 hover:bg-white/20'}`}
                      >
                        {selectedFile ? (
                          <div className="flex flex-col items-center p-4">
                            {filePreview ? (
                              <img src={filePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg mb-2 shadow-lg" />
                            ) : (
                              <div className="p-3 bg-white/20 rounded-xl mb-2"><FileText className="text-white" size={32} /></div>
                            )}
                            <p className="text-white font-bold text-xs truncate max-w-[200px]">{selectedFile.name}</p>
                            <p className="text-green-300 text-[10px] font-black uppercase tracking-widest mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-4">
                            <PlusCircle className="text-white/60 mb-2" size={32} />
                            <p className="text-white/60 text-xs font-bold">Klik untuk pilih file atau seret kemari</p>
                            <p className="text-white/40 text-[10px] mt-1 font-medium">Support: PDF, PNG, JPG, JPEG</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-bold text-blue-50 ml-1">
                      Upload KTP (Wajib)
                    </label>

                  <div className="relative group">
                    <input
                      type="file"
                      id="ktp-upload"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedKtpFile(file);
                      }}
                      required
                    />

                    <label
                      htmlFor="ktp-upload"
                      className={`flex flex-col items-center justify-center w-full min-h-[120px] rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-white/10 ${
                        selectedKtpFile
                          ? 'border-green-400/50 bg-green-400/5'
                          : 'border-white/30 hover:border-white/50 hover:bg-white/20'
                      }`}
                    >
                      {selectedKtpFile ? (
                        <div className="flex flex-col items-center p-4">
                          <div className="p-3 bg-white/20 rounded-xl mb-2">
                            <UserCheck className="text-white" size={32} />
                          </div>

                          <p className="text-white font-bold text-xs truncate max-w-[200px]">
                            {selectedKtpFile.name}
                          </p>

                          <p className="text-green-300 text-[10px] font-black uppercase tracking-widest mt-1">
                            {(selectedKtpFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-4">
                          <UserCheck className="text-white/60 mb-2" size={32} />

                          <p className="text-white/60 text-xs font-bold">
                            Upload KTP
                          </p>

                          <p className="text-white/40 text-[10px] mt-1 font-medium">
                            Support: PDF, PNG, JPG, JPEG
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                  <Button type="submit" size="lg" className="w-full mt-4" disabled={loading}>
                    {loading ? 'Mengirim...' : 'Simpan Tiket Pengaduan'}
                  </Button>
                </form>
              </GlassCard>
            </motion.div>
          )}

          {view === 'public-track' && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
              <GlassCard className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setView('landing')} className="p-2 hover:bg-white/20 rounded-lg text-white transition-all">
                    <ArrowLeft size={24} />
                  </button>
                  <h2 className="text-3xl font-black text-white">Lacak Pengaduan</h2>
                </div>
                <form onSubmit={handleTrack} className="space-y-5 mb-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-50 ml-1">Nomor Tiket</label>
                    <Input 
                      placeholder="Contoh: IM-JPR-2026-0001" 
                      required 
                      value={trackForm.ticket_no}
                      onChange={e => setTrackForm({...trackForm, ticket_no: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-blue-50 ml-1">Nomor HP / WA</label>
                    <Input 
                      placeholder="Masukkan nomor HP" 
                      required 
                      value={trackForm.contact}
                      onChange={e => setTrackForm({...trackForm, contact: e.target.value})}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? 'Mencari...' : 'Cek Status'}
                  </Button>
                </form>

                {trackResult && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="bg-white/20 rounded-2xl p-6 border border-white/30 shadow-xl overflow-hidden relative">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TicketIcon size={80} />
                      </div>
                      
                      <div className="flex flex-wrap justify-between items-start gap-4 mb-6 relative">
                        <div>
                          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1.5">Status Pengaduan</p>
                          <Badge status={trackResult.status} className="text-sm px-4 py-1.5">{trackResult.status}</Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1.5">Nomor Tiket</p>
                          <p className="text-white font-black text-xl">{trackResult.ticket_no}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/20 relative">
                        <div className="space-y-4">
                          <div>
                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Nama Pelapor</p>
                            <p className="text-white font-bold">{trackResult.reporter_name}</p>
                          </div>
                          <div>
                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Kategori</p>
                            <p className="text-white font-bold">{trackResult.category_name}</p>
                          </div>
                          <div>
                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Prioritas</p>
                            <Badge status={trackResult.priority}>{trackResult.priority}</Badge>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Tanggal Dibuat</p>
                            <p className="text-white font-bold">{new Date(trackResult.created_at).toLocaleString('id-ID')}</p>
                          </div>
                          <div>
                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Teknisi Penangan</p>
                            <p className="text-white font-bold">{trackResult.assignee_name || '-'}</p>
                          </div>
                          <div>
                            <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-1">Update Terakhir</p>
                            <p className="text-white font-bold">{new Date(trackResult.updated_at).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/20 relative">
                        <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-2">Isi Laporan</p>
                        <div className="bg-white/10 rounded-xl p-4 text-white text-sm leading-relaxed italic">
                          "{trackResult.description}"
                        </div>
                      </div>
                    </div>

                    {/* Hasil Akhir */}
                    {(trackResult.status === 'SELESAI' || trackResult.status === 'CLOSED') && trackResult.feedbacks && trackResult.feedbacks.length > 0 && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-green-500/30 rounded-2xl p-6 border border-green-400/40 shadow-xl overflow-hidden ring-4 ring-green-400/20">
                        <h4 className="text-white font-black text-xl mb-4 flex items-center gap-2">
                          <CheckCircle2 size={24} className="text-green-300" /> HASIL PENANGANAN
                        </h4>
                        <div className="bg-white/10 rounded-xl p-5 mb-5 border border-white/20">
                          <p className="text-white font-medium leading-relaxed">{trackResult.feedbacks[0].note}</p>
                        </div>
                        
                        {trackResult.feedbacks[0].file_path && (
                          <div className="flex justify-start">
                            <a 
                              href={`/${trackResult.feedbacks[0].file_path}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-3 bg-white/20 hover:bg-white/30 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all border border-white/30"
                            >
                              <Download size={18} />
                              Unduh Surat Hasil Penanganan
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
          )}
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 flex items-center justify-center p-6 font-sans">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <GlassCard className="p-10 border-white/20 bg-white/20">
            <div className="text-center mb-10">
              <div className="flex justify-center gap-3 mb-6">
                <img 
                  src="/logo-kemenimipas.png" 
                  alt="Logo" 
                  className="h-16 w-auto drop-shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <img 
                  src="/logo-imigrasi.webp" 
                  alt="Logo" 
                  className="h-16 w-auto drop-shadow-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">TIKIM Helpdesk</h2>
              <p className="text-blue-100 font-medium">Portal Internal Petugas Imigrasi</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-50 ml-1">Username</label>
                <Input 
                  required 
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  placeholder="Masukkan username"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-blue-50 ml-1">Password</label>
                <Input 
                  type="password" 
                  required 
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Masukkan password"
                />
              </div>
              <Button type="submit" size="lg" className="w-full py-4 text-lg" disabled={loading}>
                {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <button onClick={() => setView('landing')} className="text-blue-100 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2 mx-auto">
                <ArrowLeft size={16} /> Kembali ke Beranda Publik
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center px-5 py-3.5 rounded-2xl transition-all mb-2 group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-white/60 hover:text-blue-600'}`}
    >
      <Icon size={20} className={`mr-3 transition-colors ${active ? 'text-white' : 'text-gray-400 group-hover:text-blue-500'}`} />
      <span className="font-bold text-sm">{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-white flex font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-72 bg-white/40 backdrop-blur-2xl border-r border-white/40 p-6 flex flex-col sticky top-0 h-screen shadow-xl">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="flex items-center gap-1">
            <img 
              src="/logo-kemenimipas.png" 
              alt="Logo" 
              className="h-8 w-auto"
              referrerPolicy="no-referrer"
            />
            <img 
              src="/logo-imigrasi.webp" 
              alt="Logo" 
              className="h-8 w-auto"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="font-black text-gray-900 leading-none text-lg">TIKIM</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-1">Helpdesk</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {user.role === 'ADMIN' && (
            <>
              <div className="px-4 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Menu Utama</div>
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
              <SidebarItem icon={TicketIcon} label="Pengaduan Masuk" active={view === 'tickets'} onClick={() => setView('tickets')} />
              <SidebarItem icon={UserCheck} label="Verifikasi Pengaduan" active={view === 'verification'} onClick={() => setView('verification')} />
              <SidebarItem icon={Wrench} label="Assign Teknisi" active={view === 'assignment'} onClick={() => setView('assignment')} />
              <SidebarItem icon={Clock} label="Monitoring Status" active={view === 'tickets'} onClick={() => setView('tickets')} />
              <SidebarItem icon={Layers} label="Kategori" active={view === 'categories'} onClick={() => setView('categories')} />
              <div className="px-4 mt-8 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Laporan</div>
              <SidebarItem icon={Download} label="Laporan Bulanan" active={view === 'reports'} onClick={() => setView('reports')} />
            </>
          )}

          {user.role === 'TECHNICIAN' && (
            <>
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
              <SidebarItem icon={TicketIcon} label="Pengaduan Saya" active={view === 'tickets'} onClick={() => setView('tickets')} />
              <SidebarItem icon={CheckCircle2} label="Update Status" active={view === 'tickets'} onClick={() => setView('tickets')} />
            </>
          )}

          {user.role === 'SUPERVISOR' && (
            <>
              <SidebarItem icon={LayoutDashboard} label="Dashboard Monitoring" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
              <SidebarItem icon={BarChart3} label="Statistik Pengaduan" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
              <SidebarItem icon={UserCheck} label="Monitoring Teknisi" active={view === 'tickets'} onClick={() => setView('tickets')} />
              <SidebarItem icon={Download} label="Laporan Bulanan" active={view === 'reports'} onClick={() => setView('reports')} />
            </>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/50">
          <div className="bg-white/50 rounded-2xl p-4 mb-4 flex items-center gap-3 border border-white/60">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{user.full_name}</p>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">{user.role}</p>
            </div>
          </div>
          <button onClick={() => setUser(null)} className="w-full flex items-center px-5 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm">
            <LogOut size={20} className="mr-3" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 mb-2">Dashboard</h2>
                  <p className="text-gray-500 font-medium">Monitoring sistem pengaduan Kantor Imigrasi Jayapura</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="white" onClick={fetchDashboard}><Clock size={18} /> Refresh</Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <GlassCard className="p-6 bg-blue-600 text-white border-none">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-200 rounded-xl"><TicketIcon size={24} /></div>
                    <Badge status="DITERIMA">Total</Badge>
                  </div>
                  <p className="text-4xl font-black mb-1 text-gray-900">{stats?.total || 0}</p>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Pengaduan Masuk</p>
                </GlassCard>
                <GlassCard className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><Clock size={24} /></div>
                    <Badge status="DIPROSES_TEKNISI">Proses</Badge>
                  </div>
                  <p className="text-4xl font-black mb-1 text-gray-900">{stats?.open || 0}</p>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Sedang Ditangani</p>
                </GlassCard>
                <GlassCard className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-xl"><CheckCircle size={24} /></div>
                    <Badge status="SELESAI">Selesai</Badge>
                  </div>
                  <p className="text-4xl font-black mb-1 text-gray-900">{tickets.filter(t => t.status === 'SELESAI').length}</p>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Telah Diselesaikan</p>
                </GlassCard>
                <GlassCard className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl"><XCircle size={24} /></div>
                    <Badge status="DITOLAK">Ditolak</Badge>
                  </div>
                  <p className="text-4xl font-black mb-1 text-gray-900">{tickets.filter(t => t.status === 'DITOLAK').length}</p>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Pengaduan Tidak Valid</p>
                </GlassCard>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <GlassCard className="p-8">
                  <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                    <BarChart3 className="text-blue-600" size={20} /> Statistik Kategori
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.byCategory || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#F1F5F9' }}
                        />
                        <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                <GlassCard className="p-8">
                  <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                    <CheckCircle2 className="text-green-600" size={20} /> Progres Penyelesaian
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Selesai', value: tickets.filter(t => t.status === 'SELESAI').length },
                            { name: 'Proses', value: tickets.filter(t => t.status === 'DIPROSES_TEKNISI').length },
                            { name: 'Diterima', value: tickets.filter(t => t.status === 'DITERIMA').length },
                            { name: 'Ditolak', value: tickets.filter(t => t.status === 'DITOLAK').length },
                          ]}
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          <Cell fill="#10B981" />
                          <Cell fill="#F59E0B" />
                          <Cell fill="#3B82F6" />
                          <Cell fill="#EF4444" />
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              {/* Recent Tickets Table */}
              <GlassCard>
                <div className="p-6 border-b border-white/50 flex justify-between items-center">
                  <h3 className="text-xl font-black text-gray-900">Pengaduan Terbaru</h3>
                  <Button variant="ghost" size="sm" onClick={() => setView('tickets')}>Lihat Semua <ChevronRight size={16} /></Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-8 py-4">Tiket</th>
                        <th className="px-8 py-4">Pelapor</th>
                        <th className="px-8 py-4">Kategori</th>
                        <th className="px-8 py-4">Status</th>
                        <th className="px-8 py-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50">
                      {tickets.slice(0, 5).map(t => (
                        <tr key={t.id} className="hover:bg-white/40 transition-colors">
                          <td className="px-8 py-4">
                            <div className="font-black text-blue-600 text-sm">{t.ticket_no}</div>
                            <div className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(t.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="px-8 py-4 font-bold text-sm text-gray-700">{t.reporter_name}</td>
                          <td className="px-8 py-4">
                            <div className="text-xs font-bold text-gray-600">{t.category_group}</div>
                            <div className="text-[10px] text-gray-400">{t.category_name}</div>
                          </td>
                          <td className="px-8 py-4"><Badge status={t.status}>{t.status}</Badge></td>
                          <td className="px-8 py-4">
                            <Button variant="ghost" size="sm" onClick={async () => {
                              const data = await safeFetch(`/api/tickets/${t.id}`);
                              setSelectedTicket(data);
                              setView('detail');
                            }}><Eye size={16} /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {view === 'tickets' && (
            <motion.div key="tickets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 mb-2">Daftar Pengaduan</h2>
                  <p className="text-gray-500 font-medium">Kelola seluruh data pengaduan yang masuk</p>
                </div>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input className="pl-12 w-80" placeholder="Cari nomor tiket atau pelapor..." />
                  </div>
                  <Button variant="white"><Filter size={18} /> Filter</Button>
                </div>
              </div>

              <GlassCard>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-8 py-5">Tiket</th>
                        <th className="px-8 py-5">Pelapor</th>
                        <th className="px-8 py-5">Kategori</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5">Teknisi</th>
                        <th className="px-8 py-5">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50">
                      {tickets.map(t => (
                        <tr key={t.id} className="hover:bg-white/40 transition-colors">
                          <td className="px-8 py-5">
                            <div className="font-black text-blue-600 text-sm">{t.ticket_no}</div>
                            <div className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(t.created_at).toLocaleString('id-ID')}</div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="font-bold text-sm text-gray-700">{t.reporter_name}</div>
                            <div className="text-[10px] text-gray-400">{t.reporter_contact}</div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="text-xs font-bold text-gray-600">{t.category_group}</div>
                            <div className="text-[10px] text-gray-400">{t.category_name}</div>
                          </td>
                          <td className="px-8 py-5"><Badge status={t.status}>{t.status}</Badge></td>
                          <td className="px-8 py-5">
                            {t.assignee_name ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                  {t.assignee_name.charAt(0)}
                                </div>
                                <span className="text-xs font-bold text-gray-600">{t.assignee_name}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-gray-300 italic">Belum Ditugaskan</span>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            <Button variant="ghost" size="sm" onClick={async () => {
                              const data = await safeFetch(`/api/tickets/${t.id}`);
                              setSelectedTicket(data);
                              setView('detail');
                            }}>Detail</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {view === 'verification' && (
            <motion.div key="verification" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div>
                <h2 className="text-4xl font-black text-gray-900 mb-2">Verifikasi Pengaduan</h2>
                <p className="text-gray-500 font-medium">Validasi pengaduan baru sebelum diproses lebih lanjut</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {tickets.filter(t => t.status === 'DITERIMA').length === 0 ? (
                  <GlassCard className="p-12 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                      <CheckCircle2 size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Semua Beres!</h3>
                    <p className="text-gray-500">Tidak ada pengaduan baru yang perlu diverifikasi saat ini.</p>
                  </GlassCard>
                ) : (
                  tickets.filter(t => t.status === 'DITERIMA').map(t => (
                    <GlassCard key={t.id} className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-4">
                          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl">
                            {t.reporter_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-xl font-black text-gray-900">{t.reporter_name}</h3>
                              <Badge status="DITERIMA">Baru</Badge>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">{t.reporter_contact} • {new Date(t.created_at).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-blue-600 text-lg mb-1">{t.ticket_no}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.category_group} - {t.category_name}</div>
                        </div>
                      </div>
                      <div className="bg-white/40 rounded-2xl p-6 border border-white/60 mb-8">
                        <h4 className="font-black text-gray-900 mb-2">{t.subject}</h4>
                        <p className="text-gray-600 text-sm leading-relaxed">{t.description}</p>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="danger" size="md" onClick={() => handleVerify(t.id, 'spam')}><XCircle size={18} /> Tolak / Spam</Button>
                        <Button variant="primary" size="md" onClick={() => handleVerify(t.id, 'valid')}><CheckCircle size={18} /> Verifikasi & Lanjutkan</Button>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'assignment' && (
            <motion.div key="assignment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div>
                <h2 className="text-4xl font-black text-gray-900 mb-2">Assign Teknisi</h2>
                <p className="text-gray-500 font-medium">Tugaskan teknisi penanggung jawab untuk pengaduan terverifikasi</p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {tickets.filter(t => t.status === 'DIVERIFIKASI_ADMIN').length === 0 ? (
                  <GlassCard className="p-12 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                      <Wrench size={40} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Antrian Kosong</h3>
                    <p className="text-gray-500">Belum ada pengaduan terverifikasi yang menunggu penugasan teknisi.</p>
                  </GlassCard>
                ) : (
                  tickets.filter(t => t.status === 'DIVERIFIKASI_ADMIN').map(t => (
                    <GlassCard key={t.id} className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-black text-gray-900">{t.ticket_no}</h3>
                            <Badge status="DIVERIFIKASI_ADMIN">Terverifikasi</Badge>
                          </div>
                          <p className="text-sm text-gray-500 font-medium">Pelapor: {t.reporter_name} • {t.category_group}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Prioritas</p>
                          <Badge status={t.priority}>{t.priority}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                        <div className="bg-white/40 rounded-2xl p-5 border border-white/60">
                          <h4 className="font-black text-gray-900 text-sm mb-1">{t.subject}</h4>
                          <p className="text-gray-500 text-xs line-clamp-2">{t.description}</p>
                        </div>
                        <div className="flex gap-3">
                          <Select className="flex-1" onChange={(e) => {
                            const techId = parseInt(e.target.value);
                            if (techId) handleAssign(t.id, techId);
                          }}>
                            <option value="">Pilih Teknisi...</option>
                            {users.filter(u => u.role === 'TECHNICIAN').map(u => (
                              <option key={u.id} value={u.id}>{u.full_name} ({u.unit_kerja})</option>
                            ))}
                          </Select>
                          <Button disabled>Tugaskan</Button>
                        </div>
                      </div>
                    </GlassCard>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'detail' && selectedTicket && (
            <motion.div key="detail" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-5xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => setView('tickets')}><ArrowLeft size={20} /> Kembali</Button>
                <div className="flex gap-3">
                  {user.role === 'ADMIN' && selectedTicket.status === 'DITERIMA' && (
                    <>
                      <Button variant="danger" onClick={() => handleVerify(selectedTicket.id, 'spam')}>Tolak</Button>
                      <Button onClick={() => handleVerify(selectedTicket.id, 'valid')}>Verifikasi</Button>
                    </>
                  )}
                  {user.role === 'TECHNICIAN' && selectedTicket.status === 'DIPROSES_TEKNISI' && (
                    <>
                      <Button variant="secondary" onClick={() => {
                        const note = prompt("Tambahkan catatan teknisi:");
                        if (note) handleUpdateStatus(selectedTicket.id, 'PENDING', note);
                      }}>Pending</Button>
                      <Button onClick={() => {
                        const note = prompt("Tambahkan catatan penyelesaian:");
                        if (note) handleUpdateStatus(selectedTicket.id, 'SELESAI', note);
                      }}>Selesaikan</Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <GlassCard className="p-8">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-3xl font-black text-gray-900">{selectedTicket.ticket_no}</h2>
                          <Badge status={selectedTicket.status}>{selectedTicket.status}</Badge>
                        </div>
                        <p className="text-gray-500 font-medium">{selectedTicket.subject}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Prioritas</p>
                        <Badge status={selectedTicket.priority}>{selectedTicket.priority}</Badge>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Deskripsi Pengaduan</h4>
                        <div className="bg-white/40 rounded-2xl p-6 border border-white/60 text-gray-700 leading-relaxed">
                          {selectedTicket.description}
                        </div>
                      </div>

                      {selectedTicket.attachment_path && (
                          <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Lampiran Pengaduan</h4>
                            <a 
                              href={selectedTicket.attachment_path} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-3 bg-white/60 hover:bg-white/80 p-4 rounded-xl border border-white/80 transition-all group"
                            >
                              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <FileText size={20} />
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Lihat Dokumen</p>
                                <p className="text-[10px] text-gray-400 font-medium">Klik untuk membuka</p>
                              </div>
                            </a>
                          </div>
                        )}

                      {selectedTicket?.ktp_attachment_path && (
                        <GlassCard className="p-5 space-y-3">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-gray-800">
                              Dokumen KTP
                            </h3>
                          </div>

                          <a
                            href={selectedTicket.ktp_attachment_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            <Eye className="w-4 h-4" />
                              Lihat File KTP
                          </a>
                        </GlassCard>
                      )}

                      {selectedTicket.technician_note && (
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Catatan Teknisi</h4>
                          <div className="bg-yellow-50/50 rounded-2xl p-6 border border-yellow-200/50 text-yellow-800 italic">
                            {selectedTicket.technician_note}
                          </div>
                        </div>
                      )}
                    </div>
                  </GlassCard>

                  {/* Discussion */}
                  <GlassCard className="p-8">
                    <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-2">
                      <MessageSquare className="text-blue-600" size={20} /> Diskusi Internal
                    </h3>
                    <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-4">
                      {selectedTicket.messages.length === 0 ? (
                        <p className="text-center text-gray-400 italic py-8">Belum ada diskusi.</p>
                      ) : (
                        selectedTicket.messages.map(m => (
                          <div key={m.id} className={`flex flex-col ${m.user_id === user.id ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${m.user_id === user.id ? 'bg-blue-600 text-white' : 'bg-white/60 text-gray-800 border border-white/80'}`}>
                              <p className="text-xs font-black mb-1 opacity-70">{m.user_name}</p>
                              <p className="text-sm leading-relaxed">{m.message}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 font-bold">{new Date(m.created_at).toLocaleString('id-ID')}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <form className="flex gap-3" onSubmit={(e) => {
                      e.preventDefault();
                      const msg = (e.target as any).message.value;
                      if (msg) {
                        handleAddMessage(selectedTicket.id, msg);
                        (e.target as any).message.value = '';
                      }
                    }}>
                      <Input name="message" placeholder="Ketik pesan diskusi..." />
                      <Button type="submit"><Send size={18} /></Button>
                    </form>
                  </GlassCard>

                  {/* Feedback Action Section */}
                  {user.role === 'TECHNICIAN' && selectedTicket.status === 'DIPROSES_TEKNISI' && (
                    <GlassCard className="p-8 border-green-200/50 bg-green-50/10">
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <ShieldCheck className="text-green-600" size={20} /> Kirim Hasil Penanganan
                      </h3>
                      <form onSubmit={handleSubmitFeedback} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Update Status</label>
                             <Select 
                               required 
                               value={feedbackForm.status} 
                               onChange={e => setFeedbackForm({...feedbackForm, status: e.target.value})}
                             >
                               <option value="">Pilih Status Akhir...</option>
                               <option value="SELESAI">Selesai (Success)</option>
                               <option value="PENDING">Pending (Membutuhkan data tambahan)</option>
                             </Select>
                           </div>
                           <div className="space-y-2">
                             <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Lampiran Hasil (gambar/PDF)</label>
                             <input 
                               type="file" 
                               accept=".pdf,.png,.jpg,.jpeg"
                               className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all"
                               onChange={e => {
                                 const file = e.target.files?.[0] || null;
                                 setFeedbackForm({...feedbackForm, file});
                               }}
                             />
                           </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Catatan Penanganan</label>
                          <TextArea 
                            placeholder="Tuliskan secara lengkap tindakan yang sudah dilakukan untuk menyelesaikan pengaduan ini..." 
                            required 
                            value={feedbackForm.note}
                            onChange={e => setFeedbackForm({...feedbackForm, note: e.target.value})}
                          />
                        </div>
                        <Button type="submit" size="lg" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={loading}>
                          {loading ? 'Mengirim...' : 'Simpan & Kirim Hasil ke Pelapor'}
                        </Button>
                      </form>
                    </GlassCard>
                  )}

                  {/* Feedback History for Admin/Supervisor */}
                  {selectedTicket.feedbacks && selectedTicket.feedbacks.length > 0 && (
                    <GlassCard className="p-8 border-blue-200/50 bg-blue-50/10">
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <CheckCircle2 className="text-blue-600" size={20} /> Histori Hasil Penanganan
                      </h3>
                      <div className="space-y-6">
                        {selectedTicket.feedbacks.map((f: any) => (
                          <div key={f.id} className="bg-white/60 p-5 rounded-2xl border border-white">
                            <div className="flex justify-between items-start mb-3">
                              <p className="text-xs font-black text-blue-600 uppercase tracking-widest">{f.user_name || 'Teknisi'}</p>
                              <span className="text-[10px] text-gray-400 font-bold">{new Date(f.created_at).toLocaleString('id-ID')}</span>
                            </div>
                            <p className="text-sm text-gray-700 mb-4 italic leading-relaxed">"{f.note}"</p>
                            {f.file_path && (
                              <a 
                                href={`/${f.file_path}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                              >
                                <Download size={14} /> Lihat File Lampiran
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}
                </div>

                <div className="space-y-8">
                  <GlassCard className="p-6">
                    <h4 className="text-sm font-black text-gray-900 mb-6 border-b border-white/50 pb-4">Informasi Pelapor</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nama</p>
                        <p className="font-bold text-gray-700">{selectedTicket.reporter_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kontak</p>
                        <p className="font-bold text-gray-700">{selectedTicket.reporter_contact}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dibuat Pada</p>
                        <p className="font-bold text-gray-700">{new Date(selectedTicket.created_at).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard className="p-6">
                    <h4 className="text-sm font-black text-gray-900 mb-6 border-b border-white/50 pb-4">Penanganan</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Kategori</p>
                        <Badge>{selectedTicket.category_group}</Badge>
                        <p className="text-xs font-bold text-gray-600 mt-1">{selectedTicket.category_name}</p>
                        {selectedTicket.other_category && (
                          <p className="text-[10px] text-gray-400 italic mt-1">Detail: {selectedTicket.other_category}</p>
                        )}
                      </div>
                      {selectedTicket.type === 'INTERNAL' && selectedTicket.reporter_unit && (
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unit Kerja</p>
                          <p className="font-bold text-gray-700">{selectedTicket.reporter_unit}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teknisi</p>
                        {selectedTicket.assignee_name ? (
                          <p className="font-bold text-blue-600">{selectedTicket.assignee_name}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Belum ditugaskan</p>
                        )}
                      </div>
                      {selectedTicket.verified_at && (
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Diverifikasi Pada</p>
                          <p className="font-bold text-gray-700">{new Date(selectedTicket.verified_at).toLocaleString('id-ID')}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto text-center space-y-8">
              <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-xl">
                <FileText size={48} />
              </div>
              <div>
                <h2 className="text-4xl font-black text-gray-900 mb-4">Laporan Bulanan</h2>
                <p className="text-gray-500 text-lg">Unduh rekapitulasi pengaduan dalam format Excel untuk keperluan pelaporan instansi.</p>
              </div>
              <GlassCard className="p-10">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="text-left">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Bulan</label>
                    <Select 
                      value={reportConfig.month}
                      onChange={e => setReportConfig({...reportConfig, month: parseInt(e.target.value)})}
                    >
                      <option value="1">Januari</option>
                      <option value="2">Februari</option>
                      <option value="3">Maret</option>
                      <option value="4">April</option>
                      <option value="5">Mei</option>
                      <option value="6">Juni</option>
                      <option value="7">Juli</option>
                      <option value="8">Agustus</option>
                      <option value="9">September</option>
                      <option value="10">Oktober</option>
                      <option value="11">November</option>
                      <option value="12">Desember</option>
                    </Select>
                  </div>
                  <div className="text-left">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Tahun</label>
                    <Select 
                      value={reportConfig.year}
                      onChange={e => setReportConfig({...reportConfig, year: parseInt(e.target.value)})}
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </Select>
                  </div>
                </div>
                <Button size="lg" className="w-full" onClick={handleDownloadReport}>
                  <Download size={20} /> Unduh Laporan Excel
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {view === 'categories' && (
            <motion.div key="categories" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-4xl font-black text-gray-900 mb-2">Manajemen Kategori</h2>
                  <p className="text-gray-500 font-medium">Kelola kategori pengaduan dan layanan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <GlassCard className="p-8 h-fit">
                  <h3 className="text-xl font-black text-gray-900 mb-6">Tambah Kategori</h3>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Kategori</label>
                      <Input 
                        placeholder="Contoh: Paspor, Jaringan..." 
                        required 
                        value={categoryForm.name}
                        onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Tipe</label>
                      <Select 
                        value={categoryForm.type}
                        onChange={e => setCategoryForm({...categoryForm, type: e.target.value as any})}
                      >
                        <option value="EXTERNAL">Masyarakat (External)</option>
                        <option value="INTERNAL">Pegawai (Internal)</option>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Grup</label>
                      <Select 
                        value={categoryForm.category_group}
                        onChange={e => setCategoryForm({...categoryForm, category_group: e.target.value as any})}
                      >
                        <option value="KEIMIGRASIAN">KEIMIGRASIAN</option>
                        <option value="NON_KEIMIGRASIAN">NON-KEIMIGRASIAN</option>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Tambah Kategori</Button>
                  </form>
                </GlassCard>

                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                      <h4 className="font-black text-blue-600 mb-4 flex items-center gap-2">
                        <Eye size={18} /> Eksternal
                      </h4>
                      <div className="space-y-2">
                        {categories.filter(c => c.type === 'EXTERNAL').map(c => (
                          <div key={c.id} className="flex justify-between items-center p-3 bg-white/40 rounded-xl border border-white/60">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{c.name}</p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{c.category_group}</p>
                            </div>
                            <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-600 p-1">
                              <XCircle size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    <GlassCard className="p-6">
                      <h4 className="font-black text-purple-600 mb-4 flex items-center gap-2">
                        <ShieldCheck size={18} /> Internal
                      </h4>
                      <div className="space-y-2">
                        {categories.filter(c => c.type === 'INTERNAL').map(c => (
                          <div key={c.id} className="flex justify-between items-center p-3 bg-white/40 rounded-xl border border-white/60">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{c.name}</p>
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{c.category_group}</p>
                            </div>
                            <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-600 p-1">
                              <XCircle size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
