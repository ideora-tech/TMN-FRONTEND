'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, DatePicker, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { fakturService, Faktur } from '@/services/faktur.service'

type EditItemRow = { deskripsi: string; qty: string; harga_satuan: string }

const STATUS_CLASS: Record<string, string> = {
    draft:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    terkirim: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    lunas:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    batal:    'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
    draft: 'Draft', terkirim: 'Terkirim', lunas: 'Lunas', batal: 'Batal',
}

// Transisi status yang diizinkan (mengikuti pola halaman Penawaran)
const NEXT_STATUS: Record<string, string[]> = {
    draft:    ['terkirim', 'batal'],
    terkirim: ['lunas', 'batal'],
    lunas:    [],
    batal:    [],
}

const RIWAYAT_LABEL: Record<string, string> = {
    draft: 'Dibuat', diedit: 'Diedit', terkirim: 'Terkirim', lunas: 'Lunas', batal: 'Dibatalkan',
}

const RIWAYAT_TAG: Record<string, string> = {
    draft:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    diedit:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    terkirim: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    lunas:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    batal:    'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400',
}

const RIWAYAT_BORDER: Record<string, string> = {
    draft:    'border-l-gray-400',
    diedit:   'border-l-amber-400',
    terkirim: 'border-l-blue-400',
    lunas:    'border-l-emerald-400',
    batal:    'border-l-red-400',
}

