import Link from 'next/link'
import Image from 'next/image'
import { NAV_LINKS, KONTAK, WARNA, BRAND, FOOTER_DESKRIPSI } from '@/constants/companyProfile.data'

export default function FooterPublik() {
    return (
        <footer className="pt-16 pb-10" style={{ background: WARNA.navyDark }}>
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-12 gap-10 mb-12">
                    <div className="md:col-span-5">
                        <Image
                            src="/img/logo/logo-sli.png"
                            alt={`${BRAND.nama} ${BRAND.tagline}`}
                            width={130}
                            height={52}
                            className="object-contain brightness-0 invert mb-4"
                        />
                        <p className="text-sm leading-relaxed max-w-xs text-white/35">
                            {FOOTER_DESKRIPSI}
                        </p>
                    </div>

                    <div className="md:col-span-3">
                        <div className="text-white text-sm font-semibold mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Halaman
                        </div>
                        <ul className="space-y-3 text-sm text-white/40">
                            {NAV_LINKS.map(l => (
                                <li key={l.href}>
                                    <Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link>
                                </li>
                            ))}
                            <li>
                                <Link href="/sign-in" className="hover:text-white transition-colors">Login Sistem</Link>
                            </li>
                        </ul>
                    </div>

                    <div className="md:col-span-4">
                        <div className="text-white text-sm font-semibold mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            Kontak
                        </div>
                        <ul className="space-y-3 text-sm text-white/40">
                            <li>{KONTAK.alamat}</li>
                            <li>Telp: {KONTAK.telepon}</li>
                            <li>Email: {KONTAK.email}</li>
                            <li>{KONTAK.jamOperasional}</li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xs text-white/25">© {new Date().getFullYear()} PT Sulita Logistik Indonesia. Hak cipta dilindungi undang-undang.</p>
                    <p className="text-xs text-white/25">
                        Dibuat oleh <span className="text-white/40 font-medium">Maritime Digital Solution</span>
                    </p>
                </div>
            </div>
        </footer>
    )
}
