'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { vendorService } from '@/services/vendor.service'

export default function VendorBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_vendor: '', nama_vendor: '', telepon: '', alamat: '', email: '' })
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
                    <FormItem label="Telepon">
                        <Input placeholder="No telepon" value={form.telepon}
                            onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Email">
                        <Input type="email" placeholder="email@vendor.com" value={form.email}
                            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
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
