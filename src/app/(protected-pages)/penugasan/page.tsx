'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Button, Tag, Tooltip, toast, Notification, Dialog, FormItem, Input, DatePicker, Checkbox, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import PapanShift from './PapanShift'
import type { ColumnDef, CellContext, Row, DataTableResetHandle } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { useEstimasiPenugasan } from '@/utils/hooks/useEstimasiPenugasan'
import { ROUTES } from '@/constants/route.constant'
import { penugasanService, Penugasan, StatusPenugasan } from '@/services/penugasan.service'
import { projectService, Project } from '@/services/project.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'
import dayjs from 'dayjs'

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    aktif:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    batal:   'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400',
}

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
    tanggal_tugas: string
    estimasi_biaya: string
}

const EMPTY_CREATE_FORM: CreateFormState = {
    tanggal_tugas: '', estimasi_biaya: '',
}

type EditFormState = {
    id_armada: string
    id_supir: string
    tanggal_tugas: string
    estimasi_biaya: string
    status: StatusPenugasan
}

const EMPTY_EDIT_FORM: EditFormState = {
    id_armada: '', id_supir: '', tanggal_tugas: '', estimasi_biaya: '', status: 'pending',
}

type HasilGagal = { supir: string; armada: string; alasan: string }

export default function PenugasanPage() {
    const router = useRouter()
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaMap, setArmadaMap]         = useState<Record<string, Armada>>({})
    const [supirMap, setSupirMap]           = useState<Record<string, Supir>>({})
    const [supirList, setSupirList]         = useState<Supir[]>([])
    const [selectedProyek, setSelectedProyek] = useState<string>('')
    const [viewMode, setViewMode]             = useState<'tabel' | 'papan'>('tabel')
    const [list, setList]             = useState<Penugasan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]                    = useState(15)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Penugasan | null>(null)

    const tableRef = useRef<DataTableResetHandle | HTMLTableElement | null>(null)
    const [selectedIds, setSelectedIds]         = useState<string[]>([])
    const [bulkStatus, setBulkStatus]           = useState<StatusPenugasan | null>(null)
    const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
    const [bulkSubmitting, setBulkSubmitting]   = useState(false)
    const [hasilUbahStatus, setHasilUbahStatus] = useState<{ sukses: number; gagal: HasilGagal[] } | null>(null)

    const [createDialogOpen, setCreateDialogOpen]       = useState(false)
    const [createForm, setCreateForm]                   = useState<CreateFormState>(EMPTY_CREATE_FORM)
    const [checkedIds, setCheckedIds]                   = useState<string[]>([])
    const [pairSearch, setPairSearch]                   = useState('')
    const [createFormErrors, setCreateFormErrors]       = useState<Partial<Record<'pasangan' | 'tanggal_tugas', string>>>({})
    const [createSubmitting, setCreateSubmitting]       = useState(false)
    const [estimasiManual, setEstimasiManual]           = useState(false)
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
    const [editFormErrors, setEditFormErrors]     = useState<Partial<Record<'id_armada' | 'id_supir' | 'tanggal_tugas', string>>>({})
    const [editSubmitting, setEditSubmitting]     = useState(false)

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
            const [armadaRes, supirRes] = await Promise.all([
                armadaService.list(1, 100),
                supirService.list(1, 100),
            ])
            const aMap: Record<string, Armada> = {}
            armadaRes.data.forEach((a: Armada) => { aMap[a.id_armada] = a })
            setArmadaMap(aMap)
            const sMap: Record<string, Supir> = {}
            supirRes.data.forEach((s: Supir) => { sMap[s.id_supir] = s })
            setSupirMap(sMap)
            setSupirList(supirRes.data)
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
        projectService.list(1).then(res =>
            setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })))
        ).catch(() => {})
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

    const isPairSelectable = (p: Pasangan) => p.armada?.status === 'tersedia'

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
            .filter(a => a.status === 'tersedia' || a.id_armada === editTarget?.id_armada)
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
            const res = await penugasanService.list(selectedProyek, currentPage, 'internal')
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [selectedProyek, currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await penugasanService.delete(deleteTarget.id_penugasan)
            toast.push(<Notification type="success" title="Penugasan berhasil dihapus" />)
            const sisaCentang = selectedIds.filter(id => id !== deleteTarget.id_penugasan)
            if (sisaCentang.length === 0) {
                clearBulkSelection()
            } else {
                setSelectedIds(sisaCentang)
            }
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const clearBulkSelection = () => {
        setSelectedIds([])
        const t = tableRef.current
        if (t && 'resetSelected' in t) t.resetSelected()
    }

    const handleRowCheck = (checked: boolean, row: Penugasan) => {
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, row.id_penugasan]))
            : prev.filter(id => id !== row.id_penugasan))
    }

    const handleAllRowCheck = (checked: boolean, rows: Row<Penugasan>[]) => {
        const ids = rows.map(r => r.original.id_penugasan)
        setSelectedIds(prev => checked
            ? Array.from(new Set([...prev, ...ids]))
            : prev.filter(id => !ids.includes(id)))
    }

    const handlePageChange = (page: number) => {
        setSelectedIds([])
        setCurrentPage(page)
    }

    useEffect(() => {
        if (selectedIds.length === 0) setBulkStatus(null)
    }, [selectedIds.length])

    const bulkStatusLabel = STATUS_OPTIONS.find(o => o.value === bulkStatus)?.label ?? ''

    const bulkTargetCount = useMemo(
        () => list.filter(p => selectedIds.includes(p.id_penugasan)).length,
        [list, selectedIds])

    const handleBulkApply = async () => {
        if (!bulkStatus || selectedIds.length === 0) return
        const targets = list.filter(p => selectedIds.includes(p.id_penugasan))
        if (targets.length === 0) {
            setBulkConfirmOpen(false)
            setBulkStatus(null)
            clearBulkSelection()
            toast.push(<Notification type="info" title="Tidak ada penugasan yang bisa diubah — baris terpilih sudah tidak ada di daftar" />)
            return
        }
        const label = bulkStatusLabel || bulkStatus
        setBulkSubmitting(true)
        try {
            const results = await Promise.allSettled(targets.map(t =>
                penugasanService.update(t.id_penugasan, { status: bulkStatus })
            ))
            const gagal: HasilGagal[] = []
            results.forEach((r, i) => {
                if (r.status === 'rejected') {
                    const t   = targets[i]
                    const arm = t.id_armada ? armadaMap[t.id_armada] : null
                    const sup = t.id_supir ? supirMap[t.id_supir] : null
                    gagal.push({
                        armada: arm?.nopol ?? (t.id_armada ? t.id_armada.slice(0, 8) : '—'),
                        supir:  sup?.nama ?? (t.id_supir ? t.id_supir.slice(0, 8) : '—'),
                        alasan: parseApiError(r.reason),
                    })
                }
            })
            const sukses = results.length - gagal.length
            setBulkConfirmOpen(false)
            setBulkStatus(null)
            clearBulkSelection()
            fetchData()
            if (gagal.length === 0) {
                toast.push(<Notification type="success" title={`${sukses} penugasan diubah ke ${label}`} />)
            } else {
                setHasilUbahStatus({ sukses, gagal })
            }
        } finally {
            setBulkSubmitting(false)
        }
    }

    const openCreateDialog = () => {
        if (!selectedProyek) return
        setCreateForm({ ...EMPTY_CREATE_FORM, estimasi_biaya: estimasiOtomatis != null ? String(estimasiOtomatis) : '' })
        setEstimasiManual(false)
        setCheckedIds([])
        setPairSearch('')
        setCreateFormErrors({})
        setCreateDialogOpen(true)
        fetchArmadaSupir()
    }

    const closeCreateDialog = () => setCreateDialogOpen(false)

    const openEditDialog = (row: Penugasan) => {
        setEditTarget(row)
        setEditForm({
            id_armada:      row.id_armada ?? '',
            id_supir:       row.id_supir ?? '',
            tanggal_tugas:  row.tanggal_tugas ?? '',
            estimasi_biaya: row.estimasi_biaya != null ? String(row.estimasi_biaya) : '',
            status:         row.status,
        })
        setEditFormErrors({})
        setEditDialogOpen(true)
        fetchArmadaSupir()
    }

    const closeEditDialog = () => setEditDialogOpen(false)

    const validateCreateForm = () => {
        const e: typeof createFormErrors = {}
        if (checkedIds.length === 0) e.pasangan = 'Centang minimal satu pasangan'
        if (!createForm.tanggal_tugas) e.tanggal_tugas = 'Tanggal tugas wajib diisi'
        setCreateFormErrors(e)
        return Object.keys(e).length === 0
    }

    const validateEditForm = () => {
        const e: typeof editFormErrors = {}
        if (!editForm.id_armada) e.id_armada = 'Pilih armada'
        if (!editForm.id_supir) e.id_supir = 'Pilih supir'
        if (!editForm.tanggal_tugas) e.tanggal_tugas = 'Tanggal tugas wajib diisi'
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
            const pairs = pasanganList.filter(p => checkedIds.includes(p.supir.id_supir))
            const results = await Promise.allSettled(pairs.map(p =>
                penugasanService.create({
                    id_proyek:      selectedProyek,
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
                id_armada:      editForm.id_armada,
                id_supir:       editForm.id_supir,
                tanggal_tugas:  editForm.tanggal_tugas,
                estimasi_biaya: estimasi,
                status:         editForm.status,
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

    const columns: ColumnDef<Penugasan>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<Penugasan, unknown>) =>
                props.row.index + 1 + (currentPage - 1) * pageSize,
        },
        {
            header: 'Armada', accessorKey: 'id_armada',
            cell: ({ row }) => {
                const arm = row.original.id_armada ? armadaMap[row.original.id_armada] : null
                return arm ? (
                    <div>
                        <p className="font-semibold">{arm.nopol}</p>
                        <p className="text-xs text-gray-400">{arm.merk} {arm.model ?? ''}</p>
                    </div>
                ) : <span className="text-gray-400">—</span>
            },
        },
        {
            header: 'Supir', accessorKey: 'id_supir',
            cell: ({ row }) => {
                const sup = row.original.id_supir ? supirMap[row.original.id_supir] : null
                return sup ? (
                    <div>
                        <p className="font-medium">{sup.nama}</p>
                        <p className="text-xs text-gray-400">SIM {sup.jenis_sim}</p>
                    </div>
                ) : <span className="text-gray-400">—</span>
            },
        },
        {
            header: 'Tanggal Tugas', accessorKey: 'tanggal_tugas', size: 150,
            cell: ({ row }) => row.original.tanggal_tugas
                ? dayjs(row.original.tanggal_tugas).format('DD MMM YYYY')
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Status', accessorKey: 'status', size: 120,
            cell: ({ row }) => (
                <Tag className={STATUS_CLASS[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'aksi', size: 130,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
                    <Tooltip title="Edit">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 transition-colors"
                            onClick={() => openEditDialog(row.original)}
                        >
                            <HiOutlinePencilAlt className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Detail">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => router.push(ROUTES.PENUGASAN_DETAIL(row.original.id_penugasan))}
                        >
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <span
                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                            onClick={() => setDeleteTarget(row.original)}
                        >
                            <HiOutlineTrash className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

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

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
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
                Penugasan vendor dikelola di menu{' '}
                <Link href={ROUTES.PENUGASAN_VENDOR} className="text-blue-600 hover:underline dark:text-blue-400">
                    Operasional Vendor →
                </Link>
            </p>
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center gap-3">
                    <Select
                        className="w-96"
                        placeholder="Pilih proyek untuk melihat penugasan..."
                        options={proyekOptions}
                        value={proyekOptions.find(o => o.value === selectedProyek) ?? null}
                        onChange={(opt) => {
                            setSelectedProyek((opt as { value: string } | null)?.value ?? '')
                            setCurrentPage(1)
                            clearBulkSelection()
                        }}
                    />
                    <div className="flex items-center gap-2 sm:ml-auto">
                        <Button size="sm" variant={viewMode === 'tabel' ? 'solid' : 'default'}
                            onClick={() => setViewMode('tabel')}>
                            Tabel
                        </Button>
                        <Button size="sm" variant={viewMode === 'papan' ? 'solid' : 'default'}
                            onClick={() => setViewMode('papan')}>
                            Papan Jadwal
                        </Button>
                    </div>
                </div>

                {selectedProyek && selectedIds.length > 0 && (
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-blue-50/60 dark:bg-blue-500/10 flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {selectedIds.length} penugasan dipilih
                        </span>
                        <div className="w-44">
                            <Select
                                size="sm"
                                isSearchable={false}
                                placeholder="Status tujuan..."
                                options={STATUS_OPTIONS}
                                value={STATUS_OPTIONS.find(o => o.value === bulkStatus) ?? null}
                                onChange={opt => setBulkStatus((opt?.value as StatusPenugasan) ?? null)}
                            />
                        </div>
                        <Button
                            variant="solid"
                            size="sm"
                            loading={bulkSubmitting}
                            disabled={!bulkStatus}
                            onClick={() => setBulkConfirmOpen(true)}
                        >
                            Terapkan
                        </Button>
                        <Button
                            variant="plain"
                            size="sm"
                            disabled={bulkSubmitting}
                            onClick={() => { setBulkStatus(null); clearBulkSelection() }}
                        >
                            Batal
                        </Button>
                    </div>
                )}

                {!selectedProyek ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                        Pilih proyek di atas untuk melihat daftar penugasan
                    </div>
                ) : viewMode === 'papan' ? (
                    <PapanShift idProyek={selectedProyek} />
                ) : (
                    <DataTable
                        ref={(instance: DataTableResetHandle | HTMLTableElement | null) => { tableRef.current = instance }}
                        selectable
                        columns={columns}
                        data={list as unknown[]}
                        loading={loading}
                        pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                        onPaginationChange={handlePageChange}
                        onCheckBoxChange={handleRowCheck}
                        onIndeterminateCheckBoxChange={handleAllRowCheck}
                        checkboxChecked={(row: Penugasan) => selectedIds.includes(row.id_penugasan)}
                        indeterminateCheckboxChecked={(rows: Row<Penugasan>[]) =>
                            rows.length > 0 && rows.every(r => selectedIds.includes(r.original.id_penugasan))}
                    />
                )}
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Penugasan"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus penugasan ini? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={bulkConfirmOpen} type="warning" title="Ubah Status Massal"
                confirmText="Ya, Ubah" cancelText="Batal"
                onClose={() => setBulkConfirmOpen(false)} onConfirm={handleBulkApply}
                confirmButtonProps={{ loading: bulkSubmitting }}>
                <p>Ubah status {bulkTargetCount} penugasan menjadi {bulkStatusLabel}?</p>
            </ConfirmDialog>

            <Dialog isOpen={!!hasilUbahStatus} onRequestClose={() => setHasilUbahStatus(null)} width={520}>
                <h5 className="text-base font-semibold mb-1">Hasil Ubah Status</h5>
                {hasilUbahStatus && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            {hasilUbahStatus.sukses} berhasil, {hasilUbahStatus.gagal.length} gagal.
                            {hasilUbahStatus.sukses > 0 && ' Perubahan yang berhasil tetap tersimpan.'}
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2.5 pl-3 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Armada</th>
                                        <th className="py-2.5 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Supir</th>
                                        <th className="py-2.5 pr-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Alasan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {hasilUbahStatus.gagal.map((g, i) => (
                                        <tr key={i}>
                                            <td className="py-2.5 pl-3 pr-4 font-semibold text-gray-800 dark:text-gray-200">{g.armada}</td>
                                            <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">{g.supir}</td>
                                            <td className="py-2.5 pr-3 text-red-500 text-xs">{g.alasan}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                <div className="flex justify-end mt-6">
                    <Button variant="solid" onClick={() => setHasilUbahStatus(null)}>Tutup</Button>
                </div>
            </Dialog>

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
                                {ruteOptions.length > 1 && (
                                    <FormItem label="Rute (untuk estimasi)">
                                        <Select isSearchable={false}
                                            options={ruteOptions}
                                            value={ruteOptions.find(o => o.value === ruteItemId) ?? null}
                                            onChange={opt => { if (opt) { setRuteItemId(opt.value); setEstimasiManual(false) } }}
                                        />
                                    </FormItem>
                                )}
                                <FormItem label="Estimasi Biaya">
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
                                        <p className="text-xs text-amber-500 mt-1">Data tarif rute belum lengkap — isi estimasi manual</p>
                                    )}
                                </FormItem>
                            </div>
                        </>
                    )}
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeCreateDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={createSubmitting}
                            disabled={pasanganLoading || pasanganError || pasanganList.length === 0}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={editDialogOpen} onRequestClose={closeEditDialog} width={520}>
                <h5 className="text-base font-semibold mb-1">Edit Penugasan</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Ubah armada, supir, tanggal tugas, estimasi biaya, atau status penugasan ini.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitEdit() }}>
                    {pasanganLoading ? (
                        <div className="py-12 flex items-center justify-center">
                            <Spinner size={32} />
                        </div>
                    ) : pasanganError ? (
                        <div className="py-10 text-center">
                            <p className="text-red-500 text-sm">Gagal memuat data armada/supir — coba buka ulang</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <FormItem label="Armada" asterisk invalid={!!editFormErrors.id_armada} errorMessage={editFormErrors.id_armada}>
                                <Select
                                    placeholder="Pilih armada..."
                                    options={armadaOptionsForEdit}
                                    value={armadaOptionsForEdit.find(o => o.value === editForm.id_armada) ?? null}
                                    onChange={opt => {
                                        setEditForm(p => ({ ...p, id_armada: (opt as { value: string } | null)?.value ?? '' }))
                                        setEditFormErrors(prev => ({ ...prev, id_armada: undefined }))
                                    }}
                                />
                            </FormItem>
                            <FormItem label="Supir" asterisk invalid={!!editFormErrors.id_supir} errorMessage={editFormErrors.id_supir}>
                                <Select
                                    placeholder="Pilih supir..."
                                    options={supirOptionsForEdit}
                                    value={supirOptionsForEdit.find(o => o.value === editForm.id_supir) ?? null}
                                    onChange={opt => {
                                        setEditForm(p => ({ ...p, id_supir: (opt as { value: string } | null)?.value ?? '' }))
                                        setEditFormErrors(prev => ({ ...prev, id_supir: undefined }))
                                    }}
                                />
                            </FormItem>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Tanggal Tugas" asterisk invalid={!!editFormErrors.tanggal_tugas} errorMessage={editFormErrors.tanggal_tugas}>
                                    <DatePicker
                                        value={editForm.tanggal_tugas ? new Date(editForm.tanggal_tugas) : null}
                                        onChange={date => {
                                            setEditForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : '' }))
                                            setEditFormErrors(prev => ({ ...prev, tanggal_tugas: undefined }))
                                        }}
                                    />
                                </FormItem>
                                <FormItem label="Estimasi Biaya">
                                    <Input
                                        prefix="Rp"
                                        placeholder="0"
                                        value={editForm.estimasi_biaya ? formatNum(Number(editForm.estimasi_biaya)) : ''}
                                        onChange={e => setEditForm(p => ({ ...p, estimasi_biaya: e.target.value.replace(/\D/g, '') }))}
                                    />
                                </FormItem>
                            </div>
                            <FormItem label="Status">
                                <Select
                                    isSearchable={false}
                                    options={STATUS_OPTIONS}
                                    value={STATUS_OPTIONS.find(o => o.value === editForm.status) ?? null}
                                    onChange={opt => setEditForm(p => ({ ...p, status: (opt?.value ?? 'pending') as StatusPenugasan }))}
                                />
                            </FormItem>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeEditDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={editSubmitting}
                            disabled={pasanganLoading || pasanganError}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!hasilPenugasan} onRequestClose={() => setHasilPenugasan(null)} width={520}>
                <h5 className="text-base font-semibold mb-1">Hasil Penugasan</h5>
                {hasilPenugasan && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            {hasilPenugasan.sukses} berhasil, {hasilPenugasan.gagal.length} gagal.
                            {hasilPenugasan.sukses > 0 && ' Penugasan yang berhasil tetap tersimpan.'}
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
        </div>
    )
}
