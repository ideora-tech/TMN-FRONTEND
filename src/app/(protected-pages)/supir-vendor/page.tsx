'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { HiPlusCircle } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import ImportExcelButtons from '@/components/shared/ImportExcelButtons'
import SupirVendorTab from '../vendor/SupirVendorTab'

export default function SupirVendorPage() {
    const router = useRouter()
    const [refreshKey, setRefreshKey] = useState(0)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Supir Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola supir dari vendor yang bertugas dalam operasional</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ImportExcelButtons
                        templateUrl={API_ENDPOINTS.SUPIR_VENDOR_IMPORT_TEMPLATE}
                        importUrl={API_ENDPOINTS.SUPIR_VENDOR_IMPORT}
                        templateFilename="template-import-supir-vendor.xlsx"
                        entityLabel="supir vendor"
                        kunciLabel="Nama"
                        onImported={() => setRefreshKey(n => n + 1)}
                    />
                    <Button
                        variant="solid" size="sm"
                        icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.SUPIR_VENDOR_BARU)}
                    >
                        Tambah Supir Vendor
                    </Button>
                </div>
            </div>
            <SupirVendorTab key={refreshKey} />
        </div>
    )
}
