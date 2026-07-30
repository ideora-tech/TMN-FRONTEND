'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, Button, Tag, Tooltip, toast, Notification, Dialog, FormItem, Input, DatePicker, Checkbox, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { projectService, Project } from '@/services/project.service'
import { kontrakVendorService, KontrakVendor } from '@/services/kontrak-vendor.service'
import { Vendor } from '@/services/vendor.service'
import { armadaVendorService, ArmadaVendor } from '@/services/armadaVendor.service'
import { supirVendorService, SupirVendor } from '@/services/supirVendor.service'
import { supirService, Supir } from '@/services/supir.service'
import dayjs from 'dayjs'

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
    aktif:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    batal:   'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400',
}

const MEKANISME_CLASS: Record<string, string> = {
    unit_only:   'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    unit_driver: 'bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
    full:        'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
}
const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'Full',
}

function shortId(id?: string | null) {
    return id ? id.slice(0, 8) : '—'
}

type Option = { value: string; label: string }

type DialogFormState = {
    tanggal_tugas: string
    estimasi_biaya: string
}

const EMPTY_DIALOG_FORM: DialogFormState = {
    tanggal_tugas: '', estimasi_biaya: '',
}

type DialogErrors = Partial<Record<'id_vendor' | 'id_kontrak_vendor' | 'unit' | 'supir' | 'tanggal_tugas', string>>

