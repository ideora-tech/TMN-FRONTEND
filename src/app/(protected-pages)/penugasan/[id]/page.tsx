'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { penugasanService, Penugasan, StatusPenugasan } from '@/services/penugasan.service'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { armadaService, Armada } from '@/services/armada.service'

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'aktif',   label: 'Aktif' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'batal',   label: 'Batal' },
]

const STATUS_CLASS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    aktif:   'bg-emerald-100 text-emerald-600',
    selesai: 'bg-blue-100 text-blue-600',
    batal:   'bg-red-100 text-red-500',
}

export default function PenugasanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router  = useRouter()
    const [penugasan, setPenugasan] = useState<Penugasan | null>(null)
    const [loading, setLoading]     = useState(true)
    const [editing, setEditing]     = useState(false)
    const [form, setForm]           = useState<Partial<Penugasan>>({})
    const [saving, setSaving]       = useState(false)
    const [karyawanOptions, setKaryawanOptions] = useState<{ value: string; label: string }[]>([])
    const [armadaOptions, setArmadaOptions]     = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        Promise.all([
            penugasanService.get(id),
            karyawanService.list(1),
            armadaService.list(1),
        ]).then(async ([p, karyawan, armada]) => {
            setPenugasan(p)
            setForm(p)
            const karyawanOpts = karyawan.data.map((k: Karyawan) => ({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` }))
            const armadaOpts = armada.data.map((a: Armada) => ({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() }))

            if (p.id_karyawan && !karyawanOpts.some(o => o.value === p.id_karyawan)) {
                try {
                    const k = await karyawanService.get(p.id_karyawan)
                    karyawanOpts.unshift({ value: k.id_karyawan, label: `${k.nik} — ${k.nama_karyawan}` })
                } catch { /* assigned karyawan may have been deleted */ }
            }
            if (p.id_armada && !armadaOpts.some(o => o.value === p.id_armada)) {
                try {
                    const a = await armadaService.get(p.id_armada)
                    armadaOpts.unshift({ value: a.id_armada, label: `${a.nopol} — ${a.merk} ${a.model ?? ''}`.trim() })
                } catch { /* assigned armada may have been deleted */ }
            }

            setKaryawanOptions(karyawanOpts)
            setArmadaOptions(armadaOpts)
        }).catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await penugasanService.update(id, {
                id_karyawan:   form.id_karyawan ?? null,
                id_armada:     form.id_armada ?? null,
                tanggal_tugas: form.tanggal_tugas ?? null,
                status:        form.status,
            })
            setPenugasan(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Penugasan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!penugasan) return <div className="p-6 text-red-500">Penugasan tidak ditemukan.</div>

    const karyawanLabel = karyawanOptions.find(o => o.value === penugasan.id_karyawan)?.label ?? penugasan.id_karyawan ?? '—'
    const armadaLabel   = armadaOptions.find(o => o.value === penugasan.id_armada)?.label ?? penugasan.id_armada ?? '—'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PENUGASAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Penugasan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan penugasan</p>
                </div>
            </div>

            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                    P
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">Penugasan</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {penugasan.tanggal_tugas ? dayjs(penugasan.tanggal_tugas).format('DD MMM YYYY') : 'Tanggal belum diset'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASS[penugasan.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {penugasan.status}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'ID Proyek',     value: penugasan.id_proyek ?? <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Tugas', value: penugasan.tanggal_tugas ?? <span className="text-gray-400">—</span> },
                                { label: 'Karyawan',      value: karyawanLabel },
                                { label: 'Armada',        value: armadaLabel },
                                { label: 'Dibuat',        value: dayjs(penugasan.dibuat_pada).format('DD MMM YYYY HH:mm') },
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
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                                P
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Penugasan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui data penugasan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Karyawan">
                                <Select
                                    placeholder="Pilih karyawan..."
                                    options={karyawanOptions}
                                    value={karyawanOptions.find(o => o.value === form.id_karyawan) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, id_karyawan: opt?.value ?? null }))}
                                    isClearable
                                />
                            </FormItem>
                            <FormItem label="Armada">
                                <Select
                                    placeholder="Pilih armada..."
                                    options={armadaOptions}
                                    value={armadaOptions.find(o => o.value === form.id_armada) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, id_armada: opt?.value ?? null }))}
                                    isClearable
                                />
                            </FormItem>
                            <FormItem label="Tanggal Tugas">
                                <DatePicker
                                    value={form.tanggal_tugas ? new Date(form.tanggal_tugas) : null}
                                    onChange={(date) => setForm(p => ({ ...p, tanggal_tugas: date ? dayjs(date).format('YYYY-MM-DD') : null }))}
                                />
                            </FormItem>
                            <FormItem label="Status">
                                <Select
                                    isSearchable={false}
                                    options={STATUS_OPTIONS}
                                    value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                    onChange={(opt) => setForm(p => ({ ...p, status: (opt?.value ?? 'pending') as StatusPenugasan }))}
                                />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(penugasan) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    )
}