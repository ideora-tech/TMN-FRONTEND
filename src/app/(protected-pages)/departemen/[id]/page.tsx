'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { departemenService, Departemen } from '@/services/departemen.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function DepartemenDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<Departemen | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Departemen>>({})
    const [saving, setSaving]   = useState(false)
    const [indukOptions, setIndukOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        Promise.all([
            departemenService.get(id),
            axios.get(API_ENDPOINTS.DEPARTEMEN, { params: { limit: 999 } }),
        ]).then(([d, r]) => {
            setData(d); setForm(d)
            setIndukOptions((r.data.data as Departemen[])
                .filter(dep => dep.id_departemen !== id)
                .map(dep => ({ value: dep.id_departemen, label: dep.nama_departemen })))
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
          .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await departemenService.update(id, {
                kode_departemen:     form.kode_departemen,
                nama_departemen:     form.nama_departemen,
                id_departemen_induk: form.id_departemen_induk ?? null,
                aktif:               form.aktif,
            })
            setData(updated); setEditing(false)
            toast.push(<Notification type="success" title="Departemen berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Departemen tidak ditemukan.</div>

    const initial = data.nama_departemen?.charAt(0).toUpperCase() ?? 'D'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.DEPARTEMEN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama_departemen}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kode: {data.kode_departemen}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_departemen}</p>
                                    <p className="text-sm text-gray-500 mt-1">Kode: {data.kode_departemen}</p>
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
                                { label: 'Kode Departemen', value: data.kode_departemen },
                                { label: 'Nama Departemen', value: data.nama_departemen },
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_departemen?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Departemen</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi departemen di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode Departemen">
                                <Input value={form.kode_departemen ?? ''} onChange={e => setForm(p => ({ ...p, kode_departemen: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Departemen">
                                <Input value={form.nama_departemen ?? ''} onChange={e => setForm(p => ({ ...p, nama_departemen: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Departemen Induk">
                                <Select isClearable isSearchable placeholder="Pilih induk..."
                                    options={indukOptions}
                                    value={indukOptions.find(o => o.value === form.id_departemen_induk) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_departemen_induk: opt?.value ?? null }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(data) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}