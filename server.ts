import dotenv from 'dotenv';
dotenv.config();
import "dotenv/config";
import express from "express";
import mysql from "mysql2/promise";
import path from "path";
import ExcelJS from "exceljs";
import multer from "multer";
import fs from "fs";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Ensure upload directories exist
const uploadDirs = ["uploads/pengaduan", "uploads/feedback", "uploads/ktp"];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = "uploads/pengaduan";
    if (req.path.includes("feedback")) {
      dest = "uploads/feedback";
    }
    if (file.fieldname === "ktp_file") {
      dest = "uploads/ktp";
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [".pdf", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format file tidak didukung. Gunakan PDF, PNG, JPG, atau JPEG."));
    }
  }
});

// serve uploads statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// --- API JSON ENFORCEMENT ---
// Ensure /api/* routes always return JSON, even for errors or 404s
app.use("/api/*", (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// --- DATABASE CONNECTION ---
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: parseInt(process.env.MYSQLPORT || "3306"),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// --- DATABASE INITIALIZATION ---
let isDbConnected = false;

async function initDb() {
  try {
    console.log("Checking database connection...");
    // Test connection
    const connection = await pool.getConnection();
    connection.release();
    isDbConnected = true;
    
    console.log("Initializing database tables...");

    // Create Categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('INTERNAL', 'EXTERNAL') NOT NULL,
        category_group ENUM('KEIMIGRASIAN', 'NON_KEIMIGRASIAN') NOT NULL DEFAULT 'KEIMIGRASIAN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create SLA Policies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sla_policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        priority VARCHAR(50) UNIQUE NOT NULL,
        response_time_hours FLOAT NOT NULL,
        resolution_time_hours FLOAT NOT NULL
      )
    `);

    // Create Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role ENUM('ADMIN', 'TECHNICIAN', 'SUPERVISOR', 'STAFF') NOT NULL,
        unit_kerja VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_no VARCHAR(50) UNIQUE NOT NULL,
        type ENUM('INTERNAL', 'EXTERNAL') NOT NULL,
        source VARCHAR(50) DEFAULT 'WEB',
        status ENUM('DITERIMA', 'DIVERIFIKASI_ADMIN', 'DIPROSES_TEKNISI', 'PENDING', 'SELESAI', 'DITOLAK') NOT NULL DEFAULT 'DITERIMA',
        priority VARCHAR(50) NOT NULL,
        reporter_name VARCHAR(255) NOT NULL,
        reporter_contact VARCHAR(255) NOT NULL,
        reporter_unit VARCHAR(255),
        reporter_identity_masked TINYINT(1) DEFAULT 0,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category_id INT,
        category_group ENUM('KEIMIGRASIAN', 'NON_KEIMIGRASIAN') NOT NULL DEFAULT 'KEIMIGRASIAN',
        location_context VARCHAR(255),
        confidential_level VARCHAR(50) DEFAULT 'NORMAL',
        wa_number VARCHAR(50),
        wa_chat_summary TEXT,
        wa_received_at DATETIME,
        other_category TEXT,
        assigned_to_user_id INT,
        reporter_id INT,
        is_verified TINYINT(1) DEFAULT 0,
        verified_by_admin INT,
        verified_at DATETIME,
        technician_note TEXT,
        ktp_attachment_path VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        first_response_at DATETIME,
        resolved_at DATETIME,
        closed_at DATETIME,
        due_response_at DATETIME,
        due_resolve_at DATETIME,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (verified_by_admin) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Ensure columns exist (for existing databases)
    const alterQueries = [
      "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ktp_attachment_path VARCHAR(500)",
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_group ENUM('KEIMIGRASIAN', 'NON_KEIMIGRASIAN') NOT NULL DEFAULT 'KEIMIGRASIAN'",
      "ALTER TABLE tickets MODIFY COLUMN status ENUM('DITERIMA', 'DIVERIFIKASI_ADMIN', 'DIPROSES_TEKNISI', 'PENDING', 'SELESAI', 'DITOLAK') NOT NULL DEFAULT 'DITERIMA'",
      "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category_group ENUM('KEIMIGRASIAN', 'NON_KEIMIGRASIAN') NOT NULL DEFAULT 'KEIMIGRASIAN'",
      "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS verified_by_admin INT",
      "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS verified_at DATETIME",
      "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS technician_note TEXT",
      "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachment_path VARCHAR(255)",
      "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)",
      "ALTER TABLE tickets ADD CONSTRAINT fk_verified_admin FOREIGN KEY IF NOT EXISTS (verified_by_admin) REFERENCES users(id) ON DELETE SET NULL"
    ];

    for (const q of alterQueries) {
      try {
        await pool.query(q);
      } catch (e) {
        // Ignore errors for existing columns/constraints
      }
    }

    // Create Ticket Feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        note TEXT NOT NULL,
        file_path VARCHAR(255),
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create Ticket Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        is_internal_only TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create Audit Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(255) NOT NULL,
        target_id INT,
        target_type VARCHAR(50),
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // --- SEEDING ---
    // Seed Users
    const [users] = await pool.query("SELECT COUNT(*) as count FROM users");
    if ((users as any)[0].count === 0) {
      console.log("Seeding users...");
      // NOTE: For production, use bcrypt to hash passwords.
      await pool.query("INSERT INTO users (username, password, full_name, role, unit_kerja) VALUES ?", [
        [
          ["admin", "admin123", "Admin TIKIM", "ADMIN", "TIKIM"],
          ["teknisi1", "teknisi123", "Budi Teknisi", "TECHNICIAN", "TIKIM"],
          ["pimpinan", "pimpinan123", "Kepala Seksi TIKIM", "SUPERVISOR", "TIKIM"],
          ["pegawai1", "pegawai123", "Siti Pegawai", "STAFF", "Lalu Lintas"],
        ],
      ]);
    }

    // Seed SLA Policies
    const [sla] = await pool.query("SELECT COUNT(*) as count FROM sla_policies");
    if ((sla as any)[0].count === 0) {
      console.log("Seeding SLA policies...");
      await pool.query("INSERT INTO sla_policies (priority, response_time_hours, resolution_time_hours) VALUES ?", [
        [
          ["CRITICAL", 0.5, 4],
          ["HIGH", 2, 24],
          ["MEDIUM", 4, 48],
          ["LOW", 24, 120],
        ],
      ]);
    }

    // Seed Categories
    const [cats] = await pool.query("SELECT COUNT(*) as count FROM categories");
    if ((cats as any)[0].count === 0) {
      console.log("Seeding categories...");
      await pool.query("INSERT INTO categories (name, type, category_group) VALUES ?", [
        [
          ["Paspor", "EXTERNAL", "KEIMIGRASIAN"],
          ["PLB", "EXTERNAL", "KEIMIGRASIAN"],
          ["Izin Tinggal", "EXTERNAL", "KEIMIGRASIAN"],
          ["Lainnya", "EXTERNAL", "KEIMIGRASIAN"],
          ["Sarana dan Prasarana", "EXTERNAL", "NON_KEIMIGRASIAN"],
          ["Pelayanan Petugas", "EXTERNAL", "NON_KEIMIGRASIAN"],
          ["Sistem / Aplikasi", "EXTERNAL", "NON_KEIMIGRASIAN"],
          ["Lainnya", "EXTERNAL", "NON_KEIMIGRASIAN"],
          ["Jaringan", "INTERNAL", "NON_KEIMIGRASIAN"],
          ["Perangkat", "INTERNAL", "NON_KEIMIGRASIAN"],
          ["Aplikasi", "INTERNAL", "NON_KEIMIGRASIAN"],
          ["Lainnya", "INTERNAL", "NON_KEIMIGRASIAN"],
        ],
      ]);
    }

    console.log("Database initialized successfully.");
  } catch (error) {
    isDbConnected = false;
    console.error("Database initialization failed:", error);
    console.log("TIP: Ensure MySQL is running and credentials in .env are correct.");
  }
}

app.use(express.json());

// Middleware to check DB connection
app.use((req, res, next) => {
  if (!isDbConnected && req.path.startsWith("/api/") && req.path !== "/api/db-status") {
    return res.status(503).json({ 
      message: "Database not connected", 
      details: "The application could not connect to the MySQL server. If you are in the AI Studio preview, you need to provide a remote MySQL database in the Secrets panel or run this app locally with XAMPP.",
      code: "DB_CONNECTION_ERROR"
    });
  }
  next();
});

// --- API ROUTES ---

app.get("/api/db-status", (req, res) => {
  res.json({ connected: isDbConnected });
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
    const user = (rows as any)[0];
    if (user) {
      const { password: _, ...cleanUser } = user;
      res.json(cleanUser);
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Login failed", details: error.message });
  }
});

app.get("/api/tickets", async (req, res) => {
  try {
    const { role, userId } = req.query;
    let query = `
      SELECT t.*, c.name as category_name, u.full_name as assignee_name 
      FROM tickets t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id 
      WHERE 1=1
    `;
    const params: any[] = [];
    if (role === 'TECHNICIAN') {
      query += " AND t.assigned_to_user_id = ?";
      params.push(userId);
    }
    query += " ORDER BY t.created_at DESC";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch tickets", details: error.message });
  }
});

app.post(
  "/api/tickets",
  upload.fields([
    { name: "attachment", maxCount: 1 },
    { name: "ktp_file", maxCount: 1 }
  ]),
  async (req, res) => {
  try {
    console.log("POST /api/tickets - Request Body:", JSON.stringify(req.body, null, 2));
    const data = req.body;
    const file = req.file;
  
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };
  
  const attachmentFile = files?.attachment?.[0];
  const ktpFile = files?.ktp_file?.[0];

  const attachmentPath = attachmentFile
    ? `/uploads/pengaduan/${attachmentFile.filename}`
    : null;

  const attachmentName = attachmentFile
    ? attachmentFile.originalname
    : null;

  const ktpPath = ktpFile
    ? `/uploads/ktp/${ktpFile.filename}`
    : null;

  if (!ktpFile) {
      return res.status(400).json({
        message: "File KTP wajib diupload."
      });
  }
    const {
      reporter_name,
      reporter_contact,
      subject,
      description
    } = req.body;

    // Server-side validation
    const requiredFields = ['type', 'reporter_name', 'subject', 'description', 'category_id', 'priority'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return res.status(400).json({ success: false, message: `Field ${field} wajib diisi.` });
      }
    }

    // New ticket number format: IM-JPR-YYYY-XXXX
    const year = new Date().getFullYear();
    const [idRows] = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE ticket_no LIKE ?", [`IM-JPR-${year}-%`]);
    const nextId = (idRows as any)[0].count + 1;
    const ticketNo = `IM-JPR-${year}-${String(nextId).padStart(4, '0')}`;
    
    const [slaRows] = await pool.query("SELECT * FROM sla_policies WHERE priority = ?", [data.priority]);
    const sla = (slaRows as any)[0];
    
    const now = new Date();
    const dueRes = new Date(now.getTime() + (sla?.response_time_hours || 24) * 3600000);
    const dueResol = new Date(now.getTime() + (sla?.resolution_time_hours || 48) * 3600000);

    const [catRows] = await pool.query("SELECT category_group FROM categories WHERE id = ?", [data.category_id]);
    const categoryGroup = (catRows as any)[0]?.category_group || 'KEIMIGRASIAN';

    const [result] = await pool.query(`
  INSERT INTO tickets (
    ticket_no,
    type,
    source,
    status,
    priority,
    reporter_name,
    reporter_contact,
    reporter_unit,
    subject,
    description,
    category_id,
    category_group,
    other_category,
    wa_number,
    wa_chat_summary,
    wa_received_at,
    reporter_id,
    is_verified,
    due_response_at,
    due_resolve_at,
    attachment_path,
    attachment_name,
    ktp_attachment_path
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`, [
  ticketNo,
  data.type,
  "WEB",
  "DITERIMA",
  data.priority,
  data.reporter_name,
  data.reporter_contact || "",
  data.reporter_unit || null,
  data.subject,
  data.description,
  data.category_id,
  categoryGroup,
  data.other_category || null,
  null,
  null,
  null,
  null,
  0,
  dueRes,
  dueResol,
  attachmentPath,
  attachmentName,
  ktpPath
]);

    const insertId = (result as any).insertId;
    console.log(`Ticket created successfully: ${ticketNo} (ID: ${insertId})`);

    res.json({ 
      success: true, 
      message: "Tiket berhasil dibuat", 
      id: insertId, 
      ticket_no: ticketNo 
    });
  } catch (error: any) {
    console.error("Error in POST /api/tickets:", error);
    res.status(500).json({ success: false, message: "Gagal membuat tiket", details: error.message });
  }
});

app.get("/api/tickets/:id", async (req, res) => {
  try {
    const [ticketRows] = await pool.query(`
      SELECT t.*, c.name as category_name, u.full_name as assignee_name 
      FROM tickets t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id 
      WHERE t.id = ?
    `, [req.params.id]);
    
    const [feedbackRows] = await pool.query(`
      SELECT tf.*, u.full_name as user_name 
      FROM ticket_feedback tf 
      LEFT JOIN users u ON tf.created_by = u.id 
      WHERE tf.ticket_id = ? 
      ORDER BY tf.created_at DESC
    `, [req.params.id]);
    
    const [messageRows] = await pool.query(`
      SELECT tm.*, u.full_name as user_name 
      FROM ticket_messages tm 
      LEFT JOIN users u ON tm.user_id = u.id 
      WHERE tm.ticket_id = ? 
      ORDER BY tm.created_at ASC
`   , [req.params.id]);

    res.json({ ...(ticketRows as any)[0], messages: messageRows, feedbacks: feedbackRows });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch ticket detail", details: error.message });
  }
});

app.patch("/api/tickets/:id", async (req, res) => {
  try {
    const { status, assigned_to_user_id, user_id, note } = req.body;
    if (status) {
      await pool.query("UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, req.params.id]);
    }
    if (assigned_to_user_id) {
      await pool.query("UPDATE tickets SET assigned_to_user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [assigned_to_user_id, req.params.id]);
    }
    if (note) {
      await pool.query("INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES (?, ?, ?)", [req.params.id, user_id, note]);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update ticket", details: error.message });
  }
});

app.patch("/api/tickets/:id/verify", async (req, res) => {
  try {
    const { action, admin_id } = req.body; // 'valid' or 'spam'
    if (action === 'valid') {
      await pool.query(`
        UPDATE tickets 
        SET is_verified = 1, 
            status = 'DIVERIFIKASI_ADMIN', 
            verified_by_admin = ?, 
            verified_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [admin_id, req.params.id]);
    } else if (action === 'spam') {
      await pool.query(`
        UPDATE tickets 
        SET is_verified = 1, 
            status = 'DITOLAK', 
            verified_by_admin = ?, 
            verified_at = CURRENT_TIMESTAMP, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [admin_id, req.params.id]);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to verify ticket", details: error.message });
  }
});

app.patch("/api/tickets/:id/assign", async (req, res) => {
  try {
    const { technician_id } = req.body;
    await pool.query(`
      UPDATE tickets 
      SET assigned_to_user_id = ?, 
          status = 'DIPROSES_TEKNISI', 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [technician_id, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to assign ticket", details: error.message });
  }
});

app.patch("/api/tickets/:id/status", async (req, res) => {
  try {
    const { status, technician_note } = req.body;
    let query = "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP";
    const params = [status];
    
    if (technician_note) {
      query += ", technician_note = ?";
      params.push(technician_note);
    }
    
    if (status === 'SELESAI') {
      query += ", resolved_at = CURRENT_TIMESTAMP";
    }
    
    query += " WHERE id = ?";
    params.push(req.params.id);
    
    await pool.query(query, params);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update status", details: error.message });
  }
});


app.post("/api/tickets/:id/feedback", upload.single('feedback_file'), async (req, res) => {
  try {
    const { note, user_id, status } = req.body;
    const file = req.file;

    if (!note) {
      return res.status(400).json({ message: "Catatan hasil wajib diisi." });
    }

    // Insert feedback
    await pool.query(`
      INSERT INTO ticket_feedback (ticket_id, note, file_path, created_by)
      VALUES (?, ?, ?, ?)
    `, [req.params.id, note, file ? file.path : null, user_id]);

    // Update ticket status if provided
    if (status) {
      const resolvedAt = status === 'SELESAI' || status === 'CLOSED' ? 'CURRENT_TIMESTAMP' : null;
      let updateQuery = "UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP";
      const params = [status];
      
      if (resolvedAt) {
        updateQuery += ", resolved_at = CURRENT_TIMESTAMP";
      }
      
      updateQuery += " WHERE id = ?";
      params.push(req.params.id);
      
      await pool.query(updateQuery, params);
    }

    res.json({ success: true, message: "Hasil penanganan berhasil disimpan." });
  } catch (error: any) {
    console.error("Error in POST /api/tickets/:id/feedback:", error);
    res.status(500).json({ message: "Gagal menyimpan hasil penanganan", details: error.message });
  }
});

app.post("/api/tickets/track", async (req, res) => {
  console.log("TRACK VIA /api/tickets/track");
  console.log(req.body);
  try {
    const { ticket_no, contact } = req.body;
    if (!ticket_no) {
      return res.status(400).json({ message: "Nomor tiket wajib diisi." });
    }

    const [rows] = await pool.query(`
      SELECT t.*, c.name as category_name, u.full_name as assignee_name 
      FROM tickets t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id 
      WHERE t.ticket_no = ? AND (t.reporter_contact = ? OR t.wa_number = ?)
    `, [ticket_no, contact, contact]);
    
    const ticket = (rows as any)[0];
    if (ticket) {
      // Also fetch timeline and feedback for tracking
      const [messageRows] = await pool.query(`
        SELECT tm.message, tm.created_at, u.full_name as user_name 
        FROM ticket_messages tm 
        LEFT JOIN users u ON tm.user_id = u.id 
        WHERE tm.ticket_id = ? AND tm.is_internal_only = 0
        ORDER BY tm.created_at DESC
      `, [ticket.id]);

      const [feedbackRows] = await pool.query(`
        SELECT note, file_path, created_at 
        FROM ticket_feedback 
        WHERE ticket_id = ? 
        ORDER BY created_at DESC
      `, [ticket.id]);

      res.json({ 
        ...ticket, 
        timeline: messageRows,
        feedbacks: feedbackRows
      });
    } else {
      res.status(404).json({ message: "Tiket tidak ditemukan atau nomor HP tidak sesuai." });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Tracking failed", details: error.message });
  }
});

app.get("/api/reports/monthly", async (req, res) => {
  try {
    const { month, year } = req.query; // e.g. month=4, year=2026
    const startDate = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`;
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0).toISOString().split('T')[0] + ' 23:59:59';

    const [tickets] = await pool.query(`
      SELECT t.ticket_no, t.reporter_name, t.subject, t.status, u.full_name as technician_name, t.created_at, t.resolved_at 
      FROM tickets t 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id 
      WHERE t.created_at BETWEEN ? AND ?
      ORDER BY t.created_at ASC
    `, [startDate, endDate]);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Bulanan");

    sheet.columns = [
      { header: "No Tiket", key: "ticket_no", width: 20 },
      { header: "Nama Pelapor", key: "reporter_name", width: 25 },
      { header: "Subjek", key: "subject", width: 30 },
      { header: "Status", key: "status", width: 20 },
      { header: "Teknisi", key: "technician_name", width: 25 },
      { header: "Tanggal Dibuat", key: "created_at", width: 20 },
      { header: "Tanggal Selesai", key: "resolved_at", width: 20 },
    ];

    (tickets as any[]).forEach(t => {
      sheet.addRow({
        ...t,
        created_at: new Date(t.created_at).toLocaleString('id-ID'),
        resolved_at: t.resolved_at ? new Date(t.resolved_at).toLocaleString('id-ID') : "-",
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Laporan_Bulanan_${month}_${year}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate report", details: error.message });
  }
});

app.post("/api/tickets/:id/messages", async (req, res) => {
  try {
    const { user_id, message, is_internal_only } = req.body;
    await pool.query("INSERT INTO ticket_messages (ticket_id, user_id, message, is_internal_only) VALUES (?, ?, ?, ?)", [
      req.params.id,
      user_id,
      message,
      is_internal_only ? 1 : 0
    ]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to add message", details: error.message });
  }
});

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const [[totalRow]] = await pool.query("SELECT COUNT(*) as count FROM tickets") as any;
    const [[openRow]] = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status NOT IN ('SELESAI', 'DITOLAK')") as any;
    const [[overdueRow]] = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE due_resolve_at < NOW() AND status NOT IN ('SELESAI', 'DITOLAK')") as any;
    const [byCategory] = await pool.query(`
      SELECT c.name, COUNT(t.id) as count 
      FROM categories c 
      LEFT JOIN tickets t ON c.id = t.category_id 
      GROUP BY c.id, c.name
    `) as any;
    
    res.json({ 
      total: totalRow.count, 
      open: openRow.count, 
      overdue: overdueRow.count, 
      byCategory 
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch dashboard stats", details: error.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const { type } = req.query;
    let query = "SELECT * FROM categories";
    const params: any[] = [];
    if (type) {
      query += " WHERE type = ?";
      params.push(type);
    }
    query += " ORDER BY category_group, name";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch categories", details: error.message });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name, type, category_group } = req.body;
    const [result] = await pool.query("INSERT INTO categories (name, type, category_group) VALUES (?, ?, ?)", [name, type, category_group || 'KEIMIGRASIAN']);
    res.json({ id: (result as any).insertId });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to create category", details: error.message });
  }
});

app.patch("/api/categories/:id", async (req, res) => {
  try {
    const { name, type, category_group } = req.body;
    await pool.query("UPDATE categories SET name = ?, type = ?, category_group = ? WHERE id = ?", [name, type, category_group, req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update category", details: error.message });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to delete category", details: error.message });
  }
});

app.get("/api/sla-policies", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sla_policies");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch SLA policies", details: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, full_name, role FROM users");
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch users", details: error.message });
  }
});

app.get("/api/public/track", async (req, res) => {
  console.log("TRACK VIA /api/public/track");
  console.log(req.query);
  try {
    const { ticket_no, contact } = req.query;
    if (!ticket_no) {
      return res.status(400).json({ message: "Nomor tiket wajib diisi." });
    }

    const [rows] = await pool.query(`
      SELECT t.*, c.name as category_name, u.full_name as assignee_name 
      FROM tickets t 
      LEFT JOIN categories c ON t.category_id = c.id 
      LEFT JOIN users u ON t.assigned_to_user_id = u.id 
      WHERE t.ticket_no = ? AND (t.reporter_contact LIKE ? OR t.wa_number LIKE ? OR t.reporter_contact = ? OR t.wa_number = ?)
    `, [ticket_no, `%${contact}%`, `%${contact}%`, contact, contact]);
   
    const ticket = (rows as any)[0];
    if (!ticket) {
      return res.status(404).json({ message: "Tiket tidak ditemukan. Pastikan nomor tiket dan nomor HP sudah benar." });
    }

    // Also fetch timeline and feedback
    const [messageRows] = await pool.query(`
      SELECT tm.message, tm.created_at, u.full_name as user_name 
      FROM ticket_messages tm 
      LEFT JOIN users u ON tm.user_id = u.id 
      WHERE tm.ticket_id = ? AND tm.is_internal_only = 0
      ORDER BY tm.created_at DESC
    `, [ticket.id]);

    const [feedbackRows] = await pool.query(`
      SELECT note, file_path, created_at 
      FROM ticket_feedback 
      WHERE ticket_id = ? 
      ORDER BY created_at DESC
    `, [ticket.id]);

    res.json({ 
      ...ticket, 
      timeline: messageRows,
      feedbacks: feedbackRows
    });
  } catch (error: any) {
    res.status(500).json({ message: "Tracking failed", details: error.message });
  }
});

app.get("/api/reports/excel", async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: "Start and end dates are required" });
    }

    const [tickets] = await pool.query(`
      SELECT t.*, c.name as category_name 
      FROM tickets t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE t.created_at BETWEEN ? AND ?
      ORDER BY t.created_at ASC
    `, [`${start} 00:00:00`, `${end} 23:59:59`]);

    const [categories] = await pool.query("SELECT * FROM categories") as any;

    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Ringkasan
    const summarySheet = workbook.addWorksheet("Ringkasan");
    summarySheet.columns = [
      { header: "Kategori", key: "category", width: 30 },
      { header: "Jumlah Tiket", key: "count", width: 15 },
    ];

    const summaryData: any[] = [];
    let totalTickets = 0;

    categories.forEach((cat: any) => {
      const count = (tickets as any[]).filter(t => t.category_id === cat.id).length;
      summaryData.push({ category: cat.name, count });
      totalTickets += count;
    });

    summarySheet.addRows(summaryData);
    summarySheet.addRow({});
    summarySheet.addRow({ category: "TOTAL", count: totalTickets });
    summarySheet.getRow(summarySheet.rowCount).font = { bold: true };

    // Sheets per category
    categories.forEach((cat: any) => {
      const catTickets = (tickets as any[]).filter(t => t.category_id === cat.id);
      if (catTickets.length === 0) return;

      const sheetName = cat.name.substring(0, 31);
      const sheet = workbook.addWorksheet(sheetName);

      sheet.columns = [
        { header: "No Tiket", key: "ticket_no", width: 20 },
        { header: "Jenis", key: "type", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Prioritas", key: "priority", width: 15 },
        { header: "Kategori", key: "category_name", width: 20 },
        { header: "Detail Kategori", key: "other_category", width: 30 },
        { header: "Pelapor", key: "reporter_name", width: 25 },
        { header: "Kontak/WA", key: "contact", width: 20 },
        { header: "Unit (Internal)", key: "reporter_unit", width: 20 },
        { header: "Judul", key: "subject", width: 30 },
        { header: "Tanggal Buat", key: "created_at", width: 20 },
        { header: "Tanggal Selesai", key: "resolved_at", width: 20 },
        { header: "Overdue SLA", key: "overdue", width: 15 },
        { header: "Deskripsi", key: "description", width: 50 },
      ];

      catTickets.forEach(t => {
        const isOverdue = t.due_resolve_at && new Date(t.due_resolve_at) < (t.resolved_at ? new Date(t.resolved_at) : new Date());
        sheet.addRow({
          ticket_no: t.ticket_no,
          type: t.type,
          status: t.status,
          priority: t.priority,
          category_name: t.category_name,
          other_category: t.other_category || "-",
          reporter_name: t.reporter_name,
          contact: t.type === 'EXTERNAL' ? t.wa_number : t.reporter_contact,
          reporter_unit: t.reporter_unit || "-",
          subject: t.subject,
          created_at: new Date(t.created_at).toLocaleString('id-ID'),
          resolved_at: t.resolved_at ? new Date(t.resolved_at).toLocaleString('id-ID') : "-",
          overdue: isOverdue ? "Ya" : "Tidak",
          description: t.description,
        });
      });

      sheet.getRow(1).font = { bold: true };
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Laporan_TIKIM_${start}_sd_${end}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate report", details: error.message });
  }
});

// Catch-all for API routes to prevent falling through to SPA fallback
app.all("/api/*", (req, res) => {
  console.log(`API Route Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    message: `API route not found: ${req.method} ${req.path}`,
    suggestion: "Check if the route is defined in server.ts and if the URL in frontend matches exactly."
  });
});

// --- VITE MIDDLEWARE ---

async function startServer() {
  // init database
  initDb();

  // serve frontend build
  app.use(express.static(path.join(process.cwd(), "dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
  });

  // start server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

startServer();
