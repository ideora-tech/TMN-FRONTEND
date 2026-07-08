'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { logErrorService, LogError } from '@/services/logError.service'

const LEVEL_CLASS: Record<string, string> = {
    debug:    'bg-gray-100 text-gray-600',
    info:     'bg-blue-100 text-blue-600',
    warning:  'bg-yellow-100 text-yellow-700',
    error:    'bg-red-100 text-red-600',
    critical: 'bg-red-200 text-red-800',
}

export default function LogErrorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [log, setLog]       = useState<LogError | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        logErrorService.get(id)
            .then(setLog)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!log)    return <div className="p-6 text-red-500">Log tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.LOG_ERROR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Log Error</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{dayjs(log.dibuat_pada).format('DD MMM YYYY HH:mm:ss')}</p>
                </div>
            </div>

            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <Tag className={LEVEL_CLASS[log.level] ?? 'bg-gray-100 text-gray-600'}>
                        {log.level.toUpperCase()}
                    </Tag>
                    {log.metode_http && (
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {log.metode_http} {log.jalur}
                        </span>
                    )}
                    {log.kode_status && (
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            HTTP {log.kode_status}
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-0 mb-6">
                    <div className="py-2 border-b">
                        <p className="text-gray-500 text-xs mb-1">Pesan</p>
                        <p className="font-medium">{log.pesan}</p>
                    </div>
                    {log.id_pengguna && (
                        <div className="py-2 border-b">
                            <p className="text-gray-500 text-xs mb-1">ID Pengguna</p>
                            <p className="font-mono text-sm">{log.id_pengguna}</p>
                        </div>
                    )}
                </div>

                {log.stack_trace && (
                    <div>
                        <p className="text-gray-500 text-xs mb-2">Stack Trace</p>
                        <pre className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap text-red-600 dark:text-red-400">
                            {log.stack_trace}
                        </pre>
                    </div>
                )}
            </Card>

            <div className="flex justify-end">
                <Button variant="plain" onClick={() => router.push(ROUTES.LOG_ERROR)}>Kembali ke Daftar</Button>
            </div>
        </div>
    )
}
