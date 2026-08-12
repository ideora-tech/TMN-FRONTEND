'use client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { HiPlusCircle } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import ArmadaVendorTab from '../vendor/ArmadaVendorTab'

export default function ArmadaVendorPage() {
    const router = useRouter()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Armada Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola armada milik vendor yang dipakai dalam operasional</p>
                </div>
                <Button
                    variant="solid" size="sm"
                    icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.ARMADA_VENDOR_BARU)}
                >
                    Tambah Armada Vendor
                </Button>
            </div>
            <ArmadaVendorTab />
        </div>
    )
}
