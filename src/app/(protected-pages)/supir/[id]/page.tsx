'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { supirService, Supir } from '@/services/supir.service'

const JENIS_SIM_OPTIONS = ['A', 'B1', 'B2', 'C', 'D'].map(j => ({ value: j, label: j }))

const STATUS_OPTIONS = [
    { value: 'aktif',    label: 'Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

const statusClass: Record<string, string> = {
    aktif:    'bg-emerald-100 text-emerald-600',
    nonaktif: 'bg-red-100 text-red-500',
}

export default function SupirDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [supir, setSupir]   = useState<Supir | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Supir>>({})
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        supirService.get(params.id)
            .then(s => { setSupir(s); setForm(s) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [params.id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await supirService.update(params.id, form)
            setSupir(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Data supir berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!supir)  return <div className="p-6 text-red-500">Supir tidak ditemukan.</div>

    const daysLeft = supir.tgl_kadaluarsa_sim
        ? Math.ceil((new Date(supir.tgl_kadaluarsa_sim).getTime() - Date.now()) / 86400000)
        : null
    const simWarning = daysLeft !== null && daysLeft < 30

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.SUPIR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{supir.nama}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan data supir</p>
                </div>
            </div>

            {simWarning && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10">
                    Peringatan: SIM kadaluarsa dalam {daysLeft} hari ({supir.tgl_kadaluarsa_sim})
                </div>
            )}

            <Card>
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass[supir.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {supir.status}
                    </span>
                </div>

                {!editing ? (
                    <>
                        <div className="flex flex-col gap-0">
                            {[
                                { label: 'Nama',    value: supir.nama },
                                { label: 'No SIM',  value: supir.no_sim },
                                { label: 'Jenis SIM', value: supir.jenis_sim },
                                {
                                    label: 'Kadaluarsa SIM',
                                    value: supir.tgl_kadaluarsa_sim
                                        ? <span className={simWarning ? 'text-red-500 font-medium' : ''}>{supir.tgl_kadaluarsa_sim}</span>
                                        : '-',
                                },
                                { label: 'Telepon', value: supir.telepon ?? '-' },
                                { label: 'Status',  value: supir.status },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="font-medium">{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button variant="solid" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>
                                Edit
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col gap-1">
                            <FormItem label="Nama">
                                <Input value={form.nama ?? ''} onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="No SIM">
                                <Input value={form.no_sim ?? ''} onChange={(e) => setForm(p => ({ ...p, no_sim: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jenis SIM">
                                <Select
                                    isSearchable={false}
                                    value={JENIS_SIM_OPTIONS.find(o => o.value === form.jenis_sim) ?? null}
                                    options={JENIS_SIM_OPTIONS}
                                    onChange={(option) => option && setForm(p => ({ ...p, jenis_sim: option.value }))}
                                />
                            </FormItem>
                            <FormItem label="Tgl Kadaluarsa SIM">
                                <DatePicker
                                    value={form.tgl_kadaluarsa_sim ? new Date(form.tgl_kadaluarsa_sim) : null}
                                    onChange={(date) => setForm(p => ({ ...p, tgl_kadaluarsa_sim: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select
                                    isSearchable={false}
                                    value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                    options={STATUS_OPTIONS}
                                    onChange={(option) => option && setForm(p => ({ ...p, status: option.value as 'aktif' | 'nonaktif' }))}
                                />
                            </FormItem>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button variant="solid" loading={saving} onClick={handleSave}>Simpan</Button>
                            <Button variant="plain" onClick={() => { setEditing(false); setForm(supir) }}>Batal</Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}
