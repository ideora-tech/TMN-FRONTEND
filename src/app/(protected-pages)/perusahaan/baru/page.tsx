'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { perusahaanService } from '@/services/perusahaan.service'

export default function PerusahaanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama: '', email: '', telepon: '', alamat: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nama.trim()) e.nama = 'Nama perusahaan wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await perusahaanService.create({
                nama:         form.nama,
                email:        form.email || null,
                telepon:      form.telepon || null,
                alamat:       form.alamat || null,
                id_zona:      null,
                id_mata_uang: null,
            })
            toast.push(<Notification type="success" title="Perusahaan berhasil ditambahkan" />)
            router.push(ROUTES.PERUSAHAAN)
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
                    <h3 className="font-bold">Tambah Perusahaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan perusahaan baru ke sistem</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div className="sm:col-span-2">
                        <FormItem label="Nama Perusahaan" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                            <Input placeholder="Nama lengkap perusahaan" value={form.nama} invalid={!!errors.nama}
                                onChange={(e) => setForm(p => ({ ...p, nama: e.target.value }))} />
                        </FormItem>
                    </div>
                    <FormItem label="Email">
                        <Input type="email" placeholder="email@perusahaan.com" value={form.email}
                            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input placeholder="Nomor telepon" value={form.telepon}
                            onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Alamat">
                            <textarea rows={3} value={form.alamat}
                                onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                                placeholder="Alamat lengkap perusahaan"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
                        </FormItem>
                    </div>
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
