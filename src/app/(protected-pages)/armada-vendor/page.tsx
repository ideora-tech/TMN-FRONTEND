'use client'
import ArmadaVendorTab from '../vendor/ArmadaVendorTab'

export default function ArmadaVendorPage() {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Armada Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">Kelola armada milik vendor yang dipakai dalam operasional</p>
            </div>
            <ArmadaVendorTab />
        </div>
    )
}
