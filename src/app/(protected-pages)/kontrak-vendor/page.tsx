'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kontrakVendorService, KontrakVendor } from '@/services/kontrak-vendor.service'

const MEKANISME_LABEL: Record<string, string> = {
    unit_only:   'Unit Only',
    unit_driver: 'Unit + Driver',
    full:        'Full',
}

export default function KontrakVendorPage() {
    const router = useRouter()
    const [list, setList]             = useState<KontrakVendor[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]                    = useState(15)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<KontrakVendor | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await kontrakVendorService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await kontrakVendorService.delete(deleteTarget.id_kontrak_vendor)
            toast.push(<Notification type="success" title="Kontrak berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredList = list.filter(k =>
        !search || (k.vendor?.nama_vendor ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (k.mekanisme ?? '').toLowerCase().includes(search.toLowerCase())
    )

    const columns: ColumnDef<KontrakVendor>[] = [
        { header: 'No', cell: (props: CellContext<KontrakVendor, unknown>) => props.row.index + 1 + (currentPage - 1) * pageSize, size: 60 },
        { header: 'Vendor', accessorKey: 'vendor', cell: ({ row }) => row.original.vendor?.nama_vendor ?? row.original.id_vendor },
        { header: 'Mekanisme', accessorKey: 'mekanisme', cell: ({ row }) => MEKANISME_LABEL[row.original.mekanisme] ?? row.original.mekanisme },
        { header: 'Nilai Kontrak', accessorKey: 'nilai_kontrak', cell: ({ row }) => row.original.nilai_kontrak ? formatRupiah(row.original.nilai_kontrak) : '-' },
        { header: 'Mulai', accessorKey: 'tanggal_mulai', cell: ({ row }) => row.original.tanggal_mulai ?? '-' },
        { header: 'Selesai', accessorKey: 'tanggal_selesai', cell: ({ row }) => row.original.tanggal_selesai ?? '-' },
        {
            header: 'Status', accessorKey: 'status',
            cell: ({ row }) => row.original.status ? (
                <Tag className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100">
                    {row.original.status}
                </Tag>
            ) : '-',
        },
        {
            header: 'Aksi', id: 'aksi',
            cell: ({ row }) => (
                <div className="flex gap-1">
                    <Tooltip title="Detail">
                        <Button size="xs" variant="plain" icon={<HiOutlineEye />}
                            onClick={() => router.push(ROUTES.KONTRAK_VENDOR_DETAIL(row.original.id_kontrak_vendor))} />
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                            onClick={() => setDeleteTarget(row.original)} />
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Kontrak Vendor</h2>
                <Button size="sm" variant="solid" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.KONTRAK_VENDOR_BARU)}>Tambah Kontrak</Button>
            </div>

            <Card>
                <div className="flex gap-2 mb-4">
                    <Input placeholder="Cari vendor / mekanisme..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
                        prefix={<HiOutlineSearch />} className="w-72" />
                    <Button size="sm" onClick={handleSearchSubmit}>Cari</Button>
                    {search && <Button size="sm" variant="plain" icon={<HiOutlineX />} onClick={handleSearchClear} />}
                </div>
                <DataTable columns={columns} data={filteredList} loading={loading}
                    noData={!loading && filteredList.length === 0}
                    pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                    onPaginationChange={setCurrentPage} />
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Kontrak"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus kontrak ini? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
