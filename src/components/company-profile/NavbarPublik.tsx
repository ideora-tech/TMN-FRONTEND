'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { HiBars3, HiXMark } from 'react-icons/hi2'
import { NAV_LINKS, WARNA, BRAND } from '@/constants/companyProfile.data'

export default function NavbarPublik() {
    const pathname = usePathname()
    const [scrolled, setScrolled] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 24)
        handler()
        window.addEventListener('scroll', handler, { passive: true })
        return () => window.removeEventListener('scroll', handler)
    }, [])

    return (
        <nav
            className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
                scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100' : 'bg-transparent'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 h-28 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                    <Image
                        src="/img/logo/logo-sli.png"
                        alt={`${BRAND.nama} ${BRAND.tagline}`}
                        width={120}
                        height={120}
                        priority
                        className={`h-24 w-auto object-contain transition-all duration-300 ${scrolled ? '' : 'brightness-0 invert'}`}
                    />
                    <div>
                        <div
                            className={`font-bold text-2xl leading-tight transition-colors ${scrolled ? '' : 'text-white'}`}
                            style={{ fontFamily: 'Poppins, sans-serif', color: scrolled ? WARNA.navy : undefined }}
                        >
                            {BRAND.nama}
                        </div>
                        <div className="text-base font-semibold leading-tight tracking-wide" style={{ color: WARNA.cyan }}>
                            {BRAND.tagline}
                        </div>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    {NAV_LINKS.map(l => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`text-sm font-medium transition-colors ${
                                scrolled
                                    ? pathname === l.href
                                        ? 'text-[#1B2D6E] font-semibold'
                                        : 'text-slate-600 hover:text-[#1B2D6E]'
                                    : pathname === l.href
                                        ? 'text-white'
                                        : 'text-white/80 hover:text-white'
                            }`}
                        >
                            {l.label}
                        </Link>
                    ))}
                    <Link
                        href="/sign-in"
                        className={`text-sm font-medium transition-colors ${
                            scrolled ? 'text-slate-600 hover:text-[#1B2D6E]' : 'text-white/80 hover:text-white'
                        }`}
                    >
                        Masuk
                    </Link>
                </div>

                <button
                    type="button"
                    aria-label="Buka menu"
                    className={`md:hidden text-2xl transition-colors ${scrolled ? 'text-slate-700' : 'text-white'}`}
                    onClick={() => setMenuOpen(o => !o)}
                >
                    {menuOpen ? <HiXMark /> : <HiBars3 />}
                </button>
            </div>

            {menuOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
                    <div className="px-6 py-5 flex flex-col gap-4">
                        {NAV_LINKS.map(l => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="text-sm font-medium"
                                style={{ color: WARNA.navy }}
                                onClick={() => setMenuOpen(false)}
                            >
                                {l.label}
                            </Link>
                        ))}
                        <Link
                            href="/sign-in"
                            className="text-sm font-medium"
                            style={{ color: WARNA.navy }}
                            onClick={() => setMenuOpen(false)}
                        >
                            Masuk
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    )
}
