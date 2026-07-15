'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Card, Button, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
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

export default function PenugasanVendorPage() {
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

    // lookup maps — PenugasanResource hanya mengembalikan id mentah (id_kontrak_vendor,
    // id_armada_vendor, id_supir_vendor), jadi nama vendor/unit/supir diturunkan dari
    // data master vendor yang sudah ada, bukan fabrikasi.
    const [kontrakMap, setKontrakMap]           = useState<Record<string, KontrakVendor>>({})
    const [vendorMap, setVendorMap]             = useState<Record<string, Vendor>>({})
    const [armadaVendorMap, setArmadaVendorMap] = useState<Record<string, ArmadaVendor>>({})
    const [supirVendorMap, setSupirVendorMap]   = useState<Record<string, SupirVendor>>({})
    const [supirMap, setSupirMap]               = useState<Record<string, Supir>>({})

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
            const map: Record<string, Vendor> = {}
            ;(r.data.data as Vendor[]).forEach(v => { map[v.id_vendor] = v })
            setVendorMap(map)
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
        }).catch(() => {})
    }, [])

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

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Penugasan Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola penugasan armada dan supir dari vendor</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.PENUGASAN_VENDOR_BARU)}>
                    Tambah Penugasan Vendor
                </Button>
            </div>
            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <Select
                        className="w-96"
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
        </div>
    )
}
