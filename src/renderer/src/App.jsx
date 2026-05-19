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
  Maximize2
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [transaksiList, setTransaksiList] = useState([]);
  const [ringkasan, setRingkasan] = useState({ pemasukan: 0, pengeluaran: 0, saldo: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    nominal: '',
    keterangan: '',
    aset: 'tunai',
    prioritas: 'rendah',
    kategori: 'Umum'
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
      const [trxData, sumData] = await Promise.all([
        window.api.getTransaksi(),
        window.api.getRingkasan()
      ]);
      setTransaksiList(trxData);
      setRingkasan(sumData);
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
      kategori: 'Umum'
    });
  };

  const handleSave = async () => {
    if (!formData.nominal || !formData.keterangan) {
      alert("Harap isi nominal dan keterangan!");
      return;
    }

    const payload = {
      jenis: view === 'pemasukan' ? 'pemasukan' : 'pengeluaran',
      nominal: parseFloat(formData.nominal),
      keterangan: formData.keterangan,
      aset: formData.aset,
      kategori: formData.kategori,
      prioritas: view === 'pengeluaran' ? formData.prioritas : null
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

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Status Keuangan Logic
  let statusKeuangan = "Kurang Stabil";
  let statusColor = "bg-[#F43F5E]"; // Danger red
  let progressWidth = "w-1/3";
  
  if (ringkasan.pemasukan > ringkasan.pengeluaran * 1.5) {
    statusKeuangan = "Sangat Stabil";
    statusColor = "bg-[#FB7185]"; // Pink
    progressWidth = "w-4/5";
  } else if (ringkasan.pemasukan >= ringkasan.pengeluaran) {
    statusKeuangan = "Stabil";
    statusColor = "bg-[#10B981]"; // Success green
    progressWidth = "w-2/3";
  }

  // Get high priority transactions for mini widget
  const prioritasList = transaksiList
    .filter(t => t.jenis === 'pengeluaran' && t.prioritas === 'tinggi')
    .slice(0, 2);

  return (
    <div className={`flex items-center justify-center min-h-screen ${view === 'mini' ? 'p-0' : 'p-4 md:p-8'}`}>
      
      {view === 'mini' ? (
        // ─── MINI WIDGET VIEW (LITE DASHBOARD) ───────────────────────────────────────────
        <div className="w-full h-full bg-primary shadow-2xl relative overflow-hidden flex flex-col border border-white/20 rounded-[24px]">
          {/* Header Mini Widget */}
          <div className="titlebar-drag flex justify-between items-center px-5 py-4 bg-white/5 text-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <div className="w-2 h-2 rounded-full bg-warning" />
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="ml-2 font-display font-bold text-[10px] tracking-wide uppercase opacity-70">Mini Dashboard</span>
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

          <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto white-scrollbar">
            {/* Saldo */}
            <div className="flex flex-col gap-1 items-center bg-white/10 p-5 rounded-2xl shadow-inner border border-white/5">
              <span className="text-[11px] text-lavender/60 font-medium uppercase tracking-widest">Saldomu saat ini</span>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">
                {formatIDR(ringkasan.saldo)}
              </h1>
            </div>

            {/* Buttons */}
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

            {/* History */}
            <div className="bg-white rounded-[20px] p-4 flex flex-col flex-1 shadow-lg text-dark-purple mt-2">
              <h3 className="text-[11px] font-bold mb-3 flex items-center justify-between opacity-80 uppercase tracking-widest">
                Terbaru
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[8px] font-normal">Top 3</span>
              </h3>
              <div className="flex-1 flex flex-col gap-2">
                {transaksiList.slice(0, 3).map((trx) => (
                  <div key={trx.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${trx.jenis === 'pemasukan' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                        {trx.jenis === 'pemasukan' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                      <div className="overflow-hidden max-w-[100px]">
                        <div className="font-bold text-[11px] truncate">{trx.keterangan}</div>
                        <div className="text-[8px] uppercase tracking-wider font-semibold opacity-40">{trx.kategori}</div>
                      </div>
                    </div>
                    <div className={`font-display font-bold text-[12px] ${trx.jenis === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                      {trx.jenis === 'pemasukan' ? '+' : '-'}{formatIDR(trx.nominal)}
                    </div>
                  </div>
                ))}

                {transaksiList.length > 3 && (
                  <button 
                    onClick={() => setView('dashboard')}
                    className="w-full mt-2 p-2 rounded-xl flex items-center justify-center text-gray-400 bg-gray-50 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer group border border-dashed border-gray-200"
                  >
                    <MoreHorizontal size={24} className="group-hover:scale-110 transition-transform" />
                  </button>
                )}
                
                {transaksiList.length === 0 && !isLoading && (
                  <div className="text-[10px] text-gray-400 italic text-center py-4">Belum ada transaksi</div>
                )}
              </div>
            </div>
          </div>
        </div>

      ) : (
        // ─── FULL DASHBOARD / FORM VIEW ─────────────────────────────────
        <div className="w-full max-w-[1000px] h-[700px] bg-primary rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col border border-white/10 transition-all">
          
          {/* Fake Header/Draggable Region */}
          <div className="titlebar-drag flex justify-between items-center px-6 py-4 bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="ml-2 text-white/50 text-xs font-medium tracking-widest uppercase">FinanceWidget v1.0</span>
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
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              
              {/* DASHBOARD VIEW */}
              {view === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="h-full p-8 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto"
                >
                  {/* Left Column (2/3) */}
                  <div className="md:col-span-2 flex flex-col gap-8">
                    {/* Saldo Card */}
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

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <button 
                          onClick={() => setView('pemasukan')}
                          className="bg-lavender-soft text-dark-purple p-6 rounded-2xl flex flex-col justify-between h-32 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg group cursor-pointer"
                        >
                          <span className="text-sm font-bold leading-tight opacity-80 group-hover:opacity-100 italic text-left">Tambahkan Pemasukan Anda</span>
                          <div className="self-end w-10 h-10 bg-dark-purple rounded-xl flex items-center justify-center text-white">
                            <Plus size={24} strokeWidth={3} />
                          </div>
                        </button>
                        <button 
                          onClick={() => setView('pengeluaran')}
                          className="bg-lavender-soft text-dark-purple p-6 rounded-2xl flex flex-col justify-between h-32 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg group cursor-pointer"
                        >
                          <span className="text-sm font-bold leading-tight opacity-80 group-hover:opacity-100 italic text-left">Tambahkan Pengeluaran Anda</span>
                          <div className="self-end w-10 h-10 bg-dark-purple rounded-xl flex items-center justify-center text-white">
                            <Plus size={24} strokeWidth={3} />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* History Section */}
                    <div className="bg-white rounded-[24px] p-6 flex flex-col flex-1 min-h-[300px] shadow-xl text-dark-purple overflow-hidden">
                      <h3 className="text-lg font-bold mb-4 flex items-center justify-between">
                        Riwayat Transaksi
                        <span className="text-xs font-normal opacity-50 px-3 py-1 bg-gray-100 rounded-full">Terbaru</span>
                      </h3>
                      <div className="flex-1 overflow-y-auto pr-2 space-y-3 white-scrollbar">
                        {isLoading ? (
                          <div className="flex items-center justify-center h-full text-gray-300 italic">Memuat transaksimu...</div>
                        ) : transaksiList.length === 0 ? (
                          <div className="flex items-center justify-center h-full text-gray-300 italic">Belum ada transaksi</div>
                        ) : (
                          transaksiList.map((trx) => (
                            <div key={trx.id} className="flex justify-between items-center p-4 rounded-xl hover:bg-gray-50 transition-colors border-b border-gray-100 group">
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
                     {/* Summary Cards */}
                     <div className="bg-pink-500 p-6 rounded-[20px] shadow-lg flex flex-col gap-1 hover:-rotate-1 transition-transform">
                       <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Pendapatan bulan ini</span>
                       <h2 className="text-2xl font-display font-bold text-white">{formatIDR(ringkasan.pemasukan)}</h2>
                     </div>

                     <div className="bg-lavender text-dark-purple p-6 rounded-[20px] shadow-lg flex flex-col gap-1 hover:rotate-1 transition-transform">
                       <span className="text-dark-purple/50 text-xs font-medium uppercase tracking-widest">Pengeluaran bulan ini</span>
                       <h2 className="text-2xl font-display font-bold">{formatIDR(ringkasan.pengeluaran)}</h2>
                     </div>

                     {/* Stability Status */}
                     <div className={`${statusColor} p-6 rounded-[20px] shadow-lg flex flex-col gap-1 transition-colors duration-500`}>
                       <span className="text-white/70 text-xs font-medium uppercase tracking-widest">Status keuangan saat ini</span>
                       <h3 className="text-xl font-bold text-white">{statusKeuangan}</h3>
                       <div className="w-full h-1 bg-white/20 mt-2 rounded-full overflow-hidden">
                          <div className={`${progressWidth} h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-1000`} />
                       </div>
                     </div>

                     {/* Priority List */}
                     <div className="bg-lavender-soft text-dark-purple p-6 rounded-[24px] shadow-xl flex-1 flex flex-col">
                       <h4 className="text-sm font-bold mb-4 flex items-center justify-between">
                         Prioritas SPK
                         <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                       </h4>
                       <div className="flex-1 space-y-4">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium opacity-60">Sangat Mendesak</span>
                            <span className="px-2 py-0.5 bg-danger text-white rounded font-bold uppercase tracking-tighter text-[9px]">Tinggi</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium opacity-60">Cicilan Bulanan</span>
                            <span className="px-2 py-0.5 bg-warning text-white rounded font-bold uppercase tracking-tighter text-[9px]">Sedang</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium opacity-60">Hiburan & Self Reward</span>
                            <span className="px-2 py-0.5 bg-success text-white rounded font-bold uppercase tracking-tighter text-[9px]">Rendah</span>
                          </div>
                       </div>
                       <div className="mt-4 pt-4 border-t border-dark-purple/10">
                          <p className="text-[10px] leading-tight text-dark-purple/40 italic">
                            *Berdasarkan algoritma pembobotan Simple Additive Weighting (SAW)
                          </p>
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}

              {/* FORM VIEW (Pemasukan or Pengeluaran) */}
              {(view === 'pemasukan' || view === 'pengeluaran') && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="h-full p-8 flex flex-col gap-6"
                >
                  {/* Form Header */}
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
                      <span className="opacity-40 uppercase text-[10px]">Saldomu Hari Ini</span>
                      {formatIDR(ringkasan.saldo)}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-8 border-b border-white/10 pb-2">
                    <button 
                      onClick={() => setView('pemasukan')}
                      className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${view === 'pemasukan' ? 'text-white' : 'text-white/40'}`}
                    >
                      Pendapatan
                      {view === 'pemasukan' && <motion.div layoutId="tab" className="absolute bottom-[-2px] left-0 right-0 h-1 bg-white rounded-full" />}
                    </button>
                    <button 
                      onClick={() => setView('pengeluaran')}
                      className={`pb-2 text-sm font-bold transition-all relative cursor-pointer ${view === 'pengeluaran' ? 'text-white' : 'text-white/40'}`}
                    >
                      Pengeluaran
                      {view === 'pengeluaran' && <motion.div layoutId="tab" className="absolute bottom-[-2px] left-0 right-0 h-1 bg-white rounded-full" />}
                    </button>
                  </div>

                  {/* Form Body */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4 flex-1">
                    
                    {/* Form Left (Inputs) */}
                    <div className="flex flex-col gap-6 max-w-md">
                      <div className="flex items-center gap-4">
                        <label className="w-24 text-xs font-bold uppercase tracking-widest text-lavender/40">Nominal</label>
                        <div className="flex-1 relative">
                          <span className="absolute left-0 bottom-2 text-xl font-bold opacity-30">Rp</span>
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
                        <label className="w-24 text-xs font-bold uppercase tracking-widest text-lavender/40">Keterangan</label>
                        <input 
                          type="text" 
                          value={formData.keterangan}
                          onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                          placeholder="Makan siang di kantor..."
                          className="flex-1 bg-transparent border-b border-white/20 pb-2 text-sm focus:outline-none focus:border-white transition-colors italic"
                        />
                      </div>

                      <div className="flex items-start gap-4 mt-2">
                        <label className="w-24 text-xs font-bold uppercase tracking-widest text-lavender/40 pt-2">Aset</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'tunai', icon: Banknote, label: 'Tunai' },
                            { id: 'kartu', icon: CreditCard, label: 'Kartu' },
                            { id: 'e-wallet', icon: Wallet, label: 'E-Wallet' }
                          ].map((item) => (
                            <button 
                              key={item.id}
                              onClick={() => setFormData({...formData, aset: item.id})}
                              className={`px-4 py-2 rounded-full border text-xs font-bold gap-2 flex items-center transition-all cursor-pointer ${
                                formData.aset === item.id 
                                ? 'bg-white text-primary border-white scale-105 shadow-md' 
                                : 'bg-transparent text-white/50 border-white/20 hover:border-white/50'
                              }`}
                            >
                              <item.icon size={14} />
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {view === 'pengeluaran' && (
                         <div className="flex flex-col gap-3 mt-4">
                           <label className="text-xs font-bold uppercase tracking-widest text-lavender/40">Tingkat Prioritas</label>
                           <div className="flex gap-3">
                             {[
                               { id: 'tinggi', colorClass: 'bg-danger border-danger text-danger', activeClass: 'bg-danger border-danger text-white', label: 'Tinggi' },
                               { id: 'sedang', colorClass: 'bg-warning border-warning text-warning', activeClass: 'bg-warning border-warning text-white', label: 'Sedang' },
                               { id: 'rendah', colorClass: 'bg-success border-success text-success', activeClass: 'bg-success border-success text-white', label: 'Rendah' }
                             ].map((item) => (
                               <button
                                 key={item.id}
                                 onClick={() => setFormData({...formData, prioritas: item.id})}
                                 className={`flex-1 py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-tighter transition-all cursor-pointer ${
                                   formData.prioritas === item.id
                                   ? `${item.activeClass} shadow-lg scale-105`
                                   : `bg-transparent ${item.colorClass.split(' ').slice(1).join(' ')} opacity-40 hover:opacity-80`
                                 }`}
                               >
                                 {item.label}
                               </button>
                             ))}
                           </div>
                         </div>
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

                    {/* Form Right (Categories) */}
                    <div className="bg-lavender-soft/10 rounded-[32px] p-8 border border-white/5 flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-white">Kategori</span>
                        <button className="text-[10px] font-bold text-lavender bg-white/5 px-2 py-1 rounded hover:bg-white/10 transition-all cursor-pointer">+ Tambah Kategori</button>
                      </div>
                      <div className="flex flex-wrap gap-3 content-start">
                         {['Umum', 'Makanan', 'Transportasi', 'Kesehatan', 'Belanja', 'Hiburan', 'Gaji', 'Bonus', 'Investasi'].map((cat) => (
                           <button 
                             key={cat}
                             onClick={() => setFormData({...formData, kategori: cat})}
                             className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                               formData.kategori === cat 
                               ? 'bg-lavender text-dark-purple shadow-md' 
                               : 'bg-white/5 text-white/40 hover:bg-white/10'
                             }`}
                           >
                             {cat}
                           </button>
                         ))}
                      </div>
                      <div className="mt-auto p-4 bg-primary/30 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-3 text-white/40 italic text-xs">
                          <MoreHorizontal size={16} />
                          Tips: Pilih kategori yang sesuai untuk analisis keuangan yang lebih akurat
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer info */}
          <div className="px-6 py-2 bg-dark-purple/40 text-[9px] font-medium text-white/20 flex justify-between uppercase tracking-[0.1em]">
            <span>Synced with SQLite Database Local</span>
            <span>© 2026 Finance Management System</span>
          </div>
        </div>
      )}

    </div>
  );
}
