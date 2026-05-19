const { contextBridge, ipcRenderer } = require('electron');

/**
 * ContextBridge API
 * Mengekspos fungsi yang aman untuk dipanggil dari React (renderer process).
 * Akses dari React: window.api.getTransaksi(), dst.
 */
contextBridge.exposeInMainWorld('api', {
  // Data fetching
  getTransaksi: () => ipcRenderer.invoke('get-transaksi'),
  getRingkasan: () => ipcRenderer.invoke('get-ringkasan'),

  // Data mutation
  simpanTransaksi: (data) => ipcRenderer.invoke('simpan-transaksi', data),
  hapusTransaksi: (id) => ipcRenderer.invoke('hapus-transaksi', id),

  // Window controls
  closeWindow: () => ipcRenderer.invoke('close-window'),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
});
