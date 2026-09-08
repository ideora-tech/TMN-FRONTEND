'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import dayjs from 'dayjs'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineTrash, HiPlusCircle } from 'react-icons/hi'
import { permintaanVendorService, PermintaanVendor, PermintaanVendorStatus, ringkasanUnitDiminta } from '@/services/permintaan-vendor.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'

type StatusOption = { value: '' | PermintaanVendorStatus; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '',                  label: 'Semua Status' },
    { value: 'draft',             label: 'Draft' },
    { value: 'menunggu_approval', label: 'Menunggu Approval' },
    { value: 'disetujui',         label: 'Disetujui' },
    { value: 'ditolak',           label: 'Ditolak' },
    { value: 'dikontrakkan',      label: 'Dikontrakkan' },
]

const STATUS_CLASS: Record<string, string> = {
    draft:             'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    menunggu_approval: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
    disetujui:         'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    ditolak:           'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
    dikontrakkan:      'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', menunggu_approval: 'Menunggu Approval', disetujui: 'Disetujui', ditolak: 'Ditolak', dikontrakkan: 'Dikontrakkan',
}

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'All In',
}

const BISA_UBAH: PermintaanVendorStatus[] = ['draft', 'ditolak']

export default function PermintaanVendorPage() {
    const router = useRouter()
    const [data, setData]               = useState<PermintaanVendor[]>([])
    const [loading, setLoading]         = useState(true)
    const [search, setSearch]           = useState('')
    const [status, setStatus]           = useState<'' | PermintaanVendorStatus>('')
    const [currentPage, setCurrentPage] = useState(1)
    const [total, setTotal]             = useState(0)
    const pageSize = 10

    const [deleteTarget, setDeleteTarget]   = useState<PermintaanVendor | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        permintaanVendorService.list(currentPage, {
            limit: pageSize,
            search: search || undefined,
            status: status || undefined,
        })
            .then(res => { setData(res.data ?? []); setTotal(res.meta?.total ?? 0) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [currentPage, search, status])

    useEffect(() => { load() }, [load])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleteLoading(true)
        try {
            await permintaanVendorService.delete(deleteTarget.id_permintaan)
            toast.push(<Notification type="success" title="Permintaan berhasil dihapus" />)
            setDeleteTarget(null)
            load()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setDeleteLoading(false)
        }
    }

    const columns: ColumnDef<PermintaanVendor>[] = [
        { header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        { header: 'Permintaan', accessorKey: 'nomor_permintaan',
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) => (
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-sm flex-shrink-0 select-none">
                        {row.original.nomor_permintaan.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">{row.original.nomor_permintaan}</p>
                </div>
            ),
        },
        { header: 'Proyek', id: 'proyek',
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) =>
                row.original.nama_proyek
                    ? <span className="text-sm text-gray-700 dark:text-gray-300">{row.original.nama_proyek}</span>
                    : <span className="text-gray-400">—</span>,
        },
        { header: 'Kebutuhan', id: 'kebutuhan', size: 170,
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                    {ringkasanUnitDiminta(row.original)}
                </span>
            ),
        },
        { header: 'Mekanisme', accessorKey: 'mekanisme', size: 130,
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) => (
                <span className="text-sm text-gray-600 dark:text-gray-300">{MEKANISME_LABEL[row.original.mekanisme] ?? row.original.mekanisme}</span>
            ),
        },
        { header: 'Periode', id: 'periode', size: 190,
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) => {
                const { periode_dari, periode_sampai } = row.original
                if (!periode_dari && !periode_sampai) return <span className="text-gray-400">—</span>
                const fmt = (v: string | null) => v ? dayjs(v).format('DD/MM/YYYY') : '…'
                return <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{fmt(periode_dari)} – {fmt(periode_sampai)}</span>
            },
        },
        { header: 'Status', accessorKey: 'status', size: 150,
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) => (
                <Tag className={`${STATUS_CLASS[row.original.status] ?? 'bg-gray-100 text-gray-600'} border-0`}>
                    {STATUS_LABEL[row.original.status] ?? row.original.status}
                </Tag>
            ),
        },
        { header: '', id: 'aksi', size: 120,
            cell: ({ row }: CellContext<PermintaanVendor, unknown>) => {
                const p = row.original
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Tooltip title="Lihat Detail">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 cursor-pointer transition-colors"
                                onClick={() => router.push(ROUTES.PERMINTAAN_VENDOR_DETAIL(p.id_permintaan))}>
                                <HiOutlineEye className="text-base" />
                            </span>
                        </Tooltip>
                        {BISA_UBAH.includes(p.status) && (
                            <Tooltip title="Hapus">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 cursor-pointer transition-colors"
                                    onClick={() => setDeleteTarget(p)}>
                                    <HiOutlineTrash className="text-base" />
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
                    <h3 className="font-bold">Permintaan Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kebutuhan unit dari vendor — disetujui dulu sebelum dibuatkan kontrak</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.PERMINTAAN_VENDOR_BARU)}>
                    Tambah Permintaan
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari nomor permintaan..."
                            suffix={search
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearch(''); setCurrentPage(1) }} />
                                : <HiOutlineSearch className="text-gray-400" />}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select<StatusOption>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatus(opt?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable<PermintaanVendor>
                    columns={columns}
                    data={data}
                    loading={loading}
                    noData={!loading && data.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={() => {}}
                />
            </Card>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Permintaan"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: deleteLoading, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">Permintaan <span className="font-semibold">{deleteTarget?.nomor_permintaan}</span> akan dihapus secara permanen. Lanjutkan?</p>
            </ConfirmDialog>
        </div>
    )
}
