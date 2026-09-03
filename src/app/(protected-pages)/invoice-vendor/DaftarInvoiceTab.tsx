'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import dayjs from 'dayjs'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { invoiceVendorService, InvoiceVendor } from '@/services/invoice-vendor.service'
import { Vendor } from '@/services/vendor.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: Option[] = [
    { value: '',                 label: 'Semua Verifikasi' },
    { value: 'draft',            label: 'Draft' },
    { value: 'menunggu_approval', label: 'Menunggu Approval' },
    { value: 'diverifikasi',     label: 'Diverifikasi' },
    { value: 'ditolak',          label: 'Ditolak' },
]

const STATUS_PEMBAYARAN_OPTIONS: Option[] = [
    { value: '',         label: 'Semua Pembayaran' },
    { value: 'belum',    label: 'Belum Dibayar' },
    { value: 'sebagian', label: 'Dibayar Sebagian' },
    { value: 'lunas',    label: 'Lunas' },
]

export const STATUS_TAG: Record<string, string> = {
    draft:             'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300',
    menunggu_approval: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    diverifikasi:      'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

export const STATUS_LABEL: Record<string, string> = {
    draft:             'Draft',
    menunggu_approval: 'Menunggu Approval',
    diverifikasi:      'Diverifikasi',
    ditolak:           'Ditolak',
}

export const BAYAR_TAG: Record<string, string> = {
    belum:    'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-100',
    sebagian: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-100',
    lunas:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
}

export const BAYAR_LABEL: Record<string, string> = {
    belum:    'Belum Dibayar',
    sebagian: 'Dibayar Sebagian',
    lunas:    'Lunas',
}

export default function DaftarInvoiceTab() {
    const router = useRouter()
    const [list, setList]             = useState<InvoiceVendor[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter]           = useState('')
    const [bayarFilter, setBayarFilter]             = useState('')
    const [vendorFilter, setVendorFilter]           = useState('')
    const [vendorOptions, setVendorOptions]         = useState<Option[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<InvoiceVendor | null>(null)

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 999 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await invoiceVendorService.list(currentPage, pageSize, search, {
                status: statusFilter,
                status_pembayaran: bayarFilter,
                id_vendor: vendorFilter,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter, bayarFilter, vendorFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await invoiceVendorService.remove(deleteTarget.id_invoice_vendor)
            toast.push(<Notification type="success" title="Invoice berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<InvoiceVendor>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<InvoiceVendor, unknown>) =>
                props.row.index + 1 + (currentPage - 1) * pageSize,
        },
        {
            header: 'Nomor', accessorKey: 'nomor_invoice', size: 180,
            cell: ({ row }) => (
                <span className="font-mono font-semibold">{row.original.nomor_invoice}</span>
            ),
        },
        {
            header: 'Vendor', accessorKey: 'vendor', size: 200,
            cell: ({ row }) => (
                <span className="font-semibold">
                    {row.original.vendor?.nama_vendor ?? row.original.id_vendor}
                </span>
            ),
        },
        {
            header: 'Nilai Kontrak', accessorKey: 'nilai_kontrak', size: 160,
            cell: ({ row }) => row.original.nilai_kontrak != null
                ? <span className="tabular-nums">{formatRupiah(row.original.nilai_kontrak)}</span>
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal_invoice', size: 130,
            cell: ({ row }) => dayjs(row.original.tanggal_invoice).format('DD MMM YYYY'),
        },
        {
            header: 'Jatuh Tempo', accessorKey: 'jatuh_tempo', size: 140,
            cell: ({ row }) => {
                const tgl = row.original.jatuh_tempo
                if (!tgl) return <span className="text-gray-400">—</span>
                const lewat = dayjs(tgl).isBefore(dayjs(), 'day') && row.original.status_pembayaran !== 'lunas'
                return (
                    <span className={lewat ? 'text-red-500 font-medium' : ''}>
                        {dayjs(tgl).format('DD MMM YYYY')}
                    </span>
                )
            },
        },
        {
            header: 'Total', accessorKey: 'total', size: 160,
            cell: ({ row }) => (
                <span className="font-semibold tabular-nums">{formatRupiah(row.original.total)}</span>
            ),
        },
        {
            header: 'Verifikasi', accessorKey: 'status', size: 130,
            cell: ({ row }) => (
                <Tag className={STATUS_TAG[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {STATUS_LABEL[row.original.status] ?? row.original.status}
                </Tag>
            ),
        },
        {
            header: 'Pembayaran', accessorKey: 'status_pembayaran', size: 120,
            cell: ({ row }) => (
                <Tag className={BAYAR_TAG[row.original.status_pembayaran] ?? 'bg-gray-100 text-gray-600'}>
                    {BAYAR_LABEL[row.original.status_pembayaran] ?? row.original.status_pembayaran}
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
                            onClick={() => router.push(ROUTES.INVOICE_VENDOR_DETAIL(row.original.id_invoice_vendor))}
                        >
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    {(row.original.status === 'draft' || row.original.status === 'ditolak') && (
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
                        placeholder="Cari nomor invoice... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-44 shrink-0">
                        <Select<Option>
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatusFilter((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-44 shrink-0">
                        <Select<Option>
                            options={STATUS_PEMBAYARAN_OPTIONS}
                            value={STATUS_PEMBAYARAN_OPTIONS.find(o => o.value === bayarFilter) ?? STATUS_PEMBAYARAN_OPTIONS[0]}
                            onChange={opt => { setBayarFilter((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-52 shrink-0">
                        <Select<Option>
                            isClearable isSearchable
                            placeholder="Semua Vendor"
                            options={vendorOptions}
                            value={vendorOptions.find(o => o.value === vendorFilter) ?? null}
                            onChange={opt => { setVendorFilter(opt?.value ?? ''); setCurrentPage(1) }}
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
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Invoice"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus invoice {deleteTarget?.nomor_invoice}? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
