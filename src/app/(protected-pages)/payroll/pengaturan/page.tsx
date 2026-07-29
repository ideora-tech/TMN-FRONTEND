'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification, Spinner } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { payrollService, PengaturanPayroll } from '@/services/payroll.service'

const PENGATURAN_DEFAULT: PengaturanPayroll = {
    tanggal_mulai_cutoff: 21,
    hari_kerja_per_bulan: 25,
    persen_bpjs_kesehatan: 1,
    persen_bpjs_jht: 2,
    persen_bpjs_jp: 1,
    plafon_gaji_bpjs_kesehatan: 12000000,
}

export default function PengaturanPayrollPage() {
    const router = useRouter()
    const [form, setForm]       = useState<PengaturanPayroll>(PENGATURAN_DEFAULT)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving]   = useState(false)

    useEffect(() => {
        payrollService.getPengaturan()
            .then(setForm)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [])

    const handleSubmit = async () => {
        setSaving(true)
        try {
            const hasil = await payrollService.simpanPengaturan(form)
            setForm(hasil)
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
                                extra={<span className="text-xs text-gray-400">Contoh 21 = periode 21 bulan lalu s/d 20 bulan gajian. Isi 1 untuk bulan kalender penuh.</span>}>
                                <Input type="number" min={1} max={28} value={form.tanggal_mulai_cutoff}
                                    onChange={e => setForm(p => ({ ...p, tanggal_mulai_cutoff: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Hari Kerja per Bulan" asterisk
                                extra={<span className="text-xs text-gray-400">Pembagi potongan alpha: potongan = alpha × (gaji pokok ÷ angka ini)</span>}>
                                <Input type="number" min={1} max={31} value={form.hari_kerja_per_bulan}
                                    onChange={e => setForm(p => ({ ...p, hari_kerja_per_bulan: Number(e.target.value) }))} />
                            </FormItem>
                        </div>

                        <div className="mb-2 mt-6">
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">BPJS (Porsi Karyawan)</p>
                            <p className="text-xs text-gray-400 mt-0.5">Dipotong otomatis saat generate slip, hanya untuk karyawan yang terdaftar ikut BPJS</p>
                            <div className="border-t border-gray-100 dark:border-gray-700 mt-2" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="BPJS Kesehatan (%)" asterisk>
                                <Input type="number" min={0} max={100} step={0.1} value={form.persen_bpjs_kesehatan}
                                    onChange={e => setForm(p => ({ ...p, persen_bpjs_kesehatan: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Plafon Gaji BPJS Kesehatan (Rp)" asterisk
                                extra={<span className="text-xs text-gray-400">Gaji di atas plafon dihitung sesuai batas ini</span>}>
                                <Input type="number" min={0} value={form.plafon_gaji_bpjs_kesehatan}
                                    onChange={e => setForm(p => ({ ...p, plafon_gaji_bpjs_kesehatan: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="BPJS Ketenagakerjaan — JHT (%)" asterisk>
                                <Input type="number" min={0} max={100} step={0.1} value={form.persen_bpjs_jht}
                                    onChange={e => setForm(p => ({ ...p, persen_bpjs_jht: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="BPJS Ketenagakerjaan — JP (%)" asterisk>
                                <Input type="number" min={0} max={100} step={0.1} value={form.persen_bpjs_jp}
                                    onChange={e => setForm(p => ({ ...p, persen_bpjs_jp: Number(e.target.value) }))} />
                            </FormItem>
                        </div>

                        <div className="mb-2 mt-6">
                            <p className="font-semibold text-sm text-gray-700 dark:text-gray-200">PPh 21</p>
                            <div className="border-t border-gray-100 dark:border-gray-700 mt-2" />
                        </div>
                        <p className="text-sm text-gray-500">
                            Dihitung otomatis mengikuti tarif progresif pemerintah (metode disetahunkan) berdasarkan status PTKP tiap karyawan — tidak diatur di sini. Angka hasil hitung tetap bisa dikoreksi manual per slip di halaman detail periode.
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
