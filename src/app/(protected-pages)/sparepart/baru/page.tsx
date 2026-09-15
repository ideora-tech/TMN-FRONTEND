'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { sparepartService, SATUAN_SPAREPART_OPTIONS, SatuanSparepart } from '@/services/sparepart.service'
import { kategoriSparepartService, KategoriSparepart } from '@/services/kategoriSparepart.service'

type SatuanOption = { value: SatuanSparepart; label: string }

const TAHUN_SEKARANG = new Date().getFullYear()
const tahunValid = (t: string) => /^\d{4}$/.test(t) && Number(t) >= 1900 && Number(t) <= TAHUN_SEKARANG + 1

export default function SparepartBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        kode: '', nama: '', serial_number: '', merek: '', tahun: '',
        id_kategori_sparepart: '', satuan: 'pcs' as SatuanSparepart, harga_standar: '',
    })
    const [kategoriOptions, setKategoriOptions] = useState<{ value: string; label: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        kategoriSparepartService.list(1, 100)
            .then(res => setKategoriOptions(res.data.filter(k => k.aktif).map((k: KategoriSparepart) => ({ value: k.id_kategori_sparepart, label: k.nama }))))
            .catch(() => {})
    }, [])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.kode.trim()) e.kode = 'Kode wajib diisi'
        if (!form.nama.trim()) e.nama = 'Nama wajib diisi'
        if (!form.serial_number.trim()) e.serial_number = 'Serial number wajib diisi'
        if (form.tahun && !tahunValid(form.tahun)) e.tahun = 'Tahun tidak valid'
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
            await sparepartService.create({
                kode: form.kode,
                nama: form.nama,
                serial_number: form.serial_number.trim(),
                merek: form.merek.trim() || null,
                tahun: form.tahun ? Number(form.tahun) : null,
                id_kategori_sparepart: form.id_kategori_sparepart || null,
                satuan: form.satuan || 'pcs',
                harga_standar: form.harga_standar ? Number(form.harga_standar) : 0,
            })
            toast.push(<Notification type="success" title="Spare part berhasil ditambahkan" />)
            router.push(ROUTES.SPAREPART)
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
                    <h3 className="font-bold">Tambah Spare Part</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan spare part baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode" asterisk invalid={!!errors.kode} errorMessage={errors.kode}>
                        <Input placeholder="Kode unik" value={form.kode} invalid={!!errors.kode}
                            onChange={e => setForm(p => ({ ...p, kode: e.target.value.toUpperCase() }))} />
                    </FormItem>
                    <FormItem label="Nama" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                        <Input placeholder="Nama spare part" value={form.nama} invalid={!!errors.nama}
                            onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Serial Number" asterisk invalid={!!errors.serial_number} errorMessage={errors.serial_number}>
                        <Input placeholder="Nomor seri / part number" value={form.serial_number} invalid={!!errors.serial_number}
                            onChange={e => setForm(p => ({ ...p, serial_number: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Merek">
                        <Input placeholder="Merek spare part" value={form.merek}
                            onChange={e => setForm(p => ({ ...p, merek: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tahun" invalid={!!errors.tahun} errorMessage={errors.tahun}>
                        <Input placeholder={String(TAHUN_SEKARANG)} inputMode="numeric" maxLength={4}
                            value={form.tahun} invalid={!!errors.tahun}
                            onChange={e => setForm(p => ({ ...p, tahun: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                    </FormItem>
                    <FormItem label="Kategori">
                        <Select isSearchable isClearable placeholder="Pilih kategori (opsional)..."
                            options={kategoriOptions}
                            value={kategoriOptions.find(o => o.value === form.id_kategori_sparepart) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_kategori_sparepart: (opt as { value: string } | null)?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Satuan" asterisk>
                        <Select<SatuanOption> isSearchable={false}
                            options={SATUAN_SPAREPART_OPTIONS}
                            value={SATUAN_SPAREPART_OPTIONS.find(o => o.value === form.satuan) ?? SATUAN_SPAREPART_OPTIONS[0]}
                            onChange={opt => opt && setForm(p => ({ ...p, satuan: (opt as SatuanOption).value }))} />
                    </FormItem>
                    <FormItem label="Harga Standar (Rp)">
                        <Input prefix="Rp" placeholder="0"
                            value={form.harga_standar ? formatNum(Number(form.harga_standar)) : ''}
                            onChange={e => setForm(p => ({ ...p, harga_standar: e.target.value.replace(/\D/g, '') }))} />
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
