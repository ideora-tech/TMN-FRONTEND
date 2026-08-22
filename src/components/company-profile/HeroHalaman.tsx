import { WARNA } from '@/constants/companyProfile.data'

export default function HeroHalaman({ judul, subjudul }: { judul: string; subjudul: string }) {
    return (
        <section className="pt-36 pb-16 px-6" style={{ background: `linear-gradient(135deg, ${WARNA.navyDark}, ${WARNA.navy})` }}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {judul}
                </h1>
                <p className="text-white/70 mt-4 max-w-2xl leading-relaxed">{subjudul}</p>
            </div>
        </section>
    )
}
