'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineDocumentAdd } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { permintaanVendorService, PermintaanVendor, ringkasanUnitDiminta } from '@/services/permintaan-vendor.service'
import dayjs from 'dayjs'

const MEKANISME_LABEL: Record<string, string> = {
    unit_only:   'Unit Only',
    unit_driver: 'Unit + Driver',
    full:        'All In',
}

export default function PermintaanSiapKontrakTab() {
    const router = useRouter()
    const [list, setList]               = useState<PermintaanVendor[]>([])
    const [loading, setLoading]         = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await permintaanVendorService.list(currentPage, {
                limit: pageSize,
                status: 'disetujui',
                search: search || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const columns: ColumnDef<PermintaanVendor>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<PermintaanVendor, unknown>) =>
                props.row.index + 1 + (currentPage - 1) * pageSize,
        },
        {
            header: 'No. Permintaan', accessorKey: 'nomor_permintaan', size: 190,
            cell: ({ row }) => (
                <div>
                    <span className="font-mono text-sm font-semibold">{row.original.nomor_permintaan}</span>
                    {row.original.dibuat_pada && (
                        <p className="text-xs text-gray-400 mt-0.5">Diajukan {dayjs(row.original.dibuat_pada).format('DD MMM YYYY')}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Proyek', accessorKey: 'nama_proyek',
            cell: ({ row }) => row.original.nama_proyek
                ? <span className="font-semibold">{row.original.nama_proyek}</span>
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Unit Diminta', id: 'unit', size: 220,
            cell: ({ row }) => <span>{ringkasanUnitDiminta(row.original)}</span>,
        },
        {
            header: 'Mekanisme', accessorKey: 'mekanisme', size: 150,
            cell: ({ row }) => (
                <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {MEKANISME_LABEL[row.original.mekanisme] ?? row.original.mekanisme}
                </Tag>
            ),
        },
        {
            header: 'Periode', id: 'periode', size: 200,
            cell: ({ row }) => {
                const { periode_dari: dari, periode_sampai: sampai } = row.original
                if (!dari && !sampai) return <span className="text-gray-400">—</span>
                return (
                    <span className="text-sm">
                        {dari ? dayjs(dari).format('DD MMM YYYY') : '—'} – {sampai ? dayjs(sampai).format('DD MMM YYYY') : '—'}
                    </span>
                )
            },
        },
        {
            header: 'Status', id: 'status', size: 130,
            cell: () => (
                <Tag className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Disetujui</Tag>
            ),
        },
        {
            header: '', id: 'aksi', size: 90,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Detail Permintaan">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.PERMINTAAN_VENDOR_DETAIL(row.original.id_permintaan))}
                        >
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Buat Kontrak">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                            onClick={() => router.push(`${ROUTES.KONTRAK_VENDOR_BARU}?id_permintaan=${row.original.id_permintaan}`)}
                        >
                            <HiOutlineDocumentAdd className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <Input
                        className="w-full sm:w-80"
                        placeholder="Cari nomor permintaan / proyek..."
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <p className="text-sm text-gray-500">Permintaan dari sales yang sudah disetujui dan belum dibuatkan kontrak</p>
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
        </div>
    )
}
