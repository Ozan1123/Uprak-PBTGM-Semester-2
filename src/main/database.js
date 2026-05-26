const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// Simpan file .db di folder userData (%APPDATA%/widget-keuangan/)
const dbPath = path.join(app.getPath('userData'), 'keuangan.db');
const db = new Database(dbPath);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');
// ini apaan dah
/**
 * Inisialisasi tabel transaksi dan pembayaran prioritas
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

  db.exec(`
    CREATE TABLE IF NOT EXISTS cicilan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      nominal REAL NOT NULL,
      tanggal_jatuh_tempo INTEGER NOT NULL,
      kategori TEXT DEFAULT 'Tagihan',
      keterangan TEXT,
      aktif INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrasi: tambah kolom bulan dan tahun jatuh tempo
  try {
    const columns = db.prepare("PRAGMA table_info(cicilan)").all();
    const colNames = columns.map(c => c.name);

    if (!colNames.includes('bulan_jatuh_tempo')) {
      db.exec(`ALTER TABLE cicilan ADD COLUMN bulan_jatuh_tempo INTEGER`);
      const now = new Date();
      db.exec(`UPDATE cicilan SET bulan_jatuh_tempo = ${now.getMonth() + 1} WHERE bulan_jatuh_tempo IS NULL`);
    }

    if (!colNames.includes('tahun_jatuh_tempo')) {
      db.exec(`ALTER TABLE cicilan ADD COLUMN tahun_jatuh_tempo INTEGER`);
      const now = new Date();
      db.exec(`UPDATE cicilan SET tahun_jatuh_tempo = ${now.getFullYear()} WHERE tahun_jatuh_tempo IS NULL`);
    }
  } catch (err) {
    console.error('[DB] Migration cicilan error:', err.message);
  }

  // Migrasi: tambah kolom pajak di transaksi
  try {
    const trxColumns = db.prepare("PRAGMA table_info(transaksi)").all();
    const trxColNames = trxColumns.map(c => c.name);

    if (!trxColNames.includes('pajak')) {
      db.exec(`ALTER TABLE transaksi ADD COLUMN pajak REAL DEFAULT 0`);
    }
  } catch (err) {
    console.error('[DB] Migration transaksi error:', err.message);
  }

  console.log('[DB] SQLite siap di:', dbPath);
}

// ─── Transaksi Functions ─────────────────────────────────────────

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
    INSERT INTO transaksi (jenis, nominal, kategori, aset, prioritas, keterangan, pajak)
    VALUES (@jenis, @nominal, @kategori, @aset, @prioritas, @keterangan, @pajak)
  `);
  const info = stmt.run({
    jenis: data.jenis,
    nominal: data.nominal,
    kategori: data.kategori || 'Umum',
    aset: data.aset || 'tunai',
    prioritas: data.prioritas || null,
    keterangan: data.keterangan || '',
    pajak: data.pajak || 0,
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

// ─── Pembayaran Prioritas Functions ──────────────────────────────

/**
 * Hitung prioritas otomatis berdasarkan sisa hari ke jatuh tempo.
 * Patokan: tanggal lokal user (new Date() = waktu lokal).
 * 
 * @param {number} tanggal - Tanggal jatuh tempo (1-31)
 * @param {number} bulan   - Bulan jatuh tempo (1-12)
 * @param {number} tahun   - Tahun jatuh tempo (misal 2026)
 * 
 * Prioritas:
 *   Sudah lewat  → tinggi (Sudah Lewat!)
 *   ≤ 3 hari     → tinggi (sangat mendesak)
 *   4-10 hari    → sedang (perlu dipersiapkan)
 *   > 10 hari    → rendah (masih aman)
 */
