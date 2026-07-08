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
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { karyawanService } from '@/services/karyawan.service'
import { Jabatan } from '@/services/jabatan.service'
import { LokasiKantor } from '@/services/lokasi-kantor.service'

const JK_OPTIONS    = [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }]
const STATUS_OPTIONS = [
    { value: 'tetap',    label: 'Tetap' },
    { value: 'kontrak',  label: 'Kontrak' },
    { value: 'magang',   label: 'Magang' },
]
const AKTIF_OPTIONS  = [{ value: 'true', label: 'Aktif' }, { value: 'false', label: 'Nonaktif' }]

export default function KaryawanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        nik: '', nama_karyawan: '', email: '', telepon: '',
        jenis_kelamin: 'L', tanggal_lahir: '', tanggal_masuk: '',
        status_kepegawaian: 'tetap', gaji_pokok: '', id_jabatan: '', id_lokasi: '', aktif: true,
    })
    const [loading, setLoading] = useState(false)
    const [errors, setErrors]   = useState<Record<string, string>>({})
    const [jabatanOptions, setJabatanOptions] = useState<{ value: string; label: string }[]>([])
    const [lokasiOptions, setLokasiOptions]   = useState<{ value: string; label: string }[]>([])

    useEffect(() => {
        Promise.all([
            axios.get(API_ENDPOINTS.JABATAN, { params: { limit: 999 } }),
            axios.get(API_ENDPOINTS.LOKASI_KANTOR, { params: { limit: 999 } }),
        ]).then(([jRes, lRes]) => {
            setJabatanOptions((jRes.data.data as Jabatan[]).map(j => ({ value: j.id_jabatan, label: j.nama_jabatan })))
            setLokasiOptions((lRes.data.data as LokasiKantor[]).map(l => ({ value: l.id_lokasi, label: l.nama_lokasi })))
        }).catch(() => {})
    }, [])

    const validate = () => {
        const e: Record<string, string> = {}
        if (!form.nik.trim()) e.nik = 'NIK wajib diisi'
        if (!form.nama_karyawan.trim()) e.nama_karyawan = 'Nama wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await karyawanService.create({
                nik: form.nik,
                nama_karyawan: form.nama_karyawan,
                email: form.email || null,
                telepon: form.telepon || null,
                jenis_kelamin: (form.jenis_kelamin as 'L' | 'P') || null,
                tanggal_lahir: form.tanggal_lahir || null,
                tanggal_masuk: form.tanggal_masuk || null,
                status_kepegawaian: (form.status_kepegawaian as 'tetap' | 'kontrak' | 'magang') || null,
                gaji_pokok: form.gaji_pokok ? Number(form.gaji_pokok) : 0,
                aktif: form.aktif,
            })
            toast.push(<Notification type="success" title="Karyawan berhasil ditambahkan" />)
            router.push(ROUTES.KARYAWAN)
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
                    <h3 className="font-bold">Tambah Karyawan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Daftarkan karyawan baru</p>
                </div>
            </div>
            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <FormItem label="NIK" asterisk invalid={!!errors.nik} errorMessage={errors.nik}>
                        <Input placeholder="Nomor Induk Karyawan" value={form.nik} invalid={!!errors.nik}
                            onChange={e => setForm(p => ({ ...p, nik: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Karyawan" asterisk invalid={!!errors.nama_karyawan} errorMessage={errors.nama_karyawan}>
                        <Input placeholder="Nama lengkap" value={form.nama_karyawan} invalid={!!errors.nama_karyawan}
                            onChange={e => setForm(p => ({ ...p, nama_karyawan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Email">
                        <Input type="email" placeholder="email@tmn.com" value={form.email}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Telepon">
                        <Input placeholder="No. telepon" value={form.telepon}
                            onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Jenis Kelamin">
                        <Select isSearchable={false} options={JK_OPTIONS}
                            value={JK_OPTIONS.find(o => o.value === form.jenis_kelamin) ?? null}
                            onChange={opt => setForm(p => ({ ...p, jenis_kelamin: opt?.value ?? 'L' }))} />
                    </FormItem>
                    <FormItem label="Status Kepegawaian">
                        <Select isSearchable={false} options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === form.status_kepegawaian) ?? null}
                            onChange={opt => setForm(p => ({ ...p, status_kepegawaian: opt?.value ?? 'tetap' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Lahir">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_lahir ? dayjs(form.tanggal_lahir).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_lahir: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Tanggal Masuk">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_masuk ? dayjs(form.tanggal_masuk).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_masuk: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Jabatan">
                        <Select isClearable isSearchable placeholder="Pilih jabatan..."
                            options={jabatanOptions}
                            value={jabatanOptions.find(o => o.value === form.id_jabatan) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_jabatan: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Lokasi Kerja">
                        <Select isClearable isSearchable placeholder="Pilih lokasi..."
                            options={lokasiOptions}
                            value={lokasiOptions.find(o => o.value === form.id_lokasi) ?? null}
                            onChange={opt => setForm(p => ({ ...p, id_lokasi: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Gaji Pokok">
                        <Input type="number" min={0} placeholder="0" value={form.gaji_pokok}
                            onChange={e => setForm(p => ({ ...p, gaji_pokok: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Status">
                        <Select isSearchable={false} options={AKTIF_OPTIONS}
                            value={AKTIF_OPTIONS.find(o => o.value === String(form.aktif)) ?? null}
                            onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === 'true' }))} />
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
