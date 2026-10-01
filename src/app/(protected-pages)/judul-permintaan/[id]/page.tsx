'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Tooltip } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { judulPermintaanService, JudulPermintaan, TIPE_JUDUL_LABEL } from '@/services/judul-permintaan.service'
import { tipePermintaanService, TipePermintaan } from '@/services/tipe-permintaan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function JudulPermintaanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<JudulPermintaan | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<JudulPermintaan>>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof JudulPermintaan, string>>>({})
    const [saving, setSaving]   = useState(false)
    const [tipeList, setTipeList] = useState<TipePermintaan[]>([])

    useEffect(() => {
        judulPermintaanService.get(id)
            .then(d => { setData(d); setForm(d) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
        tipePermintaanService.opsiAktif()
            .then(setTipeList)
            .catch(() => setTipeList([]))
    }, [id])

    const tipeOptions = [
        ...tipeList.map(t => ({ value: t.id_tipe_permintaan, label: t.nama_tipe })),
        ...(data?.id_tipe_permintaan && !tipeList.some(t => t.id_tipe_permintaan === data.id_tipe_permintaan)
            ? [{ value: data.id_tipe_permintaan, label: `${data.nama_tipe ?? 'Tipe'} (nonaktif)` }]
            : []),
    ]

    const validate = () => {
        const e: Partial<Record<keyof JudulPermintaan, string>> = {}
        if (!form.nama_judul?.trim()) e.nama_judul = 'Judul permintaan wajib diisi'
        else if (form.nama_judul.trim().length > 150) e.nama_judul = 'Judul permintaan maksimal 150 karakter'
        if (!form.id_tipe_permintaan) e.id_tipe_permintaan = 'Tipe wajib dipilih'
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
            const updated = await judulPermintaanService.update(id, {
                nama_judul:         form.nama_judul?.trim(),
                id_tipe_permintaan: form.id_tipe_permintaan ?? undefined,
                aktif:              form.aktif,
            })
            setData(updated); setForm(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Judul permintaan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Judul permintaan tidak ditemukan.</div>

    const initial = data.nama_judul?.charAt(0).toUpperCase() ?? 'J'
    const tipeLabel = data.nama_tipe ?? TIPE_JUDUL_LABEL[data.tipe] ?? data.tipe

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.JUDUL_PERMINTAAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama_judul}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Tipe: {tipeLabel}</p>
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
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_judul}</p>
                                    <p className="text-sm text-gray-500 mt-1">Tipe: {tipeLabel}</p>
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
                                { label: 'Judul Permintaan', value: data.nama_judul },
                                { label: 'Tipe', value: tipeLabel },
                                { label: 'Jenis Form', value: TIPE_JUDUL_LABEL[data.tipe] ?? data.tipe },
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
                                {form.nama_judul?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Judul Permintaan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi judul permintaan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Judul Permintaan" asterisk invalid={!!errors.nama_judul} errorMessage={errors.nama_judul}>
                                <Input maxLength={150} value={form.nama_judul ?? ''} invalid={!!errors.nama_judul} onChange={e => setForm(p => ({ ...p, nama_judul: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tipe" asterisk invalid={!!errors.id_tipe_permintaan} errorMessage={errors.id_tipe_permintaan}>
                                <Select isSearchable={false} placeholder="Pilih tipe" options={tipeOptions}
                                    value={tipeOptions.find(o => o.value === form.id_tipe_permintaan) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_tipe_permintaan: opt?.value }))} />
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
