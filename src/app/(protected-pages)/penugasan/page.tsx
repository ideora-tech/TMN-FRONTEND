'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, Button, Tag, Tooltip, toast, Notification, Dialog, FormItem, Input, Checkbox, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import PapanShift from './PapanShift'
import MulaiTripDialog from '../trip/MulaiTripDialog'
import { HiPlusCircle, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { useEstimasiPenugasan } from '@/utils/hooks/useEstimasiPenugasan'
import { ROUTES } from '@/constants/route.constant'
import { penugasanService, Penugasan, StatusPenugasan, OpsiArmadaVendor } from '@/services/penugasan.service'
import { projectService, Project } from '@/services/project.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'

const UNIT_STATUS_CLASS: Record<string, string> = {
    tersedia:    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    digunakan:   'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    perawatan:   'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    tidak_aktif: 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400',
}

const UNIT_STATUS_LABEL: Record<string, string> = {
    tersedia:    'Tersedia',
    digunakan:   'Dalam Perjalanan',
    perawatan:   'Perawatan',
    tidak_aktif: 'Tidak Aktif',
}

const STATUS_OPTIONS: { value: StatusPenugasan; label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

type Pasangan = {
    supir: Supir
    armada: Armada | null
}

type CreateFormState = {
    estimasi_biaya: string
}

const EMPTY_CREATE_FORM: CreateFormState = {
    estimasi_biaya: '',
}

type EditFormState = {
    id_armada: string
    id_supir: string
    estimasi_biaya: string
    status: StatusPenugasan
}

const EMPTY_EDIT_FORM: EditFormState = {
    id_armada: '', id_supir: '', estimasi_biaya: '', status: 'pending',
}

type HasilGagal = { supir: string; armada: string; alasan: string }

export default function PenugasanPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string; namaKlien: string | null }[]>([])
    const [armadaMap, setArmadaMap]         = useState<Record<string, Armada>>({})
    const [supirMap, setSupirMap]           = useState<Record<string, Supir>>({})
    const [supirList, setSupirList]         = useState<Supir[]>([])
    const [vendorArmadaMap, setVendorArmadaMap] = useState<Record<string, OpsiArmadaVendor>>({})
    const [selectedProyek, setSelectedProyek] = useState<string>(() =>
        searchParams.get('proyek')
        ?? (typeof window !== 'undefined' ? localStorage.getItem('penugasan.proyek') ?? '' : ''))

    const gantiProyek = (id: string) => {
        setSelectedProyek(id)
        if (typeof window !== 'undefined') {
            if (id) localStorage.setItem('penugasan.proyek', id)
            else localStorage.removeItem('penugasan.proyek')
        }
        router.replace(id ? `${ROUTES.PENUGASAN}?proyek=${id}` : ROUTES.PENUGASAN, { scroll: false })
    }
    const [list, setList]             = useState<Penugasan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Penugasan | null>(null)

    const [createDialogOpen, setCreateDialogOpen]       = useState(false)
    const [createForm, setCreateForm]                   = useState<CreateFormState>(EMPTY_CREATE_FORM)
    const [checkedIds, setCheckedIds]                   = useState<string[]>([])
    const [pairSearch, setPairSearch]                   = useState('')
    const [createFormErrors, setCreateFormErrors]       = useState<Partial<Record<'pasangan', string>>>({})
    const [createSubmitting, setCreateSubmitting]       = useState(false)
    const [estimasiManual, setEstimasiManual]           = useState(false)
    const [titikDropCreate, setTitikDropCreate] = useState<string[]>([])
    const tambahDropCreate = () => setTitikDropCreate(prev => (prev.length < 10 ? [...prev, ''] : prev))
    const ubahDropCreate   = (i: number, v: string) => setTitikDropCreate(prev => prev.map((d, idx) => (idx === i ? v : d)))
    const hapusDropCreate  = (i: number) => setTitikDropCreate(prev => prev.filter((_, idx) => idx !== i))
    const {
        itemOptions: ruteOptions,
        selectedItemId: ruteItemId,
        setSelectedItemId: setRuteItemId,
        estimasi: estimasiOtomatis,
        namaRute: namaRuteEstimasi,
        dataTidakLengkap: estimasiDataTidakLengkap,
    } = useEstimasiPenugasan(selectedProyek || null)

    useEffect(() => {
        if (estimasiManual || estimasiOtomatis == null) return
        setCreateForm(p => ({ ...p, estimasi_biaya: String(estimasiOtomatis) }))
    }, [estimasiOtomatis, estimasiManual])

    const [editDialogOpen, setEditDialogOpen]     = useState(false)
    const [editTarget, setEditTarget]             = useState<Penugasan | null>(null)
    const [editForm, setEditForm]                 = useState<EditFormState>(EMPTY_EDIT_FORM)
    const [editFormErrors, setEditFormErrors]     = useState<Partial<Record<'id_armada' | 'id_supir', string>>>({})
    const [editSubmitting, setEditSubmitting]     = useState(false)
    const [titikDropEdit, setTitikDropEdit] = useState<string[]>([])
    const tambahDropEdit = () => setTitikDropEdit(prev => (prev.length < 10 ? [...prev, ''] : prev))
    const ubahDropEdit   = (i: number, v: string) => setTitikDropEdit(prev => prev.map((d, idx) => (idx === i ? v : d)))
    const hapusDropEdit  = (i: number) => setTitikDropEdit(prev => prev.filter((_, idx) => idx !== i))

    const [showMulaiTrip, setShowMulaiTrip] = useState(false)
    const [refreshSignal, setRefreshSignal] = useState(0)

    const [hasilPenugasan, setHasilPenugasan] = useState<{ sukses: number; gagal: HasilGagal[] } | null>(null)

    const [pasanganLoading, setPasanganLoading] = useState(false)
    const [pasanganError, setPasanganError]     = useState(false)

    const pasanganLoadedRef = useRef(false)

    const fetchArmadaSupir = useCallback(async () => {
        if (!pasanganLoadedRef.current) {
            setPasanganLoading(true)
            setPasanganError(false)
        }
        try {
            const [armadaRes, supirRes, armadaVendorList] = await Promise.all([
                armadaService.list(1, 100),
                supirService.list(1, 100),
                penugasanService.opsiArmadaVendor(),
            ])
            const aMap: Record<string, Armada> = {}
            armadaRes.data.forEach((a: Armada) => { aMap[a.id_armada] = a })
            setArmadaMap(aMap)
            const sMap: Record<string, Supir> = {}
            supirRes.data.forEach((s: Supir) => { sMap[s.id_supir] = s })
            setSupirMap(sMap)
            setSupirList(supirRes.data)
            const vMap: Record<string, OpsiArmadaVendor> = {}
            armadaVendorList.forEach((v: OpsiArmadaVendor) => { vMap[v.id_armada_vendor] = v })
            setVendorArmadaMap(vMap)
            pasanganLoadedRef.current = true
            setPasanganError(false)
        } catch {
            if (!pasanganLoadedRef.current) {
                setPasanganError(true)
            }
        } finally {
            setPasanganLoading(false)
        }
    }, [])

    useEffect(() => {
        projectService.list(1).then(res => {
            setProyekOptions(res.data.map((p: Project) => ({
                value: p.id_proyek,
                label: `${p.kode_proyek} — ${p.nama_proyek}`,
                namaKlien: p.nama_klien ?? null,
            })))
        }).catch(() => {})
        fetchArmadaSupir()
    }, [fetchArmadaSupir])

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

    const isPairSelectable = (p: Pasangan) => p.armada?.status === 'tersedia' || p.armada?.status === 'digunakan'

    const filteredAvailable = useMemo(
        () => filteredPasangan.filter(isPairSelectable),
        [filteredPasangan])

    const allFilteredChecked = filteredAvailable.length > 0
        && filteredAvailable.every(p => checkedIds.includes(p.supir.id_supir))

    const togglePair = (id: string) => {
        setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        setCreateFormErrors(prev => ({ ...prev, pasangan: undefined }))
    }

    const toggleAllFiltered = () => {
        const ids = filteredAvailable.map(p => p.supir.id_supir)
        setCheckedIds(prev => allFilteredChecked
            ? prev.filter(x => !ids.includes(x))
            : Array.from(new Set([...prev, ...ids])))
        setCreateFormErrors(prev => ({ ...prev, pasangan: undefined }))
    }

    const armadaOptionsForEdit = useMemo(() => {
        const opts = Object.values(armadaMap)
            .filter(a => a.status === 'tersedia' || a.status === 'digunakan' || a.id_armada === editTarget?.id_armada)
            .map(a => ({
                value: a.id_armada,
                label: a.status === 'tersedia'
                    ? `${a.nopol} — ${a.merk}`
                    : `${a.nopol} — ${a.merk} (${UNIT_STATUS_LABEL[a.status] ?? a.status})`,
            }))
        if (editTarget?.id_armada && !opts.some(o => o.value === editTarget.id_armada)) {
            opts.push({ value: editTarget.id_armada, label: editTarget.id_armada.slice(0, 8) })
        }
        return opts
    }, [armadaMap, editTarget])

    const supirIdByArmadaDefault = useMemo(() => {
        const m: Record<string, string> = {}
        supirList.forEach(s => {
            if (s.id_armada_default && !(s.id_armada_default in m)) m[s.id_armada_default] = s.id_supir
        })
        return m
    }, [supirList])

    const supirOptionsForEdit = useMemo(() => {
        const opts = supirList
            .filter(s => s.status === 'aktif' || s.id_supir === editTarget?.id_supir)
            .map(s => ({
                value: s.id_supir,
                label: s.status === 'aktif' ? s.nama : `${s.nama} (Nonaktif)`,
            }))
        if (editTarget?.id_supir && !opts.some(o => o.value === editTarget!.id_supir)) {
            opts.push({ value: editTarget.id_supir, label: editTarget.id_supir.slice(0, 8) })
        }
        return opts
    }, [supirList, editTarget])

    const fetchData = useCallback(async () => {
        if (!selectedProyek) return
        setLoading(true)
        try {
            const res = await penugasanService.list(selectedProyek, 1, 'operasional', 100)
            setList(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [selectedProyek])

    useEffect(() => { fetchData() }, [fetchData])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await penugasanService.delete(deleteTarget.id_penugasan)
            toast.push(<Notification type="success" title="Penugasan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const openCreateDialog = () => {
        if (!selectedProyek) return
        setCreateForm({ ...EMPTY_CREATE_FORM, estimasi_biaya: estimasiOtomatis != null ? String(estimasiOtomatis) : '' })
        setEstimasiManual(false)
        setCheckedIds([])
        setPairSearch('')
        setCreateFormErrors({})
        setTitikDropCreate([])
        setCreateDialogOpen(true)
        fetchArmadaSupir()
    }

    const closeCreateDialog = () => setCreateDialogOpen(false)

    const openEditDialog = (row: Penugasan) => {
        setEditTarget(row)
        setEditForm({
            id_armada:      row.id_armada ?? '',
            id_supir:       row.id_supir ?? '',
            estimasi_biaya: row.estimasi_biaya != null ? String(row.estimasi_biaya) : '',
            status:         row.status,
        })
        setEditFormErrors({})
        setTitikDropEdit(row.titik_drop ?? [])
        setEditDialogOpen(true)
        fetchArmadaSupir()
    }

    const closeEditDialog = () => setEditDialogOpen(false)

    const validateCreateForm = () => {
        const e: typeof createFormErrors = {}
        if (checkedIds.length === 0) e.pasangan = 'Centang minimal satu pasangan'
        setCreateFormErrors(e)
        return Object.keys(e).length === 0
    }

    const validateEditForm = () => {
        const e: typeof editFormErrors = {}
        if (!editForm.id_supir) e.id_supir = 'Pilih supir'
        setEditFormErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmitCreate = async () => {
        if (!selectedProyek) return
        if (!validateCreateForm()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setCreateSubmitting(true)
        try {
            const estimasi = createForm.estimasi_biaya ? Number(createForm.estimasi_biaya) : null
            const titikDrop = titikDropCreate.map(d => d.trim()).filter(Boolean)
            const pairs = pasanganList.filter(p => checkedIds.includes(p.supir.id_supir))
            const results = await Promise.allSettled(pairs.map(p =>
                penugasanService.create({
                    id_proyek:      selectedProyek,
                    id_supir:       p.supir.id_supir,
                    id_armada:      p.supir.id_armada_default ?? undefined,
                    estimasi_biaya: estimasi,
                    titik_drop:     titikDrop,
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
            fetchData()
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

    const handleSubmitEdit = async () => {
        if (!editTarget) return
        if (!validateEditForm()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setEditSubmitting(true)
        try {
            const estimasi = editForm.estimasi_biaya ? Number(editForm.estimasi_biaya) : null
            await penugasanService.update(editTarget.id_penugasan, {
                ...(editTarget.sumber === 'vendor' ? {} : { id_armada: editForm.id_armada || null }),
                id_supir:       editForm.id_supir,
                estimasi_biaya: estimasi,
                status:         editForm.status,
                titik_drop:     titikDropEdit.map(d => d.trim()).filter(Boolean),
            })
            toast.push(<Notification type="success" title="Penugasan berhasil diperbarui" />)
            setEditDialogOpen(false)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setEditSubmitting(false)
        }
    }

    const renderPasanganRow = (p: Pasangan) => {
        const id         = p.supir.id_supir
        const selectable = isPairSelectable(p)
        const isChecked  = checkedIds.includes(id)
        return (
            <tr
                key={id}
                className={`${selectable ? 'hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer' : 'opacity-50 cursor-not-allowed'} transition-colors`}
                onClick={() => { if (selectable) togglePair(id) }}
            >
                <td className="py-2.5 pl-3 pr-1 w-10" onClick={e => e.stopPropagation()}>
                    <Checkbox
                        checked={isChecked}
                        disabled={!selectable}
                        onChange={() => togglePair(id)}
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
                            <p className="text-xs text-gray-400">{[p.armada.nama_jenis, p.armada.merk].filter(Boolean).join(' · ')}</p>
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

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Penugasan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola penugasan armada dan supir</p>
                </div>
                <Tooltip title="Pilih proyek dulu" disabled={!!selectedProyek}>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                        disabled={!selectedProyek}
                        onClick={openCreateDialog}>
                        Tambah Penugasan
                    </Button>
                </Tooltip>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
                Unit vendor (mekanisme Unit Only) sudah bisa ditugaskan langsung di sini. Penugasan dengan supir dari vendor
                (Unit + Driver / Full) tetap dikelola di menu{' '}
                <Link href={ROUTES.PENUGASAN_VENDOR} className="text-blue-600 hover:underline dark:text-blue-400">
                    Operasional Vendor →
                </Link>
            </p>
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3">
                    <Select
                        className="w-full sm:w-96"
                        placeholder="Pilih proyek untuk melihat penugasan..."
                        options={proyekOptions}
                        value={proyekOptions.find(o => o.value === selectedProyek) ?? null}
                        onChange={(opt) => gantiProyek((opt as { value: string } | null)?.value ?? '')}
                    />
                    {selectedProyek && proyekOptions.find(o => o.value === selectedProyek)?.namaKlien && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Klien: <span className="font-medium text-gray-700 dark:text-gray-200">
                                {proyekOptions.find(o => o.value === selectedProyek)?.namaKlien}
                            </span>
                        </span>
                    )}
                </div>

                {!selectedProyek ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                        Pilih proyek di atas untuk melihat daftar penugasan
                    </div>
                ) : (
                    <PapanShift
                        idProyek={selectedProyek}
                        namaProyek={proyekOptions.find(o => o.value === selectedProyek)?.label ?? ''}
                        penugasanList={list}
                        armadaMap={armadaMap}
                        supirMap={supirMap}
                        vendorArmadaMap={vendorArmadaMap}
                        loadingPenugasan={loading}
                        onEdit={openEditDialog}
                        onDelete={setDeleteTarget}
                        refetchPenugasan={fetchData}
                        refreshSignal={refreshSignal}
                    />
                )}
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Penugasan"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus penugasan ini? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            <Dialog isOpen={createDialogOpen} onRequestClose={closeCreateDialog} onClose={closeCreateDialog} width={920}>
                <h5 className="text-base font-semibold mb-1">Tambah Penugasan</h5>
                <p className="text-xs text-gray-400 mb-1">
                    Centang satu atau lebih pasangan supir–armada untuk di-assign ke proyek ini.
                    Jadwal harian per tanggal diatur belakangan di papan jadwal.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                    Butuh unit vendor (mekanisme Unit Only) atau kombinasi bebas lain?{' '}
                    <Link href={ROUTES.PENUGASAN_BARU} className="text-blue-600 hover:underline dark:text-blue-400">
                        Pakai form manual →
                    </Link>
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitCreate() }}>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
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
                                <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-2">
                                    {checkedIds.length} pasangan dipilih
                                    {checkedIds.length > 0 && (
                                        <button type="button"
                                            className="text-blue-600 hover:underline dark:text-blue-400"
                                            onClick={() => setCheckedIds([])}>
                                            Batalkan
                                        </button>
                                    )}
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
                                                <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Supir</th>
                                                <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Armada</th>
                                                <th className="py-2.5 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Status Unit</th>
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
                                {ruteOptions.length > 1 && (
                                    <FormItem label="Rute (untuk estimasi)">
                                        <Select isSearchable={false}
                                            options={ruteOptions}
                                            value={ruteOptions.find(o => o.value === ruteItemId) ?? null}
                                            onChange={opt => { if (opt) { setRuteItemId(opt.value); setEstimasiManual(false) } }}
                                        />
                                    </FormItem>
                                )}
                                <FormItem label="Uang Jalan">
                                    <Input
                                        prefix="Rp"
                                        placeholder="0"
                                        value={createForm.estimasi_biaya ? formatNum(Number(createForm.estimasi_biaya)) : ''}
                                        onChange={e => { setEstimasiManual(true); setCreateForm(p => ({ ...p, estimasi_biaya: e.target.value.replace(/\D/g, '') })) }}
                                    />
                                    {!estimasiManual && estimasiOtomatis != null && namaRuteEstimasi && (
                                        <p className="text-xs text-gray-400 mt-1">Otomatis dari tarif rute: {namaRuteEstimasi}</p>
                                    )}
                                    {!estimasiManual && estimasiOtomatis == null && estimasiDataTidakLengkap && (
                                        <p className="text-xs text-amber-500 mt-1">Rute proyek belum punya tarif — isi estimasi manual</p>
                                    )}
                                </FormItem>
                            </div>

                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-semibold">Titik Drop (opsional)</p>
                                    <Button type="button" size="xs" variant="plain" icon={<HiOutlinePlus />}
                                        disabled={titikDropCreate.length >= 10} onClick={tambahDropCreate}>Tambah Titik</Button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {titikDropCreate.map((lokasi, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                            <Input size="sm" placeholder={`Titik drop ${i + 1}...`} value={lokasi}
                                                onChange={e => ubahDropCreate(i, e.target.value)} />
                                            <button type="button" onClick={() => hapusDropCreate(i)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeCreateDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={createSubmitting}
                            disabled={pasanganLoading || pasanganError || pasanganList.length === 0}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={editDialogOpen} onRequestClose={closeEditDialog} onClose={closeEditDialog} width={700}>
                <h5 className="text-base font-semibold mb-1">Edit Penugasan</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Ubah armada, supir, uang jalan, atau status penugasan ini.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitEdit() }}>
                    <div className="max-h-[65vh] overflow-y-auto pr-1">
                    {pasanganLoading ? (
                        <div className="py-12 flex items-center justify-center">
                            <Spinner size={32} />
                        </div>
                    ) : pasanganError ? (
                        <div className="py-10 text-center">
                            <p className="text-red-500 text-sm">Gagal memuat data armada/supir — coba buka ulang</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                            {editTarget?.sumber === 'vendor' ? (
                                <FormItem label="Armada">
                                    <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/40 text-sm">
                                        {editTarget.id_armada_vendor && vendorArmadaMap[editTarget.id_armada_vendor]
                                            ? `${vendorArmadaMap[editTarget.id_armada_vendor].nopol} — Vendor ${vendorArmadaMap[editTarget.id_armada_vendor].nama_vendor}`
                                            : 'Unit vendor'}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Unit vendor tidak dapat diganti dari sini — buat penugasan baru bila perlu unit lain.</p>
                                </FormItem>
                            ) : (
                                <FormItem label="Armada" invalid={!!editFormErrors.id_armada} errorMessage={editFormErrors.id_armada}>
                                    <Select
                                        isClearable
                                        placeholder="Kosongkan untuk supir shift — armada diisi otomatis dari jadwal"
                                        options={armadaOptionsForEdit}
                                        value={armadaOptionsForEdit.find(o => o.value === editForm.id_armada) ?? null}
                                        onChange={opt => {
                                            const idArmada = (opt as { value: string } | null)?.value ?? ''
                                            const idSupirIkut = idArmada ? supirIdByArmadaDefault[idArmada] : undefined
                                            setEditForm(p => ({
                                                ...p,
                                                id_armada: idArmada,
                                                ...(idSupirIkut ? { id_supir: idSupirIkut } : {}),
                                            }))
                                            setEditFormErrors(prev => ({
                                                ...prev,
                                                id_armada: undefined,
                                                ...(idSupirIkut ? { id_supir: undefined } : {}),
                                            }))
                                        }}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Supir shift/pengganti: biarkan kosong — sistem meminjamkan mobil supir yang libur saat dia dijadwalkan.</p>
                                </FormItem>
                            )}
                            <FormItem label="Supir" asterisk invalid={!!editFormErrors.id_supir} errorMessage={editFormErrors.id_supir}>
                                <Select
                                    placeholder="Pilih supir..."
                                    options={supirOptionsForEdit}
                                    value={supirOptionsForEdit.find(o => o.value === editForm.id_supir) ?? null}
                                    onChange={opt => {
                                        const idSupir = (opt as { value: string } | null)?.value ?? ''
                                        const selected = supirList.find(s => s.id_supir === idSupir)
                                        setEditForm(p => ({
                                            ...p,
                                            id_supir: idSupir,
                                            ...(selected?.id_armada_default ? { id_armada: selected.id_armada_default } : {}),
                                        }))
                                        setEditFormErrors(prev => ({ ...prev, id_supir: undefined }))
                                    }}
                                />
                            </FormItem>
                            <FormItem label="Uang Jalan">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={editForm.estimasi_biaya ? formatNum(Number(editForm.estimasi_biaya)) : ''}
                                    onChange={e => setEditForm(p => ({ ...p, estimasi_biaya: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                            <FormItem label="Status"
                                extra={editTarget?.status === 'batal'
                                    ? <span className="text-xs text-gray-400">Penugasan batal tidak dapat diaktifkan kembali — buat penugasan baru</span>
                                    : undefined}>
                                <Select
                                    isSearchable={false}
                                    isDisabled={editTarget?.status === 'batal'}
                                    options={STATUS_OPTIONS}
                                    value={STATUS_OPTIONS.find(o => o.value === editForm.status) ?? null}
                                    onChange={opt => setEditForm(p => ({ ...p, status: (opt?.value ?? 'pending') as StatusPenugasan }))}
                                />
                            </FormItem>

                            <div className="mt-1 sm:col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-semibold">Titik Drop (opsional)</p>
                                    <Button type="button" size="xs" variant="plain" icon={<HiOutlinePlus />}
                                        disabled={titikDropEdit.length >= 10} onClick={tambahDropEdit}>Tambah Titik</Button>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {titikDropEdit.map((lokasi, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                            <Input size="sm" placeholder={`Titik drop ${i + 1}...`} value={lokasi}
                                                onChange={e => ubahDropEdit(i, e.target.value)} />
                                            <button type="button" onClick={() => hapusDropEdit(i)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-1 sm:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-sm font-semibold mb-2">Trip</p>
                                <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                    onClick={() => {
                                        setEditDialogOpen(false)
                                        setShowMulaiTrip(true)
                                    }}>
                                    Mulai Trip
                                </Button>
                            </div>
                        </div>
                    )}
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeEditDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={editSubmitting}
                            disabled={pasanganLoading || pasanganError}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!hasilPenugasan} onRequestClose={() => setHasilPenugasan(null)} onClose={() => setHasilPenugasan(null)} width={520}>
                <h5 className="text-base font-semibold mb-1">Hasil Penugasan</h5>
                {hasilPenugasan && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            {hasilPenugasan.sukses} berhasil, {hasilPenugasan.gagal.length} gagal.
                            {hasilPenugasan.sukses > 0 && ' Penugasan yang berhasil tetap tersimpan.'}
                        </p>
                        <div className="max-h-[65vh] overflow-x-auto overflow-y-auto pr-1">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Supir</th>
                                        <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Armada</th>
                                        <th className="py-2.5 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
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

            <MulaiTripDialog
                isOpen={showMulaiTrip}
                onClose={() => setShowMulaiTrip(false)}
                onSukses={() => { fetchData(); setRefreshSignal(n => n + 1) }}
                idPenugasanTerkunci={editTarget?.id_penugasan}
                idProyekTerkunci={selectedProyek}
            />
        </div>
    )
}
