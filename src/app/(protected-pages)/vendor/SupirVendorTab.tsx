'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Card, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { supirVendorService, SupirVendor } from '@/services/supirVendor.service'
import { kontrakVendorService } from '@/services/kontrak-vendor.service'
import { Vendor } from '@/services/vendor.service'
import dayjs from 'dayjs'

type VendorOption = { value: string; label: string }

export default function SupirVendorTab() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialIdVendor = searchParams.get('id_vendor') ?? ''

    const [list, setList]             = useState<SupirVendor[]>([])
    const [loading, setLoading]       = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [idVendorFilter, setIdVendorFilter] = useState(initialIdVendor)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([])
    const [kontrakLabelMap, setKontrakLabelMap] = useState<Record<string, string>>({})

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 100 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
        kontrakVendorService.list(1, { limit: '500' })
            .then(res => {
                const peta: Record<string, string> = {}
                res.data.forEach(k => { peta[k.id_kontrak_vendor] = k.nomor_kontrak || `Kontrak ${k.id_kontrak_vendor.slice(0, 8)}` })
                setKontrakLabelMap(peta)
            })
            .catch(() => {})
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await supirVendorService.list(currentPage, pageSize, idVendorFilter || undefined, search || undefined)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, idVendorFilter, search])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

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
            header: 'Kontrak', accessorKey: 'id_kontrak_vendor',
            cell: ({ row }) => {
                const idKontrak = row.original.id_kontrak_vendor
                if (!idKontrak) return <span className="text-gray-400">—</span>
                return kontrakLabelMap[idKontrak] ?? idKontrak.slice(0, 8)
            },
        },
        {
            header: 'Telepon', accessorKey: 'telepon',
            cell: ({ row }) => row.original.telepon ?? <span className="text-gray-400">—</span>,
        },
        {
            header: 'No SIM', accessorKey: 'no_sim',
            cell: ({ row }) => {
                const tgl = row.original.masa_berlaku_sim
                const expired = tgl ? dayjs(tgl).isBefore(dayjs(), 'day') : false
                return (
                    <div>
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{row.original.no_sim ?? '-'}</span>
                        {expired && <p className="text-xs text-red-500 mt-0.5">SIM habis masa berlaku</p>}
                    </div>
                )
            },
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
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
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
