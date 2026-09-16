import type { Metadata } from 'next'
import { HiOutlineMapPin, HiOutlineEnvelope, HiOutlineClock } from 'react-icons/hi2'
import HeroHalaman from '@/components/company-profile/HeroHalaman'
import { KONTAK, WARNA, HERO_HALAMAN } from '@/constants/companyProfile.data'

export const metadata: Metadata = {
    title: 'Kontak — Sulita Logistik Indonesia',
    description: 'Hubungi PT Sulita Logistik Indonesia — email, alamat kantor, dan jam operasional.',
}

export default function KontakPage() {
    const info: { Icon: typeof HiOutlineMapPin; label: string; nilai: string; href?: string }[] = [
        { Icon: HiOutlineMapPin, label: 'Alamat', nilai: KONTAK.alamat },
        { Icon: HiOutlineEnvelope, label: 'Email', nilai: KONTAK.email, href: `mailto:${KONTAK.email}` },
        { Icon: HiOutlineClock, label: 'Jam Operasional', nilai: KONTAK.jamOperasional },
    ]

    return (
        <main>
            <HeroHalaman judul={HERO_HALAMAN.kontak.judul} subjudul={HERO_HALAMAN.kontak.subjudul} />

            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
                    <div>
                        <div className="space-y-6">
                            {info.map(({ Icon, label, nilai, href }) => (
                                <div key={label} className="flex gap-4">
                                    <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: WARNA.biruMuda }}>
                                        <Icon className="text-xl" style={{ color: WARNA.navy }} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-400">{label}</div>
                                        {href ? (
                                            <a href={href} className="text-slate-700 hover:underline">{nilai}</a>
                                        ) : (
                                            <div className="text-slate-700">{nilai}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-100 min-h-80">
                        <iframe
                            src={KONTAK.mapsEmbedUrl}
                            title="Lokasi PT Sulita Logistik Indonesia"
                            className="w-full h-full min-h-80"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                </div>
            </section>
        </main>
    )
}
