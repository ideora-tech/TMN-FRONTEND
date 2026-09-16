import NavbarPublik from './NavbarPublik'
import { BRAND, WARNA } from '@/constants/companyProfile.data'

export default function ComingSoonPage() {
    return (
        <div className="bg-white">
            <NavbarPublik />

            <section
                className="relative min-h-screen flex items-center overflow-hidden"
                style={{ background: WARNA.navy }}
            >
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
                <div
                    className="absolute top-1/3 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
                    style={{ background: WARNA.cyan }}
                />
                <div
                    className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-10"
                    style={{ background: WARNA.cyan }}
                />

                <div className="relative w-full max-w-3xl mx-auto px-6 pt-32 pb-24 text-center">
                    <span
                        className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
                        style={{ background: 'rgba(41,196,216,0.12)', color: WARNA.cyan }}
                    >
                        Segera Hadir
                    </span>

                    <h1
                        className="mt-8 text-4xl md:text-6xl font-bold text-white leading-tight"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                        Situs Resmi <span style={{ color: WARNA.cyan }}>{BRAND.namaLengkap}</span> Sedang Disiapkan
                    </h1>

                    <p className="mt-6 text-white/60 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                        Kami sedang menyusun informasi layanan, armada, dan jangkauan operasional kami. Halaman ini akan segera diperbarui.
                    </p>

                    <div className="mt-10 h-px w-24 mx-auto" style={{ background: 'rgba(255,255,255,0.15)' }} />

                    <p className="mt-6 text-white/40 text-sm">
                        Sudah menjadi mitra kami? Gunakan tombol Masuk di atas untuk mengakses sistem.
                    </p>
                </div>
            </section>
        </div>
    )
}
