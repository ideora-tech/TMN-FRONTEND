'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, Faktur } from '@/services/faktur.service'

const STATUS_CLASS: Record<string, string> = {
    draft:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    terkirim: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    lunas:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    batal:    'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', terkirim: 'Terkirim', lunas: 'Lunas', batal: 'Batal',
}

// Transisi status yang diizinkan (mengikuti pola halaman Penawaran)
const NEXT_STATUS: Record<string, string[]> = {
    draft:    ['terkirim', 'batal'],
    terkirim: ['lunas', 'batal'],
    lunas:    [],
    batal:    [],
}

export default function FakturDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [faktur, setFaktur]     = useState<Faktur | null>(null)
    const [loading, setLoading]   = useState(true)
    const [updating, setUpdating] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)

    useEffect(() => {
        fakturService.get(id)
            .then(setFaktur)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleStatus = async (status: string) => {
        setUpdating(true)
        try {
            const updated = await fakturService.updateStatus(id, status)
            setFaktur(updated)
            toast.push(<Notification type="success" title={`Faktur ditandai ${STATUS_LABEL[status] ?? status}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
            setPendingStatus(null)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!faktur) return <div className="p-6 text-red-500">Faktur tidak ditemukan.</div>

    const initial = faktur.nomor_faktur?.charAt(0).toUpperCase() ?? 'F'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.FAKTUR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{faktur.nomor_faktur}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pembayaran faktur</p>
                </div>
            </div>

            {/* Ubah status faktur — gaya sama dengan halaman Penawaran */}
            {(NEXT_STATUS[faktur.status] ?? []).length > 0 && (
                <Card className="border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ubah Status Faktur
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Status saat ini: <span className="font-semibold">{STATUS_LABEL[faktur.status] ?? faktur.status}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(NEXT_STATUS[faktur.status] ?? []).map(s => (
                                <Button
                                    key={s}
                                    size="sm"
                                    variant="default"
                                    className={`${STATUS_CLASS[s]} border border-current`}
                                    onClick={() => setPendingStatus(s)}
                                >
                                    {`-> ${STATUS_LABEL[s]}`}
                                </Button>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            <ConfirmDialog
                isOpen={!!pendingStatus}
                type={pendingStatus === 'batal' ? 'danger' : 'info'}
                title="Ubah Status Faktur"
                confirmText="Ya, Ubah"
                cancelText="Batal"
                confirmButtonProps={{ loading: updating }}
                onClose={() => setPendingStatus(null)}
                onCancel={() => setPendingStatus(null)}
                onConfirm={() => pendingStatus && handleStatus(pendingStatus)}
            >
                <p className="text-sm">
                    Ubah status faktur ke{' '}
                    <span className="font-semibold">{pendingStatus ? STATUS_LABEL[pendingStatus] : ''}</span>?{' '}
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            <Card>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                            {initial}
                        </div>
                        <div>
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{faktur.nomor_faktur}</p>
                            <p className="text-sm text-gray-500 mt-1">{formatRupiah(faktur.total)}</p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_CLASS[faktur.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[faktur.status] ?? faktur.status}
                    </span>
                </div>

                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {([
                        { label: 'Nomor Faktur',   value: faktur.nomor_faktur },
                        { label: 'Total',          value: <span className="font-semibold">{formatRupiah(faktur.total)}</span> },
                        { label: 'Tanggal Faktur', value: faktur.tanggal_faktur ?? <span className="text-gray-400">—</span> },
                        { label: 'Jatuh Tempo',    value: faktur.jatuh_tempo ?? <span className="text-gray-400">—</span> },
                    ]).map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                        </div>
                    ))}
                </div>

            </Card>

            {faktur.items && faktur.items.length > 0 && (
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Item Faktur</p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Deskripsi</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Qty</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Harga Satuan</th>
                                    <th className="py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {faktur.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{item.deskripsi}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{item.qty}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatRupiah(item.harga_satuan)}</td>
                                        <td className="py-3 text-right font-semibold text-gray-800 dark:text-gray-200">{formatRupiah(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-gray-200 dark:border-gray-600">
                                    <td colSpan={3} className="pt-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total</td>
                                    <td className="pt-3 text-right font-bold text-gray-900 dark:text-gray-100">{formatRupiah(faktur.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    )
}