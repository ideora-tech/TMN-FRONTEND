'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification, Dialog, Upload } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineTrash, HiOutlineUpload } from 'react-icons/hi'
import {
    PiTruckDuotone,
    PiCheckCircleDuotone,
    PiCalendarCheckDuotone,
    PiSteeringWheelDuotone,
    PiWrenchDuotone,
} from 'react-icons/pi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ExportDropdownButton from '@/components/shared/ExportDropdownButton'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { armadaService, Armada, ArmadaServisJatuhTempo } from '@/services/armada.service'
import { ketersediaanVendorService, type RingkasanKetersediaan, type UnitKetersediaan } from '@/services/ketersediaanVendor.service'
import { SUMBER_UNIT, STATUS_KETERSEDIAAN, formatTanggal, keteranganStatus, tagDokumen } from '../ketersediaan-vendor/ketersediaanVendor.shared'
import axios from 'axios'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',            label: 'Semua Status' },
    { value: 'tersedia',    label: 'Tersedia' },
    { value: 'digunakan',   label: 'Dalam Perjalanan' },
    { value: 'perawatan',   label: 'Perawatan' },
    { value: 'tidak_aktif', label: 'Tidak Aktif' },
]

const STATUS_LABEL: Record<string, string> = {
    tersedia:    'Tersedia',
    digunakan:   'Dalam Perjalanan',
    perawatan:   'Perawatan',
    tidak_aktif: 'Tidak Aktif',
}

