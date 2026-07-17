'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import axios from 'axios'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExternalLink, HiOutlineLightBulb, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { penawaranService, Penawaran, PenawaranStatus } from '@/services/penawaran.service'
import { tarifRuteService } from '@/services/tarifRute.service'
import { ruteService, Rute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { klienService, Klien } from '@/services/klien.service'
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
    id_klien:          string
    judul:             string
    nilai_str:         string
    tanggal_penawaran: string
    tanggal_berlaku:   string
    catatan:           string
}

interface ItemForm {
    id_rute:              string
    id_jenis_kendaraan:   string
    id_tarif_rute:        string | null
    harga_satuan_str:     string
    estimasi_ritase_str:  string
    keterangan:           string
}

type Option = { value: string; label: string }

const ITEM_KOSONG: ItemForm = {
    id_rute: '', id_jenis_kendaraan: '', id_tarif_rute: null,
    harga_satuan_str: '', estimasi_ritase_str: '1', keterangan: '',
}

export default function PenawaranDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router  = useRouter()

    const [data, setData]       = useState<Penawaran | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving]   = useState(false)
    const [form, setForm]       = useState<EditForm>({
        id_klien: '', judul: '', nilai_str: '', tanggal_penawaran: '', tanggal_berlaku: '', catatan: '',
    })
    const [errors, setErrors] = useState<Partial<Record<keyof EditForm, string>>>({})

    const [items, setItems] = useState<ItemForm[]>([])
    const [itemError, setItemError] = useState('')
    const [ruteOptions, setRuteOptions] = useState<Option[]>([])
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [klienOptions, setKlienOptions] = useState<Option[]>([])

    useEffect(() => {
        ruteService.list({ limit: 100 })
            .then(res => setRuteOptions((res.data ?? []).map((r: Rute) => ({ value: r.id_rute, label: r.nama_rute }))))
            .catch(() => {})
        jenisKendaraanService.list(1)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => {})
    }, [])

    const totalItems = items.reduce(
        (sum, it) => sum + Number(it.harga_satuan_str || 0) * Number(it.estimasi_ritase_str || 1), 0)

    const updateItem = (index: number, patch: Partial<ItemForm>) => {
        setItems(prev => {
            const next = [...prev]
            next[index] = { ...next[index], ...patch }
            return next
        })
    }

    // Auto-fill harga: kontrak klien menang, fallback harga umum; tetap bisa diedit manual.
    // Guard stale response: id_rute/id_jenis_kendaraan dicapture saat pemanggilan; hasil hanya
    // diterapkan bila baris pada index tsb (dibaca via functional setItems) masih punya
    // kombinasi rute+jenis yang sama saat resolusi selesai — mencegah overwrite oleh respons basi
    // ketika user re-pilih rute/jenis dengan cepat.
    const autoFillHarga = async (index: number, idRute: string, idJenis: string) => {
        if (!idRute || !idJenis) return
        try {
            const tarif = await tarifRuteService.resolusi({
                id_rute: idRute,
                id_jenis_kendaraan: idJenis,
                id_klien: form.id_klien || undefined,
                tanggal: form.tanggal_penawaran || undefined,
            })
            if (!tarif) return
            setItems(prev => {
                const row = prev[index]
                if (!row || row.id_rute !== idRute || row.id_jenis_kendaraan !== idJenis) return prev
                const next = [...prev]
                next[index] = {
                    ...row,
                    id_tarif_rute: tarif.id_tarif_rute,
                    harga_satuan_str: String(Math.round(tarif.harga)),
                }
                return next
            })
        } catch { /* tarif tidak ketemu → isi manual */ }
    }

    const setItemRute = (index: number, value: string) => {
        updateItem(index, { id_rute: value })
        autoFillHarga(index, value, items[index].id_jenis_kendaraan)
    }

    const setItemJenis = (index: number, value: string) => {
        updateItem(index, { id_jenis_kendaraan: value })
        autoFillHarga(index, items[index].id_rute, value)
    }

    const validateItems = () => {
        if (items.length === 0) return true
        const invalid = items.some(it => !it.id_rute || !it.id_jenis_kendaraan || !it.harga_satuan_str)
        setItemError(invalid ? 'Setiap item wajib punya rute, jenis kendaraan, dan harga' : '')
        return !invalid
    }

    const validate = () => {
        const e: Partial<Record<keyof EditForm, string>> = {}
        if (!form.judul.trim()) e.judul = 'Judul penawaran wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const [pendingStatus, setPendingStatus] = useState<PenawaranStatus | null>(null)
    const [statusLoading, setStatusLoading] = useState(false)
    const [downloadingPdf, setDownloadingPdf] = useState(false)

    useEffect(() => {
        penawaranService.get(id)
            .then(d => {
                setData(d)
                setForm({
                    id_klien:          d.id_klien ?? '',
                    judul:             d.judul,
                    nilai_str:         d.nilai_penawaran != null ? String(d.nilai_penawaran) : '',
                    tanggal_penawaran: d.tanggal_penawaran ?? '',
                    tanggal_berlaku:   d.tanggal_berlaku ?? '',
                    catatan:           d.catatan ?? '',
                })
                setItems((d.items ?? []).map(it => ({
                    id_rute:             it.id_rute,
                    id_jenis_kendaraan:  it.id_jenis_kendaraan,
                    id_tarif_rute:       it.id_tarif_rute,
                    harga_satuan_str:    String(Math.round(it.harga_satuan)),
                    estimasi_ritase_str: String(it.estimasi_ritase),
                    keterangan:          it.keterangan ?? '',
                })))
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        if (!validate() || !validateItems()) return
        setSaving(true)
        try {
            const updated = await penawaranService.update(id, {
                id_klien:          form.id_klien || null,
                judul:             form.judul,
                nilai_penawaran:   items.length > 0
                    ? undefined
                    : (form.nilai_str ? Number(form.nilai_str) : null),
                tanggal_penawaran: form.tanggal_penawaran || null,
                tanggal_berlaku:   form.tanggal_berlaku || null,
                catatan:           form.catatan || null,
                items: items.map(it => ({
                    id_rute: it.id_rute,
                    id_jenis_kendaraan: it.id_jenis_kendaraan,
                    id_tarif_rute: it.id_tarif_rute,
                    harga_satuan: Number(it.harga_satuan_str || 0),
                    estimasi_ritase: Number(it.estimasi_ritase_str || 1),
                    keterangan: it.keterangan.trim() || null,
                })),
            })
            setData(updated)
            setItems((updated.items ?? []).map(it => ({
                id_rute:             it.id_rute,
                id_jenis_kendaraan:  it.id_jenis_kendaraan,
                id_tarif_rute:       it.id_tarif_rute,
                harga_satuan_str:    String(Math.round(it.harga_satuan)),
                estimasi_ritase_str: String(it.estimasi_ritase),
                keterangan:          it.keterangan ?? '',
            })))
            setEditing(false)
            setErrors({})
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

                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                            <p className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Item Rute (Rate Card)</p>
                            {data.items && data.items.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                                            <tr className="text-left text-gray-600 dark:text-gray-300">
                                                <th className="px-3 py-2 font-semibold min-w-[200px]">Rute</th>
                                                <th className="px-3 py-2 font-semibold min-w-[150px]">Jenis Kendaraan</th>
                                                <th className="px-3 py-2 font-semibold min-w-[150px]">Harga Satuan</th>
                                                <th className="px-3 py-2 font-semibold w-24">Ritase</th>
                                                <th className="px-3 py-2 font-semibold text-right min-w-[120px]">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map(it => (
                                                <tr key={it.id_penawaran_item} className="border-b border-gray-100 dark:border-gray-700">
                                                    <td className="px-3 py-2">{it.nama_rute ?? '-'}</td>
                                                    <td className="px-3 py-2">{it.nama_jenis ?? '-'}</td>
                                                    <td className="px-3 py-2">{formatRupiah(it.harga_satuan)}</td>
                                                    <td className="px-3 py-2">{it.estimasi_ritase}</td>
                                                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatRupiah(it.subtotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">Belum ada item rute pada penawaran ini.</p>
                            )}
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
                                <FormItem label="Judul Penawaran" asterisk invalid={!!errors.judul} errorMessage={errors.judul} className="sm:col-span-2">
                                    <Input
                                        value={form.judul}
                                        invalid={!!errors.judul}
                                        onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
                                    />
                                </FormItem>
                                <FormItem label="Nilai Penawaran" extra={items.length > 0 ? <span className="text-xs text-gray-400 ml-2">(otomatis dari item rate card)</span> : undefined}>
                                    <Input
                                        prefix="Rp"
                                        placeholder="0"
                                        disabled={items.length > 0}
                                        value={items.length > 0
                                            ? formatNum(totalItems)
                                            : (form.nilai_str ? formatNum(Number(form.nilai_str)) : '')}
                                        onChange={e =>
                                            setForm(p => ({
                                                ...p,
                                                nilai_str: e.target.value.replace(/\D/g, ''),
                                            }))
                                        }
                                    />
                                </FormItem>
                                <FormItem label="Klien">
                                    <Select<Option> isClearable isSearchable placeholder="Pilih klien (opsional)"
                                        options={klienOptions}
                                        value={klienOptions.find(o => o.value === form.id_klien) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, id_klien: opt?.value ?? '' }))} />
                                </FormItem>
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

                            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-100">Item Rute (Rate Card)</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Harga terisi otomatis dari master tarif (kontrak klien menang atas harga umum) — tetap bisa diubah</p>
                                    </div>
                                    <Button type="button" size="sm" variant="solid" icon={<HiOutlinePlus />}
                                        onClick={() => setItems(prev => [...prev, { ...ITEM_KOSONG }])}>
                                        Tambah Item
                                    </Button>
                                </div>
                                {itemError && <p className="text-red-500 text-sm mb-2">{itemError}</p>}
                                {items.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                                <tr className="text-left text-gray-600 dark:text-gray-300">
                                                    <th className="px-3 py-2 font-semibold min-w-[200px]">Rute</th>
                                                    <th className="px-3 py-2 font-semibold min-w-[150px]">Jenis Kendaraan</th>
                                                    <th className="px-3 py-2 font-semibold min-w-[150px]">Harga Satuan</th>
                                                    <th className="px-3 py-2 font-semibold w-24">Ritase</th>
                                                    <th className="px-3 py-2 font-semibold text-right min-w-[120px]">Subtotal</th>
                                                    <th className="px-3 py-2 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((it, i) => (
                                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700 align-top">
                                                        <td className="px-3 py-2">
                                                            <Select<Option> isSearchable placeholder="Pilih rute..."
                                                                options={ruteOptions}
                                                                value={ruteOptions.find(o => o.value === it.id_rute) ?? null}
                                                                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                                onChange={opt => setItemRute(i, opt?.value ?? '')} />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Select<Option> isSearchable placeholder="Pilih jenis..."
                                                                options={jenisOptions}
                                                                value={jenisOptions.find(o => o.value === it.id_jenis_kendaraan) ?? null}
                                                                menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                                onChange={opt => setItemJenis(i, opt?.value ?? '')} />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input prefix="Rp" placeholder="0"
                                                                value={it.harga_satuan_str ? formatNum(Number(it.harga_satuan_str)) : ''}
                                                                onChange={e => updateItem(i, {
                                                                    harga_satuan_str: e.target.value.replace(/\D/g, ''),
                                                                })} />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <Input type="number" min="1"
                                                                value={it.estimasi_ritase_str}
                                                                onChange={e => updateItem(i, { estimasi_ritase_str: e.target.value })} />
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-semibold whitespace-nowrap pt-4">
                                                            {formatRupiah(Number(it.harga_satuan_str || 0) * Number(it.estimasi_ritase_str || 1))}
                                                        </td>
                                                        <td className="px-3 py-2 pt-3">
                                                            <span
                                                                className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-200 cursor-pointer transition-colors"
                                                                onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                                                            ><HiOutlineTrash /></span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="flex justify-end mt-3">
                                            <p className="text-sm">Total Nilai Penawaran:{' '}
                                                <span className="font-bold text-base">{formatRupiah(totalItems)}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button
                                    type="button"
                                    variant="plain"
                                    onClick={() => { setEditing(false); setErrors({}) }}
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