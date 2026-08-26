'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kontrakVendorService, KontrakVendor } from '@/services/kontrak-vendor.service'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'Full' },
]
const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Only', unit_driver: 'Unit + Driver', full: 'Full',
}

const SATUAN_OPTIONS = [
    { value: 'per trip',  label: 'Per Trip' },
    { value: 'per ton',   label: 'Per Ton' },
    { value: 'per hari',  label: 'Per Hari' },
    { value: 'per bulan', label: 'Per Bulan' },
    { value: 'lumpsum',   label: 'Lumpsum' },
]

const KONTRAK_STATUS_CLASS: Record<string, string> = {
    aktif:   'bg-emerald-100 text-emerald-600',
    selesai: 'bg-blue-100 text-blue-600',
    batal:   'bg-red-100 text-red-500',
}

export default function KontrakVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [data, setData]     = useState<KontrakVendor | null>(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<KontrakVendor> & { nilai_kontrak_str?: string; rate_str?: string; pajak_str?: string; termin_str?: string }>({})
    const [saving, setSaving]   = useState(false)

    const toFormState = (d: KontrakVendor) => ({
        ...d,
        nilai_kontrak_str: d.nilai_kontrak ? String(d.nilai_kontrak) : '',
        rate_str:          d.rate != null ? String(d.rate) : '',
        pajak_str:         d.pajak_persen != null ? String(d.pajak_persen) : '',
        termin_str:        d.termin_pembayaran_hari != null ? String(d.termin_pembayaran_hari) : '',
    })

    useEffect(() => {
        kontrakVendorService.get(id)
            .then(d => {
                setData(d)
                setForm(toFormState(d))
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await kontrakVendorService.update(id, {
                mekanisme:       form.mekanisme,
                nomor_kontrak:   form.nomor_kontrak?.trim() || null,
                jenis_layanan:   form.jenis_layanan?.trim() || null,
                rate:            form.rate_str ? Number(form.rate_str) : null,
                satuan:          form.satuan || null,
                pajak_persen:    form.pajak_str ? Number(form.pajak_str) : null,
                termin_pembayaran_hari: form.termin_str ? Number(form.termin_str) : null,
                nilai_kontrak:   Number(form.nilai_kontrak_str || '0'),
                tanggal_mulai:   form.tanggal_mulai ?? null,
                tanggal_selesai: form.tanggal_selesai ?? null,
                status:          form.status ?? null,
            })
            setData(updated)
            setForm(toFormState(updated))
            setEditing(false)
            toast.push(<Notification type="success" title="Kontrak berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!data) return <div className="p-6 text-red-500">Kontrak tidak ditemukan.</div>

    const vendorName = data.vendor?.nama_vendor ?? 'Kontrak Vendor'
    const initial = vendorName.charAt(0).toUpperCase()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.KONTRAK_VENDOR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{vendorName}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme}</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{vendorName}</p>
                                    <p className="text-sm text-gray-500 mt-1">{MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {data.status && (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${KONTRAK_STATUS_CLASS[data.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                        {data.status}
                                    </span>
                                )}
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Vendor',            value: vendorName },
                                { label: 'Mekanisme',         value: MEKANISME_LABEL[data.mekanisme] ?? data.mekanisme },
                                { label: 'No. Kontrak',       value: data.nomor_kontrak ?? <span className="text-gray-400">—</span> },
                                { label: 'Jenis Layanan',     value: data.jenis_layanan ?? <span className="text-gray-400">—</span> },
                                { label: 'Nilai Kontrak',     value: data.nilai_kontrak ? formatRupiah(data.nilai_kontrak) : <span className="text-gray-400">—</span> },
                                { label: 'Rate',              value: data.rate ? formatRupiah(data.rate) : <span className="text-gray-400">—</span> },
                                { label: 'Satuan',            value: data.satuan ?? <span className="text-gray-400">—</span> },
                                { label: 'Pajak',             value: data.pajak_persen != null ? `${data.pajak_persen} %` : <span className="text-gray-400">—</span> },
                                { label: 'Termin Pembayaran', value: data.termin_pembayaran_hari != null ? `${data.termin_pembayaran_hari} hari` : <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Mulai',     value: data.tanggal_mulai ?? <span className="text-gray-400">—</span> },
                                { label: 'Tanggal Selesai',   value: data.tanggal_selesai ?? <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                {initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Kontrak Vendor</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi kontrak di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Mekanisme">
                                <Select isSearchable={false} options={MEKANISME_OPTIONS}
                                    value={MEKANISME_OPTIONS.find(o => o.value === form.mekanisme) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, mekanisme: opt?.value as KontrakVendor['mekanisme'] }))} />
                            </FormItem>
                            <FormItem label="No. Kontrak">
                                <Input placeholder="Nomor kontrak" value={form.nomor_kontrak ?? ''}
                                    onChange={e => setForm(p => ({ ...p, nomor_kontrak: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Jenis Layanan">
                                <Input placeholder="mis. Angkutan kontainer" value={form.jenis_layanan ?? ''}
                                    onChange={e => setForm(p => ({ ...p, jenis_layanan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nilai Kontrak">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.nilai_kontrak_str ? formatNum(Number(form.nilai_kontrak_str)) : ''}
                                    onChange={e => setForm(p => ({ ...p, nilai_kontrak_str: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Rate">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.rate_str ? formatNum(Number(form.rate_str)) : ''}
                                    onChange={e => setForm(p => ({ ...p, rate_str: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Satuan">
                                <Select isSearchable={false} isClearable placeholder="Pilih satuan..."
                                    options={SATUAN_OPTIONS}
                                    value={SATUAN_OPTIONS.find(o => o.value === form.satuan) ?? null}
                                    onChange={opt => setForm(p => ({ ...p, satuan: opt?.value ?? null }))} />
                            </FormItem>
                            <FormItem label="Pajak">
                                <Input suffix="%" placeholder="0"
                                    value={form.pajak_str ?? ''}
                                    onChange={e => {
                                        const v = e.target.value.replace(/\D/g, '')
                                        setForm(p => ({ ...p, pajak_str: v && Number(v) > 100 ? '100' : v }))
                                    }} />
                            </FormItem>
                            <FormItem label="Termin Pembayaran">
                                <Input suffix="hari" placeholder="0"
                                    value={form.termin_str ?? ''}
                                    onChange={e => setForm(p => ({ ...p, termin_str: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Tanggal Mulai">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_mulai ? dayjs(form.tanggal_mulai).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : null }))} />
                            </FormItem>
                            <FormItem label="Tanggal Selesai">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={form.tanggal_selesai ? dayjs(form.tanggal_selesai).toDate() : null}
                                    onChange={date => setForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : null }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => {
                                setEditing(false)
                                setForm(toFormState(data))
                            }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
                {!editing && (
                    <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.back()}>Batal</Button>
                    </div>
                )}
            </Card>

        </div>
    )
}