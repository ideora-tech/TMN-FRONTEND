'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Tag, Tooltip, toast, Notification, Spinner, Pagination } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiOutlinePencilAlt, HiPlusCircle, HiOutlineTrash, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineRefresh } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { armadaService, Armada } from '@/services/armada.service'
import { dokumenArmadaService, DokumenArmada } from '@/services/dokumenArmada.service'
import { labelJenisDokumen } from '../../dokumen-armada/dokumenArmada.shared'
import { perawatanArmadaService, PerawatanArmada, PrediksiPerawatanItem } from '@/services/perawatanArmada.service'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { supirService, Supir } from '@/services/supir.service'
import { jenisKendaraanService } from '@/services/jenis-kendaraan.service'

const RAWAT_STATUS_CLASS: Record<string, string> = {
    terjadwal:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    dalam_proses: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:      'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan:   'bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-300',
}

const PENUGASAN_STATUS_CLASS: Record<string, string> = {
    pending:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    aktif:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    batal:    'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

function getServisBadge(tanggal: string | null): { label: string; className: string } | null {
    if (!tanggal) return null
    const days = Math.ceil((new Date(tanggal).getTime() - Date.now()) / 86400000)
    if (days < 0)  return { label: 'Lewat jadwal', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' }
    return null
}

type ArmadaStatus = 'tersedia' | 'digunakan' | 'perawatan' | 'tidak_aktif'

const STATUS_OPTIONS = [
    { value: 'tersedia',    label: 'Tersedia' },
    { value: 'digunakan',   label: 'Dalam Perjalanan' },
    { value: 'perawatan',   label: 'Perawatan' },
    { value: 'tidak_aktif', label: 'Tidak Aktif' },
]

const STATUS_LABEL: Record<string, string> = {
    tersedia:    'Tersedia',
    digunakan:   'Dalam Perjalanan',
    perawatan:   'Perawatan',
    tidak_aktif: 'Tidak Aktif',
}

const BAHAN_BAKAR_OPTIONS = [
    { value: 'solar',   label: 'Solar' },
    { value: 'bensin',  label: 'Bensin' },
    { value: 'gas',     label: 'Gas' },
    { value: 'listrik', label: 'Listrik' },
    { value: 'hybrid',  label: 'Hybrid' },
]

const BAHAN_BAKAR_LABEL: Record<string, string> = {
    solar: 'Solar', bensin: 'Bensin', gas: 'Gas', listrik: 'Listrik', hybrid: 'Hybrid',
}

const KONDISI_BELI_OPTIONS = [
    { value: 'baru',  label: 'Baru' },
    { value: 'bekas', label: 'Bekas' },
]

const KONDISI_BELI_LABEL: Record<string, string> = { baru: 'Baru', bekas: 'Bekas' }

const statusClass: Record<string, string> = {
    tersedia:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    digunakan:   'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    perawatan:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    tidak_aktif: 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

// --- helpers ---

function getExpiryInfo(berlakuSampai: string | null): {
    label: string
    className: string
    daysLeft: number | null
    urgent: boolean
} {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400', daysLeft: null, urgent: false }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Habis Masa Berlaku', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',       daysLeft: days, urgent: true }
    if (days <= 14) return { label: `${days} hari lagi`, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',   daysLeft: days, urgent: true }
    if (days <= 30) return { label: `${days} hari lagi`, className: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', daysLeft: days, urgent: true }
    if (days <= 60) return { label: `${days} hari lagi`, className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', daysLeft: days, urgent: false }
    return { label: `${days} hari lagi`, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', daysLeft: days, urgent: false }
}

function getServisUrgent(jadwal: string | null): boolean {
    if (!jadwal) return false
    const days = Math.ceil((new Date(jadwal).getTime() - Date.now()) / 86400000)
    return days <= 30
}

const PREDIKSI_STATUS_META: Record<string, { label: string; className: string }> = {
    lewat_jatuh_tempo: { label: 'Lewat Jatuh Tempo', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
    segera:            { label: 'Segera',            className: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' },
    aman:               { label: 'Aman',              className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
    belum_pernah:       { label: 'Belum Pernah',      className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
}

function sortDokumen(list: DokumenArmada[]): DokumenArmada[] {
    return [...list].sort((a, b) => {
        if (!a.berlaku_sampai && !b.berlaku_sampai) return 0
        if (!a.berlaku_sampai) return 1
        if (!b.berlaku_sampai) return -1
        return new Date(a.berlaku_sampai).getTime() - new Date(b.berlaku_sampai).getTime()
    })
}

// --- component ---

export default function ArmadaDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router  = useRouter()

    // armada
    const [armada, setArmada]   = useState<Armada | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Armada>>({})
    const [saving, setSaving]   = useState(false)
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
    const [editFoto, setEditFoto] = useState<File | null>(null)
    const [jenisOptions, setJenisOptions] = useState<{ value: string; label: string }[]>([])

    // dokumen
    const [dokumen, setDokumen]         = useState<DokumenArmada[]>([])
    const [docLoading, setDocLoading]   = useState(false)
    const [deleteDocTarget, setDeleteDocTarget] = useState<DokumenArmada | null>(null)
    const [deletingDoc, setDeletingDoc]         = useState(false)

    // penugasan history
    const [penugasanList, setPenugasanList]       = useState<Penugasan[]>([])
    const [penugasanLoading, setPenugasanLoading] = useState(false)
    const [penugasanPage, setPenugasanPage]       = useState(1)
    const [penugasanTotal, setPenugasanTotal]     = useState(0)
    const PENUGASAN_PAGE_SIZE = 10
    const [supirMap, setSupirMap]                 = useState<Record<string, Supir>>({})

    // prediksi perawatan
    const [prediksi, setPrediksi]                 = useState<PrediksiPerawatanItem[]>([])
    const [prediksiLoading, setPrediksiLoading]   = useState(false)

    // perawatan
    const [perawatan, setPerawatan]         = useState<PerawatanArmada[]>([])
    const [rawatLoading, setRawatLoading]   = useState(false)
    const [deleteRawatTarget, setDeleteRawatTarget] = useState<PerawatanArmada | null>(null)
    const [deletingRawat, setDeletingRawat]         = useState(false)
    const [alasanHapusRawat, setAlasanHapusRawat]   = useState('')

    useEffect(() => {
        armadaService.get(id)
            .then(a => { setArmada(a); setForm(a) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptions(res.data.map(j => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => setJenisOptions([]))
    }, [])

    const fetchDokumen = useCallback(async () => {
        setDocLoading(true)
        try { setDokumen(await dokumenArmadaService.list(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setDocLoading(false) }
    }, [id])

    const fetchPerawatan = useCallback(async () => {
        setRawatLoading(true)
        try { setPerawatan(await perawatanArmadaService.list(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setRawatLoading(false) }
    }, [id])

    const fetchPrediksi = useCallback(async () => {
        setPrediksiLoading(true)
        try { setPrediksi(await perawatanArmadaService.prediksiPerawatan(id)) }
        catch (err) { toast.push(<Notification type="danger" title={parseApiError(err)} />) }
        finally { setPrediksiLoading(false) }
    }, [id])

    const fetchPenugasan = useCallback(async () => {
        setPenugasanLoading(true)
        try {
            const res = await penugasanService.listByArmada(id, penugasanPage, PENUGASAN_PAGE_SIZE)
            setPenugasanList(res.data)
            setPenugasanTotal(res.meta?.total ?? res.data.length)
            const ids = [...new Set(res.data.map(p => p.id_supir).filter(Boolean))] as string[]
            if (ids.length > 0) {
                const supirs = await Promise.all(ids.map(sid => supirService.get(sid).catch(() => null)))
                const map: Record<string, Supir> = {}
                supirs.forEach(s => { if (s) map[s.id_supir] = s })
                setSupirMap(map)
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setPenugasanLoading(false) }
    }, [id, penugasanPage])

    useEffect(() => { fetchDokumen() }, [fetchDokumen])
    useEffect(() => { fetchPerawatan() }, [fetchPerawatan])
    useEffect(() => { fetchPrediksi() }, [fetchPrediksi])
    useEffect(() => { fetchPenugasan() }, [fetchPenugasan])

    // --- handlers armada ---
    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.nopol?.trim()) e.nopol = 'Nopol wajib diisi'
        if (!form.merk?.trim())  e.merk  = 'Merk wajib diisi'
        if (!form.tahun)         e.tahun = 'Tahun wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const updated = await armadaService.update(id, {
                nopol:               form.nopol,
                merk:                form.merk,
                model:               form.model ?? '',
                tahun:               form.tahun ? Number(form.tahun) : undefined,
                status:              form.status,
                id_jenis_kendaraan:  form.id_jenis_kendaraan ?? '',
                nomor_rangka:        form.nomor_rangka ?? '',
                nomor_mesin:         form.nomor_mesin ?? '',
                warna:               form.warna ?? '',
                jenis_bahan_bakar:   form.jenis_bahan_bakar ?? '',
                kapasitas_muatan_kg: form.kapasitas_muatan_kg ?? null,
                tanggal_beli:        form.tanggal_beli ?? '',
                harga_beli:          form.harga_beli ?? null,
                kondisi_beli:        form.kondisi_beli ?? '',
                keterangan:          form.keterangan ?? '',
            }, editFoto)
            setArmada({ ...updated, jumlah_penugasan_aktif: updated.jumlah_penugasan_aktif ?? armada?.jumlah_penugasan_aktif })
            setEditing(false); setErrors({}); setEditFoto(null)
            toast.push(<Notification type="success" title="Data armada berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setSaving(false) }
    }

    // --- handlers dokumen ---
    const handleDeleteDokumen = async () => {
        if (!deleteDocTarget) return
        setDeletingDoc(true)
        try {
            await dokumenArmadaService.delete(id, deleteDocTarget.id_dokumen_armada)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setDeleteDocTarget(null); fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteDocTarget(null)
        } finally { setDeletingDoc(false) }
    }

    // --- handlers perawatan ---
    const handleDeletePerawatan = async () => {
        if (!deleteRawatTarget || !alasanHapusRawat.trim()) return
        setDeletingRawat(true)
        try {
            await perawatanArmadaService.delete(id, deleteRawatTarget.id_perawatan, alasanHapusRawat.trim())
            toast.push(<Notification type="success" title="Data perawatan berhasil dihapus" />)
            setDeleteRawatTarget(null); setAlasanHapusRawat(''); fetchPerawatan(); fetchPrediksi()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteRawatTarget(null)
        } finally { setDeletingRawat(false) }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!armada) return <div className="p-6 text-red-500">Armada tidak ditemukan.</div>

    const initial       = armada.nopol?.charAt(0).toUpperCase() ?? 'A'
    const sortedDokumen = sortDokumen(dokumen)
    const urgentCount   = sortedDokumen.filter(d => getExpiryInfo(d.berlaku_sampai).urgent).length
    const servisUrgentCount = perawatan.filter(p => getServisUrgent(p.jadwal_servis_berikutnya)).length

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.ARMADA)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{armada.nopol}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan armada</p>
                </div>
            </div>

            {/* Alert dokumen urgent */}
            {urgentCount > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                    <HiOutlineExclamationCircle className="text-lg flex-shrink-0" />
                    <span><strong>{urgentCount} dokumen</strong> habis masa berlaku atau hampir habis masa berlaku — segera perbarui.</span>
                </div>
            )}

            {servisUrgentCount > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                    <HiOutlineExclamationCircle className="text-lg flex-shrink-0" />
                    <span><strong>{servisUrgentCount} servis</strong> jatuh tempo dalam 30 hari — segera jadwalkan.</span>
                </div>
            )}

            {/* Info Armada */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight font-mono">{armada.nopol}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {armada.merk}{armada.model ? ` ${armada.model}` : ''}{armada.tahun ? ` · ${armada.tahun}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {(armada.jumlah_penugasan_aktif ?? 0) > 0 && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                                        {armada.jumlah_penugasan_aktif} penugasan aktif
                                    </span>
                                )}
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass[armada.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {STATUS_LABEL[armada.status] ?? armada.status}
                                </span>
                                <Tooltip title="Edit">
                                    <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)} />
                                </Tooltip>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Nopol',            value: <span className="font-mono">{armada.nopol}</span> },
                                { label: 'Merk',             value: armada.merk },
                                { label: 'Model',            value: armada.model ?? <span className="text-gray-400">—</span> },
                                { label: 'Tahun',            value: armada.tahun ? String(armada.tahun) : <span className="text-gray-400">—</span> },
                                { label: 'Jenis Kendaraan',  value: armada.id_jenis_kendaraan ? (jenisOptions.find(o => o.value === armada.id_jenis_kendaraan)?.label ?? <span className="text-gray-400">—</span>) : <span className="text-gray-400">—</span> },
                                { label: 'Warna',            value: armada.warna ?? <span className="text-gray-400">—</span> },
                                { label: 'Nomor Rangka',     value: armada.nomor_rangka ? <span className="font-mono">{armada.nomor_rangka}</span> : <span className="text-gray-400">—</span> },
                                { label: 'Nomor Mesin',      value: armada.nomor_mesin ? <span className="font-mono">{armada.nomor_mesin}</span> : <span className="text-gray-400">—</span> },
                                { label: 'Bahan Bakar',      value: armada.jenis_bahan_bakar ? (BAHAN_BAKAR_LABEL[armada.jenis_bahan_bakar] ?? armada.jenis_bahan_bakar) : <span className="text-gray-400">—</span> },
                                { label: 'Kapasitas Muatan', value: armada.kapasitas_muatan_kg != null ? `${formatNum(armada.kapasitas_muatan_kg)} kg` : <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Beli',     value: armada.tanggal_beli ? dayjs(armada.tanggal_beli).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                                { label: 'Harga Beli',       value: armada.harga_beli != null ? formatRupiah(armada.harga_beli) : <span className="text-gray-400">—</span> },
                                { label: 'Kondisi Saat Beli', value: armada.kondisi_beli ? (KONDISI_BELI_LABEL[armada.kondisi_beli] ?? armada.kondisi_beli) : <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {armada.keterangan && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Keterangan</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{armada.keterangan}</p>
                            </div>
                        )}
                        {armada.url_foto && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Foto Armada</p>
                                <img src={armada.url_foto} alt={`Foto ${armada.nopol}`}
                                    className="max-h-56 rounded-xl border border-gray-100 dark:border-gray-700 object-cover" />
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nopol?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base">Edit Data Armada</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi armada di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Nopol" asterisk invalid={!!errors.nopol} errorMessage={errors.nopol}>
                                    <Input value={form.nopol ?? ''} invalid={!!errors.nopol}
                                        onChange={e => setForm(p => ({ ...p, nopol: e.target.value.toUpperCase() }))} />
                                </FormItem>
                                <FormItem label="Merk" asterisk invalid={!!errors.merk} errorMessage={errors.merk}>
                                    <Input value={form.merk ?? ''} invalid={!!errors.merk}
                                        onChange={e => setForm(p => ({ ...p, merk: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Model">
                                    <Input value={form.model ?? ''} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Tahun" asterisk invalid={!!errors.tahun} errorMessage={errors.tahun}>
                                    <Input type="number" value={form.tahun ?? ''} min={1990} max={2100} invalid={!!errors.tahun}
                                        onChange={e => setForm(p => ({ ...p, tahun: Number(e.target.value) }))} />
                                </FormItem>
                                <FormItem label="Status">
                                    <Select isSearchable={false}
                                        value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                        options={STATUS_OPTIONS.filter(o => o.value !== 'digunakan' || form.status === 'digunakan')}
                                        onChange={opt => opt && setForm(p => ({ ...p, status: opt.value as ArmadaStatus }))} />
                                </FormItem>
                                <FormItem label="Jenis Kendaraan">
                                    <Select placeholder="Pilih jenis kendaraan..."
                                        value={jenisOptions.find(o => o.value === form.id_jenis_kendaraan) ?? null}
                                        options={jenisOptions}
                                        onChange={opt => setForm(p => ({ ...p, id_jenis_kendaraan: opt?.value ?? '' }))} />
                                </FormItem>
                                <FormItem label="Warna">
                                    <Input value={form.warna ?? ''} onChange={e => setForm(p => ({ ...p, warna: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Nomor Rangka">
                                    <Input value={form.nomor_rangka ?? ''}
                                        onChange={e => setForm(p => ({ ...p, nomor_rangka: e.target.value.toUpperCase() }))} />
                                </FormItem>
                                <FormItem label="Nomor Mesin">
                                    <Input value={form.nomor_mesin ?? ''}
                                        onChange={e => setForm(p => ({ ...p, nomor_mesin: e.target.value.toUpperCase() }))} />
                                </FormItem>
                                <FormItem label="Jenis Bahan Bakar">
                                    <Select isSearchable={false} placeholder="Pilih bahan bakar..."
                                        value={BAHAN_BAKAR_OPTIONS.find(o => o.value === form.jenis_bahan_bakar) ?? null}
                                        options={BAHAN_BAKAR_OPTIONS}
                                        onChange={opt => setForm(p => ({ ...p, jenis_bahan_bakar: opt?.value ?? '' }))} />
                                </FormItem>
                                <FormItem label="Kapasitas Muatan">
                                    <Input suffix="kg" placeholder="0"
                                        value={form.kapasitas_muatan_kg != null ? String(form.kapasitas_muatan_kg) : ''}
                                        onChange={e => { const digits = e.target.value.replace(/\D/g, ''); setForm(p => ({ ...p, kapasitas_muatan_kg: digits ? Number(digits) : null })) }} />
                                </FormItem>
                                <FormItem label="Tanggal Beli"
                                    extra={<span className="text-xs text-gray-400">Dipakai sebagai titik mulai jadwal servis pertama bila unit belum punya riwayat perawatan</span>}>
                                    <DatePicker
                                        value={form.tanggal_beli ? new Date(form.tanggal_beli) : null}
                                        onChange={date => setForm(p => ({ ...p, tanggal_beli: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                                </FormItem>
                                <FormItem label="Harga Beli">
                                    <Input prefix="Rp" placeholder="0"
                                        value={form.harga_beli != null ? formatNum(Number(form.harga_beli)) : ''}
                                        onChange={e => setForm(p => ({ ...p, harga_beli: e.target.value.replace(/\D/g, '') ? Number(e.target.value.replace(/\D/g, '')) : null }))} />
                                </FormItem>
                                <FormItem label="Kondisi Saat Beli">
                                    <Select isSearchable={false} placeholder="Pilih kondisi..."
                                        value={KONDISI_BELI_OPTIONS.find(o => o.value === form.kondisi_beli) ?? null}
                                        options={KONDISI_BELI_OPTIONS}
                                        onChange={opt => setForm(p => ({ ...p, kondisi_beli: opt?.value ?? '' }))} />
                                </FormItem>
                                <FormItem label="Ganti Foto (opsional)">
                                    <UploadBerkas
                                        file={editFoto}
                                        accept=".jpg,.jpeg,.png,.webp"
                                        label="Pilih foto baru"
                                        hint="JPG/PNG/WEBP"
                                        existingUrl={armada.url_foto ?? null}
                                        existingLabel="Foto saat ini"
                                        onChange={setEditFoto}
                                    />
                                </FormItem>
                                <div className="sm:col-span-2">
                                    <FormItem label="Keterangan">
                                        <Input textArea placeholder="Catatan tambahan..." value={form.keterangan ?? ''}
                                            onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                                    </FormItem>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(armada); setErrors({}); setEditFoto(null) }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dokumen Kendaraan */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Dokumen Kendaraan</p>
                        <p className="text-xs text-gray-400 mt-0.5">Diurutkan berdasarkan tanggal habis masa berlaku terdekat</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => router.push(`${ROUTES.DOKUMEN_ARMADA_BARU}?id_armada=${id}`)}>
                        Tambah Dokumen
                    </Button>
                </div>


                {docLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : sortedDokumen.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada dokumen tercatat</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Nomor</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Berlaku s/d</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">File</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {sortedDokumen.map(d => {
                                    const expiry = getExpiryInfo(d.berlaku_sampai)
                                    return (
                                        <tr key={d.id_dokumen_armada}>
                                            <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{labelJenisDokumen(d.jenis_dokumen)}</td>
                                            <td className="py-3 pr-4 font-mono text-xs text-gray-600 dark:text-gray-400">{d.nomor ?? '—'}</td>
                                            <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                                {d.berlaku_sampai ? dayjs(d.berlaku_sampai).format('DD MMM YYYY') : '—'}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <Tag className={`text-xs font-semibold ${expiry.className}`}>
                                                    {expiry.label}
                                                </Tag>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {d.url_file
                                                    ? <a href={d.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                    : <span className="text-gray-400 text-xs">—</span>}
                                            </td>
                                            <td className="py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Tooltip title="Lihat Detail">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_DETAIL(d.id_dokumen_armada))}>
                                                            <HiOutlineEye className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title="Perpanjang">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                                                            onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_PERPANJANG(d.id_dokumen_armada))}>
                                                            <HiOutlineRefresh className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title="Hapus">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                            onClick={() => setDeleteDocTarget(d)}>
                                                            <HiOutlineTrash className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Prediksi Perawatan */}
            <Card>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Prediksi Perawatan</p>
                <p className="text-xs text-gray-400 mb-4">Perkiraan servis berikutnya berdasarkan interval perawatan &amp; riwayat servis armada ini</p>

                {prediksiLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : prediksi.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada aturan interval perawatan untuk jenis kendaraan armada ini</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Jenis Perawatan</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Servis Terakhir</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Perkiraan Berikutnya</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Status</th>
                                    <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Sparepart Standar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {prediksi.map(item => {
                                    const meta = PREDIKSI_STATUS_META[item.status]
                                    return (
                                        <tr key={item.id_interval_perawatan}>
                                            <td className="py-3 px-3 font-medium text-gray-800 dark:text-gray-200">{item.label}</td>
                                            <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                                                {item.tanggal_servis_terakhir ? dayjs(item.tanggal_servis_terakhir).format('DD MMM YYYY') : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">
                                                {item.jadwal_servis_berikutnya ? dayjs(item.jadwal_servis_berikutnya).format('DD MMM YYYY') : <span className="text-gray-300">—</span>}
                                                {item.km_jatuh_tempo != null && item.sisa_km != null && (
                                                    <p className={`mt-0.5 font-mono ${
                                                        item.status_km === 'lewat_jatuh_tempo' ? 'text-red-500 font-semibold'
                                                        : item.status_km === 'segera' ? 'text-orange-500 font-semibold'
                                                        : 'text-gray-400'
                                                    }`}>
                                                        {formatNum(item.km_jatuh_tempo)} km ({item.sisa_km < 0
                                                            ? `lewat ${formatNum(Math.abs(item.sisa_km))} km`
                                                            : `sisa ${formatNum(item.sisa_km)} km`})
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${meta.className}`}>{meta.label}</span>
                                            </td>
                                            <td className="py-3 px-3 text-xs text-gray-500">
                                                {(item.sparepart_standar ?? []).length === 0
                                                    ? <span className="text-gray-300">—</span>
                                                    : (item.sparepart_standar ?? []).map(sp => sp.nama_sparepart).join(', ')}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Riwayat Perawatan */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Perawatan</p>
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />}
                        onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_BARU}?id_armada=${id}`)}>
                        Catat Perawatan
                    </Button>
                </div>

                {rawatLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : perawatan.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada riwayat perawatan</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Paket Servis</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">KM</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Biaya</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Servis Berikutnya</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Bengkel</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {perawatan.map(p => (
                                    <tr key={p.id_perawatan}>
                                        <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                                            {dayjs(p.tanggal).format('DD MMM YYYY')}
                                        </td>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{p.interval_label ?? <span className="text-gray-300">—</span>}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                                            {p.km_odometer != null ? `${formatNum(p.km_odometer)} km` : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">{formatRupiah(p.biaya)}</td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold whitespace-nowrap ${RAWAT_STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {p.status.replace(/_/g, ' ')}
                                            </Tag>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500 text-xs whitespace-nowrap">
                                            {p.jadwal_servis_berikutnya ? (
                                                <div>
                                                    <p className="text-xs">{dayjs(p.jadwal_servis_berikutnya).format('DD MMM YYYY')}</p>
                                                    {(() => {
                                                        const badge = getServisBadge(p.jadwal_servis_berikutnya)
                                                        return badge && <Tag className={`text-xs font-semibold mt-1 ${badge.className}`}>{badge.label}</Tag>
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs">
                                            {p.nama_supplier ?? <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {p.status !== 'selesai' && p.status !== 'dibatalkan' && (
                                                <Tooltip title="Edit">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                        onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_DETAIL(p.id_perawatan)}?armada=${id}`)}>
                                                        <HiOutlinePencilAlt className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                                )}
                                                {p.status !== 'selesai' && (
                                                <Tooltip title="Hapus">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                        onClick={() => setDeleteRawatTarget(p)}>
                                                        <HiOutlineTrash className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Riwayat Penugasan */}
            <Card>
                <div className="mb-1">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Penugasan</p>
                    <p className="text-xs text-gray-400 mt-0.5">Semua penugasan yang pernah menggunakan armada ini</p>
                </div>

                {penugasanLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : penugasanList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada riwayat penugasan</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Tanggal Tugas</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Supir</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {penugasanList.map(p => {
                                    const supir = p.id_supir ? supirMap[p.id_supir] : null
                                    return (
                                    <tr key={p.id_penugasan}>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {p.tanggal_tugas
                                                ? dayjs(p.tanggal_tugas).format('DD MMM YYYY')
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            {supir ? (
                                                <div>
                                                    <p className="text-gray-800 dark:text-gray-100 font-medium">{supir.nama}</p>
                                                    <p className="text-xs text-gray-400">{supir.jenis_sim} · {supir.no_sim}</p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${PENUGASAN_STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {p.status}
                                            </Tag>
                                        </td>
                                        <td className="py-3 text-right">
                                            <Tooltip title="Detail">
                                                <span
                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                    onClick={() => router.push(ROUTES.PENUGASAN_DETAIL(p.id_penugasan))}
                                                >
                                                    <HiOutlineEye className="text-lg" />
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {!penugasanLoading && penugasanTotal > PENUGASAN_PAGE_SIZE && (
                    <div className="flex justify-end mt-4">
                        <Pagination
                            currentPage={penugasanPage}
                            total={penugasanTotal}
                            pageSize={PENUGASAN_PAGE_SIZE}
                            onChange={setPenugasanPage}
                        />
                    </div>
                )}
                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                    </div>
                )}
            </Card>
            </div>

            {/* Confirm Hapus Dokumen */}
            <ConfirmDialog isOpen={!!deleteDocTarget} type="danger" title="Hapus Dokumen"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteDocTarget(null)}
                onCancel={() => setDeleteDocTarget(null)}
                onConfirm={handleDeleteDokumen}
                confirmButtonProps={{ loading: deletingDoc }}>
                <p>
                    Hapus dokumen <strong>{deleteDocTarget ? labelJenisDokumen(deleteDocTarget.jenis_dokumen) : ''}</strong>?
                    {deleteDocTarget?.id_dokumen_sebelumnya && ' Dokumen sebelumnya akan kembali menjadi dokumen yang berlaku.'}
                </p>
            </ConfirmDialog>

            {/* Confirm Hapus Perawatan */}
            <ConfirmDialog isOpen={!!deleteRawatTarget} type="danger" title="Hapus Perawatan"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => { setDeleteRawatTarget(null); setAlasanHapusRawat('') }}
                onCancel={() => { setDeleteRawatTarget(null); setAlasanHapusRawat('') }}
                onConfirm={handleDeletePerawatan}
                confirmButtonProps={{ loading: deletingRawat, disabled: !alasanHapusRawat.trim() }}>
                <p>Hapus data perawatan{deleteRawatTarget?.interval_label ? <> <strong>{deleteRawatTarget.interval_label}</strong></> : ''} armada <strong>{armada?.nopol}</strong>?</p>
                <div className="mt-3">
                    <p className="text-sm font-semibold mb-1">Alasan penghapusan <span className="text-red-500">*</span></p>
                    <Input textArea rows={3} placeholder="Tulis alasan kenapa data ini dihapus..."
                        value={alasanHapusRawat} onChange={e => setAlasanHapusRawat(e.target.value)} />
                </div>
            </ConfirmDialog>
        </div>
    )
}
