'use client'
import PenugasanVendorTab from '../vendor/PenugasanVendorTab'

export default function PenugasanVendorPage() {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Penugasan Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">Kelola penugasan armada dan supir vendor ke project</p>
            </div>
            <PenugasanVendorTab />
        </div>
    )
}
