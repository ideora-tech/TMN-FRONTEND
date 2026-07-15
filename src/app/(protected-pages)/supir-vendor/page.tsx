'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Card, Button, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { supirVendorService, SupirVendor } from '@/services/supirVendor.service'
import { Vendor } from '@/services/vendor.service'

type VendorOption = { value: string; label: string }

export default function SupirVendorPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialIdVendor = searchParams.get('id_vendor') ?? ''

    const [list, setList]             = useState<SupirVendor[]>([])
    const [loading, setLoading]       = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [idVendorFilter, setIdVendorFilter] = useState(initialIdVendor)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]                    = useState(15)
    const [total, setTotal]             = useState(0)
    const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([])

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 100 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await supirVendorService.list(currentPage, pageSize, idVendorFilter || undefined)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, idVendorFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const filteredList = list.filter(s =>
        !search ||
        s.nama.toLowerCase().includes(search.toLowerCase()) ||
        (s.no_sim ?? '').toLowerCase().includes(search.toLowerCase())
    )

    const columns: ColumnDef<SupirVendor>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<SupirVendor, unknown>) =>
                props.row.index + 1 + (currentPage - 1) * pageSize,
        },
        {
            header: 'Nama', accessorKey: 'nama',
            cell: ({ row }) => <span className="font-semibold">{row.original.nama}</span>,
        },
        {
            header: 'Vendor', accessorKey: 'nama_vendor',
            cell: ({ row }) => row.original.nama_vendor ?? <span className="text-gray-400">—</span>,
        },
        {
            header: 'Telepon', accessorKey: 'telepon',
            cell: ({ row }) => row.original.telepon ?? <span className="text-gray-400">—</span>,
        },
        {
            header: 'No SIM', accessorKey: 'no_sim',
            cell: ({ row }) => <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.original.no_sim ?? '-'}</span>,
        },
        {
            header: 'Status', accessorKey: 'aktif', size: 120,
            cell: ({ row }) => (
                <Tag className={row.original.aktif
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                    : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'}>
                    {row.original.aktif ? 'Aktif' : 'Nonaktif'}
                </Tag>
            ),
        },
        {
            header: '', id: 'aksi', size: 70,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.SUPIR_VENDOR_DETAIL(row.original.id_supir_vendor))}
                        >
                            <HiOutlineEye className="text-lg" />
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
                    <h3 className="font-bold">Supir Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Data master supir milik vendor</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.SUPIR_VENDOR_BARU)}>
                    Tambah Supir Vendor
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari nama atau no SIM... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-56 shrink-0">
                        <Select
                            isSearchable
                            isClearable
                            placeholder="Semua Vendor"
                            options={vendorOptions}
                            value={vendorOptions.find(o => o.value === idVendorFilter) ?? null}
                            onChange={opt => { setIdVendorFilter(opt?.value ?? ''); setCurrentPage(1) }}
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
                />
            </Card>
        </div>
    )
}
