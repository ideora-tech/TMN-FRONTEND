'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function JenisKendaraanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<JenisKendaraan | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<JenisKendaraan>>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        jenisKendaraanService.get(id)
            .then(d => { setData(d); setForm(d) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.kode_jenis?.trim()) e.kode_jenis = 'Kode Jenis wajib diisi'
        if (!form.nama_jenis?.trim()) e.nama_jenis = 'Nama Jenis wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return
        setSaving(true)
        try {
            const updated = await jenisKendaraanService.update(id, {
                kode_jenis:       form.kode_jenis,
                nama_jenis:       form.nama_jenis,
                kapasitas_muatan: form.kapasitas_muatan ?? null,
                aktif:            form.aktif,
            })
            setData(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Jenis kendaraan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Jenis kendaraan tidak ditemukan.</div>

    const initial = data.nama_jenis?.charAt(0).toUpperCase() ?? 'J'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.JENIS_KENDARAAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama_jenis}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kode: {data.kode_jenis}</p>
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
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_jenis}</p>
                                    <p className="text-sm text-gray-500 mt-1">Kode: {data.kode_jenis}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${data.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {data.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Jenis',        value: data.kode_jenis },
                                { label: 'Nama Jenis',        value: data.nama_jenis },
                                { label: 'Kapasitas (ton)',   value: data.kapasitas_muatan != null ? formatNum(data.kapasitas_muatan) : <span className="text-gray-400">—</span> },
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
                                {form.nama_jenis?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Jenis Kendaraan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi jenis kendaraan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode Jenis" asterisk invalid={!!errors.kode_jenis} errorMessage={errors.kode_jenis}>
                                <Input value={form.kode_jenis ?? ''} invalid={!!errors.kode_jenis} onChange={e => setForm(p => ({ ...p, kode_jenis: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Jenis" asterisk invalid={!!errors.nama_jenis} errorMessage={errors.nama_jenis}>
                                <Input value={form.nama_jenis ?? ''} invalid={!!errors.nama_jenis} onChange={e => setForm(p => ({ ...p, nama_jenis: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Kapasitas (ton)">
                                <Input type="number" min={0} step="0.01"
                                    value={form.kapasitas_muatan ?? ''}
                                    onChange={e => setForm(p => ({ ...p, kapasitas_muatan: e.target.value ? Number(e.target.value) : null }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(data); setErrors({}) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}