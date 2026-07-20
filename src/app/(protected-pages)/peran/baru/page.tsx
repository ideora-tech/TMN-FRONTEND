'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { peranService } from '@/services/peran.service'

const AKTIF_OPTIONS    = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]
const PLATFORM_OPTIONS = [{ value: 'false', label: 'Perusahaan' }, { value: 'true', label: 'Platform' }]

export default function PeranBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode_peran: '', nama_peran: '', is_platform: false, aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.kode_peran.trim()) e.kode_peran = 'Kode wajib diisi'
        if (!form.nama_peran.trim()) e.nama_peran = 'Nama wajib diisi'
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
            await peranService.create({
                id_perusahaan: null,
                kode_peran: form.kode_peran,
                nama_peran: form.nama_peran,
                is_platform: form.is_platform,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Peran berhasil ditambahkan" />)
            router.push(ROUTES.PERAN)
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
                    <h3 className="font-bold">Tambah Peran</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan peran baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode Peran" asterisk invalid={!!errors.kode_peran} errorMessage={errors.kode_peran}>
                        <Input placeholder="Kode unik peran" value={form.kode_peran} invalid={!!errors.kode_peran}
                            onChange={e => setForm(p => ({ ...p, kode_peran: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Peran" asterisk invalid={!!errors.nama_peran} errorMessage={errors.nama_peran}>
                        <Input placeholder="Nama peran" value={form.nama_peran} invalid={!!errors.nama_peran}
                            onChange={e => setForm(p => ({ ...p, nama_peran: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tipe">
                        <Select isSearchable={false} options={PLATFORM_OPTIONS}
                            value={PLATFORM_OPTIONS.find(o => o.value === String(form.is_platform)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, is_platform: opt?.value === 'true' }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
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
