'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye, HiOutlinePencilAlt, HiOutlineClipboardList } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { uangJalanService, OpsiProyek, UangJalan } from '@/services/uangJalan.service'
import type { StatusPengajuan } from '@/services/arusKas.service'
import { STATUS_LABEL, STATUS_TAG } from '../arus-kas/pengajuanMeta'
import { useLogPengajuan } from '../arus-kas/useLogPengajuan'

type StatusOption = { value: '' | StatusPengajuan; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '', label: 'Semua Status' },
    { value: 'menunggu_approval', label: STATUS_LABEL.menunggu_approval },
    { value: 'disetujui', label: STATUS_LABEL.disetujui },
    { value: 'dicek', label: STATUS_LABEL.dicek },
    { value: 'siap_transfer', label: STATUS_LABEL.siap_transfer },
    { value: 'ditolak', label: STATUS_LABEL.ditolak },
    { value: 'ditransfer', label: STATUS_LABEL.ditransfer },
]

const labelStatusDriver = (u: Pick<UangJalan, 'tipe_driver' | 'nama_vendor'>) =>
    u.tipe_driver === 'vendor' ? `Driver Vendor ${u.nama_vendor ?? ''}`.trim() : 'Driver Internal'

export default function UangJalanPage() {
    const router = useRouter()
    const [list, setList]             = useState<UangJalan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState<'' | StatusPengajuan>('')
    const [proyekFilter, setProyekFilter] = useState('')
    const [proyekOptions, setProyekOptions] = useState<OpsiProyek[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<UangJalan | null>(null)

    const { bukaLog, dialogLog } = useLogPengajuan(uangJalanService.riwayat)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await uangJalanService.list(currentPage, pageSize, { search, status: statusFilter, id_proyek: proyekFilter })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter, proyekFilter])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        uangJalanService.opsiProyek()
            .then(setProyekOptions)
            .catch(() => {})
    }, [])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await uangJalanService.delete(deleteTarget.id_uang_jalan)
            toast.push(<Notification type="success" title="Uang jalan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<UangJalan>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<UangJalan, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Nomor', accessorKey: 'nomor_uang_jalan', size: 150,
            cell: ({ row }: CellContext<UangJalan, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-mono font-semibold text-xs">{row.original.nomor_uang_jalan}</span>
                    <span className="text-xs text-gray-400">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                </div>
            ),
        },
        { header: 'Driver', accessorKey: 'nama_driver', size: 230,
            cell: ({ row }: CellContext<UangJalan, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-semibold">{row.original.nama_driver}</span>
                    <span className="text-xs text-gray-400">{labelStatusDriver(row.original)}</span>
                </div>
            ),
        },
        { header: 'No. Polisi', accessorKey: 'nopol', size: 120,
            cell: ({ row }: CellContext<UangJalan, unknown>) => <span className="whitespace-nowrap">{row.original.nopol}</span> },
        { header: 'Rute', accessorKey: 'rute', size: 190 },
        { header: 'Proyek', accessorKey: 'nama_proyek', size: 180,
            cell: ({ row }: CellContext<UangJalan, unknown>) => row.original.nama_proyek
                ? (
                    <div className="flex flex-col">
                        <span className="font-semibold">{row.original.nama_proyek}</span>
                        <span className="text-xs text-gray-400 font-mono">{row.original.kode_proyek}</span>
                    </div>
                )
                : <span className="text-gray-400">—</span>,
        },
        { header: 'UJ/Trip', accessorKey: 'uang_jalan_per_trip', size: 150,
            cell: ({ row }: CellContext<UangJalan, unknown>) => (
                <div className="flex flex-col">
                    <span className="tabular-nums whitespace-nowrap">{formatRupiah(row.original.uang_jalan_per_trip)}</span>
                    <span className="text-xs text-gray-400">{formatNum(row.original.jumlah_trip)} trip</span>
                </div>
            ),
        },
        { header: 'Nominal Transfer', accessorKey: 'nominal', size: 150,
            cell: ({ row }: CellContext<UangJalan, unknown>) => (
                <span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(row.original.nominal)}</span>
            ),
        },
        { header: 'Status', id: 'status', size: 150,
            cell: ({ row }: CellContext<UangJalan, unknown>) => {
                const status = row.original.status_pengajuan
                if (!status) return '—'
                return <Tag className={`text-xs font-semibold ${STATUS_TAG[status]}`}>{STATUS_LABEL[status]}</Tag>
            },
        },
        { header: '', id: 'aksi', size: 190,
            cell: ({ row }: CellContext<UangJalan, unknown>) => {
                const u = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                onClick={() => router.push(ROUTES.UANG_JALAN_DETAIL(u.id_uang_jalan))}>
                                <HiOutlineEye className="text-lg" />
                            </span>
                        </Tooltip>
                        {u.id_pengajuan && (
                            <Tooltip title="Log Aktivitas Approval">
                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                                    onClick={() => bukaLog(u.id_uang_jalan)}>
                                    <HiOutlineClipboardList className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {u.bisa_diubah && (
                            <Tooltip title="Edit">
                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                    onClick={() => router.push(ROUTES.UANG_JALAN_EDIT(u.id_uang_jalan))}>
                                    <HiOutlinePencilAlt className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {u.bisa_diubah && (
                            <Tooltip title="Hapus">
                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                    onClick={() => setDeleteTarget(u)}>
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
                    <h3 className="font-bold">Uang Jalan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Input uang jalan driver — diajukan ke approval sesuai konfigurasi, lalu diproses di Proses Pembayaran</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.UANG_JALAN_BARU)}>
                    Tambah Uang Jalan
                </Button>
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari nomor, driver, vendor, no. polisi, atau rute... (tekan Enter)"
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
                    <div className="w-56 shrink-0">
                        <Select<{ value: string; label: string }>
                            isSearchable isClearable
                            placeholder="Semua proyek"
                            options={proyekOptions.map(p => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))}
                            value={proyekOptions
                                .map(p => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))
                                .find(o => o.value === proyekFilter) ?? null}
                            onChange={opt => { setProyekFilter((opt as { value: string } | null)?.value ?? ''); setCurrentPage(1) }} />
                    </div>
                </div>
                <DataTable columns={columns} data={list as unknown[]} loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Uang Jalan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">Uang jalan <span className="font-semibold">{deleteTarget?.nomor_uang_jalan}</span> ({deleteTarget?.nama_driver}) beserta pengajuannya akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            {dialogLog}
        </div>
    )
}
