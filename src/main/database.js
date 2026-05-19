const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Simpan file .db di folder userData (%APPDATA%/widget-keuangan/)
const dbPath = path.join(app.getPath('userData'), 'keuangan.db');
const db = new Database(dbPath);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');

/**
 * Inisialisasi tabel transaksi
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaksi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jenis TEXT NOT NULL CHECK(jenis IN ('pemasukan', 'pengeluaran')),
      nominal REAL NOT NULL,
      kategori TEXT DEFAULT 'Umum',
      aset TEXT DEFAULT 'tunai' CHECK(aset IN ('tunai', 'kartu', 'e-wallet')),
      prioritas TEXT CHECK(prioritas IN ('tinggi', 'sedang', 'rendah', NULL)),
      keterangan TEXT,
      tanggal DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[DB] SQLite siap di:', dbPath);
}

/**
 * Ambil semua transaksi, diurutkan dari terbaru
 */
function getAll() {
  const stmt = db.prepare('SELECT * FROM transaksi ORDER BY tanggal DESC');
  return stmt.all();
}

/**
 * Ambil ringkasan keuangan bulan ini
 * Return: { pemasukan, pengeluaran, saldo }
 */
function getRingkasan() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const startOfMonth = `${year}-${month}-01`;

  // Total pemasukan bulan ini
  const pemasukanRow = db.prepare(`
    SELECT COALESCE(SUM(nominal), 0) as total 
    FROM transaksi 
    WHERE jenis = 'pemasukan' AND tanggal >= ?
  `).get(startOfMonth);

  // Total pengeluaran bulan ini
  const pengeluaranRow = db.prepare(`
    SELECT COALESCE(SUM(nominal), 0) as total 
    FROM transaksi 
    WHERE jenis = 'pengeluaran' AND tanggal >= ?
  `).get(startOfMonth);

  // Saldo total (semua waktu)
  const saldoRow = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN jenis = 'pemasukan' THEN nominal ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN jenis = 'pengeluaran' THEN nominal ELSE 0 END), 0) as saldo
    FROM transaksi
  `).get();

  return {
    pemasukan: pemasukanRow.total,
    pengeluaran: pengeluaranRow.total,
    saldo: saldoRow.saldo,
  };
}

/**
 * Simpan transaksi baru
 */
function insert(data) {
  const stmt = db.prepare(`
    INSERT INTO transaksi (jenis, nominal, kategori, aset, prioritas, keterangan)
    VALUES (@jenis, @nominal, @kategori, @aset, @prioritas, @keterangan)
  `);
  const info = stmt.run({
    jenis: data.jenis,
    nominal: data.nominal,
    kategori: data.kategori || 'Umum',
    aset: data.aset || 'tunai',
    prioritas: data.prioritas || null,
    keterangan: data.keterangan || '',
  });
  return info;
}

/**
 * Hapus transaksi berdasarkan ID
 */
function deleteById(id) {
  const stmt = db.prepare('DELETE FROM transaksi WHERE id = ?');
  return stmt.run(id);
}

// Inisialisasi saat module di-require
initDatabase();

module.exports = {
  db,
  getAll,
  getRingkasan,
  insert,
  deleteById,
};