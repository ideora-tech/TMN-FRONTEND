'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiPlusCircle } from 'react-icons/hi'
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

export default function VendorDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [vendor, setVendor]   = useState<Vendor | null>(null)
    const [kontraks, setKontraks] = useState<KontrakVendor[]>([])
    const [loading, setLoading] = useState(true)
    const [showKontrakForm, setShowKontrakForm] = useState(false)
    const [kontrakForm, setKontrakForm] = useState({ mekanisme: 'unit_only' as Mekanisme, nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
    const [addingKontrak, setAddingKontrak] = useState(false)

    const loadData = async () => {
        try {
            const [v, k] = await Promise.all([vendorService.get(params.id), vendorService.listKontrak(params.id)])
            setVendor(v)
            setKontraks(k)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { loadData() }, [params.id])

    const handleKontrakSubmit = async () => {
        setAddingKontrak(true)
        try {
            await vendorService.createKontrak({
                id_vendor: params.id,
                mekanisme: kontrakForm.mekanisme,
                nilai_kontrak: kontrakForm.nilai_kontrak ? Number(kontrakForm.nilai_kontrak) : undefined,
                tanggal_mulai: kontrakForm.tanggal_mulai || undefined,
                tanggal_selesai: kontrakForm.tanggal_selesai || undefined,
            })
            toast.push(<Notification type="success" title="Kontrak berhasil ditambahkan" />)
            setShowKontrakForm(false)
            setKontrakForm({ mekanisme: 'unit_only', nilai_kontrak: '', tanggal_mulai: '', tanggal_selesai: '' })
            setKontraks(await vendorService.listKontrak(params.id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAddingKontrak(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!vendor) return <div className="p-6 text-red-500">Vendor tidak ditemukan.</div>

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

            <Card className="mb-4">
                <div className="flex flex-col gap-0">
                    {[
                        { label: 'Kontak', value: vendor.kontak ?? '-' },
                        { label: 'Email',  value: vendor.email  ?? '-' },
                        { label: 'Alamat', value: vendor.alamat ?? '-' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-medium">{value}</span>
                        </div>
                    ))}
                </div>
            </Card>

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
                        <div className="flex flex-col gap-1">
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
                            <Button variant="solid" loading={addingKontrak} onClick={handleKontrakSubmit}>
                                Simpan Kontrak
                            </Button>
                            <Button variant="plain" onClick={() => setShowKontrakForm(false)}>Batal</Button>
                        </div>
                    </div>
                )}

                {kontraks.length === 0 ? (
                    <div className="text-gray-400 text-sm py-4">Belum ada kontrak.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 text-left text-gray-500 font-medium pr-4">Mekanisme</th>
                                    <th className="py-2 text-left text-gray-500 font-medium pr-4">Nilai</th>
                                    <th className="py-2 text-left text-gray-500 font-medium pr-4">Mulai</th>
                                    <th className="py-2 text-left text-gray-500 font-medium">Selesai</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kontraks.map(k => (
                                    <tr key={k.id_kontrak} className="border-b last:border-b-0">
                                        <td className="py-2 pr-4">{k.mekanisme}</td>
                                        <td className="py-2 pr-4">{k.nilai_kontrak ? formatRupiah(k.nilai_kontrak) : '-'}</td>
                                        <td className="py-2 pr-4">{k.tanggal_mulai ?? '-'}</td>
                                        <td className="py-2">{k.tanggal_selesai ?? '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
