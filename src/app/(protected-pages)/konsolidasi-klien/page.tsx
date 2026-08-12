'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import dayjs from 'dayjs'
import { Card, Button, Tag, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiOutlineDownload } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { klienService, Klien } from '@/services/klien.service'
import { konsolidasiKlienService, KonsolidasiKlienRekap } from '@/services/konsolidasiKlien.service'

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const SUMBER_OPTIONS = [
    { value: '',         label: 'Semua Sumber' },
    { value: 'internal', label: 'Internal' },
    { value: 'vendor',   label: 'Vendor' },
]

export default function KonsolidasiKlienPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [klienOptions, setKlienOptions] = useState<{ value: string; label: string }[]>([])
    const [selectedKlien, setSelectedKlien] = useState<string>(() => searchParams.get('klien') ?? '')

    useEffect(() => {
        if (searchParams.get('klien')) return
        const tersimpan = localStorage.getItem('konsolidasi-klien.klien')
        if (tersimpan) setSelectedKlien(tersimpan)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
    const [sumber, setSumber] = useState('')

    const [rekap, setRekap]     = useState<KonsolidasiKlienRekap | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)

    const gantiKlien = (id: string) => {
        setSelectedKlien(id)
        if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('konsolidasi-klien.klien', id)
            else localStorage.removeItem('konsolidasi-klien.klien')
        }
        router.replace(id ? `${ROUTES.KONSOLIDASI_KLIEN}?klien=${id}` : ROUTES.KONSOLIDASI_KLIEN, { scroll: false })
    }

    useEffect(() => {
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => {})
    }, [])

    const reqRef = useRef(0)
    const fetchRekap = useCallback(async () => {
        if (!selectedKlien) { setRekap(null); return }
        const reqId = ++reqRef.current
        setLoading(true)
        try {
            const data = await konsolidasiKlienService.rekap(selectedKlien, dari, sampai, sumber)
            if (reqRef.current !== reqId) return
            setRekap(data)
        } catch (err) {
            if (reqRef.current !== reqId) return
            setRekap(null)
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                localStorage.removeItem('konsolidasi-klien.klien')
            }
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (reqRef.current === reqId) setLoading(false)
        }
    }, [selectedKlien, dari, sampai, sumber])

    useEffect(() => { fetchRekap() }, [fetchRekap])

    const handleExport = async () => {
        if (!rekap) return
        setExporting(true)
        try {
            await konsolidasiKlienService.exportExcel(selectedKlien, rekap.klien.nama_klien, dari, sampai, sumber)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Konsolidasi Klien</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Rekap laporan perjalanan per klien — dicocokkan dengan klien sebelum penagihan
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <Select
                        className="w-full sm:w-80"
                        placeholder="Pilih klien..."
                        options={klienOptions}
                        value={klienOptions.find(o => o.value === selectedKlien) ?? null}
                        onChange={opt => gantiKlien((opt as { value: string } | null)?.value ?? '')}
                    />
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={date => setDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40"
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => setSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </div>
                    <Select
                        className="w-40"
                        isSearchable={false}
                        options={SUMBER_OPTIONS}
                        value={SUMBER_OPTIONS.find(o => o.value === sumber) ?? SUMBER_OPTIONS[0]}
                        onChange={opt => setSumber((opt as { value: string } | null)?.value ?? '')}
                    />
                    {loading && <Spinner size={20} />}
                    <div className="flex-1" />
                    <Button size="sm" variant="default" icon={<HiOutlineDownload />}
                        disabled={!rekap || rekap.trips.length === 0}
                        loading={exporting} onClick={handleExport}>
                        Export Excel
                    </Button>
                </div>

                {!selectedKlien ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Pilih klien untuk melihat rekap perjalanannya</p>
                ) : loading && !rekap ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Memuat...</p>
                ) : !rekap || rekap.trips.length === 0 ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Tidak ada trip selesai ber-laporan pada periode ini</p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-3 px-4 py-3">
                            <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800 min-w-[140px]">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Rit</p>
                                <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{formatNum(rekap.ringkasan.total_rit)}</p>
                            </div>
                            <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800 min-w-[140px]">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Jarak</p>
                                <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{formatNum(rekap.ringkasan.total_jarak_km)} km</p>
                            </div>
                            <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 min-w-[180px]">
                                <p className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide">Estimasi Nilai</p>
                                <p className="font-bold text-base text-blue-600 dark:text-blue-300 mt-1">{formatRupiah(rekap.ringkasan.estimasi_nilai)}</p>
                                {rekap.ringkasan.tanpa_tarif > 0 && (
                                    <p className="text-xs mt-0.5 text-amber-600 dark:text-amber-400">{rekap.ringkasan.tanpa_tarif} trip tanpa tarif</p>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className={TH_CLASS}>Tanggal</th>
                                        <th className={TH_CLASS}>Proyek</th>
                                        <th className={TH_CLASS}>Rute</th>
                                        <th className={TH_CLASS}>Asal</th>
                                        <th className={TH_CLASS}>Tujuan</th>
                                        <th className={TH_CLASS}>Nopol</th>
                                        <th className={TH_CLASS}>Supir</th>
                                        <th className={`${TH_CLASS} text-right`}>Jarak</th>
                                        <th className={`${TH_CLASS} text-right`}>Tarif</th>
                                        <th className={TH_CLASS}>Status Tagihan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {rekap.trips.map(t => (
                                        <tr key={t.id_trip}>
                                            <td className="py-2.5 px-3 whitespace-nowrap">{dayjs(t.tanggal).format('DD MMM YYYY')}</td>
                                            <td className="py-2.5 px-3">
                                                {t.kode_proyek || t.nama_proyek
                                                    ? `${t.kode_proyek ?? ''}${t.kode_proyek && t.nama_proyek ? ' — ' : ''}${t.nama_proyek ?? ''}`
                                                    : '—'}
                                            </td>
                                            <td className="py-2.5 px-3">{t.rute ?? '—'}</td>
                                            <td className="py-2.5 px-3">{t.asal ?? '—'}</td>
                                            <td className="py-2.5 px-3">{t.tujuan ?? '—'}</td>
                                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs">{t.nopol ?? '—'}</td>
                                            <td className="py-2.5 px-3">
                                                <span className="inline-flex items-center gap-2">
                                                    {t.supir_nama ?? '—'}
                                                    {t.sumber === 'vendor' && (
                                                        <Tag className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">vendor</Tag>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                {t.jarak_tempuh_km != null ? `${formatNum(t.jarak_tempuh_km)} km` : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                {t.tarif
                                                    ? formatRupiah(t.tarif.harga)
                                                    : <Tag className="text-xs bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300">Tarif belum diatur</Tag>}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <Tag className={`text-xs font-semibold ${t.sudah_difakturkan
                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                                                    {t.sudah_difakturkan ? 'Sudah difakturkan' : 'Belum'}
                                                </Tag>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}