function hitungPrioritas(tanggal, bulan, tahun) {
  // Patokan tanggal lokal user
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Target: full date dari input user (bulan di JS = 0-indexed, user input 1-indexed)
  const targetDate = new Date(tahun, bulan - 1, tanggal);

  const diffTime = targetDate.getTime() - todayStart.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let prioritas = 'rendah';
  let label = 'Masih Aman';

  if (diffDays < 0) {
    prioritas = 'tinggi';
    label = `Sudah lewat ${Math.abs(diffDays)} hari!`;
  } else if (diffDays === 0) {
    prioritas = 'tinggi';
    label = 'Jatuh Tempo Hari Ini!';
  } else if (diffDays <= 3) {
    prioritas = 'tinggi';
    label = `${diffDays} hari lagi`;
  } else if (diffDays <= 10) {
    prioritas = 'sedang';
    label = `${diffDays} hari lagi`;
  } else {
    prioritas = 'rendah';
    label = `${diffDays} hari lagi`;
  }

  return { prioritas, sisaHari: diffDays, label };
}

/**
 * Ambil semua pembayaran prioritas dengan prioritas yang sudah dihitung otomatis
 */
function getCicilanWithPriority() {
  const stmt = db.prepare('SELECT * FROM cicilan ORDER BY tanggal_jatuh_tempo ASC, bulan_jatuh_tempo ASC, tahun_jatuh_tempo ASC');
  const rows = stmt.all();

  // Fallback: jika bulan/tahun kosong (data lama), gunakan bulan/tahun saat ini
  const now = new Date();
  const defaultBulan = now.getMonth() + 1;
  const defaultTahun = now.getFullYear();

  return rows.map((row) => {
    const bulan = row.bulan_jatuh_tempo || defaultBulan;
    const tahun = row.tahun_jatuh_tempo || defaultTahun;
    const { prioritas, sisaHari, label } = hitungPrioritas(row.tanggal_jatuh_tempo, bulan, tahun);
    return {
      ...row,
      bulan_jatuh_tempo: bulan,
      tahun_jatuh_tempo: tahun,
      prioritas,
      sisaHari,
      labelPrioritas: label,
    };
  });
}

/**
 * Simpan pembayaran prioritas baru
 */
function insertCicilan(data) {
  const stmt = db.prepare(`
    INSERT INTO cicilan (nama, nominal, tanggal_jatuh_tempo, bulan_jatuh_tempo, tahun_jatuh_tempo, kategori, keterangan)
    VALUES (@nama, @nominal, @tanggal_jatuh_tempo, @bulan_jatuh_tempo, @tahun_jatuh_tempo, @kategori, @keterangan)
  `);
  return stmt.run({
    nama: data.nama,
    nominal: data.nominal,
    tanggal_jatuh_tempo: data.tanggal_jatuh_tempo,
    bulan_jatuh_tempo: data.bulan_jatuh_tempo,
    tahun_jatuh_tempo: data.tahun_jatuh_tempo,
    kategori: data.kategori || 'Tagihan',
    keterangan: data.keterangan || '',
  });
}

/**
 * Update pembayaran prioritas berdasarkan ID
 */
function updateCicilan(id, data) {
  const stmt = db.prepare(`
    UPDATE cicilan 
    SET nama = @nama, 
        nominal = @nominal, 
        tanggal_jatuh_tempo = @tanggal_jatuh_tempo, 
        bulan_jatuh_tempo = @bulan_jatuh_tempo,
        tahun_jatuh_tempo = @tahun_jatuh_tempo,
        kategori = @kategori, 
        keterangan = @keterangan
    WHERE id = @id
  `);
  return stmt.run({
    id,
    nama: data.nama,
    nominal: data.nominal,
    tanggal_jatuh_tempo: data.tanggal_jatuh_tempo,
    bulan_jatuh_tempo: data.bulan_jatuh_tempo,
    tahun_jatuh_tempo: data.tahun_jatuh_tempo,
    kategori: data.kategori || 'Tagihan',
    keterangan: data.keterangan || '',
  });
}

/**
 * Hapus pembayaran prioritas berdasarkan ID
 */
function deleteCicilan(id) {
  const stmt = db.prepare('DELETE FROM cicilan WHERE id = ?');
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
  getCicilanWithPriority,
  insertCicilan,
  updateCicilan,
  deleteCicilan,
};