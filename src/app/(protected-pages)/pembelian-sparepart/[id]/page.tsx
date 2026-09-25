'use client'
import { usePratinjauBerkas } from '@/components/shared/PratinjauBerkasProvider'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, Dialog, Tooltip, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import PanelAlurStatus, { KELAS_IKON_LOG_APPROVAL } from '@/components/shared/PanelAlurStatus'
import dayjs from 'dayjs'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineShoppingCart, HiOutlineClipboardList, HiOutlinePaperClip, HiOutlineExternalLink } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { pembelianSparepartService, PembelianSparepart } from '@/services/pembelianSparepart.service'
import { supplierService } from '@/services/supplier.service'
import { STATUS_TAG, STATUS_LABEL, bolehDiubahAtauDihapus } from '../status'

type Option = { value: string; label: string }

const isGambar = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)

const TAHAP_PEMBELIAN = [
    { status: 'diajukan',          label: 'Diajukan' },
    { status: 'disetujui_finance', label: 'Disetujui' },
    { status: 'dibeli',            label: 'Dibeli' },
    { status: 'lunas',             label: 'Lunas' },
]

const LANGKAH_PEMBELIAN: Record<string, { judul: string; keterangan: string }> = {
    diajukan:          { judul: 'Menunggu keputusan approver',      keterangan: '' },
    disetujui_manager: { judul: 'Disetujui — siap direalisasi',     keterangan: 'Lakukan pembelian ke supplier, lalu catat realisasi (harga aktual + nota). Pembayaran diproses di Keuangan → Proses Pembayaran.' },
    disetujui_finance: { judul: 'Disetujui — siap direalisasi',     keterangan: 'Lakukan pembelian ke supplier, lalu catat realisasi (harga aktual + nota). Pembayaran diproses di Keuangan → Proses Pembayaran.' },
    dibeli:            { judul: 'Sudah dibeli — menunggu pembayaran', keterangan: 'Pembayaran diproses di Keuangan → Proses Pembayaran; status berubah jadi Lunas otomatis saat ditransfer.' },
    lunas:             { judul: 'Pembelian selesai',                 keterangan: 'Pembayaran sudah ditransfer — tidak ada aksi lanjutan.' },
    ditolak:           { judul: 'Pengajuan ditolak',                 keterangan: 'Buat pengajuan pembelian baru bila masih diperlukan.' },
}

