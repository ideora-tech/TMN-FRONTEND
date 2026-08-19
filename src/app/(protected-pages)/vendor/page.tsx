'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Spinner } from '@/components/ui'
import { HiPlusCircle } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import ImportExcelButtons from '@/components/shared/ImportExcelButtons'
import VendorTab from './VendorTab'

const TAB_ROUTE_MAP: Record<string, string> = {
    kontrak: ROUTES.KONTRAK_VENDOR,
    armada: ROUTES.ARMADA_VENDOR,
    supir: ROUTES.SUPIR_VENDOR,
    penugasan: ROUTES.PENUGASAN_VENDOR,
    evaluasi: ROUTES.EVALUASI_VENDOR,
}

export default function VendorPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')
    const targetRoute = tabParam ? TAB_ROUTE_MAP[tabParam] : undefined
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        if (!targetRoute) return
        const params = new URLSearchParams(searchParams.toString())
        params.delete('tab')
        const qs = params.toString()
        router.replace(qs ? `${targetRoute}?${qs}` : targetRoute)
    }, [targetRoute, router, searchParams])

    if (targetRoute) {
        return (
            <div className="flex items-center justify-center py-24">
                <Spinner size={40} />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Data Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola data master vendor mitra transportasi</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ImportExcelButtons
                        templateUrl={API_ENDPOINTS.VENDOR_IMPORT_TEMPLATE}
                        importUrl={API_ENDPOINTS.VENDOR_IMPORT}
                        templateFilename="template-import-vendor.xlsx"
                        entityLabel="vendor"
                        kunciLabel="Kode"
                        onImported={() => setRefreshKey(n => n + 1)}
                    />
                    <Button
                        variant="solid" size="sm"
                        icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.VENDOR_BARU)}
                    >
                        Tambah Vendor
                    </Button>
                </div>
            </div>
            <VendorTab key={refreshKey} />
        </div>
    )
}
