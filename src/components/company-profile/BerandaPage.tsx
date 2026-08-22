import Link from 'next/link'
import type { IconType } from 'react-icons'
import { HiOutlineTruck, HiOutlineClock, HiOutlineShieldCheck, HiOutlineBanknotes, HiOutlineMap, HiOutlineCpuChip, HiArrowRight, HiCheckCircle } from 'react-icons/hi2'
import NavbarPublik from './NavbarPublik'
import FooterPublik from './FooterPublik'
import StatCounter from './StatCounter'
import { HERO, STATISTIK, LAYANAN, KEUNGGULAN, KLIEN, WARNA, PESAN_WA, waLink, type IkonKeunggulanKey } from '@/constants/companyProfile.data'

const IKON_KEUNGGULAN: Record<IkonKeunggulanKey, IconType> = {
    clock: HiOutlineClock,
    truck: HiOutlineTruck,
    shield: HiOutlineShieldCheck,
    uang: HiOutlineBanknotes,
    peta: HiOutlineMap,
    digital: HiOutlineCpuChip,
}

export default function BerandaPage() {
    return (
        <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
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

                <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
                    <div className="max-w-3xl">
                        <div>
                            <h1
                                className="text-4xl lg:text-[52px] font-bold text-white leading-[1.15]"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                                {HERO.headlineSebelum}
                                <span style={{ color: WARNA.cyan }}>{HERO.headlineAksen}</span>
                                {HERO.headlineSesudah}
                            </h1>

                            <p className="mt-6 text-white/60 text-base lg:text-lg leading-relaxed max-w-lg">
                                {HERO.subheadline}
                            </p>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <a
                                    href={waLink(PESAN_WA.umum)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 font-semibold px-7 py-3.5 rounded-xl transition-opacity hover:opacity-90"
                                    style={{ background: WARNA.cyan, color: WARNA.navyDark }}
                                >
                                    Hubungi Kami
                                </a>
                                <Link
                                    href="/layanan"
                                    className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium px-7 py-3.5 rounded-xl transition-colors"
                                >
                                    Lihat Layanan
                                </Link>
                            </div>

                            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                                {LAYANAN.map(l => (
                                    <span key={l.slug} className="flex items-center gap-1.5 text-white/50 text-sm">
                                        <HiCheckCircle className="shrink-0 text-base" style={{ color: WARNA.cyan }} />
                                        {l.judul}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="absolute bottom-0 inset-x-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                        <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="white" />
                    </svg>
                </div>
            </section>

            <section className="py-14 bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {STATISTIK.map(s => (
                        <StatCounter key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
                    ))}
                </div>
            </section>

            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>
                        Layanan Kami
                    </h2>
                    <p className="text-slate-500 text-center max-w-2xl mx-auto mt-4">
                        Solusi angkutan darat untuk kontrak jangka panjang maupun kebutuhan proyek.
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
                        {LAYANAN.map(l => (
                            <Link key={l.slug} href="/layanan" className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                <HiOutlineTruck className="text-3xl mb-4" style={{ color: WARNA.cyan }} />
                                <div className="font-semibold text-lg mb-2" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>
                                    {l.judul}
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed">{l.ringkas}</p>
                                <span className="inline-flex items-center gap-1 text-sm font-semibold mt-4" style={{ color: WARNA.cyan }}>
                                    Selengkapnya <HiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>
                        Kenapa Memilih Kami
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                        {KEUNGGULAN.map(k => {
                            const Icon = IKON_KEUNGGULAN[k.ikon] ?? HiOutlineTruck
                            return (
                                <div key={k.judul} className="rounded-2xl p-7 border border-slate-100">
                                    <Icon className="text-3xl mb-4" style={{ color: WARNA.navy }} />
                                    <div className="font-semibold text-lg mb-2" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>
                                        {k.judul}
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed">{k.deskripsi}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className="py-16 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-sm font-semibold tracking-widest uppercase text-slate-400 mb-8">
                        Dipercaya oleh
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                        {KLIEN.map(nama => (
                            <span key={nama} className="text-slate-400 font-semibold text-sm md:text-base">{nama}</span>
                        ))}
                    </div>
                </div>
            </section>

            <section className="py-20 px-6" style={{ background: WARNA.navy }}>
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        Butuh Mitra Transportasi yang Bisa Diandalkan?
                    </h2>
                    <p className="text-white/70 mt-4">Ceritakan kebutuhan angkutan Anda — tim kami siap menyusun penawaran terbaik.</p>
                    <a
                        href={waLink(PESAN_WA.penawaran)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-8 px-8 py-4 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
                        style={{ background: WARNA.cyan, color: WARNA.navyDark }}
                    >
                        Minta Penawaran via WhatsApp
                    </a>
                </div>
            </section>

            <FooterPublik />
        </div>
    )
}
