'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Tooltip } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { perusahaanGrupService, PerusahaanGrup } from '@/services/perusahaan-grup.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function PerusahaanGrupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]       = useState<PerusahaanGrup | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<PerusahaanGrup>>({})
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        perusahaanGrupService.get(id)
            .then(d => { setData(d); setForm(d) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.singkatan?.trim()) e.singkatan = 'Singkatan wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            const updated = await perusahaanGrupService.update(id, {
                singkatan:    form.singkatan?.trim(),
                nama_lengkap: form.nama_lengkap?.trim() || null,
                aktif:        form.aktif,
            })
            setData(updated); setForm(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Perusahaan grup berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Perusahaan grup tidak ditemukan.</div>

    const initial = data.singkatan.slice(0, 2).toUpperCase()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PERUSAHAAN_GRUP)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.singkatan}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{data.nama_lengkap ?? 'Perusahaan grup'}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.singkatan}</p>
                                    <p className="text-sm text-gray-500 mt-1">{data.nama_lengkap ?? '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {data.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Tooltip title="Edit">
                                    <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)} />
                                </Tooltip>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Singkatan', value: data.singkatan },
                                { label: 'Nama Lengkap', value: data.nama_lengkap ?? '—' },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xl flex-shrink-0 select-none">
                                {(form.singkatan || data.singkatan).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Perusahaan Grup</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi perusahaan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Singkatan" asterisk invalid={!!errors.singkatan} errorMessage={errors.singkatan}>
                                <Input value={form.singkatan ?? ''} invalid={!!errors.singkatan} maxLength={30}
                                    onChange={e => setForm(p => ({ ...p, singkatan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Lengkap">
                                <Input value={form.nama_lengkap ?? ''} maxLength={150}
                                    onChange={e => setForm(p => ({ ...p, nama_lengkap: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(data); setErrors({}) }}>Kembali</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}

                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Kembali</Button>
                    </div>
                )}
            </Card>
        </div>
    )
}
