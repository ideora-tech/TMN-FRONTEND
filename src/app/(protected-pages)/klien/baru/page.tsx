'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { klienService } from '@/services/klien.service'

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function KlienBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        kode_klien: '',
        nama_klien: '',
        email: '',
        telepon: '',
        alamat: '',
        kontak_pic: '',
        aktif: true,
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

    const validate = () => {
        const e: Partial<Record<keyof typeof form, string>> = {}
        if (!form.kode_klien.trim()) e.kode_klien = 'Kode klien wajib diisi'
        if (!form.nama_klien.trim()) e.nama_klien = 'Nama klien wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await klienService.create({
                kode_klien: form.kode_klien,
                nama_klien: form.nama_klien,
                email: form.email || undefined,
                telepon: form.telepon || undefined,
                alamat: form.alamat || undefined,
                kontak_pic: form.kontak_pic || undefined,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Klien berhasil ditambahkan" />)
            router.push(ROUTES.KLIEN)
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
                    <h3 className="font-bold">Tambah Klien Baru</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan klien baru ke sistem</p>
                </div>
            </div>

            <Card>
                <div className="flex flex-col gap-1">
                    <FormItem label="Kode Klien" asterisk invalid={!!errors.kode_klien} errorMessage={errors.kode_klien}>
                        <Input
                            placeholder="Contoh: KL-001"
                            value={form.kode_klien}
                            invalid={!!errors.kode_klien}
                            onChange={(e) => setForm(p => ({ ...p, kode_klien: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Nama Klien" asterisk invalid={!!errors.nama_klien} errorMessage={errors.nama_klien}>
                        <Input
                            placeholder="Nama lengkap klien / perusahaan"
                            value={form.nama_klien}
                            invalid={!!errors.nama_klien}
                            onChange={(e) => setForm(p => ({ ...p, nama_klien: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Email">
                        <Input
                            type="email"
                            placeholder="email@perusahaan.com"
                            value={form.email}
                            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input
                            placeholder="Nomor telepon"
                            value={form.telepon}
                            onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Alamat">
                        <textarea
                            rows={3}
                            value={form.alamat}
                            onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                            placeholder="Alamat lengkap"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                        />
                    </FormItem>
                    <FormItem label="Kontak PIC">
                        <Input
                            placeholder="Nama person in charge"
                            value={form.kontak_pic}
                            onChange={(e) => setForm(p => ({ ...p, kontak_pic: e.target.value }))}
                        />
                    </FormItem>
                    <FormItem label="Status">
                        <Select
                            options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, aktif: opt?.value === '1' }))}
                        />
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
