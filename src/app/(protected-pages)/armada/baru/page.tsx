'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePhotograph } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { armadaService } from '@/services/armada.service'
import { jenisKendaraanService } from '@/services/jenis-kendaraan.service'

type Status = 'tersedia' | 'digunakan' | 'perawatan' | 'tidak_aktif'

const STATUS_OPTIONS = [
    { value: 'tersedia',    label: 'Tersedia' },
    { value: 'digunakan',   label: 'Digunakan' },
    { value: 'perawatan',   label: 'Perawatan' },
    { value: 'tidak_aktif', label: 'Tidak Aktif' },
]

const BAHAN_BAKAR_OPTIONS = [
    { value: 'solar',   label: 'Solar' },
    { value: 'bensin',  label: 'Bensin' },
    { value: 'gas',     label: 'Gas' },
    { value: 'listrik', label: 'Listrik' },
    { value: 'hybrid',  label: 'Hybrid' },
]

const KONDISI_BELI_OPTIONS = [
    { value: 'baru',  label: 'Baru' },
    { value: 'bekas', label: 'Bekas' },
]

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="sm:col-span-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-3 mb-1">
        {children}
    </p>
)

export default function ArmadaBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        nopol: '', merk: '', model: '',
        tahun: new Date().getFullYear().toString(),
        status: 'tersedia' as Status,
        id_jenis_kendaraan: '',
        warna: '', nomor_rangka: '', nomor_mesin: '',
        jenis_bahan_bakar: '', kapasitas_muatan_kg: '',
        tanggal_beli: '', harga_beli: '', kondisi_beli: '',
        keterangan: '',
    })
    const [foto, setFoto] = useState<File | null>(null)
    const [jenisOptions, setJenisOptions] = useState<{ value: string; label: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    useEffect(() => {
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptions(res.data.filter(j => j.aktif).map(j => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => setJenisOptions([]))
    }, [])

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
            await armadaService.create({
                nopol:               form.nopol,
                merk:                form.merk,
                model:               form.model || undefined,
                tahun:               Number(form.tahun),
                status:              form.status,
                id_jenis_kendaraan:  form.id_jenis_kendaraan || undefined,
                nomor_rangka:        form.nomor_rangka || undefined,
                nomor_mesin:         form.nomor_mesin || undefined,
                warna:               form.warna || undefined,
                jenis_bahan_bakar:   form.jenis_bahan_bakar || undefined,
                kapasitas_muatan_kg: form.kapasitas_muatan_kg ? Number(form.kapasitas_muatan_kg) : undefined,
                tanggal_beli:        form.tanggal_beli || undefined,
                harga_beli:          form.harga_beli ? Number(form.harga_beli) : undefined,
                kondisi_beli:        form.kondisi_beli || undefined,
                keterangan:          form.keterangan || undefined,
            }, foto)
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
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Armada Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan armada baru ke sistem</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <SectionTitle>Identitas Kendaraan</SectionTitle>
                    <FormItem label="Nopol" asterisk invalid={!!errors.nopol} errorMessage={errors.nopol}>
                        <Input placeholder="Contoh: B 1234 XYZ" value={form.nopol} invalid={!!errors.nopol}
                            onChange={(e) => setForm(p => ({ ...p, nopol: e.target.value.toUpperCase() }))} />
                    </FormItem>
                    <FormItem label="Merk" asterisk invalid={!!errors.merk} errorMessage={errors.merk}>
                        <Input placeholder="Contoh: Toyota" value={form.merk} invalid={!!errors.merk}
                            onChange={(e) => setForm(p => ({ ...p, merk: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Model">
                        <Input placeholder="Contoh: Kijang Innova" value={form.model}
                            onChange={(e) => setForm(p => ({ ...p, model: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tahun" asterisk invalid={!!errors.tahun} errorMessage={errors.tahun}>
                        <Input type="number" placeholder="Contoh: 2022" value={form.tahun} invalid={!!errors.tahun}
                            min={1990} max={2100} onChange={(e) => setForm(p => ({ ...p, tahun: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Warna">
                        <Input placeholder="Contoh: Putih" value={form.warna}
                            onChange={(e) => setForm(p => ({ ...p, warna: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jenis Kendaraan">
                        <Select placeholder="Pilih jenis kendaraan..."
                            value={jenisOptions.find(o => o.value === form.id_jenis_kendaraan) ?? null}
                            options={jenisOptions}
                            onChange={(option) => setForm(p => ({ ...p, id_jenis_kendaraan: option?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false}
                            value={STATUS_OPTIONS.find(o => o.value === form.status) ?? null}
                            options={STATUS_OPTIONS}
                            onChange={(option) => option && setForm(p => ({ ...p, status: option.value as Status }))} />
                    </FormItem>
                    <FormItem label="Nomor Rangka">
                        <Input placeholder="Contoh: MHFXW42G5N0000001" value={form.nomor_rangka}
                            onChange={(e) => setForm(p => ({ ...p, nomor_rangka: e.target.value.toUpperCase() }))} />
                    </FormItem>
                    <FormItem label="Nomor Mesin">
                        <Input placeholder="Contoh: 1TR-1234567" value={form.nomor_mesin}
                            onChange={(e) => setForm(p => ({ ...p, nomor_mesin: e.target.value.toUpperCase() }))} />
                    </FormItem>

                    <SectionTitle>Spesifikasi</SectionTitle>
                    <FormItem label="Jenis Bahan Bakar">
                        <Select isSearchable={false} placeholder="Pilih bahan bakar..."
                            value={BAHAN_BAKAR_OPTIONS.find(o => o.value === form.jenis_bahan_bakar) ?? null}
                            options={BAHAN_BAKAR_OPTIONS}
                            onChange={(option) => setForm(p => ({ ...p, jenis_bahan_bakar: option?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Kapasitas Muatan">
                        <Input suffix="kg" placeholder="0"
                            value={form.kapasitas_muatan_kg}
                            onChange={(e) => setForm(p => ({ ...p, kapasitas_muatan_kg: e.target.value.replace(/\D/g, '') }))} />
                    </FormItem>

                    <SectionTitle>Pembelian</SectionTitle>
                    <FormItem label="Tanggal Beli">
                        <DatePicker
                            value={form.tanggal_beli ? new Date(form.tanggal_beli) : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_beli: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Harga Beli">
                        <Input prefix="Rp" placeholder="0"
                            value={form.harga_beli ? formatNum(Number(form.harga_beli)) : ''}
                            onChange={(e) => setForm(p => ({ ...p, harga_beli: e.target.value.replace(/\D/g, '') }))} />
                    </FormItem>
                    <FormItem label="Kondisi Saat Beli">
                        <Select isSearchable={false} placeholder="Pilih kondisi..."
                            value={KONDISI_BELI_OPTIONS.find(o => o.value === form.kondisi_beli) ?? null}
                            options={KONDISI_BELI_OPTIONS}
                            onChange={(option) => setForm(p => ({ ...p, kondisi_beli: option?.value ?? '' }))} />
                    </FormItem>

                    <SectionTitle>Lainnya</SectionTitle>
                    <FormItem label="Foto Armada">
                        <Upload accept=".jpg,.jpeg,.png,.webp" showList={false} uploadLimit={1}
                            onChange={files => setFoto(files[0] ?? null)}>
                            <Button type="button" variant="default" size="sm" icon={<HiOutlinePhotograph />}>
                                {foto ? foto.name : 'Pilih foto (JPG/PNG/WEBP, maks 5 MB)'}
                            </Button>
                        </Upload>
                        {foto && (
                            <button type="button" className="text-xs text-red-400 hover:text-red-600 mt-1.5 block"
                                onClick={() => setFoto(null)}>Hapus pilihan</button>
                        )}
                    </FormItem>
                    <FormItem label="Keterangan">
                        <Input textArea placeholder="Catatan tambahan..." value={form.keterangan}
                            onChange={(e) => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
            </form>
            </Card>
        </div>
    )
}
