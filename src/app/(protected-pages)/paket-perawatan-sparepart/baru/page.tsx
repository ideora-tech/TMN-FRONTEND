'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiPlusCircle, HiOutlineTrash } from 'react-icons/hi'
import { paketPerawatanSparepartService } from '@/services/paketPerawatanSparepart.service'
import { jenisPerawatanService } from '@/services/jenisPerawatan.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'

interface FormState {
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
}

interface ItemForm {
    id_sparepart: string
    qty_standar: string
}

type Option = { value: string; label: string }

const INIT: FormState = { id_jenis_perawatan: '', id_jenis_kendaraan: '' }
const ITEM_KOSONG: ItemForm = { id_sparepart: '', qty_standar: '' }

export default function PaketPerawatanSparepartBaruPage() {
    const router = useRouter()
    const [form, setForm] = useState<FormState>(INIT)
    const [items, setItems] = useState<ItemForm[]>([{ ...ITEM_KOSONG }])
    const [saving, setSaving] = useState(false)
    const [jenisPerawatanOptions, setJenisPerawatanOptions] = useState<Option[]>([])
    const [jenisKendaraanOptions, setJenisKendaraanOptions] = useState<Option[]>([])
    const [sparepartOptions, setSparepartOptions] = useState<Option[]>([])
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
    const [itemError, setItemError] = useState('')
    const [submitErrors, setSubmitErrors] = useState<string[]>([])

    useEffect(() => {
        jenisPerawatanService.list(1, 100)
            .then(res => setJenisPerawatanOptions(res.data.filter(j => j.aktif).map(j => ({ value: j.id_jenis_perawatan, label: j.nama }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisKendaraanOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        sparepartService.list({ page: 1, limit: 100 })
            .then(res => setSparepartOptions(res.data.filter((s: Sparepart) => s.aktif).map((s: Sparepart) => ({ value: s.id_sparepart, label: `${s.nama} (${s.satuan})` }))))
            .catch(() => {})
    }, [])

    const set = (field: keyof FormState, value: string) => setForm(p => ({ ...p, [field]: value }))

    const updateItem = (index: number, patch: Partial<ItemForm>) => {
        setItems(prev => {
            const next = [...prev]
            next[index] = { ...next[index], ...patch }
            return next
        })
    }

    const validate = () => {
        const e: Partial<Record<keyof FormState, string>> = {}
        if (!form.id_jenis_perawatan) e.id_jenis_perawatan = 'Jenis perawatan wajib diisi'
        if (!form.id_jenis_kendaraan) e.id_jenis_kendaraan = 'Jenis kendaraan wajib diisi'
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const validateItems = () => {
        if (items.length === 0) {
            setItemError('Tambahkan minimal 1 sparepart')
            return false
        }
        const invalid = items.some(it => !it.id_sparepart || !it.qty_standar || parseInt(it.qty_standar) <= 0)
        if (invalid) {
            setItemError('Setiap item wajib punya sparepart dan qty standar')
            return false
        }
        const ids = items.map(it => it.id_sparepart)
        if (new Set(ids).size !== ids.length) {
            setItemError('Sparepart tidak boleh sama dalam satu paket')
            return false
        }
        setItemError('')
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitErrors([])
        const validTop = validate()
        const validItems = validateItems()
        if (!validTop || !validItems) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        const failed: string[] = []
        const succeededIndexes: number[] = []
        for (let i = 0; i < items.length; i++) {
            try {
                await paketPerawatanSparepartService.create({
                    id_jenis_perawatan: form.id_jenis_perawatan,
                    id_jenis_kendaraan: form.id_jenis_kendaraan,
                    id_sparepart: items[i].id_sparepart,
                    qty_standar: parseInt(items[i].qty_standar),
                })
                succeededIndexes.push(i)
            } catch (err) {
                const nama = sparepartOptions.find(o => o.value === items[i].id_sparepart)?.label ?? `Item ${i + 1}`
                failed.push(`${nama}: ${parseApiError(err)}`)
            }
        }
        setSaving(false)

        if (failed.length === 0) {
            toast.push(<Notification type="success" title="Paket sparepart berhasil ditambahkan" />)
            router.push(ROUTES.PAKET_PERAWATAN_SPAREPART)
            return
        }
        setSubmitErrors(failed)
        if (succeededIndexes.length > 0) {
            setItems(prev => prev.filter((_, idx) => !succeededIndexes.includes(idx)))
            toast.push(<Notification type="warning" title={`${succeededIndexes.length} item tersimpan, ${failed.length} gagal`} />)
        } else {
            toast.push(<Notification type="danger" title="Semua item gagal disimpan" />)
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PAKET_PERAWATAN_SPAREPART)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">Tambah Paket Sparepart</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Pilih jenis perawatan &amp; jenis kendaraan, lalu tambahkan sparepart yang dibutuhkan</p>
                </div>
            </div>
            <Card>
                <form onSubmit={handleSubmit}>
                    {submitErrors.length > 0 && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
                            <ul className="list-disc list-inside">
                                {submitErrors.map((msg, i) => <li key={i}>{msg}</li>)}
                            </ul>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Jenis Perawatan" asterisk invalid={!!errors.id_jenis_perawatan} errorMessage={errors.id_jenis_perawatan}>
                            <Select<Option> isSearchable placeholder="Pilih jenis perawatan..."
                                options={jenisPerawatanOptions}
                                value={jenisPerawatanOptions.find(o => o.value === form.id_jenis_perawatan) ?? null}
                                onChange={opt => set('id_jenis_perawatan', opt?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Jenis Kendaraan" asterisk invalid={!!errors.id_jenis_kendaraan} errorMessage={errors.id_jenis_kendaraan}>
                            <Select<Option> isSearchable placeholder="Pilih jenis kendaraan..."
                                options={jenisKendaraanOptions}
                                value={jenisKendaraanOptions.find(o => o.value === form.id_jenis_kendaraan) ?? null}
                                onChange={opt => set('id_jenis_kendaraan', opt?.value ?? '')} />
                        </FormItem>
                    </div>

                    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-gray-800 dark:text-gray-100">Daftar Sparepart</p>
                            <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                onClick={() => setItems(prev => [...prev, { ...ITEM_KOSONG }])}>
                                Tambah Item
                            </Button>
                        </div>
                        {itemError && <p className="text-red-500 text-sm mb-2">{itemError}</p>}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="text-left text-gray-600 dark:text-gray-300">
                                        <th className="px-3 py-2 font-semibold min-w-[220px]">Sparepart</th>
                                        <th className="px-3 py-2 font-semibold w-40">Qty Standar</th>
                                        <th className="px-3 py-2 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, i) => (
                                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700 align-top">
                                            <td className="px-3 py-2">
                                                <Select<Option> isSearchable placeholder="Pilih sparepart..."
                                                    options={sparepartOptions}
                                                    value={sparepartOptions.find(o => o.value === it.id_sparepart) ?? null}
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                    onChange={opt => updateItem(i, { id_sparepart: opt?.value ?? '' })} />
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input type="number" step="1" min="1" placeholder="Contoh: 6"
                                                    value={it.qty_standar}
                                                    onChange={e => updateItem(i, { qty_standar: e.target.value.replace(/\D/g, '') })} />
                                            </td>
                                            <td className="px-3 py-2 pt-3">
                                                <span
                                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-200 cursor-pointer transition-colors"
                                                    onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                                                ><HiOutlineTrash /></span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.push(ROUTES.PAKET_PERAWATAN_SPAREPART)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan Paket</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
