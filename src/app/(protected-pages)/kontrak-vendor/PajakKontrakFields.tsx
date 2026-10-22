'use client'
import { FormItem, Input } from '@/components/ui'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

type Props = {
    nilaiKontrak: number
    ppn: string
    pph: string
    onPpnChange: (nilai: string) => void
    onPphChange: (nilai: string) => void
}

export const bersihkanPersen = (teks: string) => {
    const bersih = teks.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+$/, '$1')
    return bersih !== '' && Number(bersih) > 100 ? '100' : bersih
}

export const persenAtauNull = (teks: string | null | undefined) => {
    if (teks === null || teks === undefined || teks === '') return null
    const angka = Number(teks)
    return Number.isFinite(angka) ? angka : null
}

export const labelPersen = (nilai: number) => nilai.toLocaleString('id-ID', { maximumFractionDigits: 2 })

const nominal = (nilai: number, persen: string) => {
    const angka = Number(persen)
    return persen === '' || Number.isNaN(angka) ? 0 : Math.round(nilai * angka / 100)
}

export default function PajakKontrakFields({ nilaiKontrak, ppn, pph, onPpnChange, onPphChange }: Props) {
    const nominalPpn = nominal(nilaiKontrak, ppn)
    const nominalPph = nominal(nilaiKontrak, pph)
    const total = Math.max(nilaiKontrak + nominalPpn - nominalPph, 0)

    return (
        <>
            <FormItem label="PPN" extra={<span className="text-xs text-gray-400">Isi persentase, nominal dihitung dari nilai kontrak</span>}>
                <div className="flex items-center gap-2">
                    <Input className="w-24" suffix="%" placeholder="0" value={ppn}
                        onChange={e => onPpnChange(bersihkanPersen(e.target.value))} />
                    <Input className="flex-1" prefix="Rp" placeholder="0" readOnly
                        value={nominalPpn ? formatNum(nominalPpn) : ''} />
                </div>
            </FormItem>
            <FormItem label="PPh" extra={<span className="text-xs text-gray-400">Isi persentase, nominal dihitung dari nilai kontrak</span>}>
                <div className="flex items-center gap-2">
                    <Input className="w-24" suffix="%" placeholder="0" value={pph}
                        onChange={e => onPphChange(bersihkanPersen(e.target.value))} />
                    <Input className="flex-1" prefix="Rp" placeholder="0" readOnly
                        value={nominalPph ? formatNum(nominalPph) : ''} />
                </div>
            </FormItem>
            <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-3 mb-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total (Nilai Kontrak + PPN - PPh)</span>
                <span className="font-bold text-lg tabular-nums">{formatRupiah(total)}</span>
            </div>
        </>
    )
}
