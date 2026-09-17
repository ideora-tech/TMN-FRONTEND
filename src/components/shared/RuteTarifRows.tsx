'use client'
import { HiOutlineTrash } from 'react-icons/hi'
import { formatRupiah } from '@/utils/formatNumber'
import RuteTarifFields, { RuteTarifState, RuteOption } from '@/components/shared/RuteTarifFields'
import { Rute } from '@/services/rute.service'

type Option = { value: string; label: string }

type Props = {
    rows: RuteTarifState[]
    onChangeRow: (index: number, next: RuteTarifState) => void
    onHapusRow: (index: number) => void
    ruteOptions: RuteOption[]
    jenisOptions: Option[]
    onRuteCreated?: (rute: Rute) => void
}

export function subtotalRuteTarif(row: RuteTarifState): number {
    return (Number(row.harga_penawaran) || 0) * (Number(row.estimasi_ritase) || 1)
}

export default function RuteTarifRows({ rows, onChangeRow, onHapusRow, ruteOptions, jenisOptions, onRuteCreated }: Props) {
    return (
        <div className="flex flex-col gap-4">
            {rows.map((row, i) => {
                const subtotal = subtotalRuteTarif(row)

                return (
                    <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-gray-700 dark:text-gray-200">Rute {i + 1}</p>
                            <span
                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-500/30 cursor-pointer transition-colors"
                                onClick={() => onHapusRow(i)}
                            >
                                <HiOutlineTrash />
                            </span>
                        </div>

                        <RuteTarifFields
                            value={row}
                            onChange={next => onChangeRow(i, next)}
                            ruteOptions={ruteOptions}
                            jenisOptions={jenisOptions}
                            onRuteCreated={onRuteCreated}
                        />

                        <div className="flex items-baseline justify-end gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                                {subtotal > 0 ? formatRupiah(subtotal) : '—'}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
