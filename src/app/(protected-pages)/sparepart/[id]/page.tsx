'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Dialog, FormItem, Input, Tag, toast, Notification, Spinner } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { sparepartService, Sparepart, SparepartMutasi } from '@/services/sparepart.service'

type Option = { value: 'masuk' | 'penyesuaian'; label: string }

const JENIS_STOK_OPTIONS: Option[] = [
    { value: 'masuk',       label: 'Barang Masuk' },
    { value: 'penyesuaian', label: 'Penyesuaian (koreksi +/-)' },
]

const MUTASI_CLASS: Record<string, string> = {
    masuk:       'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    keluar:      'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400',
    penyesuaian: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
}

export default function SparepartDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [sparepart, setSparepart] = useState<Sparepart | null>(null)
    const [loading, setLoading]     = useState(true)
    const [editing, setEditing]     = useState(false)
    const [form, setForm]           = useState({ kode: '', nama: '', satuan: '', harga_standar: '', aktif: true })
    const [saving, setSaving]       = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting]     = useState(false)

    const [mutasi, setMutasi]             = useState<SparepartMutasi[]>([])
    const [mutasiLoading, setMutasiLoading] = useState(false)

    const [stokOpen, setStokOpen]   = useState(false)
    const [stokForm, setStokForm]   = useState<{ jenis: 'masuk' | 'penyesuaian'; qty: string; harga: string; keterangan: string }>({ jenis: 'masuk', qty: '', harga: '', keterangan: '' })
    const [stokSaving, setStokSaving] = useState(false)

    const fetchSparepart = useCallback(async () => {
        try {
            const sp = await sparepartService.get(id)
            setSparepart(sp)
            setForm({ kode: sp.kode, nama: sp.nama, satuan: sp.satuan, harga_standar: String(sp.harga_standar), aktif: sp.aktif })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [id])

    const fetchMutasi = useCallback(async () => {
        setMutasiLoading(true)
        try {
            const res = await sparepartService.listMutasi(id, 1, 20)
            setMutasi(res.data)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMutasiLoading(false)
        }
    }, [id])

    useEffect(() => { fetchSparepart() }, [fetchSparepart])
    useEffect(() => { fetchMutasi() }, [fetchMutasi])

    const handleSave = async () => {
        if (!form.kode.trim() || !form.nama.trim()) return
        setSaving(true)
        try {
            const updated = await sparepartService.update(id, {
                kode: form.kode,
                nama: form.nama,
                satuan: form.satuan || 'pcs',
                harga_standar: Number(form.harga_standar) || 0,
                aktif: form.aktif,
            })
            setSparepart(updated)
            setEditing(false)
            toast.push(<Notification type="success" title="Spare part berhasil diperbarui" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        try {
            await sparepartService.delete(id)
            toast.push(<Notification type="success" title="Spare part berhasil dihapus" />)
            router.push(ROUTES.SPAREPART)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleting(false)
        }
    }

    const handleTambahStok = async () => {
        const qty = Number(stokForm.qty)
        if (!qty) return
        setStokSaving(true)
        try {
            const updated = await sparepartService.tambahStok(id, {
                jenis: stokForm.jenis,
                qty,
                harga: stokForm.harga ? Number(stokForm.harga) : null,
                keterangan: stokForm.keterangan || null,
            })
            setSparepart(updated)
            setStokOpen(false)
            setStokForm({ jenis: 'masuk', qty: '', harga: '', keterangan: '' })
            toast.push(<Notification type="success" title="Stok berhasil diperbarui" />)
            fetchMutasi()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setStokSaving(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!sparepart) return <div className="p-6 text-red-500">Spare part tidak ditemukan.</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.SPAREPART)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">{sparepart.nama}</h3>
                    <p className="text-gray-500 text-sm mt-0.5 font-mono">{sparepart.kode}</p>
                </div>
            </div>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Informasi Spare Part</p>
                    <div className="flex gap-2">
                        {!editing && (
                            <>
                                <Button size="sm" variant="default" icon={<HiOutlinePencilAlt />} onClick={() => setEditing(true)}>Edit</Button>
                                <Button size="sm" variant="solid"
                                    customColorClass={() => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500'}
                                    icon={<HiOutlineTrash />} onClick={() => setDeleteOpen(true)}>Hapus</Button>
                                <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={() => setStokOpen(true)}>Tambah Stok</Button>
                            </>
                        )}
                    </div>
                </div>

                {!editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                        {([
                            { label: 'Kode',          value: <span className="font-mono">{sparepart.kode}</span> },
                            { label: 'Nama',          value: sparepart.nama },
                            { label: 'Satuan',        value: sparepart.satuan },
                            { label: 'Harga Standar', value: formatRupiah(sparepart.harga_standar) },
                            {
                                label: 'Stok Saat Ini',
                                value: (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        sparepart.stok === 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                                        : sparepart.stok < 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                    }`}>
                                        {formatNum(sparepart.stok)} {sparepart.satuan}
                                    </span>
                                ),
                            },
                            {
                                label: 'Status',
                                value: (
                                    <Tag className={sparepart.aktif
                                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                        : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400'}>
                                        {sparepart.aktif ? 'Aktif' : 'Nonaktif'}
                                    </Tag>
                                ),
                            },
                        ]).map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <form onSubmit={e => { e.preventDefault(); handleSave() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Kode" asterisk>
                                <Input value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value.toUpperCase() }))} />
                            </FormItem>
                            <FormItem label="Nama" asterisk>
                                <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Satuan">
                                <Input placeholder="pcs" value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} />
                            </FormItem>
                            <FormItem label="Harga Standar (Rp)">
                                <Input prefix="Rp" placeholder="0"
                                    value={form.harga_standar ? formatNum(Number(form.harga_standar)) : ''}
                                    onChange={e => setForm(p => ({ ...p, harga_standar: e.target.value.replace(/\D/g, '') }))} />
                            </FormItem>
                            <FormItem label="Status">
                                <Select isSearchable={false}
                                    options={[{ value: true, label: 'Aktif' }, { value: false, label: 'Nonaktif' }]}
                                    value={{ value: form.aktif, label: form.aktif ? 'Aktif' : 'Nonaktif' }}
                                    onChange={opt => opt && setForm(p => ({ ...p, aktif: (opt as { value: boolean }).value }))} />
                            </FormItem>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="plain" onClick={() => setEditing(false)}>Batal</Button>
                            <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                        </div>
                    </form>
                )}
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Riwayat Mutasi Stok (20 terakhir)</p>
                    <div className="flex items-center gap-3">
                        {mutasiLoading && <Spinner size={20} />}
                        <p className="text-sm text-gray-500">
                            Total stok saat ini:{' '}
                            <span className="font-bold text-gray-800 dark:text-gray-100">
                                {formatNum(sparepart.stok)} {sparepart.satuan}
                            </span>
                        </p>
                    </div>
                </div>
                {mutasi.length === 0 && !mutasiLoading ? (
                    <p className="text-gray-400 text-sm py-4 text-center">Belum ada mutasi stok</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Tanggal</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Jenis</th>
                                    <th className="py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Qty</th>
                                    <th className="py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide pr-4">Harga</th>
                                    <th className="py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {mutasi.map(m => (
                                    <tr key={m.id_mutasi}>
                                        <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">{dayjs(m.tanggal).format('DD MMM YYYY')}</td>
                                        <td className="py-3 pr-4">
                                            <Tag className={`text-xs font-semibold ${MUTASI_CLASS[m.jenis] ?? 'bg-gray-100 text-gray-600'}`}>{m.jenis}</Tag>
                                        </td>
                                        <td className={`py-3 pr-4 text-right font-mono text-xs font-semibold ${
                                            m.jenis === 'keluar' || m.qty < 0 ? 'text-red-500' : 'text-emerald-600'
                                        }`}>{m.jenis === 'keluar' || m.qty < 0 ? '-' : '+'}{formatNum(Math.abs(m.qty))}</td>
                                        <td className="py-3 pr-4 text-right whitespace-nowrap">{m.harga != null ? formatRupiah(m.harga) : <span className="text-gray-400">—</span>}</td>
                                        <td className="py-3 text-gray-600 dark:text-gray-400 max-w-[240px] truncate">{m.keterangan ?? <span className="text-gray-400">—</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Dialog isOpen={stokOpen} onRequestClose={() => setStokOpen(false)} width={480}>
                <h5 className="text-base font-semibold mb-5">Tambah / Sesuaikan Stok</h5>
                <FormItem label="Jenis" asterisk>
                    <Select isSearchable={false}
                        options={JENIS_STOK_OPTIONS}
                        value={JENIS_STOK_OPTIONS.find(o => o.value === stokForm.jenis) ?? null}
                        onChange={opt => opt && setStokForm(p => ({ ...p, jenis: (opt as Option).value }))} />
                </FormItem>
                <FormItem label={stokForm.jenis === 'masuk' ? 'Qty Masuk' : 'Qty Koreksi (+/-)'} asterisk>
                    <Input type="number" placeholder={stokForm.jenis === 'masuk' ? 'Contoh: 10' : 'Contoh: -3 atau 5'}
                        value={stokForm.qty}
                        onChange={e => setStokForm(p => ({ ...p, qty: e.target.value }))} />
                </FormItem>
                <FormItem label="Harga Beli per Unit (opsional)">
                    <Input prefix="Rp" placeholder="0"
                        value={stokForm.harga ? formatNum(Number(stokForm.harga)) : ''}
                        onChange={e => setStokForm(p => ({ ...p, harga: e.target.value.replace(/\D/g, '') }))} />
                </FormItem>
                <FormItem label="Keterangan">
                    <Input textArea placeholder="Contoh: Pembelian rutin / stok opname" value={stokForm.keterangan}
                        onChange={e => setStokForm(p => ({ ...p, keterangan: e.target.value }))} />
                </FormItem>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="plain" onClick={() => setStokOpen(false)}>Batal</Button>
                    <Button variant="solid" loading={stokSaving} disabled={!Number(stokForm.qty)} onClick={handleTambahStok}>Simpan</Button>
                </div>
            </Dialog>

            <ConfirmDialog isOpen={deleteOpen} type="danger" title="Hapus Spare Part"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteOpen(false)} onCancel={() => setDeleteOpen(false)}
                onConfirm={handleDelete} confirmButtonProps={{ loading: deleting }}>
                <p>Hapus spare part <strong>{sparepart.nama}</strong>? Riwayat mutasi dan pemakaian servis lama tetap tersimpan.</p>
            </ConfirmDialog>
        </div>
    )
}
