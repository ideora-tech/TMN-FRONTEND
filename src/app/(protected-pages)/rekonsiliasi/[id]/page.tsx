'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekonsiliasiService, Rekonsiliasi } from '@/services/rekonsiliasi.service'
import dayjs from 'dayjs'

const statusClass: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    selesai: 'bg-emerald-100 text-emerald-600',
}

export default function RekonsiliasiDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [rekonsiliasi, setRekonsiliasi] = useState<Rekonsiliasi | null>(null)
    const [loading, setLoading]   = useState(true)
    const [catatan, setCatatan]   = useState('')
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        rekonsiliasiService.get(id)
            .then(r => { setRekonsiliasi(r); setCatatan(r.catatan_keuangan ?? '') })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleUpdate = async (markSelesai: boolean) => {
        setUpdating(true)
        try {
            const updated = await rekonsiliasiService.update(id, {
                catatan_keuangan: catatan || undefined,
                ...(markSelesai ? { status: 'selesai' } : {}),
            })
            setRekonsiliasi(updated)
            toast.push(<Notification type="success" title={markSelesai ? 'Rekonsiliasi diselesaikan' : 'Catatan disimpan'} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!rekonsiliasi) return <div className="p-6 text-red-500">Rekonsiliasi tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.REKONSILIASI)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Rekonsiliasi</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Verifikasi dan penyelesaian rekonsiliasi</p>
                </div>
            </div>

            <Card className="mb-4">
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass[rekonsiliasi.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {rekonsiliasi.status}
                    </span>
                </div>
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'ID Faktur', value: <span className="font-mono text-sm">{rekonsiliasi.id_faktur}</span> },
                        ...(rekonsiliasi.diselesaikan_pada ? [{ label: 'Diselesaikan', value: dayjs(rekonsiliasi.diselesaikan_pada).format('DD/MM/YYYY HH:mm') }] : []),
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="mb-4">
                <h5 className="mb-3">Catatan Klien</h5>
                <div className="rounded-lg bg-gray-50 p-3 text-sm min-h-[60px] dark:bg-gray-800">
                    {rekonsiliasi.catatan_klien || <span className="text-gray-400">Tidak ada catatan klien.</span>}
                </div>
            </Card>

            {rekonsiliasi.status === 'pending' && (
                <Card>
                    <h5 className="mb-3">Catatan Keuangan</h5>
                    <textarea
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        rows={3}
                        placeholder="Tambahkan catatan keuangan..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 mb-4"
                    />
                    <div className="flex gap-2">
                        <Button variant="plain" loading={updating} onClick={() => handleUpdate(false)}>
                            Simpan Catatan
                        </Button>
                        <Button variant="solid" loading={updating} onClick={() => handleUpdate(true)}>
                            Tandai Selesai
                        </Button>
                    </div>
                </Card>
            )}

            {rekonsiliasi.status === 'selesai' && rekonsiliasi.catatan_keuangan && (
                <Card>
                    <h5 className="mb-3">Catatan Keuangan</h5>
                    <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">{rekonsiliasi.catatan_keuangan}</div>
                </Card>
            )}
        </div>
    )
}
