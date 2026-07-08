'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Tag } from '@/components/ui'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { ruteService, Rute, RutePayload } from '@/services/rute.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

export default function RuteDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]       = useState<Rute | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<RutePayload> & { estimasi_jarak_km_str?: string; estimasi_durasi_menit_str?: string }>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        ruteService.get(id)
            .then(d => {
                setData(d)
                setForm({
                    ...d,
                    estimasi_jarak_km_str: d.estimasi_jarak_km != null ? String(d.estimasi_jarak_km) : '',
                    estimasi_durasi_menit_str: d.estimasi_durasi_menit != null ? String(d.estimasi_durasi_menit) : '',
                })
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await ruteService.update(id, {
                kode_rute: form.kode_rute,
                nama_rute: form.nama_rute,
                asal: form.asal || null,
                tujuan: form.tujuan || null,
                estimasi_jarak_km: form.estimasi_jarak_km_str ? parseFloat(form.estimasi_jarak_km_str) : null,
                estimasi_durasi_menit: form.estimasi_durasi_menit_str ? parseInt(form.estimasi_durasi_menit_str) : null,
                keterangan: form.keterangan || null,
                aktif: form.aktif,
            })
            setData(updated)
            setForm({
                ...updated,
                estimasi_jarak_km_str: updated.estimasi_jarak_km != null ? String(updated.estimasi_jarak_km) : '',
                estimasi_durasi_menit_str: updated.estimasi_durasi_menit != null ? String(updated.estimasi_durasi_menit) : '',
            })
            setEditing(false)
            toast.push(<Notification type="success" title="Rute berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Rute tidak ditemukan.</div>

    const initial = data.nama_rute.charAt(0).toUpperCase()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.RUTE)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{data.nama_rute}</h4>
                    <p className="text-gray-500 text-sm mt-0.5">{data.kode_rute}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama_rute}</p>
                                    <p className="text-sm text-gray-500 mt-1">{data.kode_rute}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {data.aktif
                                    ? <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-0">Aktif</Tag>
                                    : <Tag className="bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400 border-0">Nonaktif</Tag>
                                }
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Rute', value: data.kode_rute },
                                { label: 'Nama Rute', value: data.nama_rute },
                                { label: 'Asal',      value: data.asal ?? <span className="text-gray-400">—</span> },
                                { label: 'Tujuan',    value: data.tujuan ?? <span className="text-gray-400">—</span> },
                                {
                                    label: 'Estimasi Jarak',
                                    value: data.estimasi_jarak_km != null
                                        ? `${formatNum(data.estimasi_jarak_km)} km`
                                        : <span className="text-gray-400">—</span>
                                },
                                {
                                    label: 'Estimasi Durasi',
                                    value: data.estimasi_durasi_menit != null
                                        ? `${data.estimasi_durasi_menit} menit`
                                        : <span className="text-gray-400">—</span>
                                },
                                { label: 'Keterangan', value: data.keterangan ?? <span className="text-gray-400">—</span> },
                            ] as { label: string; value: React.ReactNode }[]).map(({ label, value }) => (
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                {initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Rute</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi rute di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                                <FormItem label="Kode Rute">
                                    <Input value={form.kode_rute ?? ''} onChange={e => setForm(p => ({ ...p, kode_rute: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Nama Rute">
                                    <Input value={form.nama_rute ?? ''} onChange={e => setForm(p => ({ ...p, nama_rute: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Asal">
                                    <Input value={form.asal ?? ''} onChange={e => setForm(p => ({ ...p, asal: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Tujuan">
                                    <Input value={form.tujuan ?? ''} onChange={e => setForm(p => ({ ...p, tujuan: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Estimasi Jarak (km)">
                                    <Input type="number" step="0.01" min="0" value={form.estimasi_jarak_km_str ?? ''} onChange={e => setForm(p => ({ ...p, estimasi_jarak_km_str: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Estimasi Durasi (menit)">
                                    <Input type="number" min="0" value={form.estimasi_durasi_menit_str ?? ''} onChange={e => setForm(p => ({ ...p, estimasi_durasi_menit_str: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Keterangan" className="sm:col-span-2">
                                    <textarea
                                        rows={3}
                                        value={form.keterangan ?? ''}
                                        onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                    />
                                </FormItem>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="plain" onClick={() => {
                                    setEditing(false)
                                    setForm({
                                        ...data,
                                        estimasi_jarak_km_str: data.estimasi_jarak_km != null ? String(data.estimasi_jarak_km) : '',
                                        estimasi_durasi_menit_str: data.estimasi_durasi_menit != null ? String(data.estimasi_durasi_menit) : '',
                                    })
                                }}>Batal</Button>
                                <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                            </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}