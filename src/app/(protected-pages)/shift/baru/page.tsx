'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { shiftService } from '@/services/shift.service'

export default function ShiftBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama: '', jam_mulai: '', jam_selesai: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama.trim()) e.nama = 'Nama Shift wajib diisi'
        if (!form.jam_mulai) e.jam_mulai = 'Jam Mulai wajib diisi'
        if (!form.jam_selesai) e.jam_selesai = 'Jam Selesai wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await shiftService.create({
                nama: form.nama,
                jam_mulai: form.jam_mulai,
                jam_selesai: form.jam_selesai,
            })
            toast.push(<Notification type="success" title="Shift berhasil ditambahkan" />)
            router.push(ROUTES.SHIFT)
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
                    <h3 className="font-bold">Tambah Shift</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan shift supir baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div className="sm:col-span-2">
                        <FormItem label="Nama Shift" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                            <Input placeholder="Contoh: Shift Pagi, Shift Malam" value={form.nama} invalid={!!errors.nama}
                                onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                        </FormItem>
                    </div>
                    <FormItem label="Jam Mulai" asterisk invalid={!!errors.jam_mulai} errorMessage={errors.jam_mulai}>
                        <Input type="time" value={form.jam_mulai} invalid={!!errors.jam_mulai}
                            onChange={e => setForm(p => ({ ...p, jam_mulai: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jam Selesai" asterisk invalid={!!errors.jam_selesai} errorMessage={errors.jam_selesai}>
                        <Input type="time" value={form.jam_selesai} invalid={!!errors.jam_selesai}
                            onChange={e => setForm(p => ({ ...p, jam_selesai: e.target.value }))} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <p className="text-xs text-gray-400 -mt-1">Jam selesai lebih kecil dari jam mulai = shift berakhir keesokan hari</p>
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
