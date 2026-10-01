'use client'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui'
import { ketersediaanVendorService, RingkasanKetersediaanJenis } from '@/services/ketersediaanVendor.service'

export type PetaKetersediaan = Record<string, RingkasanKetersediaanJenis>

export function useRingkasanKetersediaan() {
    const [ringkasan, setRingkasan] = useState<PetaKetersediaan | null>(null)

    useEffect(() => {
        ketersediaanVendorService.ringkasanPerJenis()
            .then(rows => setRingkasan(Object.fromEntries(rows.map(r => [r.id_jenis_kendaraan, r]))))
            .catch(() => setRingkasan(null))
    }, [])

    return ringkasan
}

export function PetunjukKetersediaan({ ringkasan, idJenis }: { ringkasan: PetaKetersediaan | null; idJenis: string }) {
    if (!ringkasan || !idJenis) return null
    const data = ringkasan[idJenis] ?? { aset_total: 0, aset_tersedia: 0, vendor_total: 0, vendor_tersedia: 0 }

    return (
        <p className="text-xs text-gray-400 mt-1">
            Tersedia hari ini: <span className="font-semibold text-emerald-600">{data.aset_tersedia}</span>/{data.aset_total} aset
            {' · '}<span className="font-semibold text-orange-600">{data.vendor_tersedia}</span>/{data.vendor_total} vendor
        </p>
    )
}

export function InputJumlahUnit({ value, onChange }: { value: string; onChange: (nilai: string) => void }) {
    return (
        <Input inputMode="numeric" maxLength={4} placeholder="0"
            value={value}
            onChange={e => onChange(e.target.value.replace(/\D/g, ''))} />
    )
}

export const labelSumberUnit = (unitAset?: number | null, unitVendor?: number | null) => {
    const bagian = [
        unitAset ? `${unitAset} Aset` : null,
        unitVendor ? `${unitVendor} Vendor` : null,
    ].filter(Boolean)
    return bagian.length > 0 ? bagian.join(' · ') : '—'
}

export const angkaAtauNull = (teks: string) => (teks === '' ? null : Number(teks))
