'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { armadaService } from '@/services/armada.service'

type Status = 'aktif' | 'servis' | 'nonaktif'

const STATUS_OPTIONS = [
    { value: 'aktif',    label: 'Aktif' },
    { value: 'servis',   label: 'Servis' },
    { value: 'nonaktif', label: 'Nonaktif' },
]

export default function ArmadaBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nopol: '', merk: '', model: '', tahun: new Date().getFullYear().toString(), status: 'aktif' as Status })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nopol.trim()) e.nopol = 'Nopol wajib diisi'
        if (!form.merk.trim())  e.merk  = 'Merk wajib diisi'
        if (!form.tahun)        e.tahun = 'Tahun wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await armadaService.create({ nopol: form.nopol, merk: form.merk, model: form.model || undefined, tahun: Number(form.tahun), status: form.status })
            toast.push(<Notification type="success" title="Armada berhasil ditambahkan" />)
            router.push(ROUTES.ARMADA)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Armada Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan armada baru ke sistem</p>
                </div>
            </div>
            <Card>
                <div className="flex flex-col gap-1">
                    <FormItem label="Nopol" asterisk invalid={!!errors.nopol} errorMessage={errors.nopol}>
                        <Input
                            placeholder="Contoh: B 1234 XYZ"
                            value={form.nopol}
                            invalid={!!errors.nopol}
                            onChange={(e) => setForm(p => ({ ...p, nopol: e.target.value.toUpperCase() }))}
                        />
                    </FormItem>
                    <FormItem label="Merk" asterisk invalid={!!errors.merk} errorMessage={errors.merk}>
                        <Input
                            placeholder="Contoh: Toyota"
                            value={form.merk}
                            invalid={!!errors.merk}
                            onChange={(e) => setForm(p => ({ ...p, merk: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Model">
                        <Input
                            placeholder="Contoh: Kijang Innova"
                            value={form.model}
                            onChange={(e) => setForm(p => ({ ...p, model: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Tahun" asterisk invalid={!!errors.tahun} errorMessage={errors.tahun}>
                        <Input
                            type="number"
                            placeholder="Contoh: 2022"
                            value={form.tahun}
                            invalid={!!errors.tahun}
                            min={1990}
                            max={2100}
                            onChange={(e) => setForm(p => ({ ...p, tahun: e.target.value }))}
                        />
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
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button variant="solid" loading={loading} onClick={handleSubmit}>Simpan</Button>
                </div>
            </Card>
        </div>
    )
}
