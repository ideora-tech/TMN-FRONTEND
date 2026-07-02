'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService, Project } from '@/services/project.service'

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Draft' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

const statusClass: Record<string, string> = {
    draft:   'bg-gray-100 text-gray-700',
    aktif:   'bg-emerald-100 text-emerald-600',
    selesai: 'bg-emerald-200 text-emerald-800',
    batal:   'bg-red-100 text-red-500',
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [project, setProject] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [newStatus, setNewStatus] = useState('')

    useEffect(() => {
        projectService.get(params.id)
            .then(p => { setProject(p); setNewStatus(p.status) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [params.id])

    const handleStatusUpdate = async () => {
        if (!project || newStatus === project.status) return
        setUpdating(true)
        try {
            const updated = await projectService.updateStatus(params.id, newStatus)
            setProject(updated)
            toast.push(<Notification type="success" title="Status proyek diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!project) return <div className="p-6 text-red-500">Proyek tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.PROYEK)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{project.nama_proyek}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan status proyek</p>
                </div>
            </div>

            <Card className="mb-4">
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass[project.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {project.status}
                    </span>
                </div>
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'Kode Proyek',    value: project.kode_proyek },
                        { label: 'Tanggal Mulai',  value: project.tanggal_mulai ?? '-' },
                        { label: 'Tanggal Selesai', value: project.tanggal_selesai ?? '-' },
                        { label: 'Keterangan',     value: project.keterangan ?? '-' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <h5 className="mb-4">Update Status</h5>
                <div className="flex gap-2 items-center">
                    <div className="flex-1">
                        <Select
                            isSearchable={false}
                            value={STATUS_OPTIONS.find(o => o.value === newStatus) ?? null}
                            options={STATUS_OPTIONS}
                            onChange={(option) => option && setNewStatus(option.value)}
                        />
                    </div>
                    <Button
                        variant="solid"
                        loading={updating}
                        disabled={newStatus === project.status}
                        onClick={handleStatusUpdate}
                    >
                        Update
                    </Button>
                </div>
            </Card>
        </div>
    )
}
