'use client'
import KontrakVendorTab from '../vendor/KontrakVendorTab'

export default function KontrakVendorPage() {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Kontrak Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">Kelola kontrak kerja sama dengan vendor</p>
            </div>
            <KontrakVendorTab />
        </div>
    )
}
