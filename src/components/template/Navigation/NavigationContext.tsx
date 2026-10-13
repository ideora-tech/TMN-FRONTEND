'use client'

import { createContext } from 'react'
import type { NavigationTree } from '@/@types/navigation'

type Navigation = {
    navigationTree: NavigationTree[]
    pathTersembunyi: string[]
}

const NavigationContext = createContext<Navigation>({
    navigationTree: [],
    pathTersembunyi: [],
})

export default NavigationContext
