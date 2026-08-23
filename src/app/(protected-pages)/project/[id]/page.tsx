'use client'
import { use, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Button, FormItem, Input, DatePicker, Tag, toast, Notification, Spinner, Dialog, Tooltip } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiPlusCircle, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService, Project } from '@/services/project.service'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { proyekRuteService, ProyekRute } from '@/services/proyekRute.service'
import { ruteService, Rute, labelRute } from '@/services/rute.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { penawaranService, Penawaran } from '@/services/penawaran.service'
import RuteTarifFields, {
    RuteTarifState, EMPTY_RUTE_TARIF_STATE, RuteOption,
    ruteTarifValid, toProyekRutePayload, stateFromProyekRute,
} from '@/components/shared/RuteTarifFields'

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Draft' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

const STATUS_CLASS: Record<string, string> = {
    draft:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    aktif:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    batal:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft:   'Draft',
    aktif:   'Aktif',
    selesai: 'Selesai',
    batal:   'Batal',
}

const TIPE_HARGA_LABEL: Record<string, string> = {
    per_rit:  'Per Rit',
    borongan: 'Borongan',
}

const PENAWARAN_STATUS_CLASS: Record<string, string> = {
    draft:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    terkirim:  'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    negosiasi: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    disetujui: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    ditolak:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

// Transisi status yang diizinkan (mengikuti pola halaman Penawaran)
const NEXT_STATUS: Record<string, string[]> = {
    draft:   ['aktif', 'batal'],
    aktif:   ['selesai', 'batal'],
    selesai: [],
    batal:   [],
}

const PENUGASAN_STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    aktif:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    batal:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

type RevisiItemForm = {
    id_rute: string
    id_jenis_kendaraan: string
    harga_satuan: string
    estimasi_ritase: string
    keterangan: string
}

const EMPTY_REVISI_ITEM: RevisiItemForm = {
    id_rute: '', id_jenis_kendaraan: '', harga_satuan: '', estimasi_ritase: '1', keterangan: '',
}

type RevisiRowError = { rute?: boolean; harga?: boolean }

type Option = { value: string; label: string }
const JENIS_SEMUA: Option = { value: '', label: 'Semua jenis' }

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router  = useRouter()

    // proyek
    const [project, setProject]   = useState<Project | null>(null)
    const [loading, setLoading]   = useState(true)
    const [editing, setEditing]   = useState(false)
    const [form, setForm]         = useState<Partial<Project>>({})
    const [saving, setSaving]     = useState(false)
    const [updating, setUpdating] = useState(false)
    const [downloadingPdf, setDownloadingPdf] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)
    const [errors, setErrors]     = useState<Partial<Record<keyof Project, string>>>({})

    // penugasan
    const [penugasanList, setPenugasanList]   = useState<Penugasan[]>([])
    const [penugasanLoading, setPenugasanLoading] = useState(false)
    const [deletePenugasanTarget, setDeletePenugasanTarget] = useState<Penugasan | null>(null)
    const [deletingPenugasan, setDeletingPenugasan] = useState(false)
    const [karyawanOptions, setKaryawanOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaMap, setArmadaMap]             = useState<Record<string, Armada>>({})
    const [supirList, setSupirList]             = useState<Supir[]>([])

    // Rute Proyek
    const [ruteProyekList, setRuteProyekList]   = useState<ProyekRute[]>([])
    const [ruteProyekLoading, setRuteProyekLoading] = useState(false)
    const [showRuteForm, setShowRuteForm]       = useState(false)
    const [ruteTarif, setRuteTarif]             = useState<RuteTarifState>(EMPTY_RUTE_TARIF_STATE)
    const [ruteOptionsMaster, setRuteOptionsMaster] = useState<RuteOption[]>([])
    const [jenisOptionsMaster, setJenisOptionsMaster] = useState<{ value: string; label: string }[]>([])
    const [addingRute, setAddingRute]           = useState(false)
    const [editRuteTarget, setEditRuteTarget]   = useState<ProyekRute | null>(null)
    const [editRuteTarif, setEditRuteTarif]     = useState<RuteTarifState>(EMPTY_RUTE_TARIF_STATE)
    const [updatingRute, setUpdatingRute]       = useState(false)
    const [deleteRuteTarget, setDeleteRuteTarget] = useState<ProyekRute | null>(null)
    const [deletingRute, setDeletingRute]       = useState(false)

    // Penawaran Proyek
    const [penawaranList, setPenawaranList]     = useState<Penawaran[]>([])
    const [penawaranLoading, setPenawaranLoading] = useState(false)
    const adaPenawaranDisetujui = useMemo(() => penawaranList.some(p => p.status === 'disetujui'), [penawaranList])
    const hargaTerkunci = useMemo(
        () => project?.tipe_harga === 'per_rit' && adaPenawaranDisetujui,
        [project, adaPenawaranDisetujui],
    )

    // Dialog Buat Penawaran Revisi
    const [showRevisiDialog, setShowRevisiDialog]   = useState(false)
    const [revisiRows, setRevisiRows]               = useState<RevisiItemForm[]>([])
    const [revisiRowErrors, setRevisiRowErrors]     = useState<RevisiRowError[]>([])
    const [revisiNilaiBorongan, setRevisiNilaiBorongan] = useState('')
    const [revisiCatatan, setRevisiCatatan]         = useState('')
    const [revisiError, setRevisiError]             = useState('')
    const [savingRevisi, setSavingRevisi]           = useState(false)

    // Dialog Buat Faktur (proyek borongan)
    const [showFakturDialog, setShowFakturDialog]   = useState(false)
    const [fakturNominal, setFakturNominal]         = useState('')
    const [fakturUraian, setFakturUraian]           = useState('')
    const [fakturTanggal, setFakturTanggal]         = useState(dayjs().format('YYYY-MM-DD'))
    const [fakturErrors, setFakturErrors]           = useState<Partial<Record<'nominal' | 'uraian', string>>>({})
    const [savingFaktur, setSavingFaktur]           = useState(false)

    const fetchArmadaSupir = useCallback(async () => {
        try {
            const [armadaRes, supirRes] = await Promise.all([
                armadaService.list(1, 100),
                supirService.list(1, 100),
            ])
            const aMap: Record<string, Armada> = {}
            armadaRes.data.forEach((a: Armada) => { aMap[a.id_armada] = a })
            setArmadaMap(aMap)
            setSupirList(supirRes.data)
        } catch { /* hanya melengkapi nama supir/armada di daftar penugasan */ }
    }, [])

    const fetchProject = useCallback(async () => {
        try {
            const p = await projectService.get(id)
            setProject(p); setForm(p)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }, [id])

    useEffect(() => {
        fetchProject().finally(() => setLoading(false))
        karyawanService.list(1)
            .then(res => setKaryawanOptions(res.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` }))))
            .catch(() => {})
        fetchArmadaSupir()
    }, [id, fetchProject, fetchArmadaSupir])

    const fetchPenugasan = useCallback(async () => {
        setPenugasanLoading(true)
        try {
            const res = await penugasanService.list(id)
            setPenugasanList(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setPenugasanLoading(false)
        }
    }, [id])

    useEffect(() => { fetchPenugasan() }, [fetchPenugasan])

    const fetchRuteProyek = useCallback(async () => {
        setRuteProyekLoading(true)
        try {
            setRuteProyekList(await proyekRuteService.list(id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setRuteProyekLoading(false)
        }
    }, [id])

    useEffect(() => { fetchRuteProyek() }, [fetchRuteProyek])

    const fetchPenawaran = useCallback(async () => {
        setPenawaranLoading(true)
        try {
            const res = await penawaranService.list({ id_proyek: id, limit: 100 })
            setPenawaranList(res.data ?? [])
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setPenawaranLoading(false)
        }
    }, [id])

    useEffect(() => { fetchPenawaran() }, [fetchPenawaran])

    const muatRuteOptions = () =>
        ruteService.list({ limit: 100 })
            .then(res => setRuteOptionsMaster((res.data ?? []).map((r: Rute) => ({
                value: r.id_rute,
                label: labelRute(r),
                asal: r.asal,
                tujuan: r.tujuan,
                estimasi_jarak_km: r.estimasi_jarak_km,
                estimasi_durasi_menit: r.estimasi_durasi_menit,
            }))))
            .catch(() => {})

    useEffect(() => {
        muatRuteOptions()
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptionsMaster(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
    }, [])

    const jenisOptionsSemua = useMemo(() => [JENIS_SEMUA, ...jenisOptionsMaster], [jenisOptionsMaster])

    const openAddRute = () => {
        setRuteTarif(EMPTY_RUTE_TARIF_STATE)
        setShowRuteForm(true)
    }

    const handleAddRute = async () => {
        if (!ruteTarifValid(ruteTarif)) return
        setAddingRute(true)
        try {
            await proyekRuteService.create(id, toProyekRutePayload(ruteTarif))
            toast.push(<Notification type="success" title="Rute proyek berhasil ditambahkan" />)
            setShowRuteForm(false)
            fetchRuteProyek()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingRute(false)
        }
    }

    const openEditRute = (r: ProyekRute) => {
        setEditRuteTarget(r)
        setEditRuteTarif(stateFromProyekRute(r))
    }

    const handleEditRute = async () => {
        if (!editRuteTarget) return
        setUpdatingRute(true)
        try {
            await proyekRuteService.update(id, editRuteTarget.id_proyek_rute, toProyekRutePayload(editRuteTarif))
            toast.push(<Notification type="success" title="Rute proyek berhasil diperbarui" />)
            setEditRuteTarget(null)
            fetchRuteProyek()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdatingRute(false)
        }
    }

    const handleDeleteRute = async () => {
        if (!deleteRuteTarget) return
        setDeletingRute(true)
        try {
            await proyekRuteService.delete(id, deleteRuteTarget.id_proyek_rute)
            toast.push(<Notification type="success" title="Rute proyek berhasil dihapus" />)
            setDeleteRuteTarget(null)
            fetchRuteProyek()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingRute(false)
        }
    }

    const openRevisiDialog = () => {
        setRevisiError('')
        setRevisiCatatan('')
        setRevisiRowErrors([])
        if (project?.tipe_harga === 'borongan') {
            setRevisiNilaiBorongan(project.harga_penawaran != null ? String(project.harga_penawaran) : '')
        } else {
            setRevisiRows(ruteProyekList.length > 0
                ? ruteProyekList.map(r => ({
                    id_rute: r.id_rute,
                    id_jenis_kendaraan: r.id_jenis_kendaraan ?? '',
                    harga_satuan: r.harga_penawaran != null ? String(r.harga_penawaran) : '',
                    estimasi_ritase: String(r.estimasi_ritase ?? 1),
                    keterangan: r.keterangan ?? '',
                }))
                : [EMPTY_REVISI_ITEM])
        }
        setShowRevisiDialog(true)
    }

    const setRevisiRow = (index: number, patch: Partial<RevisiItemForm>) => {
        setRevisiRows(prev => prev.map((row, i) => i === index ? { ...row, ...patch } : row))
        setRevisiRowErrors(prev => prev.map((err, i) => {
            if (i !== index) return err
            const next = { ...err }
            if ('id_rute' in patch && patch.id_rute) next.rute = false
            if ('harga_satuan' in patch && patch.harga_satuan) next.harga = false
            return next
        }))
    }

    const tambahRevisiRow = () => {
        setRevisiRows(prev => [...prev, EMPTY_REVISI_ITEM])
        setRevisiRowErrors(prev => [...prev, {}])
    }

    const hapusRevisiRow = (index: number) => {
        setRevisiRows(prev => prev.filter((_, i) => i !== index))
        setRevisiRowErrors(prev => prev.filter((_, i) => i !== index))
    }

    const totalRevisi = useMemo(
        () => revisiRows.reduce((sum, r) => sum + (Number(r.harga_satuan) || 0) * (Number(r.estimasi_ritase) || 1), 0),
        [revisiRows],
    )

    const handleSubmitRevisi = async () => {
        const borongan = project?.tipe_harga === 'borongan'
        if (borongan && !revisiNilaiBorongan) {
            setRevisiError('Nilai penawaran baru wajib diisi')
            return
        }
        if (!borongan) {
            if (revisiRows.length === 0) {
                setRevisiError('Isi minimal satu baris rute')
                return
            }
            const rowErrors: RevisiRowError[] = revisiRows.map(r => ({
                rute: !r.id_rute,
                harga: !r.harga_satuan,
            }))
            setRevisiRowErrors(rowErrors)
            if (rowErrors.some(e => e.rute || e.harga)) {
                setRevisiError('Rute dan harga wajib diisi di setiap baris')
                return
            }
        }
        setRevisiError('')
        setSavingRevisi(true)
        try {
            if (borongan) {
                await projectService.penawaranRevisi(id, {
                    nilai_penawaran: Number(revisiNilaiBorongan),
                    catatan: revisiCatatan.trim() || undefined,
                })
            } else {
                await projectService.penawaranRevisi(id, {
                    items: revisiRows.map(r => ({
                        id_rute: r.id_rute,
                        id_jenis_kendaraan: r.id_jenis_kendaraan || undefined,
                        harga_satuan: r.harga_satuan ? Number(r.harga_satuan) : undefined,
                        estimasi_ritase: r.estimasi_ritase ? Number(r.estimasi_ritase) : undefined,
                        keterangan: r.keterangan.trim() || undefined,
                    })),
                    catatan: revisiCatatan.trim() || undefined,
                })
            }
            toast.push(<Notification type="success" title="Penawaran revisi berhasil dibuat" />)
            setShowRevisiDialog(false)
            fetchPenawaran()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingRevisi(false)
        }
    }

    const openFakturDialog = () => {
        const sisa = project?.realisasi?.sisa_belum_difakturkan
        setFakturNominal(sisa != null && sisa > 0 ? String(Math.floor(sisa)) : '')
        setFakturUraian('')
        setFakturTanggal(dayjs().format('YYYY-MM-DD'))
        setFakturErrors({})
        setShowFakturDialog(true)
    }

    const handleSubmitFaktur = async () => {
        const e: typeof fakturErrors = {}
        if (!fakturNominal) e.nominal = 'Nominal wajib diisi'
        if (!fakturUraian.trim()) e.uraian = 'Uraian wajib diisi'
        setFakturErrors(e)
        if (Object.keys(e).length > 0) return

        setSavingFaktur(true)
        try {
            const faktur = await projectService.fakturBorongan(id, {
                nominal: Number(fakturNominal),
                uraian: fakturUraian.trim(),
                tanggal_faktur: fakturTanggal,
            })
            toast.push(<Notification type="success" title="Faktur berhasil dibuat" />)
            setShowFakturDialog(false)
            fetchProject()
            router.push(ROUTES.FAKTUR_DETAIL(faktur.id_faktur))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingFaktur(false)
        }
    }

    const handleDownloadPdf = async () => {
        if (!project) return
        setDownloadingPdf(true)
        try {
            const res = await axios.get(API_ENDPOINTS.PROYEK_PDF(id), { responseType: 'blob' })
            const href = URL.createObjectURL(res.data)
            const link = document.createElement('a')
            link.href = href
            link.download = `proyek-${project.kode_proyek}.pdf`
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

    const validate = () => {
        const e: Partial<Record<keyof Project, string>> = {}
        if (!form.kode_proyek?.trim()) e.kode_proyek = 'Kode proyek wajib diisi'
        if (!form.nama_proyek?.trim()) e.nama_proyek = 'Nama proyek wajib diisi'
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
            const updated = await projectService.update(id, {
                nama_proyek:     form.nama_proyek,
                kode_proyek:     form.kode_proyek,
                tanggal_mulai:   form.tanggal_mulai || undefined,
                tanggal_selesai: form.tanggal_selesai || undefined,
                harga_penawaran: form.harga_penawaran ?? null,
                harga_proyek:    form.harga_proyek ?? null,
                status:          form.status,
                keterangan:      form.keterangan || undefined,
            })
            setProject(updated); setForm(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Proyek berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setSaving(false) }
    }

    const handleStatus = async (status: string) => {
        setUpdating(true)
        try {
            const updated = await projectService.updateStatus(id, status)
            setProject(updated); setForm(updated)
            toast.push(<Notification type="success" title={`Status proyek diubah ke ${status}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
            setPendingStatus(null)
        }
    }

    const handleDeletePenugasan = async () => {
        if (!deletePenugasanTarget) return
        setDeletingPenugasan(true)
        try {
            await penugasanService.delete(deletePenugasanTarget.id_penugasan)
            toast.push(<Notification type="success" title="Penugasan berhasil dihapus" />)
            setDeletePenugasanTarget(null); fetchPenugasan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setDeletingPenugasan(false) }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!project) return <div className="p-6 text-red-500">Proyek tidak ditemukan.</div>

    const initial = project.nama_proyek?.charAt(0).toUpperCase() ?? 'P'
    const nextStatuses = NEXT_STATUS[project.status] ?? []
    const isPerRit = project.tipe_harga !== 'borongan'
    const totalNilaiRute = ruteProyekList.reduce((sum, r) => sum + ((r.harga_penawaran ?? 0) * (r.estimasi_ritase || 1)), 0)

    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PROYEK)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{project.nama_proyek}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan status proyek</p>
                </div>
            </div>

            {/* Ubah status proyek — gaya sama dengan halaman Penawaran */}
            {nextStatuses.length > 0 && (
                <Card className="border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ubah Status Proyek
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Status saat ini: <span className="font-semibold">{STATUS_LABEL[project.status] ?? project.status}</span>
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

            <ConfirmDialog
                isOpen={!!pendingStatus}
                type={pendingStatus === 'batal' ? 'danger' : 'info'}
                title="Ubah Status Proyek"
                confirmText="Ya, Ubah"
                cancelText="Batal"
                confirmButtonProps={{ loading: updating }}
                onClose={() => setPendingStatus(null)}
                onCancel={() => setPendingStatus(null)}
                onConfirm={() => pendingStatus && handleStatus(pendingStatus)}
            >
                <p className="text-sm">
                    Ubah status proyek ke{' '}
                    <span className="font-semibold">{pendingStatus ? STATUS_LABEL[pendingStatus] : ''}</span>?{' '}
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            {/* Info Proyek */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{project.nama_proyek}</p>
                                    <p className="text-sm text-gray-500 mt-1">Kode: {project.kode_proyek}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Tag className={`text-xs font-semibold ${STATUS_CLASS[project.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {project.status}
                                </Tag>
                                <Button size="sm" variant="default" loading={downloadingPdf} onClick={handleDownloadPdf}>
                                    Download PDF
                                </Button>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>

                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Proyek',     value: project.kode_proyek },
                                { label: 'Klien',           value: project.nama_klien ?? <span className="text-gray-400">—</span> },
                                { label: 'Tipe Harga',      value: TIPE_HARGA_LABEL[project.tipe_harga] ?? project.tipe_harga },
                                { label: 'Tanggal Mulai',   value: project.tanggal_mulai ? dayjs(project.tanggal_mulai).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Selesai', value: project.tanggal_selesai ? dayjs(project.tanggal_selesai).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                                { label: 'Harga Penawaran', value: project.harga_penawaran != null ? formatRupiah(project.harga_penawaran) : <span className="text-gray-400">—</span> },
                                { label: 'Harga Proyek',    value: project.harga_proyek != null ? formatRupiah(project.harga_proyek) : <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>

                        {project.keterangan && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Keterangan</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">{project.keterangan}</p>
                            </div>
                        )}

                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_proyek?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base">Edit Data Proyek</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi proyek di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Nama Proyek" asterisk invalid={!!errors.nama_proyek} errorMessage={errors.nama_proyek}>
                                    <Input value={form.nama_proyek ?? ''} invalid={!!errors.nama_proyek}
                                        onChange={e => setForm(p => ({ ...p, nama_proyek: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Kode Proyek" asterisk invalid={!!errors.kode_proyek} errorMessage={errors.kode_proyek}>
                                    <Input value={form.kode_proyek ?? ''} invalid={!!errors.kode_proyek}
                                        onChange={e => setForm(p => ({ ...p, kode_proyek: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Tanggal Mulai">
                                    <DatePicker value={form.tanggal_mulai ? new Date(form.tanggal_mulai) : null}
                                        onChange={date => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                                </FormItem>
                                <FormItem label="Tanggal Selesai">
                                    <DatePicker value={form.tanggal_selesai ? new Date(form.tanggal_selesai) : null}
                                        onChange={date => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                                </FormItem>
                                <FormItem label="Harga Penawaran (opsional)">
                                    <Input prefix="Rp" placeholder="0"
                                        value={form.harga_penawaran != null && form.harga_penawaran !== 0 ? formatNum(form.harga_penawaran) : ''}
                                        onChange={e => {
                                            const nilai = e.target.value.replace(/\D/g, '')
                                            setForm(p => ({ ...p, harga_penawaran: nilai ? Number(nilai) : null }))
                                        }} />
                                </FormItem>
                                <FormItem label="Harga Proyek (opsional)">
                                    <Input prefix="Rp" placeholder="0"
                                        value={form.harga_proyek != null && form.harga_proyek !== 0 ? formatNum(form.harga_proyek) : ''}
                                        onChange={e => {
                                            const nilai = e.target.value.replace(/\D/g, '')
                                            setForm(p => ({ ...p, harga_proyek: nilai ? Number(nilai) : null }))
                                        }} />
                                </FormItem>
                                <FormItem label="Status">
                                    <Select isSearchable={false} options={STATUS_OPTIONS}
                                        value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                        onChange={opt => setForm(p => ({ ...p, status: opt?.value as Project['status'] }))} />
                                </FormItem>
                                <div className="sm:col-span-2">
                                    <FormItem label="Keterangan">
                                        <Input textArea rows={3} value={form.keterangan ?? ''}
                                            onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                                            placeholder="Keterangan tambahan (opsional)" />
                                    </FormItem>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(project); setErrors({}) }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Rute Proyek */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Rute Proyek</p>
                        <p className="text-xs text-gray-400 mt-0.5">{ruteProyekList.length} rute terdaftar</p>
                    </div>
                    <Tooltip title={hargaTerkunci ? 'Harga terkunci — tambah rute lewat penawaran revisi' : ''}>
                        <span>
                            <Button size="sm" variant="solid" icon={<HiPlusCircle />} disabled={hargaTerkunci} onClick={openAddRute}>
                                Tambah Rute
                            </Button>
                        </span>
                    </Tooltip>
                </div>

                {showRuteForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <RuteTarifFields value={ruteTarif} onChange={setRuteTarif}
                            ruteOptions={ruteOptionsMaster} jenisOptions={jenisOptionsMaster}
                            onRuteCreated={muatRuteOptions} />
                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" onClick={() => setShowRuteForm(false)}>Batal</Button>
                            <Button size="sm" variant="solid" loading={addingRute}
                                disabled={!ruteTarifValid(ruteTarif)}
                                onClick={handleAddRute}>Simpan</Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

                {ruteProyekLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : ruteProyekList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada rute untuk proyek ini</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Rute</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Jenis Kendaraan</th>
                                    {isPerRit && <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Harga Penawaran</th>}
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Uang Jalan</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Ritase</th>
                                    {isPerRit && <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Subtotal</th>}
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {ruteProyekList.map(r => (
                                    <tr key={r.id_proyek_rute}>
                                        <td className="py-3 pr-4">
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{r.nama_rute ?? '—'}</p>
                                            {r.asal && r.tujuan && <p className="text-xs text-gray-400">{r.asal} → {r.tujuan}</p>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{r.nama_jenis ?? 'Semua jenis'}</td>
                                        {isPerRit && (
                                            <td className="py-3 pr-4">
                                                {r.harga_penawaran != null
                                                    ? <span className="text-gray-700 dark:text-gray-300">{formatRupiah(r.harga_penawaran)}</span>
                                                    : <Tag className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">Belum diisi</Tag>}
                                            </td>
                                        )}
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                                            {r.uang_jalan != null ? formatRupiah(r.uang_jalan) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{r.estimasi_ritase}</td>
                                        {isPerRit && (
                                            <td className="py-3 pr-4">
                                                {r.harga_penawaran != null
                                                    ? <span className="font-semibold text-gray-800 dark:text-gray-100">{formatRupiah(r.harga_penawaran * (r.estimasi_ritase || 1))}</span>
                                                    : <span className="text-gray-400">—</span>}
                                            </td>
                                        )}
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip title="Edit">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                        onClick={() => openEditRute(r)}
                                                    >
                                                        <HiOutlinePencilAlt className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Hapus">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                        onClick={() => setDeleteRuteTarget(r)}
                                                    >
                                                        <HiOutlineTrash className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {isPerRit && (
                                <tfoot>
                                    <tr className="border-t border-gray-200 dark:border-gray-600">
                                        <td colSpan={5} className="py-3 pr-4 text-right font-semibold text-gray-800 dark:text-gray-100">Total Nilai Penawaran</td>
                                        <td className="py-3 pr-4 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                            {formatRupiah(totalNilaiRute)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </Card>

            {/* Dialog Edit Rute Proyek */}
            <Dialog isOpen={!!editRuteTarget} onRequestClose={() => setEditRuteTarget(null)} onClose={() => setEditRuteTarget(null)} width={800}>
                <h5 className="text-base font-semibold mb-5">Edit Rute Proyek</h5>
                <RuteTarifFields value={editRuteTarif} onChange={setEditRuteTarif}
                    ruteOptions={ruteOptionsMaster} jenisOptions={jenisOptionsMaster}
                    onRuteCreated={muatRuteOptions} hargaTerkunci={hargaTerkunci} />
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => setEditRuteTarget(null)}>Batal</Button>
                    <Button variant="solid" loading={updatingRute} onClick={handleEditRute}>Simpan</Button>
                </div>
            </Dialog>

            {/* Confirm Hapus Rute Proyek */}
            <ConfirmDialog isOpen={!!deleteRuteTarget} type="danger" title="Hapus Rute Proyek"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteRuteTarget(null)}
                onCancel={() => setDeleteRuteTarget(null)}
                onConfirm={handleDeleteRute}
                confirmButtonProps={{ loading: deletingRute }}>
                <p>Hapus rute <strong>{deleteRuteTarget?.nama_rute}</strong> dari proyek ini?</p>
            </ConfirmDialog>

            {/* Realisasi — disembunyikan utk per_rit selama belum ada rit berjalan; borongan selalu tampil krn tombol Buat Faktur ada di sini */}
            {(project.tipe_harga === 'borongan' || (project.realisasi?.total_rit ?? 0) > 0) && (
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Realisasi</p>
                        <p className="text-xs text-gray-400 mt-0.5">Progres realisasi terhadap nilai penawaran</p>
                    </div>
                    {project.tipe_harga === 'borongan' && (
                        <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={openFakturDialog}>
                            Buat Faktur
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Rit</p>
                        <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{formatNum(project.realisasi?.total_rit ?? 0)}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nilai Realisasi</p>
                        <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{formatRupiah(project.realisasi?.nilai_realisasi ?? 0)}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                        <p className="text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wide">Nilai Penawaran</p>
                        <p className="font-bold text-base text-blue-600 dark:text-blue-300 mt-1">
                            {project.realisasi?.nilai_penawaran != null ? formatRupiah(project.realisasi.nilai_penawaran) : '—'}
                        </p>
                    </div>
                </div>
                {project.tipe_harga === 'borongan' && (
                    <div className="mt-3 rounded-lg p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Sisa Belum Difakturkan</p>
                        <p className="font-bold text-base text-amber-700 dark:text-amber-300 mt-1">
                            {formatRupiah(project.realisasi?.sisa_belum_difakturkan ?? 0)}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            Daftar detail faktur proyek ini ada di menu Faktur.
                        </p>
                    </div>
                )}
            </Card>
            )}

            {/* Penawaran Proyek */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Penawaran Proyek</p>
                        <p className="text-xs text-gray-400 mt-0.5">{penawaranList.length} penawaran tercatat</p>
                    </div>
                    {adaPenawaranDisetujui ? (
                        <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={openRevisiDialog}>
                            Buat Penawaran Revisi
                        </Button>
                    ) : (
                        <Tooltip title="Buat penawaran revisi setelah proyek punya penawaran yang disetujui">
                            <span>
                                <Button size="sm" variant="solid" icon={<HiPlusCircle />} disabled>
                                    Buat Penawaran Revisi
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                </div>

                {penawaranLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : penawaranList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada penawaran untuk proyek ini</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Nomor</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Nilai</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {penawaranList.map(p => (
                                    <tr key={p.id_penawaran}>
                                        <td className="py-3 pr-4">
                                            <span className="inline-flex items-center gap-2">
                                                <Link href={ROUTES.PENAWARAN_DETAIL(p.id_penawaran)}
                                                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                    {p.nomor_penawaran}
                                                </Link>
                                                {p.id_penawaran_induk && (
                                                    <Tag className="text-xs bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">Revisi</Tag>
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {p.tanggal_penawaran ? dayjs(p.tanggal_penawaran).format('DD MMM YYYY') : dayjs(p.dibuat_pada).format('DD MMM YYYY')}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {p.nilai_penawaran != null ? formatRupiah(p.nilai_penawaran) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${PENAWARAN_STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {p.status}
                                            </Tag>
                                        </td>
                                        <td className="py-3 text-right">
                                            <Tooltip title="Detail">
                                                <span
                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                    onClick={() => router.push(ROUTES.PENAWARAN_DETAIL(p.id_penawaran))}
                                                >
                                                    <HiOutlineEye className="text-lg" />
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Dialog Buat Penawaran Revisi */}
            <Dialog isOpen={showRevisiDialog} onRequestClose={() => setShowRevisiDialog(false)} onClose={() => setShowRevisiDialog(false)} width={800}>
                <h5 className="text-base font-semibold mb-1">Buat Penawaran Revisi</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Revisi dibuat sebagai penawaran baru berstatus draft — kirim &amp; setujui ulang lewat menu Penawaran.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitRevisi() }}>
                    {project.tipe_harga === 'borongan' ? (
                        <FormItem label="Nilai Penawaran Baru" asterisk>
                            <Input prefix="Rp" placeholder="0"
                                value={revisiNilaiBorongan ? formatNum(Number(revisiNilaiBorongan)) : ''}
                                onChange={e => setRevisiNilaiBorongan(e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                    ) : (
                        <div>
                            {revisiRows.map((row, i) => (
                                <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Baris {i + 1}</p>
                                        <button type="button" onClick={() => hapusRevisiRow(i)}
                                            className="text-red-500 hover:text-red-600">
                                            <HiOutlineTrash />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                        <FormItem label="Rute" asterisk invalid={!!revisiRowErrors[i]?.rute} errorMessage="Rute wajib dipilih">
                                            <Select<RuteOption> placeholder="Pilih rute..." options={ruteOptionsMaster}
                                                invalid={!!revisiRowErrors[i]?.rute}
                                                value={ruteOptionsMaster.find(o => o.value === row.id_rute) ?? null}
                                                onChange={opt => setRevisiRow(i, { id_rute: opt?.value ?? '' })} />
                                        </FormItem>
                                        <FormItem label="Jenis Kendaraan">
                                            <Select<Option> placeholder="Semua jenis" options={jenisOptionsSemua}
                                                value={jenisOptionsSemua.find(o => o.value === row.id_jenis_kendaraan) ?? JENIS_SEMUA}
                                                onChange={opt => setRevisiRow(i, { id_jenis_kendaraan: opt?.value ?? '' })} />
                                        </FormItem>
                                        <FormItem label="Harga Satuan" asterisk invalid={!!revisiRowErrors[i]?.harga} errorMessage="Harga wajib diisi">
                                            <Input prefix="Rp" placeholder="0"
                                                invalid={!!revisiRowErrors[i]?.harga}
                                                value={row.harga_satuan ? formatNum(Number(row.harga_satuan)) : ''}
                                                onChange={e => setRevisiRow(i, { harga_satuan: e.target.value.replace(/\D/g, '') })} />
                                        </FormItem>
                                        <FormItem label="Estimasi Ritase">
                                            <Input type="number" min="1" value={row.estimasi_ritase}
                                                onChange={e => setRevisiRow(i, { estimasi_ritase: e.target.value })} />
                                        </FormItem>
                                        <div className="sm:col-span-2">
                                            <FormItem label="Keterangan">
                                                <Input value={row.keterangan}
                                                    onChange={e => setRevisiRow(i, { keterangan: e.target.value })} />
                                            </FormItem>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" size="sm" variant="default" icon={<HiPlusCircle />} onClick={tambahRevisiRow}>
                                Tambah Baris
                            </Button>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                                Total nilai penawaran baru: <span className="font-semibold">{formatRupiah(totalRevisi)}</span>
                            </p>
                        </div>
                    )}
                    <div className="mt-3">
                        <FormItem label="Catatan (opsional)">
                            <Input textArea rows={2} value={revisiCatatan}
                                onChange={e => setRevisiCatatan(e.target.value)} />
                        </FormItem>
                    </div>
                    {revisiError && <p className="text-red-500 text-sm mt-1">{revisiError}</p>}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setShowRevisiDialog(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingRevisi}>Simpan Revisi</Button>
                    </div>
                </form>
            </Dialog>

            {/* Dialog Buat Faktur (proyek borongan) */}
            <Dialog isOpen={showFakturDialog} onRequestClose={() => setShowFakturDialog(false)} onClose={() => setShowFakturDialog(false)} width={800}>
                <h5 className="text-base font-semibold mb-4">Buat Faktur</h5>
                <form onSubmit={e => { e.preventDefault(); handleSubmitFaktur() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Nominal" asterisk invalid={!!fakturErrors.nominal} errorMessage={fakturErrors.nominal}>
                            <Input prefix="Rp" placeholder="0" invalid={!!fakturErrors.nominal}
                                value={fakturNominal ? formatNum(Number(fakturNominal)) : ''}
                                onChange={e => setFakturNominal(e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        <FormItem label="Tanggal Faktur" asterisk>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={fakturTanggal ? dayjs(fakturTanggal).toDate() : null}
                                onChange={date => setFakturTanggal(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Uraian" asterisk invalid={!!fakturErrors.uraian} errorMessage={fakturErrors.uraian}>
                                <Input textArea rows={2} invalid={!!fakturErrors.uraian}
                                    placeholder="Contoh: Termin 1 Jasa Angkutan Proyek..."
                                    value={fakturUraian}
                                    onChange={e => setFakturUraian(e.target.value)} />
                            </FormItem>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setShowFakturDialog(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingFaktur}>Buat Faktur</Button>
                    </div>
                </form>
            </Dialog>

            {/* Daftar Penugasan */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Penugasan Harian</p>
                        <p className="text-xs text-gray-400 mt-0.5">{penugasanList.length} penugasan terdaftar</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.PENUGASAN)}>
                        Tambah Penugasan
                    </Button>
                </div>

                {penugasanLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : penugasanList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada penugasan untuk proyek ini</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Supir</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Armada</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Uang Jalan</th>
                                    <th className="py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {penugasanList.map(p => (
                                    <tr key={p.id_penugasan}>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                            {(p.id_supir ? supirList.find(s => s.id_supir === p.id_supir)?.nama : undefined)
                                                ?? karyawanOptions.find(o => o.value === p.id_karyawan)?.label?.split(' — ')[1]
                                                ?? <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                            {p.id_armada ? (
                                                armadaMap[p.id_armada] ? (
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200">{armadaMap[p.id_armada].nopol}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {[armadaMap[p.id_armada].nama_jenis, armadaMap[p.id_armada].merk].filter(Boolean).join(' · ')}
                                                        </p>
                                                    </div>
                                                ) : p.id_armada.slice(0, 8)
                                            ) : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                            {p.estimasi_biaya != null
                                                ? formatRupiah(p.estimasi_biaya)
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${PENUGASAN_STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {p.status}
                                            </Tag>
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip title="Detail">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                        onClick={() => router.push(ROUTES.PENUGASAN_DETAIL(p.id_penugasan))}
                                                    >
                                                        <HiOutlineEye className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Hapus">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                        onClick={() => setDeletePenugasanTarget(p)}
                                                    >
                                                        <HiOutlineTrash className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Confirm Hapus Penugasan */}
            <ConfirmDialog isOpen={!!deletePenugasanTarget} type="danger" title="Hapus Penugasan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeletePenugasanTarget(null)}
                onCancel={() => setDeletePenugasanTarget(null)}
                onConfirm={handleDeletePenugasan}
                confirmButtonProps={{ loading: deletingPenugasan }}>
                <p>Penugasan tanggal <strong>
                    {deletePenugasanTarget?.tanggal_tugas
                        ? dayjs(deletePenugasanTarget.tanggal_tugas).format('DD MMM YYYY')
                        : '—'}
                </strong> akan dihapus.</p>
            </ConfirmDialog>
        </div>
    )
}
