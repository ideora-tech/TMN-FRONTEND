'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, Faktur } from '@/services/faktur.service'

const statusClass: Record<string, string> = {
    draft:    'bg-gray-100 text-gray-700',
    terkirim: 'bg-blue-100 text-blue-600',
    lunas:    'bg-emerald-100 text-emerald-600',
    batal:    'bg-red-100 text-red-500',
}

export default function FakturDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [faktur, setFaktur]   = useState<Faktur | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        fakturService.get(params.id)
            .then(setFaktur)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [params.id])

    const handleStatus = async (status: string) => {
        setUpdating(true)
        try {
            const updated = await fakturService.updateStatus(params.id, status)
            setFaktur(updated)
            toast.push(<Notification type="success" title={`Faktur ditandai ${status}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!faktur) return <div className="p-6 text-red-500">Faktur tidak ditemukan.</div>

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

            <Card className="mb-4">
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass[faktur.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {faktur.status}
                    </span>
                </div>
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'Total',        value: <span className="font-bold text-lg">{formatRupiah(faktur.total)}</span> },
                        { label: 'Tgl Faktur',   value: faktur.tanggal_faktur ?? '-' },
                        { label: 'Jatuh Tempo',  value: faktur.jatuh_tempo ?? '-' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {faktur.items && faktur.items.length > 0 && (
                <Card className="mb-4">
                    <h5 className="mb-4">Item Faktur</h5>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 text-left text-gray-500 font-medium pr-4">Deskripsi</th>
                                    <th className="py-2 text-left text-gray-500 font-medium pr-4">Qty</th>
                                    <th className="py-2 text-left text-gray-500 font-medium pr-4">Harga Satuan</th>
                                    <th className="py-2 text-right text-gray-500 font-medium">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {faktur.items.map((item, idx) => (
                                    <tr key={idx} className="border-b last:border-b-0">
                                        <td className="py-2 pr-4">{item.deskripsi}</td>
                                        <td className="py-2 pr-4">{item.qty}</td>
                                        <td className="py-2 pr-4">{formatRupiah(item.harga_satuan)}</td>
                                        <td className="py-2 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Card>
                <h5 className="mb-4">Ubah Status</h5>
                <div className="flex gap-2 flex-wrap">
                    {faktur.status !== 'terkirim' && faktur.status !== 'lunas' && faktur.status !== 'batal' && (
                        <Button
                            variant="solid"
                            customColorClass={() => 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white border-blue-500'}
                            loading={updating}
                            onClick={() => handleStatus('terkirim')}
                        >
                            Kirim
                        </Button>
                    )}
                    {faktur.status === 'terkirim' && (
                        <Button
                            variant="solid"
                            customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                            loading={updating}
                            onClick={() => handleStatus('lunas')}
                        >
                            Tandai Lunas
                        </Button>
                    )}
                    {faktur.status !== 'lunas' && faktur.status !== 'batal' && (
                        <Button
                            variant="solid"
                            customColorClass={() => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500'}
                            loading={updating}
                            onClick={() => handleStatus('batal')}
                        >
                            Batalkan
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    )
}
