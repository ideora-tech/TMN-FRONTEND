'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Spinner } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { payrollService, PengaturanPayroll } from '@/services/payroll.service'

type FormPengaturan = Record<keyof PengaturanPayroll, string>
type ErrorPengaturan = Partial<Record<keyof PengaturanPayroll, string>>

const FORM_DEFAULT: FormPengaturan = {
    tanggal_mulai_cutoff: '21',
    hari_kerja_per_bulan: '25',
    persen_bpjs_kesehatan: '1',
    persen_bpjs_jht: '2',
    persen_bpjs_jp: '1',
    plafon_gaji_bpjs_kesehatan: '12000000',
    ptkp_dasar: '54000000',
    ptkp_tambahan: '4500000',
}

const ATURAN: { key: keyof PengaturanPayroll; label: string; min: number; max?: number; bulat?: boolean }[] = [
    { key: 'tanggal_mulai_cutoff', label: 'Tanggal mulai cut-off', min: 1, max: 28, bulat: true },
    { key: 'hari_kerja_per_bulan', label: 'Hari kerja per bulan', min: 1, max: 31, bulat: true },
    { key: 'persen_bpjs_kesehatan', label: 'BPJS Kesehatan', min: 0, max: 100 },
    { key: 'persen_bpjs_jht', label: 'BPJS JHT', min: 0, max: 100 },
    { key: 'persen_bpjs_jp', label: 'BPJS JP', min: 0, max: 100 },
    { key: 'plafon_gaji_bpjs_kesehatan', label: 'Plafon gaji BPJS Kesehatan', min: 0 },
    { key: 'ptkp_dasar', label: 'PTKP dasar', min: 0 },
    { key: 'ptkp_tambahan', label: 'PTKP tambahan', min: 0 },
]

const keForm = (p: PengaturanPayroll): FormPengaturan => ({
    tanggal_mulai_cutoff: String(p.tanggal_mulai_cutoff),
    hari_kerja_per_bulan: String(p.hari_kerja_per_bulan),
    persen_bpjs_kesehatan: String(p.persen_bpjs_kesehatan),
    persen_bpjs_jht: String(p.persen_bpjs_jht),
    persen_bpjs_jp: String(p.persen_bpjs_jp),
    plafon_gaji_bpjs_kesehatan: String(p.plafon_gaji_bpjs_kesehatan),
    ptkp_dasar: String(p.ptkp_dasar),
    ptkp_tambahan: String(p.ptkp_tambahan),
})

const keAngka = (v: string): number => Number(v.trim().replace(',', '.'))

