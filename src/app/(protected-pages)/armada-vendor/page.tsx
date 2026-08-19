'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { HiPlusCircle } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import ImportExcelButtons from '@/components/shared/ImportExcelButtons'
import ArmadaVendorTab from '../vendor/ArmadaVendorTab'

export default function ArmadaVendorPage() {
    const router = useRouter()
    const [refreshKey, setRefreshKey] = useState(0)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Armada Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola armada milik vendor yang dipakai dalam operasional</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ImportExcelButtons
                        templateUrl={API_ENDPOINTS.ARMADA_VENDOR_IMPORT_TEMPLATE}
                        importUrl={API_ENDPOINTS.ARMADA_VENDOR_IMPORT}
                        templateFilename="template-import-armada-vendor.xlsx"
                        entityLabel="armada vendor"
                        kunciLabel="Nopol"
                        onImported={() => setRefreshKey(n => n + 1)}
                    />
                    <Button
                        variant="solid" size="sm"
                        icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.ARMADA_VENDOR_BARU)}
                    >
                        Tambah Armada Vendor
                    </Button>
                </div>
            </div>
            <ArmadaVendorTab key={refreshKey} />
        </div>
    )
}
