'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Select, Dialog, toast, Notification, Tag } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineExclamationCircle } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { karyawanService, Karyawan } from '@/services/karyawan.service'
import { karyawanExitService, JenisExit } from '@/services/karyawanExit.service'

const JENIS_EXIT_OPTIONS: { value: JenisExit; label: string }[] = [
    { value: 'resign',        label: 'Resign' },
    { value: 'pensiun',       label: 'Pensiun' },
    { value: 'phk',           label: 'PHK' },
    { value: 'meninggal',     label: 'Meninggal Dunia' },
    { value: 'kontrak_habis', label: 'Kontrak Habis' },
]

const STATUS_KEPEGAWAIAN_CLASS: Record<string, string> = {
    tetap:   'bg-emerald-100 text-emerald-600',
    kontrak: 'bg-blue-100 text-blue-600',
    magang:  'bg-yellow-100 text-yellow-700',
}

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function KaryawanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [karyawan, setKaryawan] = useState<Karyawan | null>(null)
    const [loading, setLoading]   = useState(true)
    const [editing, setEditing]   = useState(false)
    const [form, setForm]         = useState<Partial<Karyawan>>({})
    const [saving, setSaving]     = useState(false)

    const [exitOpen, setExitOpen] = useState(false)
    const [exitForm, setExitForm] = useState<{
        jenis_exit: JenisExit | ''
        tanggal_efektif: string
        alasan: string
        dapat_direkrut_kembali: boolean
    }>({ jenis_exit: '', tanggal_efektif: '', alasan: '', dapat_direkrut_kembali: true })
    const [exitSaving, setExitSaving] = useState(false)

    useEffect(() => {
        karyawanService.get(id)
            .then(k => { setKaryawan(k); setForm(k) })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await karyawanService.update(id, {
                nik:                  form.nik,
                nama_karyawan:        form.nama_karyawan,
                email:                form.email || null,
                telepon:              form.telepon || null,
                tanggal_lahir:        form.tanggal_lahir || null,
                tanggal_masuk:        form.tanggal_masuk || null,
                status_kepegawaian:   form.status_kepegawaian ?? null,
                gaji_pokok:           form.gaji_pokok,
                aktif:                form.aktif,
            })
            setKaryawan(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Data karyawan berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleExit = async () => {
        if (!exitForm.jenis_exit || !exitForm.tanggal_efektif) return
        setExitSaving(true)
        try {
            await karyawanExitService.create({
                id_karyawan:            id,
                jenis_exit:             exitForm.jenis_exit,
                tanggal_efektif:        exitForm.tanggal_efektif,
                alasan:                 exitForm.alasan || null,
                dapat_direkrut_kembali: exitForm.dapat_direkrut_kembali,
            })
            toast.push(<Notification type="success" title="Proses exit karyawan berhasil dicatat" />)
            setExitOpen(false)
            const updated = await karyawanService.get(id)
            setKaryawan(updated)
            setForm(updated)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setExitSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!karyawan) return <div className="p-6 text-red-500">Karyawan tidak ditemukan.</div>

    const initial = karyawan.nama_karyawan?.charAt(0).toUpperCase() ?? 'K'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.KARYAWAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{karyawan.nama_karyawan}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">NIK: {karyawan.nik}</p>
                </div>
            </div>

            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{karyawan.nama_karyawan}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        NIK: {karyawan.nik} &middot; {karyawan.jabatan?.nama_jabatan ?? 'Tanpa Jabatan'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                                {karyawan.status_kepegawaian && (
                                    <Tag className={STATUS_KEPEGAWAIAN_CLASS[karyawan.status_kepegawaian] ?? ''}>
                                        {karyawan.status_kepegawaian.charAt(0).toUpperCase() + karyawan.status_kepegawaian.slice(1)}
                                    </Tag>
                                )}
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${karyawan.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {karyawan.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'NIK',           value: karyawan.nik },
                                { label: 'Jabatan',       value: karyawan.jabatan?.nama_jabatan ?? <span className="text-gray-400">—</span> },
                                { label: 'Lokasi Kerja',  value: karyawan.lokasi?.nama_lokasi ?? <span className="text-gray-400">—</span> },
                                { label: 'Email',         value: karyawan.email ?? <span className="text-gray-400">—</span> },
                                { label: 'Telepon',       value: karyawan.telepon ?? <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Lahir', value: karyawan.tanggal_lahir ? dayjs(karyawan.tanggal_lahir).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Masuk', value: karyawan.tanggal_masuk ? dayjs(karyawan.tanggal_masuk).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
                                { label: 'Gaji Pokok',   value: formatRupiah(karyawan.gaji_pokok) },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {karyawan.aktif && (
                            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                                <Button variant="plain" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    icon={<HiOutlineExclamationCircle />}
                                    onClick={() => setExitOpen(true)}>
                                    Proses Exit Karyawan
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_karyawan?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Data Karyawan</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi karyawan di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="NIK">
                                <Input value={form.nik ?? ''} onChange={e => setForm(p => ({ ...p, nik: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Karyawan">
                                <Input value={form.nama_karyawan ?? ''} onChange={e => setForm(p => ({ ...p, nama_karyawan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={e => setForm(p => ({ ...p, telepon: e.target.value }))} />
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
                            <FormItem label="Gaji Pokok">
                                <Input type="number" min={0} value={form.gaji_pokok ?? ''} onChange={e => setForm(p => ({ ...p, gaji_pokok: Number(e.target.value) }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false} options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, aktif: opt?.value === '1' }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(karyawan) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Exit Modal */}
            <Dialog isOpen={exitOpen} onClose={() => setExitOpen(false)}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                            <HiOutlineExclamationCircle className="text-xl text-red-600" />
                        </div>
                        <div>
                            <h5 className="font-bold">Proses Exit Karyawan</h5>
                            <p className="text-gray-500 text-sm">{karyawan.nama_karyawan}</p>
                        </div>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); handleExit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Jenis Exit" asterisk>
                            <Select isSearchable={false} placeholder="Pilih jenis..."
                                options={JENIS_EXIT_OPTIONS}
                                value={JENIS_EXIT_OPTIONS.find(o => o.value === exitForm.jenis_exit) ?? null}
                                onChange={opt => setExitForm(p => ({ ...p, jenis_exit: opt?.value ?? '' as JenisExit }))} />
                        </FormItem>
                        <FormItem label="Tanggal Efektif" asterisk>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={exitForm.tanggal_efektif ? dayjs(exitForm.tanggal_efektif).toDate() : null}
                                onChange={date => setExitForm(p => ({ ...p, tanggal_efektif: date ? dayjs(date).format('YYYY-MM-DD') : '' }))} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Alasan">
                                <Input textArea rows={3} placeholder="Alasan keluar (opsional)..."
                                    value={exitForm.alasan}
                                    onChange={e => setExitForm(p => ({ ...p, alasan: e.target.value }))} />
                            </FormItem>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-3 py-2">
                            <input type="checkbox" id="dapat_direkrut"
                                checked={exitForm.dapat_direkrut_kembali}
                                onChange={e => setExitForm(p => ({ ...p, dapat_direkrut_kembali: e.target.checked }))}
                                className="w-4 h-4 rounded accent-emerald-600" />
                            <label htmlFor="dapat_direkrut" className="text-sm cursor-pointer">
                                Dapat direkrut kembali
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="plain" onClick={() => setExitOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" className="bg-red-600 hover:bg-red-700" loading={exitSaving}
                            disabled={!exitForm.jenis_exit || !exitForm.tanggal_efektif}>
                            Proses Exit
                        </Button>
                    </div>
                    </form>
                </div>
            </Dialog>
        </div>
    )
}