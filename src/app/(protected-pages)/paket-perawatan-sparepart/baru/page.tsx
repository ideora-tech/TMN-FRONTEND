'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { paketPerawatanSparepartService } from '@/services/paketPerawatanSparepart.service'
import { jenisPerawatanService } from '@/services/jenisPerawatan.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'

interface FormState {
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
    id_sparepart: string
    qty_standar: string
}

type Option = { value: string; label: string }

const INIT: FormState = { id_jenis_perawatan: '', id_jenis_kendaraan: '', id_sparepart: '', qty_standar: '' }

export default function PaketPerawatanSparepartBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [jenisPerawatanOptions, setJenisPerawatanOptions] = useState<Option[]>([])
    const [jenisKendaraanOptions, setJenisKendaraanOptions] = useState<Option[]>([])
    const [sparepartOptions, setSparepartOptions] = useState<Option[]>([])
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

    useEffect(() => {
        jenisPerawatanService.list(1, 100)
            .then(res => setJenisPerawatanOptions(res.data.filter(j => j.aktif).map(j => ({ value: j.id_jenis_perawatan, label: j.nama }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisKendaraanOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        sparepartService.list({ page: 1, limit: 100 })
            .then(res => setSparepartOptions(res.data.filter((s: Sparepart) => s.aktif).map((s: Sparepart) => ({ value: s.id_sparepart, label: `${s.nama} (${s.satuan})` }))))
            .catch(() => {})
    }, [])

    const set = (field: keyof FormState, value: string) => setForm(p => ({ ...p, [field]: value }))

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.id_jenis_perawatan) e.id_jenis_perawatan = 'Jenis perawatan wajib diisi'
        if (!form.id_jenis_kendaraan) e.id_jenis_kendaraan = 'Jenis kendaraan wajib diisi'
        if (!form.id_sparepart) e.id_sparepart = 'Sparepart wajib diisi'
        if (!form.qty_standar || parseInt(form.qty_standar) <= 0) e.qty_standar = 'Qty standar wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        try {
            await paketPerawatanSparepartService.create({
                id_jenis_perawatan: form.id_jenis_perawatan,
                id_jenis_kendaraan: form.id_jenis_kendaraan,
                id_sparepart: form.id_sparepart,
                qty_standar: parseInt(form.qty_standar),
            })
            toast.push(<Notification type="success" title="Paket sparepart berhasil ditambahkan" />)
            router.push(ROUTES.PAKET_PERAWATAN_SPAREPART)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PAKET_PERAWATAN_SPAREPART)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Tambah Paket Sparepart</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Satu baris part per kombinasi jenis perawatan &amp; jenis kendaraan</p>
                </div>
            </div>
            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Jenis Perawatan" asterisk invalid={!!errors.id_jenis_perawatan} errorMessage={errors.id_jenis_perawatan}>
                            <Select<Option> isSearchable placeholder="Pilih jenis perawatan..."
                                options={jenisPerawatanOptions}
                                value={jenisPerawatanOptions.find(o => o.value === form.id_jenis_perawatan) ?? null}
                                onChange={opt => set('id_jenis_perawatan', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Jenis Kendaraan" asterisk invalid={!!errors.id_jenis_kendaraan} errorMessage={errors.id_jenis_kendaraan}>
                            <Select<Option> isSearchable placeholder="Pilih jenis kendaraan..."
                                options={jenisKendaraanOptions}
                                value={jenisKendaraanOptions.find(o => o.value === form.id_jenis_kendaraan) ?? null}
                                onChange={opt => set('id_jenis_kendaraan', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Sparepart" asterisk invalid={!!errors.id_sparepart} errorMessage={errors.id_sparepart}>
                            <Select<Option> isSearchable placeholder="Pilih sparepart..."
                                options={sparepartOptions}
                                value={sparepartOptions.find(o => o.value === form.id_sparepart) ?? null}
                                onChange={opt => set('id_sparepart', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Qty Standar" asterisk invalid={!!errors.qty_standar} errorMessage={errors.qty_standar}>
                            <Input type="number" step="1" min="1" placeholder="Contoh: 6"
                                value={form.qty_standar}
                                invalid={!!errors.qty_standar}
                                onChange={e => set('qty_standar', e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PAKET_PERAWATAN_SPAREPART)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan Paket</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
