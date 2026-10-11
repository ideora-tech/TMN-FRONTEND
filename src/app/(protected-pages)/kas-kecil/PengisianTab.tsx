'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye, HiOutlinePencilAlt, HiOutlineClipboardList } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, PengisianKasKecil, StatusPengisianKasKecil } from '@/services/kasKecil.service'
import { useLogPengajuan } from '../arus-kas/useLogPengajuan'
import { STATUS_PENGISIAN_LABEL, STATUS_PENGISIAN_TAG } from './kasKecilMeta'

type StatusOption = { value: '' | StatusPengisianKasKecil; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '', label: 'Semua Status' },
    { value: 'menunggu_approval', label: STATUS_PENGISIAN_LABEL.menunggu_approval },
    { value: 'menunggu_transfer', label: STATUS_PENGISIAN_LABEL.menunggu_transfer },
    { value: 'selesai', label: STATUS_PENGISIAN_LABEL.selesai },
    { value: 'ditolak', label: STATUS_PENGISIAN_LABEL.ditolak },
]

const AKSI_CLASS = 'cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors'
const AKSI_BIRU = `${AKSI_CLASS} bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30`

export default function PengisianTab({ onBerubah }: { onBerubah: () => void }) {
    const router = useRouter()
    const [list, setList]       = useState<PengisianKasKecil[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState<'' | StatusPengisianKasKecil>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<PengisianKasKecil | null>(null)

    const { bukaLog, dialogLog } = useLogPengajuan(kasKecilService.riwayatPengisian)
    const permintaanTerbaru = useRef(0)

    const fetchData = useCallback(async () => {
        const urutan = ++permintaanTerbaru.current
        setLoading(true)
        try {
            const res = await kasKecilService.listPengisian(currentPage, pageSize, { search, status: statusFilter })
            if (urutan !== permintaanTerbaru.current) return
            if (res.data.length === 0 && currentPage > 1 && res.meta.total > 0) {
                setCurrentPage(res.meta.totalPages)
                return
            }
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            if (urutan !== permintaanTerbaru.current) return
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === permintaanTerbaru.current) setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput.trim()); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await kasKecilService.deletePengisian(deleteTarget.id_pengisian)
            toast.push(<Notification type="success" title="Pengisian kas kecil berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
            onBerubah()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<PengisianKasKecil>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => (currentPage - 1) * pageSize + row.index + 1 },
        { header: 'Nomor', accessorKey: 'nomor_pengisian', size: 160,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-mono font-semibold text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        onClick={() => router.push(ROUTES.KAS_KECIL_PENGISIAN_DETAIL(row.original.id_pengisian))}>
                        {row.original.nomor_pengisian}
                    </span>
                    <span className="text-xs text-gray-400">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                </div>
            ),
        },
        { header: 'Keterangan', accessorKey: 'keterangan', size: 260,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => (
                <Tooltip title={row.original.keterangan}>
                    <span className="block truncate max-w-64">{row.original.keterangan}</span>
                </Tooltip>
            ),
        },
        { header: 'Nominal', accessorKey: 'nominal', size: 150,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => (
                <span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(row.original.nominal)}</span>
            ),
        },
        { header: 'Rekening Sumber', id: 'rekening', size: 200,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => row.original.nomor_rekening
                ? (
                    <div className="flex flex-col">
                        <span>{row.original.nama_bank ?? '—'}</span>
                        <span className="font-mono text-xs text-gray-400">{row.original.nomor_rekening}</span>
                    </div>
                )
                : <span className="text-gray-400">—</span>,
        },
        { header: 'Diajukan Oleh', accessorKey: 'dibuat_oleh_nama', size: 140,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => row.original.dibuat_oleh_nama ?? '—' },
        { header: 'Status', id: 'status', size: 180,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => {
                const p = row.original
                const tag = (
                    <Tag className={`text-xs font-semibold ${STATUS_PENGISIAN_TAG[p.status]}`}>
                        {STATUS_PENGISIAN_LABEL[p.status]}
                    </Tag>
                )
                return (
                    <div className="flex flex-col items-start gap-1">
                        {p.status === 'ditolak' && p.alasan_ditolak ? <Tooltip title={p.alasan_ditolak}>{tag}</Tooltip> : tag}
                        {p.status === 'selesai' && p.tanggal_transfer && (
                            <span className="text-xs text-gray-400">{dayjs(p.tanggal_transfer).format('DD MMM YYYY')}</span>
                        )}
                    </div>
                )
            },
        },
        { header: '', id: 'aksi', size: 170,
            cell: ({ row }: CellContext<PengisianKasKecil, unknown>) => {
                const p = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span className={AKSI_BIRU} onClick={() => router.push(ROUTES.KAS_KECIL_PENGISIAN_DETAIL(p.id_pengisian))}>
                                <HiOutlineEye className="text-lg" />
                            </span>
                        </Tooltip>
                        {p.id_pengajuan && (
                            <Tooltip title="Log Aktivitas Approval">
                                <span className={`${AKSI_CLASS} bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30`}
                                    onClick={() => bukaLog(p.id_pengisian)}>
                                    <HiOutlineClipboardList className="text-lg" />
                                </span>
                            </Tooltip>
                        )}
                        {p.bisa_diubah && (
                            <>
                                <Tooltip title="Edit">
                                    <span className={AKSI_BIRU} onClick={() => router.push(ROUTES.KAS_KECIL_PENGISIAN_EDIT(p.id_pengisian))}>
                                        <HiOutlinePencilAlt className="text-lg" />
                                    </span>
                                </Tooltip>
                                <Tooltip title="Hapus">
                                    <span className={`${AKSI_CLASS} bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30`}
                                        onClick={() => setDeleteTarget(p)}>
                                        <HiOutlineTrash className="text-lg" />
                                    </span>
                                </Tooltip>
                            </>
                        )}
                    </div>
                )
            },
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari nomor pengisian atau keterangan... (tekan Enter)"
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

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Pengisian Kas Kecil?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">
                    Pengisian <span className="font-semibold">{deleteTarget?.nomor_pengisian}</span> sebesar{' '}
                    <span className="font-semibold">{formatRupiah(deleteTarget?.nominal)}</span> beserta pengajuannya akan dihapus.
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            {dialogLog}
        </div>
    )
}
