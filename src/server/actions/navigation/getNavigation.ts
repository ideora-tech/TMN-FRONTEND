import { auth } from '@/auth'
import navigationConfig from '@/configs/navigation.config'
import {
    NAV_ITEM_TYPE_ITEM,
    NAV_ITEM_TYPE_COLLAPSE,
    NAV_ITEM_TYPE_TITLE,
} from '@/constants/navigation.constant'
import type { NavigationTree } from '@/@types/navigation'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4019'

type ApiMenuItem = {
    id_menu: string
    nama_menu: string
    path: string | null
    icon: string | null
    urutan: number
    tampil_sidebar?: boolean
    children?: ApiMenuItem[]
}

export type NavigasiPengguna = {
    navigationTree: NavigationTree[]
    pathTersembunyi: string[]
}

function kumpulkanPath(item: ApiMenuItem, hasil: string[]) {
    if (item.path) hasil.push(item.path)
    item.children?.forEach(anak => kumpulkanPath(anak, hasil))
}

function saringItem(item: ApiMenuItem, tersembunyi: string[]): ApiMenuItem | null {
    if (item.tampil_sidebar === false) {
        kumpulkanPath(item, tersembunyi)
        return null
    }

    const asalPunyaAnak = (item.children?.length ?? 0) > 0
    const children = item.children
        ? item.children.map(anak => saringItem(anak, tersembunyi)).filter((anak): anak is ApiMenuItem => anak !== null)
        : item.children

    if (!item.path && asalPunyaAnak && (children?.length ?? 0) === 0) return null

    return { ...item, children }
}

function saringMenu(items: ApiMenuItem[], tersembunyi: string[]): ApiMenuItem[] {
    return items.map(item => saringItem(item, tersembunyi)).filter((item): item is ApiMenuItem => item !== null)
}

function mapMenuTree(items: ApiMenuItem[]): NavigationTree[] {
    return items.map((item) => {
        const hasPath     = !!item.path
        const hasChildren = !!item.children?.length
        const key = hasPath
            ? item.path!.replace(/^\//, '')
            : `nav.${item.nama_menu.toLowerCase().replace(/\s+/g, '_')}`

        const type = (
            hasPath     ? NAV_ITEM_TYPE_ITEM :
            hasChildren ? NAV_ITEM_TYPE_COLLAPSE :
                          NAV_ITEM_TYPE_TITLE
        ) as NavigationTree['type']

        return {
            key,
            path:         item.path ?? '',
            title:        item.nama_menu,
            translateKey: `nav.${key}`,
            icon:         item.icon ?? '',
            type,
            authority:    [],
            subMenu:      hasChildren ? mapMenuTree(item.children!) : [],
        }
    })
}

export async function getNavigation(): Promise<NavigasiPengguna> {
    const cadangan: NavigasiPengguna = { navigationTree: navigationConfig, pathTersembunyi: [] }
    const session = await auth()
    const token = (session as unknown as Record<string, unknown>)
        ?.accessToken as string | undefined

    if (!token) return cadangan

    try {
        const res = await fetch(`${BACKEND_URL}/api/menu/tree`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
            cache: 'no-store',
        })

        if (!res.ok) return cadangan

        const json = await res.json()

        if (!Array.isArray(json?.data)) return cadangan

        const items: ApiMenuItem[] = json.data

        if (items.length === 0) return { navigationTree: [], pathTersembunyi: [] }

        const pathTersembunyi: string[] = []
        const navigationTree = mapMenuTree(saringMenu(items, pathTersembunyi))

        return { navigationTree, pathTersembunyi }
    } catch {
        return cadangan
    }
}