export default function PengaturanPayrollPage() {
    const router = useRouter()
    const [form, setForm]       = useState<FormPengaturan>(FORM_DEFAULT)
    const [errors, setErrors]   = useState<ErrorPengaturan>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        payrollService.getPengaturan()
            .then(p => setForm(keForm(p)))
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [])

    const ubah = (key: keyof PengaturanPayroll, value: string) => {
        setForm(p => ({ ...p, [key]: value }))
        setErrors(p => ({ ...p, [key]: undefined }))
    }

    const validasi = (): boolean => {
        const hasil: ErrorPengaturan = {}
        for (const { key, label, min, max, bulat } of ATURAN) {
            const teks = form[key].trim()
            if (!teks) {
                hasil[key] = `${label} wajib diisi`
                continue
            }
            const polaValid = bulat ? /^\d+$/.test(teks) : /^\d+([.,]\d+)?$/.test(teks)
            const angka = keAngka(teks)
            if (!polaValid || Number.isNaN(angka) || angka < min || (max !== undefined && angka > max)) {
                hasil[key] = max !== undefined
                    ? `Harus angka${bulat ? ' bulat' : ''} ${min}–${max}`
                    : `Harus angka ${min} atau lebih`
            }
        }
        setErrors(hasil)
        return Object.keys(hasil).length === 0
    }

    const handleSubmit = async () => {
        if (!validasi()) return
        setSaving(true)
        try {
            const hasil = await payrollService.simpanPengaturan({
                tanggal_mulai_cutoff: keAngka(form.tanggal_mulai_cutoff),
                hari_kerja_per_bulan: keAngka(form.hari_kerja_per_bulan),
                persen_bpjs_kesehatan: keAngka(form.persen_bpjs_kesehatan),
                persen_bpjs_jht: keAngka(form.persen_bpjs_jht),
                persen_bpjs_jp: keAngka(form.persen_bpjs_jp),
                plafon_gaji_bpjs_kesehatan: keAngka(form.plafon_gaji_bpjs_kesehatan),
                ptkp_dasar: keAngka(form.ptkp_dasar),
                ptkp_tambahan: keAngka(form.ptkp_tambahan),
            })
            setForm(keForm(hasil))
            toast.push(<Notification type="success" title="Pengaturan payroll tersimpan" />)
            router.push(ROUTES.PAYROLL)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PAYROLL)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Pengaturan Payroll</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Cut-off periode, potongan absen, dan persentase BPJS</p>
                </div>
            </div>

            <Card>
                {loading ? (
                    <div className="flex justify-center py-16"><Spinner size={40} /></div>
                ) : (
                    <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                        <div className="mb-2">
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">Periode &amp; Absen</p>
                            <div className="border-t border-gray-100 dark:border-gray-700 mt-2" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Tanggal Mulai Cut-off" asterisk
                                invalid={!!errors.tanggal_mulai_cutoff} errorMessage={errors.tanggal_mulai_cutoff}
                                extra={<span className="text-xs text-gray-400">Contoh 21 = periode 21 bulan lalu s/d 20 bulan gajian. Isi 1 untuk bulan kalender penuh. Maksimal 28 (menyesuaikan Februari).</span>}>
                                <Input type="text" value={form.tanggal_mulai_cutoff} invalid={!!errors.tanggal_mulai_cutoff}
                                    onChange={e => ubah('tanggal_mulai_cutoff', e.target.value)} />
                            </FormItem>
                            <FormItem label="Hari Kerja per Bulan" asterisk
                                invalid={!!errors.hari_kerja_per_bulan} errorMessage={errors.hari_kerja_per_bulan}
                                extra={<span className="text-xs text-gray-400">Pembagi potongan alpha: potongan = alpha × (gaji pokok ÷ angka ini)</span>}>
                                <Input type="text" value={form.hari_kerja_per_bulan} invalid={!!errors.hari_kerja_per_bulan}
                                    onChange={e => ubah('hari_kerja_per_bulan', e.target.value)} />
                            </FormItem>
                        </div>

                        <div className="mb-2 mt-6">
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">BPJS (Porsi Karyawan)</p>
                            <p className="text-xs text-gray-400 mt-0.5">Dipotong otomatis saat generate slip, hanya untuk karyawan yang terdaftar ikut BPJS</p>
                            <div className="border-t border-gray-100 dark:border-gray-700 mt-2" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="BPJS Kesehatan (%)" asterisk
                                invalid={!!errors.persen_bpjs_kesehatan} errorMessage={errors.persen_bpjs_kesehatan}>
                                <Input type="text" value={form.persen_bpjs_kesehatan} invalid={!!errors.persen_bpjs_kesehatan}
                                    onChange={e => ubah('persen_bpjs_kesehatan', e.target.value)} />
                            </FormItem>
                            <FormItem label="Plafon Gaji BPJS Kesehatan (Rp)" asterisk
                                invalid={!!errors.plafon_gaji_bpjs_kesehatan} errorMessage={errors.plafon_gaji_bpjs_kesehatan}
                                extra={<span className="text-xs text-gray-400">Gaji di atas plafon dihitung sesuai batas ini</span>}>
                                <Input type="text" value={form.plafon_gaji_bpjs_kesehatan} invalid={!!errors.plafon_gaji_bpjs_kesehatan}
                                    onChange={e => ubah('plafon_gaji_bpjs_kesehatan', e.target.value)} />
                            </FormItem>
                            <FormItem label="BPJS Ketenagakerjaan — JHT (%)" asterisk
                                invalid={!!errors.persen_bpjs_jht} errorMessage={errors.persen_bpjs_jht}>
                                <Input type="text" value={form.persen_bpjs_jht} invalid={!!errors.persen_bpjs_jht}
                                    onChange={e => ubah('persen_bpjs_jht', e.target.value)} />
                            </FormItem>
                            <FormItem label="BPJS Ketenagakerjaan — JP (%)" asterisk
                                invalid={!!errors.persen_bpjs_jp} errorMessage={errors.persen_bpjs_jp}>
                                <Input type="text" value={form.persen_bpjs_jp} invalid={!!errors.persen_bpjs_jp}
                                    onChange={e => ubah('persen_bpjs_jp', e.target.value)} />
                            </FormItem>
                        </div>

                        <div className="mb-2 mt-6">
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">PPh 21</p>
                            <p className="text-xs text-gray-400 mt-0.5">Tarif progresif pemerintah (metode disetahunkan) berdasarkan status PTKP tiap karyawan. Nilai PTKP mengikuti ketentuan resmi — ubah hanya bila regulasi berubah.</p>
                            <div className="border-t border-gray-100 dark:border-gray-700 mt-2" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="PTKP Dasar / Tahun (Rp)" asterisk
                                invalid={!!errors.ptkp_dasar} errorMessage={errors.ptkp_dasar}
                                extra={<span className="text-xs text-gray-400">Untuk status TK/0 — ketentuan saat ini Rp 54.000.000</span>}>
                                <Input type="text" value={form.ptkp_dasar} invalid={!!errors.ptkp_dasar}
                                    onChange={e => ubah('ptkp_dasar', e.target.value)} />
                            </FormItem>
                            <FormItem label="PTKP Tambahan / Tahun (Rp)" asterisk
                                invalid={!!errors.ptkp_tambahan} errorMessage={errors.ptkp_tambahan}
                                extra={<span className="text-xs text-gray-400">Tambahan bila kawin dan per tanggungan (maks 3) — ketentuan saat ini Rp 4.500.000</span>}>
                                <Input type="text" value={form.ptkp_tambahan} invalid={!!errors.ptkp_tambahan}
                                    onChange={e => ubah('ptkp_tambahan', e.target.value)} />
                            </FormItem>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            Angka hasil hitung tetap bisa dikoreksi manual per slip di halaman detail periode.
                        </p>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PAYROLL)}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    )
}
