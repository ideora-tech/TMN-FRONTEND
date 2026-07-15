'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft } from 'react-icons/hi'
import { penawaranService } from '@/services/penawaran.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

interface FormState {
    nomor_penawaran:    string
    judul:              string
    nilai_penawaran_str: string
    tanggal_penawaran:  string
    tanggal_berlaku:    string
    catatan:            string
}

const INIT: FormState = {
    nomor_penawaran:    '',
    judul:              '',
    nilai_penawaran_str: '',
    tanggal_penawaran:  '',
    tanggal_berlaku:    '',
    catatan:            '',
}

export default function PenawaranBaruPage() {
    const router = useRouter()
    const [form, setForm]     = useState<FormState>(INIT)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

    const set = (field: keyof FormState, value: string) =>
        setForm(p => ({ ...p, [field]: value }))

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.nomor_penawaran.trim()) e.nomor_penawaran = 'Nomor penawaran wajib diisi'
        if (!form.judul.trim())           e.judul           = 'Judul penawaran wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setSaving(true)
        try {
            await penawaranService.create({
                nomor_penawaran:   form.nomor_penawaran.trim(),
                judul:             form.judul.trim(),
                nilai_penawaran:   form.nilai_penawaran_str
                    ? Number(form.nilai_penawaran_str.replace(/\D/g, ''))
                    : null,
                tanggal_penawaran: form.tanggal_penawaran || null,
                tanggal_berlaku:   form.tanggal_berlaku || null,
                catatan:           form.catatan.trim() || null,
            })
            toast.push(<Notification type="success" title="Penawaran berhasil dibuat" />)
            router.push(ROUTES.PENAWARAN)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.PENAWARAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Buat Penawaran Baru</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Isi detail penawaran untuk klien</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Nomor Penawaran" asterisk invalid={!!errors.nomor_penawaran} errorMessage={errors.nomor_penawaran}>
                            <Input
                                placeholder="Contoh: PNW-2026-001"
                                value={form.nomor_penawaran}
                                invalid={!!errors.nomor_penawaran}
                                onChange={e => set('nomor_penawaran', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label="Judul Penawaran" asterisk invalid={!!errors.judul} errorMessage={errors.judul}>
                            <Input
                                placeholder="Contoh: Penawaran Jasa Pengiriman Q3 2026"
                                value={form.judul}
                                invalid={!!errors.judul}
                                onChange={e => set('judul', e.target.value)}
                            />
                        </FormItem>
                        <FormItem label="Nilai Penawaran">
                            <Input
                                prefix="Rp"
                                placeholder="0"
                                value={form.nilai_penawaran_str
                                    ? formatNum(Number(form.nilai_penawaran_str))
                                    : ''}
                                onChange={e =>
                                    set('nilai_penawaran_str', e.target.value.replace(/\D/g, ''))
                                }
                            />
                        </FormItem>
                        <FormItem label="Tanggal Penawaran">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={form.tanggal_penawaran ? dayjs(form.tanggal_penawaran).toDate() : null}
                                onChange={date => set('tanggal_penawaran', date ? dayjs(date).format('YYYY-MM-DD') : '')}
                            />
                        </FormItem>
                        <FormItem label="Berlaku Hingga">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={form.tanggal_berlaku ? dayjs(form.tanggal_berlaku).toDate() : null}
                                onChange={date => set('tanggal_berlaku', date ? dayjs(date).format('YYYY-MM-DD') : '')}
                            />
                        </FormItem>
                        <FormItem label="Catatan" className="sm:col-span-2">
                            <textarea
                                rows={3}
                                placeholder="Catatan tambahan untuk penawaran ini (opsional)"
                                value={form.catatan}
                                onChange={e => set('catatan', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                            />
                        </FormItem>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PENAWARAN)}>
                            Batal
                        </Button>
                        <Button type="submit" variant="solid" loading={saving}>
                            Buat Penawaran
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}