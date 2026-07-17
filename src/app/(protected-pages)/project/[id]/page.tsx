'use client'
import { use, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Button, FormItem, Input, DatePicker, Tag, toast, Notification, Spinner, Dialog, Checkbox, Tooltip } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineExternalLink, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService, Project } from '@/services/project.service'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'
import { formatNum } from '@/utils/formatNumber'

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

// ── Dialog Tambah Penugasan (pasangan supir–armada) — pola sama persis dgn halaman menu Penugasan ──
const UNIT_STATUS_CLASS: Record<string, string> = {
    tersedia:    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    digunakan:   'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    perawatan:   'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    tidak_aktif: 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400',
}

const UNIT_STATUS_LABEL: Record<string, string> = {
    tersedia:    'Tersedia',
    digunakan:   'Digunakan',
    perawatan:   'Perawatan',
    tidak_aktif: 'Tidak Aktif',
}

type Pasangan = {
    supir: Supir
    armada: Armada | null // null bila armada default tidak ditemukan di daftar
}

type CreateFormState = {
    tanggal_tugas: string
    estimasi_biaya: string
}

const EMPTY_CREATE_FORM: CreateFormState = {
    tanggal_tugas: '', estimasi_biaya: '',
}

type HasilGagal = { supir: string; armada: string; alasan: string }

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
    const [pasanganLoading, setPasanganLoading] = useState(false)
    const [pasanganError, setPasanganError]     = useState(false)

    // Dialog Tambah Penugasan — list pasangan supir–armada multi-centang (pola menu Penugasan)
    const [createDialogOpen, setCreateDialogOpen]   = useState(false)
    const [createForm, setCreateForm]               = useState<CreateFormState>(EMPTY_CREATE_FORM)
    const [checkedIds, setCheckedIds]               = useState<string[]>([]) // id_supir yang dicentang
    const [pairSearch, setPairSearch]               = useState('')
    const [createFormErrors, setCreateFormErrors]   = useState<Partial<Record<'pasangan' | 'tanggal_tugas', string>>>({})
    const [createSubmitting, setCreateSubmitting]   = useState(false)
    const [hasilPenugasan, setHasilPenugasan]       = useState<{ sukses: number; gagal: HasilGagal[] } | null>(null)

    // Refetch armada & supir — dipanggil saat mount dan setiap kali dialog dibuka,
    // supaya status unit (tersedia/digunakan/dst) tidak basi.
    const fetchArmadaSupir = useCallback(async () => {
        setPasanganLoading(true)
        setPasanganError(false)
        try {
            const [armadaRes, supirRes] = await Promise.all([
                armadaService.list(1, 100),
                supirService.list(1, 100),
            ])
            const aMap: Record<string, Armada> = {}
            armadaRes.data.forEach((a: Armada) => { aMap[a.id_armada] = a })
            setArmadaMap(aMap)
            setSupirList(supirRes.data)
        } catch {
            setPasanganError(true)
        } finally {
            setPasanganLoading(false)
        }
    }, [])

    useEffect(() => {
        projectService.get(id)
            .then(p => { setProject(p); setForm(p) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
        karyawanService.list(1)
            .then(res => setKaryawanOptions(res.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` }))))
            .catch(() => {})
        fetchArmadaSupir()
    }, [id, fetchArmadaSupir])

    // Pasangan supir–armada: semua supir aktif yang punya armada default.
    const pasanganList = useMemo<Pasangan[]>(() => {
        return supirList
            .filter(s => s.status === 'aktif' && s.id_armada_default)
            .map(s => ({ supir: s, armada: armadaMap[s.id_armada_default!] ?? null }))
    }, [supirList, armadaMap])

    const filteredPasangan = useMemo(() => {
        const q = pairSearch.trim().toLowerCase()
        if (!q) return pasanganList
        return pasanganList.filter(p =>
            p.supir.nama.toLowerCase().includes(q) ||
            (p.armada?.nopol ?? '').toLowerCase().includes(q))
    }, [pasanganList, pairSearch])

    const isPairSelectable = (p: Pasangan) => p.armada?.status === 'tersedia'

    const filteredAvailable = useMemo(
        () => filteredPasangan.filter(isPairSelectable),
        [filteredPasangan])

    const allFilteredChecked = filteredAvailable.length > 0
        && filteredAvailable.every(p => checkedIds.includes(p.supir.id_supir))

    const togglePair = (pairId: string) => {
        setCheckedIds(prev => prev.includes(pairId) ? prev.filter(x => x !== pairId) : [...prev, pairId])
        setCreateFormErrors(prev => ({ ...prev, pasangan: undefined }))
    }

    const toggleAllFiltered = () => {
        const ids = filteredAvailable.map(p => p.supir.id_supir)
        setCheckedIds(prev => allFilteredChecked
            ? prev.filter(x => !ids.includes(x))
            : Array.from(new Set([...prev, ...ids])))
        setCreateFormErrors(prev => ({ ...prev, pasangan: undefined }))
    }

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

    const validate = () => {
        const e: Partial<Record<keyof Project, string>> = {}
        if (!form.kode_proyek?.trim()) e.kode_proyek = 'Kode proyek wajib diisi'
        if (!form.nama_proyek?.trim()) e.nama_proyek = 'Nama proyek wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return
        setSaving(true)
        try {
            const updated = await projectService.update(id, {
                nama_proyek:     form.nama_proyek,
                kode_proyek:     form.kode_proyek,
                tanggal_mulai:   form.tanggal_mulai || undefined,
                tanggal_selesai: form.tanggal_selesai || undefined,
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

    const openCreateDialog = () => {
        setCreateForm(EMPTY_CREATE_FORM)
        setCheckedIds([])
        setPairSearch('')
        setCreateFormErrors({})
        setCreateDialogOpen(true)
        fetchArmadaSupir() // refresh status unit — jangan blok pembukaan modal
    }

    const closeCreateDialog = () => setCreateDialogOpen(false)

    const validateCreateForm = () => {
        const e: typeof createFormErrors = {}
        if (checkedIds.length === 0) e.pasangan = 'Centang minimal satu pasangan'
        if (!createForm.tanggal_tugas) e.tanggal_tugas = 'Tanggal tugas wajib diisi'
        setCreateFormErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmitCreate = async () => {
        if (!validateCreateForm()) return
        setCreateSubmitting(true)
        try {
            const estimasi = createForm.estimasi_biaya ? Number(createForm.estimasi_biaya) : null
            const pairs = pasanganList.filter(p => checkedIds.includes(p.supir.id_supir))
            const results = await Promise.allSettled(pairs.map(p =>
                penugasanService.create({
                    id_proyek:      id,
                    id_supir:       p.supir.id_supir,
                    id_armada:      p.supir.id_armada_default ?? undefined,
                    tanggal_tugas:  createForm.tanggal_tugas,
                    estimasi_biaya: estimasi,
                })
            ))
            const gagal: HasilGagal[] = []
            results.forEach((r, i) => {
                if (r.status === 'rejected') {
                    const p = pairs[i]
                    gagal.push({
                        supir:  p.supir.nama,
                        armada: p.armada?.nopol ?? (p.supir.id_armada_default ?? '').slice(0, 8),
                        alasan: parseApiError(r.reason),
                    })
                }
            })
            const sukses = results.length - gagal.length
            setCreateDialogOpen(false)
            fetchPenugasan()
            if (gagal.length === 0) {
                toast.push(<Notification type="success" title={`${sukses} penugasan berhasil dibuat`} />)
            } else {
                setHasilPenugasan({ sukses, gagal })
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setCreateSubmitting(false)
        }
    }

    const renderPasanganRow = (p: Pasangan) => {
        const pairId     = p.supir.id_supir
        const selectable = isPairSelectable(p)
        const isChecked  = checkedIds.includes(pairId)
        return (
            <tr
                key={pairId}
                className={`${selectable ? 'hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer' : 'opacity-50 cursor-not-allowed'} transition-colors`}
                onClick={() => { if (selectable) togglePair(pairId) }}
            >
                <td className="py-2.5 pl-3 pr-1 w-10" onClick={e => e.stopPropagation()}>
                    <Checkbox
                        checked={isChecked}
                        disabled={!selectable}
                        onChange={() => togglePair(pairId)}
                    />
                </td>
                <td className="py-2.5 pr-4">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{p.supir.nama}</p>
                    <p className="text-xs text-gray-400">SIM {p.supir.jenis_sim ?? '-'}</p>
                </td>
                <td className="py-2.5 pr-4">
                    {p.armada ? (
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{p.armada.nopol}</p>
                            <p className="text-xs text-gray-400">{p.armada.merk}</p>
                        </div>
                    ) : (
                        <span className="font-mono text-xs text-gray-500">
                            {(p.supir.id_armada_default ?? '').slice(0, 8)}
                        </span>
                    )}
                </td>
                <td className="py-2.5 pr-3">
                    {p.armada ? (
                        <Tag className={`text-xs font-semibold ${UNIT_STATUS_CLASS[p.armada.status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300'}`}>
                            {UNIT_STATUS_LABEL[p.armada.status] ?? p.armada.status}
                        </Tag>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                </td>
            </tr>
        )
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
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>

                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Proyek',     value: project.kode_proyek },
                                { label: 'Tanggal Mulai',   value: project.tanggal_mulai ? dayjs(project.tanggal_mulai).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Selesai', value: project.tanggal_selesai ? dayjs(project.tanggal_selesai).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
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
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(project); setErrors({}) }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Daftar Penugasan */}
            <Card>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Penugasan</p>
                        <p className="text-xs text-gray-400 mt-0.5">{penugasanList.length} penugasan terdaftar</p>
                    </div>
                    <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={openCreateDialog}>
                        Tambah Penugasan
                    </Button>
                </div>

                {/* Form tambah penugasan */}

                {penugasanLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                ) : penugasanList.length === 0 ? (
                    <p className="text-gray-400 text-sm py-6 text-center">Belum ada penugasan untuk proyek ini</p>
                ) : (
                    <div className="overflow-x-auto mt-4">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Tanggal Tugas</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Supir</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Armada</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Status</th>
                                    <th className="py-2.5" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {penugasanList.map(p => (
                                    <tr key={p.id_penugasan}>
                                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {p.tanggal_tugas ? dayjs(p.tanggal_tugas).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                            {(p.id_supir ? supirList.find(s => s.id_supir === p.id_supir)?.nama : undefined)
                                                ?? karyawanOptions.find(o => o.value === p.id_karyawan)?.label?.split(' — ')[1]
                                                ?? <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                            {p.id_armada
                                                ? (armadaMap[p.id_armada]?.nopol ?? p.id_armada.slice(0, 8))
                                                : <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${PENUGASAN_STATUS_CLASS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {p.status}
                                            </Tag>
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap">
                                            <Button size="xs" variant="plain" icon={<HiOutlineExternalLink />} className="mr-1"
                                                onClick={() => router.push(ROUTES.PENUGASAN_DETAIL(p.id_penugasan))} />
                                            <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                                                onClick={() => setDeletePenugasanTarget(p)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Dialog Tambah Penugasan — list pasangan supir–armada multi-centang (pola menu Penugasan) */}
            <Dialog isOpen={createDialogOpen} onRequestClose={closeCreateDialog} width={920}>
                <h5 className="text-base font-semibold mb-1">Tambah Penugasan</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Centang satu atau lebih pasangan supir–armada, lalu tentukan tanggal tugas.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitCreate() }}>
                    {pasanganLoading ? (
                        <div className="py-12 flex items-center justify-center">
                            <Spinner size={32} />
                        </div>
                    ) : pasanganError ? (
                        <div className="py-10 text-center">
                            <p className="text-red-500 text-sm">Gagal memuat data — coba buka ulang</p>
                        </div>
                    ) : pasanganList.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-gray-500 text-sm">
                                Belum ada pasangan supir–armada. Atur Armada Default di menu Supir.
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                Atau gunakan{' '}
                                <Link href={ROUTES.PENUGASAN_BARU} className="text-blue-600 hover:underline dark:text-blue-400">
                                    form manual
                                </Link>{' '}
                                untuk kombinasi bebas.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-4 mb-3">
                                <Input
                                    size="sm"
                                    className="max-w-xs"
                                    placeholder="Cari nama supir / nopol..."
                                    value={pairSearch}
                                    onChange={e => setPairSearch(e.target.value)}
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {checkedIds.length} pasangan dipilih
                                </span>
                            </div>
                            <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0 z-10">
                                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                                <th className="py-2.5 pl-3 pr-1 w-10 text-left">
                                                    <Tooltip title="Pilih semua yang tersedia">
                                                        <span>
                                                            <Checkbox
                                                                checked={allFilteredChecked}
                                                                disabled={filteredAvailable.length === 0}
                                                                onChange={toggleAllFiltered}
                                                            />
                                                        </span>
                                                    </Tooltip>
                                                </th>
                                                <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Supir</th>
                                                <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Armada</th>
                                                <th className="py-2.5 pr-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {filteredPasangan.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4}
                                                        className="py-6 text-center text-gray-400 text-sm">
                                                        Tidak ada pasangan yang cocok dengan pencarian
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredPasangan.map(renderPasanganRow)
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {createFormErrors.pasangan && (
                                <p className="text-red-500 text-xs mt-1.5">{createFormErrors.pasangan}</p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-5">
                                <FormItem label="Tanggal Tugas" asterisk invalid={!!createFormErrors.tanggal_tugas} errorMessage={createFormErrors.tanggal_tugas}>
                                    <DatePicker
                                        value={createForm.tanggal_tugas ? new Date(createForm.tanggal_tugas) : null}
                                        onChange={date => {
                                            setCreateForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : '' }))
                                            setCreateFormErrors(prev => ({ ...prev, tanggal_tugas: undefined }))
                                        }}
                                    />
                                </FormItem>
                                <FormItem label="Estimasi Biaya">
                                    <Input
                                        prefix="Rp"
                                        placeholder="0"
                                        value={createForm.estimasi_biaya ? formatNum(Number(createForm.estimasi_biaya)) : ''}
                                        onChange={e => setCreateForm(p => ({ ...p, estimasi_biaya: e.target.value.replace(/\D/g, '') }))}
                                    />
                                </FormItem>
                            </div>
                        </>
                    )}
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="plain" onClick={closeCreateDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={createSubmitting}
                            disabled={pasanganLoading || pasanganError || pasanganList.length === 0}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Dialog hasil pembuatan massal — tampil bila sebagian/semua gagal */}
            <Dialog isOpen={!!hasilPenugasan} onRequestClose={() => setHasilPenugasan(null)} width={640}>
                <h5 className="text-base font-semibold mb-1">Hasil Tambah Penugasan</h5>
                {hasilPenugasan && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            {hasilPenugasan.sukses} berhasil, {hasilPenugasan.gagal.length} gagal.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2.5 pl-3 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Supir</th>
                                        <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Armada</th>
                                        <th className="py-2.5 pr-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Alasan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {hasilPenugasan.gagal.map((g, i) => (
                                        <tr key={i}>
                                            <td className="py-2.5 pl-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{g.supir}</td>
                                            <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">{g.armada}</td>
                                            <td className="py-2.5 pr-3 text-red-500 text-xs">{g.alasan}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={() => setHasilPenugasan(null)}>Tutup</Button>
                </div>
            </Dialog>

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
