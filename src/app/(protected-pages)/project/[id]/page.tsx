'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineCheck, HiOutlineX } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService, Project } from '@/services/project.service'

const STATUS_OPTIONS = [
    { value: 'draft',   label: 'Draft' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

const STATUS_CLASS: Record<string, string> = {
    draft:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    aktif:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    selesai: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    batal:   'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', aktif: 'Aktif', selesai: 'Selesai', batal: 'Batal',
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [project, setProject]   = useState<Project | null>(null)
    const [loading, setLoading]   = useState(true)
    const [editing, setEditing]   = useState(false)
    const [form, setForm]         = useState<Partial<Project>>({})
    const [saving, setSaving]     = useState(false)
    const [updating, setUpdating] = useState(false)

    useEffect(() => {
        projectService.get(id)
            .then(p => { setProject(p); setForm(p) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
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
            setProject(updated)
            setForm(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Proyek berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleStatus = async (status: string) => {
        setUpdating(true)
        try {
            const updated = await projectService.updateStatus(id, status)
            setProject(updated)
            setForm(updated)
            toast.push(<Notification type="success" title={`Proyek ditandai ${STATUS_LABEL[status] ?? status}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!project) return <div className="p-6 text-red-500">Proyek tidak ditemukan.</div>

    const initial  = project.nama_proyek?.charAt(0).toUpperCase() ?? 'P'
    const isFinal  = project.status === 'selesai' || project.status === 'batal'

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
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[project.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {STATUS_LABEL[project.status] ?? project.status}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>

                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Proyek',     value: project.kode_proyek },
                                { label: 'Tanggal Mulai',   value: project.tanggal_mulai ?? <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Selesai', value: project.tanggal_selesai ?? <span className="text-gray-400">—</span> },
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

                        {!isFinal && (
                            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Ubah Status</p>
                                <div className="flex gap-2 flex-wrap">
                                    {project.status === 'draft' && (
                                        <Button
                                            variant="solid"
                                            size="sm"
                                            icon={<HiOutlineCheck />}
                                            customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                                            loading={updating}
                                            onClick={() => handleStatus('aktif')}
                                        >
                                            Aktifkan
                                        </Button>
                                    )}
                                    {project.status === 'aktif' && (
                                        <Button
                                            variant="solid"
                                            size="sm"
                                            icon={<HiOutlineCheck />}
                                            customColorClass={() => 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white border-blue-500'}
                                            loading={updating}
                                            onClick={() => handleStatus('selesai')}
                                        >
                                            Selesaikan
                                        </Button>
                                    )}
                                    <Button
                                        variant="plain"
                                        size="sm"
                                        icon={<HiOutlineX />}
                                        customColorClass={() => 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border-transparent'}
                                        loading={updating}
                                        onClick={() => handleStatus('batal')}
                                    >
                                        Batalkan
                                    </Button>
                                </div>
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
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Data Proyek</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi proyek di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />

                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama Proyek">
                                <Input value={form.nama_proyek ?? ''}
                                    onChange={e => setForm(p => ({ ...p, nama_proyek: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Kode Proyek">
                                <Input value={form.kode_proyek ?? ''}
                                    onChange={e => setForm(p => ({ ...p, kode_proyek: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tanggal Mulai">
                                <DatePicker
                                    value={form.tanggal_mulai ? new Date(form.tanggal_mulai) : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Tanggal Selesai">
                                <DatePicker
                                    value={form.tanggal_selesai ? new Date(form.tanggal_selesai) : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={STATUS_OPTIONS}
                                    value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, status: opt?.value as Project['status'] }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Keterangan">
                                    <textarea rows={3} value={form.keterangan ?? ''}
                                        onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                                        placeholder="Keterangan tambahan (opsional)"
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(project) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}