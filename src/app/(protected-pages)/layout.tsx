import React from 'react'
import PostLoginLayout from '@/components/layouts/PostLoginLayout'
import { PratinjauBerkasProvider } from '@/components/shared/PratinjauBerkasProvider'
import { ReactNode } from 'react'

const Layout = async ({ children }: { children: ReactNode }) => {
    return (
        <PostLoginLayout>
            <PratinjauBerkasProvider>{children}</PratinjauBerkasProvider>
        </PostLoginLayout>
    )
}

export default Layout