export default function PenugasanVendorTab() {
    const router = useRouter()
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [selectedProyek, setSelectedProyek] = useState('')
    const [list, setList]             = useState<Penugasan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]                    = useState(15)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Penugasan | null>(null)

    const [kontrakMap, setKontrakMap]           = useState<Record<string, KontrakVendor>>({})
    const [vendorMap, setVendorMap]             = useState<Record<string, Vendor>>({})
    const [vendorOptions, setVendorOptions]     = useState<Option[]>([])
    const [armadaVendorMap, setArmadaVendorMap] = useState<Record<string, ArmadaVendor>>({})
    const [supirVendorMap, setSupirVendorMap]   = useState<Record<string, SupirVendor>>({})
    const [supirMap, setSupirMap]               = useState<Record<string, Supir>>({})
    const [supirList, setSupirList]             = useState<Supir[]>([])

    const [createDialogOpen, setCreateDialogOpen]     = useState(false)
    const [dlgVendorId, setDlgVendorId]               = useState('')
    const [dlgKontrakId, setDlgKontrakId]             = useState('')
    const [dlgKontrakList, setDlgKontrakList]         = useState<KontrakVendor[]>([])
    const [dlgArmadaList, setDlgArmadaList]           = useState<ArmadaVendor[]>([])
    const [dlgSupirVendorList, setDlgSupirVendorList] = useState<SupirVendor[]>([])
    const [dlgLoading, setDlgLoading]                 = useState(false)
    const [checkedIds, setCheckedIds]                 = useState<string[]>([])
    const [rowSupir, setRowSupir]                     = useState<Record<string, string>>({})
    const [unitSearch, setUnitSearch]                 = useState('')
    const [dlgForm, setDlgForm]                       = useState<DialogFormState>(EMPTY_DIALOG_FORM)
    const [dlgErrors, setDlgErrors]                   = useState<DialogErrors>({})
    const [createSubmitting, setCreateSubmitting]     = useState(false)

    useEffect(() => {
        projectService.list(1).then(res =>
            setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })))
        ).catch(() => {})
        kontrakVendorService.list(1, { limit: '100' }).then(res => {
            const map: Record<string, KontrakVendor> = {}
            res.data.forEach(k => { map[k.id_kontrak_vendor] = k })
            setKontrakMap(map)
        }).catch(() => {})
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 100 } }).then(r => {
            const vendors = r.data.data as Vendor[]
            const map: Record<string, Vendor> = {}
            vendors.forEach(v => { map[v.id_vendor] = v })
            setVendorMap(map)
            setVendorOptions(vendors.map(v => ({ value: v.id_vendor, label: v.nama_vendor })))
        }).catch(() => {})
        armadaVendorService.list(1, 100).then(res => {
            const map: Record<string, ArmadaVendor> = {}
            res.data.forEach(a => { map[a.id_armada_vendor] = a })
            setArmadaVendorMap(map)
        }).catch(() => {})
        supirVendorService.list(1, 100).then(res => {
            const map: Record<string, SupirVendor> = {}
            res.data.forEach(s => { map[s.id_supir_vendor] = s })
            setSupirVendorMap(map)
        }).catch(() => {})
        supirService.list(1, 100).then(res => {
            const map: Record<string, Supir> = {}
            res.data.forEach(s => { map[s.id_supir] = s })
            setSupirMap(map)
            setSupirList(res.data)
        }).catch(() => {})
    }, [])

    useEffect(() => {
        if (!dlgVendorId) {
            setDlgKontrakList([])
            setDlgArmadaList([])
            setDlgSupirVendorList([])
            return
        }
        let ignore = false
        setDlgLoading(true)
        Promise.allSettled([
            kontrakVendorService.list(1, { limit: '100', id_vendor: dlgVendorId }),
            armadaVendorService.list(1, 100, dlgVendorId),
            supirVendorService.list(1, 100, dlgVendorId),
        ]).then(([k, a, s]) => {
            if (ignore) return
            if (k.status === 'fulfilled') setDlgKontrakList(k.value.data)
            if (a.status === 'fulfilled') setDlgArmadaList(a.value.data.filter(x => x.aktif))
            if (s.status === 'fulfilled') setDlgSupirVendorList(s.value.data.filter(x => x.aktif))
            setDlgLoading(false)
        })
        return () => { ignore = true }
    }, [dlgVendorId])

    const kontrakOptions = useMemo<Option[]>(() =>
        dlgKontrakList
            .filter(k => k.id_vendor === dlgVendorId)
            .map(k => ({
                value: k.id_kontrak_vendor,
                label: `${k.nomor_kontrak || 'Tanpa nomor'} — ${MEKANISME_LABEL[k.mekanisme] ?? k.mekanisme}${k.nilai_kontrak ? ' — Rp ' + formatNum(k.nilai_kontrak) : ''}`,
            })),
    [dlgKontrakList, dlgVendorId])

    const selectedKontrak = dlgKontrakList.find(k => k.id_kontrak_vendor === dlgKontrakId) ?? null
    const mekanisme = selectedKontrak?.mekanisme ?? null

    const supirRowOptions = useMemo<Option[]>(() => {
        if (mekanisme === 'unit_only') {
            return supirList
                .filter(s => s.status === 'aktif')
                .map(s => ({ value: s.id_supir, label: `${s.nama} — SIM ${s.jenis_sim}` }))
        }
        if (mekanisme) {
            return dlgSupirVendorList
                .map(s => ({ value: s.id_supir_vendor, label: `${s.nama}${s.telepon ? ' — ' + s.telepon : ''}` }))
        }
        return []
    }, [mekanisme, supirList, dlgSupirVendorList])

    const filteredArmada = useMemo(() => {
        const q = unitSearch.trim().toLowerCase()
        if (!q) return dlgArmadaList
        return dlgArmadaList.filter(a =>
            a.nopol.toLowerCase().includes(q) ||
            (a.merk ?? '').toLowerCase().includes(q))
    }, [dlgArmadaList, unitSearch])

    const allFilteredChecked = filteredArmada.length > 0
        && filteredArmada.every(a => checkedIds.includes(a.id_armada_vendor))

    const toggleUnit = (id: string) => {
        setCheckedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        setDlgErrors(prev => ({ ...prev, unit: undefined }))
    }

    const toggleAllFiltered = () => {
        const ids = filteredArmada.map(a => a.id_armada_vendor)
        setCheckedIds(prev => allFilteredChecked
            ? prev.filter(x => !ids.includes(x))
            : Array.from(new Set([...prev, ...ids])))
        setDlgErrors(prev => ({ ...prev, unit: undefined }))
    }

    const handleDlgVendorChange = (opt: Option | null) => {
        setDlgVendorId(opt?.value ?? '')
        setDlgKontrakId('')
        setCheckedIds([])
        setRowSupir({})
        setDlgErrors(prev => ({ ...prev, id_vendor: undefined, id_kontrak_vendor: undefined, unit: undefined, supir: undefined }))
    }

    const handleDlgKontrakChange = (opt: Option | null) => {
        setDlgKontrakId(opt?.value ?? '')
        setRowSupir({})
        setDlgErrors(prev => ({ ...prev, id_kontrak_vendor: undefined, supir: undefined }))
    }

    const resetDialogState = () => {
        setDlgVendorId('')
        setDlgKontrakId('')
        setDlgKontrakList([])
        setDlgArmadaList([])
        setDlgSupirVendorList([])
        setCheckedIds([])
        setRowSupir({})
        setUnitSearch('')
        setDlgForm(EMPTY_DIALOG_FORM)
        setDlgErrors({})
    }

    const openCreateDialog = () => {
        if (!selectedProyek) return
        resetDialogState()
        setCreateDialogOpen(true)
    }

    const closeCreateDialog = () => {
        setCreateDialogOpen(false)
        resetDialogState()
    }

    const validateDialog = () => {
        const e: DialogErrors = {}
        if (!dlgVendorId) e.id_vendor = 'Vendor wajib dipilih'
        if (!dlgKontrakId) e.id_kontrak_vendor = 'Kontrak wajib dipilih'
        if (checkedIds.length === 0) {
            e.unit = 'Centang minimal satu unit'
        } else if (checkedIds.some(id => !rowSupir[id])) {
            e.supir = 'Pilih supir untuk semua unit yang dicentang'
        }
        if (!dlgForm.tanggal_tugas) e.tanggal_tugas = 'Tanggal tugas wajib diisi'
        setDlgErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmitCreate = async () => {
        if (!selectedProyek) return
        if (!validateDialog()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        setCreateSubmitting(true)
        try {
            const estimasi = dlgForm.estimasi_biaya ? Number(dlgForm.estimasi_biaya) : undefined
            const targets = dlgArmadaList.filter(a => checkedIds.includes(a.id_armada_vendor))
            const results = await Promise.allSettled(targets.map(a =>
                penugasanService.create({
                    sumber:            'vendor',
                    id_proyek:         selectedProyek,
                    id_kontrak_vendor: dlgKontrakId,
                    id_armada_vendor:  a.id_armada_vendor,
                    id_supir:          mekanisme === 'unit_only' ? rowSupir[a.id_armada_vendor] : null,
                    id_supir_vendor:   mekanisme === 'unit_only' ? null : rowSupir[a.id_armada_vendor],
                    tanggal_tugas:     dlgForm.tanggal_tugas || undefined,
                    estimasi_biaya:    estimasi,
                })
            ))
            const gagalIds: string[] = []
            let alasanPertama = ''
            results.forEach((r, i) => {
                if (r.status === 'rejected') {
                    gagalIds.push(targets[i].id_armada_vendor)
                    if (!alasanPertama) alasanPertama = parseApiError(r.reason)
                }
            })
            const sukses = results.length - gagalIds.length
            if (gagalIds.length === 0) {
                toast.push(<Notification type="success" title={`${sukses} penugasan vendor dibuat`} />)
                setCreateDialogOpen(false)
                resetDialogState()
                fetchData()
            } else {
                toast.push(<Notification type="danger" title={`${sukses} berhasil, ${gagalIds.length} gagal${alasanPertama ? ' — ' + alasanPertama : ''}`} />)
                setCheckedIds(gagalIds)
                if (sukses > 0) fetchData()
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setCreateSubmitting(false)
        }
    }

    const fetchData = useCallback(async () => {
        if (!selectedProyek) return
        setLoading(true)
        try {
            const res = await penugasanService.list(selectedProyek, currentPage, 'vendor')
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
            toast.push(<Notification type="success" title="Penugasan vendor berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const columns: ColumnDef<Penugasan>[] = [
        {
            header: 'No', id: 'no', size: 60,
            cell: (props: CellContext<Penugasan, unknown>) =>
                props.row.index + 1 + (currentPage - 1) * pageSize,
        },
        {
            header: 'Proyek', accessorKey: 'id_proyek',
            cell: ({ row }) => {
                const label = proyekOptions.find(o => o.value === row.original.id_proyek)?.label
                return label
                    ? <span>{label}</span>
                    : <span className="font-mono text-xs text-gray-400">{shortId(row.original.id_proyek)}</span>
            },
        },
        {
            header: 'Vendor',
            cell: ({ row }) => {
                const kontrak = row.original.id_kontrak_vendor ? kontrakMap[row.original.id_kontrak_vendor] : null
                const vendor  = kontrak ? vendorMap[kontrak.id_vendor] : null
                return vendor
                    ? <span className="font-medium">{vendor.nama_vendor}</span>
                    : <span className="font-mono text-xs text-gray-400">{shortId(row.original.id_kontrak_vendor)}</span>
            },
        },
        {
            header: 'Mekanisme', size: 130,
            cell: ({ row }) => {
                const kontrak = row.original.id_kontrak_vendor ? kontrakMap[row.original.id_kontrak_vendor] : null
                if (!kontrak) return <span className="text-gray-400">—</span>
                return (
                    <Tag className={MEKANISME_CLASS[kontrak.mekanisme] ?? 'bg-gray-100 text-gray-600'}>
                        {MEKANISME_LABEL[kontrak.mekanisme] ?? kontrak.mekanisme}
                    </Tag>
                )
            },
        },
        {
            header: 'Unit',
            cell: ({ row }) => {
                const av = row.original.id_armada_vendor ? armadaVendorMap[row.original.id_armada_vendor] : null
                return av
                    ? <span className="font-mono font-semibold">{av.nopol}</span>
                    : <span className="font-mono text-xs text-gray-400">{shortId(row.original.id_armada_vendor)}</span>
            },
        },
        {
            header: 'Supir',
            cell: ({ row }) => {
                if (row.original.id_supir_vendor) {
                    const sv = supirVendorMap[row.original.id_supir_vendor]
                    return sv ? <span>{sv.nama}</span> : <span className="font-mono text-xs text-gray-400">{shortId(row.original.id_supir_vendor)}</span>
                }
                if (row.original.id_supir) {
                    const s = supirMap[row.original.id_supir]
                    return s ? <span>{s.nama}</span> : <span className="font-mono text-xs text-gray-400">{shortId(row.original.id_supir)}</span>
                }
                return <span className="text-gray-400">—</span>
            },
        },
        {
            header: 'Tanggal', accessorKey: 'tanggal_tugas', size: 130,
            cell: ({ row }) => row.original.tanggal_tugas
                ? dayjs(row.original.tanggal_tugas).format('DD MMM YYYY')
                : <span className="text-gray-400">—</span>,
        },
        {
            header: 'Status', accessorKey: 'status', size: 110,
            cell: ({ row }) => (
                <Tag className={STATUS_CLASS[row.original.status] ?? 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: '', id: 'aksi', size: 90,
            cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2">
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

    const renderUnitRow = (a: ArmadaVendor) => {
        const id = a.id_armada_vendor
        const isChecked = checkedIds.includes(id)
        const dokumenKadaluarsa =
            (!!a.masa_berlaku_stnk && dayjs(a.masa_berlaku_stnk).isBefore(dayjs(), 'day')) ||
            (!!a.masa_berlaku_kir && dayjs(a.masa_berlaku_kir).isBefore(dayjs(), 'day'))
        return (
            <tr
                key={id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                onClick={() => toggleUnit(id)}
            >
                <td className="py-2.5 pl-3 pr-1 w-10" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isChecked} onChange={() => toggleUnit(id)} />
                </td>
                <td className="py-2.5 pr-4">
                    <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">{a.nopol}</p>
                    <p className="text-xs text-gray-400">{[a.merk, a.jenis].filter(Boolean).join(' / ') || '—'}</p>
                </td>
                <td className="py-2.5 pr-4 min-w-[220px]" onClick={e => e.stopPropagation()}>
                    <Select<Option>
                        size="sm"
                        placeholder="Pilih supir..."
                        isDisabled={!isChecked || !mekanisme}
                        options={supirRowOptions}
                        value={supirRowOptions.find(o => o.value === rowSupir[id]) ?? null}
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        onChange={opt => {
                            setRowSupir(p => ({ ...p, [id]: opt?.value ?? '' }))
                            setDlgErrors(prev => ({ ...prev, supir: undefined }))
                        }}
                    />
                </td>
                <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap items-center gap-1">
                        <Tag className="text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                            Aktif
                        </Tag>
                        {dokumenKadaluarsa && (
                            <Tag className="text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                                STNK/KIR kadaluarsa
                            </Tag>
                        )}
                    </div>
                </td>
            </tr>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-end">
                <Tooltip title="Pilih proyek terlebih dahulu" disabled={!!selectedProyek}>
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                        disabled={!selectedProyek}
                        onClick={openCreateDialog}>
                        Tambah Penugasan Vendor
                    </Button>
                </Tooltip>
            </div>
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <Select
                        className="w-full sm:w-96"
                        placeholder="Pilih proyek untuk melihat penugasan vendor..."
                        options={proyekOptions}
                        value={proyekOptions.find(o => o.value === selectedProyek) ?? null}
                        onChange={(opt) => { setSelectedProyek((opt as { value: string } | null)?.value ?? ''); setCurrentPage(1) }}
                    />
                </div>

                {!selectedProyek ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                        Pilih proyek di atas untuk melihat daftar penugasan vendor
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={list as unknown[]}
                        loading={loading}
                        pagingData={{ total, pageIndex: currentPage, pageSize }}
                        onPaginationChange={setCurrentPage}
                    />
                )}
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Penugasan Vendor"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus penugasan vendor ini? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            <Dialog isOpen={createDialogOpen} onRequestClose={closeCreateDialog} onClose={closeCreateDialog} width={920}>
                <h5 className="text-base font-semibold mb-1">Tambah Penugasan Vendor</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Pilih kontrak, centang unit vendor, lalu tentukan tanggal tugas.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitCreate() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Vendor" asterisk invalid={!!dlgErrors.id_vendor} errorMessage={dlgErrors.id_vendor}>
                            <Select<Option>
                                placeholder="Pilih vendor..."
                                options={vendorOptions}
                                value={vendorOptions.find(o => o.value === dlgVendorId) ?? null}
                                invalid={!!dlgErrors.id_vendor}
                                onChange={opt => handleDlgVendorChange(opt)}
                            />
                        </FormItem>
                        <FormItem label="Kontrak Vendor" asterisk invalid={!!dlgErrors.id_kontrak_vendor} errorMessage={dlgErrors.id_kontrak_vendor}>
                            <Select<Option>
                                isDisabled={!dlgVendorId}
                                placeholder={dlgVendorId ? 'Pilih kontrak...' : 'Pilih vendor terlebih dahulu'}
                                options={kontrakOptions}
                                value={kontrakOptions.find(o => o.value === dlgKontrakId) ?? null}
                                invalid={!!dlgErrors.id_kontrak_vendor}
                                onChange={opt => handleDlgKontrakChange(opt)}
                            />
                        </FormItem>
                    </div>

                    {selectedKontrak && (
                        <div className="-mt-1 mb-3 flex items-center gap-2">
                            <Tag className={MEKANISME_CLASS[selectedKontrak.mekanisme] ?? 'bg-gray-100 text-gray-600'}>
                                {MEKANISME_LABEL[selectedKontrak.mekanisme] ?? selectedKontrak.mekanisme}
                            </Tag>
                            <span className="text-xs text-gray-400">Mekanisme kontrak menentukan pilihan supir per unit</span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-4 mb-3 mt-2">
                        <Input
                            size="sm"
                            className="max-w-xs"
                            placeholder="Cari nopol / merk..."
                            value={unitSearch}
                            onChange={e => setUnitSearch(e.target.value)}
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-2">
                            {checkedIds.length} unit dipilih
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
                                            <Tooltip title="Pilih semua unit">
                                                <span>
                                                    <Checkbox
                                                        checked={allFilteredChecked}
                                                        disabled={filteredArmada.length === 0}
                                                        onChange={toggleAllFiltered}
                                                    />
                                                </span>
                                            </Tooltip>
                                        </th>
                                        <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Armada</th>
                                        <th className="py-2.5 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Supir</th>
                                        <th className="py-2.5 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {!dlgVendorId ? (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                                                Pilih vendor terlebih dahulu untuk menampilkan unit
                                            </td>
                                        </tr>
                                    ) : dlgLoading ? (
                                        <tr>
                                            <td colSpan={4} className="py-8">
                                                <div className="flex justify-center">
                                                    <Spinner size={28} />
                                                </div>
                                            </td>
                                        </tr>
                                    ) : dlgArmadaList.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                                                Tidak ada armada vendor aktif milik vendor ini
                                            </td>
                                        </tr>
                                    ) : filteredArmada.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                                                Tidak ada unit yang cocok dengan pencarian
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredArmada.map(renderUnitRow)
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {dlgErrors.unit && (
                        <p className="text-red-500 text-xs mt-1.5">{dlgErrors.unit}</p>
                    )}
                    {dlgErrors.supir && (
                        <p className="text-red-500 text-xs mt-1.5">{dlgErrors.supir}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-5">
                        <FormItem label="Tanggal Tugas" asterisk invalid={!!dlgErrors.tanggal_tugas} errorMessage={dlgErrors.tanggal_tugas}>
                            <DatePicker
                                inputFormat="DD/MM/YYYY"
                                value={dlgForm.tanggal_tugas ? new Date(dlgForm.tanggal_tugas) : null}
                                onChange={date => {
                                    setDlgForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : '' }))
                                    setDlgErrors(prev => ({ ...prev, tanggal_tugas: undefined }))
                                }}
                            />
                        </FormItem>
                        <FormItem label="Estimasi Biaya">
                            <Input
                                prefix="Rp"
                                placeholder="0"
                                value={dlgForm.estimasi_biaya ? formatNum(Number(dlgForm.estimasi_biaya)) : ''}
                                onChange={e => setDlgForm(p => ({ ...p, estimasi_biaya: e.target.value.replace(/\D/g, '') }))}
                            />
                        </FormItem>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={closeCreateDialog}>Batal</Button>
                        <Button type="submit" variant="solid" loading={createSubmitting} disabled={dlgLoading}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}
