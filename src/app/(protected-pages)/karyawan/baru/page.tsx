'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Switcher, toast, Notification } from '@/components/ui'
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
const PERNIKAHAN_OPTIONS = [
    { value: 'belum_menikah', label: 'Belum Menikah' },
    { value: 'menikah',       label: 'Menikah' },
    { value: 'cerai',         label: 'Cerai' },
]
const PTKP_OPTIONS = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'].map(v => ({ value: v, label: v }))
const PENDIDIKAN_OPTIONS = ['SD', 'SMP', 'SMA/SMK', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3'].map(v => ({ value: v, label: v }))

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <div className="sm:col-span-2 mt-4 first:mt-0 mb-1">
        <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">{children}</p>
        <div className="border-t border-gray-100 dark:border-gray-700 mt-2" />
    </div>
)

export default function KaryawanBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({
        nik: '', nik_ktp: '', nama_karyawan: '', email: '', telepon: '',
        jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '',
        alamat_ktp: '', alamat_domisili: '',
        status_pernikahan: '', jumlah_tanggungan: '', status_ptkp: '', pendidikan_terakhir: '',
        npwp: '', nama_bank: '', nomor_rekening: '', atas_nama_rekening: '',
        ikut_bpjs_kesehatan: false, no_bpjs_kesehatan: '',
        ikut_bpjs_ketenagakerjaan: false, no_bpjs_ketenagakerjaan: '',
        override_persen_bpjs_kesehatan: '', override_persen_bpjs_jht: '', override_persen_bpjs_jp: '',
        override_plafon_bpjs_kesehatan: '', override_tunjangan_jabatan: '',
        kontak_darurat_nama: '', kontak_darurat_telepon: '', kontak_darurat_hubungan: '',
        tanggal_masuk: '', status_kepegawaian: 'tetap', gaji_pokok: '',
        id_jabatan: '', id_lokasi: '', aktif: true,
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
        if (!validate()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setLoading(true)
        try {
            await karyawanService.create({
                nik: form.nik,
                nik_ktp: form.nik_ktp || null,
                nama_karyawan: form.nama_karyawan,
                email: form.email || null,
                telepon: form.telepon || null,
                jenis_kelamin: (form.jenis_kelamin as 'L' | 'P') || null,
                tempat_lahir: form.tempat_lahir || null,
                tanggal_lahir: form.tanggal_lahir || null,
                alamat_ktp: form.alamat_ktp || null,
                alamat_domisili: form.alamat_domisili || null,
                status_pernikahan: (form.status_pernikahan as 'belum_menikah' | 'menikah' | 'cerai') || null,
                jumlah_tanggungan: form.jumlah_tanggungan ? Number(form.jumlah_tanggungan) : 0,
                status_ptkp: form.status_ptkp || null,
                pendidikan_terakhir: form.pendidikan_terakhir || null,
                npwp: form.npwp || null,
                nama_bank: form.nama_bank || null,
                nomor_rekening: form.nomor_rekening || null,
                atas_nama_rekening: form.atas_nama_rekening || null,
                ikut_bpjs_kesehatan: form.ikut_bpjs_kesehatan,
                no_bpjs_kesehatan: form.no_bpjs_kesehatan || null,
                ikut_bpjs_ketenagakerjaan: form.ikut_bpjs_ketenagakerjaan,
                no_bpjs_ketenagakerjaan: form.no_bpjs_ketenagakerjaan || null,
                override_persen_bpjs_kesehatan: form.override_persen_bpjs_kesehatan ? Number(form.override_persen_bpjs_kesehatan) : null,
                override_persen_bpjs_jht: form.override_persen_bpjs_jht ? Number(form.override_persen_bpjs_jht) : null,
                override_persen_bpjs_jp: form.override_persen_bpjs_jp ? Number(form.override_persen_bpjs_jp) : null,
                override_plafon_bpjs_kesehatan: form.override_plafon_bpjs_kesehatan ? Number(form.override_plafon_bpjs_kesehatan) : null,
                override_tunjangan_jabatan: form.override_tunjangan_jabatan ? Number(form.override_tunjangan_jabatan) : null,
                kontak_darurat_nama: form.kontak_darurat_nama || null,
                kontak_darurat_telepon: form.kontak_darurat_telepon || null,
                kontak_darurat_hubungan: form.kontak_darurat_hubungan || null,
                tanggal_masuk: form.tanggal_masuk || null,
                status_kepegawaian: (form.status_kepegawaian as 'tetap' | 'kontrak' | 'magang') || null,
                gaji_pokok: form.gaji_pokok ? Number(form.gaji_pokok) : 0,
                id_jabatan: form.id_jabatan || null,
                id_lokasi: form.id_lokasi || null,
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
                    <SectionHeading>Data Pribadi</SectionHeading>
                    <FormItem label="NIK" asterisk invalid={!!errors.nik} errorMessage={errors.nik}>
                        <Input placeholder="Nomor Induk Karyawan" value={form.nik} invalid={!!errors.nik}
                            onChange={e => setForm(p => ({ ...p, nik: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Karyawan" asterisk invalid={!!errors.nama_karyawan} errorMessage={errors.nama_karyawan}>
                        <Input placeholder="Nama lengkap" value={form.nama_karyawan} invalid={!!errors.nama_karyawan}
                            onChange={e => setForm(p => ({ ...p, nama_karyawan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="NIK KTP">
                        <Input placeholder="16 digit NIK KTP" value={form.nik_ktp}
                            onChange={e => setForm(p => ({ ...p, nik_ktp: e.target.value }))} />
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
                    <FormItem label="Tempat Lahir">
                        <Input placeholder="Kota kelahiran" value={form.tempat_lahir}
                            onChange={e => setForm(p => ({ ...p, tempat_lahir: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tanggal Lahir">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_lahir ? dayjs(form.tanggal_lahir).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_lahir: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Status Pernikahan">
                        <Select isClearable isSearchable={false} placeholder="Pilih status..."
                            options={PERNIKAHAN_OPTIONS}
                            value={PERNIKAHAN_OPTIONS.find(o => o.value === form.status_pernikahan) ?? null}
                            onChange={opt => setForm(p => ({ ...p, status_pernikahan: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Jumlah Tanggungan">
                        <Input type="number" min={0} max={10} placeholder="0" value={form.jumlah_tanggungan}
                            onChange={e => setForm(p => ({ ...p, jumlah_tanggungan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Pendidikan Terakhir">
                        <Select isClearable isSearchable={false} placeholder="Pilih pendidikan..."
                            options={PENDIDIKAN_OPTIONS}
                            value={PENDIDIKAN_OPTIONS.find(o => o.value === form.pendidikan_terakhir) ?? null}
                            onChange={opt => setForm(p => ({ ...p, pendidikan_terakhir: opt?.value ?? '' }))} />
                    </FormItem>
                    <div className="hidden sm:block" />
                    <FormItem label="Alamat KTP">
                        <Input textArea rows={2} placeholder="Alamat sesuai KTP" value={form.alamat_ktp}
                            onChange={e => setForm(p => ({ ...p, alamat_ktp: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Alamat Domisili">
                        <Input textArea rows={2} placeholder="Alamat tempat tinggal saat ini" value={form.alamat_domisili}
                            onChange={e => setForm(p => ({ ...p, alamat_domisili: e.target.value }))} />
                    </FormItem>

                    <SectionHeading>Kepegawaian</SectionHeading>
                    <FormItem label="Tanggal Masuk">
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={form.tanggal_masuk ? dayjs(form.tanggal_masuk).toDate() : null}
                            onChange={date => setForm(p => ({ ...p, tanggal_masuk: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                    </FormItem>
                    <FormItem label="Status Kepegawaian">
                        <Select isSearchable={false} options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === form.status_kepegawaian) ?? null}
                            onChange={opt => setForm(p => ({ ...p, status_kepegawaian: opt?.value ?? 'tetap' }))} />
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

                    <SectionHeading>Pajak &amp; BPJS</SectionHeading>
                    <FormItem label="Status PTKP">
                        <Select isClearable isSearchable={false} placeholder="Pilih PTKP..."
                            options={PTKP_OPTIONS}
                            value={PTKP_OPTIONS.find(o => o.value === form.status_ptkp) ?? null}
                            onChange={opt => setForm(p => ({ ...p, status_ptkp: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="NPWP">
                        <Input placeholder="Nomor NPWP" value={form.npwp}
                            onChange={e => setForm(p => ({ ...p, npwp: e.target.value }))} />
                    </FormItem>
                    <FormItem label="BPJS Kesehatan">
                        <div className="flex items-center gap-3">
                            <Switcher checked={form.ikut_bpjs_kesehatan}
                                onChange={checked => setForm(p => ({ ...p, ikut_bpjs_kesehatan: checked }))} />
                            <Input placeholder="Nomor kepesertaan" value={form.no_bpjs_kesehatan}
                                disabled={!form.ikut_bpjs_kesehatan}
                                onChange={e => setForm(p => ({ ...p, no_bpjs_kesehatan: e.target.value }))} />
                        </div>
                    </FormItem>
                    <FormItem label="BPJS Ketenagakerjaan">
                        <div className="flex items-center gap-3">
                            <Switcher checked={form.ikut_bpjs_ketenagakerjaan}
                                onChange={checked => setForm(p => ({ ...p, ikut_bpjs_ketenagakerjaan: checked }))} />
                            <Input placeholder="Nomor kepesertaan" value={form.no_bpjs_ketenagakerjaan}
                                disabled={!form.ikut_bpjs_ketenagakerjaan}
                                onChange={e => setForm(p => ({ ...p, no_bpjs_ketenagakerjaan: e.target.value }))} />
                        </div>
                    </FormItem>

                    <div className="sm:col-span-2 mt-2">
                        <p className="text-xs font-medium text-gray-500">Override Persentase BPJS (Opsional)</p>
                        <p className="text-xs text-gray-400 mt-0.5">Kosongkan untuk ikut pengaturan perusahaan di halaman Payroll</p>
                    </div>
                    <FormItem label="Override BPJS Kesehatan (%)">
                        <Input type="number" min={0} max={100} step={0.1} placeholder="Ikut default" value={form.override_persen_bpjs_kesehatan}
                            onChange={e => setForm(p => ({ ...p, override_persen_bpjs_kesehatan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Override Plafon Gaji BPJS Kesehatan (Rp)">
                        <Input type="number" min={0} placeholder="Ikut default" value={form.override_plafon_bpjs_kesehatan}
                            onChange={e => setForm(p => ({ ...p, override_plafon_bpjs_kesehatan: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Override BPJS JHT (%)">
                        <Input type="number" min={0} max={100} step={0.1} placeholder="Ikut default" value={form.override_persen_bpjs_jht}
                            onChange={e => setForm(p => ({ ...p, override_persen_bpjs_jht: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Override BPJS JP (%)">
                        <Input type="number" min={0} max={100} step={0.1} placeholder="Ikut default" value={form.override_persen_bpjs_jp}
                            onChange={e => setForm(p => ({ ...p, override_persen_bpjs_jp: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Override Tunjangan Jabatan (Rp)"
                        extra={<span className="text-xs text-gray-400">Kosongkan untuk ikut default tunjangan jabatan</span>}>
                        <Input type="number" min={0} placeholder="Ikut default jabatan" value={form.override_tunjangan_jabatan}
                            onChange={e => setForm(p => ({ ...p, override_tunjangan_jabatan: e.target.value }))} />
                    </FormItem>

                    <SectionHeading>Rekening Bank</SectionHeading>
                    <FormItem label="Nama Bank">
                        <Input placeholder="BCA / Mandiri / BRI..." value={form.nama_bank}
                            onChange={e => setForm(p => ({ ...p, nama_bank: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nomor Rekening">
                        <Input placeholder="Nomor rekening" value={form.nomor_rekening}
                            onChange={e => setForm(p => ({ ...p, nomor_rekening: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Atas Nama">
                        <Input placeholder="Nama pemilik rekening" value={form.atas_nama_rekening}
                            onChange={e => setForm(p => ({ ...p, atas_nama_rekening: e.target.value }))} />
                    </FormItem>
                    <div className="hidden sm:block" />

                    <SectionHeading>Kontak Darurat</SectionHeading>
                    <FormItem label="Nama Kontak">
                        <Input placeholder="Nama kontak darurat" value={form.kontak_darurat_nama}
                            onChange={e => setForm(p => ({ ...p, kontak_darurat_nama: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Telepon Kontak">
                        <Input placeholder="No. telepon kontak darurat" value={form.kontak_darurat_telepon}
                            onChange={e => setForm(p => ({ ...p, kontak_darurat_telepon: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Hubungan">
                        <Input placeholder="Istri / Suami / Orang tua..." value={form.kontak_darurat_hubungan}
                            onChange={e => setForm(p => ({ ...p, kontak_darurat_hubungan: e.target.value }))} />
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
