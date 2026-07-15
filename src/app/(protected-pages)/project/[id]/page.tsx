'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Tag, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineCheck, HiOutlineX, HiOutlinePlus, HiOutlineExternalLink, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { projectService, Project } from '@/services/project.service'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { armadaService, Armada } from '@/services/armada.service'

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

const PENUGASAN_STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
    aktif:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    selesai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    batal:   'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
}

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

    // penugasan
    const [penugasanList, setPenugasanList]   = useState<Penugasan[]>([])
    const [penugasanLoading, setPenugasanLoading] = useState(false)
    const [showPenugasanForm, setShowPenugasanForm] = useState(false)
    const [penugasanForm, setPenugasanForm] = useState({ id_karyawan: '', id_armada: '', tanggal_tugas: '' })
    const [addingPenugasan, setAddingPenugasan] = useState(false)
    const [deletePenugasanTarget, setDeletePenugasanTarget] = useState<Penugasan | null>(null)
    const [deletingPenugasan, setDeletingPenugasan] = useState(false)
    const [karyawanOptions, setKaryawanOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaOptions, setArmadaOptions]     = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        Promise.all([
            projectService.get(id),
            karyawanService.list(1),
            armadaService.list(1),
        ]).then(([p, karyawan, armada]) => {
            setProject(p); setForm(p)
            setKaryawanOptions(karyawan.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` })))
            setArmadaOptions(armada.data.map((a: Armada) => ({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() })))
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

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
            setProject(updated); setForm(updated); setEditing(false)
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
        } finally { setUpdating(false) }
    }

    const handleAddPenugasan = async () => {
        setAddingPenugasan(true)
        try {
            await penugasanService.create({
                id_proyek:     id,
                id_karyawan:   penugasanForm.id_karyawan || undefined,
                id_armada:     penugasanForm.id_armada || undefined,
                tanggal_tugas: penugasanForm.tanggal_tugas || undefined,
                status:        'pending',
            })
            toast.push(<Notification type="success" title="Penugasan berhasil dibuat" />)
            setPenugasanForm({ id_karyawan: '', id_armada: '', tanggal_tugas: '' })
            setShowPenugasanForm(false)
            fetchPenugasan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally { setAddingPenugasan(false) }
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
    const isFinal = project.status === 'selesai' || project.status === 'batal'

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

                        {!isFinal && (
                            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Ubah Status</p>
                                <div className="flex gap-2 flex-wrap">
                                    {project.status === 'draft' && (
                                        <Button variant="solid" size="sm" icon={<HiOutlineCheck />}
                                            customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                                            loading={updating} onClick={() => handleStatus('aktif')}>
                                            Aktifkan
                                        </Button>
                                    )}
                                    {project.status === 'aktif' && (
                                        <Button variant="solid" size="sm" icon={<HiOutlineCheck />}
                                            customColorClass={() => 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white border-blue-500'}
                                            loading={updating} onClick={() => handleStatus('selesai')}>
                                            Selesaikan
                                        </Button>
                                    )}
                                    <Button variant="plain" size="sm" icon={<HiOutlineX />}
                                        customColorClass={() => 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border-transparent'}
                                        loading={updating} onClick={() => handleStatus('batal')}>
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
                                <p className="font-semibold text-base">Edit Data Proyek</p>
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
                                <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(project) }}>Batal</Button>
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
                    <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={() => setShowPenugasanForm(v => !v)}>
                        Tambah Penugasan
                    </Button>
                </div>

                {/* Form tambah penugasan */}
                {showPenugasanForm && (
                    <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1">
                            <FormItem label="Supir/Karyawan">
                                <Select isClearable placeholder="Pilih karyawan..."
                                    options={karyawanOptions}
                                    value={karyawanOptions.find(o => o.value === penugasanForm.id_karyawan) ?? null}
                                    onChange={opt => setPenugasanForm(p => ({ ...p, id_karyawan: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Armada">
                                <Select isClearable placeholder="Pilih armada..."
                                    options={armadaOptions}
                                    value={armadaOptions.find(o => o.value === penugasanForm.id_armada) ?? null}
                                    onChange={opt => setPenugasanForm(p => ({ ...p, id_armada: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Tanggal Tugas">
                                <DatePicker
                                    value={penugasanForm.tanggal_tugas ? new Date(penugasanForm.tanggal_tugas) : null}
                                    onChange={date => setPenugasanForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />}
                                onClick={() => { setShowPenugasanForm(false); setPenugasanForm({ id_karyawan: '', id_armada: '', tanggal_tugas: '' }) }}>
                                Batal
                            </Button>
                            <Button size="sm" variant="solid" loading={addingPenugasan} onClick={handleAddPenugasan}>
                                Simpan
                            </Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </div>
                )}

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
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Karyawan</th>
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
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 text-xs font-mono">
                                            {karyawanOptions.find(o => o.value === p.id_karyawan)?.label ?? p.id_karyawan ?? <span className="text-gray-400">—</span>}
                                        </td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                                            {armadaOptions.find(o => o.value === p.id_armada)?.label?.split(' — ')[0] ?? p.id_armada ?? <span className="text-gray-400">—</span>}
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
