'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { perusahaanGrupService } from '@/services/perusahaan-grup.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function PerusahaanGrupBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ singkatan: '', nama_lengkap: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.singkatan.trim()) e.singkatan = 'Singkatan wajib diisi'
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
            await perusahaanGrupService.create({
                singkatan:    form.singkatan.trim(),
                nama_lengkap: form.nama_lengkap.trim() || null,
                aktif:        form.aktif,
            })
            toast.push(<Notification type="success" title="Perusahaan grup berhasil ditambahkan" />)
            router.push(ROUTES.PERUSAHAAN_GRUP)
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
                    <h3 className="font-bold">Tambah Perusahaan Grup</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan perusahaan dalam grup, mis. TMN atau SULITA</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Singkatan" asterisk invalid={!!errors.singkatan} errorMessage={errors.singkatan}
                        extra={<span className="text-xs text-gray-400">Ditampilkan di daftar armada & dipakai di import Excel</span>}>
                        <Input placeholder="Mis. SULITA" value={form.singkatan} invalid={!!errors.singkatan} maxLength={30}
                            onChange={e => setForm(p => ({ ...p, singkatan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Lengkap">
                        <Input placeholder="Mis. PT Sulita Logistik Indonesia" value={form.nama_lengkap} maxLength={150}
                            onChange={e => setForm(p => ({ ...p, nama_lengkap: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
                    </FormItem>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={() => router.back()}>Kembali</Button>
                    <Button type="submit" variant="solid" loading={loading}>Simpan</Button>
                </div>
                </form>
            </Card>
        </div>
    )
}
