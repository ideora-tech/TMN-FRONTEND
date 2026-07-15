'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tooltip, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { laporanService, Laporan } from '@/services/laporan.service'
import dayjs from 'dayjs'
import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import LaporanTripTab from './LaporanTripTab'

export default function LaporanPage() {
    const router = useRouter()

    const [tab, setTab] = useState<'proyek' | 'trip'>('proyek')

    const [list, setList]       = useState<Laporan[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [downloading, setDownloading] = useState<'excel' | 'pdf' | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await laporanService.list(currentPage)
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

    const downloadFile = async (url: string, filename: string, type: 'excel' | 'pdf') => {
        setDownloading(type)
        try {
            const res = await axios.get(url, { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloading(null)
        }
    }

    const handleExcelDownload = () => downloadFile(API_ENDPOINTS.LAPORAN_EXPORT_EXCEL, `laporan-${new Date().toISOString().slice(0,10)}.xlsx`, 'excel')
    const handlePdfDownload   = () => downloadFile(API_ENDPOINTS.LAPORAN_EXPORT_PDF,   `laporan-${new Date().toISOString().slice(0,10)}.pdf`,  'pdf')

    const filteredList = list.filter(l =>
        !search || l.id_proyek.toLowerCase().includes(search.toLowerCase())
    )

    const columns: ColumnDef<Laporan>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: ({ row }: CellContext<Laporan, unknown>) =>
                (currentPage - 1) * pageSize + row.index + 1,
        },
        {
            header: 'ID Proyek', accessorKey: 'id_proyek', size: 260,
            cell: ({ row }: CellContext<Laporan, unknown>) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.original.id_proyek}</span>
            ),
        },
        {
            header: 'Total Trip', accessorKey: 'total_trip', size: 120,
            cell: ({ row }: CellContext<Laporan, unknown>) => (
                <span className="font-semibold">{row.original.total_trip}</span>
            ),
        },
        {
            header: 'Diserahkan', accessorKey: 'diserahkan_pada', size: 180,
            cell: ({ row }: CellContext<Laporan, unknown>) =>
                row.original.diserahkan_pada
                    ? dayjs(row.original.diserahkan_pada).format('DD/MM/YYYY HH:mm')
                    : '-',
        },
        {
            header: '', id: 'action', size: 80,
            cell: ({ row }: CellContext<Laporan, unknown>) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.LAPORAN_DETAIL(row.original.id_laporan))}
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
                    <h3 className="font-bold">Laporan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Laporan proyek dan trip</p>
                </div>
                {tab === 'proyek' && (
                    <Button
                        variant="solid" size="sm"
                        icon={<HiPlusCircle />}
                        onClick={() => router.push(ROUTES.LAPORAN_BARU)}
                    >
                        Buat Laporan
                    </Button>
                )}
            </div>
            <Card
                header={{
                    extra: (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm" variant={tab === 'proyek' ? 'solid' : 'default'}
                                onClick={() => setTab('proyek')}
                            >
                                Laporan Proyek
                            </Button>
                            <Button
                                size="sm" variant={tab === 'trip' ? 'solid' : 'default'}
                                onClick={() => setTab('trip')}
                            >
                                Laporan Trip
                            </Button>
                            {tab === 'proyek' && (
                                <>
                                    <Button
                                        size="sm" variant="default"
                                        loading={downloading === 'excel'}
                                        onClick={handleExcelDownload}
                                    >
                                        Export Excel
                                    </Button>
                                    <Button
                                        size="sm" variant="default"
                                        loading={downloading === 'pdf'}
                                        onClick={handlePdfDownload}
                                    >
                                        Export PDF
                                    </Button>
                                </>
                            )}
                        </div>
                    ),
                    bordered: false,
                }}
                bodyClass="p-0"
            >
                {tab === 'proyek' ? (
                    <>
                        <div className="flex items-center gap-3 px-4 py-3">
                            <Input
                                className="flex-1"
                                placeholder="Cari ID proyek... (tekan Enter)"
                                suffix={
                                    searchInput
                                        ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                        : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                                }
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                            />
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
                    </>
                ) : (
                    <LaporanTripTab />
                )}
            </Card>
        </div>
    )
}
