import type { Metadata } from 'next'
import { HiOutlineTruck } from 'react-icons/hi2'
import HeroHalaman from '@/components/company-profile/HeroHalaman'
import { ARMADA, WARNA, waLink, HERO_HALAMAN, PESAN_WA } from '@/constants/companyProfile.data'

export const metadata: Metadata = {
    title: 'Armada — Sulita Logistik Indonesia',
    description: 'Jenis armada Sulita Logistik: CDE, CDD, Fuso, Tronton, Wingbox, hingga Trailer — terawat dan terpantau sistem.',
}

export default function ArmadaKamiPage() {
    return (
        <main>
            <HeroHalaman judul={HERO_HALAMAN.armadaKami.judul} subjudul={HERO_HALAMAN.armadaKami.subjudul} />

            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ARMADA.map(a => (
                        <div key={a.nama} className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                            <div
                                className="h-40 flex items-center justify-center"
                                style={{ background: `linear-gradient(135deg, ${WARNA.navy}, ${WARNA.navyDark})` }}
                            >
                                <HiOutlineTruck className="text-6xl text-white/60" />
                            </div>
                            <div className="p-6">
                                <div className="font-semibold text-lg" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>{a.nama}</div>
                                <div className="text-sm font-semibold mt-1" style={{ color: WARNA.cyan }}>{a.kapasitas}</div>
                                <p className="text-sm text-slate-500 mt-3 leading-relaxed">{a.cocok}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-center text-sm text-slate-400 mt-10">
                    Kapasitas bersifat indikatif — kebutuhan spesifik dapat didiskusikan dengan tim kami.
                </p>
                <div className="text-center mt-6">
                    <a
                        href={waLink(PESAN_WA.armada)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                        style={{ background: WARNA.navy }}
                    >
                        Tanya Ketersediaan Unit
                    </a>
                </div>
            </section>
        </main>
    )
}
