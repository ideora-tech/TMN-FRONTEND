'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Tooltip } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tipePermintaanService, TipePermintaan, JenisFormPermintaan, JENIS_FORM_LABEL, JENIS_FORM_HINT } from '@/services/tipe-permintaan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]
const JENIS_FORM_OPTIONS = (Object.keys(JENIS_FORM_LABEL) as JenisFormPermintaan[]).map(k => ({ value: k, label: JENIS_FORM_LABEL[k] }))

export default function TipePermintaanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<TipePermintaan | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<TipePermintaan>>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof TipePermintaan, string>>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        tipePermintaanService.get(id)
            .then(d => { setData(d); setForm(d) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const validate = () => {
        const e: Partial<Record<keyof TipePermintaan, string>> = {}
        if (!form.nama_tipe?.trim()) e.nama_tipe = 'Nama tipe wajib diisi'
        else if (form.nama_tipe.trim().length > 100) e.nama_tipe = 'Nama tipe maksimal 100 karakter'
        if (!form.jenis_form) e.jenis_form = 'Jenis form wajib dipilih'
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
            const updated = await tipePermintaanService.update(id, {
                nama_tipe:  form.nama_tipe?.trim(),
                jenis_form: form.jenis_form,
                aktif:      form.aktif,
            })
            setData(updated); setForm(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Tipe permintaan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Tipe permintaan tidak ditemukan.</div>

    const initial = data.nama_tipe?.charAt(0).toUpperCase() ?? 'T'
    const jenisFormLabel = JENIS_FORM_LABEL[data.jenis_form] ?? data.jenis_form
    const jenisFormBerubah = !!form.jenis_form && form.jenis_form !== data.jenis_form && (data.jumlah_judul ?? 0) > 0

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.TIPE_PERMINTAAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama_tipe}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Jenis form: {jenisFormLabel}</p>
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
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_tipe}</p>
                                    <p className="text-sm text-gray-500 mt-1">Jenis form: {jenisFormLabel}</p>
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
                                { label: 'Nama Tipe', value: data.nama_tipe },
                                { label: 'Jenis Form', value: jenisFormLabel },
                                { label: 'Kategori Memakai Tipe Ini', value: String(data.jumlah_judul ?? 0) },
                                { label: 'Keterangan Form', value: JENIS_FORM_HINT[data.jenis_form] ?? '-' },
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
                                {form.nama_tipe?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Tipe Permintaan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi tipe permintaan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama Tipe" asterisk invalid={!!errors.nama_tipe} errorMessage={errors.nama_tipe}>
                                <Input maxLength={100} value={form.nama_tipe ?? ''} invalid={!!errors.nama_tipe} onChange={e => setForm(p => ({ ...p, nama_tipe: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jenis Form" asterisk invalid={!!errors.jenis_form} errorMessage={errors.jenis_form}>
                                <Select isSearchable={false} placeholder="Pilih jenis form" options={JENIS_FORM_OPTIONS}
                                    value={JENIS_FORM_OPTIONS.find(o => o.value === form.jenis_form) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, jenis_form: opt?.value as JenisFormPermintaan | undefined }))} />
                                {jenisFormBerubah && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        {data.jumlah_judul} kategori permintaan memakai tipe ini — jenis form-nya ikut berubah untuk permintaan pembelian berikutnya (PR yang sudah dibuat tidak berubah).
                                    </p>
                                )}
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
