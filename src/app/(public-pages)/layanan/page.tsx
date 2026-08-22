import type { Metadata } from 'next'
import { HiOutlineCheckCircle } from 'react-icons/hi2'
import HeroHalaman from '@/components/company-profile/HeroHalaman'
import { LAYANAN, WARNA, waLink, HERO_HALAMAN, PESAN_WA } from '@/constants/companyProfile.data'

export const metadata: Metadata = {
    title: 'Layanan — Sulita Logistik Indonesia',
    description: 'Angkutan kontrak & proyek (FTL), distribusi rutin, sewa unit + supir, dan project logistik.',
}

export default function LayananPage() {
    return (
        <main>
            <HeroHalaman judul={HERO_HALAMAN.layanan.judul} subjudul={HERO_HALAMAN.layanan.subjudul} />

            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
                    {LAYANAN.map(l => (
                        <div key={l.slug} className="rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col">
                            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>{l.judul}</h2>
                            <p className="text-slate-600 leading-relaxed mb-5">{l.deskripsi}</p>
                            <ul className="space-y-2 mb-8">
                                {l.poin.map(p => (
                                    <li key={p} className="flex items-center gap-2 text-sm text-slate-600">
                                        <HiOutlineCheckCircle className="shrink-0" style={{ color: WARNA.cyan }} /> {p}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={waLink(PESAN_WA.perLayanan(l.judul))}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-auto inline-block self-start px-6 py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                                style={{ background: WARNA.navy }}
                            >
                                Minta Penawaran
                            </a>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    )
}
