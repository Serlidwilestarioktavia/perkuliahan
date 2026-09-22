# KuliahKu — Manajemen Perkuliahan (Versi Jadwal Berulang)

Versi ini memperbaiki input jadwal kuliah dan praktikum.

## Perubahan utama

Untuk **Jadwal Kuliah** dan **Praktikum**, pengguna tidak lagi memasukkan tanggal tertentu.

Contoh:
- Mata kuliah: Jaringan Komputer
- Hari: Senin
- Waktu: 08:00
- Lokasi: Lab 1

Setelah disimpan, sistem menganggap Jaringan Komputer berlangsung **setiap hari Senin** dan akan menampilkan jadwal Senin berikutnya secara otomatis.

Tugas/deadline tetap menggunakan tanggal tertentu.

## 1. Supabase

1. Buka project Supabase.
2. Masuk ke **SQL Editor**.
3. Jalankan seluruh isi `schema.sql`.
4. Buka **Project Settings > API**.
5. Pastikan `config.js` berisi Project URL dan publishable/anon key.

## 2. Jalankan lokal

Dari folder project:

```bash
npx serve .
```

Kemudian buka alamat localhost yang diberikan Terminal.

Alternatif:

```bash
python -m http.server 8000
```

Lalu buka `http://localhost:8000`.

## 3. Cara input jadwal

### Kuliah
Klik **Jadwal Kuliah > + Tambah**.

Contoh:
- Nama / Mata Kuliah: Jaringan Komputer
- Hari: Senin
- Waktu: 08:00
- Jenis: Kuliah
- Lokasi: Ruang 201

Klik **Simpan**.

### Praktikum
Contoh:
- Nama: Praktikum Pemrograman
- Hari: Rabu
- Waktu: 13:00
- Jenis: Praktikum
- Lokasi: Lab Komputer

Klik **Simpan**.

### Tugas
Tugas tetap menggunakan **Tanggal**, karena deadline tidak berulang setiap minggu.

## Catatan

Kolom `day_of_week` baru ditambahkan ke database. Jika database versi lama sudah ada, jalankan `schema.sql` terbaru agar kolom tersebut dibuat.
