'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Tooltip } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { komponenUangJalanService, KomponenUangJalan } from '@/services/komponenUangJalan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

type FormState = { nama: string; urutan: string; aktif: boolean }

const keForm = (d: KomponenUangJalan): FormState => ({ nama: d.nama, urutan: String(d.urutan), aktif: d.aktif })

export default function KomponenUangJalanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]       = useState<KomponenUangJalan | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<FormState>({ nama: '', urutan: '', aktif: true })
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        komponenUangJalanService.get(id)
            .then(d => { setData(d); setForm(keForm(d)) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        if (!form.nama.trim()) {
            setErrors({ nama: 'Nama komponen wajib diisi' })
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        setSaving(true)
        try {
            const updated = await komponenUangJalanService.update(id, {
                nama: form.nama.trim(),
                urutan: Number(form.urutan) || 0,
                aktif: form.aktif,
            })
            setData(updated); setForm(keForm(updated)); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Komponen uang jalan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Komponen uang jalan tidak ditemukan.</div>

    const initial = data.nama.charAt(0).toUpperCase() || 'K'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.KOMPONEN_UANG_JALAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Komponen uang jalan</p>
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
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama}</p>
                                    <p className="text-sm text-gray-500 mt-1">Urutan tampil: {data.urutan}</p>
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
                                { label: 'Nama Komponen', value: data.nama },
                                { label: 'Urutan Tampil', value: String(data.urutan) },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {!data.aktif && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-5">
                                Komponen nonaktif tidak bisa dipilih di data baru, tetapi tetap tampil di tarif rute dan pengajuan yang sudah memakainya.
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama.charAt(0).toUpperCase() || initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Komponen Uang Jalan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Nama baru berlaku untuk tarif rute dan pengajuan berikutnya; pengajuan lama tetap memakai nama lamanya</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama Komponen" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                                <Input value={form.nama} maxLength={100} invalid={!!errors.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Urutan Tampil">
                                <Input value={form.urutan} maxLength={3} placeholder="0"
                                    onChange={e => setForm(p => ({ ...p, urutan: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(keForm(data)); setErrors({}) }}>Kembali</Button>
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
