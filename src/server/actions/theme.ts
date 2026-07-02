'use server'

import { cookies } from 'next/headers'
import { themeConfig } from '@/configs/theme.config'
import { COOKIES_KEY } from '@/constants/app.constant'
import type { Theme } from '@/@types/theme'

export async function getTheme(): Promise<Theme> {
    const cookieStore = await cookies()
    const storedTheme = cookieStore.get(COOKIES_KEY.THEME)?.value

    if (storedTheme) {
        const stored = JSON.parse(storedTheme).state as Theme
        return {
            ...stored,
            themeSchema: stored.themeSchema || themeConfig.themeSchema,
        }
    }

    return themeConfig
}

export async function setTheme(theme: string) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIES_KEY.THEME, theme)
}
