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
    const [form, setForm] = useState({ nama_vendor: '', kontak: '', alamat: '', email: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nama_vendor.trim()) e.nama_vendor = 'Nama vendor wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await vendorService.create({
                nama_vendor: form.nama_vendor,
                kontak: form.kontak || undefined,
                alamat: form.alamat || undefined,
                email: form.email || undefined,
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
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Vendor Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan vendor baru ke sistem</p>
                </div>
            </div>
            <Card>
                <div className="flex flex-col gap-1">
                    <FormItem label="Nama Vendor" asterisk invalid={!!errors.nama_vendor} errorMessage={errors.nama_vendor}>
                        <Input placeholder="Nama vendor" value={form.nama_vendor} invalid={!!errors.nama_vendor} onChange={(e) => setForm(p => ({ ...p, nama_vendor: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Kontak">
                        <Input placeholder="No telepon / nama PIC" value={form.kontak} onChange={(e) => setForm(p => ({ ...p, kontak: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Alamat">
                        <textarea
                            rows={2}
                            value={form.alamat}
                            onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                            placeholder="Alamat vendor"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                    </FormItem>
                    <FormItem label="Email">
                        <Input type="email" placeholder="email@vendor.com" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button
                        variant="solid"
                        customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                        loading={loading}
                        onClick={handleSubmit}
                    >
                        Simpan
                    </Button>
                </div>
            </Card>
        </div>
    )
}
