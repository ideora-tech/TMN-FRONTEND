'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiChevronRight, HiHome } from 'react-icons/hi'

const SEGMENT_LABELS: Record<string, string> = {
    home:             'Dashboard',
    klien:            'Klien',
    project:          'Proyek',
    armada:           'Armada',
    supir:            'Supir',
    vendor:           'Vendor',
    'kontrak-vendor': 'Kontrak Vendor',
    trip:             'Trip',
    penugasan:        'Penugasan',
    laporan:          'Laporan',
    faktur:           'Faktur',
    rekonsiliasi:     'Rekonsiliasi',
    penawaran:        'Penawaran',
    pengguna:         'Pengguna',
    peran:            'Peran',
    'jenis-kendaraan': 'Jenis Kendaraan',
    'lokasi-kantor':  'Lokasi Kantor',
    departemen:       'Departemen',
    jabatan:          'Jabatan',
    karyawan:         'Karyawan',
    perusahaan:       'Perusahaan',
    'menu-admin':     'Menu Admin',
    'log-error':      'Log Error',
    rute:             'Rute',
    baru:             'Tambah Baru',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function labelFor(segment: string): string {
    if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment]
    if (UUID_RE.test(segment)) return 'Detail'
    return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export default function AppBreadcrumb() {
    const pathname = usePathname()
    const segments = pathname.split('/').filter(Boolean)

    // Only render on depth ≥ 2 (e.g. /armada/[id] but not /armada)
    if (segments.length < 2) return null

    const crumbs: { label: string; href: string }[] = [
        { label: 'Home', href: '/home' },
    ]
    let accumulated = ''
    for (const seg of segments) {
        accumulated += `/${seg}`
        crumbs.push({ label: labelFor(seg), href: accumulated })
    }

    return (
        <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-3 select-none">
            <Link href="/home" className="inline-flex items-center hover:text-primary transition-colors">
                <HiHome className="text-sm" />
            </Link>
            {crumbs.slice(1).map((crumb, idx) => {
                const isLast = idx === crumbs.length - 2
                return (
                    <span key={crumb.href} className="inline-flex items-center gap-1">
                        <HiChevronRight className="text-gray-300 dark:text-gray-600" />
                        {isLast ? (
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                {crumb.label}
                            </span>
                        ) : (
                            <Link href={crumb.href} className="hover:text-primary transition-colors">
                                {crumb.label}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
