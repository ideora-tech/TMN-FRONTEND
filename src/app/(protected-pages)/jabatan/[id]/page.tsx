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
import { jabatanService, Jabatan } from '@/services/jabatan.service'
import { Departemen } from '@/services/departemen.service'
import { Peran } from '@/services/peran.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function JabatanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<Jabatan | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Jabatan>>({})
    const [saving, setSaving]   = useState(false)
    const [deptOptions, setDeptOptions] = useState<{ value: string; label: string }[]>([])
    const [peranOptions, setPeranOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        Promise.all([
            jabatanService.get(id),
            axios.get(API_ENDPOINTS.DEPARTEMEN, { params: { limit: 999 } }),
            axios.get(API_ENDPOINTS.PERAN, { params: { limit: 999 } }),
        ]).then(([j, dRes, pRes]) => {
            setData(j); setForm(j)
            setDeptOptions((dRes.data.data as Departemen[]).map(d => ({ value: d.id_departemen, label: d.nama_departemen })))
            setPeranOptions((pRes.data.data as Peran[]).map(p => ({ value: p.id_peran, label: p.nama_peran })))
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
          .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await jabatanService.update(id, {
                kode_jabatan:  form.kode_jabatan,
                nama_jabatan:  form.nama_jabatan,
                id_departemen: form.id_departemen ?? null,
                id_peran:      form.id_peran ?? null,
                level:         form.level,
                aktif:         form.aktif,
            })
            setData(updated); setEditing(false)
            toast.push(<Notification type="success" title="Jabatan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Jabatan tidak ditemukan.</div>

    const initial = data.nama_jabatan?.charAt(0).toUpperCase() ?? 'J'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.JABATAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama_jabatan}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kode: {data.kode_jabatan} &middot; Level {data.level}</p>
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
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_jabatan}</p>
                                    <p className="text-sm text-gray-500 mt-1">Kode: {data.kode_jabatan} &middot; Level {data.level}</p>
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
                                { label: 'Kode Jabatan', value: data.kode_jabatan },
                                { label: 'Nama Jabatan', value: data.nama_jabatan },
                                { label: 'Level',        value: String(data.level) },
                                { label: 'Departemen',   value: deptOptions.find(o => o.value === data.id_departemen)?.label ?? (data.id_departemen ? data.id_departemen : '—') },
                                { label: 'Peran',        value: peranOptions.find(o => o.value === data.id_peran)?.label ?? (data.id_peran ? data.id_peran : '—') },
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
                                {form.nama_jabatan?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Jabatan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi jabatan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode Jabatan">
                                <Input value={form.kode_jabatan ?? ''} onChange={e => setForm(p => ({ ...p, kode_jabatan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Jabatan">
                                <Input value={form.nama_jabatan ?? ''} onChange={e => setForm(p => ({ ...p, nama_jabatan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Departemen">
                                <Select isClearable isSearchable placeholder="Pilih departemen..."
                                    options={deptOptions}
                                    value={deptOptions.find(o => o.value === form.id_departemen) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_departemen: opt?.value ?? null }))} />
                            </FormItem>
                            <FormItem label="Peran">
                                <Select isClearable isSearchable placeholder="Pilih peran..."
                                    options={peranOptions}
                                    value={peranOptions.find(o => o.value === form.id_peran) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, id_peran: opt?.value ?? null }))} />
                            </FormItem>
                            <FormItem label="Level">
                                <Input type="number" min={1} value={form.level ?? 1}
                                    onChange={e => setForm(p => ({ ...p, level: Number(e.target.value) }))} />
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