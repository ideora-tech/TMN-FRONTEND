'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { shiftService, Shift } from '@/services/shift.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

const formatJam = (jam: string) => jam.slice(0, 5)

// Backend returns TIME columns as HH:mm:ss — normalize to HH:mm at populate time so
// form state always matches the <Input type="time"> contract and the H:i backend validator.
const toFormState = (s: Shift): Partial<Shift> => ({
    ...s,
    jam_mulai: (s.jam_mulai ?? '').slice(0, 5),
    jam_selesai: (s.jam_selesai ?? '').slice(0, 5),
})

export default function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    // info shift
    const [data, setData]     = useState<Shift | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Shift>>({})
    const [errors, setErrors]   = useState<Partial<Record<keyof typeof form, string>>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        shiftService.get(id)
            .then(d => { setData(d); setForm(toFormState(d)) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    // --- handlers info ---
    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.nama?.trim()) e.nama = 'Nama Shift wajib diisi'
        if (!form.jam_mulai) e.jam_mulai = 'Jam Mulai wajib diisi'
        if (!form.jam_selesai) e.jam_selesai = 'Jam Selesai wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return
        setSaving(true)
        try {
            const updated = await shiftService.update(id, {
                nama:        form.nama,
                jam_mulai:   form.jam_mulai,
                jam_selesai: form.jam_selesai,
                aktif:       form.aktif,
            })
            setData(updated); setEditing(false); setErrors({})
            toast.push(<Notification type="success" title="Shift berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Shift tidak ditemukan.</div>

    const initial = data.nama?.charAt(0).toUpperCase() ?? 'S'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.SHIFT)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{data.nama}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Detail shift supir</p>
                </div>
            </div>

            {/* Info Shift */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{data.nama}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatJam(data.jam_mulai)} &ndash; {formatJam(data.jam_selesai)}
                                    </p>
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
                                { label: 'Nama Shift',   value: data.nama },
                                { label: 'Jam Mulai',    value: formatJam(data.jam_mulai) },
                                { label: 'Jam Selesai',  value: formatJam(data.jam_selesai) },
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Shift</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi shift di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Nama Shift" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                                <Input value={form.nama ?? ''} invalid={!!errors.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                            </FormItem>
                            <FormItem label="Jam Mulai" asterisk invalid={!!errors.jam_mulai} errorMessage={errors.jam_mulai}>
                                <Input type="time" value={form.jam_mulai ?? ''} invalid={!!errors.jam_mulai}
                                    onChange={e => setForm(p => ({ ...p, jam_mulai: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jam Selesai" asterisk invalid={!!errors.jam_selesai} errorMessage={errors.jam_selesai}>
                                <Input type="time" value={form.jam_selesai ?? ''} invalid={!!errors.jam_selesai}
                                    onChange={e => setForm(p => ({ ...p, jam_selesai: e.target.value }))} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <p className="text-xs text-gray-400 -mt-1">Jam selesai lebih kecil dari jam mulai = shift berakhir keesokan hari</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(toFormState(data)); setErrors({}) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}
