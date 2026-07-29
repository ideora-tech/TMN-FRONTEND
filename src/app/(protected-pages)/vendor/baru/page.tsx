'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { vendorService } from '@/services/vendor.service'

const JENIS_VENDOR_OPTIONS = [
    { value: 'Transporter',       label: 'Transporter' },
    { value: 'Supplier',          label: 'Supplier' },
    { value: 'Freight Forwarder', label: 'Freight Forwarder' },
    { value: 'Ekspedisi',         label: 'Ekspedisi' },
    { value: 'Lainnya',           label: 'Lainnya' },
]

export default function VendorBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_vendor: '', nama_vendor: '', telepon: '', alamat: '', email: '', jenis_vendor: '', pic_nama: '', npwp: '', tanggal_bergabung: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.kode_vendor.trim()) e.kode_vendor = 'Kode vendor wajib diisi'
        if (!form.nama_vendor.trim()) e.nama_vendor = 'Nama vendor wajib diisi'
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
            await vendorService.create({
                kode_vendor: form.kode_vendor,
                nama_vendor: form.nama_vendor,
                telepon: form.telepon || undefined,
                alamat: form.alamat || undefined,
                email: form.email || undefined,
                jenis_vendor: form.jenis_vendor || undefined,
                pic_nama: form.pic_nama || undefined,
                npwp: form.npwp || undefined,
                tanggal_bergabung: form.tanggal_bergabung || undefined,
                aktif: true,
            })
            toast.push(<Notification type="success" title="Vendor berhasil ditambahkan" />)
            router.push(ROUTES.VENDOR)
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
                    <h3 className="font-bold">Tambah Vendor Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan vendor baru ke sistem</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode Vendor" asterisk invalid={!!errors.kode_vendor} errorMessage={errors.kode_vendor}>
                        <Input placeholder="Contoh: VN-001" value={form.kode_vendor} invalid={!!errors.kode_vendor}
                            onChange={(e) => setForm(p => ({ ...p, kode_vendor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Vendor" asterisk invalid={!!errors.nama_vendor} errorMessage={errors.nama_vendor}>
                        <Input placeholder="Nama vendor" value={form.nama_vendor} invalid={!!errors.nama_vendor}
                            onChange={(e) => setForm(p => ({ ...p, nama_vendor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jenis Vendor">
                        <Select isSearchable={false} isClearable placeholder="Pilih jenis vendor..."
                            options={JENIS_VENDOR_OPTIONS}
                            value={JENIS_VENDOR_OPTIONS.find(o => o.value === form.jenis_vendor) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, jenis_vendor: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nama PIC">
                        <Input placeholder="Nama penanggung jawab" value={form.pic_nama}
                            onChange={(e) => setForm(p => ({ ...p, pic_nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input placeholder="No telepon" value={form.telepon}
                            onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Email">
                        <Input type="email" placeholder="email@vendor.com" value={form.email}
                            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                    </FormItem>
                    <FormItem label="NPWP">
                        <Input placeholder="Contoh: 01.234.567.8-901.000" value={form.npwp}
                            onChange={(e) => setForm(p => ({ ...p, npwp: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tanggal Bergabung">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_bergabung ? new Date(form.tanggal_bergabung) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_bergabung: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Alamat">
                            <textarea rows={2} value={form.alamat}
                                onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                                placeholder="Alamat vendor"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
                        </FormItem>
                    </div>
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
