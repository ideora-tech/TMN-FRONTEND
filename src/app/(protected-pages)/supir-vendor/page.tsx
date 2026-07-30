'use client'
import SupirVendorTab from '../vendor/SupirVendorTab'

export default function SupirVendorPage() {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Supir Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">Kelola supir dari vendor yang bertugas dalam operasional</p>
            </div>
            <SupirVendorTab />
        </div>
    )
}
