import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  ChevronLeft, 
  MoreHorizontal, 
  X, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  CreditCard, 
  Banknote,
  Trash2,
  Minimize2,
  Maximize2,
  CalendarClock,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Edit3,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Lightbulb,
  BarChart3,
  Award,
  Percent
} from 'lucide-react';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function App() {
  const [view, setView] = useState('dashboard');
  const [transaksiList, setTransaksiList] = useState([]);
  const [ringkasan, setRingkasan] = useState({ pemasukan: 0, pengeluaran: 0, saldo: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [pembayaranList, setPembayaranList] = useState([]);
  const [showPembayaranForm, setShowPembayaranForm] = useState(false);
  const [editingPembayaran, setEditingPembayaran] = useState(null);

  const DEFAULT_KATEGORI = ['Umum', 'Makanan', 'Transportasi', 'Kesehatan', 'Belanja', 'Hiburan', 'Gaji', 'Bonus', 'Investasi'];
  const [customKategori, setCustomKategori] = useState([]);
  const [showAddKategori, setShowAddKategori] = useState(false);
  const [newKategori, setNewKategori] = useState('');
  const allKategori = [...DEFAULT_KATEGORI, ...customKategori];

  // Form State - Transaksi
  const [formData, setFormData] = useState({
    nominal: '',
    keterangan: '',
    aset: 'tunai',
    prioritas: 'rendah',
    kategori: 'Umum',
    pajak: ''
  });

  // Form State - Pembayaran Prioritas (full date: tanggal, bulan, tahun)
  const now = new Date();
  const [pembayaranForm, setPembayaranForm] = useState({
    nama: '',
    nominal: '',
    tanggal_jatuh_tempo: '',
    bulan_jatuh_tempo: String(now.getMonth() + 1),
    tahun_jatuh_tempo: String(now.getFullYear()),
    kategori: 'Tagihan',
    keterangan: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Update window size based on view mode
  useEffect(() => {
    if (window.api && window.api.resizeWindow) {
      if (view === 'mini') {
        window.api.resizeWindow(350, 550);
      } else {
        window.api.resizeWindow(1000, 700);
      }
    }
  }, [view]);

  const fetchData = async () => {
    try {
      const [trxData, sumData, pembayaranData] = await Promise.all([
        window.api.getTransaksi(),
        window.api.getRingkasan(),
        window.api.getCicilan()
      ]);
      setTransaksiList(trxData);
      setRingkasan(sumData);
      setPembayaranList(pembayaranData);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const resetForm = () => {
    setFormData({
      nominal: '',
      keterangan: '',
      aset: 'tunai',
      prioritas: 'rendah',
      kategori: 'Umum',
      pajak: ''
    });
  };

  const resetPembayaranForm = () => {
    const n = new Date();
    setPembayaranForm({
      nama: '',
      nominal: '',
      tanggal_jatuh_tempo: '',
      bulan_jatuh_tempo: String(n.getMonth() + 1),
      tahun_jatuh_tempo: String(n.getFullYear()),
      kategori: 'Tagihan',
      keterangan: ''
    });
    setEditingPembayaran(null);
  };

  const handleSave = async () => {
    if (!formData.nominal || !formData.keterangan) {
      alert("Harap isi nominal dan keterangan!");
      return;
    }

    const pajakNominal = formData.pajak ? parseFloat(formData.pajak) : 0;

    const payload = {
      jenis: view === 'pemasukan' ? 'pemasukan' : 'pengeluaran',
      nominal: parseFloat(formData.nominal) + pajakNominal,
      keterangan: formData.keterangan,
      aset: formData.aset,
      kategori: formData.kategori,
      prioritas: view === 'pengeluaran' ? formData.prioritas : null,
      pajak: pajakNominal
    };

    try {
      await window.api.simpanTransaksi(payload);
      resetForm();
      setView('dashboard');
      fetchData();
    } catch (err) {
      console.error('Failed to save', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      await window.api.hapusTransaksi(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  // ─── Pembayaran Prioritas Handlers ───────────────────────────────

  const handleSavePembayaran = async () => {
    if (!pembayaranForm.nama || !pembayaranForm.nominal || !pembayaranForm.tanggal_jatuh_tempo) {
      alert("Harap isi nama, nominal, dan tanggal jatuh tempo!");
      return;
    }

    const tgl = parseInt(pembayaranForm.tanggal_jatuh_tempo);
    const bln = parseInt(pembayaranForm.bulan_jatuh_tempo);
    const thn = parseInt(pembayaranForm.tahun_jatuh_tempo);

    if (tgl < 1 || tgl > 31) {
      alert("Tanggal harus antara 1-31!");
      return;
    }

    // Validasi tanggal valid untuk bulan yang dipilih
    const maxDay = new Date(thn, bln, 0).getDate(); // hari terakhir bulan tsb
    if (tgl > maxDay) {
      alert(`Bulan ${NAMA_BULAN[bln - 1]} ${thn} hanya memiliki ${maxDay} hari!`);
      return;
    }

    const payload = {
      nama: pembayaranForm.nama,
      nominal: parseFloat(pembayaranForm.nominal),
      tanggal_jatuh_tempo: tgl,
      bulan_jatuh_tempo: bln,
      tahun_jatuh_tempo: thn,
      kategori: pembayaranForm.kategori,
      keterangan: pembayaranForm.keterangan
    };

    try {
      if (editingPembayaran) {
        await window.api.updateCicilan(editingPembayaran.id, payload);
      } else {
        await window.api.simpanCicilan(payload);
      }
      resetPembayaranForm();
      setShowPembayaranForm(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save pembayaran', err);
    }
  };

  const handleDeletePembayaran = async (id) => {
    if (!confirm('Hapus pembayaran prioritas ini?')) return;
    try {
      await window.api.hapusCicilan(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete pembayaran', err);
    }
  };

  const handleEditPembayaran = (item) => {
    setEditingPembayaran(item);
    setPembayaranForm({
      nama: item.nama,
      nominal: item.nominal.toString(),
      tanggal_jatuh_tempo: item.tanggal_jatuh_tempo.toString(),
      bulan_jatuh_tempo: item.bulan_jatuh_tempo.toString(),
      tahun_jatuh_tempo: item.tahun_jatuh_tempo.toString(),
      kategori: item.kategori,
      keterangan: item.keterangan || ''
    });
    setShowPembayaranForm(true);
  };

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Format tanggal jatuh tempo lengkap
  const formatTanggalJatuhTempo = (item) => {
    const bln = item.bulan_jatuh_tempo;
    const thn = item.tahun_jatuh_tempo;
    return `${item.tanggal_jatuh_tempo} ${NAMA_BULAN[bln - 1]} ${thn}`;
  };

  // ─── SPK / Status Keuangan Logic ─────────────────────────────────

  let statusKeuangan = "Kurang Stabil";
  let statusColor = "bg-[#F43F5E]";
  let progressWidth = "w-1/3";
  
  if (ringkasan.pemasukan > ringkasan.pengeluaran * 1.5) {
    statusKeuangan = "Sangat Stabil";
    statusColor = "bg-[#FB7185]";
    progressWidth = "w-4/5";
  } else if (ringkasan.pemasukan >= ringkasan.pengeluaran) {
    statusKeuangan = "Stabil";
    statusColor = "bg-[#10B981]";
    progressWidth = "w-2/3";
  }

  // SPK Priority helpers
  const getPriorityBadge = (prioritas) => {
    switch (prioritas) {
      case 'tinggi': return 'bg-danger text-white';
      case 'sedang': return 'bg-warning text-white';
      case 'rendah': return 'bg-success text-white';
      default: return 'bg-gray-300 text-gray-600';
    }
  };

  const getPriorityLabel = (prioritas) => {
    switch (prioritas) {
      case 'tinggi': return 'Tinggi';
      case 'sedang': return 'Sedang';
      case 'rendah': return 'Rendah';
      default: return '-';
    }
  };

  const getPriorityIcon = (prioritas) => {
    switch (prioritas) {
      case 'tinggi': return <ShieldAlert size={16} />;
      case 'sedang': return <AlertTriangle size={16} />;
      case 'rendah': return <CheckCircle2 size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Pembayaran data computed
  const topPrioritas = [...pembayaranList]
    .sort((a, b) => a.sisaHari - b.sisaHari)
    .slice(0, 3);
  
  const totalPembayaranBulanan = pembayaranList.reduce((sum, c) => sum + c.nominal, 0);
  const pembayaranMendesak = pembayaranList.filter(c => c.prioritas === 'tinggi').length;

  // ─── Saran Keuangan (SPK Recommendations) ────────────────────────
  const generateSaran = () => {
    const saran = [];

    if (ringkasan.saldo < 0) {
      saran.push({
        type: 'danger',
        icon: <ShieldAlert size={14} />,
        text: 'Saldo Anda negatif. Kurangi pengeluaran dan prioritaskan pemasukan segera.'
      });
    } else if (ringkasan.pengeluaran > ringkasan.pemasukan) {
      saran.push({
        type: 'warning',
        icon: <AlertTriangle size={14} />,
        text: 'Pengeluaran bulan ini lebih besar dari pemasukan. Pertimbangkan untuk mengurangi pengeluaran non-prioritas.'
      });
    } else if (ringkasan.pemasukan > ringkasan.pengeluaran * 2) {
      saran.push({
        type: 'success',
        icon: <TrendingUp size={14} />,
        text: 'Keuangan sangat sehat! Pertimbangkan alokasi dana darurat atau investasi.'
      });
    }

    if (pembayaranMendesak > 0) {
      saran.push({
        type: 'danger',
        icon: <CalendarClock size={14} />,
        text: `Ada ${pembayaranMendesak} pembayaran yang sangat mendesak (≤3 hari). Segera lakukan pembayaran!`
      });
    }

    const sedangCount = pembayaranList.filter(c => c.prioritas === 'sedang').length;
    if (sedangCount > 0) {
      saran.push({
        type: 'warning',
        icon: <Clock size={14} />,
        text: `${sedangCount} pembayaran mendekati jatuh tempo (4-10 hari). Siapkan dana dari sekarang.`
      });
    }

    if (totalPembayaranBulanan > 0 && ringkasan.pemasukan > 0) {
      const rasio = (totalPembayaranBulanan / ringkasan.pemasukan) * 100;
      if (rasio > 50) {
        saran.push({
          type: 'danger',
          icon: <Lightbulb size={14} />,
          text: `Beban pembayaran rutin (${rasio.toFixed(0)}% dari pemasukan) terlalu tinggi. Idealnya di bawah 30%.`
        });
      } else if (rasio > 30) {
        saran.push({
          type: 'warning',
          icon: <Lightbulb size={14} />,
          text: `Beban pembayaran rutin ${rasio.toFixed(0)}% dari pemasukan. Masih wajar, tapi perlu dijaga.`
        });
      } else {
        saran.push({
          type: 'success',
          icon: <Lightbulb size={14} />,
          text: `Beban pembayaran rutin hanya ${rasio.toFixed(0)}% dari pemasukan. Sangat baik!`
        });
      }
    }

    if (saran.length === 0) {
      saran.push({
        type: 'success',
        icon: <CheckCircle2 size={14} />,
        text: 'Mulailah catat pemasukan & pengeluaran, lalu tambahkan pembayaran prioritas untuk mendapatkan saran keuangan otomatis.'
      });
    }

    return saran;
  };

  const saranList = generateSaran();

  // Ranking pembayaran (sorted by urgency)
  const rankedPembayaran = [...pembayaranList].sort((a, b) => a.sisaHari - b.sisaHari);

  // Generate year options: current year to +5 years
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

  return (
    <div className="flex items-center justify-center h-screen p-0">
      
      {view === 'mini' ? (
        // ═══════════════════════════════════════════════════════════════
        // MINI WIDGET VIEW
        // ═══════════════════════════════════════════════════════════════
        <div className="w-full h-full bg-primary shadow-2xl relative overflow-hidden flex flex-col border border-white/20 rounded-[24px]">
          {/* Header Mini Widget */}
          <div className="titlebar-drag flex justify-between items-center px-5 py-4 bg-white/5 text-white">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-[10px] tracking-wide uppercase opacity-70">Widget Keuangan</span>
            </div>
            <div className="flex gap-3 titlebar-no-drag z-10">
              <button 
                onClick={() => setView('dashboard')}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <Maximize2 size={14} />
              </button>
              <button 
                onClick={() => window.api.closeWindow()}
                className="text-white/40 hover:text-danger transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-3 overflow-y-auto white-scrollbar">
            {/* Ringkasan Keuangan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-success/15 border border-success/20 rounded-2xl p-3 flex flex-col items-center gap-1">
                <span className="text-[9px] text-success/70 font-medium uppercase tracking-widest">Pemasukan</span>
                <span className="text-base font-display font-bold text-success">{formatIDR(ringkasan.pemasukan)}</span>
              </div>
              <div className="bg-danger/15 border border-danger/20 rounded-2xl p-3 flex flex-col items-center gap-1">
                <span className="text-[9px] text-danger/70 font-medium uppercase tracking-widest">Pengeluaran</span>
                <span className="text-base font-display font-bold text-danger">{formatIDR(ringkasan.pengeluaran)}</span>
              </div>
            </div>

            {/* Saldo */}
            <div className="flex flex-col gap-1 items-center bg-white/10 p-4 rounded-2xl shadow-inner border border-white/5">
              <span className="text-[9px] text-lavender/60 font-medium uppercase tracking-widest">Saldo</span>
              <h1 className="text-2xl font-display font-bold text-white tracking-tight">
                {formatIDR(ringkasan.saldo)}
              </h1>
            </div>

            {/* Prioritas Utama */}
            {topPrioritas.length > 0 && (
              <div className="bg-white/10 border border-white/10 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] text-lavender/60 font-bold uppercase tracking-widest">Prioritas Utama</span>
                  {pembayaranMendesak > 0 && (
                    <span className="w-4 h-4 bg-danger rounded-full flex items-center justify-center text-[8px] font-bold animate-pulse">{pembayaranMendesak}</span>
                  )}
                </div>
                {topPrioritas.slice(0, 2).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                        p.prioritas === 'tinggi' ? 'bg-danger' : p.prioritas === 'sedang' ? 'bg-warning' : 'bg-success'
                      }`}>
                        {getPriorityIcon(p.prioritas)}
                      </div>
                      <span className="text-[10px] font-medium text-white/80 truncate max-w-[120px]">{p.nama}</span>
                    </div>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${getPriorityBadge(p.prioritas)}`}>
                      {p.labelPrioritas}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setView('pemasukan')}
                className="bg-lavender-soft text-dark-purple py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg cursor-pointer"
              >
                <div className="w-8 h-8 bg-dark-purple text-white rounded-full flex items-center justify-center">
                  <Plus size={16} strokeWidth={3} />
                </div>
                <span className="font-bold text-[10px] uppercase tracking-wider">Masuk</span>
              </button>
              <button 
                onClick={() => setView('pengeluaran')}
                className="bg-pink-100 text-danger py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg cursor-pointer"
              >
                <div className="w-8 h-8 bg-danger text-white rounded-full flex items-center justify-center">
                  <Plus size={16} strokeWidth={3} />
                </div>
                <span className="font-bold text-[10px] uppercase tracking-wider">Keluar</span>
              </button>
            </div>

            {/* CTA Dashboard */}
            <button 
              onClick={() => setView('dashboard')}
              className="w-full p-3 rounded-xl flex items-center justify-center gap-2 text-white/50 bg-white/5 hover:bg-white/10 hover:text-white transition-all cursor-pointer border border-white/10 border-dashed group"
            >
              <BarChart3 size={14} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Buka Dashboard Lengkap</span>
            </button>
          </div>
        </div>

      ) : (
        // ═══════════════════════════════════════════════════════════════
        // FULL DASHBOARD / FORM / SPK VIEW
        // ═══════════════════════════════════════════════════════════════
        <div className="w-full max-w-[1000px] h-full bg-primary rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col border border-white/10 transition-all">
          
          {/* Header */}
          <div className="titlebar-drag flex justify-between items-center px-6 py-4 bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="ml-2 text-white/50 text-xs font-medium tracking-widest uppercase">Hemat Cuan Beta 0.2</span>
            </div>
            <div className="flex gap-3 titlebar-no-drag z-10">
              <button 
                onClick={() => setView('mini')}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
                title="Mini Mode"
              >
                <Minimize2 size={20} />
              </button>
              <button 
                onClick={() => window.api.closeWindow()}
                className="text-white/40 hover:text-danger transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col">
            <AnimatePresence mode="wait">
              
              {/* ─── DASHBOARD VIEW ──────────────────────────────────── */}
              {view === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto"
                >
                  {/* Left Column (2/3) */}
                  <div className="md:col-span-2 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lavender/60 font-medium">Saldomu saat ini</span>
                        <button className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer">
                          Bulan Ini <MoreHorizontal size={14} />
                        </button>
                      </div>
                      <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight">
                        {formatIDR(ringkasan.saldo)}
                      </h1>

                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <button 
                          onClick={() => setView('pemasukan')}
                          className="bg-lavender-soft text-dark-purple p-5 rounded-2xl flex flex-col justify-between h-28 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg group cursor-pointer"
                        >
                          <span className="text-xs font-bold leading-tight opacity-80 group-hover:opacity-100 italic text-left">Tambahkan Pemasukan</span>
                          <div className="self-end w-9 h-9 bg-dark-purple rounded-xl flex items-center justify-center text-white">
                            <Plus size={20} strokeWidth={3} />
                          </div>
                        </button>
                        <button 
                          onClick={() => setView('pengeluaran')}
                          className="bg-lavender-soft text-dark-purple p-5 rounded-2xl flex flex-col justify-between h-28 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg group cursor-pointer"
                        >
                          <span className="text-xs font-bold leading-tight opacity-80 group-hover:opacity-100 italic text-left">Tambahkan Pengeluaran</span>
                          <div className="self-end w-9 h-9 bg-dark-purple rounded-xl flex items-center justify-center text-white">
                            <Plus size={20} strokeWidth={3} />
                          </div>
                        </button>
                        <button 
                          onClick={() => setView('spk')}
                          className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-5 rounded-2xl flex flex-col justify-between h-28 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg group cursor-pointer relative overflow-hidden"
                        >
                          {pembayaranMendesak > 0 && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-danger rounded-full flex items-center justify-center text-[9px] font-black animate-pulse">
                              {pembayaranMendesak}
                            </div>
                          )}
                          <span className="text-xs font-bold leading-tight opacity-90 group-hover:opacity-100 italic text-left">Pembayaran Prioritas & SPK</span>
                          <div className="self-end w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-sm">
                            <CalendarClock size={20} strokeWidth={2.5} />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Riwayat Transaksi */}
                    <div className="bg-white rounded-[24px] p-6 flex flex-col flex-1 min-h-[200px] shadow-xl text-dark-purple overflow-hidden">
                      <h3 className="text-base font-bold mb-3 flex items-center justify-between">
                        Riwayat Transaksi
                        <span className="text-xs font-normal opacity-50 px-3 py-1 bg-gray-100 rounded-full">Terbaru</span>
                      </h3>
                      <div className="flex-1 overflow-y-auto pr-2 space-y-2 white-scrollbar">
                        {isLoading ? (
                          <div className="flex items-center justify-center h-full text-gray-300 italic">Memuat transaksimu...</div>
                        ) : transaksiList.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-300 italic">Belum ada transaksi</div>
                        ) : (
                          transaksiList.map((trx) => (
                            <div key={trx.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-100 group">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trx.jenis === 'pemasukan' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                                  {trx.jenis === 'pemasukan' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                </div>
                                <div>
                                  <div className="font-bold text-sm">{trx.keterangan}</div>
                                  <div className="text-[10px] uppercase tracking-wider font-semibold opacity-40">{trx.kategori} • {trx.aset}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className={`font-display font-bold text-base ${trx.jenis === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                                  {trx.jenis === 'pemasukan' ? '+' : '-'} {formatIDR(trx.nominal)}
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDelete(trx.id); }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-md transition-all cursor-pointer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column (1/3) */}
                  <div className="flex flex-col gap-4">
                     <div className="bg-pink-500 p-5 rounded-[20px] shadow-lg flex flex-col gap-1 hover:-rotate-1 transition-transform">
                       <span className="text-white/70 text-[10px] font-medium uppercase tracking-widest">Pendapatan bulan ini</span>
                       <h2 className="text-xl font-display font-bold text-white">{formatIDR(ringkasan.pemasukan)}</h2>
                     </div>

                     <div className="bg-lavender text-dark-purple p-5 rounded-[20px] shadow-lg flex flex-col gap-1 hover:rotate-1 transition-transform">
                       <span className="text-dark-purple/50 text-[10px] font-medium uppercase tracking-widest">Pengeluaran bulan ini</span>
                       <h2 className="text-xl font-display font-bold">{formatIDR(ringkasan.pengeluaran)}</h2>
                     </div>

                     <div className={`${statusColor} p-5 rounded-[20px] shadow-lg flex flex-col gap-1 transition-colors duration-500`}>
                       <span className="text-white/70 text-[10px] font-medium uppercase tracking-widest">Status keuangan</span>
                       <h3 className="text-lg font-bold text-white">{statusKeuangan}</h3>
                       <div className="w-full h-1 bg-white/20 mt-2 rounded-full overflow-hidden">
                          <div className={`${progressWidth} h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-1000`} />
                       </div>
                     </div>

                     {/* Ranking Prioritas Card */}
                     <button 
                       onClick={() => setView('spk')}
                       className="bg-lavender-soft text-dark-purple p-5 rounded-[24px] shadow-xl flex-1 flex flex-col text-left hover:shadow-2xl transition-all cursor-pointer group"
                     >
                       <h4 className="text-xs font-bold mb-3 flex items-center justify-between w-full">
                         <span className="flex items-center gap-2">
                           <Award size={14} className="text-primary" />
                           Ranking Prioritas
                         </span>
                         <div className="flex items-center gap-2">
                           {pembayaranMendesak > 0 && (
                             <span className="w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center text-[9px] font-black animate-pulse">
                               {pembayaranMendesak}
                             </span>
                           )}
                           <ChevronRight size={14} className="text-dark-purple/30 group-hover:text-dark-purple/60 group-hover:translate-x-0.5 transition-all" />
                         </div>
                       </h4>
                       <div className="flex-1 space-y-2.5 w-full">
                         {topPrioritas.length > 0 ? (
                           topPrioritas.map((c, index) => (
                             <div key={c.id} className="flex justify-between items-center text-xs">
                               <div className="flex items-center gap-2 flex-1 min-w-0">
                                 <span className="text-[9px] font-black text-dark-purple/30 w-4">#{index + 1}</span>
                                 {getPriorityIcon(c.prioritas)}
                                 <span className="font-medium opacity-80 truncate">{c.nama}</span>
                               </div>
                               <div className="flex items-center gap-2 ml-2 shrink-0">
                                 <span className="text-[9px] text-dark-purple/40 font-medium">{c.labelPrioritas}</span>
                                 <span className={`px-2 py-0.5 ${getPriorityBadge(c.prioritas)} rounded font-bold uppercase tracking-tighter text-[9px]`}>
                                   {getPriorityLabel(c.prioritas)}
                                 </span>
                               </div>
                             </div>
                           ))
                         ) : (
                           <div className="text-xs text-dark-purple/30 italic text-center py-2">
                             Belum ada pembayaran prioritas
                             <br />
                             <span className="text-primary font-medium">Klik untuk tambah →</span>
                           </div>
                         )}
                       </div>
                       {pembayaranList.length > 0 && (
                         <div className="mt-3 pt-2 border-t border-dark-purple/10 w-full">
                           <div className="flex justify-between text-[10px]">
                             <span className="text-dark-purple/40">Total pembayaran</span>
                             <span className="font-bold text-dark-purple/70">{formatIDR(totalPembayaranBulanan)}</span>
                           </div>
                         </div>
                       )}
                       <div className="mt-2 pt-2 border-t border-dark-purple/10 w-full">
                          <p className="text-[9px] leading-tight text-dark-purple/40 italic">
                            *Ranking otomatis berdasarkan algoritma SAW
                          </p>
                       </div>
                     </button>

                     {/* Saran SPK */}
                     <div className="bg-dark-purple/30 p-4 rounded-[20px] border border-white/10">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-lavender/50 mb-2 flex items-center gap-1.5">
                         <Lightbulb size={12} />
                         Saran SPK
                       </h4>
                       <div className="space-y-2">
                         {saranList.slice(0, 2).map((s, i) => (
                           <div key={i} className={`flex items-start gap-2 text-[10px] leading-snug ${
                             s.type === 'danger' ? 'text-danger' : s.type === 'warning' ? 'text-warning' : 'text-success'
                           }`}>
                             <span className="mt-0.5 shrink-0">{s.icon}</span>
                             <span className="text-white/70">{s.text}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {/* ─── FORM VIEW (Pemasukan or Pengeluaran) ────────── */}
              {(view === 'pemasukan' || view === 'pengeluaran') && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full p-8 flex flex-col gap-6 overflow-y-auto"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setView('dashboard')}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white cursor-pointer"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <h2 className="text-3xl font-display font-bold uppercase tracking-tight">
                        {view === 'pemasukan' ? 'Pendapatan' : 'Pengeluaran'}
                      </h2>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-xl text-dark-purple font-bold text-sm shadow-lg flex items-center gap-3">
                      <span className="opacity-60 uppercase text-xs">Saldomu Hari Ini</span>
                      {formatIDR(ringkasan.saldo)}
                    </div>
                  </div>

                  <div className="flex gap-8 border-b border-white/10 pb-2">
                    <button 
                      onClick={() => setView('pemasukan')}
                      className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${view === 'pemasukan' ? 'text-white' : 'text-white/60'}`}
                    >
                      Pendapatan
                      {view === 'pemasukan' && <motion.div layoutId="tab" className="absolute bottom-[-2px] left-0 right-0 h-1 bg-white rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setView('pengeluaran')}
                      className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${view === 'pengeluaran' ? 'text-white' : 'text-white/60'}`}
                    >
                      Pengeluaran
                      {view === 'pengeluaran' && <motion.div layoutId="tab" className="absolute bottom-[-2px] left-0 right-0 h-1 bg-white rounded-full" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4 flex-1">
                    <div className="flex flex-col gap-6 max-w-md">
                      <div className="flex items-center gap-4">
                        <label className="w-24 text-sm font-bold uppercase tracking-widest text-lavender/70">Nominal</label>
                        <div className="flex-1 relative">
                          <span className="absolute left-0 bottom-2 text-xl font-bold opacity-50">Rp</span>
                          <input 
                            type="number" 
                            value={formData.nominal}
                            onChange={(e) => setFormData({...formData, nominal: e.target.value})}
                            placeholder="00.000"
                            className="w-full bg-transparent border-b-2 border-white/20 pb-2 px-8 text-2xl font-bold font-display focus:outline-none focus:border-white transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="w-24 text-sm font-bold uppercase tracking-widest text-lavender/70">Keterangan</label>
                        <input 
                          type="text" 
                          value={formData.keterangan}
                          onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                          placeholder="Makan siang di kantor..."
                          className="flex-1 bg-transparent border-b border-white/30 pb-2 text-sm focus:outline-none focus:border-white transition-colors italic placeholder-white/40"
                        />
                      </div>

                      <div className="flex items-start gap-4 mt-2">
                        <label className="w-24 text-sm font-bold uppercase tracking-widest text-lavender/70 pt-2">Aset</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'tunai', icon: Banknote, label: 'Tunai' },
                            { id: 'kartu', icon: CreditCard, label: 'Kartu' },
                            { id: 'e-wallet', icon: Wallet, label: 'E-Wallet' }
                          ].map((item) => (
                            <button 
                              key={item.id}
                              onClick={() => setFormData({...formData, aset: item.id})}
                              className={`px-4 py-2 rounded-full border text-sm font-bold gap-2 flex items-center transition-all cursor-pointer ${
                                formData.aset === item.id 
                                ? 'bg-white text-primary border-white scale-105 shadow-md' 
                                : 'bg-transparent text-white/70 border-white/30 hover:border-white/60'
                              }`}
                            >
                              <item.icon size={14} />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {view === 'pengeluaran' && (
                        <>
                          {/* Pajak (Opsional) */}
                          <div className="flex items-center gap-4">
                            <label className="w-24 text-sm font-bold uppercase tracking-widest text-lavender/70">Pajak</label>
                            <div className="flex-1 relative">
                              <span className="absolute left-0 bottom-2 text-sm font-bold opacity-50"><Percent size={14} /></span>
                              <input 
                                type="number" 
                                value={formData.pajak}
                                onChange={(e) => setFormData({...formData, pajak: e.target.value})}
                                placeholder="Opsional (contoh: 5000)"
                                className="w-full bg-transparent border-b border-white/20 pb-2 pl-6 text-sm font-bold font-display focus:outline-none focus:border-white transition-colors"
                              />
                              <span className="absolute right-0 bottom-2 text-xs text-lavender/50 italic">Rp</span>
                            </div>
                          </div>
                          {formData.pajak && parseFloat(formData.pajak) > 0 && (
                            <div className="-mt-3 ml-28 text-xs text-lavender/60 italic">
                              Total: {formatIDR(parseFloat(formData.nominal || 0) + parseFloat(formData.pajak))} (Nominal + Pajak)
                            </div>
                          )}

                          {/* Tingkat Prioritas */}
                          <div className="flex flex-col gap-3 mt-2">
                            <label className="text-sm font-bold uppercase tracking-widest text-lavender/70">Tingkat Prioritas</label>
                            <div className="flex gap-3">
                              {[
                                { id: 'tinggi', colorClass: 'bg-danger border-danger text-danger', activeClass: 'bg-danger border-danger text-white', label: 'Tinggi' },
                                { id: 'sedang', colorClass: 'bg-warning border-warning text-warning', activeClass: 'bg-warning border-warning text-white', label: 'Sedang' },
                                { id: 'rendah', colorClass: 'bg-success border-success text-success', activeClass: 'bg-success border-success text-white', label: 'Rendah' }
                              ].map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => setFormData({...formData, prioritas: item.id})}
                                  className={`flex-1 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-tighter transition-all cursor-pointer ${
                                    formData.prioritas === item.id
                                    ? `${item.activeClass} shadow-lg scale-105`
                                    : `bg-transparent ${item.colorClass.split(' ').slice(1).join(' ')} opacity-60 hover:opacity-90`
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="mt-auto pt-8">
                         <button 
                           onClick={handleSave}
                           className="w-full py-4 bg-white text-dark-purple font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)] cursor-pointer"
                         >
                           Simpan Transaksi
                         </button>
                      </div>
                    </div>

                    <div className="bg-lavender-soft/10 rounded-[32px] p-8 border border-white/5 flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold uppercase tracking-widest text-white">Kategori</span>
                        <button 
                          onClick={() => setShowAddKategori(!showAddKategori)}
                          className="text-[10px] font-bold text-dark-purple bg-white px-3 py-1.5 rounded-lg hover:bg-white/90 transition-all cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          {showAddKategori ? <X size={10} /> : <Plus size={10} />}
                          {showAddKategori ? 'Batal' : 'Tambah Kategori'}
                        </button>
                      </div>

                      {/* Tambah Kategori Inline Form */}
                      <AnimatePresence>
                        {showAddKategori && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex gap-2 items-center bg-white/10 p-3 rounded-xl border border-white/10">
                              <input 
                                type="text"
                                value={newKategori}
                                onChange={(e) => setNewKategori(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newKategori.trim()) {
                                    if (!allKategori.includes(newKategori.trim())) {
                                      setCustomKategori([...customKategori, newKategori.trim()]);
                                      setFormData({...formData, kategori: newKategori.trim()});
                                    }
                                    setNewKategori('');
                                    setShowAddKategori(false);
                                  }
                                }}
                                placeholder="Nama kategori baru..."
                                className="flex-1 bg-transparent border-b border-white/20 pb-1 text-sm focus:outline-none focus:border-white transition-colors text-white placeholder-white/30"
                                autoFocus
                              />
                              <button 
                                onClick={() => {
                                  if (newKategori.trim() && !allKategori.includes(newKategori.trim())) {
                                    setCustomKategori([...customKategori, newKategori.trim()]);
                                    setFormData({...formData, kategori: newKategori.trim()});
                                  }
                                  setNewKategori('');
                                  setShowAddKategori(false);
                                }}
                                disabled={!newKategori.trim()}
                                className="px-3 py-1.5 bg-white text-dark-purple rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                              >
                                Simpan
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex flex-wrap gap-3 content-start">
                         {allKategori.map((cat) => (
                           <button 
                             key={cat}
                             onClick={() => setFormData({...formData, kategori: cat})}
                             className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                               formData.kategori === cat 
                               ? 'bg-lavender text-dark-purple shadow-md' 
                               : 'bg-white/10 text-white/60 hover:bg-white/20'
                             } ${customKategori.includes(cat) ? 'border border-dashed border-white/20' : ''}`}
                           >
                             {cat}
                           </button>
                         ))}
                      </div>
                      <div className="mt-auto p-4 bg-primary/30 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3 text-white/60 italic text-sm">
                          <MoreHorizontal size={16} />
                          Tips: Pilih kategori yang sesuai untuk analisis keuangan yang lebih akurat
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══════════════════════════════════════════════════════ */}
              {/* SPK VIEW — Pembayaran Prioritas                        */}
              {/* ═══════════════════════════════════════════════════════ */}
              {view === 'spk' && (
                <motion.div
                  key="spk"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full flex flex-col"
                >
                  {/* SPK Header */}
                  <div className="shrink-0 px-8 pt-5 pb-3 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setView('dashboard')}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all text-white cursor-pointer"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <div>
                        <h2 className="text-xl font-display font-bold tracking-tight flex items-center gap-3">
                          <CalendarClock size={22} className="text-amber-400" />
                          Pembayaran Prioritas
                        </h2>
                        <p className="text-xs text-lavender/60 mt-0.5">Ranking & saran otomatis berdasarkan perhitungan SPK (SAW)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { resetPembayaranForm(); setShowPembayaranForm(true); }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg cursor-pointer"
                    >
                      <Plus size={18} strokeWidth={3} />
                      Tambah Pembayaran
                    </button>
                  </div>

                  {/* Summary Cards */}
                  <div className="shrink-0 px-8 pb-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-400/20 rounded-xl flex items-center justify-center text-amber-400">
                            <Wallet size={20} />
                          </div>
                          <div>
                            <div className="text-xs text-lavender/70 uppercase tracking-widest font-medium">Total Pembayaran</div>
                            <div className="text-lg font-display font-bold text-white">{formatIDR(totalPembayaranBulanan)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-light/20 rounded-xl flex items-center justify-center text-primary-light">
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <div className="text-xs text-lavender/70 uppercase tracking-widest font-medium">Total Item</div>
                            <div className="text-lg font-display font-bold text-white">{pembayaranList.length} <span className="text-sm font-normal text-lavender/60">pembayaran</span></div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pembayaranMendesak > 0 ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                            <ShieldAlert size={20} />
                          </div>
                          <div>
                            <div className="text-xs text-lavender/70 uppercase tracking-widest font-medium">Mendesak</div>
                            <div className={`text-lg font-display font-bold ${pembayaranMendesak > 0 ? 'text-danger' : 'text-success'}`}>
                              {pembayaranMendesak} <span className="text-sm font-normal text-lavender/60">pembayaran</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Content: Ranking List + Saran */}
                  <div className="flex-1 min-h-0 px-8 pb-5 grid grid-cols-3 gap-4">
                    
                    {/* Ranking Pembayaran (2/3) */}
                    <div className="col-span-2 bg-white rounded-[24px] p-5 shadow-xl text-dark-purple flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <Award size={16} className="text-primary" />
                          Ranking Pembayaran Prioritas
                          <span className="text-xs font-normal opacity-50 px-2 py-0.5 bg-gray-100 rounded-full ml-1">
                            {pembayaranList.length} total
                          </span>
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger" /> ≤3 hari</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning" /> 4-10 hari</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success" /> &gt;10 hari</div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 white-scrollbar pr-1">
                        {pembayaranList.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-4">
                            <CalendarClock size={48} strokeWidth={1.5} />
                            <div className="text-center">
                              <p className="font-medium text-sm">Belum ada pembayaran prioritas</p>
                              <p className="text-xs opacity-60 mt-1">Tambahkan untuk mulai tracking otomatis</p>
                            </div>
                          </div>
                        ) : (
                          rankedPembayaran.map((item, index) => (
                            <motion.div 
                              key={item.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all group ${
                                item.prioritas === 'tinggi'
                                  ? 'bg-danger/5 border-danger/20 hover:border-danger/40'
                                  : item.prioritas === 'sedang'
                                    ? 'bg-warning/5 border-warning/20 hover:border-warning/40'
                                    : 'bg-success/5 border-success/20 hover:border-success/40'
                              }`}
                            >
                              {/* Rank Number */}
                              <div className="text-lg font-display font-black text-gray-200 w-7 text-center shrink-0">
                                {index + 1}
                              </div>

                              {/* Priority Icon */}
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                item.prioritas === 'tinggi' ? 'bg-danger/20 text-danger' :
                                item.prioritas === 'sedang' ? 'bg-warning/20 text-warning' :
                                'bg-success/20 text-success'
                              } ${item.prioritas === 'tinggi' ? 'spk-pulse' : ''}`}>
                                {getPriorityIcon(item.prioritas)}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-base">{item.nama}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                  <span>{item.kategori}</span>
                                  <span>•</span>
                                  <span>Jatuh tempo: {formatTanggalJatuhTempo(item)}</span>
                                  {item.keterangan && (
                                    <>
                                      <span>•</span>
                                      <span className="italic truncate max-w-[150px]">{item.keterangan}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Amount & countdown */}
                              <div className="text-right shrink-0">
                                <div className="font-display font-bold text-base">{formatIDR(item.nominal)}</div>
                                <div className={`text-xs font-bold ${
                                  item.prioritas === 'tinggi' ? 'text-danger' :
                                  item.prioritas === 'sedang' ? 'text-warning' :
                                  'text-success'
                                }`}>
                                  {item.labelPrioritas}
                                </div>
                              </div>

                              {/* Badge */}
                              <span className={`px-2.5 py-1 ${getPriorityBadge(item.prioritas)} rounded-lg font-bold uppercase tracking-tighter text-[11px] shrink-0`}>
                                {getPriorityLabel(item.prioritas)}
                              </span>

                              {/* Actions: Edit & Delete only */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                <button 
                                  onClick={() => handleEditPembayaran(item)}
                                  className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-500 rounded-lg transition-all cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeletePembayaran(item.id)}
                                  className="p-1.5 hover:bg-danger/10 text-gray-400 hover:text-danger rounded-lg transition-all cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Saran Lengkap (1/3) */}
                    <div className="flex flex-col gap-4 min-h-0">
                      <div className="bg-white rounded-[24px] p-5 shadow-xl text-dark-purple flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                          <Lightbulb size={16} className="text-amber-500" />
                          Saran Keuangan
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 white-scrollbar pr-1">
                          {saranList.map((s, i) => (
                            <div 
                              key={i} 
                              className={`p-3 rounded-xl border text-sm leading-relaxed ${
                                s.type === 'danger' ? 'bg-danger/5 border-danger/20' : 
                                s.type === 'warning' ? 'bg-warning/5 border-warning/20' : 
                                'bg-success/5 border-success/20'
                              }`}
                            >
                              <div className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider mb-1 ${
                                s.type === 'danger' ? 'text-danger' : s.type === 'warning' ? 'text-warning' : 'text-success'
                              }`}>
                                {s.icon}
                                {s.type === 'danger' ? 'Perhatian' : s.type === 'warning' ? 'Peringatan' : 'Bagus'}
                              </div>
                              <p className="text-dark-purple/70">{s.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-[20px] p-4 border border-white/10">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-lavender/70 mb-2">Cara Kerja SPK</h4>
                        <div className="space-y-2 text-xs text-lavender/60">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-danger shrink-0" />
                            <span><strong className="text-white/80">Tinggi</strong> — ≤3 hari / sudah lewat</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-warning shrink-0" />
                            <span><strong className="text-white/80">Sedang</strong> — 4-10 hari ke jatuh tempo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-success shrink-0" />
                            <span><strong className="text-white/80">Rendah</strong> — &gt;10 hari ke jatuh tempo</span>
                          </div>
                          <p className="pt-1 border-t border-white/10 italic text-lavender/50">
                            Dihitung otomatis dari tanggal lokal perangkatmu
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── Pembayaran Form Modal ──────────────────────── */}
                  <AnimatePresence>
                    {showPembayaranForm && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 flex items-center justify-center"
                      >
                        <div 
                          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                          onClick={() => { setShowPembayaranForm(false); resetPembayaranForm(); }}
                        />
                        
                        <motion.div
                          initial={{ scale: 0.9, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 20 }}
                          className="relative bg-white rounded-[28px] p-8 w-full max-w-md shadow-2xl text-dark-purple z-10 max-h-[90%] overflow-y-auto"
                        >
                          {/* Modal Header */}
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-display font-bold">
                              {editingPembayaran ? 'Edit Pembayaran' : 'Tambah Pembayaran Baru'}
                            </h3>
                            <button 
                              onClick={() => { setShowPembayaranForm(false); resetPembayaranForm(); }}
                              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </div>

                          {/* Form Fields */}
                          <div className="flex flex-col gap-5">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Nama Pembayaran</label>
                              <input 
                                type="text"
                                value={pembayaranForm.nama}
                                onChange={(e) => setPembayaranForm({...pembayaranForm, nama: e.target.value})}
                                placeholder="Contoh: Tagihan Listrik, Kredit Motor..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Nominal</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-300">Rp</span>
                                <input 
                                  type="number"
                                  value={pembayaranForm.nominal}
                                  onChange={(e) => setPembayaranForm({...pembayaranForm, nominal: e.target.value})}
                                  placeholder="0"
                                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-display focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                              </div>
                            </div>

                            {/* Tanggal Jatuh Tempo — Full Date: Tanggal, Bulan, Tahun */}
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Tanggal Jatuh Tempo</label>
                              <div className="grid grid-cols-3 gap-2">
                                {/* Tanggal */}
                                <div>
                                  <label className="text-[8px] font-medium text-gray-300 mb-1 block uppercase">Tanggal</label>
                                  <input 
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={pembayaranForm.tanggal_jatuh_tempo}
                                    onChange={(e) => setPembayaranForm({...pembayaranForm, tanggal_jatuh_tempo: e.target.value})}
                                    placeholder="1-31"
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-display focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-center"
                                  />
                                </div>
                                {/* Bulan */}
                                <div>
                                  <label className="text-[8px] font-medium text-gray-300 mb-1 block uppercase">Bulan</label>
                                  <select
                                    value={pembayaranForm.bulan_jatuh_tempo}
                                    onChange={(e) => setPembayaranForm({...pembayaranForm, bulan_jatuh_tempo: e.target.value})}
                                    className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                  >
                                    {NAMA_BULAN.map((nama, i) => (
                                      <option key={i + 1} value={i + 1}>{nama}</option>
                                    ))}
                                  </select>
                                </div>
                                {/* Tahun */}
                                <div>
                                  <label className="text-[8px] font-medium text-gray-300 mb-1 block uppercase">Tahun</label>
                                  <select
                                    value={pembayaranForm.tahun_jatuh_tempo}
                                    onChange={(e) => setPembayaranForm({...pembayaranForm, tahun_jatuh_tempo: e.target.value})}
                                    className="w-full px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                  >
                                    {yearOptions.map((yr) => (
                                      <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <p className="text-[9px] text-gray-300 mt-1.5 italic">
                                Prioritas dihitung otomatis dari tanggal lokal perangkatmu ({new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})
                              </p>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Kategori</label>
                              <div className="flex flex-wrap gap-2">
                                {['Tagihan', 'Kredit', 'Asuransi', 'Sewa', 'Lainnya'].map((cat) => (
                                  <button
                                    key={cat}
                                    onClick={() => setPembayaranForm({...pembayaranForm, kategori: cat})}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      pembayaranForm.kategori === cat
                                        ? 'bg-primary text-white shadow-md scale-105'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 block">Keterangan (opsional)</label>
                              <input 
                                type="text"
                                value={pembayaranForm.keterangan}
                                onChange={(e) => setPembayaranForm({...pembayaranForm, keterangan: e.target.value})}
                                placeholder="Tambahkan catatan..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all italic"
                              />
                            </div>
                          </div>

                          {/* Info Box */}
                          <div className="mt-5 p-3 bg-amber-50 border border-amber-200/50 rounded-xl">
                            <div className="flex items-start gap-2 text-[10px] text-amber-700">
                              <CalendarClock size={14} className="mt-0.5 shrink-0" />
                              <span>
                                Prioritas <strong>otomatis dihitung</strong> dari selisih tanggal jatuh tempo dengan tanggal lokal perangkatmu. 
                                ≤3 hari = <span className="text-danger font-bold">Tinggi</span>, 
                                4-10 hari = <span className="text-warning font-bold">Sedang</span>, 
                                &gt;10 hari = <span className="text-success font-bold">Rendah</span>.
                              </span>
                            </div>
                          </div>

                          {/* Submit */}
                          <button
                            onClick={handleSavePembayaran}
                            className="w-full mt-6 py-3.5 bg-gradient-to-r from-primary to-primary-light text-white font-black uppercase tracking-[0.15em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg cursor-pointer"
                          >
                            {editingPembayaran ? 'Simpan Perubahan' : 'Tambah Pembayaran'}
                          </button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-2 bg-dark-purple/40 text-[9px] font-medium text-white/20 flex justify-between uppercase tracking-[0.1em]">
            <span>Synced with SQLite Database Local</span>
            <span>© 2026 Finance Management System</span>
          </div>
        </div>
      )}

    </div>
  );
}
