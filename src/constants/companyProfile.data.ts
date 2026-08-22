export const WARNA = {
    navy: '#1B2D6E',
    navyDark: '#0D1938',
    cyan: '#29C4D8',
    biruMuda: '#EEF3FF',
}

export const BRAND = {
    nama: 'Sulita Logistik',
    tagline: 'Indonesia',
    namaLengkap: 'PT Sulita Logistik Indonesia',
}

export const NAV_LINKS = [
    { href: '/', label: 'Beranda' },
    { href: '/tentang', label: 'Tentang Kami' },
    { href: '/layanan', label: 'Layanan' },
    { href: '/armada-kami', label: 'Armada' },
    { href: '/kontak', label: 'Kontak' },
]

export const KONTAK = {
    alamat: 'Jl. Contoh Raya No. 00, Kel. Contoh, Jakarta Utara, DKI Jakarta 14000 (alamat lengkap menyusul)',
    telepon: '+62 21-0000-0000',
    whatsapp: '6281200000000',
    email: 'email-menyusul@sulitalogistik.co.id',
    jamOperasional: 'Senin – Sabtu, 08.00 – 17.00 WIB',
    mapsEmbedUrl: 'https://www.google.com/maps?q=Jakarta%20Utara&output=embed',
}

export const waLink = (pesan: string) =>
    `https://wa.me/${KONTAK.whatsapp}?text=${encodeURIComponent(pesan)}`

export const PESAN_WA = {
    umum: 'Halo, saya ingin bertanya tentang layanan Sulita Logistik.',
    penawaran: 'Halo, saya ingin meminta penawaran layanan transportasi.',
    armada: 'Halo, saya ingin bertanya tentang ketersediaan armada.',
    perLayanan: (judul: string) => `Halo, saya ingin meminta penawaran layanan ${judul}.`,
}

export const HERO = {
    headlineSebelum: 'Mitra ',
    headlineAksen: 'Transportasi & Logistik',
    headlineSesudah: ' Terpercaya untuk Bisnis Anda',
    subheadline:
        'Sulita Logistik Indonesia melayani angkutan barang kontrak, distribusi rutin, dan kebutuhan logistik proyek dengan armada terawat, supir profesional, dan sistem monitoring digital real-time.',
}

export const HERO_HALAMAN = {
    tentang: {
        judul: 'Tentang Kami',
        subjudul: 'Mengenal lebih dekat PT Sulita Logistik Indonesia — siapa kami, apa yang kami yakini, dan bagaimana kami bekerja.',
    },
    layanan: {
        judul: 'Layanan Kami',
        subjudul: 'Empat layanan inti yang bisa disesuaikan dengan kebutuhan rantai pasok bisnis Anda.',
    },
    armadaKami: {
        judul: 'Armada Kami',
        subjudul: 'Beragam jenis unit siap melayani — seluruhnya terawat dengan servis berkala dan terpantau sistem manajemen armada digital.',
    },
    kontak: {
        judul: 'Hubungi Kami',
        subjudul: 'Tim kami siap membantu kebutuhan angkutan Anda — hubungi lewat saluran mana pun di bawah ini.',
    },
}

export const FOOTER_DESKRIPSI =
    'PT Sulita Logistik Indonesia — jasa angkutan kontrak, distribusi rutin, sewa unit + supir, dan project logistik dengan armada terawat serta monitoring digital real-time.'

export const STATISTIK = [
    { label: 'Armada Terdaftar', value: 500, suffix: '+' },
    { label: 'Supir Aktif', value: 1200, suffix: '+' },
    { label: 'Trip Diselesaikan', value: 15000, suffix: '+' },
    { label: 'Klien Terlayani', value: 50, suffix: '+' },
]

export const PROFIL = [
    'PT Sulita Logistik Indonesia adalah perusahaan jasa transportasi dan logistik yang melayani kebutuhan angkutan barang untuk berbagai sektor industri di Indonesia. Berangkat dari pengalaman panjang di dunia angkutan darat, kami tumbuh menjadi mitra logistik yang mengutamakan ketepatan waktu, keamanan muatan, dan transparansi biaya.',
    'Kami mengoperasikan beragam jenis armada — dari CDE hingga trailer — yang seluruhnya terpantau melalui sistem manajemen armada digital milik kami sendiri, mencakup penjadwalan, monitoring perjalanan, hingga pelaporan. Dengan begitu, setiap pengiriman dapat dipantau dan dipertanggungjawabkan dari titik muat sampai titik bongkar.',
    'Didukung tim operasional yang siaga dan supir-supir terlatih, kami siap menjadi perpanjangan tangan rantai pasok bisnis Anda — untuk kontrak jangka panjang maupun kebutuhan proyek.',
]

export const VISI =
    'Menjadi perusahaan transportasi dan logistik terpercaya yang menjadi pilihan utama mitra bisnis di Indonesia.'

export const MISI = [
    'Memberikan layanan angkutan yang aman, tepat waktu, dan bertanggung jawab.',
    'Mengelola armada dan supir secara profesional dengan dukungan teknologi digital.',
    'Membangun hubungan jangka panjang dengan klien melalui transparansi dan komunikasi yang baik.',
    'Meningkatkan kesejahteraan dan kompetensi seluruh karyawan serta mitra pengemudi.',
    'Tumbuh berkelanjutan dengan tata kelola perusahaan yang sehat.',
]

export type IkonNilaiKey = 'shield' | 'clock' | 'mata'