export default function PembelianDetailPage() {
    const { klik } = usePratinjauBerkas()
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { session } = useCurrentSession()

    const [data, setData] = useState<PembelianSparepart | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [realisasiOpen, setRealisasiOpen] = useState(false)
    const [tanggalBeli, setTanggalBeli] = useState(dayjs().format('YYYY-MM-DD'))
    const [hargaAktual, setHargaAktual] = useState<Record<string, string>>({})
    const [idSupplierRealisasi, setIdSupplierRealisasi] = useState('')
    const [supplierOptions, setSupplierOptions] = useState<Option[]>([])
    const [errRealisasi, setErrRealisasi] = useState('')
    const [hapusOpen, setHapusOpen] = useState(false)
    const [hapusBuktiTarget, setHapusBuktiTarget] = useState<string | null>(null)
    const [logOpen, setLogOpen] = useState(false)

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
        if (submitting) return
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

    const bukaRealisasi = () => {
        if (!data) return
        const awal: Record<string, string> = {}
        data.items.forEach(i => { awal[i.id_item] = String(i.harga_aktual ?? i.harga_estimasi) })
        setHargaAktual(awal)
        setIdSupplierRealisasi(data.id_supplier ?? '')
        setTanggalBeli(dayjs().format('YYYY-MM-DD'))
        setErrRealisasi('')
        setRealisasiOpen(true)
        if (supplierOptions.length === 0) {
            supplierService.list({ limit: 999, aktif: 1 })
                .then(r => setSupplierOptions(r.data.map(s => ({ value: s.id_supplier, label: s.nama }))))
                .catch(() => {})
        }
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
            id_supplier: idSupplierRealisasi || null,
            items: data.items.map(i => ({ id_item: i.id_item, harga_aktual: Number(hargaAktual[i.id_item]) })),
        }), 'Realisasi tersimpan, stok diperbarui', () => setRealisasiOpen(false))
    }

    const handleUpload = (files: File[]) => {
        if (files.length === 0) return
        jalankan(() => pembelianSparepartService.uploadBukti(id, files), 'Bukti berhasil diunggah')
    }

    const handleHapus = () => {
        setSubmitting(true)
        pembelianSparepartService.remove(id)
            .then(() => {
                toast.push(<Notification type="success" title="Pengajuan dihapus" />)
                router.push(ROUTES.PEMBELIAN_SPAREPART)
            })
            .catch(err => {
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
                setHapusOpen(false)
            })
            .finally(() => setSubmitting(false))
    }

    if (!data) return null

    const dariPr = !!data.id_permintaan_pembelian
    const bolehKelola = punyaPeran('dispatcher', 'admin', 'superadmin')
    const bolehEksekusiPengadaan = bolehKelola || punyaPeran('pengadaan')
    const bolehUploadBukti = bolehEksekusiPengadaan && (data.status === 'dibeli' || (data.status === 'disetujui_finance' && !dariPr))
    const bolehRealisasi = !dariPr && bolehEksekusiPengadaan && (!data.wajib_pengadaan || punyaPeran('pengadaan', 'superadmin'))
    const bolehUbahHapus = bolehDiubahAtauDihapus(data.status) && bolehKelola && !dariPr
    const langkahAktif = dariPr && data.status === 'disetujui_finance'
        ? {
            judul: 'Disetujui lewat PR, siap direalisasi',
            keterangan: `Catat realisasi (supplier, harga aktual, nota) dari PR ${data.nomor_permintaan ?? ''} — PR otomatis ditandai diterima dan pengajuan pembayaran dibuat setelah realisasi.`,
        }
        : null
    const bukaLogApproval = () => {
        if (!data.pengajuan_keuangan) {
            toast.push(<Notification type="info" title={dariPr
                ? `Approval pembelian ini dilakukan di PR ${data.nomor_permintaan ?? ''}`
                : data.id_perawatan
                    ? 'Approval pembelian ini mengikuti pengajuan perawatan terkait'
                    : 'Belum ada pengajuan pengeluaran untuk pembelian ini'} />)
            return
        }
        setLogOpen(true)
    }

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
                            {data.wajib_pengadaan && (
                                <Tag className="bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                                    Wajib Pengadaan
                                </Tag>
                            )}
                            {dariPr && (
                                <a href={`${ROUTES.PERMINTAAN_PEMBELIAN}?detail=${data.id_permintaan_pembelian}`} target="_blank" rel="noreferrer" className="w-fit">
                                    <Tag className="text-[10px] font-semibold inline-flex items-center gap-1 bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 cursor-pointer hover:opacity-80">
                                        Dari {data.nomor_permintaan ?? 'PR'} <HiOutlineExternalLink className="text-xs" />
                                    </Tag>
                                </a>
                            )}
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">
                            Diajukan {dayjs(data.tanggal_pengajuan).format('DD MMM YYYY')} · {data.nama_supplier ?? '—'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {bolehUbahHapus && (
                        <>
                            <Tooltip title="Hapus">
                                <Button variant="default" size="sm" icon={<HiOutlineTrash />}
                                    customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300'}
                                    onClick={() => setHapusOpen(true)} />
                            </Tooltip>
                            <Tooltip title="Edit">
                                <Button variant="solid" size="sm" icon={<HiOutlinePencilAlt />}
                                    onClick={() => router.push(ROUTES.PEMBELIAN_SPAREPART_EDIT(id))} />
                            </Tooltip>
                        </>
                    )}
                    {bolehUploadBukti && (
                        <Upload accept=".jpg,.jpeg,.png,.webp,.pdf" showList={false} multiple disabled={submitting}
                            onChange={(semua, sebelumnya) => handleUpload(semua.slice(sebelumnya.length))}>
                            <Tooltip title="Upload Nota">
                                <Button type="button" variant="default" size="sm" icon={<HiOutlinePaperClip />} loading={submitting} />
                            </Tooltip>
                        </Upload>
                    )}
                </div>
            </div>

            <PanelAlurStatus
                judul="Alur Pembelian"
                alat={(
                    <Tooltip title="Log Aktivitas Approval">
                        <span className={KELAS_IKON_LOG_APPROVAL} onClick={bukaLogApproval}>
                            <HiOutlineClipboardList className="text-lg" />
                        </span>
                    </Tooltip>
                )}
                tahap={TAHAP_PEMBELIAN}
                status={data.status === 'disetujui_manager' ? 'disetujui_finance' : data.status}
                statusLabel={STATUS_LABEL[data.status] ?? data.status}
                kelasIkon={STATUS_TAG[data.status] ?? 'bg-gray-100 text-gray-600'}
                tahapGagal={data.status === 'ditolak' ? 1 : undefined}
                selesai={data.status === 'lunas'}
                catatan={data.status === 'ditolak' && data.alasan_ditolak
                    ? [{ warna: 'merah', judul: 'Pengajuan ditolak approver', isi: `“${data.alasan_ditolak}”` }]
                    : []}
                langkah={langkahAktif ?? {
                    judul: LANGKAH_PEMBELIAN[data.status]?.judul ?? STATUS_LABEL[data.status] ?? data.status,
                    keterangan: data.status === 'diajukan'
                        ? (data.id_perawatan
                            ? 'Ditautkan ke perawatan armada — tetap lewat approval sesuai Konfigurasi Approval (via Persetujuan Saya).'
                            : 'Approval oleh approver sesuai Konfigurasi Approval (via Persetujuan Saya).')
                        : LANGKAH_PEMBELIAN[data.status]?.keterangan,
                }}
                aksi={(
                    <>
                        {dariPr && data.status === 'disetujui_finance' && (
                            <Button size="sm" variant="solid" icon={<HiOutlineExternalLink />}
                                onClick={() => router.push(`${ROUTES.PERMINTAAN_PEMBELIAN}?detail=${data.id_permintaan_pembelian}`)}>
                                Buka PR {data.nomor_permintaan ?? ''}
                            </Button>
                        )}
                        {!dariPr && data.status === 'disetujui_finance' && bolehRealisasi && (
                            <Button size="sm" variant="solid" icon={<HiOutlineShoppingCart />} onClick={bukaRealisasi}>
                                Catat Realisasi
                            </Button>
                        )}
                    </>
                )}
            />

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

            {data.pembayaran && (
                <Card>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Pembayaran</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ditransfer</p>
                            <p className="text-sm font-bold tabular-nums">{formatRupiah(data.pembayaran.nominal_ditransfer)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {dayjs(data.pembayaran.tanggal_transfer).format('DD MMM YYYY')}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Aktual</p>
                            <p className="text-sm font-bold tabular-nums">
                                {data.pembayaran.total_aktual !== null ? formatRupiah(data.pembayaran.total_aktual) : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Selisih</p>
                            <p className={`text-sm font-bold tabular-nums ${
                                data.pembayaran.selisih === null ? 'text-gray-400'
                                : data.pembayaran.selisih > 0 ? 'text-red-500'
                                : data.pembayaran.selisih < 0 ? 'text-emerald-600'
                                : ''
                            }`}>
                                {data.pembayaran.selisih !== null ? formatRupiah(data.pembayaran.selisih) : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bukti Transfer</p>
                            {data.pembayaran.url_bukti ? (
                                isGambar(data.pembayaran.url_bukti) ? (
                                    <div className="w-fit">
                                        <a href={data.pembayaran.url_bukti} onClick={klik(data.pembayaran.url_bukti, 'Bukti transfer', 'bukti-transfer')} target="_blank" rel="noreferrer">
                                            <img src={data.pembayaran.url_bukti} alt="Bukti transfer"
                                                className="h-20 w-32 object-cover rounded-lg border border-gray-100 dark:border-gray-700" />
                                        </a>
                                        <p className="text-xs text-gray-400 mt-1">Klik untuk membuka</p>
                                    </div>
                                ) : (
                                    <a href={data.pembayaran.url_bukti} onClick={klik(data.pembayaran.url_bukti, 'Bukti transfer', 'bukti-transfer')} target="_blank" rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                        Lihat bukti
                                    </a>
                                )
                            ) : (
                                <p className="text-xs text-gray-400 italic">Belum ada bukti diunggah.</p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

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
                        {dariPr && data.status === 'disetujui_finance'
                            ? `Unggah nota dan catat realisasi di PR ${data.nomor_permintaan ?? ''} terkait`
                            : `Belum ada bukti nota${data.status === 'disetujui_finance' ? ' — wajib unggah minimal 1 sebelum realisasi' : ''}`}
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                        {data.bukti.map(b => (
                            <div key={b.id_bukti} className="relative group">
                                <a href={b.url_file} onClick={klik(b.url_file, b.nama_asli, b.nama_asli.replace(/\.[^.]+$/, ''))} target="_blank" rel="noopener noreferrer" title={`Buka ${b.nama_asli}`}>
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

            <div className="flex justify-end">
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.PEMBELIAN_SPAREPART)}>Batal</Button>
            </div>

            <LogAktivitasKeuanganDialog
                isOpen={logOpen}
                info={data.pengajuan_keuangan}
                emptyMessage="Belum ada pengajuan keuangan."
                onClose={() => setLogOpen(false)}
            />

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
                    <FormItem label="Supplier (opsional)">
                        <Select<Option> isSearchable isClearable placeholder="Pilih supplier tempat membeli..."
                            options={supplierOptions}
                            value={supplierOptions.find(o => o.value === idSupplierRealisasi) ?? null}
                            onChange={opt => setIdSupplierRealisasi((opt as Option | null)?.value ?? '')} />
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

            <ConfirmDialog isOpen={hapusOpen} type="danger" title="Hapus Pengajuan"
                onClose={() => setHapusOpen(false)} onConfirm={handleHapus}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus pengajuan {data.nomor_pengajuan}? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!hapusBuktiTarget} type="danger" title="Hapus Bukti"
                onClose={() => setHapusBuktiTarget(null)}
                onConfirm={() => {
                    if (!hapusBuktiTarget) return
                    jalankan(() => pembelianSparepartService.hapusBukti(id, hapusBuktiTarget), 'Bukti dihapus').finally(() => setHapusBuktiTarget(null))
                }}
                confirmButtonProps={{ loading: submitting }}>
                <p>Hapus bukti nota ini?</p>
            </ConfirmDialog>
        </div>
    )
}
