'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekonsiliasiService } from '@/services/rekonsiliasi.service'

export default function RekonsiliasiBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ id_faktur: '', catatan_klien: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.id_faktur.trim()) e.id_faktur = 'ID Faktur wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await rekonsiliasiService.create({ id_faktur: form.id_faktur, catatan_klien: form.catatan_klien || undefined })
            toast.push(<Notification type="success" title="Rekonsiliasi berhasil dibuat" />)
            router.push(ROUTES.REKONSILIASI)
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
                    <h3 className="font-bold">Buat Rekonsiliasi</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat rekonsiliasi baru untuk faktur</p>
                </div>
            </div>
            <Card>
                <div className="flex flex-col gap-1">
                    <FormItem label="ID Faktur" asterisk invalid={!!errors.id_faktur} errorMessage={errors.id_faktur}>
                        <Input placeholder="Masukkan ID Faktur" value={form.id_faktur} invalid={!!errors.id_faktur} onChange={(e) => setForm(p => ({ ...p, id_faktur: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Catatan Klien">
                        <textarea
                            rows={3}
                            value={form.catatan_klien}
                            onChange={(e) => setForm(p => ({ ...p, catatan_klien: e.target.value }))}
                            placeholder="Catatan dari klien..."
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
