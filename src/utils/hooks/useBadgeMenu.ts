'use client'

import { useCallback, useEffect, useState } from 'react'
import { dokumenArmadaService } from '@/services/dokumenArmada.service'
import { permintaanVendorService } from '@/services/permintaan-vendor.service'
import type { NavigationTree } from '@/@types/navigation'

export type BadgeMenu = Record<string, { jumlah: number; keterangan: string }>

const INTERVAL_MUAT_ULANG_MS = 5 * 60 * 1000

export function jumlahBadge(nav: NavigationTree, badge: BadgeMenu): number {
    if (nav.subMenu?.length) {
        return nav.subMenu.reduce((total, sub) => total + jumlahBadge(sub, badge), 0)
    }
    return badge[nav.path]?.jumlah ?? 0
}

export function keteranganBadge(nav: NavigationTree, badge: BadgeMenu): string {
    if (nav.subMenu?.length) {
        return nav.subMenu.map(sub => keteranganBadge(sub, badge)).filter(Boolean).join(' · ')
    }
    return badge[nav.path]?.jumlah ? badge[nav.path].keterangan : ''
}

const SUMBER_BADGE: Record<string, () => Promise<{ jumlah: number; keterangan: string }>> = {
    '/dokumen-armada': () => dokumenArmadaService.jumlahSegeraHabis().then(res => ({
        jumlah: res.jumlah,
        keterangan: [
            res.habis > 0 ? `${res.habis} dokumen armada sudah habis masa berlaku` : '',
            res.segera > 0 ? `${res.segera} dokumen armada habis dalam ${res.hari} hari` : '',
        ].filter(Boolean).join(' · '),
    })),
    '/permintaan-vendor': () => permintaanVendorService.jumlahAktif().then(res => ({
        jumlah: res.jumlah,
        keterangan: [
            res.disetujui > 0 ? `${res.disetujui} permintaan vendor dari Sales menunggu diproses` : '',
            res.diproses > 0 ? `${res.diproses} permintaan vendor sedang dicarikan unit` : '',
        ].filter(Boolean).join(' · '),
    })),
}

export default function useBadgeMenu(routeKey: string): BadgeMenu {
    const [badge, setBadge] = useState<BadgeMenu>({})

    const muat = useCallback(() => {
        Object.entries(SUMBER_BADGE).forEach(([path, ambil]) => {
            ambil()
                .then(isi => setBadge(sebelum => ({ ...sebelum, [path]: isi })))
                .catch(() => setBadge(sebelum => {
                    const sisa = { ...sebelum }
                    delete sisa[path]
                    return sisa
                }))
        })
    }, [])

    useEffect(() => { muat() }, [muat, routeKey])

    useEffect(() => {
        const timer = setInterval(muat, INTERVAL_MUAT_ULANG_MS)
        return () => clearInterval(timer)
    }, [muat])

    return badge
}
