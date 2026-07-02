'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { armadaService, Armada } from '@/services/armada.service'

type Status = 'aktif' | 'servis' | 'nonaktif'

const STATUS_OPTIONS = [
    { value: 'aktif',    label: 'Aktif' },
    { value: 'servis',   label: 'Servis' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

const statusClass: Record<string, string> = {
    aktif:    'bg-emerald-100 text-emerald-600',
    servis:   'bg-yellow-100 text-yellow-700',
    nonaktif: 'bg-red-100 text-red-500',
}

export default function ArmadaDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [armada, setArmada] = useState<Armada | null>(null)
    const [loading, setLoading]   = useState(true)
    const [editing, setEditing]   = useState(false)
    const [form, setForm]         = useState<Partial<Armada>>({})
    const [saving, setSaving]     = useState(false)

    useEffect(() => {
        armadaService.get(params.id)
            .then(a => { setArmada(a); setForm(a) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [params.id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await armadaService.update(params.id, { ...form, tahun: form.tahun ? Number(form.tahun) : undefined })
            setArmada(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Data armada berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!armada) return <div className="p-6 text-red-500">Armada tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.ARMADA)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{armada.nopol}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pengelolaan armada</p>
                </div>
            </div>

            <Card>
                <div className="flex justify-end mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass[armada.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {armada.status}
                    </span>
                </div>

                {!editing ? (
                    <>
                        <div className="flex flex-col gap-0">
                            {[
                                { label: 'Nopol',  value: <span className="font-mono">{armada.nopol}</span> },
                                { label: 'Merk',   value: armada.merk },
                                { label: 'Model',  value: armada.model ?? '-' },
                                { label: 'Tahun',  value: armada.tahun },
                                { label: 'Status', value: armada.status },
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
                            <FormItem label="Nopol">
                                <Input value={form.nopol ?? ''} onChange={(e) => setForm(p => ({ ...p, nopol: e.target.value.toUpperCase() }))} />
                            </FormItem>
                            <FormItem label="Merk">
                                <Input value={form.merk ?? ''} onChange={(e) => setForm(p => ({ ...p, merk: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Model">
                                <Input value={form.model ?? ''} onChange={(e) => setForm(p => ({ ...p, model: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Tahun">
                                <Input type="number" value={form.tahun ?? ''} min={1990} max={2100} onChange={(e) => setForm(p => ({ ...p, tahun: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select
                                    isSearchable={false}
                                    value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                                    options={STATUS_OPTIONS}
                                    onChange={(option) => option && setForm(p => ({ ...p, status: option.value as Status }))}
                                />
                            </FormItem>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <Button variant="solid" loading={saving} onClick={handleSave}>Simpan</Button>
                            <Button variant="plain" onClick={() => { setEditing(false); setForm(armada) }}>Batal</Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}
