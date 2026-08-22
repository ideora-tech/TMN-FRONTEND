import type { Metadata } from 'next'
import type { IconType } from 'react-icons'
import { HiOutlineShieldCheck, HiOutlineClock, HiOutlineEye } from 'react-icons/hi2'
import HeroHalaman from '@/components/company-profile/HeroHalaman'
import { PROFIL, VISI, MISI, NILAI, LEGALITAS, WARNA, HERO_HALAMAN, type IkonNilaiKey } from '@/constants/companyProfile.data'

export const metadata: Metadata = {
    title: 'Tentang Kami — Sulita Logistik Indonesia',
    description: 'Profil, visi & misi, dan nilai PT Sulita Logistik Indonesia — perusahaan jasa transportasi dan logistik.',
}

const IKON_NILAI: Record<IkonNilaiKey, IconType> = {
    shield: HiOutlineShieldCheck,
    clock: HiOutlineClock,
    mata: HiOutlineEye,
}

export default function TentangPage() {
    return (
        <main>
            <HeroHalaman judul={HERO_HALAMAN.tentang.judul} subjudul={HERO_HALAMAN.tentang.subjudul} />

            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {PROFIL.map(p => (
                        <p key={p.slice(0, 40)} className="text-slate-600 leading-relaxed">{p}</p>
                    ))}
                </div>
            </section>

            <section className="py-20 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10">
                    <div className="bg-white rounded-2xl p-8 border border-slate-100">
                        <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>Visi</h2>
                        <p className="text-slate-600 leading-relaxed">{VISI}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-8 border border-slate-100">
                        <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>Misi</h2>
                        <ul className="space-y-3">
                            {MISI.map(m => (
                                <li key={m} className="flex gap-3 text-slate-600 leading-relaxed">
                                    <span className="mt-2 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: WARNA.cyan }} />
                                    {m}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-bold text-center" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>Nilai Kami</h2>
                    <div className="grid md:grid-cols-3 gap-6 mt-12">
                        {NILAI.map(n => {
                            const Icon = IKON_NILAI[n.ikon] ?? HiOutlineShieldCheck
                            return (
                                <div key={n.judul} className="rounded-2xl p-8 border border-slate-100 text-center">
                                    <Icon className="text-4xl mx-auto mb-4" style={{ color: WARNA.cyan }} />
                                    <div className="font-semibold text-xl mb-2" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>{n.judul}</div>
                                    <p className="text-sm text-slate-500 leading-relaxed">{n.deskripsi}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            <section className="py-16 px-6 bg-slate-50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>Legalitas Perusahaan</h2>
                    <ul className="space-y-2 text-slate-600">
                        {LEGALITAS.map(l => <li key={l}>{l}</li>)}
                    </ul>
                </div>
            </section>
        </main>
    )
}
