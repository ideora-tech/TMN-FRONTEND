'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { laporanService } from '@/services/laporan.service'

export default function LaporanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ id_proyek: '', ringkasan: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.id_proyek.trim()) e.id_proyek = 'ID Proyek wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await laporanService.create({ id_proyek: form.id_proyek, ringkasan: form.ringkasan || undefined })
            toast.push(<Notification type="success" title="Laporan berhasil dibuat" />)
            router.push(ROUTES.LAPORAN)
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
                    <h3 className="font-bold">Buat Laporan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat laporan baru untuk proyek</p>
                </div>
            </div>
            <Card>
                <div className="flex flex-col gap-1">
                    <FormItem label="ID Proyek" asterisk invalid={!!errors.id_proyek} errorMessage={errors.id_proyek}>
                        <Input placeholder="Masukkan ID Proyek" value={form.id_proyek} invalid={!!errors.id_proyek} onChange={(e) => setForm(p => ({ ...p, id_proyek: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Ringkasan">
                        <textarea
                            rows={4}
                            value={form.ringkasan}
                            onChange={(e) => setForm(p => ({ ...p, ringkasan: e.target.value }))}
                            placeholder="Ringkasan laporan..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
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
