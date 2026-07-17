'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlinePlus, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { perawatanArmadaService, PerawatanArmadaWithArmada, StatusPerawatan } from '@/services/perawatanArmada.service'
import { armadaService, Armada } from '@/services/armada.service'

type Option = { value: string; label: string }

const STATUS_OPTIONS: { value: StatusPerawatan | ''; label: string }[] = [
    { value: '',             label: 'Semua Status' },
    { value: 'terjadwal',    label: 'Terjadwal' },
    { value: 'dalam_proses', label: 'Dalam Proses' },
    { value: 'selesai',      label: 'Selesai' },
]

const STATUS_CLASS: Record<string, string> = {
    terjadwal:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    dalam_proses: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    selesai:      'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
}

function getServisBadge(tanggal: string | null): { label: string; className: string } | null {
    if (!tanggal) return null
    const days = Math.ceil((new Date(tanggal).getTime() - Date.now()) / 86400000)
    if (days < 0)  return { label: 'Lewat jadwal', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' }
    return null
}

export default function PerawatanArmadaPage() {
    const router = useRouter()
    const [list, setList]       = useState<PerawatanArmadaWithArmada[]>([])
    const [loading, setLoading] = useState(false)
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [armadaFilter, setArmadaFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusPerawatan | ''>('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<PerawatanArmadaWithArmada | null>(null)
    const [deleting, setDeleting]         = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await perawatanArmadaService.listAll({
                page: currentPage, limit: pageSize,
                id_armada: armadaFilter || undefined,
                status: statusFilter || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, armadaFilter, statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        armadaService.list(1, 100).then(res => {
            setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol })))
        }).catch(() => {})
    }, [])

    const handleSearchSubmit = () => setSearch(searchInput)
    const handleSearchClear  = () => { setSearchInput(''); setSearch('') }

    const filteredList = list.filter(p => {
        if (!search) return true
        const q = search.toLowerCase()
        return p.jenis_perawatan.toLowerCase().includes(q) || (p.armada_nopol ?? '').toLowerCase().includes(q)
    })

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await perawatanArmadaService.delete(deleteTarget.id_armada, deleteTarget.id_perawatan)
            toast.push(<Notification type="success" title="Data perawatan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleting(false)
        }
    }

    const columns: ColumnDef<PerawatanArmadaWithArmada>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'Armada', accessorKey: 'armada_nopol', size: 130,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) => (
                <span className="font-mono text-xs font-semibold">{row.original.armada_nopol ?? '—'}</span>
            ),
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal', size: 120,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) =>
                dayjs(row.original.tanggal).format('DD MMM YYYY'),
        },
        { header: 'Jenis Perawatan', accessorKey: 'jenis_perawatan', size: 180 },
        {
            header: 'Biaya', accessorKey: 'biaya', size: 130,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) => formatRupiah(row.original.biaya),
        },
        {
            header: 'KM Odometer', accessorKey: 'km_odometer', size: 120,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) =>
                row.original.km_odometer != null
                    ? <span className="font-mono text-xs">{formatNum(row.original.km_odometer)} km</span>
                    : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Servis Berikutnya', accessorKey: 'jadwal_servis_berikutnya', size: 160,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) => {
                const tgl = row.original.jadwal_servis_berikutnya
                if (!tgl) return <span className="text-gray-400">—</span>
                const badge = getServisBadge(tgl)
                return (
                    <div>
                        <p className="text-xs">{dayjs(tgl).format('DD MMM YYYY')}</p>
                        {badge && <Tag className={`text-xs font-semibold mt-1 ${badge.className}`}>{badge.label}</Tag>}
                    </div>
                )
            },
        },
        {
            header: 'Status', accessorKey: 'status', size: 130,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) => (
                <Tag className={`text-xs font-semibold ${STATUS_CLASS[row.original.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'action', size: 90,
            cell: ({ row }: CellContext<PerawatanArmadaWithArmada, unknown>) => (
                <div className="flex items-center justify-end gap-1">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_DETAIL(row.original.id_perawatan)}?armada=${row.original.id_armada}`)}>
                            <HiOutlinePencilAlt className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                            onClick={() => setDeleteTarget(row.original)}>
                            <HiOutlineTrash className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Perawatan Armada</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Riwayat perawatan seluruh armada</p>
                </div>
                <Button variant="solid" icon={<HiOutlinePlus />} onClick={() => router.push(ROUTES.PERAWATAN_ARMADA_BARU)}>Catat Perawatan</Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari jenis perawatan atau nopol... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-52 shrink-0">
                        <Select
                            placeholder="Semua Armada"
                            isClearable
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === armadaFilter) ?? null}
                            onChange={(opt) => { setArmadaFilter((opt as Option | null)?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                        <Select
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as { value: StatusPerawatan | '' }).value); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={filteredList as unknown[]}
                    loading={loading}
                    noData={!loading && filteredList.length === 0}
                    pagingData={{ total, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={(size) => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Data Perawatan"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>Hapus data perawatan &quot;{deleteTarget?.jenis_perawatan}&quot; untuk armada {deleteTarget?.armada_nopol}?</p>
            </ConfirmDialog>
        </div>
    )
}
