# KRS Akademik

Aplikasi satu halaman untuk mengelola pengambilan mata kuliah mahasiswa. Frontend React + Vite, API Laravel 12, dan PostgreSQL. Tabel KRS mengambil data per halaman dari server, sehingga browser tidak memuat jutaan baris sekaligus.

## Fitur

- Tambah KRS dengan mahasiswa/mata kuliah yang sudah ada atau baru. Insert yang diperlukan dan pembuatan enrollment dilakukan dalam satu transaksi database.
- Edit tahun ajaran, semester, dan status KRS; hapus enrollment secara permanen. Penghapusan tidak menghapus mahasiswa atau mata kuliah.
- Pencarian NIM, nama mahasiswa, atau kode MK dengan jeda 400 ms; filter cepat status dan semester.
- Filter lanjutan pada tujuh kolom, kombinasi AND/OR antarkondisi, urutan beberapa kolom, dan sort lewat header tabel.
- Pagination server-side dengan 10, 25, 50, atau 100 baris per halaman.
- Ekspor CSV sesuai filter yang berlaku, termasuk hasil di luar halaman yang sedang dibuka.

## Struktur data

`enrollments.student_id` merujuk `students.id` dan `enrollments.course_id` merujuk `courses.id`. Kombinasi `(student_id, course_id, academic_year, semester)` unik. Migration ada di `database/migrations/2026_09_17_112119_create_academic_tables.php`.

## Prasyarat

- PHP 8.3 dengan ekstensi `pdo_pgsql` dan `intl`, Composer, Node.js dan npm, PostgreSQL.
- Siapkan ruang disk yang cukup untuk database dan CSV besar. Jumlah waktu seed/ekspor bergantung pada perangkat.

## Setup lokal pada database baru

Jalankan perintah berikut dari folder utama proyek. Contoh memakai PowerShell.

1. Buat database PostgreSQL kosong bernama `krs_akademik`, misalnya melalui DBeaver:

   ```sql
   CREATE DATABASE krs_akademik;
   ```

2. Siapkan backend:

   ```powershell
   composer install
   Copy-Item .env.example .env
   php artisan key:generate
   ```

   Sesuaikan `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, dan `DB_PASSWORD` pada `.env` dengan PostgreSQL lokal. Jangan commit `.env`.

3. Buat tabel:

   ```powershell
   php artisan migrate
   ```

4. Pilih **satu** ukuran seed di `.env` sebelum menjalankan perintah seed pada database kosong:

   | Tujuan | KRS_STUDENTS | KRS_COURSES | Jumlah KRS |
   | --- | ---: | ---: | ---: |
   | Uji cepat | 100 | 10 | 1.000 |
   | Dataset penilaian | 50000 | 100 | 5.000.000 |

   `DatabaseSeeder` memanggil `AcademicSeeder`. Seeder menggunakan `generate_series` PostgreSQL dan insert per batch 500 mahasiswa. Sesudah mengatur angka yang diinginkan, jalankan:

   ```powershell
   php artisan db:seed
   ```

   **Jalankan hanya pada tabel akademik kosong.** Mengulang seed pada database berisi data yang sama akan melanggar constraint unik. Jangan memakai `migrate:fresh` pada database yang datanya ingin dipertahankan.

5. Buktikan jumlah baris di DBeaver:

   ```sql
   SELECT COUNT(*) AS jumlah_krs FROM enrollments;
   ```

6. Jalankan backend pada terminal pertama:

   ```powershell
   php artisan serve --host=127.0.0.1 --port=8000
   ```

7. Jalankan frontend pada terminal kedua:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Buka `http://localhost:5173`. Saat development, `frontend/vite.config.js` meneruskan `/api` ke Laravel di `127.0.0.1:8000`.

## API dan perilaku query

| Method | Rute | Fungsi |
| --- | --- | --- |
| GET | `/api/enrollments` | Daftar, pencarian, filter, sort, dan pagination |
| POST | `/api/enrollments` | Buat KRS secara transaksional |
| PUT | `/api/enrollments/{id}` | Ubah data enrollment |
| DELETE | `/api/enrollments/{id}` | Hard delete enrollment |
| GET | `/api/courses/options` | Pilihan mata kuliah |
| GET | `/api/enrollments/export` | CSV seluruh data sesuai filter |

Quick filter (`status`, `semester`) dan pencarian (`search`) selalu digabung dengan AND. Pada filter lanjutan, `filter_logic=and` mewajibkan semua kondisi cocok; `filter_logic=or` menerima baris yang cocok pada salah satu kondisi lanjutan. Hasil filter lanjutan tetap digabung dengan quick filter/pencarian memakai AND. Parameter `orders` mengurutkan beberapa kolom secara berurutan, lalu `id` menjadi penentu urutan akhir yang stabil.

Validasi form dilakukan di frontend dan backend. Database juga menjaga foreign key, nilai semester/status, rentang SKS, dan kombinasi KRS yang unik.

## Ekspor dan performa

API ekspor memakai filter yang sama dengan daftar, tetapi tidak membatasi hasil berdasarkan `page` atau `page_size`. Respons CSV ditulis bertahap memakai `streamDownload` dan `chunkById(5000)` menurut ID enrollment sehingga tidak menampung seluruh baris dalam memori PHP. CSV diberi UTF-8 BOM agar mudah dibaca Excel. Urutan ekspor berdasarkan ID, termasuk ketika tabel sedang diurutkan dengan kolom lain.

Primary key serta indeks pada NIM, email, kode mata kuliah, dan gabungan tahun ajaran/semester/status/id dibuat oleh migration. Pencarian `ILIKE` dengan wildcard di depan dan sort join tertentu dapat lebih lambat pada 5 juta baris; pengukuran query dan indeks tambahan perlu disesuaikan dengan beban server deployment. Ekspor 5 juta baris juga membutuhkan waktu, ruang disk di sisi penerima, dan koneksi HTTP yang cukup lama. Excel biasa tidak dapat menampilkan 5 juta baris dalam satu sheet; periksa file dengan alat yang mendukung file besar.

## Build dan deployment

```powershell
cd frontend
npm ci
npm run build
```

Deploy Laravel dengan document root mengarah ke folder `public`, gunakan PostgreSQL, konfigurasi `.env` produksi (`APP_DEBUG=false`, `APP_KEY` tersedia, dan koneksi DB benar), lalu jalankan `php artisan migrate --force`. Sajikan isi `frontend/dist` sebagai halaman aplikasi dan teruskan permintaan `/api/*` pada domain yang sama ke Laravel. Proxy Vite di atas hanya untuk development, bukan pengaturan server produksi. Siapkan timeout dan kapasitas disk yang cukup jika ekspor penuh 5 juta baris akan diunduh langsung.

**URL aplikasi online:** isi setelah deployment selesai.
