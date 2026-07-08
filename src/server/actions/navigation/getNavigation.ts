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
    children?: ApiMenuItem[]
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

export async function getNavigation(): Promise<NavigationTree[]> {
    const session = await auth()
    const token = (session as unknown as Record<string, unknown>)
        ?.accessToken as string | undefined

    if (!token) return navigationConfig

    try {
        const res = await fetch(`${BACKEND_URL}/api/v1/menu/tree`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
            cache: 'no-store',
        })

        if (!res.ok) return navigationConfig

        const json = await res.json()
        const items: ApiMenuItem[] = json.data ?? []

        if (items.length === 0) return navigationConfig

        return mapMenuTree(items)
    } catch {
        return navigationConfig
    }
}
