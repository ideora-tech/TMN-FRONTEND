'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft, HiOutlineTruck } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { armadaService } from '@/services/armada.service'
import { jenisKendaraanService } from '@/services/jenis-kendaraan.service'
import { permintaanPembelianService } from '@/services/permintaanPembelian.service'

type SumberPr = { id_permintaan: string; id_item: string; nomor_permintaan: string; nama_item: string; qty: number; qty_diterima: number }

type Status = 'tersedia' | 'digunakan' | 'perawatan' | 'tidak_aktif'

const STATUS_OPTIONS = [
    { value: 'tersedia',    label: 'Tersedia' },
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
    const searchParams = useSearchParams()
    const idPermintaanParam = searchParams.get('id_permintaan')
    const idItemParam = searchParams.get('id_item')
    const [sumberPr, setSumberPr] = useState<SumberPr | null>(null)
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

    useEffect(() => {
        if (!idPermintaanParam || !idItemParam) return
        let aktif = true
        permintaanPembelianService.get(idPermintaanParam)
            .then(pr => {
                if (!aktif) return
                const item = pr.items.find(i => i.id_item === idItemParam)
                if (!item || pr.tipe !== 'aset') {
                    toast.push(<Notification type="danger" title="Item unit pada permintaan pembelian tidak ditemukan" />)
                    return
                }
                if (pr.status !== 'dibeli') {
                    toast.push(<Notification type="danger" title="PR belum atau tidak lagi berstatus dibeli, unit tidak bisa ditautkan" />)
                    return
                }
                if ((item.qty_diterima ?? 0) >= item.qty) {
                    toast.push(<Notification type="danger" title="Semua unit item ini sudah terdaftar" />)
                    return
                }
                setSumberPr({ id_permintaan: pr.id_permintaan, id_item: item.id_item, nomor_permintaan: pr.nomor_permintaan, nama_item: item.nama_item, qty: item.qty, qty_diterima: item.qty_diterima ?? 0 })
                setForm(p => ({
                    ...p,
                    id_jenis_kendaraan: item.id_jenis_kendaraan ?? p.id_jenis_kendaraan,
                    merk:               item.merk ?? p.merk,
                    model:              item.model ?? p.model,
                    tahun:              item.tahun ? String(item.tahun) : p.tahun,
                    harga_beli:         item.harga_aktual !== null && item.harga_aktual !== undefined ? String(Math.round(item.harga_aktual)) : p.harga_beli,
                    tanggal_beli:       pr.tanggal_pembelian ?? p.tanggal_beli,
                    kondisi_beli:       'baru',
                }))
            })
            .catch(err => { if (aktif) toast.push(<Notification type="danger" title={parseApiError(err)} />) })
        return () => { aktif = false }
    }, [idPermintaanParam, idItemParam])

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nopol.trim()) e.nopol = 'Nopol wajib diisi'
        if (!form.merk.trim())  e.merk  = 'Merk wajib diisi'
        if (!form.tahun)        e.tahun = 'Tahun wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
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
                id_permintaan_pembelian_item: sumberPr?.id_item,
            }, foto)
            toast.push(<Notification type="success" title={sumberPr ? `Unit terdaftar dan tercatat diterima pada PR ${sumberPr.nomor_permintaan}` : 'Armada berhasil ditambahkan'} />)
            router.push(sumberPr ? `${ROUTES.PERMINTAAN_PEMBELIAN}?detail=${sumberPr.id_permintaan}` : ROUTES.ARMADA)
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
                    <p className="text-gray-500 text-sm mt-0.5">{sumberPr ? 'Daftarkan unit hasil pengadaan ke master Armada' : 'Daftarkan armada baru ke sistem'}</p>
                </div>
            </div>
            {sumberPr && (
                <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                    <HiOutlineTruck className="text-lg flex-shrink-0" />
                    <span>Dari <strong className="font-mono">{sumberPr.nomor_permintaan}</strong> · {sumberPr.nama_item} · unit {formatNum(sumberPr.qty_diterima + 1)} dari {formatNum(sumberPr.qty)}</span>
                </div>
            )}
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
                    <FormItem label="Tanggal Beli"
                        extra={<span className="text-xs text-gray-400">Dipakai sebagai titik mulai jadwal servis pertama bila unit belum punya riwayat perawatan</span>}>
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
                        <UploadBerkas
                            file={foto}
                            accept=".jpg,.jpeg,.png,.webp"
                            label="Pilih foto"
                            hint="JPG/PNG/WEBP · maksimal 5 MB"
                            onChange={setFoto}
                        />
                    </FormItem>
                    <FormItem label="Keterangan">
                        <Input textArea placeholder="Catatan tambahan..." value={form.keterangan}
                            onChange={(e) => setForm(p => ({ ...p, keterangan: e.target.value }))} />
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
