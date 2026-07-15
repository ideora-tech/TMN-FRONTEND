'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import axios from 'axios'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExternalLink, HiOutlineLightBulb } from 'react-icons/hi'
import { penawaranService, Penawaran, PenawaranStatus } from '@/services/penawaran.service'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'

const STATUS_CLASS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
    terkirim:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    negosiasi: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    ditolak:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', terkirim: 'Terkirim', negosiasi: 'Negosiasi', disetujui: 'Disetujui', ditolak: 'Ditolak',
}

const NEXT_STATUS: Record<PenawaranStatus, PenawaranStatus[]> = {
    draft:     ['terkirim'],
    terkirim:  ['negosiasi', 'disetujui', 'ditolak'],
    negosiasi: ['disetujui', 'ditolak'],
    disetujui: [],
    ditolak:   [],
}

interface EditForm {
    judul:             string
    nilai_str:         string
    tanggal_penawaran: string
    tanggal_berlaku:   string
    catatan:           string
}

export default function PenawaranDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router  = useRouter()

    const [data, setData]       = useState<Penawaran | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving]   = useState(false)
    const [form, setForm]       = useState<EditForm>({
        judul: '', nilai_str: '', tanggal_penawaran: '', tanggal_berlaku: '', catatan: '',
    })

    const [pendingStatus, setPendingStatus] = useState<PenawaranStatus | null>(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [downloadingPdf, setDownloadingPdf] = useState(false)

    useEffect(() => {
        penawaranService.get(id)
            .then(d => {
                setData(d)
                setForm({
                    judul:             d.judul,
                    nilai_str:         d.nilai_penawaran != null ? String(d.nilai_penawaran) : '',
                    tanggal_penawaran: d.tanggal_penawaran ?? '',
                    tanggal_berlaku:   d.tanggal_berlaku ?? '',
                    catatan:           d.catatan ?? '',
                })
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await penawaranService.update(id, {
                judul:             form.judul,
                nilai_penawaran:   form.nilai_str ? Number(form.nilai_str) : null,
                tanggal_penawaran: form.tanggal_penawaran || null,
                tanggal_berlaku:   form.tanggal_berlaku || null,
                catatan:           form.catatan || null,
            })
            setData(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Penawaran berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleStatusChange = async () => {
        if (!pendingStatus) return
        setStatusLoading(true)
        try {
            const updated = await penawaranService.updateStatus(id, pendingStatus)
            setData(updated)
            setPendingStatus(null)
            toast.push(<Notification type="success" title={`Status diubah ke ${STATUS_LABEL[pendingStatus]}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setStatusLoading(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!data) return
        setDownloadingPdf(true)
        try {
            const res = await axios.get(API_ENDPOINTS.PENAWARAN_PDF(id), { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `penawaran-${data.nomor_penawaran}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(href)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingPdf(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data)   return <div className="p-6 text-red-500">Penawaran tidak ditemukan.</div>

    const initial      = data.nomor_penawaran.charAt(0).toUpperCase()
    const nextStatuses = NEXT_STATUS[data.status] ?? []

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.PENAWARAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{data.nomor_penawaran}</h4>
                    <p className="text-gray-500 text-sm mt-0.5">{data.judul}</p>
                </div>
            </div>

            {/* Banner aksi setelah disetujui */}
            {data.status === 'disetujui' && (
                <Card className="border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <div className="flex items-start gap-3">
                        <HiOutlineLightBulb className="text-emerald-600 dark:text-emerald-400 text-xl flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Penawaran Disetujui</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                                {data.id_proyek
                                    ? 'Penawaran ini sudah terhubung ke proyek.'
                                    : 'Langkah selanjutnya: buat proyek berdasarkan penawaran ini, lalu tambahkan penugasan di halaman proyek.'}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                            {data.id_proyek ? (
                                <Button size="sm" variant="solid" icon={<HiOutlineExternalLink />}
                                    onClick={() => router.push(ROUTES.PROYEK_DETAIL(data.id_proyek!))}>
                                    Lihat Proyek
                                </Button>
                            ) : (
                                <Button size="sm" variant="solid"
                                    onClick={() => {
                                        const params = new URLSearchParams({
                                            ...(data.id_klien ? { id_klien: data.id_klien } : {}),
                                            nama_proyek: data.judul,
                                            id_penawaran: data.id_penawaran,
                                        })
                                        router.push(`${ROUTES.PROYEK_BARU}?${params}`)
                                    }}>
                                    Buat Proyek
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {nextStatuses.length > 0 && (
                <Card className="border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ubah Status Penawaran
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Status saat ini: <span className="font-semibold">{STATUS_LABEL[data.status]}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {nextStatuses.map(s => (
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

            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">
                                        {data.nomor_penawaran}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-0.5">{data.judul}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Tag className={`${STATUS_CLASS[data.status] ?? ''} border-0`}>
                                    {STATUS_LABEL[data.status] ?? data.status}
                                </Tag>
                                <Button size="sm" variant="default" loading={downloadingPdf} onClick={handleDownloadPdf}>
                                    Download PDF
                                </Button>
                                {data.status === 'draft' && (
                                    <Button
                                        variant="solid"
                                        size="sm"
                                        icon={<HiOutlinePencilAlt />}
                                        onClick={() => setEditing(true)}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {(
                                [
                                    { label: 'Nomor Penawaran',   value: data.nomor_penawaran },
                                    { label: 'Judul',             value: data.judul },
                                    {
                                        label: 'Nilai Penawaran',
                                        value: data.nilai_penawaran != null
                                            ? formatRupiah(data.nilai_penawaran)
                                            : <span className="text-gray-400">-</span>,
                                    },
                                    {
                                        label: 'Tanggal Penawaran',
                                        value: data.tanggal_penawaran ?? <span className="text-gray-400">-</span>,
                                    },
                                    {
                                        label: 'Berlaku Hingga',
                                        value: data.tanggal_berlaku ?? <span className="text-gray-400">-</span>,
                                    },
                                    {
                                        label: 'Catatan',
                                        value: data.catatan ?? <span className="text-gray-400">-</span>,
                                    },
                                ] as { label: string; value: React.ReactNode }[]
                            ).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                                        {label}
                                    </p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-xl flex-shrink-0 select-none">
                                {initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">
                                    Edit Penawaran
                                </p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Hanya penawaran Draft yang dapat diubah
                                </p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />

                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Judul Penawaran" className="sm:col-span-2">
                                    <Input
                                        value={form.judul}
                                        onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
                                    />
                                </FormItem>
                                <FormItem label="Nilai Penawaran">
                                    <Input
                                        prefix="Rp"
                                        placeholder="0"
                                        value={form.nilai_str ? formatNum(Number(form.nilai_str)) : ''}
                                        onChange={e =>
                                            setForm(p => ({
                                                ...p,
                                                nilai_str: e.target.value.replace(/\D/g, ''),
                                            }))
                                        }
                                    />
                                </FormItem>
                                <div />
                                <FormItem label="Tanggal Penawaran">
                                    <DatePicker inputFormat="DD/MM/YYYY"
                                        value={form.tanggal_penawaran ? dayjs(form.tanggal_penawaran).toDate() : null}
                                        onChange={date => setForm(p => ({ ...p, tanggal_penawaran: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                    />
                                </FormItem>
                                <FormItem label="Berlaku Hingga">
                                    <DatePicker inputFormat="DD/MM/YYYY"
                                        value={form.tanggal_berlaku ? dayjs(form.tanggal_berlaku).toDate() : null}
                                        onChange={date => setForm(p => ({ ...p, tanggal_berlaku: date ? dayjs(date).format('YYYY-MM-DD') : '' }))
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Catatan" className="sm:col-span-2">
                                    <textarea
                                        rows={3}
                                        value={form.catatan}
                                        onChange={e =>
                                            setForm(p => ({ ...p, catatan: e.target.value }))
                                        }
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                                    />
                                </FormItem>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    type="button"
                                    variant="plain"
                                    onClick={() => setEditing(false)}
                                >
                                    Batal
                                </Button>
                                <Button type="submit" variant="solid" loading={saving}>
                                    Simpan
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!pendingStatus}
                type="info"
                title="Ubah Status Penawaran"
                confirmText="Ya, Ubah"
                cancelText="Batal"
                onClose={() => setPendingStatus(null)}
                onCancel={() => setPendingStatus(null)}
                onConfirm={handleStatusChange}
                confirmButtonProps={{ loading: statusLoading }}
            >
                <p>
                    Ubah status penawaran ke{' '}
                    <strong>{pendingStatus ? STATUS_LABEL[pendingStatus] : ''}</strong>?{' '}
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>
        </div>
    )
}