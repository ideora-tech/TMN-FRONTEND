import type { ReactNode } from 'react'
import NavbarPublik from '@/components/company-profile/NavbarPublik'
import FooterPublik from '@/components/company-profile/FooterPublik'

export default function PublicPagesLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
            <NavbarPublik />
            {children}
            <FooterPublik />
        </div>
    )
}
