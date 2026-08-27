'use client'
import { use, useEffect, useState, useCallback, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, DatePicker, Tag, Tooltip, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiOutlinePencilAlt, HiPlusCircle, HiOutlineTrash, HiOutlineX, HiOutlineExclamationCircle, HiOutlineEye } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { armadaService, Armada } from '@/services/armada.service'
import { dokumenArmadaService, DokumenArmada } from '@/services/dokumenArmada.service'
import { perawatanArmadaService, PerawatanArmada, PrediksiPerawatanItem, PerawatanSparepartInput } from '@/services/perawatanArmada.service'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { supirService, Supir } from '@/services/supir.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'
import { jenisKendaraanService } from '@/services/jenis-kendaraan.service'
import { jenisPerawatanService, JenisPerawatan } from '@/services/jenisPerawatan.service'
import { intervalPerawatanService } from '@/services/intervalPerawatan.service'
import { paketPerawatanSparepartService } from '@/services/paketPerawatanSparepart.service'

type ItemRow = { id_sparepart: string; qty: string; harga: string }

const RAWAT_STATUS_OPTIONS = [
    { value: 'terjadwal',    label: 'Terjadwal' },
    { value: 'dalam_proses', label: 'Dalam Proses' },
    { value: 'selesai',      label: 'Selesai' },
]

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

const JENIS_DOKUMEN_OPTIONS = [
    { value: 'STNK',     label: 'STNK' },
    { value: 'KIR',      label: 'KIR' },
    { value: 'Asuransi', label: 'Asuransi' },
    { value: 'BPKB',     label: 'BPKB' },
    { value: 'Pajak',    label: 'Pajak Kendaraan' },
    { value: 'Lainnya',  label: 'Lainnya' },
]

// --- helpers ---

