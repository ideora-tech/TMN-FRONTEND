'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft } from 'react-icons/hi'
import axios from 'axios'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { kontrakVendorService } from '@/services/kontrak-vendor.service'
import { Vendor } from '@/services/vendor.service'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'Full' },
]

export default function KontrakVendorBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        id_vendor: '', mekanisme: 'unit_only', nilai_kontrak: '',
        tanggal_mulai: '', tanggal_selesai: '',
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [vendorOptions, setVendorOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 999 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
    }, [])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.id_vendor) e.id_vendor = 'Vendor wajib dipilih'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await kontrakVendorService.create({
                id_vendor: form.id_vendor,
                mekanisme: form.mekanisme,
                nilai_kontrak: form.nilai_kontrak ? Number(form.nilai_kontrak) : null,
                tanggal_mulai: form.tanggal_mulai || null,
                tanggal_selesai: form.tanggal_selesai || null,
            })
            toast.push(<Notification type="success" title="Kontrak berhasil ditambahkan" />)
            router.push(ROUTES.KONTRAK_VENDOR)
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
                    <h3 className="font-bold">Tambah Kontrak Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat kontrak baru dengan vendor</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Vendor" asterisk invalid={!!errors.id_vendor} errorMessage={errors.id_vendor}>
                        <Select isSearchable placeholder="Pilih vendor..."
                            options={vendorOptions}
                            value={vendorOptions.find(o => o.value === form.id_vendor) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_vendor: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Mekanisme">
                        <Select isSearchable={false} options={MEKANISME_OPTIONS}
                            value={MEKANISME_OPTIONS.find(o => o.value === form.mekanisme) ?? null}
                            onChange={opt => setForm(p => ({ ...p, mekanisme: opt?.value ?? 'unit_only' }))} />
                    </FormItem>
                    <FormItem label="Nilai Kontrak">
                        <Input prefix="Rp" placeholder="0"
                            value={form.nilai_kontrak ? formatNum(Number(form.nilai_kontrak)) : ''}
                            onChange={e => setForm(p => ({ ...p, nilai_kontrak: e.target.value.replace(/\D/g, '') }))} />
                    </FormItem>
                    <div />
                    <FormItem label="Tanggal Mulai">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_mulai ? dayjs(form.tanggal_mulai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Selesai">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_selesai ? dayjs(form.tanggal_selesai).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
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
