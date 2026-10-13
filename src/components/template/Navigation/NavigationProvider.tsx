'use client'

import NavigationContext from './NavigationContext'

import type { NavigationTree } from '@/@types/navigation'
import type { CommonProps } from '@/@types/common'

interface NavigationProviderProps extends CommonProps {
    navigationTree: NavigationTree[]
    pathTersembunyi?: string[]
}

const NavigationProvider = ({
    navigationTree,
    pathTersembunyi = [],
    children,
}: NavigationProviderProps) => {
    return (
        <NavigationContext.Provider value={{ navigationTree, pathTersembunyi }}>
            {children}
        </NavigationContext.Provider>
    )
}

export default NavigationProvider
