'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Button, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekonsiliasiService, Rekonsiliasi } from '@/services/rekonsiliasi.service'
import dayjs from 'dayjs'

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    selesai: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pending', selesai: 'Selesai',
}

export default function RekonsiliasiDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [rekonsiliasi, setRekonsiliasi] = useState<Rekonsiliasi | null>(null)
    const [loading, setLoading]   = useState(true)
    const [catatan, setCatatan]   = useState('')
    const [updating, setUpdating] = useState(false)
    const [confirmSelesai, setConfirmSelesai] = useState(false)

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
            setConfirmSelesai(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!rekonsiliasi) return <div className="p-6 text-red-500">Rekonsiliasi tidak ditemukan.</div>

    const nomorFaktur = rekonsiliasi.nomor_faktur ?? rekonsiliasi.id_faktur
    const initial = rekonsiliasi.nomor_faktur?.charAt(0).toUpperCase() ?? 'R'

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
                    <p className="text-gray-500 text-sm mt-0.5">Verifikasi dan penyelesaian rekonsiliasi faktur</p>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmSelesai}
                type="info"
                title="Selesaikan Rekonsiliasi"
                confirmText="Ya, Selesaikan"
                cancelText="Batal"
                confirmButtonProps={{ loading: updating }}
                onClose={() => setConfirmSelesai(false)}
                onCancel={() => setConfirmSelesai(false)}
                onConfirm={() => handleUpdate(true)}
            >
                <p className="text-sm">
                    Tandai rekonsiliasi faktur <span className="font-semibold">{nomorFaktur}</span> sebagai selesai?{' '}
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
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">
                                Rekonsiliasi {nomorFaktur}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                Dibuat {rekonsiliasi.dibuat_pada ? dayjs(rekonsiliasi.dibuat_pada).format('DD/MM/YYYY HH:mm') : '—'}
                            </p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_CLASS[rekonsiliasi.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[rekonsiliasi.status] ?? rekonsiliasi.status}
                    </span>
                </div>

                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {([
                        {
                            label: 'Faktur',
                            value: rekonsiliasi.nomor_faktur ? (
                                <Link
                                    href={ROUTES.FAKTUR_DETAIL(rekonsiliasi.id_faktur)}
                                    className="text-primary font-semibold hover:underline"
                                >
                                    {rekonsiliasi.nomor_faktur}
                                </Link>
                            ) : (
                                <span className="font-mono text-xs">{rekonsiliasi.id_faktur}</span>
                            ),
                        },
                        {
                            label: 'Diselesaikan',
                            value: rekonsiliasi.diselesaikan_pada
                                ? dayjs(rekonsiliasi.diselesaikan_pada).format('DD/MM/YYYY HH:mm')
                                : <span className="text-gray-400">—</span>,
                        },
                    ]).map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Catatan Klien</p>
                <div className="rounded-lg bg-gray-50 p-3 text-sm min-h-[60px] text-gray-800 dark:text-gray-200 dark:bg-gray-800">
                    {rekonsiliasi.catatan_klien || <span className="text-gray-400">Tidak ada catatan klien.</span>}
                </div>
            </Card>

            {rekonsiliasi.status === 'pending' ? (
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Catatan Keuangan</p>
                    <form onSubmit={e => { e.preventDefault(); handleUpdate(false) }}>
                        <textarea
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            rows={3}
                            placeholder="Tambahkan catatan keuangan..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 mb-4"
                        />
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="submit" variant="plain" loading={updating}>
                                Simpan Catatan
                            </Button>
                            <Button type="button" variant="solid" loading={updating} onClick={() => setConfirmSelesai(true)}>
                                Tandai Selesai
                            </Button>
                        </div>
                    </form>
                </Card>
            ) : (
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Catatan Keuangan</p>
                    <div className="rounded-lg bg-gray-50 p-3 text-sm min-h-[60px] text-gray-800 dark:text-gray-200 dark:bg-gray-800">
                        {rekonsiliasi.catatan_keuangan || <span className="text-gray-400">Tidak ada catatan keuangan.</span>}
                    </div>
                </Card>
            )}
        </div>
    )
}
