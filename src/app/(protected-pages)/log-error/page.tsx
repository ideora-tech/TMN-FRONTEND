'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, toast, Notification } from '@/components/ui'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineEye, HiOutlineRefresh } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { logErrorService, LogError } from '@/services/logError.service'

const LEVEL_CLASS: Record<string, string> = {
    debug:    'bg-gray-100 text-gray-600',
    info:     'bg-blue-100 text-blue-600',
    warning:  'bg-yellow-100 text-yellow-700',
    error:    'bg-red-100 text-red-600',
    critical: 'bg-red-200 text-red-800 font-bold',
}

export default function LogErrorPage() {
    const router = useRouter()
    const [list, setList]         = useState<LogError[]>([])
    const [loading, setLoading]   = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]              = useState(20)
    const [total, setTotal]       = useState(0)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await logErrorService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const columns: ColumnDef<LogError>[] = [
        {
            header: 'Level', accessorKey: 'level', size: 90,
            cell: ({ row }) => (
                <Tag className={LEVEL_CLASS[row.original.level] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.level}
                </Tag>
            ),
        },
        {
            header: 'Pesan', accessorKey: 'pesan',
            cell: ({ row }) => (
                <span className="line-clamp-1 text-sm">{row.original.pesan}</span>
            ),
        },
        { header: 'Method', accessorKey: 'metode_http', size: 80, cell: ({ row }) => <span className="font-mono text-xs">{row.original.metode_http ?? '-'}</span> },
        { header: 'Jalur', accessorKey: 'jalur', cell: ({ row }) => <span className="font-mono text-xs">{row.original.jalur ?? '-'}</span> },
        { header: 'Status', accessorKey: 'kode_status', size: 70, cell: ({ row }) => row.original.kode_status ?? '-' },
        {
            header: 'Waktu', accessorKey: 'dibuat_pada', size: 140,
            cell: ({ row }) => <span className="text-xs text-gray-500">{dayjs(row.original.dibuat_pada).format('DD MMM YYYY HH:mm')}</span>,
        },
        {
            header: '', id: 'aksi', size: 60,
            cell: ({ row }) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.LOG_ERROR_DETAIL(row.original.id_log_error))}
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
                    <h3 className="font-bold">Log Error</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Monitoring error dan exception sistem</p>
                </div>
                <Button variant="plain" size="sm" icon={<HiOutlineRefresh />} onClick={fetchData}>
                    Refresh
                </Button>
            </div>
            <Card>
                <DataTable columns={columns} data={list} loading={loading}
                    pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                    onPaginationChange={setCurrentPage} />
            </Card>
        </div>
    )
}
