'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { intervalPerawatanService, IntervalPerawatanSparepartInput } from '@/services/intervalPerawatan.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'

interface FormState {
    id_jenis_kendaraan: string
    interval_km: string
    interval_bulan: string
}

type Option = { value: string; label: string }
type SparepartRow = { id_sparepart: string; qty_standar: string }

const INIT: FormState = { id_jenis_kendaraan: '', interval_km: '', interval_bulan: '' }
const MAKS_SPAREPART = 30
const emptySparepartRow = (): SparepartRow => ({ id_sparepart: '', qty_standar: '1' })

export default function IntervalPerawatanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState<FormState>(INIT)
    const [sparepartRows, setSparepartRows] = useState<SparepartRow[]>([])
    const [saving, setSaving] = useState(false)
    const [jenisKendaraanOptions, setJenisKendaraanOptions] = useState<Option[]>([])
    const [sparepartList, setSparepartList] = useState<Sparepart[]>([])
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
    const [intervalError, setIntervalError] = useState('')
    const [sparepartError, setSparepartError] = useState('')

    useEffect(() => {
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisKendaraanOptions(res.data.filter((j: JenisKendaraan) => j.aktif).map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        sparepartService.list({ page: 1, limit: 200 })
            .then(res => setSparepartList(res.data.filter(s => s.aktif)))
            .catch(() => {})
    }, [])

    const set = (field: keyof FormState, value: string) =>
        setForm(p => ({ ...p, [field]: value }))

    const sparepartOptions: Option[] = sparepartList.map(s => ({ value: s.id_sparepart, label: `${s.nama} (${s.satuan})` }))

    const ubahSparepartRow = (i: number, patch: Partial<SparepartRow>) =>
        setSparepartRows(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
    const tambahSparepartRow = () =>
        setSparepartRows(prev => (prev.length >= MAKS_SPAREPART ? prev : [...prev, emptySparepartRow()]))
    const hapusSparepartRow = (i: number) =>
        setSparepartRows(prev => prev.filter((_, idx) => idx !== i))

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.id_jenis_kendaraan) e.id_jenis_kendaraan = 'Jenis kendaraan wajib diisi'
        setErrors(e)

        let intervalMsg = ''
        if (!form.interval_km && !form.interval_bulan) {
            intervalMsg = 'Isi minimal interval kilometer atau interval bulan'
        } else {
            if (form.interval_km && parseInt(form.interval_km) <= 0) intervalMsg = 'Interval kilometer harus lebih dari 0'
            if (form.interval_bulan && parseInt(form.interval_bulan) <= 0) intervalMsg = 'Interval bulan harus lebih dari 0'
        }
        setIntervalError(intervalMsg)

        let sparepartMsg = ''
        if (sparepartRows.some(r => !r.id_sparepart || !r.qty_standar || parseInt(r.qty_standar) <= 0)) {
            sparepartMsg = 'Lengkapi spare part dan qty standar tiap baris (atau hapus baris kosong)'
        }
        setSparepartError(sparepartMsg)

        return Object.keys(e).length === 0 && intervalMsg === '' && sparepartMsg === ''
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
            const sparepart: IntervalPerawatanSparepartInput[] = sparepartRows.map(r => ({
                id_sparepart: r.id_sparepart,
                qty_standar: parseInt(r.qty_standar),
            }))
            await intervalPerawatanService.create({
                id_jenis_kendaraan: form.id_jenis_kendaraan,
                interval_km: form.interval_km ? parseInt(form.interval_km) : null,
                interval_bulan: form.interval_bulan ? parseInt(form.interval_bulan) : null,
                sparepart,
            })
            toast.push(<Notification type="success" title="Paket servis berhasil ditambahkan" />)
            router.push(ROUTES.INTERVAL_PERAWATAN)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Tambah Paket Servis</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Paket servis rutin (interval km/bulan + sparepart) untuk satu jenis kendaraan</p>
                </div>
            </div>
            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Jenis Kendaraan" asterisk className="sm:col-span-2" invalid={!!errors.id_jenis_kendaraan} errorMessage={errors.id_jenis_kendaraan}>
                            <Select<Option> isSearchable placeholder="Pilih jenis kendaraan..."
                                options={jenisKendaraanOptions}
                                value={jenisKendaraanOptions.find(o => o.value === form.id_jenis_kendaraan) ?? null}
                                onChange={opt => set('id_jenis_kendaraan', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Interval Kilometer (opsional)" invalid={!!intervalError}
                            extra={<span className="text-xs text-gray-400">Warning muncul saat odometer armada mendekati km jatuh tempo (sisa ≤ 10% interval)</span>}>
                            <Input type="number" step="1" min="1" suffix="km" placeholder="Contoh: 10000"
                                value={form.interval_km}
                                invalid={!!intervalError}
                                onChange={e => set('interval_km', e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        <FormItem label="Interval Bulan (opsional)" invalid={!!intervalError}
                            extra={<span className="text-xs text-gray-400">Isi bila paket servis ini juga punya batas waktu (contoh: servis berkala 6 bulanan)</span>}>
                            <Input type="number" step="1" min="1" suffix="bulan" placeholder="Contoh: 6"
                                value={form.interval_bulan}
                                invalid={!!intervalError}
                                onChange={e => set('interval_bulan', e.target.value.replace(/\D/g, ''))} />
                        </FormItem>
                        {intervalError && <p className="text-red-500 text-xs -mt-1 sm:col-span-2">{intervalError}</p>}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Sparepart yang Diganti (opsional)</p>
                        {sparepartRows.length === 0 ? (
                            <p className="text-gray-400 text-xs py-2">Belum ada spare part ditambahkan.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {sparepartRows.map((row, i) => {
                                    const opsiSparepart = sparepartOptions.filter(o =>
                                        o.value === row.id_sparepart ||
                                        !sparepartRows.some((r, idx) => idx !== i && r.id_sparepart === o.value))
                                    return (
                                        <div key={i} className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <Select<Option> isSearchable placeholder="Pilih spare part..."
                                                    options={opsiSparepart}
                                                    value={opsiSparepart.find(o => o.value === row.id_sparepart) ?? null}
                                                    onChange={opt => ubahSparepartRow(i, { id_sparepart: opt?.value ?? '' })} />
                                            </div>
                                            <div className="w-28 flex-shrink-0">
                                                <Input type="number" min="1" suffix="qty" placeholder="1"
                                                    value={row.qty_standar}
                                                    onChange={e => ubahSparepartRow(i, { qty_standar: e.target.value.replace(/\D/g, '') })} />
                                            </div>
                                            <button type="button" onClick={() => hapusSparepartRow(i)}
                                                className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors flex-shrink-0">
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        {sparepartError && <p className="text-red-500 text-xs mt-2">{sparepartError}</p>}
                        <button type="button" disabled={sparepartRows.length >= MAKS_SPAREPART} onClick={tambahSparepartRow}
                            className="mt-2 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                            <HiOutlinePlus /> Tambah Sparepart
                        </button>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan Paket Servis</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