export default function FakturDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [faktur, setFaktur]     = useState<Faktur | null>(null)
    const [loading, setLoading]   = useState(true)
    const [updating, setUpdating] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<string | null>(null)

    const [editOpen, setEditOpen]           = useState(false)
    const [editTanggal, setEditTanggal]     = useState('')
    const [editJatuhTempo, setEditJatuhTempo] = useState('')
    const [editItems, setEditItems]         = useState<EditItemRow[]>([])
    const [savingEdit, setSavingEdit]       = useState(false)

    const openEdit = () => {
        if (!faktur) return
        setEditTanggal(faktur.tanggal_faktur ?? '')
        setEditJatuhTempo(faktur.jatuh_tempo ?? '')
        setEditItems((faktur.items ?? []).map(it => ({
            deskripsi: it.deskripsi,
            qty: String(it.qty),
            harga_satuan: String(it.harga_satuan),
        })))
        setEditOpen(true)
    }

    const setEditRow = (index: number, patch: Partial<EditItemRow>) =>
        setEditItems(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))

    const tambahEditRow = () => setEditItems(prev => [...prev, { deskripsi: '', qty: '1', harga_satuan: '' }])
    const hapusEditRow  = (index: number) => setEditItems(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

    const totalEdit = editItems.reduce((sum, r) => sum + (Number(r.qty) || 0) * (Number(r.harga_satuan) || 0), 0)
    const editValid = editItems.length > 0 && editItems.every(r => r.deskripsi.trim() !== '' && (Number(r.qty) || 0) > 0)

    const handleSaveEdit = async () => {
        if (!editValid) return
        setSavingEdit(true)
        try {
            const updated = await fakturService.update(id, {
                tanggal_faktur: editTanggal || null,
                jatuh_tempo: editJatuhTempo || null,
                items: editItems.map(r => ({
                    deskripsi: r.deskripsi.trim(),
                    qty: Number(r.qty),
                    harga_satuan: Number(r.harga_satuan) || 0,
                })),
            })
            setFaktur(updated)
            setEditOpen(false)
            toast.push(<Notification type="success" title="Invoice berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingEdit(false)
        }
    }

    useEffect(() => {
        fakturService.get(id)
            .then(setFaktur)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    const handleStatus = async (status: string) => {
        setUpdating(true)
        try {
            const updated = await fakturService.updateStatus(id, status)
            setFaktur(updated)
            toast.push(<Notification type="success" title={`Invoice ditandai ${STATUS_LABEL[status] ?? status}`} />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUpdating(false)
            setPendingStatus(null)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!faktur) return <div className="p-6 text-red-500">Invoice tidak ditemukan.</div>

    const initial = faktur.nomor_faktur?.charAt(0).toUpperCase() ?? 'F'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.FAKTUR)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{faktur.nomor_faktur}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan pembayaran invoice</p>
                </div>
            </div>

            {/* Ubah status faktur — gaya sama dengan halaman Penawaran */}
            {(NEXT_STATUS[faktur.status] ?? []).length > 0 && (
                <Card className="border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Ubah Status Invoice
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Status saat ini: <span className="font-semibold">{STATUS_LABEL[faktur.status] ?? faktur.status}</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(NEXT_STATUS[faktur.status] ?? []).map(s => (
                                <Button
                                    key={s}
                                    size="sm"
                                    variant="default"
                                    className={`${STATUS_CLASS[s]} border border-current`}
                                    onClick={() => setPendingStatus(s)}
                                >
                                    {`-> ${STATUS_LABEL[s]}`}
                                </Button>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            <ConfirmDialog
                isOpen={!!pendingStatus}
                type={pendingStatus === 'batal' ? 'danger' : 'info'}
                title="Ubah Status Invoice"
                confirmText="Ya, Ubah"
                cancelText="Batal"
                confirmButtonProps={{ loading: updating }}
                onClose={() => setPendingStatus(null)}
                onCancel={() => setPendingStatus(null)}
                onConfirm={() => pendingStatus && handleStatus(pendingStatus)}
            >
                <p className="text-sm">
                    Ubah status invoice ke{' '}
                    <span className="font-semibold">{pendingStatus ? STATUS_LABEL[pendingStatus] : ''}</span>?{' '}
                    Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            <Card>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-xl flex-shrink-0 select-none">
                            {initial}
                        </div>
                        <div>
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">{faktur.nomor_faktur}</p>
                            <p className="text-sm text-gray-500 mt-1">{formatRupiah(faktur.total)}</p>
                        </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_CLASS[faktur.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[faktur.status] ?? faktur.status}
                    </span>
                </div>

                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {([
                        { label: 'Nomor Invoice',   value: faktur.nomor_faktur },
                        { label: 'Total',           value: <span className="font-semibold">{formatRupiah(faktur.total)}</span> },
                        { label: 'Tanggal Invoice', value: faktur.tanggal_faktur ?? <span className="text-gray-400">—</span> },
                        { label: 'Jatuh Tempo',    value: faktur.jatuh_tempo ?? <span className="text-gray-400">—</span> },
                    ]).map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Dibuat</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {faktur.dibuat_oleh_nama ?? '—'}
                            {faktur.dibuat_pada && <span className="text-xs text-gray-400"> · {dayjs(faktur.dibuat_pada).format('DD/MM/YYYY HH:mm')}</span>}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Terakhir Diubah</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {faktur.diubah_pada ? (
                                <>
                                    {faktur.diubah_oleh_nama ?? '—'}
                                    <span className="text-xs text-gray-400"> · {dayjs(faktur.diubah_pada).format('DD/MM/YYYY HH:mm')}</span>
                                </>
                            ) : <span className="text-gray-400">Belum pernah diubah</span>}
                        </p>
                    </div>
                </div>

            </Card>

            {faktur.riwayat_status && faktur.riwayat_status.length > 0 && (
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">Riwayat Invoice</p>
                    <div className="flex flex-col gap-2">
                        {faktur.riwayat_status.map((r, i) => (
                            <div key={i}
                                className={`rounded-lg border border-gray-200 dark:border-gray-600 border-l-4 ${RIWAYAT_BORDER[r.status] ?? 'border-l-gray-300'} bg-gray-50 p-3 dark:bg-gray-800`}>
                                <div className="flex justify-between items-start">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${RIWAYAT_TAG[r.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-100'}`}>
                                        {RIWAYAT_LABEL[r.status] ?? r.status}
                                    </span>
                                    <span className="text-xs text-gray-400">{r.waktu ? dayjs(r.waktu).format('DD/MM/YYYY HH:mm') : '—'}</span>
                                </div>
                                {r.oleh && <div className="text-xs text-gray-400 mt-2">Oleh: {r.oleh}</div>}
                                {r.keterangan && <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{r.keterangan}</div>}
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {faktur.items && faktur.items.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Item Invoice</p>
                        {faktur.status === 'draft' && (
                            <Button size="sm" variant="default" icon={<HiOutlinePencilAlt />} onClick={openEdit}>
                                Edit Invoice
                            </Button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Deskripsi</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Qty</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide pr-4">Harga Satuan</th>
                                    <th className="py-2.5 text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {faktur.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{item.deskripsi}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{item.qty}</td>
                                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{formatRupiah(item.harga_satuan)}</td>
                                        <td className="py-3 text-right font-semibold text-gray-800 dark:text-gray-200">{formatRupiah(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-gray-200 dark:border-gray-600">
                                    <td colSpan={3} className="pt-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total</td>
                                    <td className="pt-3 text-right font-bold text-gray-900 dark:text-gray-100">{formatRupiah(faktur.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}

            <Dialog isOpen={editOpen} onRequestClose={() => setEditOpen(false)} onClose={() => setEditOpen(false)} width={800}>
                <h5 className="text-base font-semibold mb-2">Edit Invoice</h5>
                <p className="text-xs text-gray-500 mb-5">
                    Hanya invoice berstatus draft yang bisa diedit — total dihitung ulang otomatis dari item.
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSaveEdit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Tanggal Invoice">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={editTanggal ? dayjs(editTanggal).toDate() : null}
                                onChange={date => setEditTanggal(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                        <FormItem label="Jatuh Tempo (opsional)">
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={editJatuhTempo ? dayjs(editJatuhTempo).toDate() : null}
                                onChange={date => setEditJatuhTempo(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        </FormItem>
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto pr-1">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold">Item Invoice</p>
                                <Button type="button" size="xs" variant="plain" icon={<HiOutlinePlus />} onClick={tambahEditRow}>
                                    Tambah Item
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {editItems.map((row, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-12 sm:col-span-6">
                                            <Input placeholder="Deskripsi item..." value={row.deskripsi}
                                                onChange={e => setEditRow(index, { deskripsi: e.target.value })} />
                                        </div>
                                        <div className="col-span-3 sm:col-span-2">
                                            <Input placeholder="Qty" value={row.qty}
                                                onChange={e => setEditRow(index, { qty: e.target.value.replace(/\D/g, '') })} />
                                        </div>
                                        <div className="col-span-6 sm:col-span-3">
                                            <Input prefix="Rp" placeholder="0"
                                                value={row.harga_satuan ? formatNum(Number(row.harga_satuan)) : ''}
                                                onChange={e => setEditRow(index, { harga_satuan: e.target.value.replace(/\D/g, '') })} />
                                        </div>
                                        <div className="col-span-3 sm:col-span-1 flex justify-end">
                                            <button type="button" onClick={() => hapusEditRow(index)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors disabled:opacity-40"
                                                disabled={editItems.length <= 1}>
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 mt-3">
                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
                                <span className="font-bold text-lg tabular-nums">{formatRupiah(totalEdit)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setEditOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={savingEdit} disabled={!editValid}>Simpan Perubahan</Button>
                    </div>
                </form>
            </Dialog>
        </div>
    )
}