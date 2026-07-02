'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    HiMenuAlt3,
    HiX,
    HiArrowRight,
    HiCheckCircle,
    HiOutlineTruck,
    HiOutlineUsers,
    HiOutlineChartBar,
    HiOutlineDocumentText,
} from 'react-icons/hi'

/* ─── brand tokens (Sulita Logistik Indonesia) ─── */
const NAVY  = '#1B2D6E'
const NAVY_DARK = '#0D1938'
const CYAN  = '#29C4D8'

/* ─────────────────────────────────────────── data ─── */

const NAV_LINKS = [
    { href: '#fitur',      label: 'Fitur'      },
    { href: '#cara-kerja', label: 'Cara Kerja' },
    { href: '#tentang',    label: 'Tentang'    },
]

const STATS = [
    { label: 'Armada Terdaftar',  value: 500,   suffix: '+' },
    { label: 'Supir Aktif',       value: 1200,  suffix: '+' },
    { label: 'Trip Diselesaikan', value: 15000, suffix: '+' },
    { label: 'Klien Terlayani',   value: 50,    suffix: '+' },
]

const FEATURES = [
    {
        Icon: HiOutlineTruck,
        color: 'text-[#1B2D6E]',
        bg: 'bg-blue-50',
        title: 'Manajemen Armada',
        desc: 'Pantau seluruh kendaraan — status, jadwal servis, dan riwayat perjalanan — dalam satu tampilan terpusat dan real-time.',
    },
    {
        Icon: HiOutlineUsers,
        color: 'text-[#29C4D8]',
        bg: 'bg-cyan-50',
        title: 'HR & Manajemen Supir',
        desc: 'Kelola data supir, masa berlaku SIM, penugasan armada, dan performa perjalanan secara akurat dan terstruktur.',
    },
    {
        Icon: HiOutlineChartBar,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        title: 'Monitoring Operasional',
        desc: 'Jadwal keberangkatan, check-in/out supir, dan status trip berjalan langsung tersedia di dashboard operasional.',
    },
    {
        Icon: HiOutlineDocumentText,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        title: 'Laporan & Faktur',
        desc: 'Rekonsiliasi otomatis, pembuatan faktur klien, dan laporan keuangan perjalanan yang lengkap dan akurat.',
    },
]

const STEPS = [
    {
        num: '01',
        role: 'Tim Sales',
        accentBg: NAVY,
        ring: 'ring-blue-100',
        title: 'Terima & Atur Project',
        desc: 'Tim Sales menerima permintaan klien, membuat project baru, dan mengkoordinasikan kebutuhan armada serta supir.',
        checks: ['Input project & data klien', 'Alokasi jadwal armada', 'Koordinasi dengan Operasional'],
    },
    {
        num: '02',
        role: 'Tim Operasional',
        accentBg: CYAN,
        ring: 'ring-cyan-100',
        title: 'Siapkan & Monitor Trip',
        desc: 'Operasional menugaskan supir dan kendaraan, lalu memantau setiap perjalanan secara real-time hingga selesai.',
        checks: ['Assign supir & armada', 'Monitor trip berjalan', 'Catat laporan perjalanan'],
    },
    {
        num: '03',
        role: 'Tim Keuangan',
        accentBg: '#F59E0B',
        ring: 'ring-amber-100',
        title: 'Verifikasi & Penagihan',
        desc: 'Keuangan memverifikasi laporan trip, membuat faktur untuk klien, dan melakukan rekonsiliasi pembayaran.',
        checks: ['Verifikasi laporan trip', 'Buat faktur klien', 'Rekonsiliasi pembayaran'],
    },
]

/* ─────────────────────────────────── count-up hook ─── */

function useCountUp(target: number, duration = 1800, active = false) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (!active) return
        let raf: number
        const start = performance.now()
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setCount(Math.floor(eased * target))
            if (p < 1) raf = requestAnimationFrame(tick)
            else setCount(target)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [target, duration, active])
    return count
}

function StatItem({ label, value, suffix }: { label: string; value: number; suffix: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState(false)
    const count = useCountUp(value, 1800, active)

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setActive(true) },
            { threshold: 0.5 },
        )
        if (ref.current) obs.observe(ref.current)
        return () => obs.disconnect()
    }, [])

    const display = value >= 1000
        ? (count / 1000).toFixed(count >= value && value % 1000 === 0 ? 0 : 1) + 'k'
        : String(count)

    return (
        <div ref={ref} className="text-center">
            <div
                className="text-4xl lg:text-5xl font-bold tabular-nums"
                style={{ fontFamily: 'Poppins, sans-serif', color: NAVY }}
            >
                {display}{suffix}
            </div>
            <div className="mt-2 text-slate-500 text-sm">{label}</div>
        </div>
    )
}

