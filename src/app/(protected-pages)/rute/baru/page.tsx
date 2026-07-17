'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { ruteService } from '@/services/rute.service'
import { lokasiService } from '@/services/lokasi.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'

interface FormState {
    kode_rute: string
    nama_rute: string
    id_lokasi_asal: string
    id_lokasi_tujuan: string
    estimasi_jarak_km: string
    estimasi_durasi_menit: string
    keterangan: string
    aktif: boolean
}

type LokasiOption = { value: string; label: string }

const INIT: FormState = { kode_rute: '', nama_rute: '', id_lokasi_asal: '', id_lokasi_tujuan: '', estimasi_jarak_km: '', estimasi_durasi_menit: '', keterangan: '', aktif: true }

export default function RuteBaruPage() {
    const router = useRouter()
    const [form, setForm]     = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [lokasiOptions, setLokasiOptions] = useState<LokasiOption[]>([])
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

    useEffect(() => {
        lokasiService.list(1, 200)
            .then(res => setLokasiOptions(res.data.map(l => ({
                value: l.id_lokasi,
                label: `${l.nama_lokasi}${l.kota ? ' — ' + l.kota : ''}`,
            }))))
            .catch(() => {})
    }, [])

    const set = (field: keyof FormState, value: string | boolean) =>
        setForm(p => ({ ...p, [field]: value }))

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.kode_rute.trim()) e.kode_rute = 'Kode rute wajib diisi'
        if (!form.nama_rute.trim()) e.nama_rute = 'Nama rute wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setSaving(true)
        try {
            await ruteService.create({
                kode_rute: form.kode_rute.trim(),
                nama_rute: form.nama_rute.trim(),
                id_lokasi_asal: form.id_lokasi_asal || null,
                id_lokasi_tujuan: form.id_lokasi_tujuan || null,
                estimasi_jarak_km: form.estimasi_jarak_km ? parseFloat(form.estimasi_jarak_km) : null,
                estimasi_durasi_menit: form.estimasi_durasi_menit ? parseInt(form.estimasi_durasi_menit) : null,
                keterangan: form.keterangan.trim() || null,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Rute berhasil ditambahkan" />)
            router.push(ROUTES.RUTE)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.RUTE)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Tambah Rute Baru</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Isi informasi rute perjalanan</p>
                </div>
            </div>
            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Kode Rute" asterisk invalid={!!errors.kode_rute} errorMessage={errors.kode_rute}>
                            <Input placeholder="Contoh: RT-001" value={form.kode_rute} invalid={!!errors.kode_rute} onChange={e => set('kode_rute', e.target.value)} />
                        </FormItem>
                        <FormItem label="Nama Rute" asterisk invalid={!!errors.nama_rute} errorMessage={errors.nama_rute}>
                            <Input placeholder="Contoh: Jakarta - Surabaya" value={form.nama_rute} invalid={!!errors.nama_rute} onChange={e => set('nama_rute', e.target.value)} />
                        </FormItem>
                        <FormItem label="Asal">
                            <Select<LokasiOption> isClearable isSearchable placeholder="Pilih lokasi asal..."
                                options={lokasiOptions}
                                value={lokasiOptions.find(o => o.value === form.id_lokasi_asal) ?? null}
                                onChange={opt => set('id_lokasi_asal', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Tujuan">
                            <Select<LokasiOption> isClearable isSearchable placeholder="Pilih lokasi tujuan..."
                                options={lokasiOptions}
                                value={lokasiOptions.find(o => o.value === form.id_lokasi_tujuan) ?? null}
                                onChange={opt => set('id_lokasi_tujuan', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Estimasi Jarak (km)">
                            <Input type="number" step="0.01" min="0" placeholder="Contoh: 750.5" value={form.estimasi_jarak_km} onChange={e => set('estimasi_jarak_km', e.target.value)} />
                        </FormItem>
                        <FormItem label="Estimasi Durasi (menit)">
                            <Input type="number" min="0" placeholder="Contoh: 480" value={form.estimasi_durasi_menit} onChange={e => set('estimasi_durasi_menit', e.target.value)} />
                        </FormItem>
                        <FormItem label="Keterangan" className="sm:col-span-2">
                            <textarea
                                rows={3}
                                placeholder="Catatan tambahan tentang rute ini (opsional)"
                                value={form.keterangan}
                                onChange={e => set('keterangan', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                            />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.RUTE)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan Rute</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}