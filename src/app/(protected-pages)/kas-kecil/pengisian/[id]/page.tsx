'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, Button, Card, Tag, Tooltip, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { HiArrowLeft, HiOutlineClipboardList, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineExternalLink } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, PengisianKasKecil } from '@/services/kasKecil.service'
import { useLogPengajuan } from '../../../arus-kas/useLogPengajuan'
import { STATUS_PENGISIAN_LABEL, STATUS_PENGISIAN_TAG } from '../../kasKecilMeta'

const LABEL_CLASS = 'text-xs text-gray-400 uppercase tracking-wide'
const VALUE_CLASS = 'text-sm font-semibold mt-0.5'
const SECTION_CLASS = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3'

export default function PengisianKasKecilDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { klik } = usePratinjauBerkas()
    const [data, setData] = useState<PengisianKasKecil | null>(null)
    const [gagalMuat, setGagalMuat] = useState(false)
    const [hapusOpen, setHapusOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const { bukaLog, dialogLog } = useLogPengajuan(kasKecilService.riwayatPengisian)
    const daftar = `${ROUTES.KAS_KECIL}?tab=pengisian`

    const muat = useCallback(() => {
        kasKecilService.getPengisian(id)
            .then(setData)
            .catch(err => {
                setGagalMuat(true)
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            })
    }, [id])

    useEffect(() => { muat() }, [muat])

    const handleHapus = async () => {
        setSubmitting(true)
        try {
            await kasKecilService.deletePengisian(id)
            toast.push(<Notification type="success" title="Pengisian kas kecil berhasil dihapus" />)
            router.push(daftar)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapusOpen(false)
            setSubmitting(false)
            muat()
        }
    }

    if (!data) {
        if (!gagalMuat) return null
        return (
            <Card>
                <p className="text-sm text-gray-500 mb-4">Pengisian kas kecil tidak ditemukan atau Anda tidak punya akses.</p>
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(daftar)}>Kembali</Button>
            </Card>
        )
    }

    const rekening = [data.nama_bank, data.nomor_rekening, data.atas_nama_rekening].filter(Boolean).join(' · ')

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.push(daftar)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                        <HiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold font-mono">{data.nomor_pengisian}</h3>
                            <Tag className={`text-xs font-semibold ${STATUS_PENGISIAN_TAG[data.status]}`}>{STATUS_PENGISIAN_LABEL[data.status]}</Tag>
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">
                            Pengisian kas kecil · {dayjs(data.tanggal).format('DD MMM YYYY')} · {formatRupiah(data.nominal)}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {data.id_pengajuan && (
                        <Tooltip title="Log Aktivitas Approval">
                            <Button variant="default" size="sm" icon={<HiOutlineClipboardList />} onClick={() => bukaLog(data.id_pengisian)} />
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
                                    onClick={() => router.push(ROUTES.KAS_KECIL_PENGISIAN_EDIT(id))} />
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>

            {data.status === 'ditolak' && (
                <Alert type="danger" showIcon>
                    Pengajuan ditolak{data.alasan_ditolak ? `: ${data.alasan_ditolak}` : ''}. Perbaiki datanya lewat tombol Edit untuk mengajukan ulang.
                </Alert>
            )}
            {data.status === 'menunggu_approval' && (
                <Alert type="warning" showIcon>
                    Menunggu approval. Dana belum keluar dari rekening dan saldo kas kecil belum bertambah.
                </Alert>
            )}
            {data.status === 'menunggu_transfer' && (
                <Alert type="info" showIcon>
                    Sudah disetujui — menunggu diverifikasi dan ditransfer oleh Keuangan di{' '}
                    <a href={ROUTES.PROSES_PEMBAYARAN} className="font-semibold underline">Proses Pembayaran</a>.
                    Saldo kas kecil bertambah setelah transfer dicatat.
                </Alert>
            )}
            {data.status === 'selesai' && (
                <Alert type="success" showIcon>
                    Dana sudah ditransfer{data.tanggal_transfer ? ` pada ${dayjs(data.tanggal_transfer).format('DD MMM YYYY')}` : ''} dan tercatat sebagai penerimaan kas kecil.
                </Alert>
            )}

            <Card>
                <p className={SECTION_CLASS}>Rincian Pengisian</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                        <p className={LABEL_CLASS}>Tanggal</p>
                        <p className={VALUE_CLASS}>{dayjs(data.tanggal).format('DD MMM YYYY')}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Nominal</p>
                        <p className={`${VALUE_CLASS} tabular-nums`}>{formatRupiah(data.nominal)}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Diajukan Oleh</p>
                        <p className={VALUE_CLASS}>{data.dibuat_oleh_nama ?? '—'}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>No. Pengajuan</p>
                        <p className={`${VALUE_CLASS} font-mono`}>{data.nomor_pengajuan ?? '—'}</p>
                    </div>
                    <div className="col-span-2">
                        <p className={LABEL_CLASS}>Rekening Sumber</p>
                        <p className={VALUE_CLASS}>{rekening || '—'}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Tanggal Transfer</p>
                        <p className={VALUE_CLASS}>{data.tanggal_transfer ? dayjs(data.tanggal_transfer).format('DD MMM YYYY') : '—'}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Bukti Transfer</p>
                        {data.url_bukti_transfer ? (
                            <a href={data.url_bukti_transfer} target="_blank" rel="noreferrer"
                                onClick={klik(data.url_bukti_transfer, `Bukti transfer ${data.nomor_pengisian}`, `bukti-${data.nomor_pengisian}`)}
                                className="text-sm font-semibold mt-0.5 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                Lihat bukti <HiOutlineExternalLink />
                            </a>
                        ) : (
                            <p className={VALUE_CLASS}>—</p>
                        )}
                    </div>
                    <div className="col-span-2 lg:col-span-4">
                        <p className={LABEL_CLASS}>Keterangan</p>
                        <p className="text-sm mt-0.5 whitespace-pre-line">{data.keterangan}</p>
                    </div>
                </div>
            </Card>

            <div className="flex">
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(daftar)}>Kembali</Button>
            </div>

            <ConfirmDialog isOpen={hapusOpen} type="danger" title="Hapus Pengisian Kas Kecil?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setHapusOpen(false)} onCancel={() => setHapusOpen(false)} onConfirm={handleHapus}>
                <p className="text-sm">
                    Pengisian <span className="font-semibold">{data.nomor_pengisian}</span> beserta pengajuannya akan dihapus.
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            {dialogLog}
        </div>
    )
}
