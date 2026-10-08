'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye, HiOutlinePencilAlt, HiOutlineClipboardList, HiOutlineDownload } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasbonService, Kasbon, RingkasanKasbon, StatusKasbon } from '@/services/kasbon.service'
import { useLogPengajuan } from '../arus-kas/useLogPengajuan'
import { STATUS_KASBON_LABEL, STATUS_KASBON_TAG, TAG_KASBON_LAMA, labelBulan, sudahDicairkan } from './kasbonMeta'

type StatusOption = { value: '' | StatusKasbon; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '', label: 'Semua Status' },
    { value: 'menunggu_approval', label: STATUS_KASBON_LABEL.menunggu_approval },
    { value: 'menunggu_pencairan', label: STATUS_KASBON_LABEL.menunggu_pencairan },
    { value: 'berjalan', label: STATUS_KASBON_LABEL.berjalan },
    { value: 'lunas', label: STATUS_KASBON_LABEL.lunas },
    { value: 'ditolak', label: STATUS_KASBON_LABEL.ditolak },
]

export default function KasbonPage() {
    const router = useRouter()
    const [list, setList]             = useState<Kasbon[]>([])
    const [ringkasan, setRingkasan]   = useState<RingkasanKasbon | null>(null)
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [exporting, setExporting]   = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState<'' | StatusKasbon>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Kasbon | null>(null)

    const { bukaLog, dialogLog } = useLogPengajuan(kasbonService.riwayat)
    const permintaanTerbaru = useRef(0)

    const fetchData = useCallback(async () => {
        const urutan = ++permintaanTerbaru.current
        setLoading(true)
        try {
            const res = await kasbonService.list(currentPage, pageSize, { search, status: statusFilter })
            if (urutan !== permintaanTerbaru.current) return
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            if (urutan !== permintaanTerbaru.current) return
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === permintaanTerbaru.current) setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter])

    const fetchRingkasan = useCallback(() => {
        kasbonService.ringkasan()
            .then(setRingkasan)
            .catch(() => {})
    }, [])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => { fetchRingkasan() }, [fetchRingkasan])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await kasbonService.delete(deleteTarget.id_kasbon)
            toast.push(<Notification type="success" title="Kasbon berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
            fetchRingkasan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            await kasbonService.exportExcel({ search, status: statusFilter })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExporting(false)
        }
    }

    const columns: ColumnDef<Kasbon>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<Kasbon, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Nomor', accessorKey: 'nomor_kasbon', size: 150,
            cell: ({ row }: CellContext<Kasbon, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        onClick={() => router.push(ROUTES.KASBON_DETAIL(row.original.id_kasbon))}>
                        {row.original.nomor_kasbon}
                    </span>
                    <span className="text-xs text-gray-400">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                </div>
            ),
        },
        { header: 'Karyawan', accessorKey: 'nama_karyawan', size: 220,
            cell: ({ row }: CellContext<Kasbon, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{row.original.nama_karyawan ?? '—'}</span>
                    <span className="text-xs text-gray-400">
                        {[row.original.nik, row.original.nama_jabatan].filter(Boolean).join(' · ') || '—'}
                    </span>
                </div>
            ),
        },
        { header: 'Keperluan', accessorKey: 'keperluan', size: 200,
            cell: ({ row }: CellContext<Kasbon, unknown>) => (
                <Tooltip title={row.original.keperluan}>
                    <span className="block truncate max-w-48">{row.original.keperluan}</span>
                </Tooltip>
            ),
        },
        { header: 'Nominal', accessorKey: 'nominal', size: 140,
            cell: ({ row }: CellContext<Kasbon, unknown>) => (
                <span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(row.original.nominal)}</span>
            ),
        },
        { header: 'Cicilan / Gajian', accessorKey: 'cicilan_per_periode', size: 160,
            cell: ({ row }: CellContext<Kasbon, unknown>) => (
                <div className="flex flex-col">
                    <span className="tabular-nums whitespace-nowrap">{formatRupiah(row.original.cicilan_per_periode)}</span>
                    <span className="text-xs text-gray-400">mulai {labelBulan(row.original.mulai_potong)}</span>
                </div>
            ),
        },
        { header: 'Sisa', accessorKey: 'sisa', size: 150,
            cell: ({ row }: CellContext<Kasbon, unknown>) => sudahDicairkan(row.original.status)
                ? (
                    <div className="flex flex-col">
                        <span className={`tabular-nums font-semibold whitespace-nowrap ${row.original.sisa > 0 ? '' : 'text-gray-400'}`}>
                            {formatRupiah(row.original.sisa)}
                        </span>
                        <span className="text-xs text-gray-400">terbayar {formatRupiah(row.original.terbayar)}</span>
                    </div>
                )
                : <span className="text-gray-400">—</span>,
        },
        { header: 'Status', id: 'status', size: 170,
            cell: ({ row }: CellContext<Kasbon, unknown>) => (
                <div className="flex flex-col items-start gap-1">
                    <Tag className={`text-xs font-semibold ${STATUS_KASBON_TAG[row.original.status]}`}>
                        {STATUS_KASBON_LABEL[row.original.status]}
                    </Tag>
                    {row.original.saldo_awal && <Tag className={`text-xs ${TAG_KASBON_LAMA}`}>Kasbon Lama</Tag>}
                </div>
            ),
        },
        { header: '', id: 'aksi', size: 170,
            cell: ({ row }: CellContext<Kasbon, unknown>) => {
                const k = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => router.push(ROUTES.KASBON_DETAIL(k.id_kasbon))}>
                                <HiOutlineEye className="text-lg" />
                            </span>
                        </Tooltip>
                        {k.id_pengajuan && (
                            <Tooltip title="Log Aktivitas Approval">
                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                                    onClick={() => bukaLog(k.id_kasbon)}>
                                    <HiOutlineClipboardList className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {k.bisa_diubah && (
                            <Tooltip title="Edit">
                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                    onClick={() => router.push(ROUTES.KASBON_EDIT(k.id_kasbon))}>
                                    <HiOutlinePencilAlt className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {k.bisa_diubah && (
                            <Tooltip title="Hapus">
                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                    onClick={() => setDeleteTarget(k)}>
                                    <HiOutlineTrash className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Kasbon</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Pinjaman karyawan — diajukan ke approval, dicairkan di Proses Pembayaran, lalu dicicil otomatis lewat potongan gaji</p>
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip title="Export Excel">
                        <Button variant="default" size="sm" icon={<HiOutlineDownload />} loading={exporting} onClick={handleExport} />
                    </Tooltip>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.KASBON_BARU)}>
                        Tambah Kasbon
                    </Button>
                </div>
            </div>

            {ringkasan && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: 'Total Sisa Kasbon', value: formatRupiah(ringkasan.total_sisa), highlight: true },
                        { label: 'Kasbon Berjalan', value: `${formatNum(ringkasan.jumlah_berjalan)} kasbon` },
                        { label: 'Karyawan Berkasbon', value: `${formatNum(ringkasan.jumlah_karyawan)} karyawan` },
                        { label: 'Menunggu Approval / Pencairan', value: `${formatNum(ringkasan.jumlah_menunggu)} kasbon` },
                    ].map(({ label, value, highlight }) => (
                        <div key={label} className={`rounded-lg p-3 ${highlight
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                            <p className={`text-xs mb-1 ${highlight ? 'text-blue-500' : 'text-gray-500'}`}>{label}</p>
                            <p className={`font-semibold text-sm ${highlight ? 'text-blue-700 dark:text-blue-300' : ''}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari nomor kasbon, nama, atau NIK karyawan... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                    <div className="w-56 shrink-0">
                        <Select<StatusOption>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }} />
                    </div>
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Kasbon?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">
                    Kasbon <span className="font-semibold">{deleteTarget?.nomor_kasbon}</span> ({deleteTarget?.nama_karyawan})
                    {deleteTarget?.saldo_awal ? '' : ' beserta pengajuannya'} akan dihapus. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            {dialogLog}
        </div>
    )
}
