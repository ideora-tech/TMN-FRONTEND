'use client'

import { useCallback, useEffect, useState } from 'react'
import { dokumenArmadaService } from '@/services/dokumenArmada.service'
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

export default function useBadgeMenu(routeKey: string): BadgeMenu {
    const [badge, setBadge] = useState<BadgeMenu>({})

    const muat = useCallback(() => {
        dokumenArmadaService.jumlahSegeraHabis()
            .then(res => setBadge({
                '/dokumen-armada': {
                    jumlah: res.jumlah,
                    keterangan: [
                        res.habis > 0 ? `${res.habis} dokumen armada sudah habis masa berlaku` : '',
                        res.segera > 0 ? `${res.segera} dokumen armada habis dalam ${res.hari} hari` : '',
                    ].filter(Boolean).join(' · '),
                },
            }))
            .catch(() => setBadge({}))
    }, [])

    useEffect(() => { muat() }, [muat, routeKey])

    useEffect(() => {
        const timer = setInterval(muat, INTERVAL_MUAT_ULANG_MS)
        return () => clearInterval(timer)
    }, [muat])

    return badge
}
