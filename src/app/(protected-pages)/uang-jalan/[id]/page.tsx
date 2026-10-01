'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, Button, Card, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlineClipboardList, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { uangJalanService, UangJalan } from '@/services/uangJalan.service'
import { STATUS_LABEL, STATUS_TAG } from '../../arus-kas/pengajuanMeta'
import { useLogPengajuan } from '../../arus-kas/useLogPengajuan'

const LABEL_CLASS = 'text-xs text-gray-400 uppercase tracking-wide'
const VALUE_CLASS = 'text-sm font-semibold mt-0.5'

export default function UangJalanDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [data, setData] = useState<UangJalan | null>(null)
    const [hapusOpen, setHapusOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const { bukaLog, dialogLog } = useLogPengajuan(uangJalanService.riwayat)

    const fetchData = useCallback(async () => {
        try {
            setData(await uangJalanService.get(id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }, [id])

    useEffect(() => { fetchData() }, [fetchData])

    const handleHapus = async () => {
        setSubmitting(true)
        try {
            await uangJalanService.delete(id)
            toast.push(<Notification type="success" title="Uang jalan berhasil dihapus" />)
            router.push(ROUTES.UANG_JALAN)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapusOpen(false)
        } finally {
            setSubmitting(false)
        }
    }

    if (!data) return null

    const statusDriver = data.tipe_driver === 'vendor' ? `Driver Vendor ${data.nama_vendor ?? ''}`.trim() : 'Driver Internal'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.push(ROUTES.UANG_JALAN)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                        <HiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold font-mono">{data.nomor_uang_jalan}</h3>
                            {data.status_pengajuan && (
                                <Tag className={`text-xs font-semibold ${STATUS_TAG[data.status_pengajuan]}`}>
                                    {STATUS_LABEL[data.status_pengajuan]}
                                </Tag>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {dayjs(data.tanggal).format('DD MMM YYYY')} · {data.nama_driver}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {data.id_pengajuan && (
                        <Tooltip title="Log Aktivitas Approval">
                            <Button variant="default" size="sm" icon={<HiOutlineClipboardList />} onClick={() => bukaLog(data.id_uang_jalan)} />
                        </Tooltip>
                    )}
                    {data.bisa_diubah && (
                        <>
                            <Tooltip title="Hapus">
                                <Button variant="default" size="sm" icon={<HiOutlineTrash />}
                                    customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300'}
                                    onClick={() => setHapusOpen(true)} />
                            </Tooltip>
                            <Tooltip title="Edit">
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />}
                                    onClick={() => router.push(ROUTES.UANG_JALAN_EDIT(id))} />
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>

            {data.status_pengajuan === 'ditolak' && data.alasan_ditolak && (
                <Alert type="danger" showIcon>
                    Pengajuan ditolak: {data.alasan_ditolak}. Perbaiki datanya lalu simpan untuk mengajukan ulang.
                </Alert>
            )}

            <Card>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Driver &amp; Unit</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                        <p className={LABEL_CLASS}>Nama Driver</p>
                        <p className={VALUE_CLASS}>{data.nama_driver}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Status</p>
                        <p className={VALUE_CLASS}>{statusDriver}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>No. Polisi</p>
                        <p className={VALUE_CLASS}>{data.nopol}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Rute</p>
                        <p className={VALUE_CLASS}>{data.rute}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Nominal</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                        <p className={LABEL_CLASS}>UJ per Trip</p>
                        <p className={VALUE_CLASS}>{formatRupiah(data.uang_jalan_per_trip)}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Jumlah Trip</p>
                        <p className={VALUE_CLASS}>{formatNum(data.jumlah_trip)} trip</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Nominal Transfer</p>
                        <p className="text-base font-bold mt-0.5">{formatRupiah(data.nominal)}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Tujuan Transfer &amp; Pengajuan</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                        <p className={LABEL_CLASS}>Nomor Rekening</p>
                        <p className={`${VALUE_CLASS} font-mono`}>{data.nomor_rekening}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Bank</p>
                        <p className={VALUE_CLASS}>{data.nama_bank}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>No. Pengajuan</p>
                        <p className={`${VALUE_CLASS} font-mono`}>{data.nomor_pengajuan ?? '—'}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Tanggal Transfer</p>
                        <p className={VALUE_CLASS}>{data.tanggal_transfer ? dayjs(data.tanggal_transfer).format('DD MMM YYYY') : '—'}</p>
                    </div>
                    <div className="col-span-2 lg:col-span-4">
                        <p className={LABEL_CLASS}>Catatan</p>
                        <p className="text-sm mt-0.5 whitespace-pre-line">{data.catatan ?? '—'}</p>
                    </div>
                </div>
            </Card>

            <div className="flex">
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.UANG_JALAN)}>Kembali</Button>
            </div>

            <ConfirmDialog isOpen={hapusOpen} type="danger" title="Hapus Uang Jalan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setHapusOpen(false)} onCancel={() => setHapusOpen(false)} onConfirm={handleHapus}>
                <p className="text-sm">Uang jalan <span className="font-semibold">{data.nomor_uang_jalan}</span> ({data.nama_driver}) beserta pengajuannya akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            {dialogLog}
        </div>
    )
}
