'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye, HiOutlineClipboardList } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { pembelianSparepartService, PembelianSparepart, PengajuanKeuanganInfo } from '@/services/pembelianSparepart.service'
import { supplierService } from '@/services/supplier.service'
import { STATUS_TAG, STATUS_LABEL, bolehDiubahAtauDihapus } from './status'

type Option = { value: string; label: string }

const STATUS_OPTIONS: Option[] = [
    { value: '', label: 'Semua Status' },
    ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

export default function DaftarPembelianTab() {
    const router = useRouter()
    const [list, setList]             = useState<PembelianSparepart[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter]     = useState('')
    const [supplierFilter, setSupplierFilter] = useState('')
    const [supplierOptions, setSupplierOptions] = useState<Option[]>([])
    const [dari, setDari]     = useState<Date | null>(null)
    const [sampai, setSampai] = useState<Date | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<PembelianSparepart | null>(null)
    const [logOpen, setLogOpen]       = useState(false)
    const [logTarget, setLogTarget]   = useState<PembelianSparepart | null>(null)
    const [logInfo, setLogInfo]       = useState<PengajuanKeuanganInfo | null>(null)
    const [logLoading, setLogLoading] = useState(false)

    const openLog = (p: PembelianSparepart) => {
        setLogTarget(p)
        setLogOpen(true)
        setLogInfo(null)
        setLogLoading(true)
        pembelianSparepartService.get(p.id_pembelian)
            .then(d => setLogInfo(d.pengajuan_keuangan ?? null))
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLogLoading(false))
    }

    useEffect(() => {
        supplierService.list({ limit: 999 })
            .then(res => setSupplierOptions(res.data.map(s => ({ value: s.id_supplier, label: s.nama }))))
            .catch(() => {})
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await pembelianSparepartService.list({
                page: currentPage,
                limit: pageSize,
                search: search || undefined,
                status: statusFilter || undefined,
                id_supplier: supplierFilter || undefined,
                dari: dari ? dayjs(dari).format('YYYY-MM-DD') : undefined,
                sampai: sampai ? dayjs(sampai).format('YYYY-MM-DD') : undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter, supplierFilter, dari, sampai])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await pembelianSparepartService.remove(deleteTarget.id_pembelian)
            toast.push(<Notification type="success" title="Pengajuan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<PembelianSparepart>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<PembelianSparepart, unknown>) =>
                props.row.index + 1 + (currentPage - 1) * pageSize,
        },
        {
            header: 'Nomor', accessorKey: 'nomor_pengajuan', size: 180,
            cell: ({ row }) => (
                <span className="font-mono font-semibold">{row.original.nomor_pengajuan}</span>
            ),
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal_pengajuan', size: 130,
            cell: ({ row }) => dayjs(row.original.tanggal_pengajuan).format('DD MMM YYYY'),
        },
        {
            header: 'Supplier', accessorKey: 'nama_supplier', size: 180,
            cell: ({ row }) => (
                <span className="font-semibold">
                    {row.original.nama_supplier ?? row.original.id_supplier}
                </span>
            ),
        },
        {
            header: 'Armada', accessorKey: 'nopol_armada', size: 130,
            cell: ({ row }) =>
                row.original.nopol_armada ?? <span className="text-gray-400">—</span>,
        },
        {
            header: 'Total Estimasi', accessorKey: 'total_estimasi', size: 150,
            cell: ({ row }) => (
                <span className="tabular-nums">{formatRupiah(row.original.total_estimasi)}</span>
            ),
        },
        {
            header: 'Total Aktual', accessorKey: 'total_aktual', size: 150,
            cell: ({ row }) => {
                const { total_aktual, selisih } = row.original
                if (total_aktual === null) return <span className="text-gray-400">—</span>
                const merah = selisih !== null && selisih > 0
                return (
                    <span className={`tabular-nums ${merah ? 'text-red-500 font-semibold' : ''}`}>
                        {formatRupiah(total_aktual)}
                    </span>
                )
            },
        },
        {
            header: 'Status', accessorKey: 'status', size: 150,
            cell: ({ row }) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {STATUS_LABEL[row.original.status] ?? row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'aksi', size: 90,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.PEMBELIAN_SPAREPART_DETAIL(row.original.id_pembelian))}
                        >
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Log Aktivitas Approval">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                            onClick={() => openLog(row.original)}
                        >
                            <HiOutlineClipboardList className="text-lg" />
                        </span>
                    </Tooltip>
                    {bolehDiubahAtauDihapus(row.original.status, row.original.id_perawatan) && (
                        <Tooltip title="Hapus">
                            <span
                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                onClick={() => setDeleteTarget(row.original)}
                            >
                                <HiOutlineTrash className="text-lg" />
                            </span>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nomor pengajuan... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-44 shrink-0">
                        <Select<Option>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatusFilter((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-52 shrink-0">
                        <Select<Option>
                            isClearable isSearchable
                            placeholder="Semua Supplier"
                            options={supplierOptions}
                            value={supplierOptions.find(o => o.value === supplierFilter) ?? null}
                            onChange={opt => { setSupplierFilter((opt as Option | null)?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker inputFormat="DD/MM/YYYY" placeholder="Dari tanggal"
                            value={dari}
                            onChange={date => { setDari(date); setCurrentPage(1) }} />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker inputFormat="DD/MM/YYYY" placeholder="Sampai tanggal"
                            value={sampai}
                            onChange={date => { setSampai(date); setCurrentPage(1) }} />
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={list as unknown[]}
                    loading={loading}
                    noData={!loading && list.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Pengajuan"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus pengajuan {deleteTarget?.nomor_pengajuan}? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            <LogAktivitasKeuanganDialog
                isOpen={logOpen}
                info={logInfo}
                loading={logLoading}
                emptyMessage={logTarget?.id_perawatan
                    ? 'Approval keuangan pembelian ini mengikuti pengajuan perawatan terkait.'
                    : 'Belum ada pengajuan keuangan.'}
                onClose={() => setLogOpen(false)}
            />
        </div>
    )
}
