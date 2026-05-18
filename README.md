# TIKIM Helpdesk

Sistem Helpdesk & Pengaduan TI Imigrasi.

## Cara Menjalankan
1. Pastikan MySQL sudah berjalan (XAMPP).
2. Buat database `tikim_pengaduan`.
3. Konfigurasi `.env` sesuai dengan kredensial MySQL Anda.
4. Jalankan perintah:
   ```bash
   npm install
   npm run dev
   ```

## Kustomisasi Logo
Untuk mengganti logo di halaman login dan sidebar, cukup ganti file berikut di folder `/public`:
- `logo-kemenimipas.png`: Logo Kementerian (Kiri di halaman login).
- `logo-imigrasi.webp`: Logo Imigrasi (Kanan di halaman login dan di sidebar).

Pastikan nama file tetap sama agar aplikasi dapat memuatnya secara otomatis.

## Fitur Laporan
Laporan dapat diunduh dalam format Excel (.xlsx) melalui menu **Laporan**. Pilih rentang tanggal dan klik tombol **Download Laporan (Excel)**. Laporan akan berisi ringkasan dan detail per kategori dalam sheet yang terpisah.

## Penomoran Tiket
Nomor tiket menggunakan format sederhana `IMI-XXXX` (misal: `IMI-0001`). Nomor ini bertambah secara otomatis berdasarkan ID tiket di database.
