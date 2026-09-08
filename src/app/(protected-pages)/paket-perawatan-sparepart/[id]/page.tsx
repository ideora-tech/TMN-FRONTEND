'use client'
import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiPlusCircle, HiOutlinePencilAlt, HiOutlineTrash } from 'react-icons/hi'
import { paketPerawatanSparepartService, PaketPerawatanSparepart } from '@/services/paketPerawatanSparepart.service'
import { jenisPerawatanService } from '@/services/jenisPerawatan.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'

interface ComboState {
    id_jenis_perawatan: string
    id_jenis_kendaraan: string
}

interface ItemForm {
    id_row: string | null
    id_sparepart: string
    qty_standar: string
}

type Option = { value: string; label: string }

const INIT: ComboState = { id_jenis_perawatan: '', id_jenis_kendaraan: '' }

export default function PaketPerawatanSparepartDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [rows, setRows] = useState<PaketPerawatanSparepart[]>([])
    const [combo, setCombo] = useState<ComboState>(INIT)
    const [items, setItems] = useState<ItemForm[]>([])
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [jenisPerawatanOptions, setJenisPerawatanOptions] = useState<Option[]>([])
    const [jenisKendaraanOptions, setJenisKendaraanOptions] = useState<Option[]>([])
    const [sparepartOptions, setSparepartOptions] = useState<Option[]>([])
    const [errors, setErrors] = useState<Partial<Record<keyof ComboState, string>>>({})
    const [itemError, setItemError] = useState('')
    const [submitErrors, setSubmitErrors] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    const toItems = (data: PaketPerawatanSparepart[]): ItemForm[] =>
        data.map(r => ({ id_row: r.id_paket_perawatan_sparepart, id_sparepart: r.id_sparepart, qty_standar: String(r.qty_standar) }))

    const muatPaket = useCallback(async (idAnchor: string) => {
        const anchor = await paketPerawatanSparepartService.get(idAnchor)
        const res = await paketPerawatanSparepartService.list({
            id_jenis_perawatan: anchor.id_jenis_perawatan,
            id_jenis_kendaraan: anchor.id_jenis_kendaraan,
            limit: 200,
        })
        setRows(res.data)
        setCombo({ id_jenis_perawatan: anchor.id_jenis_perawatan, id_jenis_kendaraan: anchor.id_jenis_kendaraan })
        setItems(toItems(res.data))
    }, [])

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

    useEffect(() => {
        muatPaket(id)
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false))
    }, [id, muatPaket])

    const updateItem = (index: number, patch: Partial<ItemForm>) => {
        setItems(prev => {
            const next = [...prev]
            next[index] = { ...next[index], ...patch }
            return next
        })
    }

    const batalEdit = () => {
        setEditing(false)
        setErrors({})
        setItemError('')
        setSubmitErrors([])
        setCombo(rows.length > 0
            ? { id_jenis_perawatan: rows[0].id_jenis_perawatan, id_jenis_kendaraan: rows[0].id_jenis_kendaraan }
            : INIT)
        setItems(toItems(rows))
    }

    const validate = () => {
        const e: Partial<Record<keyof ComboState, string>> = {}
        if (!combo.id_jenis_perawatan) e.id_jenis_perawatan = 'Jenis perawatan wajib diisi'
        if (!combo.id_jenis_kendaraan) e.id_jenis_kendaraan = 'Jenis kendaraan wajib diisi'
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
        if (!validate() || !validateItems()) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }
        setSaving(true)
        const gagal: string[] = []
        const namaItem = (idSparepart: string, i: number) =>
            sparepartOptions.find(o => o.value === idSparepart)?.label ?? `Item ${i + 1}`

        const idBertahan = new Set(items.filter(it => it.id_row).map(it => it.id_row as string))
        const dihapus = rows.filter(r => !idBertahan.has(r.id_paket_perawatan_sparepart))
        for (const r of dihapus) {
            try {
                await paketPerawatanSparepartService.delete(r.id_paket_perawatan_sparepart)
            } catch (err) {
                gagal.push(`Hapus ${r.nama_sparepart ?? r.id_sparepart}: ${parseApiError(err)}`)
            }
        }

        let idAnchorBaru: string | null = null
        for (let i = 0; i < items.length; i++) {
            const it = items[i]
            try {
                if (it.id_row) {
                    const updated = await paketPerawatanSparepartService.update(it.id_row, {
                        id_jenis_perawatan: combo.id_jenis_perawatan,
                        id_jenis_kendaraan: combo.id_jenis_kendaraan,
                        id_sparepart: it.id_sparepart,
                        qty_standar: parseInt(it.qty_standar),
                    })
                    idAnchorBaru ??= updated.id_paket_perawatan_sparepart
                } else {
                    const dibuat = await paketPerawatanSparepartService.create({
                        id_jenis_perawatan: combo.id_jenis_perawatan,
                        id_jenis_kendaraan: combo.id_jenis_kendaraan,
                        id_sparepart: it.id_sparepart,
                        qty_standar: parseInt(it.qty_standar),
                    })
                    idAnchorBaru ??= dibuat.id_paket_perawatan_sparepart
                }
            } catch (err) {
                gagal.push(`${namaItem(it.id_sparepart, i)}: ${parseApiError(err)}`)
            }
        }
        setSaving(false)

        if (gagal.length > 0) {
            setSubmitErrors(gagal)
            toast.push(<Notification type="danger" title={`${gagal.length} perubahan gagal disimpan`} />)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            toast.push(<Notification type="success" title="Paket sparepart berhasil diperbarui" />)
        }

        const anchor = idBertahan.has(id) ? id : idAnchorBaru
        if (!anchor) {
            router.push(ROUTES.SPAREPART_TAB_PAKET)
            return
        }
        try {
            await muatPaket(anchor)
            setEditing(gagal.length > 0)
            if (anchor !== id) router.replace(ROUTES.PAKET_PERAWATAN_SPAREPART_DETAIL(anchor))
        } catch {
            router.push(ROUTES.SPAREPART_TAB_PAKET)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (notFound) return <div className="p-6 text-red-500">Paket sparepart tidak ditemukan.</div>

    const namaJenisPerawatan = rows[0]?.nama_jenis_perawatan
        ?? jenisPerawatanOptions.find(o => o.value === combo.id_jenis_perawatan)?.label ?? '—'
    const namaJenisKendaraan = rows[0]?.nama_jenis_kendaraan
        ?? jenisKendaraanOptions.find(o => o.value === combo.id_jenis_kendaraan)?.label ?? '—'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.SPAREPART_TAB_PAKET)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{editing ? 'Ubah Paket Sparepart' : 'Detail Paket Sparepart'}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Satu paket = daftar sparepart standar per kombinasi jenis perawatan &amp; jenis kendaraan</p>
                </div>
            </div>
            <Card>
                {!editing ? (
                    <>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{namaJenisPerawatan}</p>
                                <p className="text-sm text-gray-500 mt-0.5">{namaJenisKendaraan}</p>
                            </div>
                            <Tooltip title="Edit">
                                <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)} />
                            </Tooltip>
                        </div>
                        <div className="overflow-x-auto mt-5">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="text-left text-gray-600 dark:text-gray-300">
                                        <th className="px-3 py-2 font-semibold">Sparepart</th>
                                        <th className="px-3 py-2 font-semibold w-40">Qty Standar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {rows.map(r => (
                                        <tr key={r.id_paket_perawatan_sparepart}>
                                            <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200">{r.nama_sparepart ?? '—'}</td>
                                            <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                                                {r.qty_standar} {r.satuan_sparepart ?? ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="default" icon={<HiArrowLeft />}
                                onClick={() => router.push(ROUTES.SPAREPART_TAB_PAKET)}>Batal</Button>
                        </div>
                    </>
                ) : (
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
                                    value={jenisPerawatanOptions.find(o => o.value === combo.id_jenis_perawatan) ?? null}
                                    onChange={opt => setCombo(p => ({ ...p, id_jenis_perawatan: opt?.value ?? '' }))} />
                            </FormItem>
                            <FormItem label="Jenis Kendaraan" asterisk invalid={!!errors.id_jenis_kendaraan} errorMessage={errors.id_jenis_kendaraan}>
                                <Select<Option> isSearchable placeholder="Pilih jenis kendaraan..."
                                    options={jenisKendaraanOptions}
                                    value={jenisKendaraanOptions.find(o => o.value === combo.id_jenis_kendaraan) ?? null}
                                    onChange={opt => setCombo(p => ({ ...p, id_jenis_kendaraan: opt?.value ?? '' }))} />
                            </FormItem>
                        </div>

                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-semibold text-gray-800 dark:text-gray-100">Daftar Sparepart</p>
                                <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                    onClick={() => setItems(prev => [...prev, { id_row: null, id_sparepart: '', qty_standar: '' }])}>
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
                                            <tr key={it.id_row ?? `baru-${i}`} className="border-b border-gray-100 dark:border-gray-700 align-top">
                                                <td className="px-3 py-2">
                                                    <Select<Option> isSearchable placeholder="Pilih sparepart..."
                                                        options={sparepartOptions.filter(o => o.value === it.id_sparepart || !items.some(x => x.id_sparepart === o.value))}
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
                            <Button type="button" variant="plain" onClick={batalEdit}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan Perubahan</Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    )
}
