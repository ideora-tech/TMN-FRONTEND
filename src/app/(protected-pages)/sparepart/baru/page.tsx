'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { sparepartService } from '@/services/sparepart.service'
import { kategoriSparepartService, KategoriSparepart } from '@/services/kategoriSparepart.service'

export default function SparepartBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ kode: '', nama: '', id_kategori_sparepart: '', satuan: 'pcs', harga_standar: '' })
    const [kategoriOptions, setKategoriOptions] = useState<{ value: string; label: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        kategoriSparepartService.list(1, 100)
            .then(res => setKategoriOptions(res.data.filter(k => k.aktif).map((k: KategoriSparepart) => ({ value: k.id_kategori_sparepart, label: k.nama }))))
            .catch(() => {})
    }, [])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.kode.trim()) e.kode = 'Kode wajib diisi'
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
            await sparepartService.create({
                kode: form.kode,
                nama: form.nama,
                id_kategori_sparepart: form.id_kategori_sparepart || null,
                satuan: form.satuan || 'pcs',
                harga_standar: form.harga_standar ? Number(form.harga_standar) : 0,
            })
            toast.push(<Notification type="success" title="Spare part berhasil ditambahkan" />)
            router.push(ROUTES.SPAREPART)
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
                    <h3 className="font-bold">Tambah Spare Part</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan spare part baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="Kode" asterisk invalid={!!errors.kode} errorMessage={errors.kode}>
                        <Input placeholder="Kode unik" value={form.kode} invalid={!!errors.kode}
                            onChange={e => setForm(p => ({ ...p, kode: e.target.value.toUpperCase() }))} />
                    </FormItem>
                    <FormItem label="Nama" asterisk invalid={!!errors.nama} errorMessage={errors.nama}>
                        <Input placeholder="Nama spare part" value={form.nama} invalid={!!errors.nama}
                            onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Kategori">
                        <Select isSearchable isClearable placeholder="Pilih kategori (opsional)..."
                            options={kategoriOptions}
                            value={kategoriOptions.find(o => o.value === form.id_kategori_sparepart) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_kategori_sparepart: (opt as { value: string } | null)?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Satuan">
                        <Input placeholder="pcs" value={form.satuan}
                            onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Harga Standar (Rp)">
                        <Input prefix="Rp" placeholder="0"
                            value={form.harga_standar ? formatNum(Number(form.harga_standar)) : ''}
                            onChange={e => setForm(p => ({ ...p, harga_standar: e.target.value.replace(/\D/g, '') }))} />
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
