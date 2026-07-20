import { ROUTES } from '@/constants/route.constant'

export type UserRole = 'sales' | 'dispatcher' | 'keuangan' | 'manager'

export const NAV_ITEMS: Record<UserRole, { label: string; href: string }[]> = {
    sales: [
        { label: 'Dashboard', href: ROUTES.HOME },
        { label: 'Project', href: ROUTES.PROYEK },
    ],
    dispatcher: [
        { label: 'Dashboard', href: ROUTES.HOME },
        { label: 'Armada', href: ROUTES.ARMADA },
        { label: 'Supir', href: ROUTES.SUPIR },
        { label: 'Vendor', href: ROUTES.VENDOR },
        { label: 'Trip', href: ROUTES.TRIP },
        { label: 'Laporan', href: ROUTES.LAPORAN },
    ],
    keuangan: [
        { label: 'Dashboard', href: ROUTES.HOME },
        { label: 'Laporan', href: ROUTES.LAPORAN },
        { label: 'Faktur', href: ROUTES.FAKTUR },
        { label: 'Rekonsiliasi', href: ROUTES.REKONSILIASI },
    ],
    manager: [
        { label: 'Dashboard', href: ROUTES.HOME },
        { label: 'Project', href: ROUTES.PROYEK },
        { label: 'Armada', href: ROUTES.ARMADA },
        { label: 'Supir', href: ROUTES.SUPIR },
        { label: 'Vendor', href: ROUTES.VENDOR },
        { label: 'Trip', href: ROUTES.TRIP },
        { label: 'Laporan', href: ROUTES.LAPORAN },
        { label: 'Faktur', href: ROUTES.FAKTUR },
        { label: 'Rekonsiliasi', href: ROUTES.REKONSILIASI },
    ],
}
