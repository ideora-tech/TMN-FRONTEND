'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { permintaanVendorService, UnitDimintaPayload } from '@/services/permintaan-vendor.service'
import { projectService } from '@/services/project.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'All In' },
]

type UnitRow = { id_jenis_kendaraan: string; jumlah_unit: string }
const emptyUnitRow = (): UnitRow => ({ id_jenis_kendaraan: '', jumlah_unit: '1' })

export default function PermintaanVendorBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        id_proyek: '',
        mekanisme: 'unit_only', periode_dari: '', periode_sampai: '', catatan: '',
    })
    const [unitRows, setUnitRows] = useState<UnitRow[]>([emptyUnitRow()])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [proyekOptions, setProyekOptions] = useState<{ value: string; label: string }[]>([])
    const [jenisOptions, setJenisOptions]   = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        projectService.list(1, 200)
            .then(res => setProyekOptions(res.data.map(p => ({ value: p.id_proyek, label: p.nama_proyek }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
    }, [])

    const ubahUnitRow = (i: number, patch: Partial<UnitRow>) =>
        setUnitRows(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)))
    const hapusUnitRow = (i: number) =>
        setUnitRows(prev => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.mekanisme) e.mekanisme = 'Mekanisme wajib dipilih'
        const jenisTerpakai = new Set<string>()
        unitRows.forEach((row, i) => {
            if (!row.jumlah_unit || Number(row.jumlah_unit) < 1) e[`unit_${i}_jumlah`] = 'Jumlah unit minimal 1'
            const key = row.id_jenis_kendaraan || '__kosong__'
            if (jenisTerpakai.has(key)) e.unit = 'Jenis kendaraan tidak boleh sama dengan baris lain (termasuk sama-sama kosong)'
            jenisTerpakai.add(key)
        })
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        setLoading(true)
        try {
            const unit: UnitDimintaPayload[] = unitRows.map(row => ({
                id_jenis_kendaraan: row.id_jenis_kendaraan || null,
                jumlah_unit: Number(row.jumlah_unit),
            }))
            const dibuat = await permintaanVendorService.create({
                id_proyek: form.id_proyek || null,
                unit,
                mekanisme: form.mekanisme,
                periode_dari: form.periode_dari || null,
                periode_sampai: form.periode_sampai || null,
                catatan: form.catatan.trim() || null,
            })
            toast.push(<Notification type="success" title="Permintaan tersimpan sebagai draft — ajukan approval dari halaman detail" />)
            router.push(ROUTES.PERMINTAAN_VENDOR_DETAIL(dibuat.id_permintaan))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Permintaan Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Ajukan kebutuhan unit dari vendor untuk disetujui manajemen</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Proyek (opsional)">
                        <Select isSearchable isClearable placeholder="Pilih proyek..."
                            options={proyekOptions}
                            value={proyekOptions.find(o => o.value === form.id_proyek) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_proyek: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Mekanisme" asterisk invalid={!!errors.mekanisme} errorMessage={errors.mekanisme}>
                        <Select isSearchable={false} options={MEKANISME_OPTIONS}
                            value={MEKANISME_OPTIONS.find(o => o.value === form.mekanisme) ?? null}
                            onChange={opt => setForm(p => ({ ...p, mekanisme: opt?.value ?? 'unit_only' }))} />
                    </FormItem>
                    <FormItem label="Unit Diminta" asterisk className="sm:col-span-2" invalid={!!errors.unit} errorMessage={errors.unit}>
                        <div className="flex flex-col gap-2">
                            {unitRows.map((row, i) => {
                                const opsiJenis = jenisOptions.filter(o =>
                                    o.value === row.id_jenis_kendaraan ||
                                    !unitRows.some((r, idx) => idx !== i && r.id_jenis_kendaraan === o.value))
                                return (
                                    <div key={i} className="flex items-start gap-2">
                                        <div className="flex-1">
                                            <Select isSearchable isClearable placeholder="Jenis kendaraan (opsional)..."
                                                options={opsiJenis}
                                                value={opsiJenis.find(o => o.value === row.id_jenis_kendaraan) ?? null}
                                                onChange={opt => ubahUnitRow(i, { id_jenis_kendaraan: opt?.value ?? '' })} />
                                        </div>
                                        <div className="w-28 flex-shrink-0">
                                            <Input suffix="unit" placeholder="1" value={row.jumlah_unit} invalid={!!errors[`unit_${i}_jumlah`]}
                                                onChange={e => ubahUnitRow(i, { jumlah_unit: e.target.value.replace(/\D/g, '') })} />
                                            {errors[`unit_${i}_jumlah`] && <p className="text-red-500 text-xs mt-1">{errors[`unit_${i}_jumlah`]}</p>}
                                        </div>
                                        <button type="button" disabled={unitRows.length <= 1} onClick={() => hapusUnitRow(i)}
                                            className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed dark:bg-red-500/20 dark:text-red-400 transition-colors flex-shrink-0">
                                            <HiOutlineTrash />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                        <button type="button" onClick={() => setUnitRows(prev => [...prev, emptyUnitRow()])}
                            className="mt-2 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium">
                            <HiOutlinePlus /> Tambah Jenis
                        </button>
                    </FormItem>
                    <FormItem label="Periode (opsional)" className="sm:col-span-2">
                        <DatePicker.DatePickerRange
                            placeholder="Pilih rentang periode kebutuhan..."
                            value={[
                                form.periode_dari ? dayjs(form.periode_dari).toDate() : null,
                                form.periode_sampai ? dayjs(form.periode_sampai).toDate() : null,
                            ]}
                            onChange={([awal, akhir]) => setForm(p => ({
                                ...p,
                                periode_dari: awal ? dayjs(awal).format('YYYY-MM-DD') : '',
                                periode_sampai: akhir ? dayjs(akhir).format('YYYY-MM-DD') : '',
                            }))} />
                    </FormItem>
                    <FormItem label="Catatan" className="sm:col-span-2">
                        <Input textArea rows={3} placeholder="Kebutuhan khusus, spesifikasi unit, dsb. (opsional)"
                            value={form.catatan}
                            onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
                </form>
            </Card>
        </div>
    )
}
