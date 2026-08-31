'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { supirVendorService } from '@/services/supirVendor.service'
import { kontrakVendorService } from '@/services/kontrak-vendor.service'
import { Vendor } from '@/services/vendor.service'

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'All In',
}

export default function SupirVendorBaruPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialIdVendor = searchParams.get('id_vendor') ?? ''

    const [form, setForm] = useState({
        id_vendor: initialIdVendor, nama: '', telepon: '', no_sim: '', masa_berlaku_sim: '', id_kontrak_vendor: '',
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [vendorOptions, setVendorOptions] = useState<{ value: string; label: string }[]>([])
    const [kontrakOptions, setKontrakOptions] = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        axios.get(API_ENDPOINTS.VENDOR, { params: { limit: 100 } })
            .then(r => setVendorOptions((r.data.data as Vendor[]).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))))
            .catch(() => {})
    }, [])

    useEffect(() => {
        setForm(p => ({ ...p, id_kontrak_vendor: '' }))
        setKontrakOptions([])
        if (!form.id_vendor) return
        kontrakVendorService.list(1, { id_vendor: form.id_vendor, limit: '200' })
            .then(res => setKontrakOptions(res.data.map(k => ({
                value: k.id_kontrak_vendor,
                label: `${k.nomor_kontrak || `Kontrak ${k.id_kontrak_vendor.slice(0, 8)}`} — ${MEKANISME_LABEL[k.mekanisme] ?? k.mekanisme}`,
            }))))
            .catch(() => {})
    }, [form.id_vendor])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.id_vendor) e.id_vendor = 'Vendor wajib dipilih'
        if (!form.nama.trim()) e.nama = 'Nama wajib diisi'
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
            await supirVendorService.create({
                id_vendor: form.id_vendor,
                nama: form.nama,
                telepon: form.telepon || null,
                no_sim: form.no_sim || null,
                masa_berlaku_sim: form.masa_berlaku_sim || null,
                id_kontrak_vendor: form.id_kontrak_vendor || null,
            })
            toast.push(<Notification type="success" title="Supir vendor berhasil ditambahkan" />)
            router.push(form.id_vendor ? `${ROUTES.SUPIR_VENDOR}?id_vendor=${form.id_vendor}` : ROUTES.SUPIR_VENDOR)
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
                    <h3 className="font-bold">Tambah Supir Vendor</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan supir milik vendor</p>
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
                    <FormItem label="Kontrak (opsional)">
                        <Select isSearchable isClearable
                            isDisabled={!form.id_vendor || kontrakOptions.length === 0}
                            placeholder={!form.id_vendor
                                ? 'Pilih vendor dahulu...'
                                : kontrakOptions.length === 0
                                    ? 'Vendor ini belum punya kontrak'
                                    : 'Pilih kontrak...'}
                            options={kontrakOptions}
                            value={kontrakOptions.find(o => o.value === form.id_kontrak_vendor) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_kontrak_vendor: (opt as { value: string } | null)?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Nama" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                        <Input placeholder="Nama lengkap supir" value={form.nama} invalid={!!errors.nama}
                            onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input placeholder="Nomor telepon" value={form.telepon}
                            onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} />
                    </FormItem>
                    <FormItem label="No SIM">
                        <Input placeholder="Nomor SIM" value={form.no_sim}
                            onChange={e => setForm(p => ({ ...p, no_sim: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Masa Berlaku SIM">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.masa_berlaku_sim ? dayjs(form.masa_berlaku_sim).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, masa_berlaku_sim: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
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
