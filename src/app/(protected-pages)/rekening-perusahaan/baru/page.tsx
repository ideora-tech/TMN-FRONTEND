'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { rekeningPerusahaanService, POLA_NOMOR_REKENING } from '@/services/rekening-perusahaan.service'

const UTAMA_OPTIONS = [{ value: 'false', label: 'Bukan rekening utama' }, { value: 'true', label: 'Rekening utama' }]

export default function RekeningPerusahaanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nama_bank: '', nomor_rekening: '', atas_nama_rekening: '', utama: false })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nama_bank.trim()) e.nama_bank = 'Nama bank wajib diisi'
        if (!form.nomor_rekening.trim()) e.nomor_rekening = 'Nomor rekening wajib diisi'
        else if (!POLA_NOMOR_REKENING.test(form.nomor_rekening.trim())) e.nomor_rekening = 'Nomor rekening hanya boleh berisi angka, spasi, titik, atau strip'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (loading) return
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            await rekeningPerusahaanService.create({
                nama_bank: form.nama_bank.trim(),
                nomor_rekening: form.nomor_rekening.trim(),
                atas_nama_rekening: form.atas_nama_rekening.trim() || null,
                utama: form.utama,
            })
            toast.push(<Notification type="success" title="Rekening berhasil ditambahkan" />)
            router.push(ROUTES.REKENING_PERUSAHAAN)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
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
                    <h3 className="font-bold">Tambah Rekening Perusahaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan rekening bank milik perusahaan</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Nama Bank" asterisk invalid={!!errors.nama_bank} errorMessage={errors.nama_bank}>
                        <Input placeholder="Contoh: BCA" maxLength={100} value={form.nama_bank} invalid={!!errors.nama_bank}
                            onChange={e => setForm(p => ({ ...p, nama_bank: e.target.value }))} />
                    </FormItem>
                    <FormItem label="No. Rekening" asterisk invalid={!!errors.nomor_rekening} errorMessage={errors.nomor_rekening}>
                        <Input placeholder="Nomor rekening" maxLength={50} value={form.nomor_rekening} invalid={!!errors.nomor_rekening}
                            onChange={e => setForm(p => ({ ...p, nomor_rekening: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Atas Nama">
                        <Input placeholder="Nama pemilik rekening" maxLength={200} value={form.atas_nama_rekening}
                            onChange={e => setForm(p => ({ ...p, atas_nama_rekening: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Rekening Utama"
                        extra={<span className="text-xs text-gray-400 ml-2">tercetak di invoice; rekening pertama otomatis jadi utama</span>}>
                        <Select isSearchable={false} options={UTAMA_OPTIONS}
                            value={UTAMA_OPTIONS.find(o => o.value === String(form.utama)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, utama: opt?.value === 'true' }))} />
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
