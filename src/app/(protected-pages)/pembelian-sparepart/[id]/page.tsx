'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, Dialog, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePencil, HiOutlineTrash, HiOutlineUpload, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineCash, HiOutlineShoppingCart } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { pembelianSparepartService, PembelianSparepart } from '@/services/pembelianSparepart.service'
import { STATUS_TAG, STATUS_LABEL } from '../status'

export default function PembelianDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { session } = useCurrentSession()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [data, setData] = useState<PembelianSparepart | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [tolakOpen, setTolakOpen] = useState(false)
    const [alasan, setAlasan] = useState('')
    const [errAlasan, setErrAlasan] = useState('')
    const [realisasiOpen, setRealisasiOpen] = useState(false)
    const [tanggalBeli, setTanggalBeli] = useState(dayjs().format('YYYY-MM-DD'))
    const [hargaAktual, setHargaAktual] = useState<Record<string, string>>({})
    const [errRealisasi, setErrRealisasi] = useState('')
    const [lunasOpen, setLunasOpen] = useState(false)
    const [tanggalBayar, setTanggalBayar] = useState(dayjs().format('YYYY-MM-DD'))
    const [hapusOpen, setHapusOpen] = useState(false)
    const [hapusBuktiTarget, setHapusBuktiTarget] = useState<string | null>(null)

    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const punyaPeran = (...roles: string[]) => roles.some(r => authority.includes(r))

    const fetchData = useCallback(async () => {
        try {
            setData(await pembelianSparepartService.get(id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }, [id])

    useEffect(() => { fetchData() }, [fetchData])

    const jalankan = async (aksi: () => Promise<unknown>, pesanSukses: string, tutup?: () => void) => {
        setSubmitting(true)
        try {
            await aksi()
            toast.push(<Notification type="success" title={pesanSukses} />)
            tutup?.()
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const handleTolak = () => {
        if (!alasan.trim()) { setErrAlasan('Alasan penolakan wajib diisi'); return }
        jalankan(() => pembelianSparepartService.tolak(id, alasan.trim()), 'Pengajuan ditolak', () => { setTolakOpen(false); setAlasan('') })
    }

    const bukaRealisasi = () => {
        if (!data) return
        const awal: Record<string, string> = {}
        data.items.forEach(i => { awal[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi) })
        setHargaAktual(awal)
        setTanggalBeli(dayjs().format('YYYY-MM-DD'))
        setErrRealisasi('')
        setRealisasiOpen(true)
    }

    const handleRealisasi = () => {
        if (!data) return
        if (!tanggalBeli) { setErrRealisasi('Tanggal pembelian wajib diisi'); return }
        if (data.items.some(i => hargaAktual[i.id_item] === '' || hargaAktual[i.id_item] === undefined)) {
            setErrRealisasi('Harga aktual semua item wajib diisi')
            return
        }
        jalankan(() => pembelianSparepartService.realisasi(id, {
            tanggal_pembelian: tanggalBeli,
            items: data.items.map(i => ({ id_item: i.id_item, harga_aktual: Number(hargaAktual[i.id_item]) })),
        }), 'Realisasi tersimpan, stok diperbarui', () => setRealisasiOpen(false))
    }

    const handleUpload = (files: FileList | null) => {
        if (!files || files.length === 0) return
        jalankan(() => pembelianSparepartService.uploadBukti(id, Array.from(files)), 'Bukti berhasil diunggah')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleHapus = () => {
        setSubmitting(true)
        pembelianSparepartService.remove(id)
            .then(() => {
                toast.push(<Notification type="success" title="Pengajuan dihapus" />)
                router.push(ROUTES.PEMBELIAN_SPAREPART)
            })
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setSubmitting(false))
    }

    if (!data) return null

    const bolehKelola = punyaPeran('dispatcher', 'admin', 'superadmin')
    const bolehManager = punyaPeran('manager', 'admin', 'superadmin')
    const bolehFinance = punyaPeran('keuangan', 'admin', 'superadmin')
    const bolehUploadBukti = bolehKelola && (data.status === 'disetujui_finance' || data.status === 'dibeli')

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.push(ROUTES.PEMBELIAN_SPAREPART)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                        <HiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold font-mono">{data.nomor_pengajuan}</h3>
                            <Tag className={STATUS_TAG[data.status] ?? 'bg-gray-100 text-gray-600'}>
                                {STATUS_LABEL[data.status] ?? data.status}
                            </Tag>
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">
                            Diajukan {dayjs(data.tanggal_pengajuan).format('DD MMM YYYY')} · {data.nama_supplier ?? '—'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {data.status === 'diajukan' && bolehKelola && (
                        <>
                            <Button size="sm" icon={<HiOutlinePencil />}
                                onClick={() => router.push(ROUTES.PEMBELIAN_SPAREPART_EDIT(id))}>Edit</Button>
                            <Button size="sm" customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300'}
                                icon={<HiOutlineTrash />} onClick={() => setHapusOpen(true)}>Hapus</Button>
                        </>
                    )}
                    {data.status === 'diajukan' && bolehManager && (
                        <>
                            <Button variant="solid" size="sm" icon={<HiOutlineCheckCircle />} loading={submitting}
                                onClick={() => jalankan(() => pembelianSparepartService.approveManager(id), 'Pengajuan disetujui manager')}>
                                Setujui (Manager)
                            </Button>
                            <Button size="sm" icon={<HiOutlineXCircle />} onClick={() => setTolakOpen(true)}>Tolak</Button>
                        </>
                    )}
                    {data.status === 'disetujui_manager' && bolehFinance && (
                        <>
                            <Button variant="solid" size="sm" icon={<HiOutlineCheckCircle />} loading={submitting}
                                onClick={() => jalankan(() => pembelianSparepartService.approveFinance(id), 'Pengajuan disetujui finance')}>
                                Setujui (Finance)
                            </Button>
                            <Button size="sm" icon={<HiOutlineXCircle />} onClick={() => setTolakOpen(true)}>Tolak</Button>
                        </>
                    )}
                    {data.status === 'disetujui_finance' && bolehKelola && (
                        <>
                            <Button size="sm" icon={<HiOutlineUpload />} loading={submitting}
                                onClick={() => fileInputRef.current?.click()}>Upload Nota</Button>
                            <Button variant="solid" size="sm" icon={<HiOutlineShoppingCart />} onClick={bukaRealisasi}>
                                Realisasi
                            </Button>
                        </>
                    )}
                    {data.status === 'dibeli' && bolehKelola && (
                        <Button size="sm" icon={<HiOutlineUpload />} loading={submitting}
                            onClick={() => fileInputRef.current?.click()}>Upload Nota</Button>
                    )}
                    {data.status === 'dibeli' && bolehFinance && (
                        <Button variant="solid" size="sm" icon={<HiOutlineCash />}
                            onClick={() => { setTanggalBayar(dayjs().format('YYYY-MM-DD')); setLunasOpen(true) }}>
                            Tandai Lunas
                        </Button>
                    )}
                </div>
            </div>

            <input ref={fileInputRef} type="file" multiple hidden
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={e => handleUpload(e.target.files)} />

            {data.status === 'ditolak' && data.alasan_ditolak && (
                <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-3">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400">Pengajuan ditolak</p>
                    <p className="text-sm text-red-500 dark:text-red-300 mt-0.5">{data.alasan_ditolak}</p>
                </div>
            )}

            <Card>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Supplier</p>
                        <p className="text-sm font-semibold mt-0.5">{data.nama_supplier ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Armada Terkait</p>
                        <p className="text-sm font-semibold mt-0.5">{data.nopol_armada ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Disetujui Manager</p>
                        <p className="text-sm font-semibold mt-0.5">
                            {data.disetujui_manager_pada ? dayjs(data.disetujui_manager_pada).format('DD MMM YYYY HH:mm') : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Disetujui Finance</p>
                        <p className="text-sm font-semibold mt-0.5">
                            {data.disetujui_finance_pada ? dayjs(data.disetujui_finance_pada).format('DD MMM YYYY HH:mm') : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Tanggal Pembelian</p>
                        <p className="text-sm font-semibold mt-0.5">
                            {data.tanggal_pembelian ? dayjs(data.tanggal_pembelian).format('DD MMM YYYY') : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Tanggal Pembayaran</p>
                        <p className="text-sm font-semibold mt-0.5">
                            {data.tanggal_pembayaran ? dayjs(data.tanggal_pembayaran).format('DD MMM YYYY') : '—'}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">Keterangan</p>
                        <p className="text-sm mt-0.5">{data.keterangan ?? '—'}</p>
                    </div>
                </div>
            </Card>

            <Card bodyClass="p-0">
                <p className="font-semibold px-4 pt-4 pb-3">Item Sparepart</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-blue-50 dark:bg-blue-500/10 text-left">
                                <th className="px-4 py-2">Nama Sparepart</th>
                                <th className="px-4 py-2 text-right">Qty</th>
                                <th className="px-4 py-2 text-right">Harga Estimasi</th>
                                <th className="px-4 py-2 text-right">Harga Aktual</th>
                                <th className="px-4 py-2 text-right">Selisih</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map(item => (
                                <tr key={item.id_item} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="px-4 py-2 font-semibold">{item.nama_sparepart}</td>
                                    <td className="px-4 py-2 text-right">{formatNum(item.qty)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">{formatRupiah(item.harga_estimasi)}</td>
                                    <td className="px-4 py-2 text-right tabular-nums">
                                        {item.harga_aktual !== null ? formatRupiah(item.harga_aktual) : '—'}
                                    </td>
                                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${
                                        item.selisih === null ? 'text-gray-400'
                                        : item.selisih > 0 ? 'text-red-500'
                                        : item.selisih < 0 ? 'text-emerald-600'
                                        : ''
                                    }`}>
                                        {item.selisih !== null ? formatRupiah(item.selisih) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold">
                                <td className="px-4 py-3" colSpan={2}>Total</td>
                                <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(data.total_estimasi)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {data.total_aktual !== null ? formatRupiah(data.total_aktual) : '—'}
                                </td>
                                <td className={`px-4 py-3 text-right tabular-nums ${
                                    data.selisih === null ? 'text-gray-400'
                                    : data.selisih > 0 ? 'text-red-500'
                                    : data.selisih < 0 ? 'text-emerald-600'
                                    : ''
                                }`}>
                                    {data.selisih !== null ? formatRupiah(data.selisih) : '—'}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            <Card>
                <p className="font-semibold mb-3">Bukti Nota</p>
                {data.bukti.length === 0 ? (
                    <p className="text-sm text-gray-400">
                        Belum ada bukti nota{data.status === 'disetujui_finance' ? ' — wajib unggah minimal 1 sebelum realisasi' : ''}
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {data.bukti.map(b => (
                            <div key={b.id_bukti} className="relative group">
                                <a href={b.url_file} target="_blank" rel="noopener noreferrer" title={`Buka ${b.nama_asli}`}>
                                    {b.nama_asli.toLowerCase().endsWith('.pdf') ? (
                                        <div className="w-full h-24 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs text-gray-500 px-2 text-center">
                                            {b.nama_asli}
                                        </div>
                                    ) : (
                                        <img src={b.url_file} alt={b.nama_asli}
                                            className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                                    )}
                                </a>
                                {bolehUploadBukti && (
                                    <button type="button"
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex"
                                        onClick={() => setHapusBuktiTarget(b.id_bukti)}>
                                        <HiOutlineTrash className="text-sm" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Dialog isOpen={tolakOpen} onClose={() => setTolakOpen(false)} onRequestClose={() => setTolakOpen(false)}>
                <h5 className="mb-4">Tolak Pengajuan</h5>
                <form onSubmit={e => { e.preventDefault(); handleTolak() }}>
                    <FormItem label="Alasan Penolakan" asterisk invalid={!!errAlasan} errorMessage={errAlasan}>
                        <Input textArea rows={3} placeholder="Jelaskan alasan penolakan..."
                            value={alasan} onChange={e => { setAlasan(e.target.value); setErrAlasan('') }} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" onClick={() => setTolakOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting}>Tolak Pengajuan</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={realisasiOpen} onClose={() => setRealisasiOpen(false)} onRequestClose={() => setRealisasiOpen(false)}>
                <h5 className="mb-4">Realisasi Pembelian</h5>
                <form onSubmit={e => { e.preventDefault(); handleRealisasi() }}>
                    {data.bukti.length === 0 && (
                        <p className="text-sm text-amber-500 mb-3">Unggah minimal 1 bukti nota terlebih dulu sebelum realisasi.</p>
                    )}
                    <FormItem label="Tanggal Pembelian" asterisk>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={tanggalBeli ? dayjs(tanggalBeli).toDate() : null}
                            onChange={date => setTanggalBeli(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <p className="font-semibold text-sm mb-2">Harga Aktual per Item</p>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                        {data.items.map(item => (
                            <div key={item.id_item} className="grid grid-cols-2 gap-3 items-center">
                                <div className="text-sm">
                                    <p className="font-medium">{item.nama_sparepart}</p>
                                    <p className="text-xs text-gray-400">
                                        {formatNum(item.qty)} × estimasi {formatRupiah(item.harga_estimasi)}
                                    </p>
                                </div>
                                <Input prefix="Rp" placeholder="0"
                                    value={hargaAktual[item.id_item] ? formatNum(Number(hargaAktual[item.id_item])) : ''}
                                    onChange={e => setHargaAktual(p => ({ ...p, [item.id_item]: e.target.value.replace(/\D/g, '') }))} />
                            </div>
                        ))}
                    </div>
                    {errRealisasi && <p className="text-red-500 text-sm mt-2">{errRealisasi}</p>}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" onClick={() => setRealisasiOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting}>Simpan Realisasi</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={lunasOpen} onClose={() => setLunasOpen(false)} onRequestClose={() => setLunasOpen(false)}>
                <h5 className="mb-4">Tandai Lunas</h5>
                <form onSubmit={e => {
                    e.preventDefault()
                    if (!tanggalBayar) return
                    jalankan(() => pembelianSparepartService.lunas(id, tanggalBayar), 'Pembelian ditandai lunas', () => setLunasOpen(false))
                }}>
                    <FormItem label="Tanggal Pembayaran" asterisk>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={tanggalBayar ? dayjs(tanggalBayar).toDate() : null}
                            onChange={date => setTanggalBayar(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" onClick={() => setLunasOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={submitting}>Tandai Lunas</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={hapusOpen} type="danger" title="Hapus Pengajuan"
                onClose={() => setHapusOpen(false)} onConfirm={handleHapus}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus pengajuan {data.nomor_pengajuan}? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!hapusBuktiTarget} type="danger" title="Hapus Bukti"
                onClose={() => setHapusBuktiTarget(null)}
                onConfirm={() => {
                    if (!hapusBuktiTarget) return
                    jalankan(() => pembelianSparepartService.hapusBukti(id, hapusBuktiTarget), 'Bukti dihapus', () => setHapusBuktiTarget(null))
                }}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus bukti nota ini?</p>
            </ConfirmDialog>
        </div>
    )
}
