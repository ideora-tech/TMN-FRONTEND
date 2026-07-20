'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { armadaVendorService, ArmadaVendor } from '@/services/armadaVendor.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function ArmadaVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<ArmadaVendor | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<ArmadaVendor> & { tahun_str?: string }>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        armadaVendorService.get(id)
            .then(d => { setData(d); setForm({ ...d, tahun_str: d.tahun ? String(d.tahun) : '' }) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.nopol?.trim()) e.nopol = 'Nopol wajib diisi'
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
            const updated = await armadaVendorService.update(id, {
                nopol: form.nopol,
                merk:  form.merk || null,
                jenis: form.jenis || null,
                tahun: form.tahun_str ? Number(form.tahun_str) : null,
                aktif: form.aktif,
            })
            setData(updated)
            setForm({ ...updated, tahun_str: updated.tahun ? String(updated.tahun) : '' })
            setEditing(false)
            setErrors({})
            toast.push(<Notification type="success" title="Armada vendor berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Armada vendor tidak ditemukan.</div>

    const initial = data.nopol.charAt(0).toUpperCase()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.ARMADA_VENDOR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nopol}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{data.nama_vendor ?? 'Armada Vendor'}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nopol}</p>
                                    <p className="text-sm text-gray-500 mt-1">{data.nama_vendor ?? '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Tag className={`text-xs font-semibold ${data.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {data.aktif ? 'Aktif' : 'Nonaktif'}
                                </Tag>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Vendor', value: data.nama_vendor ?? <span className="text-gray-400">—</span> },
                                { label: 'Nopol',  value: data.nopol },
                                { label: 'Merk',   value: data.merk ?? <span className="text-gray-400">—</span> },
                                { label: 'Jenis',  value: data.jenis ?? <span className="text-gray-400">—</span> },
                                { label: 'Tahun',  value: data.tahun ?? <span className="text-gray-400">—</span> },
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                {initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Armada Vendor</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi armada di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nopol" asterisk invalid={!!errors.nopol} errorMessage={errors.nopol}>
                                <Input value={form.nopol ?? ''} invalid={!!errors.nopol} onChange={e => setForm(p => ({ ...p, nopol: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Merk">
                                <Input value={form.merk ?? ''} onChange={e => setForm(p => ({ ...p, merk: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jenis">
                                <Input value={form.jenis ?? ''} onChange={e => setForm(p => ({ ...p, jenis: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tahun">
                                <Input value={form.tahun_str ?? ''}
                                    onChange={e => setForm(p => ({ ...p, tahun_str: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => {
                                setEditing(false)
                                setForm({ ...data, tahun_str: data.tahun ? String(data.tahun) : '' })
                                setErrors({})
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
