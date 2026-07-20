'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parameterBokService } from '@/services/parameterBok.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { jenisBbmService, JenisBbm } from '@/services/jenisBbm.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

interface FormState {
    id_jenis_kendaraan: string
    id_jenis_bbm: string
    konsumsi_km_per_liter: string
    biaya_ban_per_km: string
    biaya_servis_per_km: string
    biaya_tetap_bulanan: string
    utilisasi_km_per_bulan: string
    margin_persen: string
    keterangan: string
}

type Option = { value: string; label: string }

const INIT: FormState = {
    id_jenis_kendaraan: '', id_jenis_bbm: '', konsumsi_km_per_liter: '',
    biaya_ban_per_km: '', biaya_servis_per_km: '', biaya_tetap_bulanan: '',
    utilisasi_km_per_bulan: '', margin_persen: '15', keterangan: '',
}

export default function ParameterBokDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [form, setForm] = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [bbmOptions, setBbmOptions] = useState<Option[]>([])
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        jenisKendaraanService.list(1)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        jenisBbmService.list(1)
            .then(res => setBbmOptions(res.data.map((b: JenisBbm) => ({ value: b.id_jenis_bbm, label: b.nama_bbm }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        parameterBokService.get(id)
            .then(d => setForm({
                id_jenis_kendaraan: d.id_jenis_kendaraan,
                id_jenis_bbm: d.id_jenis_bbm,
                konsumsi_km_per_liter: String(d.konsumsi_km_per_liter),
                biaya_ban_per_km: String(Math.round(d.biaya_ban_per_km)),
                biaya_servis_per_km: String(Math.round(d.biaya_servis_per_km)),
                biaya_tetap_bulanan: String(Math.round(d.biaya_tetap_bulanan)),
                utilisasi_km_per_bulan: String(d.utilisasi_km_per_bulan),
                margin_persen: String(d.margin_persen),
                keterangan: d.keterangan ?? '',
            }))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false))
    }, [id])

    const set = (field: keyof FormState, value: string) =>
        setForm(p => ({ ...p, [field]: value }))

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.id_jenis_kendaraan) e.id_jenis_kendaraan = 'Jenis kendaraan wajib diisi'
        if (!form.id_jenis_bbm) e.id_jenis_bbm = 'Jenis BBM wajib diisi'
        if (!form.konsumsi_km_per_liter || parseFloat(form.konsumsi_km_per_liter) <= 0)
            e.konsumsi_km_per_liter = 'Konsumsi BBM wajib diisi'
        if (!form.utilisasi_km_per_bulan || parseFloat(form.utilisasi_km_per_bulan) <= 0)
            e.utilisasi_km_per_bulan = 'Utilisasi wajib diisi'
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
            await parameterBokService.update(id, {
                id_jenis_kendaraan: form.id_jenis_kendaraan,
                id_jenis_bbm: form.id_jenis_bbm,
                konsumsi_km_per_liter: parseFloat(form.konsumsi_km_per_liter),
                biaya_ban_per_km: form.biaya_ban_per_km ? Number(form.biaya_ban_per_km) : 0,
                biaya_servis_per_km: form.biaya_servis_per_km ? Number(form.biaya_servis_per_km) : 0,
                biaya_tetap_bulanan: form.biaya_tetap_bulanan ? Number(form.biaya_tetap_bulanan) : 0,
                utilisasi_km_per_bulan: parseFloat(form.utilisasi_km_per_bulan),
                margin_persen: form.margin_persen ? parseFloat(form.margin_persen) : 15,
                keterangan: form.keterangan.trim() || null,
            })
            toast.push(<Notification type="success" title="Parameter BOK berhasil diperbarui" />)
            router.push(ROUTES.PARAMETER_BOK)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (notFound) return <div className="p-6 text-red-500">Parameter BOK tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PARAMETER_BOK)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Ubah Parameter BOK</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Satu set parameter per jenis kendaraan — dipakai menghitung estimasi harga pokok rute</p>
                </div>
            </div>
            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Jenis Kendaraan" asterisk invalid={!!errors.id_jenis_kendaraan} errorMessage={errors.id_jenis_kendaraan}>
                            <Select<Option> isSearchable placeholder="Pilih jenis kendaraan..."
                                options={jenisOptions}
                                value={jenisOptions.find(o => o.value === form.id_jenis_kendaraan) ?? null}
                                onChange={opt => set('id_jenis_kendaraan', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Jenis BBM" asterisk invalid={!!errors.id_jenis_bbm} errorMessage={errors.id_jenis_bbm}>
                            <Select<Option> isSearchable placeholder="Pilih jenis BBM..."
                                options={bbmOptions}
                                value={bbmOptions.find(o => o.value === form.id_jenis_bbm) ?? null}
                                onChange={opt => set('id_jenis_bbm', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Konsumsi BBM (km per liter)" asterisk invalid={!!errors.konsumsi_km_per_liter} errorMessage={errors.konsumsi_km_per_liter}>
                            <Input type="number" step="0.1" min="0" placeholder="Contoh: 5"
                                value={form.konsumsi_km_per_liter}
                                invalid={!!errors.konsumsi_km_per_liter}
                                onChange={e => set('konsumsi_km_per_liter', e.target.value)} />
                        </FormItem>
                        <FormItem label="Utilisasi (km per bulan)" asterisk invalid={!!errors.utilisasi_km_per_bulan} errorMessage={errors.utilisasi_km_per_bulan}>
                            <Input type="number" step="1" min="0" placeholder="Contoh: 5000"
                                value={form.utilisasi_km_per_bulan}
                                invalid={!!errors.utilisasi_km_per_bulan}
                                onChange={e => set('utilisasi_km_per_bulan', e.target.value)} />
                        </FormItem>
                        <FormItem label="Biaya Ban per Km">
                            <Input prefix="Rp" placeholder="0"
                                value={form.biaya_ban_per_km ? formatNum(Number(form.biaya_ban_per_km)) : ''}
                                onChange={e => set('biaya_ban_per_km', e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        <FormItem label="Biaya Servis per Km">
                            <Input prefix="Rp" placeholder="0"
                                value={form.biaya_servis_per_km ? formatNum(Number(form.biaya_servis_per_km)) : ''}
                                onChange={e => set('biaya_servis_per_km', e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        <FormItem label="Biaya Tetap per Bulan" extra="Penyusutan + gaji supir + asuransi/KIR (gabungan)">
                            <Input prefix="Rp" placeholder="0"
                                value={form.biaya_tetap_bulanan ? formatNum(Number(form.biaya_tetap_bulanan)) : ''}
                                onChange={e => set('biaya_tetap_bulanan', e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        <FormItem label="Margin Default (%)">
                            <Input type="number" step="0.5" min="0" max="100" placeholder="15"
                                value={form.margin_persen}
                                onChange={e => set('margin_persen', e.target.value)} />
                        </FormItem>
                        <FormItem label="Keterangan" className="sm:col-span-2">
                            <Input
                                textArea
                                rows={3}
                                placeholder="Catatan tambahan (opsional)"
                                value={form.keterangan}
                                onChange={e => set('keterangan', e.target.value)}
                            />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PARAMETER_BOK)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan Parameter</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
