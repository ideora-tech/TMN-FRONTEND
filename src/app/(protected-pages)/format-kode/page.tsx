'use client'
import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { Card, Button, Input, Select, toast, Notification } from '@/components/ui'
import { parseApiError } from '@/utils/error.util'
import {
    pengaturanKodeService,
    EntitasKode,
    ResetKode,
} from '@/services/pengaturanKode.service'

const LABEL_ENTITAS: Record<EntitasKode, string> = {
    proyek: 'Proyek',
    rute: 'Rute',
    penawaran: 'Penawaran',
}

const URUTAN_ENTITAS: EntitasKode[] = ['proyek', 'rute', 'penawaran']

const RESET_OPTIONS: { value: ResetKode; label: string }[] = [
    { value: 'tidak', label: 'Tidak Direset' },
    { value: 'bulanan', label: 'Bulanan' },
    { value: 'tahunan', label: 'Tahunan' },
]

type BarisForm = {
    prefix: string
    panjang_digit: string
    reset: ResetKode
    tersimpan: boolean
}

const susunContoh = (prefix: string, panjangDigitStr: string, reset: ResetKode): string => {
    const panjangDigit = Math.min(8, Math.max(3, Number(panjangDigitStr) || 4))
    const urut = '1'.padStart(panjangDigit, '0')
    const prefixTampil = prefix.trim() || '—'

    if (reset === 'tahunan') return `${prefixTampil}-${dayjs().format('YYYY')}-${urut}`
    if (reset === 'bulanan') return `${prefixTampil}-${dayjs().format('YYYYMM')}-${urut}`
    return `${prefixTampil}-${urut}`
}

export default function FormatKodePage() {
    const [loading, setLoading] = useState(true)
    const [rows, setRows] = useState<Partial<Record<EntitasKode, BarisForm>>>({})
    const [savingEntitas, setSavingEntitas] = useState<EntitasKode | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const data = await pengaturanKodeService.list()
            const next: Partial<Record<EntitasKode, BarisForm>> = {}
            data.forEach(item => {
                next[item.entitas] = {
                    prefix: item.prefix,
                    panjang_digit: String(item.panjang_digit),
                    reset: item.reset,
                    tersimpan: item.tersimpan,
                }
            })
            setRows(next)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const setField = (entitas: EntitasKode, field: keyof BarisForm, value: string) => {
        setRows(prev => {
            const baris = prev[entitas]
            if (!baris) return prev
            return { ...prev, [entitas]: { ...baris, [field]: value } }
        })
    }

    const handleSimpan = async (entitas: EntitasKode) => {
        const baris = rows[entitas]
        if (!baris) return

        setSavingEntitas(entitas)
        try {
            const hasil = await pengaturanKodeService.update(entitas, {
                prefix: baris.prefix.trim().toUpperCase(),
                panjang_digit: Number(baris.panjang_digit),
                reset: baris.reset,
            })
            setRows(prev => ({
                ...prev,
                [entitas]: {
                    prefix: hasil.prefix,
                    panjang_digit: String(hasil.panjang_digit),
                    reset: hasil.reset,
                    tersimpan: hasil.tersimpan,
                },
            }))
            toast.push(<Notification type="success" title={`Format kode ${LABEL_ENTITAS[entitas]} berhasil disimpan`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingEntitas(null)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Format Kode</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Atur prefix, panjang digit, dan periode reset untuk penomoran kode otomatis proyek, rute, dan penawaran
                </p>
            </div>
            <Card bodyClass="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="text-left text-gray-600 dark:text-gray-300">
                                <th className="px-4 py-3 font-semibold min-w-[120px]">Entitas</th>
                                <th className="px-4 py-3 font-semibold min-w-[140px]">Prefix</th>
                                <th className="px-4 py-3 font-semibold w-28">Digit</th>
                                <th className="px-4 py-3 font-semibold min-w-[170px]">Reset</th>
                                <th className="px-4 py-3 font-semibold min-w-[170px]">Contoh</th>
                                <th className="px-4 py-3 w-28"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                                        Memuat data...
                                    </td>
                                </tr>
                            ) : (
                                URUTAN_ENTITAS.map(entitas => {
                                    const baris = rows[entitas]
                                    if (!baris) return null
                                    return (
                                        <tr key={entitas} className="border-b border-gray-100 dark:border-gray-700 align-top">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-gray-800 dark:text-gray-100">{LABEL_ENTITAS[entitas]}</p>
                                                {!baris.tersimpan && (
                                                    <p className="text-xs text-gray-400 mt-0.5">Nilai default</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    value={baris.prefix}
                                                    maxLength={20}
                                                    onChange={e => setField(entitas, 'prefix', e.target.value.toUpperCase())}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Input
                                                    type="number"
                                                    min={3}
                                                    max={8}
                                                    value={baris.panjang_digit}
                                                    onChange={e => setField(entitas, 'panjang_digit', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Select
                                                    isSearchable={false}
                                                    options={RESET_OPTIONS}
                                                    value={RESET_OPTIONS.find(o => o.value === baris.reset) ?? null}
                                                    onChange={opt => setField(entitas, 'reset', (opt?.value as ResetKode) ?? 'tidak')}
                                                />
                                            </td>
                                            <td className="px-4 py-3 pt-4">
                                                <span className="font-mono text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                                                    {susunContoh(baris.prefix, baris.panjang_digit, baris.reset)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right pt-3">
                                                <Button
                                                    size="sm"
                                                    variant="solid"
                                                    loading={savingEntitas === entitas}
                                                    onClick={() => handleSimpan(entitas)}
                                                >
                                                    Simpan
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}