/* ──────────────────────────────────── main page ─── */

export default function LandingPage() {
    const [menuOpen, setMenuOpen] = useState(false)
    const [scrolled, setScrolled]  = useState(false)

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 24)
        window.addEventListener('scroll', handler, { passive: true })
        return () => window.removeEventListener('scroll', handler)
    }, [])

    return (
        <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>

            {/* ── NAVBAR ── */}
            <nav
                className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
                    scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100' : 'bg-transparent'
                }`}
            >
                <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <Image
                            src="/img/logo/logo-sli.png"
                            alt="Sulita Logistik Indonesia"
                            width={120}
                            height={120}
                            className={`h-24 w-auto object-contain transition-all duration-300 ${scrolled ? '' : 'brightness-0 invert'}`}
                            priority
                        />
                        <div>
                            <div
                                className={`font-bold text-2xl leading-tight transition-colors ${scrolled ? '' : 'text-white'}`}
                                style={{ fontFamily: 'Poppins, sans-serif', color: scrolled ? NAVY : undefined }}
                            >
                                Sulita Logistik
                            </div>
                            <div className="text-base font-semibold leading-tight tracking-wide" style={{ color: CYAN }}>
                                Indonesia
                            </div>
                        </div>
                    </div>

                    {/* Desktop links */}
                    <div className="hidden md:flex items-center gap-8">
                        {NAV_LINKS.map(l => (
                            <a
                                key={l.href}
                                href={l.href}
                                className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-[#1B2D6E]' : 'text-white/80 hover:text-white'}`}
                            >
                                {l.label}
                            </a>
                        ))}
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            href="/sign-in"
                            className={`text-sm font-medium transition-colors ${scrolled ? 'text-slate-600 hover:text-[#1B2D6E]' : 'text-white/80 hover:text-white'}`}
                        >
                            Masuk
                        </Link>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className={`md:hidden transition-colors ${scrolled ? 'text-slate-700' : 'text-white'}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <HiX size={24} /> : <HiMenuAlt3 size={24} />}
                    </button>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
                        <div className="px-6 py-5 flex flex-col gap-4">
                            {NAV_LINKS.map(l => (
                                <a
                                    key={l.href}
                                    href={l.href}
                                    className="text-sm font-medium"
                                    style={{ color: NAVY }}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {l.label}
                                </a>
                            ))}
                            <Link
                                href="/sign-in"
                                className="text-sm font-medium"
                                style={{ color: NAVY }}
                                onClick={() => setMenuOpen(false)}
                            >
                                Masuk
                            </Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* ── HERO ── */}
            <section
                className="relative min-h-screen flex items-center overflow-hidden"
                style={{ background: NAVY }}
            >
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
                {/* Glow orbs using brand cyan */}
                <div
                    className="absolute top-1/3 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
                    style={{ background: CYAN }}
                />
                <div
                    className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-10"
                    style={{ background: CYAN }}
                />

                <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 w-full">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                        {/* Left: copy */}
                        <div>
                            <h1
                                className="text-4xl lg:text-[52px] font-bold text-white leading-[1.15]"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                                Solusi Logistik Terpercaya untuk{' '}
                                <span style={{ color: CYAN }}>Operasional Armada</span>{' '}
                                Modern
                            </h1>

                            <p className="mt-6 text-white/60 text-base lg:text-lg leading-relaxed max-w-lg">
                                Sulita Logistik Indonesia menghadirkan platform manajemen fleet, HR supir, monitoring trip real-time, dan pelaporan keuangan dalam satu sistem yang terintegrasi.
                            </p>

                            <div className="mt-8">
                                <a
                                    href="#fitur"
                                    className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium px-7 py-3.5 rounded-xl transition-colors"
                                >
                                    Lihat Fitur
                                </a>
                            </div>

                            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                                {['Manajemen Armada', 'HR Supir', 'Monitoring Trip', 'Laporan & Faktur'].map(f => (
                                    <span key={f} className="flex items-center gap-1.5 text-white/50 text-sm">
                                        <HiCheckCircle className="shrink-0 text-base" style={{ color: CYAN }} />
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Right: live fleet dashboard mockup */}
                        <div className="hidden lg:flex justify-end">
                            <div className="w-full max-w-[360px]">

                                {/* Main fleet card */}
                                <div
                                    className="rounded-2xl p-5 shadow-2xl backdrop-blur-sm border"
                                    style={{ background: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.1)' }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-white/60 text-xs font-medium flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: CYAN }} />
                                            Live Fleet Monitor
                                        </span>
                                        <span className="text-white/25 text-xs font-mono">02/07 · 08:45</span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {[
                                            { plate: 'DD 1234 SLI', driver: 'Budi Santoso',  status: 'Berjalan', type: 'cyan'  },
                                            { plate: 'DD 5678 SLI', driver: 'Ahmad Rifai',   status: 'Standby',  type: 'white' },
                                            { plate: 'DD 9012 SLI', driver: 'Sandi Kurnia',  status: 'Berjalan', type: 'cyan'  },
                                            { plate: 'DD 3456 SLI', driver: 'Hendra Putra',  status: 'Servis',   type: 'amber' },
                                        ].map(v => (
                                            <div
                                                key={v.plate}
                                                className="flex items-center justify-between rounded-xl px-3.5 py-2.5"
                                                style={{ background: 'rgba(255,255,255,0.05)' }}
                                            >
                                                <div>
                                                    <div className="text-white text-xs font-mono font-semibold">{v.plate}</div>
                                                    <div className="text-white/35 text-[11px] mt-0.5">{v.driver}</div>
                                                </div>
                                                <span
                                                    className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                                                    style={
                                                        v.type === 'cyan'
                                                            ? { background: `${CYAN}25`, color: CYAN }
                                                            : v.type === 'amber'
                                                                ? { background: 'rgba(251,191,36,0.2)', color: '#FCD34D' }
                                                                : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
                                                    }
                                                >
                                                    {v.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div
                                        className="pt-4 grid grid-cols-4 gap-2"
                                        style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        {[
                                            { n: '12', l: 'Trip Aktif' },
                                            { n: '8',  l: 'Standby'   },
                                            { n: '3',  l: 'Servis'    },
                                            { n: '24', l: 'Supir'     },
                                        ].map(s => (
                                            <div key={s.l} className="text-center">
                                                <div className="text-white text-base font-bold font-mono">{s.n}</div>
                                                <div className="text-white/30 text-[10px] mt-0.5">{s.l}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Trip selesai notification */}
                                <div
                                    className="mt-3 flex items-center gap-3 border rounded-xl px-4 py-3"
                                    style={{ background: `${CYAN}12`, borderColor: `${CYAN}35` }}
                                >
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: `${CYAN}25` }}
                                    >
                                        <HiCheckCircle className="text-sm" style={{ color: CYAN }} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold" style={{ color: CYAN }}>Trip Selesai</div>
                                        <div className="text-white/40 text-[11px] mt-0.5">
                                            DD 1234 SLI · Makassar → Kendari · 8j 20m
                                        </div>
                                    </div>
                                </div>

                                {/* Utilisasi bar */}
                                <div
                                    className="mt-3 border rounded-xl px-4 py-3.5"
                                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white/50 text-[11px]">Utilisasi Armada</span>
                                        <span className="text-xs font-semibold" style={{ color: CYAN }}>78%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                        <div className="h-full rounded-full" style={{ width: '78%', background: CYAN }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom wave */}
                <div className="absolute bottom-0 inset-x-0">
                    <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                        <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* ── STATS ── */}
            <section className="py-16 bg-white border-b border-slate-100">
                <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
                    {STATS.map(s => <StatItem key={s.label} {...s} />)}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="fitur" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div
                            className="inline-block text-xs font-bold tracking-widest uppercase mb-3"
                            style={{ color: CYAN }}
                        >
                            Fitur Platform
                        </div>
                        <h2
                            className="text-3xl lg:text-4xl font-bold text-slate-900"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                            Semua yang Dibutuhkan<br />Operasional Logistik Anda
                        </h2>
                        <p className="mt-4 text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
                            Dari armada hingga keuangan, SLI menyediakan modul terintegrasi yang siap digunakan tanpa konfigurasi rumit.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {FEATURES.map(({ Icon, color, bg, title, desc }) => (
                            <div
                                key={title}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                            >
                                <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center mb-5`}>
                                    <Icon size={22} />
                                </div>
                                <h3
                                    className="font-semibold text-slate-900 mb-2"
                                    style={{ fontFamily: 'Poppins, sans-serif' }}
                                >
                                    {title}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="cara-kerja" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div
                            className="inline-block text-xs font-bold tracking-widest uppercase mb-3"
                            style={{ color: CYAN }}
                        >
                            Alur Kerja
                        </div>
                        <h2
                            className="text-3xl lg:text-4xl font-bold text-slate-900"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                            Tiga Tim, Satu Sistem
                        </h2>
                        <p className="mt-4 text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
                            Setiap tim bekerja di modulnya masing-masing, namun data tersambung langsung ke seluruh sistem secara real-time.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {STEPS.map(({ num, role, accentBg, ring, title, desc, checks }) => (
                            <div
                                key={num}
                                className={`relative rounded-2xl border border-slate-100 bg-slate-50 p-7 ring-4 ${ring}`}
                            >
                                <div className="flex items-center gap-4 mb-5">
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                                        style={{ background: accentBg }}
                                    >
                                        <span
                                            className="text-white text-xl font-bold"
                                            style={{ fontFamily: 'Poppins, sans-serif' }}
                                        >
                                            {num}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                                            {role}
                                        </div>
                                        <h3
                                            className="font-semibold text-slate-900 text-base leading-snug"
                                            style={{ fontFamily: 'Poppins, sans-serif' }}
                                        >
                                            {title}
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-slate-500 text-sm leading-relaxed mb-5">{desc}</p>
                                <ul className="space-y-2.5">
                                    {checks.map(c => (
                                        <li key={c} className="flex items-center gap-2.5 text-sm text-slate-700">
                                            <HiCheckCircle className="shrink-0 text-base" style={{ color: CYAN }} />
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA BAND ── */}
            <section
                className="relative py-24 overflow-hidden"
                style={{ background: NAVY }}
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
                    className="absolute inset-x-0 top-0 h-56 blur-3xl pointer-events-none opacity-15"
                    style={{ background: CYAN }}
                />

                <div className="relative max-w-3xl mx-auto px-6 text-center">
                    <div
                        className="inline-flex items-center gap-2 border text-xs font-semibold px-3.5 py-1.5 rounded-full mb-7 tracking-wide"
                        style={{ background: `${CYAN}18`, borderColor: `${CYAN}40`, color: CYAN }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: CYAN }} />
                        Siap Digunakan Sekarang
                    </div>
                    <h2
                        className="text-3xl lg:text-4xl font-bold text-white mb-5"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                        Siap Mengoptimalkan<br />Operasional Logistik Anda?
                    </h2>
                    <p className="text-white/50 text-base mb-10 max-w-xl mx-auto leading-relaxed">
                        Masuk ke sistem SLI dan mulai kelola armada, supir, serta laporan keuangan Anda hari ini.
                    </p>
                    <Link
                        href="/sign-in"
                        className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl text-base transition-opacity hover:opacity-90 active:opacity-80"
                        style={{ background: CYAN }}
                    >
                        Masuk ke Sistem
                        <HiArrowRight className="text-lg" />
                    </Link>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer
                id="tentang"
                className="pt-16 pb-10"
                style={{ background: NAVY_DARK }}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-12 gap-10 mb-12">

                        {/* Brand col */}
                        <div className="md:col-span-5">
                            <div className="mb-4">
                                <Image
                                    src="/img/logo/logo-sli.png"
                                    alt="Sulita Logistik Indonesia"
                                    width={130}
                                    height={52}
                                    className="object-contain brightness-0 invert"
                                />
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs text-white/35">
                                Platform manajemen logistik terintegrasi — armada, supir, operasional, dan keuangan dalam satu sistem.
                            </p>
                        </div>

                        {/* Modul col */}
                        <div className="md:col-span-3">
                            <div
                                className="text-white text-sm font-semibold mb-5"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                                Modul
                            </div>
                            <ul className="space-y-3 text-sm text-white/40">
                                {['Manajemen Armada', 'HR & Supir', 'Monitoring Trip', 'Laporan & Faktur'].map(l => (
                                    <li key={l}>
                                        <a href="#fitur" className="hover:text-white transition-colors">{l}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Platform col */}
                        <div className="md:col-span-4">
                            <div
                                className="text-white text-sm font-semibold mb-5"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                            >
                                Platform
                            </div>
                            <ul className="space-y-3 text-sm text-white/40">
                                <li><Link href="/sign-in" className="hover:text-white transition-colors">Login ke Sistem</Link></li>
                                <li><a href="#fitur" className="hover:text-white transition-colors">Fitur</a></li>
                                <li><a href="#cara-kerja" className="hover:text-white transition-colors">Cara Kerja</a></li>
                            </ul>
                        </div>
                    </div>

                    <div
                        className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <p className="text-xs text-white/25">© 2026 Sulita Logistik Indonesia. Hak cipta dilindungi undang-undang.</p>
                        <p className="text-xs text-white/25">
                            Dibuat oleh{' '}
                            <span className="text-white/40 font-medium">Maritime Digital Solution</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
