'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Tag, toast, Notification, DatePicker, Spinner, Button } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineDownload } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { alokasiArmadaService, RiwayatAlokasiItem } from '@/services/alokasiArmada.service'
import { armadaService, Armada } from '@/services/armada.service'

type Option = { value: string; label: string }

const SUMBER_TAG: Record<string, { label: string; className: string }> = {
    penugasan: { label: 'Dari Penugasan', className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100' },
    default:  { label: 'Default',  className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100' },
    otomatis: { label: 'Otomatis', className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100' },
    manual:   { label: 'Manual',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
}

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function RiwayatUnitTab() {
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])
    const [idArmada, setIdArmada] = useState('')
    const [tanggalDari, setTanggalDari]     = useState<Date | null>(null)
    const [tanggalSampai, setTanggalSampai] = useState<Date | null>(null)
    const [items, setItems]     = useState<RiwayatAlokasiItem[]>([])
    const [loading, setLoading] = useState(false)
    const [mengunduh, setMengunduh] = useState<'excel' | 'pdf' | null>(null)

    useEffect(() => {
        armadaService.list(1, 100).then(res => {
            setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol })))
        }).catch(() => {})
    }, [])

    const periode = useCallback(() => ({
        tanggal_dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
        tanggal_sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
    }), [tanggalDari, tanggalSampai])

    const fetchRiwayat = useCallback(async () => {
        if (!idArmada) { setItems([]); return }
        setLoading(true)
        try {
            const res = await alokasiArmadaService.riwayatArmada(idArmada, periode())
            setItems(res.items)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [idArmada, periode])

    useEffect(() => { fetchRiwayat() }, [fetchRiwayat])

    const unduh = async (format: 'excel' | 'pdf') => {
        if (!idArmada) return
        const nopol = armadaOptions.find(o => o.value === idArmada)?.label ?? 'armada'
        setMengunduh(format)
        try {
            await alokasiArmadaService.downloadRiwayatArmada(nopol, format, { id_armada: idArmada, ...periode() })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(null)
        }
    }

    return (
        <Card bodyClass="p-0">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="w-full sm:w-56 shrink-0">
                    <Select
                        placeholder="Pilih armada..."
                        options={armadaOptions}
                        value={armadaOptions.find(o => o.value === idArmada) ?? null}
                        onChange={opt => setIdArmada((opt as Option | null)?.value ?? '')}
                    />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                    <DatePicker placeholder="Dari (opsional)" value={tanggalDari} onChange={setTanggalDari} />
                </div>
                <div className="w-full sm:w-40 shrink-0">
                    <DatePicker placeholder="Sampai (opsional)" value={tanggalSampai} onChange={setTanggalSampai} />
                </div>
                <div className="flex-1" />
                <Button size="sm" icon={<HiOutlineDownload />} disabled={!idArmada}
                    loading={mengunduh === 'excel'} onClick={() => unduh('excel')}>
                    Excel
                </Button>
                <Button size="sm" icon={<HiOutlineDownload />} disabled={!idArmada}
                    loading={mengunduh === 'pdf'} onClick={() => unduh('pdf')}>
                    PDF
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            <th className={TH_CLASS}>Tanggal</th>
                            <th className={TH_CLASS}>Supir Pemegang</th>
                            <th className={TH_CLASS}>Proyek</th>
                            <th className={TH_CLASS}>Sumber</th>
                            <th className={TH_CLASS}>Milik / Keterangan</th>
                            <th className={TH_CLASS}>Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {!idArmada ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center text-gray-400">
                                    Pilih armada untuk melihat riwayat lengkap pemegangnya
                                </td>
                            </tr>
                        ) : loading ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center">
                                    <Spinner className="inline-block" size={28} />
                                </td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center text-gray-400">
                                    Belum ada riwayat alokasi untuk armada ini
                                </td>
                            </tr>
                        ) : (
                            items.map((r, i) => {
                                const sumber = SUMBER_TAG[r.sumber] ?? SUMBER_TAG.otomatis
                                const digantikan = r.dihapus_pada !== null
                                return (
                                    <tr key={i} className={digantikan ? 'opacity-50' : ''}>
                                        <td className="py-2.5 px-3 whitespace-nowrap">{dayjs(r.tanggal).format('DD MMM YYYY')}</td>
                                        <td className="py-2.5 px-3 font-semibold">{r.supir_nama}</td>
                                        <td className="py-2.5 px-3">{r.nama_proyek ?? '—'}</td>
                                        <td className="py-2.5 px-3">
                                            <Tag className={`text-xs font-semibold ${sumber.className}`}>{sumber.label}</Tag>
                                        </td>
                                        <td className="py-2.5 px-3">
                                            {r.pemilik_nama
                                                ? <span className="text-xs">{r.pemilik_nama}{r.keterangan ? ` — ${r.keterangan}` : ''}</span>
                                                : <span className="text-xs text-gray-400">{r.keterangan ?? '—'}</span>}
                                        </td>
                                        <td className="py-2.5 px-3 whitespace-nowrap">
                                            {digantikan
                                                ? <span className="text-xs text-gray-400">Digantikan {dayjs(r.dihapus_pada!).format('DD MMM HH:mm')}</span>
                                                : <Tag className="text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100">Berlaku</Tag>}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
