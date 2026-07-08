'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DataTable from '@/components/shared/DataTable'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineEye, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { projectService, Project } from '@/services/project.service'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { armadaService, Armada } from '@/services/armada.service'

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    aktif:   'bg-emerald-100 text-emerald-600',
    selesai: 'bg-blue-100 text-blue-600',
    batal:   'bg-red-100 text-red-500',
}

export default function PenugasanPage() {
    const router = useRouter()
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [karyawanOptions, setKaryawanOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaOptions, setArmadaOptions]     = useState<{ value: string; label: string }[]>([])
    const [selectedProyek, setSelectedProyek] = useState<string>('')
    const [list, setList]         = useState<Penugasan[]>([])
    const [loading, setLoading]   = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize]              = useState(15)
    const [total, setTotal]       = useState(0)
    const [deleteTarget, setDeleteTarget] = useState<Penugasan | null>(null)

    useEffect(() => {
        projectService.list(1).then(res =>
            setProyekOptions(res.data.map((p: Project) => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })))
        ).catch(() => {})
        karyawanService.list(1).then(res =>
            setKaryawanOptions(res.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` })))
        ).catch(() => {})
        armadaService.list(1).then(res =>
            setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() })))
        ).catch(() => {})
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
        { header: 'No', cell: (props) => props.row.index + 1 + (currentPage - 1) * pageSize, size: 60 },
        {
            header: 'Karyawan', accessorKey: 'id_karyawan',
            cell: ({ row }) => karyawanOptions.find(o => o.value === row.original.id_karyawan)?.label ?? row.original.id_karyawan ?? '-',
        },
        {
            header: 'Armada', accessorKey: 'id_armada',
            cell: ({ row }) => armadaOptions.find(o => o.value === row.original.id_armada)?.label ?? row.original.id_armada ?? '-',
        },
        { header: 'Tanggal Tugas', accessorKey: 'tanggal_tugas', cell: ({ row }) => row.original.tanggal_tugas ?? '-' },
        {
            header: 'Status', accessorKey: 'status',
            cell: ({ row }) => (
                <Tag className={STATUS_CLASS[row.original.status] ?? 'bg-gray-100 text-gray-700'}>
                    {row.original.status}
                </Tag>
            ),
        },
        {
            header: 'Aksi', id: 'aksi',
            cell: ({ row }) => (
                <div className="flex gap-1">
                    <Tooltip title="Detail">
                        <Button size="xs" variant="plain" icon={<HiOutlineEye />}
                            onClick={() => router.push(ROUTES.PENUGASAN_DETAIL(row.original.id_penugasan))} />
                    </Tooltip>
                    <Tooltip title="Hapus">
                        <Button size="xs" variant="plain" icon={<HiOutlineTrash />}
                            onClick={() => setDeleteTarget(row.original)} />
                    </Tooltip>
                </div>
            ),
        },
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">Penugasan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Penugasan karyawan dan armada ke proyek</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                    onClick={() => router.push(ROUTES.PENUGASAN_BARU)}>
                    Tambah Penugasan
                </Button>
            </div>

            <Card>
                <div className="mb-4 max-w-md">
                    <Select
                        placeholder="Pilih proyek terlebih dahulu..."
                        options={proyekOptions}
                        value={proyekOptions.find(o => o.value === selectedProyek) ?? null}
                        onChange={(opt) => { setSelectedProyek(opt?.value ?? ''); setCurrentPage(1) }}
                    />
                </div>

                {!selectedProyek ? (
                    <div className="py-10 text-center text-gray-400 text-sm">
                        Pilih proyek di atas untuk melihat daftar penugasan
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={list}
                        loading={loading}
                        pagingData={{ total, pageIndex: currentPage - 1, pageSize }}
                        onPaginationChange={setCurrentPage}
                    />
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Penugasan"
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: submitting, variant: 'solid', className: 'bg-red-600 hover:bg-red-700' }}
            >
                <p>Hapus penugasan ini? Armada yang digunakan akan dikembalikan ke status tersedia.</p>
            </ConfirmDialog>
        </div>
    )
}
