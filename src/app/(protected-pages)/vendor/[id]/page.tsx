'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiPlusCircle, HiOutlinePencilAlt } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { vendorService, Vendor, KontrakVendor } from '@/services/vendor.service'

type Mekanisme = 'unit_only' | 'unit_driver' | 'full'

const MEKANISME_OPTIONS = [
    { value: 'unit_only',   label: 'Unit Only' },
    { value: 'unit_driver', label: 'Unit + Driver' },
    { value: 'full',        label: 'Full' },
]

const AKTIF_OPTIONS = [
    { value: '1', label: 'Aktif' },
    { value: '0', label: 'Nonaktif' },
]

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [vendor, setVendor]   = useState<Vendor | null>(null)
    const [kontraks, setKontraks] = useState<KontrakVendor[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [form, setForm]       = useState<Partial<Vendor>>({})
    const [saving, setSaving]   = useState(false)
    const [showKontrakForm, setShowKontrakForm] = useState(false)
    const [kontrakForm, setKontrakForm] = useState({ mekanisme: 'unit_only' as Mekanisme, nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
    const [addingKontrak, setAddingKontrak] = useState(false)

    const loadData = useCallback(async () => {
        try {
            const [v, k] = await Promise.all([vendorService.get(id), vendorService.listKontrak(id)])
            setVendor(v)
            setForm(v)
            setKontraks(k)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { loadData() }, [loadData])

    const handleSave = async () => {
        setSaving(true)
        try {
            const updated = await vendorService.update(id, form)
            setVendor(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Data vendor berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleKontrakSubmit = async () => {
        setAddingKontrak(true)
        try {
            await vendorService.createKontrak({
                id_vendor: id,
                mekanisme: kontrakForm.mekanisme,
                nilai_kontrak: kontrakForm.nilai_kontrak ? Number(kontrakForm.nilai_kontrak) : undefined,
                tanggal_mulai: kontrakForm.tanggal_mulai || undefined,
                tanggal_selesai: kontrakForm.tanggal_selesai || undefined,
            })
            toast.push(<Notification type="success" title="Kontrak berhasil ditambahkan" />)
            setShowKontrakForm(false)
            setKontrakForm({ mekanisme: 'unit_only', nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
            setKontraks(await vendorService.listKontrak(id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingKontrak(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!vendor) return <div className="p-6 text-red-500">Vendor tidak ditemukan.</div>

    const initial = vendor.nama_vendor?.charAt(0).toUpperCase() ?? 'V'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.VENDOR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{vendor.nama_vendor}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi vendor dan kontrak</p>
                </div>
            </div>

            {/* Vendor info card */}
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                    {initial}
                                </div>
                                <div>
                                    <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{vendor.nama_vendor}</p>
                                    <p className="text-sm text-gray-500 mt-1">{vendor.email ?? 'Tidak ada email'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${vendor.aktif ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                                    {vendor.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                            </div>
                        </div>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {([
                                { label: 'Kode Vendor', value: vendor.kode_vendor },
                                { label: 'Nama Vendor', value: vendor.nama_vendor },
                                { label: 'Telepon',     value: vendor.telepon ?? <span className="text-gray-400">—</span> },
                                { label: 'Email',       value: vendor.email ?? <span className="text-gray-400">—</span> },
                            ]).map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                                </div>
                            ))}
                        </div>
                        {vendor.alamat && (
                            <div className="mt-5">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alamat</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line">{vendor.alamat}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold text-xl flex-shrink-0 select-none">
                                {form.nama_vendor?.charAt(0).toUpperCase() ?? initial}
                            </div>
                            <div>
                                <p className="font-semibold text-base text-gray-800 dark:text-gray-100">Edit Vendor</p>
                                <p className="text-sm text-gray-500 mt-0.5">Perbarui informasi vendor di bawah ini</p>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mb-5" />
                        <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode Vendor">
                                <Input value={form.kode_vendor ?? ''} onChange={(e) => setForm(p => ({ ...p, kode_vendor: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Nama Vendor">
                                <Input value={form.nama_vendor ?? ''} onChange={(e) => setForm(p => ({ ...p, nama_vendor: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Telepon">
                                <Input value={form.telepon ?? ''} onChange={(e) => setForm(p => ({ ...p, telepon: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Email">
                                <Input type="email" value={form.email ?? ''} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select
                                    isSearchable={false}
                                    options={AKTIF_OPTIONS}
                                    value={AKTIF_OPTIONS.find(o => o.value === (form.aktif ? '1' : '0')) ?? null}
                                    onChange={(opt) => opt && setForm(p => ({ ...p, aktif: opt.value === '1' }))}
                                />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Alamat">
                                    <textarea
                                        rows={3}
                                        value={form.alamat ?? ''}
                                        onChange={(e) => setForm(p => ({ ...p, alamat: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                                    />
                                </FormItem>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button type="button" variant="plain" onClick={() => { setEditing(false); setForm(vendor) }}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                        </form>
                    </>
                )}
            </Card>

            {/* Kontrak card */}
            <Card
                header={{
                    content: <h5>Kontrak</h5>,
                    extra: (
                        <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                            onClick={() => setShowKontrakForm(!showKontrakForm)}
                        >
                            Tambah Kontrak
                        </Button>
                    ),
                    bordered: false,
                }}
            >
                {showKontrakForm && (
                    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
                        <form onSubmit={e => { e.preventDefault(); handleKontrakSubmit() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Mekanisme">
                                <Select
                                    isSearchable={false}
                                    value={MEKANISME_OPTIONS.find(o => o.value === kontrakForm.mekanisme) ?? null}
                                    options={MEKANISME_OPTIONS}
                                    onChange={(option) => option && setKontrakForm(p => ({ ...p, mekanisme: option.value as Mekanisme }))}
                                />
                            </FormItem>
                            <FormItem label="Nilai Kontrak">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={kontrakForm.nilai_kontrak ? formatNum(Number(kontrakForm.nilai_kontrak)) : ''}
                                    onChange={(e) => setKontrakForm(p => ({ ...p, nilai_kontrak: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                            <FormItem label="Tanggal Mulai">
                                <DatePicker
                                    value={kontrakForm.tanggal_mulai ? new Date(kontrakForm.tanggal_mulai) : null}
                                    onChange={(date) => setKontrakForm(p => ({ ...p, tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                />
                            </FormItem>
                            <FormItem label="Tanggal Selesai">
                                <DatePicker
                                    value={kontrakForm.tanggal_selesai ? new Date(kontrakForm.tanggal_selesai) : null}
                                    onChange={(date) => setKontrakForm(p => ({ ...p, tanggal_selesai: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                                />
                            </FormItem>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <Button type="submit" variant="solid" loading={addingKontrak}>
                                Simpan Kontrak
                            </Button>
                            <Button type="button" variant="plain" onClick={() => setShowKontrakForm(false)}>Batal</Button>
                        </div>
                        </form>
                    </div>
                )}

                {kontraks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <span className="text-4xl mb-2">📄</span>
                        <p className="text-sm font-medium">Belum ada kontrak</p>
                        <p className="text-xs mt-1">Klik &quot;Tambah Kontrak&quot; untuk menambahkan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-5">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Mekanisme</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nilai Kontrak</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Mulai</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Selesai</th>
                                    <th className="py-3 px-5 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {kontraks.map(k => {
                                    const label = MEKANISME_OPTIONS.find(o => o.value === k.mekanisme)?.label ?? k.mekanisme
                                    const isExpired = k.tanggal_selesai ? dayjs(k.tanggal_selesai).isBefore(dayjs(), 'day') : false
                                    return (
                                        <tr key={k.id_kontrak} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="py-3.5 px-5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-5 font-semibold text-gray-800 dark:text-gray-100 tabular-nums">
                                                {k.nilai_kontrak ? formatRupiah(k.nilai_kontrak) : <span className="text-gray-400 font-normal">—</span>}
                                            </td>
                                            <td className="py-3.5 px-5 text-gray-600 dark:text-gray-400">
                                                {k.tanggal_mulai ? dayjs(k.tanggal_mulai).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3.5 px-5 text-gray-600 dark:text-gray-400">
                                                {k.tanggal_selesai ? dayjs(k.tanggal_selesai).format('DD MMM YYYY') : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-3.5 px-5">
                                                {!k.tanggal_selesai ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Tidak ada masa berlaku</span>
                                                ) : isExpired ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">Kadaluarsa</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Aktif</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}