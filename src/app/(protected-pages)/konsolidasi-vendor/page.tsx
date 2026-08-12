'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dayjs from 'dayjs'
import axios from 'axios'
import { Card, Button, Tag, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiOutlineDownload } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { Vendor } from '@/services/vendor.service'
import { konsolidasiVendorService, KonsolidasiRekap } from '@/services/konsolidasiVendor.service'

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'Full',
}

export default function KonsolidasiVendorPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [vendorOptions, setVendorOptions] = useState<{ value: string; label: string }[]>([])
    const [selectedVendor, setSelectedVendor] = useState<string>(() => searchParams.get('vendor') ?? '')

    useEffect(() => {
        if (searchParams.get('vendor')) return
        const tersimpan = localStorage.getItem('konsolidasi-vendor.vendor')
        if (tersimpan) setSelectedVendor(tersimpan)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))

    const [rekap, setRekap]     = useState<KonsolidasiRekap | null>(null)
    const [loading, setLoading] = useState(false)
    const [exporting, setExporting] = useState(false)

    const gantiVendor = (id: string) => {
        setSelectedVendor(id)
        if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('konsolidasi-vendor.vendor', id)
            else localStorage.removeItem('konsolidasi-vendor.vendor')
        }
        router.replace(id ? `${ROUTES.KONSOLIDASI_VENDOR}?vendor=${id}` : ROUTES.KONSOLIDASI_VENDOR, { scroll: false })
    }

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 100 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
    }, [])

    const reqRef = useRef(0)
    const fetchRekap = useCallback(async () => {
        if (!selectedVendor) { setRekap(null); return }
        const reqId = ++reqRef.current
        setLoading(true)
        try {
            const data = await konsolidasiVendorService.rekap(selectedVendor, dari, sampai)
            if (reqRef.current !== reqId) return
            setRekap(data)
        } catch (err) {
            if (reqRef.current !== reqId) return
            setRekap(null)
            if (axios.isAxiosError(err) && err.response?.status === 404) {
                localStorage.removeItem('konsolidasi-vendor.vendor')
            }
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (reqRef.current === reqId) setLoading(false)
        }
    }, [selectedVendor, dari, sampai])

    useEffect(() => { fetchRekap() }, [fetchRekap])

    const handleExport = async () => {
        if (!rekap) return
        setExporting(true)
        try {
            await konsolidasiVendorService.exportExcel(selectedVendor, rekap.vendor.nama_vendor, dari, sampai)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Konsolidasi Vendor</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Rekap pemakaian armada vendor per periode — bahan pencocokan invoice & laporan ke vendor
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <Select
                        className="w-full sm:w-80"
                        placeholder="Pilih vendor..."
                        options={vendorOptions}
                        value={vendorOptions.find(o => o.value === selectedVendor) ?? null}
                        onChange={opt => gantiVendor((opt as { value: string } | null)?.value ?? '')}
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
                    {loading && <Spinner size={20} />}
                    <div className="flex-1" />
                    <Button size="sm" variant="default" icon={<HiOutlineDownload />}
                        disabled={!rekap || rekap.trips.length === 0}
                        loading={exporting} onClick={handleExport}>
                        Export Excel
                    </Button>
                </div>

                {!selectedVendor ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Pilih vendor untuk melihat rekap pemakaian armadanya</p>
                ) : loading && !rekap ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Memuat...</p>
                ) : !rekap || rekap.trips.length === 0 ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Tidak ada trip vendor selesai ber-laporan pada periode ini</p>
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
                            <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 min-w-[200px]">
                                <p className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide">Nilai Seharusnya</p>
                                {rekap.ringkasan.kontrak.map(k => (
                                    <div key={k.id_kontrak_vendor} className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                                        <span className="font-medium">{MEKANISME_LABEL[k.mekanisme] ?? k.mekanisme}</span>
                                        {' — '}
                                        {k.nilai_seharusnya != null
                                            ? <span className="font-bold">{formatRupiah(k.nilai_seharusnya)}</span>
                                            : <span>{k.jumlah_rit} rit · {k.satuan ?? 'satuan belum diatur'} (kontrak {formatRupiah(k.nilai_kontrak)})</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className={TH_CLASS}>Tanggal</th>
                                        <th className={TH_CLASS}>Nopol</th>
                                        <th className={TH_CLASS}>Supir</th>
                                        <th className={TH_CLASS}>Rute</th>
                                        <th className={`${TH_CLASS} text-right`}>Jarak</th>
                                        <th className={TH_CLASS}>Mekanisme</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {rekap.trips.map(t => (
                                        <tr key={t.id_trip}>
                                            <td className="py-2.5 px-3 whitespace-nowrap">{dayjs(t.tanggal).format('DD MMM YYYY')}</td>
                                            <td className="py-2.5 px-3 whitespace-nowrap">{t.nopol ?? '—'}</td>
                                            <td className="py-2.5 px-3">{t.supir_nama ?? '—'}</td>
                                            <td className="py-2.5 px-3">{t.rute ?? '—'}</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                {t.jarak_tempuh_km != null ? `${formatNum(t.jarak_tempuh_km)} km` : '—'}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <Tag className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
                                                    {MEKANISME_LABEL[t.mekanisme] ?? t.mekanisme}
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
