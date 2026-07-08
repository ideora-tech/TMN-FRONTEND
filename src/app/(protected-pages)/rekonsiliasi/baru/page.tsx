'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Select, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekonsiliasiService } from '@/services/rekonsiliasi.service'
import { fakturService, Faktur } from '@/services/faktur.service'

export default function RekonsiliasiBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ id_faktur: '', catatan_klien: '' })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})
    const [fakturOptions, setFakturOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        fakturService.list(1)
            .then((res) => setFakturOptions(res.data.map((f: Faktur) => ({ value: f.id_faktur, label: f.nomor_faktur }))))
            .catch(() => {})
    }, [])

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
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Buat Rekonsiliasi</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat rekonsiliasi baru untuk faktur</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Faktur" asterisk invalid={!!errors.id_faktur} errorMessage={errors.id_faktur}>
                        <Select
                            placeholder="Pilih faktur..."
                            options={fakturOptions}
                            value={fakturOptions.find(o => o.value === form.id_faktur) ?? null}
                            onChange={(opt) => setForm(p => ({ ...p, id_faktur: opt?.value ?? '' }))}
                            invalid={!!errors.id_faktur}
                        />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Catatan Klien">
                            <textarea rows={3} value={form.catatan_klien}
                                onChange={(e) => setForm(p => ({ ...p, catatan_klien: e.target.value }))}
                                placeholder="Catatan dari klien..."
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
