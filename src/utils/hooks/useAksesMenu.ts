'use client'
import { useCallback, useContext, useMemo } from 'react'
import NavigationContext from '@/components/template/Navigation/NavigationContext'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import type { NavigationTree } from '@/@types/navigation'

const kumpulkanPath = (pohon: NavigationTree[], peran: string[], hasil: Set<string>) => {
    pohon.forEach(item => {
        const dibatasi = (item.authority ?? []).map(a => a.toLowerCase())
        if (dibatasi.length > 0 && !dibatasi.some(a => peran.includes(a))) return
        if (item.path) hasil.add(item.path)
        if (item.subMenu?.length) kumpulkanPath(item.subMenu, peran, hasil)
    })
}

export default function useAksesMenu() {
    const { navigationTree } = useContext(NavigationContext)
    const { session } = useCurrentSession()
    const peran = useMemo(
        () => ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase()),
        [session],
    )
    const daftarPath = useMemo(() => {
        const hasil = new Set<string>()
        kumpulkanPath(navigationTree, peran, hasil)
        return hasil
    }, [navigationTree, peran])

    return useCallback((...paths: string[]) => paths.some(path => daftarPath.has(path)), [daftarPath])
}