function getExpiryInfo(berlakuSampai: string | null): {
    label: string
    className: string
    daysLeft: number | null
    urgent: boolean
} {
    if (!berlakuSampai) return { label: '—', className: 'bg-gray-100 text-gray-400', daysLeft: null, urgent: false }
    const days = Math.ceil((new Date(berlakuSampai).getTime() - Date.now()) / 86400000)
    if (days < 0)   return { label: 'Kadaluarsa', className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',       daysLeft: days, urgent: true }
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
    const [jenisPerawatanOptions, setJenisPerawatanOptions] = useState<{ value: string; label: string }[]>([])

    // dokumen
    const [dokumen, setDokumen]         = useState<DokumenArmada[]>([])
    const [docLoading, setDocLoading]   = useState(false)
    const [showDocForm, setShowDocForm] = useState(false)
    const [docForm, setDocForm]         = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
    const [docFile, setDocFile]         = useState<File | null>(null)
    const [addingDoc, setAddingDoc]     = useState(false)
    const [editDocTarget, setEditDocTarget] = useState<DokumenArmada | null>(null)
    const [editDocForm, setEditDocForm]     = useState({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
    const [editDocFile, setEditDocFile]     = useState<File | null>(null)
    const [updatingDoc, setUpdatingDoc]     = useState(false)
    const [deleteDocTarget, setDeleteDocTarget] = useState<DokumenArmada | null>(null)
    const [deletingDoc, setDeletingDoc]         = useState(false)

    // penugasan history
    const [penugasanList, setPenugasanList]       = useState<Penugasan[]>([])
    const [penugasanLoading, setPenugasanLoading] = useState(false)
    const [supirMap, setSupirMap]                 = useState<Record<string, Supir>>({})

    // prediksi perawatan
    const [prediksi, setPrediksi]                 = useState<PrediksiPerawatanItem[]>([])
    const [prediksiLoading, setPrediksiLoading]   = useState(false)

    // perawatan
    const [perawatan, setPerawatan]         = useState<PerawatanArmada[]>([])
    const [rawatLoading, setRawatLoading]   = useState(false)
    const [showRawatForm, setShowRawatForm] = useState(false)
    const [rawatForm, setRawatForm]         = useState({ tanggal: '', id_jenis_perawatan: '', biaya: '', km_odometer: '', status: 'selesai', jadwal_servis_berikutnya: '', keterangan: '' })
    const [rawatItems, setRawatItems]       = useState<ItemRow[]>([])
    // true setelah user mengedit sparepart manual — auto-fill paket berhenti mengikuti dropdown
    const rawatSparepartLocked = useRef(false)
    const [addingRawat, setAddingRawat]     = useState(false)
    const [editRawatTarget, setEditRawatTarget] = useState<PerawatanArmada | null>(null)
    const [editRawatForm, setEditRawatForm]     = useState({ tanggal: '', id_jenis_perawatan: '', biaya: '', km_odometer: '', status: 'selesai', jadwal_servis_berikutnya: '', keterangan: '' })
    const [editRawatItems, setEditRawatItems]   = useState<ItemRow[]>([])
    const [editRawatLoading, setEditRawatLoading] = useState(false)
    const [updatingRawat, setUpdatingRawat]     = useState(false)
    const [deleteRawatTarget, setDeleteRawatTarget] = useState<PerawatanArmada | null>(null)
    const [deletingRawat, setDeletingRawat]         = useState(false)
    const [alasanHapusRawat, setAlasanHapusRawat]   = useState('')
    const [sparepartList, setSparepartList] = useState<Sparepart[]>([])

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

    useEffect(() => {
        jenisPerawatanService.list(1, 100)
            .then(res => setJenisPerawatanOptions(res.data.filter((j: JenisPerawatan) => j.aktif).map((j: JenisPerawatan) => ({ value: j.id_jenis_perawatan, label: j.nama }))))
            .catch(() => setJenisPerawatanOptions([]))
    }, [])

    useEffect(() => {
        sparepartService.list({ page: 1, limit: 100 })
            .then(res => setSparepartList(res.data.filter(s => s.aktif)))
            .catch(() => setSparepartList([]))
    }, [])

    const sparepartOptions = sparepartList.map(s => ({
        value: s.id_sparepart,
        label: `${s.nama} (stok: ${formatNum(s.stok)} ${s.satuan})`,
    }))

    const addItem = (setItems: Dispatch<SetStateAction<ItemRow[]>>) =>
        setItems(prev => [...prev, { id_sparepart: '', qty: '1', harga: '' }])

    const removeItem = (setItems: Dispatch<SetStateAction<ItemRow[]>>, idx: number) =>
        setItems(prev => prev.filter((_, i) => i !== idx))

    const updateItem = (setItems: Dispatch<SetStateAction<ItemRow[]>>, idx: number, field: keyof ItemRow, value: string) =>
        setItems(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], [field]: value }
            return next
        })

    const pilihSparepart = (setItems: Dispatch<SetStateAction<ItemRow[]>>, idx: number, idSparepart: string) => {
        const sp = sparepartList.find(s => s.id_sparepart === idSparepart)
        setItems(prev => {
            const next = [...prev]
            next[idx] = {
                ...next[idx],
                id_sparepart: idSparepart,
                harga: next[idx].harga || (sp ? String(sp.harga_standar) : ''),
            }
            return next
        })
    }

    const totalSparepart = (items: ItemRow[]) =>
        items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.harga) || 0), 0)

    // Wrapper khusus form TAMBAH — menandai rawatSparepartLocked supaya auto-fill paket
    // (lihat useEffect di bawah) berhenti menimpa begitu user mengedit sparepart manual.
    const addRawatItem = () => { rawatSparepartLocked.current = true; addItem(setRawatItems) }
    const removeRawatItem = (idx: number) => { rawatSparepartLocked.current = true; removeItem(setRawatItems, idx) }
    const updateRawatItem = (idx: number, field: keyof ItemRow, value: string) => { rawatSparepartLocked.current = true; updateItem(setRawatItems, idx, field, value) }
    const pilihRawatSparepart = (idx: number, idSparepart: string) => { rawatSparepartLocked.current = true; pilihSparepart(setRawatItems, idx, idSparepart) }

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
            const res = await penugasanService.listByArmada(id)
            setPenugasanList(res.data)
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
    }, [id])

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
    const handleAddDokumen = async () => {
        if (!docForm.jenis_dokumen || !docFile) return
        setAddingDoc(true)
        try {
            await dokumenArmadaService.create(id, {
                jenis_dokumen:  docForm.jenis_dokumen,
                nomor:          docForm.nomor || null,
                berlaku_sampai: docForm.berlaku_sampai || null,
            }, docFile)
            toast.push(<Notification type="success" title="Dokumen berhasil ditambahkan" />)
            setDocForm({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' })
            setDocFile(null); setShowDocForm(false)
            fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setAddingDoc(false) }
    }

    const handleEditDokumen = async () => {
        if (!editDocTarget) return
        setUpdatingDoc(true)
        try {
            await dokumenArmadaService.update(id, editDocTarget.id_dokumen_armada, {
                jenis_dokumen:  editDocForm.jenis_dokumen,
                nomor:          editDocForm.nomor || null,
                berlaku_sampai: editDocForm.berlaku_sampai || null,
            }, editDocFile ?? undefined)
            toast.push(<Notification type="success" title="Dokumen berhasil diperbarui" />)
            setEditDocTarget(null); setEditDocFile(null)
            fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setUpdatingDoc(false) }
    }

    const handleDeleteDokumen = async () => {
        if (!deleteDocTarget) return
        setDeletingDoc(true)
        try {
            await dokumenArmadaService.delete(id, deleteDocTarget.id_dokumen_armada)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setDeleteDocTarget(null); fetchDokumen()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setDeletingDoc(false) }
    }

    // --- handlers perawatan ---
    const handleAddPerawatan = async () => {
        if (!rawatForm.tanggal || !rawatForm.id_jenis_perawatan) return
        setAddingRawat(true)
        try {
            await perawatanArmadaService.create(id, {
                tanggal:                  rawatForm.tanggal,
                id_jenis_perawatan:       rawatForm.id_jenis_perawatan,
                biaya:                    Number(rawatForm.biaya) || 0,
                km_odometer:              rawatForm.km_odometer ? Number(rawatForm.km_odometer) : null,
                status:                   rawatForm.status as 'terjadwal' | 'dalam_proses' | 'selesai',
                jadwal_servis_berikutnya: rawatForm.jadwal_servis_berikutnya || null,
                keterangan:               rawatForm.keterangan || null,
                sparepart: rawatItems.map((it): PerawatanSparepartInput => ({
                    id_sparepart: it.id_sparepart,
                    qty: Number(it.qty),
                    harga: Number(it.harga) || 0,
                })),
            })
            toast.push(<Notification type="success" title="Perawatan berhasil dicatat" />)
            setRawatForm({ tanggal: '', id_jenis_perawatan: '', biaya: '', km_odometer: '', status: 'selesai', jadwal_servis_berikutnya: '', keterangan: '' })
            setRawatItems([])
            rawatSparepartLocked.current = false
            setShowRawatForm(false); fetchPerawatan(); fetchPrediksi()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setAddingRawat(false) }
    }

    const handleEditPerawatan = async () => {
        if (!editRawatTarget || !editRawatForm.tanggal || !editRawatForm.id_jenis_perawatan) return
        setUpdatingRawat(true)
        try {
            await perawatanArmadaService.update(id, editRawatTarget.id_perawatan, {
                tanggal:                  editRawatForm.tanggal,
                id_jenis_perawatan:       editRawatForm.id_jenis_perawatan,
                biaya:                    Number(editRawatForm.biaya) || 0,
                km_odometer:              editRawatForm.km_odometer ? Number(editRawatForm.km_odometer) : null,
                status:                   editRawatForm.status as 'terjadwal' | 'dalam_proses' | 'selesai',
                jadwal_servis_berikutnya: editRawatForm.jadwal_servis_berikutnya || null,
                keterangan:               editRawatForm.keterangan || null,
                sparepart: editRawatItems.map((it): PerawatanSparepartInput => ({
                    id_sparepart: it.id_sparepart,
                    qty: Number(it.qty),
                    harga: Number(it.harga) || 0,
                })),
            })
            toast.push(<Notification type="success" title="Perawatan berhasil diperbarui" />)
            setEditRawatTarget(null); setEditRawatItems([]); fetchPerawatan(); fetchPrediksi()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setUpdatingRawat(false) }
    }

    const handleDeletePerawatan = async () => {
        if (!deleteRawatTarget || !alasanHapusRawat.trim()) return
        setDeletingRawat(true)
        try {
            await perawatanArmadaService.delete(id, deleteRawatTarget.id_perawatan, alasanHapusRawat.trim())
            toast.push(<Notification type="success" title="Data perawatan berhasil dihapus" />)
            setDeleteRawatTarget(null); setAlasanHapusRawat(''); fetchPerawatan(); fetchPrediksi()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setDeletingRawat(false) }
    }

    // Auto-fill Jadwal Servis Berikutnya dari interval — hanya saat form TAMBAH (bukan edit),
    // sama seperti pola di PerawatanForm.tsx.
    useEffect(() => {
        if (!armada?.id_jenis_kendaraan || !rawatForm.id_jenis_perawatan || !rawatForm.tanggal) return

        let aktif = true
        intervalPerawatanService.resolusi({
            id_jenis_perawatan: rawatForm.id_jenis_perawatan,
            id_jenis_kendaraan: armada.id_jenis_kendaraan,
        })
            .then(res => {
                if (aktif && res && res.interval_hari != null) {
                    const jadwal = dayjs(rawatForm.tanggal).add(res.interval_hari, 'day').format('YYYY-MM-DD')
                    setRawatForm(p => ({ ...p, jadwal_servis_berikutnya: jadwal }))
                }
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [armada?.id_jenis_kendaraan, rawatForm.id_jenis_perawatan, rawatForm.tanggal])

    // Auto-fill daftar sparepart dari paket standar — sengaja TERUS mengikuti tiap kali dropdown
    // Jenis Perawatan berganti (bukan cuma sekali saat kosong), sampai user mengedit sparepart
    // manual (rawatSparepartLocked) — supaya ganti jenis perawatan beberapa kali tidak
    // menyisakan paket jenis sebelumnya (sama seperti PerawatanForm.tsx).
    useEffect(() => {
        if (rawatSparepartLocked.current) return
        if (!armada?.id_jenis_kendaraan || !rawatForm.id_jenis_perawatan) return

        let aktif = true
        paketPerawatanSparepartService.resolusi({
            id_jenis_perawatan: rawatForm.id_jenis_perawatan,
            id_jenis_kendaraan: armada.id_jenis_kendaraan,
        })
            .then(res => {
                if (aktif) {
                    setRawatItems(res.map(r => ({
                        id_sparepart: r.id_sparepart,
                        qty: String(r.qty_standar),
                        harga: String(r.harga_standar),
                    })))
                }
            })
            .catch(() => {})
        return () => { aktif = false }
    }, [armada?.id_jenis_kendaraan, rawatForm.id_jenis_perawatan])

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
                    <span><strong>{urgentCount} dokumen</strong> kadaluarsa atau hampir kadaluarsa — segera perbarui.</span>
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
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
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
                                <FormItem label="Tanggal Beli">
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
                        <p className="text-xs text-gray-400 mt-0.5">Diurutkan berdasarkan tanggal kadaluarsa terdekat</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => setShowDocForm(v => !v)}>
                        Tambah Dokumen
                    </Button>
                </div>

                {/* Form tambah dokumen */}
                {showDocForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Jenis Dokumen" asterisk>
                                <Select isSearchable={false} placeholder="Pilih jenis..."
                                    options={JENIS_DOKUMEN_OPTIONS}
                                    value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === docForm.jenis_dokumen) ?? null}
                                    onChange={opt => setDocForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Nomor Dokumen">
                                <Input placeholder="Contoh: B 1234 XYZ" value={docForm.nomor}
                                    onChange={e => setDocForm(p => ({ ...p, nomor: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Berlaku Sampai">
                                <DatePicker
                                    value={docForm.berlaku_sampai ? new Date(docForm.berlaku_sampai) : null}
                                    onChange={date => setDocForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="File Dokumen" asterisk>
                                <UploadBerkas
                                    file={docFile}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    label="Pilih file"
                                    hint="PDF/JPG/PNG"
                                    onChange={setDocFile}
                                />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />}
                                onClick={() => { setShowDocForm(false); setDocFile(null); setDocForm({ jenis_dokumen: '', nomor: '', berlaku_sampai: '' }) }}>
                                Batal
                            </Button>
                            <Button size="sm" variant="solid" loading={addingDoc}
                                disabled={!docForm.jenis_dokumen || !docFile}
                                onClick={handleAddDokumen}>
                                Simpan
                            </Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

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
                                            <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{d.jenis_dokumen}</td>
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
                                                    <Tooltip title="Edit">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            onClick={() => {
                                                                setEditDocTarget(d)
                                                                setEditDocForm({
                                                                    jenis_dokumen:  d.jenis_dokumen,
                                                                    nomor:          d.nomor ?? '',
                                                                    berlaku_sampai: d.berlaku_sampai ?? '',
                                                                })
                                                                setEditDocFile(null)
                                                            }}>
                                                            <HiOutlinePencilAlt className="text-lg" />
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
                                        <tr key={item.id_jenis_perawatan}>
                                            <td className="py-3 px-3 font-medium text-gray-800 dark:text-gray-200">{item.nama_jenis_perawatan}</td>
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
                                                {item.sparepart_standar.length === 0
                                                    ? <span className="text-gray-300">—</span>
                                                    : item.sparepart_standar.map(sp => sp.nama_sparepart).join(', ')}
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
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => setShowRawatForm(v => !v)}>
                        Catat Perawatan
                    </Button>
                </div>

                {showRawatForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Tanggal" asterisk>
                                <DatePicker
                                    value={rawatForm.tanggal ? new Date(rawatForm.tanggal) : null}
                                    onChange={date => setRawatForm(p => ({ ...p, tanggal: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Jenis Perawatan" asterisk>
                                <Select isSearchable placeholder="Pilih jenis perawatan..."
                                    options={jenisPerawatanOptions}
                                    value={jenisPerawatanOptions.find(o => o.value === rawatForm.id_jenis_perawatan) ?? null}
                                    onChange={opt => setRawatForm(p => ({ ...p, id_jenis_perawatan: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Biaya (Rp)">
                                <Input prefix="Rp" placeholder="0"
                                    value={rawatForm.biaya ? formatNum(Number(rawatForm.biaya)) : ''}
                                    onChange={e => setRawatForm(p => ({ ...p, biaya: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="KM Odometer">
                                <Input suffix="km" placeholder="0"
                                    value={rawatForm.km_odometer}
                                    onChange={e => setRawatForm(p => ({ ...p, km_odometer: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false}
                                    value={RAWAT_STATUS_OPTIONS.find(o => o.value === rawatForm.status) ?? null}
                                    options={RAWAT_STATUS_OPTIONS}
                                    onChange={opt => opt && setRawatForm(p => ({ ...p, status: opt.value }))} />
                            </FormItem>
                            <FormItem label="Jadwal Servis Berikutnya">
                                <DatePicker
                                    value={rawatForm.jadwal_servis_berikutnya ? new Date(rawatForm.jadwal_servis_berikutnya) : null}
                                    onChange={date => setRawatForm(p => ({ ...p, jadwal_servis_berikutnya: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Keterangan">
                                    <Input textArea placeholder="Keterangan tambahan..." value={rawatForm.keterangan}
                                        onChange={e => setRawatForm(p => ({ ...p, keterangan: e.target.value }))} />
                                </FormItem>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Spare Part Diganti</p>
                                <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />} onClick={addRawatItem}>Tambah Part</Button>
                            </div>
                            {rawatItems.length === 0 ? (
                                <p className="text-gray-400 text-xs py-2">Belum ada spare part ditambahkan.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {rawatItems.map((it, idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                            <div className="flex-1 min-w-0">
                                                <Select placeholder="Pilih spare part..."
                                                    options={sparepartOptions}
                                                    value={sparepartOptions.find(o => o.value === it.id_sparepart) ?? null}
                                                    onChange={opt => pilihRawatSparepart(idx, opt?.value ?? '')} />
                                            </div>
                                            <Input className="w-full sm:w-24" type="number" min={1} placeholder="Qty"
                                                value={it.qty}
                                                onChange={e => updateRawatItem(idx, 'qty', e.target.value.replace(/\D/g, ''))} />
                                            <Input className="w-full sm:w-40" prefix="Rp" placeholder="Harga/unit"
                                                value={it.harga ? formatNum(Number(it.harga)) : ''}
                                                onChange={e => updateRawatItem(idx, 'harga', e.target.value.replace(/\D/g, ''))} />
                                            <div className="w-full sm:w-32 text-right text-sm font-medium whitespace-nowrap self-center">
                                                {formatRupiah((Number(it.qty) || 0) * (Number(it.harga) || 0))}
                                            </div>
                                            <span
                                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors flex-shrink-0 self-center"
                                                onClick={() => removeRawatItem(idx)}>
                                                <HiOutlineTrash className="text-base" />
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-sm">Total Spare Part: <span className="font-bold">{formatRupiah(totalSparepart(rawatItems))}</span></p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />} onClick={() => { setShowRawatForm(false); setRawatItems([]); rawatSparepartLocked.current = false }}>Batal</Button>
                            <Button size="sm" variant="solid" loading={addingRawat}
                                disabled={!rawatForm.tanggal || !rawatForm.id_jenis_perawatan || !rawatItems.every(it => it.id_sparepart && Number(it.qty) > 0)}
                                onClick={handleAddPerawatan}>Simpan</Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

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
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">KM</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Biaya</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Servis Berikutnya</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {perawatan.map(p => (
                                    <tr key={p.id_perawatan}>
                                        <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                                            {dayjs(p.tanggal).format('DD MMM YYYY')}
                                        </td>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{p.jenis_perawatan}</td>
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
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {p.status !== 'selesai' && p.status !== 'dibatalkan' && (
                                                <Tooltip title="Edit">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                        onClick={() => {
                                                            setEditRawatTarget(p)
                                                            setEditRawatForm({
                                                                tanggal:                  p.tanggal,
                                                                id_jenis_perawatan:       p.id_jenis_perawatan ?? '',
                                                                biaya:                    String(p.biaya),
                                                                km_odometer:              p.km_odometer != null ? String(p.km_odometer) : '',
                                                                status:                   p.status,
                                                                jadwal_servis_berikutnya: p.jadwal_servis_berikutnya ?? '',
                                                                keterangan:               p.keterangan ?? '',
                                                            })
                                                            // list armada tidak menyertakan sparepart per baris — ambil record lengkap
                                                            // supaya item lama tidak diam-diam hilang saat disimpan ulang.
                                                            setEditRawatItems([])
                                                            setEditRawatLoading(true)
                                                            perawatanArmadaService.get(id, p.id_perawatan)
                                                                .then(full => {
                                                                    setEditRawatItems((full.sparepart ?? []).map(it => ({
                                                                        id_sparepart: it.id_sparepart,
                                                                        qty: String(it.qty),
                                                                        harga: String(it.harga),
                                                                    })))
                                                                })
                                                                .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
                                                                .finally(() => setEditRawatLoading(false))
                                                        }}>
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
                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                    </div>
                )}
            </Card>
            </div>

            {/* Dialog Edit Dokumen */}
            <Dialog isOpen={!!editDocTarget} onRequestClose={() => setEditDocTarget(null)} onClose={() => setEditDocTarget(null)} width={520}>
                <h5 className="text-base font-semibold mb-5">Edit Dokumen</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Jenis Dokumen" asterisk>
                        <Select isSearchable={false} placeholder="Pilih jenis..."
                            options={JENIS_DOKUMEN_OPTIONS}
                            value={JENIS_DOKUMEN_OPTIONS.find(o => o.value === editDocForm.jenis_dokumen) ?? null}
                            onChange={opt => setEditDocForm(p => ({ ...p, jenis_dokumen: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nomor Dokumen">
                        <Input placeholder="Contoh: B 1234 XYZ" value={editDocForm.nomor}
                            onChange={e => setEditDocForm(p => ({ ...p, nomor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Berlaku Sampai">
                        <DatePicker
                            value={editDocForm.berlaku_sampai ? new Date(editDocForm.berlaku_sampai) : null}
                            onChange={date => setEditDocForm(p => ({ ...p, berlaku_sampai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Ganti File (opsional)">
                        <UploadBerkas
                            file={editDocFile}
                            accept=".pdf,.jpg,.jpeg,.png"
                            label="Pilih file baru"
                            hint="PDF/JPG/PNG"
                            existingUrl={editDocTarget?.url_file ?? null}
                            existingLabel="File saat ini"
                            onChange={setEditDocFile}
                        />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="plain" onClick={() => { setEditDocTarget(null); setEditDocFile(null) }}>Batal</Button>
                    <Button variant="solid" loading={updatingDoc} onClick={handleEditDokumen}>Simpan</Button>
                </div>
            </Dialog>

            {/* Dialog Edit Perawatan */}
            <Dialog isOpen={!!editRawatTarget} onRequestClose={() => setEditRawatTarget(null)} onClose={() => setEditRawatTarget(null)} width={600}>
                <h5 className="text-base font-semibold mb-5">Edit Perawatan</h5>
                <div className="max-h-[65vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Tanggal" asterisk>
                            <DatePicker
                                value={editRawatForm.tanggal ? new Date(editRawatForm.tanggal) : null}
                                onChange={date => setEditRawatForm(p => ({ ...p, tanggal: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <FormItem label="Jenis Perawatan" asterisk>
                            <Select isSearchable placeholder="Pilih jenis perawatan..."
                                options={jenisPerawatanOptions}
                                value={jenisPerawatanOptions.find(o => o.value === editRawatForm.id_jenis_perawatan) ?? null}
                                onChange={opt => setEditRawatForm(p => ({ ...p, id_jenis_perawatan: opt?.value ?? '' }))} />
                        </FormItem>
                        <FormItem label="Biaya (Rp)">
                            <Input prefix="Rp" placeholder="0"
                                value={editRawatForm.biaya ? formatNum(Number(editRawatForm.biaya)) : ''}
                                onChange={e => setEditRawatForm(p => ({ ...p, biaya: e.target.value.replace(/\D/g, '') }))} />
                        </FormItem>
                        <FormItem label="KM Odometer">
                            <Input suffix="km" placeholder="0"
                                value={editRawatForm.km_odometer}
                                onChange={e => setEditRawatForm(p => ({ ...p, km_odometer: e.target.value.replace(/\D/g, '') }))} />
                        </FormItem>
                        <FormItem label="Status">
                            <Select isSearchable={false}
                                value={RAWAT_STATUS_OPTIONS.find(o => o.value === editRawatForm.status) ?? null}
                                options={RAWAT_STATUS_OPTIONS}
                                onChange={opt => opt && setEditRawatForm(p => ({ ...p, status: opt.value }))} />
                        </FormItem>
                        <FormItem label="Jadwal Servis Berikutnya">
                            <DatePicker
                                value={editRawatForm.jadwal_servis_berikutnya ? new Date(editRawatForm.jadwal_servis_berikutnya) : null}
                                onChange={date => setEditRawatForm(p => ({ ...p, jadwal_servis_berikutnya: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Keterangan">
                                <Input textArea value={editRawatForm.keterangan}
                                    onChange={e => setEditRawatForm(p => ({ ...p, keterangan: e.target.value }))} />
                            </FormItem>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Spare Part Diganti</p>
                            <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => addItem(setEditRawatItems)}>Tambah Part</Button>
                        </div>
                        {editRawatLoading ? (
                            <div className="flex justify-center py-4"><Spinner /></div>
                        ) : editRawatItems.length === 0 ? (
                            <p className="text-gray-400 text-xs py-2">Belum ada spare part ditambahkan.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {editRawatItems.map((it, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <div className="flex-1 min-w-0">
                                            <Select placeholder="Pilih spare part..."
                                                options={sparepartOptions}
                                                value={sparepartOptions.find(o => o.value === it.id_sparepart) ?? null}
                                                onChange={opt => pilihSparepart(setEditRawatItems, idx, opt?.value ?? '')} />
                                        </div>
                                        <Input className="w-full sm:w-24" type="number" min={1} placeholder="Qty"
                                            value={it.qty}
                                            onChange={e => updateItem(setEditRawatItems, idx, 'qty', e.target.value.replace(/\D/g, ''))} />
                                        <Input className="w-full sm:w-40" prefix="Rp" placeholder="Harga/unit"
                                            value={it.harga ? formatNum(Number(it.harga)) : ''}
                                            onChange={e => updateItem(setEditRawatItems, idx, 'harga', e.target.value.replace(/\D/g, ''))} />
                                        <div className="w-full sm:w-32 text-right text-sm font-medium whitespace-nowrap self-center">
                                            {formatRupiah((Number(it.qty) || 0) * (Number(it.harga) || 0))}
                                        </div>
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors flex-shrink-0 self-center"
                                            onClick={() => removeItem(setEditRawatItems, idx)}>
                                            <HiOutlineTrash className="text-base" />
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-sm">Total Spare Part: <span className="font-bold">{formatRupiah(totalSparepart(editRawatItems))}</span></p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="plain" onClick={() => { setEditRawatTarget(null); setEditRawatItems([]) }}>Batal</Button>
                    <Button variant="solid" loading={updatingRawat}
                        disabled={!editRawatForm.tanggal || !editRawatForm.id_jenis_perawatan || editRawatLoading || !editRawatItems.every(it => it.id_sparepart && Number(it.qty) > 0)}
                        onClick={handleEditPerawatan}>Simpan</Button>
                </div>
            </Dialog>

            {/* Confirm Hapus Dokumen */}
            <ConfirmDialog isOpen={!!deleteDocTarget} type="danger" title="Hapus Dokumen"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteDocTarget(null)}
                onCancel={() => setDeleteDocTarget(null)}
                onConfirm={handleDeleteDokumen}
                confirmButtonProps={{ loading: deletingDoc }}>
                <p>Hapus dokumen <strong>{deleteDocTarget?.jenis_dokumen}</strong>?</p>
            </ConfirmDialog>

            {/* Confirm Hapus Perawatan */}
            <ConfirmDialog isOpen={!!deleteRawatTarget} type="danger" title="Hapus Perawatan"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => { setDeleteRawatTarget(null); setAlasanHapusRawat('') }}
                onCancel={() => { setDeleteRawatTarget(null); setAlasanHapusRawat('') }}
                onConfirm={handleDeletePerawatan}
                confirmButtonProps={{ loading: deletingRawat, disabled: !alasanHapusRawat.trim() }}>
                <p>Hapus data perawatan <strong>{deleteRawatTarget?.jenis_perawatan}</strong>?</p>
                <div className="mt-3">
                    <p className="text-sm font-semibold mb-1">Alasan penghapusan <span className="text-red-500">*</span></p>
                    <Input textArea rows={3} placeholder="Tulis alasan kenapa data ini dihapus..."
                        value={alasanHapusRawat} onChange={e => setAlasanHapusRawat(e.target.value)} />
                </div>
            </ConfirmDialog>
        </div>
    )
}
