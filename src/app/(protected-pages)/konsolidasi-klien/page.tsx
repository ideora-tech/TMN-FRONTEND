'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import dayjs from 'dayjs'
import { Card, Button, Tag, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineDownload } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { klienService, Klien } from '@/services/klien.service'
import { konsolidasiKlienService, KonsolidasiKlienRekap, KonsolidasiKlienTrip } from '@/services/konsolidasiKlien.service'

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
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)

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
            setCurrentPage(1)
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

    const tripColumns: ColumnDef<KonsolidasiKlienTrip>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }) => (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal', size: 130,
            cell: ({ row }) => <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>,
        },
        {
            header: 'Proyek', accessorKey: 'nama_proyek', size: 200,
            cell: ({ row }) => {
                const t = row.original
                return t.kode_proyek || t.nama_proyek
                    ? `${t.kode_proyek ?? ''}${t.kode_proyek && t.nama_proyek ? ' — ' : ''}${t.nama_proyek ?? ''}`
                    : '—'
            },
        },
        {
            header: 'Rute', accessorKey: 'rute', size: 130,
            cell: ({ row }) => row.original.rute ?? '—',
        },
        {
            header: 'Asal', accessorKey: 'asal', size: 110,
            cell: ({ row }) => row.original.asal ?? '—',
        },
        {
            header: 'Tujuan', accessorKey: 'tujuan', size: 110,
            cell: ({ row }) => row.original.tujuan ?? '—',
        },
        {
            header: 'Nopol', accessorKey: 'nopol', size: 120,
            cell: ({ row }) => <span className="whitespace-nowrap font-mono text-xs">{row.original.nopol ?? '—'}</span>,
        },
        {
            header: 'Supir', accessorKey: 'supir_nama', size: 160,
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-2">
                    {row.original.supir_nama ?? '—'}
                    {row.original.sumber === 'vendor' && (
                        <Tag className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">vendor</Tag>
                    )}
                </span>
            ),
        },
        {
            header: 'Jarak', accessorKey: 'jarak_tempuh_km', size: 100,
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {row.original.jarak_tempuh_km != null ? `${formatNum(row.original.jarak_tempuh_km)} km` : '—'}
                </span>
            ),
        },
        {
            header: 'Tarif', id: 'tarif', size: 130,
            cell: ({ row }) => (
                <span className="whitespace-nowrap">
                    {row.original.tarif
                        ? formatRupiah(row.original.tarif.harga)
                        : <Tag className="text-xs bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300">Tarif belum diatur</Tag>}
                </span>
            ),
        },
        {
            header: 'Status Tagihan', accessorKey: 'sudah_difakturkan', size: 150,
            cell: ({ row }) => (
                <Tag className={`text-xs font-semibold ${row.original.sudah_difakturkan
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300'}`}>
                    {row.original.sudah_difakturkan ? 'Sudah difakturkan' : 'Belum'}
                </Tag>
            ),
        },
    ]

    const trips = rekap?.trips ?? []
    const pagedTrips = trips.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
                        className="w-48"
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

                        <DataTable
                            columns={tripColumns}
                            data={pagedTrips as unknown[]}
                            loading={loading}
                            pagingData={{ total: trips.length, pageIndex: currentPage, pageSize }}
                            onPaginationChange={setCurrentPage}
                            onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                        />
                    </>
                )}
            </Card>
        </div>
    )
}
