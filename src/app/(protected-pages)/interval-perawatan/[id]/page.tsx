'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { intervalPerawatanService, IntervalPerawatan } from '@/services/intervalPerawatan.service'
import { jenisPerawatanService } from '@/services/jenisPerawatan.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

interface FormState {
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
    interval_hari: string
    interval_km: string
}

type Option = { value: string; label: string }

const INIT: FormState = { id_jenis_perawatan: '', id_jenis_kendaraan: '', interval_hari: '', interval_km: '' }

const toFormState = (d: IntervalPerawatan): FormState => ({
    id_jenis_perawatan: d.id_jenis_perawatan,
    id_jenis_kendaraan: d.id_jenis_kendaraan,
    interval_hari: d.interval_hari != null ? String(d.interval_hari) : '',
    interval_km: d.interval_km != null ? String(d.interval_km) : '',
})

export default function IntervalPerawatanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData] = useState<IntervalPerawatan | null>(null)
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [jenisPerawatanOptions, setJenisPerawatanOptions] = useState<Option[]>([])
    const [jenisKendaraanOptions, setJenisKendaraanOptions] = useState<Option[]>([])
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        jenisPerawatanService.list(1, 100)
            .then(res => setJenisPerawatanOptions(res.data.filter(j => j.aktif).map(j => ({ value: j.id_jenis_perawatan, label: j.nama }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisKendaraanOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        intervalPerawatanService.get(id)
            .then(d => {
                setData(d)
                setForm(toFormState(d))
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false))
    }, [id])

    const set = (field: keyof FormState, value: string) =>
        setForm(p => ({ ...p, [field]: value }))

    const batalEdit = () => {
        setEditing(false)
        setErrors({})
        if (data) setForm(toFormState(data))
    }

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.id_jenis_perawatan) e.id_jenis_perawatan = 'Jenis perawatan wajib diisi'
        if (!form.id_jenis_kendaraan) e.id_jenis_kendaraan = 'Jenis kendaraan wajib diisi'
        if (!form.interval_km || parseInt(form.interval_km) <= 0) e.interval_km = 'Interval kilometer wajib diisi'
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
            await intervalPerawatanService.update(id, {
                id_jenis_perawatan: form.id_jenis_perawatan,
                id_jenis_kendaraan: form.id_jenis_kendaraan,
                interval_hari: form.interval_hari ? parseInt(form.interval_hari) : null,
                interval_km: parseInt(form.interval_km),
            })
            const segar = await intervalPerawatanService.get(id)
            setData(segar)
            setForm(toFormState(segar))
            setEditing(false)
            toast.push(<Notification type="success" title="Interval perawatan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (notFound || !data) return <div className="p-6 text-red-500">Interval perawatan tidak ditemukan.</div>

    const namaJenisPerawatan = data.nama_jenis_perawatan
        ?? jenisPerawatanOptions.find(o => o.value === data.id_jenis_perawatan)?.label ?? '—'
    const namaJenisKendaraan = data.nama_jenis_kendaraan
        ?? jenisKendaraanOptions.find(o => o.value === data.id_jenis_kendaraan)?.label ?? 'Semua jenis'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{editing ? 'Ubah Interval Perawatan' : 'Detail Interval Perawatan'}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Satu interval per kombinasi jenis perawatan &amp; jenis kendaraan</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{namaJenisPerawatan}</p>
                                <p className="text-sm text-gray-500 mt-0.5">{namaJenisKendaraan}</p>
                            </div>
                            <Tooltip title="Edit">
                                <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)} />
                            </Tooltip>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Interval Kilometer</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
                                    {data.interval_km != null ? `${formatNum(data.interval_km)} km` : '—'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Interval Hari</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1">
                                    {data.interval_hari != null ? `${formatNum(data.interval_hari)} hari` : '—'}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="default" icon={<HiArrowLeft />}
                                onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN)}>Batal</Button>
                        </div>
                    </>
                ) : (
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
                            <FormItem label="Interval Kilometer" asterisk invalid={!!errors.interval_km} errorMessage={errors.interval_km}
                                extra={<span className="text-xs text-gray-400">Warning muncul saat odometer armada mendekati km jatuh tempo (sisa ≤ 10% interval)</span>}>
                                <Input type="number" step="1" min="1" suffix="km" placeholder="Contoh: 10000"
                                    value={form.interval_km}
                                    invalid={!!errors.interval_km}
                                    onChange={e => set('interval_km', e.target.value.replace(/\D/g, ''))} />
                            </FormItem>
                            <FormItem label="Interval Hari (opsional)"
                                extra={<span className="text-xs text-gray-400">Isi bila jenis perawatan ini juga punya batas waktu (contoh: servis berkala 6 bulanan)</span>}>
                                <Input type="number" step="1" min="1" suffix="hari" placeholder="Contoh: 180"
                                    value={form.interval_hari}
                                    onChange={e => set('interval_hari', e.target.value.replace(/\D/g, ''))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={batalEdit}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan Perubahan</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    )
}
