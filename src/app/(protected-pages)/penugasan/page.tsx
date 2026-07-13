'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
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

export default function PenugasanPage() {
    const router = useRouter()
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaMap, setArmadaMap]         = useState<Record<string, Armada>>({})
    const [supirMap, setSupirMap]           = useState<Record<string, Supir>>({})
    const [selectedProyek, setSelectedProyek] = useState<string>('')
    const [list, setList]             = useState<Penugasan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]                    = useState(15)
    const [total, setTotal]             = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Penugasan | null>(null)

    useEffect(() => {
        projectService.list(1).then(res =>
            setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })))
        ).catch(() => {})
        armadaService.list(1).then(res => {
            const map: Record<string, Armada> = {}
            res.data.forEach((a: Armada) => { map[a.id_armada] = a })
            setArmadaMap(map)
        }).catch(() => {})
        supirService.list(1).then(res => {
            const map: Record<string, Supir> = {}
            res.data.forEach((s: Supir) => { map[s.id_supir] = s })
            setSupirMap(map)
        }).catch(() => {})
    }, [])

    const fetchData = useCallback(async () => {
        if (!selectedProyek) return
        setLoading(true)
        try {
            const res = await penugasanService.list(selectedProyek, currentPage)
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
            <Card
                header={{
                    content: <h4>Penugasan</h4>,
                    extra: (
                        <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                            onClick={() => router.push(ROUTES.PENUGASAN_BARU)}>
                            Tambah Penugasan
                        </Button>
                    ),
                    bordered: false,
                }}
                bodyClass="p-0"
            >
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <Select
                        className="w-96"
                        placeholder="Pilih proyek untuk melihat penugasan..."
                        options={proyekOptions}
                        value={proyekOptions.find(o => o.value === selectedProyek) ?? null}
                        onChange={(opt) => { setSelectedProyek((opt as { value: string } | null)?.value ?? ''); setCurrentPage(1) }}
                    />
                </div>

                {!selectedProyek ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                        Pilih proyek di atas untuk melihat daftar penugasan
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={list as unknown[]}
                        loading={loading}
                        pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                        onPaginationChange={setCurrentPage}
                    />
                )}
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Penugasan"
                onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus penugasan ini? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>
        </div>
    )
}
