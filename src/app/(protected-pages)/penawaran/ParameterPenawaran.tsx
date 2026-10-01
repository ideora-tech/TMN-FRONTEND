'use client'
import { FormItem, Input } from '@/components/ui'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import {
    PARAMETER_PENAWARAN,
    IsianParameterPenawaran,
    KolomParameterPenawaran,
    ParameterPenawaranTerisi,
} from '@/constants/parameterPenawaran.constant'

export function IsianParameterPenawaranFields({ nilai, onChange }: {
    nilai: IsianParameterPenawaran
    onChange: (kolom: KolomParameterPenawaran, nilai: string) => void
}) {
    return (
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
            <p className="font-semibold text-gray-800 dark:text-gray-100">Parameter Penawaran</p>
            <p className="text-xs text-gray-400 mt-0.5">Biaya tambahan yang berlaku untuk seluruh rute di penawaran ini — kosongkan bila tidak berlaku</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 mt-3">
                {PARAMETER_PENAWARAN.map(p => (
                    <FormItem key={p.kolom} label={p.label} extra={<span className="text-xs text-gray-400 ml-1">({p.satuan})</span>}>
                        <Input
                            prefix="Rp"
                            placeholder="0"
                            value={nilai[p.kolom] !== '' ? formatNum(Number(nilai[p.kolom])) : ''}
                            onChange={e => onChange(p.kolom, e.target.value.replace(/\D/g, ''))}
                        />
                    </FormItem>
                ))}
            </div>
        </div>
    )
}

export function TampilanParameterPenawaran({ data, kosong }: { data: ParameterPenawaranTerisi[]; kosong?: string }) {
    if (data.length === 0) {
        return kosong ? <p className="text-sm text-gray-400">{kosong}</p> : null
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.map(p => (
                <div key={p.kolom}>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{p.label}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatRupiah(p.nilai)}</p>
                    <p className="text-xs text-gray-400">{p.satuan}</p>
                </div>
            ))}
        </div>
    )
}
