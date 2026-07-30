'use client'
import EvaluasiVendorTab from '../vendor/EvaluasiVendorTab'

export default function EvaluasiVendorPage() {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Evaluasi Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">Rekap penilaian kinerja vendor dari hasil evaluasi trip</p>
            </div>
            <EvaluasiVendorTab />
        </div>
    )
}
