'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiPlusCircle, HiTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, FakturItem } from '@/services/faktur.service'

const emptyItem = (): FakturItem => ({ deskripsi: '', qty: 1, harga_satuan: 0, subtotal: 0 })

export default function FakturBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState({ nomor_faktur: '', tanggal_faktur: '', jatuh_tempo: '' })
    const [items, setItems] = useState<FakturItem[]>([emptyItem()])
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Partial<typeof form>>({})

    const validate = () => {
        const e: Partial<typeof form> = {}
        if (!form.nomor_faktur.trim()) e.nomor_faktur = 'Nomor faktur wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const handleItemChange = (idx: number, field: keyof FakturItem, value: string) => {
        setItems(prev => {
            const next = [...prev]
            const item = { ...next[idx] }
            if (field === 'qty' || field === 'harga_satuan') {
                (item as Record<string, unknown>)[field] = Number(value)
                item.subtotal = (field === 'qty' ? Number(value) : item.qty) * (field === 'harga_satuan' ? Number(value) : item.harga_satuan)
            } else {
                (item as Record<string, unknown>)[field] = value
            }
            next[idx] = item
            return next
        })
    }

    const total = items.reduce((sum, i) => sum + i.subtotal, 0)

    const handleSubmit = async () => {
        if (!validate()) return
        setLoading(true)
        try {
            await fakturService.create({
                nomor_faktur: form.nomor_faktur,
                tanggal_faktur: form.tanggal_faktur || undefined,
                jatuh_tempo: form.jatuh_tempo || undefined,
                items,
            })
            toast.push(<Notification type="success" title="Faktur berhasil dibuat" />)
            router.push(ROUTES.FAKTUR)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Buat Faktur</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Buat faktur baru untuk klien</p>
                </div>
            </div>

            <Card className="mb-4">
                <div className="grid grid-cols-2 gap-x-4">
                    <FormItem label="Nomor Faktur" asterisk invalid={!!errors.nomor_faktur} errorMessage={errors.nomor_faktur}>
                        <Input placeholder="INV-001" value={form.nomor_faktur} invalid={!!errors.nomor_faktur} onChange={(e) => setForm(p => ({ ...p, nomor_faktur: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Tanggal Faktur">
                        <DatePicker
                            value={form.tanggal_faktur ? new Date(form.tanggal_faktur) : null}
                            onChange={(date) => setForm(p => ({ ...p, tanggal_faktur: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                        />
                    </FormItem>
                    <FormItem label="Jatuh Tempo">
                        <DatePicker
                            value={form.jatuh_tempo ? new Date(form.jatuh_tempo) : null}
                            onChange={(date) => setForm(p => ({ ...p, jatuh_tempo: date ? dayjs(date).format('YYYY-MM-DD') : '' }))}
                        />
                    </FormItem>
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h5>Item Faktur</h5>
                    <Button variant="plain" size="sm" icon={<HiPlusCircle />} onClick={() => setItems(p => [...p, emptyItem()])}>
                        Tambah Item
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="py-2 text-left text-gray-500 font-medium pr-3">Deskripsi</th>
                                <th className="py-2 text-left text-gray-500 font-medium pr-3 w-20">Qty</th>
                                <th className="py-2 text-left text-gray-500 font-medium pr-3 w-36">Harga Satuan</th>
                                <th className="py-2 text-right text-gray-500 font-medium pr-3 w-36">Subtotal</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={idx} className="border-b last:border-b-0">
                                    <td className="py-2 pr-3">
                                        <Input size="sm" placeholder="Deskripsi item" value={item.deskripsi} onChange={(e) => handleItemChange(idx, 'deskripsi', e.target.value)} />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <Input size="sm" type="number" value={item.qty} min={1} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} />
                                    </td>
                                    <td className="py-2 pr-3">
                                        <Input
                                            size="sm"
                                            prefix="Rp"
                                            placeholder="0"
                                            value={item.harga_satuan ? formatNum(item.harga_satuan) : ''}
                                            onChange={(e) => handleItemChange(idx, 'harga_satuan', e.target.value.replace(/\D/g, ''))}
                                        />
                                    </td>
                                    <td className="py-2 pr-3 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                                    <td className="py-2 text-center">
                                        {items.length > 1 && (
                                            <span
                                                className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                                onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                                            >
                                                <HiTrash className="text-base" />
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t">
                                <td colSpan={3} className="py-3 text-right font-semibold pr-3">Total</td>
                                <td className="py-3 text-right font-bold pr-3">{formatRupiah(total)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="plain" onClick={() => router.back()}>Batal</Button>
                    <Button
                        variant="solid"
                        customColorClass={() => 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white border-emerald-500'}
                        loading={loading}
                        onClick={handleSubmit}
                    >
                        Simpan Faktur
                    </Button>
                </div>
            </Card>
        </div>
    )
}
