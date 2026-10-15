'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { komponenUangJalanService } from '@/services/komponenUangJalan.service'

const AKTIF_OPTIONS = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function KomponenUangJalanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama: '', urutan: '', aktif: true })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama.trim()) e.nama = 'Nama komponen wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }
        setLoading(true)
        try {
            await komponenUangJalanService.create({
                nama: form.nama.trim(),
                urutan: Number(form.urutan) || 0,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Komponen uang jalan berhasil ditambahkan" />)
            router.push(ROUTES.KOMPONEN_UANG_JALAN)
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
                    <h3 className="font-bold">Tambah Komponen Uang Jalan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Komponen baru langsung muncul di form tarif rute proyek dan pengajuan Uang Jalan</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Komponen" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                        <Input placeholder="mis. Parkir, Uang Makan, Kuli Bongkar" maxLength={100} value={form.nama} invalid={!!errors.nama}
                            onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Urutan Tampil">
                        <Input placeholder="0" maxLength={3} value={form.urutan}
                            onChange={e => setForm(p => ({ ...p, urutan: e.target.value.replace(/\D/g, '') }))} />
                        <p className="text-xs text-gray-400 mt-1">Angka kecil tampil lebih dulu di form</p>
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