export const NILAI: { judul: string; deskripsi: string; ikon: IkonNilaiKey }[] = [
    {
        judul: 'Aman',
        deskripsi: 'Muatan dijaga dari titik muat hingga titik bongkar — armada terawat, supir terlatih, perjalanan terpantau.',
        ikon: 'shield',
    },
    {
        judul: 'Tepat Waktu',
        deskripsi: 'Penjadwalan terencana dan monitoring real-time memastikan komitmen waktu pengiriman terjaga.',
        ikon: 'clock',
    },
    {
        judul: 'Transparan',
        deskripsi: 'Biaya, status perjalanan, dan laporan tersedia jelas — tanpa biaya tersembunyi.',
        ikon: 'mata',
    },
]

export const LEGALITAS = [
    'NIB: 0000000000000 (menyusul)',
    'NPWP: 00.000.000.0-000.000 (menyusul)',
    'Izin Usaha Angkutan Barang (menyusul)',
]

export const LAYANAN = [
    {
        slug: 'kontrak',
        judul: 'Angkutan Kontrak & Proyek',
        ringkas: 'Layanan full truck load (FTL) untuk kontrak jangka panjang maupun kebutuhan proyek dengan rute dan volume terjadwal.',
        deskripsi:
            'Kami melayani kontrak angkutan dengan komitmen unit, supir, dan jadwal yang disepakati di depan. Cocok untuk industri manufaktur, FMCG, dan proyek konstruksi yang membutuhkan kepastian kapasitas angkut.',
        poin: ['Komitmen unit & jadwal', 'Tarif kontrak transparan', 'Laporan perjalanan rutin'],
    },
    {
        slug: 'distribusi',
        judul: 'Distribusi Rutin',
        ringkas: 'Pengiriman berulang antar gudang, pabrik, dan titik distribusi dengan rute tetap.',
        deskripsi:
            'Distribusi terjadwal dengan rute dan titik drop yang tetap — kami kelola penjadwalan supir dan armada hariannya, Anda cukup memantau hasilnya.',
        poin: ['Rute & titik drop tetap', 'Penjadwalan harian dikelola kami', 'Monitoring tiap trip'],
    },
    {
        slug: 'sewa',
        judul: 'Sewa Unit + Supir',
        ringkas: 'Sewa kendaraan berikut supir profesional untuk kebutuhan operasional harian atau bulanan.',
        deskripsi:
            'Unit dan supir kami menjadi bagian dari operasional Anda — perawatan kendaraan, penggajian supir, dan penggantian unit saat servis menjadi tanggung jawab kami.',
        poin: ['Perawatan ditanggung kami', 'Supir pengganti tersedia', 'Fleksibel harian/bulanan'],
    },
    {
        slug: 'proyek-logistik',
        judul: 'Project Logistik',
        ringkas: 'Penanganan kebutuhan angkutan khusus: muatan proyek, relokasi, dan pengiriman terencana lainnya.',
        deskripsi:
            'Untuk kebutuhan di luar rute reguler — perpindahan gudang, muatan proyek konstruksi, atau pengiriman musiman — tim kami menyusun rencana armada dan jadwal khusus sesuai kebutuhan Anda.',
        poin: ['Perencanaan khusus per proyek', 'Koordinasi muat-bongkar', 'Satu penanggung jawab'],
    },
]

export const ARMADA = [
    { nama: 'CDE (Colt Diesel Engkel)', kapasitas: '± 2 ton / 9 m³', cocok: 'Distribusi dalam kota & muatan ringan' },
    { nama: 'CDD (Colt Diesel Double)', kapasitas: '± 4–5 ton / 16 m³', cocok: 'Distribusi antar kota muatan menengah' },
    { nama: 'Fuso / Ragasa', kapasitas: '± 7–8 ton / 24 m³', cocok: 'Angkutan antar kota volume besar' },
    { nama: 'Tronton', kapasitas: '± 10–20 ton / 30+ m³', cocok: 'Muatan berat jarak menengah–jauh' },
    { nama: 'Wingbox', kapasitas: '± 10–20 ton / 50+ m³', cocok: 'Muatan palet, bongkar-muat cepat dari samping' },
    { nama: 'Trailer', kapasitas: '± 20–40 ton', cocok: 'Kontainer 20/40 ft & muatan proyek berat' },
]

export type IkonKeunggulanKey = 'clock' | 'truck' | 'shield' | 'uang' | 'peta' | 'digital'

export const KEUNGGULAN: { judul: string; deskripsi: string; ikon: IkonKeunggulanKey }[] = [
    { judul: 'Tepat Waktu', deskripsi: 'Jadwal keberangkatan terencana dan dipantau — keterlambatan terdeteksi sejak dini.', ikon: 'clock' },
    { judul: 'Armada Terawat', deskripsi: 'Servis berkala terjadwal lewat sistem — unit selalu laik jalan.', ikon: 'truck' },
    { judul: 'Supir Profesional', deskripsi: 'Supir terverifikasi dengan SIM aktif, absensi digital, dan evaluasi performa rutin.', ikon: 'shield' },
    { judul: 'Harga Kompetitif', deskripsi: 'Struktur biaya jelas sejak penawaran — tanpa biaya tersembunyi.', ikon: 'uang' },
    { judul: 'Jangkauan Luas', deskripsi: 'Melayani rute antar kota dan antar pulau sesuai kebutuhan kontrak Anda.', ikon: 'peta' },
    { judul: 'Sistem Digital Real-time', deskripsi: 'Didukung sistem manajemen armada milik sendiri: penjadwalan, monitoring trip, hingga pelaporan.', ikon: 'digital' },
]

export const KLIEN = [
    'PT Mitra Industri A',
    'PT Distribusi Nusantara B',
    'CV Sumber Makmur C',
    'PT Karya Konstruksi D',
    'PT Retail Sejahtera E',
    'PT Pangan Utama F',
]
