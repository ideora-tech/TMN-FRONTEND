'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spinner } from '@/components/ui'
import { ROUTES } from '@/constants/route.constant'

export default function PenugasanVendorRedirectPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', 'penugasan')
        router.replace(`${ROUTES.VENDOR}?${params.toString()}`)
    }, [router, searchParams])

    return (
        <div className="flex items-center justify-center py-24">
            <Spinner size={40} />
        </div>
    )
}
