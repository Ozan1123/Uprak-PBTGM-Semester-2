const { contextBridge, ipcRenderer } = require('electron');

/**
 * ContextBridge API
 * Mengekspos fungsi yang aman untuk dipanggil dari React (renderer process).
 * Akses dari React: window.api.getTransaksi(), dst.
 */
contextBridge.exposeInMainWorld('api', {
  getTransaksi: () => ipcRenderer.invoke('get-transaksi'),
  getRingkasan: () => ipcRenderer.invoke('get-ringkasan'),

  simpanTransaksi: (data) => ipcRenderer.invoke('simpan-transaksi', data),
  hapusTransaksi: (id) => ipcRenderer.invoke('hapus-transaksi', id),

  // ─── Pembayaran Prioritas API ───────────────────────────────────────
  getCicilan: () => ipcRenderer.invoke('get-cicilan'),
  simpanCicilan: (data) => ipcRenderer.invoke('simpan-cicilan', data),
  updateCicilan: (id, data) => ipcRenderer.invoke('update-cicilan', id, data),
  hapusCicilan: (id) => ipcRenderer.invoke('hapus-cicilan', id),

  closeWindow: () => ipcRenderer.invoke('close-window'),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
});