const STATUS_TAG: Record<string, string> = {
    tersedia:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    digunakan:   'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    perawatan:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    tidak_aktif: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const KARTU_KETERSEDIAAN = [
    { key: 'total' as const,     label: 'Semua Unit',      icon: <PiTruckDuotone className="text-3xl text-blue-500" />,           bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400' },
    { key: 'tersedia' as const,  label: 'Tersedia',        icon: <PiCheckCircleDuotone className="text-3xl text-emerald-500" />,  bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'terjadwal' as const, label: 'Terjadwal',       icon: <PiCalendarCheckDuotone className="text-3xl text-amber-500" />,  bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400' },
    { key: 'dipakai' as const,   label: 'Sedang Dipakai',  icon: <PiSteeringWheelDuotone className="text-3xl text-violet-500" />, bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400' },
    { key: 'perawatan' as const, label: 'Dalam Perawatan', icon: <PiWrenchDuotone className="text-3xl text-red-500" />,           bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400' },
]

type ImportGagal = { baris: number; nopol: string; alasan: string }
type ImportResult = { berhasil: number; gagal: ImportGagal[] }

export default function ArmadaPage() {
    const router = useRouter()

    const [list, setList]             = useState<Armada[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [servisJatuhTempo, setServisJatuhTempo] = useState<ArmadaServisJatuhTempo[]>([])

    const [ketersediaanRingkasan, setKetersediaanRingkasan] = useState<RingkasanKetersediaan | null>(null)
    const [ketersediaanMap, setKetersediaanMap] = useState<Record<string, UnitKetersediaan>>({})

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<Armada | null>(null)

    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [importing, setImporting]                     = useState(false)
    const [importResult, setImportResult]                 = useState<ImportResult | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await armadaService.list(currentPage, pageSize, search, statusFilter)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        armadaService.servisJatuhTempo().then(setServisJatuhTempo).catch(() => {})
    }, [])

    const fetchKetersediaan = useCallback(() => {
        ketersediaanVendorService.list({ sumber: 'aset', limit: 500 })
            .then(res => {
                setKetersediaanRingkasan(res.meta.ringkasan)
                setKetersediaanMap(Object.fromEntries(res.data.map(u => [u.id_unit, u])))
            })
            .catch(() => {
                setKetersediaanRingkasan(null)
                setKetersediaanMap({})
            })
    }, [])

    useEffect(() => { fetchKetersediaan() }, [fetchKetersediaan])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await armadaService.delete(deleteTarget.id_armada)
            toast.push(<Notification type="success" title="Armada berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
            fetchKetersediaan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            const res = await axios.get(API_ENDPOINTS.ARMADA_IMPORT_TEMPLATE, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = 'template-import-armada.xlsx'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate(false)
        }
    }

    const [downloadingExport, setDownloadingExport] = useState<'excel' | 'pdf' | null>(null)

    const handleExport = async (format: 'excel' | 'pdf') => {
        setDownloadingExport(format)
        try {
            const url = format === 'excel' ? API_ENDPOINTS.LAPORAN_ARMADA_EXPORT_EXCEL : API_ENDPOINTS.LAPORAN_ARMADA_EXPORT_PDF
            const res = await axios.get(url, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `data-armada-${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingExport(null)
        }
    }

    const handleImportFile = async (files: File[]) => {
        const file = files[0]
        if (!file) return
        setImporting(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const { data } = await axios.post(API_ENDPOINTS.ARMADA_IMPORT, fd)
            const result = data.data as ImportResult
            setImportResult(result)
            if (result.berhasil > 0 && result.gagal.length === 0) {
                toast.push(<Notification type="success" title={`${result.berhasil} armada berhasil diimport`} />)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setImporting(false)
        }
    }

    const handleCloseImportResult = () => {
        const berhasil = importResult?.berhasil ?? 0
        setImportResult(null)
        if (berhasil > 0) { fetchData(); fetchKetersediaan() }
    }

    const adaKetersediaan = ketersediaanRingkasan !== null

    const columns: ColumnDef<Armada>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Armada, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Nopol', accessorKey: 'nopol', size: 160,
            cell: ({ row }: CellContext<Armada, unknown>) => (
                <span className="font-mono font-semibold">{row.original.nopol}</span>
            ),
        },
        { header: 'Merk / Tipe', accessorKey: 'merk', size: 260,
            cell: ({ row }: CellContext<Armada, unknown>) => {
                const label = row.original.merk ?? '-'
                const initials = label.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary dark:bg-primary/20 flex items-center justify-center text-xs font-bold">
                            {initials}
                        </div>
                        <span className="font-semibold">{label}</span>
                    </div>
                )
            },
        },
        {
            header: 'Tipe Kendaraan', accessorKey: 'nama_jenis', size: 150,
            cell: ({ row }: CellContext<Armada, unknown>) =>
                row.original.nama_jenis ?? <span className="text-gray-300">—</span>,
        },
        { header: 'Tahun', accessorKey: 'tahun', size: 90 },
        ...(adaKetersediaan ? [{
            header: 'Kepemilikan', id: 'kepemilikan', size: 120,
            cell: () => <Tag className={`text-xs font-semibold ${SUMBER_UNIT.aset.tag}`}>{SUMBER_UNIT.aset.label}</Tag>,
        } as ColumnDef<Armada>] : []),
        {
            header: 'Status', accessorKey: 'status', size: 170,
            cell: ({ row }: CellContext<Armada, unknown>) => {
                const kv = ketersediaanMap[row.original.id_armada]
                if (kv) {
                    const status = STATUS_KETERSEDIAAN[kv.status_ketersediaan]
                    const ket = keteranganStatus(kv)
                    return (
                        <div>
                            <Tag className={`text-xs font-semibold ${status.tag}`}>{status.label}</Tag>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{ket.utama}</p>
                            {ket.tambahan && <p className="text-xs text-gray-400 mt-0.5">{ket.tambahan}</p>}
                        </div>
                    )
                }
                return (
                    <div>
                        <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                            {STATUS_LABEL[row.original.status] ?? row.original.status}
                        </Tag>
                        {(row.original.jumlah_penugasan_aktif ?? 0) > 0 && (
                            <p className="text-xs text-gray-400 mt-1">{row.original.jumlah_penugasan_aktif} penugasan aktif</p>
                        )}
                    </div>
                )
            },
        },
        ...(adaKetersediaan ? [{
            header: 'Riwayat Pemakaian', id: 'riwayat', size: 220,
            cell: ({ row }: CellContext<Armada, unknown>) => {
                const kv = ketersediaanMap[row.original.id_armada]
                if (!kv) return <span className="text-gray-300">—</span>
                if (kv.jumlah_proyek === 0) return <p className="text-xs text-gray-400">Belum pernah dipakai di proyek</p>
                return (
                    <div>
                        <p className="text-xs font-medium">{formatNum(kv.jumlah_proyek)} proyek · {formatNum(kv.hari_pakai)} hari</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Terakhir {formatTanggal(kv.terakhir_dipakai)}
                            {kv.proyek_terakhir?.nama_proyek && ` · ${kv.proyek_terakhir.nama_proyek}`}
                        </p>
                        {kv.proyek_terakhir?.nama_klien && <p className="text-xs text-gray-400">{kv.proyek_terakhir.nama_klien}</p>}
                    </div>
                )
            },
        } as ColumnDef<Armada>] : []),
        {
            header: 'Servis',
            id: 'servis',
            size: 130,
            cell: ({ row }: CellContext<Armada, unknown>) => {
                const items = servisJatuhTempo.filter(s => s.id_armada === row.original.id_armada)
                if (items.length === 0) return <span className="text-gray-300 text-xs">—</span>

                const merah = 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                const amber = 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                const servisHari = items.find(s => s.basis === 'hari' && s.jadwal_servis_berikutnya)
                const servisKm   = items.find(s => s.basis === 'km' && s.sisa_km != null)

                return (
                    <div className="flex flex-col items-start gap-1">
                        {servisHari && (() => {
                            const days = Math.ceil((new Date(servisHari.jadwal_servis_berikutnya!).getTime() - Date.now()) / 86400000)
                            return (
                                <Tag className={`text-xs font-semibold ${days <= 7 ? merah : amber}`}>
                                    {days < 0 ? 'Lewat jadwal' : `${days} hari lagi`}
                                </Tag>
                            )
                        })()}
                        {servisKm && (
                            <Tag className={`text-xs font-semibold ${servisKm.sisa_km! < 0 ? merah : amber}`}>
                                {servisKm.sisa_km! < 0
                                    ? `Lewat ${formatNum(Math.abs(servisKm.sisa_km!))} km`
                                    : `${formatNum(servisKm.sisa_km!)} km lagi`}
                            </Tag>
                        )}
                    </div>
                )
            },
        },
        ...(adaKetersediaan ? [{
            header: 'Dokumen', id: 'dokumen', size: 140,
            cell: ({ row }: CellContext<Armada, unknown>) => {
                const kv = ketersediaanMap[row.original.id_armada]
                if (!kv) return <span className="text-gray-300">—</span>
                const stnk = tagDokumen('STNK', kv.masa_berlaku_stnk)
                const kir = tagDokumen('KIR', kv.masa_berlaku_kir)
                return (
                    <div className="flex flex-col items-start gap-1">
                        <Tag className={`text-xs font-semibold whitespace-nowrap ${stnk.className}`}>{stnk.label}</Tag>
                        <Tag className={`text-xs font-semibold whitespace-nowrap ${kir.className}`}>{kir.label}</Tag>
                    </div>
                )
            },
        } as ColumnDef<Armada>] : []),
        {
            header: '', id: 'action', size: 100,
            cell: ({ row }: CellContext<Armada, unknown>) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Lihat Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.ARMADA_DETAIL(row.original.id_armada))}
                        >
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                            onClick={() => setDeleteTarget(row.original)}
                        >
                            <HiOutlineTrash className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Armada</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master armada</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ExportDropdownButton
                        loading={downloadingExport ?? (downloadingTemplate ? 'template' : null)}
                        onExportExcel={() => handleExport('excel')}
                        onExportPdf={() => handleExport('pdf')}
                        onDownloadTemplate={handleDownloadTemplate}
                    />
                    <Upload accept=".xlsx,.xls" showList={false} uploadLimit={1} onChange={handleImportFile}>
                        <Button
                            type="button" size="sm" variant="default"
                            icon={<HiOutlineUpload />}
                            loading={importing}
                        >
                            Import Excel
                        </Button>
                    </Upload>
                    <Button
                        variant="solid" size="sm"
                        icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.ARMADA_BARU)}
                    >
                        Tambah Armada
                    </Button>
                </div>
            </div>

            {adaKetersediaan && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {KARTU_KETERSEDIAAN.map(k => (
                        <Card key={k.key} className={k.bg}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                                    {k.icon}
                                </div>
                                <div className={`font-bold text-2xl ${k.text}`}>
                                    {formatNum(ketersediaanRingkasan[k.key])}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{k.label} · unit aktif</div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nopol atau merk... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-44 shrink-0">
                        <Select<StatusOption>
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }}
                        />
                    </div>
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
            </Card>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Armada?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Armada <span className="font-semibold">&ldquo;{deleteTarget?.nopol}&rdquo;</span> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!importResult} onRequestClose={handleCloseImportResult} onClose={handleCloseImportResult} width={560}>
                <h5 className="text-base font-semibold mb-4">Hasil Import Armada</h5>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {importResult?.berhasil ?? 0} armada berhasil diimport
                </p>
                {importResult && importResult.gagal.length > 0 && (
                    <div className="overflow-x-auto mt-4 max-h-80 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Baris</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Nopol</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {importResult.gagal.map((g, idx) => (
                                    <tr key={idx}>
                                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">{g.baris}</td>
                                        <td className="py-2.5 px-3 font-mono text-xs text-gray-800 dark:text-gray-200">{g.nopol || '-'}</td>
                                        <td className="py-2.5 px-3 text-red-500">{g.alasan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={handleCloseImportResult}>Tutup</Button>
                </div>
            </Dialog>
        </div>
    )
}
