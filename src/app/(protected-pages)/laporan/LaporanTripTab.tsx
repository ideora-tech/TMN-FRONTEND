'use client'
import { useEffect, useState, useCallback } from 'react'
import { DatePicker, Button, Tag, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import dayjs from 'dayjs'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { API_ENDPOINTS } from '@/constants/api.constant'
import {
    laporanOperasionalService,
    LaporanTripRow,
    LaporanTripFilter,
    LaporanTripRingkasan,
} from '@/services/laporanOperasional.service'
import { klienService, Klien } from '@/services/klien.service'
import { supirService, Supir } from '@/services/supir.service'
import { armadaService, Armada } from '@/services/armada.service'

type Option = { value: string; label: string }

const KLIEN_ALL: Option  = { value: '', label: 'Semua Klien' }
const SUPIR_ALL: Option  = { value: '', label: 'Semua Supir' }
const ARMADA_ALL: Option = { value: '', label: 'Semua Armada' }

const STATUS_TRIP_LABEL: Record<string, string> = {
    belum_mulai: 'Belum Mulai',
    berjalan:    'Berjalan',
    selesai:     'Selesai',
    dibatalkan:  'Dibatalkan',
}

const STATUS_TRIP_TAG: Record<string, string> = {
    belum_mulai: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    berjalan:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    selesai:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const RINGKASAN_EMPTY: LaporanTripRingkasan = { jumlah_trip: 0, total_biaya: 0 }

type ExportKey = 'trip-excel' | 'trip-pdf' | 'karyawan-excel' | 'karyawan-pdf' | 'armada-excel' | 'armada-pdf'

export default function LaporanTripTab() {
    const [list, setList]       = useState<LaporanTripRow[]>([])
    const [loading, setLoading] = useState(false)
    const [ringkasan, setRingkasan] = useState<LaporanTripRingkasan>(RINGKASAN_EMPTY)

    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    // Filter form (belum diterapkan)
    const [dari, setDari]       = useState<Date | null>(null)
    const [sampai, setSampai]   = useState<Date | null>(null)
    const [idKlien, setIdKlien]   = useState('')
    const [idSupir, setIdSupir]   = useState('')
    const [idArmada, setIdArmada] = useState('')

    // Filter aktif (sudah diterapkan)
    const [appliedFilter, setAppliedFilter] = useState<LaporanTripFilter>({})

    const [klienOptions, setKlienOptions]   = useState<Option[]>([KLIEN_ALL])
    const [supirOptions, setSupirOptions]   = useState<Option[]>([SUPIR_ALL])
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([ARMADA_ALL])

    const [downloading, setDownloading] = useState<ExportKey | null>(null)

    useEffect(() => {
        klienService.list(1, 100).then(res =>
            setKlienOptions([KLIEN_ALL, ...res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))])
        ).catch(() => {})
        supirService.list(1, 100).then(res =>
            setSupirOptions([SUPIR_ALL, ...res.data.map((s: Supir) => ({ value: s.id_supir, label: s.nama }))])
        ).catch(() => {})
        armadaService.list(1, 100).then(res =>
            setArmadaOptions([ARMADA_ALL, ...res.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol }))])
        ).catch(() => {})
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await laporanOperasionalService.listTrip(currentPage, pageSize, appliedFilter)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, appliedFilter])

    const fetchRingkasan = useCallback(async () => {
        try {
            const res = await laporanOperasionalService.ringkasan(appliedFilter)
            setRingkasan(res)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }, [appliedFilter])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { fetchRingkasan() }, [fetchRingkasan])

    const handleTerapkan = () => {
        setAppliedFilter({
            dari: dari ? dayjs(dari).format('YYYY-MM-DD') : undefined,
            sampai: sampai ? dayjs(sampai).format('YYYY-MM-DD') : undefined,
            id_klien: idKlien || undefined,
            id_supir: idSupir || undefined,
            id_armada: idArmada || undefined,
        })
        setCurrentPage(1)
    }

    const handleReset = () => {
        setDari(null)
        setSampai(null)
        setIdKlien('')
        setIdSupir('')
        setIdArmada('')
        setAppliedFilter({})
        setCurrentPage(1)
    }

    const downloadFile = async (url: string, filename: string, key: ExportKey, params?: LaporanTripFilter) => {
        setDownloading(key)
        try {
            const res = await axios.get(url, { responseType: 'blob', params })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloading(null)
        }
    }

    const today = new Date().toISOString().slice(0, 10)

    const handleExportTripExcel = () => downloadFile(API_ENDPOINTS.LAPORAN_TRIP_EXPORT_EXCEL, `laporan-trip-${today}.xlsx`, 'trip-excel', appliedFilter)
    const handleExportTripPdf   = () => downloadFile(API_ENDPOINTS.LAPORAN_TRIP_EXPORT_PDF,   `laporan-trip-${today}.pdf`,  'trip-pdf',   appliedFilter)
    const handleExportKaryawanExcel = () => downloadFile(API_ENDPOINTS.LAPORAN_KARYAWAN_EXPORT_EXCEL, `laporan-karyawan-${today}.xlsx`, 'karyawan-excel')
    const handleExportKaryawanPdf   = () => downloadFile(API_ENDPOINTS.LAPORAN_KARYAWAN_EXPORT_PDF,   `laporan-karyawan-${today}.pdf`,  'karyawan-pdf')
    const handleExportArmadaExcel   = () => downloadFile(API_ENDPOINTS.LAPORAN_ARMADA_EXPORT_EXCEL,   `laporan-armada-${today}.xlsx`,   'armada-excel')
    const handleExportArmadaPdf     = () => downloadFile(API_ENDPOINTS.LAPORAN_ARMADA_EXPORT_PDF,     `laporan-armada-${today}.pdf`,    'armada-pdf')

    const columns: ColumnDef<LaporanTripRow>[] = [
        {
            header: 'Tanggal', accessorKey: 'waktu_berangkat', size: 150,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) =>
                row.original.waktu_berangkat
                    ? dayjs(row.original.waktu_berangkat).format('DD/MM/YYYY HH:mm')
                    : '-',
        },
        {
            header: 'Proyek', accessorKey: 'nama_proyek', size: 200,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) => (
                <span className="font-medium">{row.original.nama_proyek ?? '-'}</span>
            ),
        },
        {
            header: 'Klien', accessorKey: 'nama_klien', size: 180,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) => row.original.nama_klien ?? '-',
        },
        {
            header: 'Armada', accessorKey: 'nopol', size: 120,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) => (
                <span className="font-mono text-xs">{row.original.nopol ?? '-'}</span>
            ),
        },
        {
            header: 'Supir', accessorKey: 'nama_supir', size: 160,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) => row.original.nama_supir ?? '-',
        },
        {
            header: 'Status', accessorKey: 'status', size: 120,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) => (
                <Tag className={STATUS_TRIP_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {STATUS_TRIP_LABEL[row.original.status] ?? row.original.status}
                </Tag>
            ),
        },
        {
            header: 'Jarak (km)', accessorKey: 'jarak_tempuh_km', size: 110,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) =>
                row.original.jarak_tempuh_km != null ? formatNum(row.original.jarak_tempuh_km, 1) : '-',
        },
        {
            header: 'Total Biaya', accessorKey: 'total_biaya', size: 150,
            cell: ({ row }: CellContext<LaporanTripRow, unknown>) => (
                <span className="font-semibold">{formatRupiah(row.original.total_biaya ?? 0)}</span>
            ),
        },
    ]

    return (
        <div>
            <div className="flex flex-wrap items-end gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                <div className="w-40 shrink-0">
                    <div className="text-xs text-gray-500 mb-1">Dari</div>
                    <DatePicker value={dari} onChange={setDari} placeholder="Dari tanggal" />
                </div>
                <div className="w-40 shrink-0">
                    <div className="text-xs text-gray-500 mb-1">Sampai</div>
                    <DatePicker value={sampai} onChange={setSampai} placeholder="Sampai tanggal" />
                </div>
                <div className="w-48 shrink-0">
                    <div className="text-xs text-gray-500 mb-1">Klien</div>
                    <Select<Option>
                        options={klienOptions}
                        value={klienOptions.find(o => o.value === idKlien) ?? KLIEN_ALL}
                        onChange={(opt) => setIdKlien((opt as Option)?.value ?? '')}
                    />
                </div>
                <div className="w-48 shrink-0">
                    <div className="text-xs text-gray-500 mb-1">Supir</div>
                    <Select<Option>
                        options={supirOptions}
                        value={supirOptions.find(o => o.value === idSupir) ?? SUPIR_ALL}
                        onChange={(opt) => setIdSupir((opt as Option)?.value ?? '')}
                    />
                </div>
                <div className="w-48 shrink-0">
                    <div className="text-xs text-gray-500 mb-1">Armada</div>
                    <Select<Option>
                        options={armadaOptions}
                        value={armadaOptions.find(o => o.value === idArmada) ?? ARMADA_ALL}
                        onChange={(opt) => setIdArmada((opt as Option)?.value ?? '')}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="solid" size="sm" onClick={handleTerapkan}>Terapkan</Button>
                    <Button variant="plain" size="sm" onClick={handleReset}>Reset</Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex flex-wrap gap-3">
                    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800 min-w-[140px]">
                        <div className="text-xs mb-1 text-gray-500">Jumlah Trip</div>
                        <div className="font-semibold text-sm">{formatNum(ringkasan.jumlah_trip)}</div>
                    </div>
                    <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 min-w-[160px]">
                        <div className="text-xs mb-1 text-blue-500 dark:text-blue-400">Total Biaya</div>
                        <div className="font-semibold text-sm text-blue-700 dark:text-blue-300">{formatRupiah(ringkasan.total_biaya)}</div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="default" loading={downloading === 'trip-excel'} onClick={handleExportTripExcel}>Export Excel</Button>
                    <Button size="sm" variant="default" loading={downloading === 'trip-pdf'} onClick={handleExportTripPdf}>Export PDF</Button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                <span className="text-xs text-gray-500 mr-1">Export Master:</span>
                <Button size="sm" variant="default" loading={downloading === 'karyawan-excel'} onClick={handleExportKaryawanExcel}>Karyawan (Excel)</Button>
                <Button size="sm" variant="default" loading={downloading === 'karyawan-pdf'} onClick={handleExportKaryawanPdf}>Karyawan (PDF)</Button>
                <Button size="sm" variant="default" loading={downloading === 'armada-excel'} onClick={handleExportArmadaExcel}>Armada (Excel)</Button>
                <Button size="sm" variant="default" loading={downloading === 'armada-pdf'} onClick={handleExportArmadaPdf}>Armada (PDF)</Button>
            </div>

            <DataTable
                columns={columns}
                data={list as unknown[]}
                loading={loading}
                noData={!loading && list.length === 0}
                pagingData={{ total, pageIndex: currentPage, pageSize }}
                onPaginationChange={setCurrentPage}
                onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
            />
        </div>
    )
}
