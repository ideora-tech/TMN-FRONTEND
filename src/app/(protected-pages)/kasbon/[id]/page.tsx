'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, Button, Card, Checkbox, Dialog, FormItem, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiArrowLeft, HiOutlineCash, HiOutlineClipboardList, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineAdjustments } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasbonService, Kasbon, PembayaranKasbon } from '@/services/kasbon.service'
import { useLogPengajuan } from '../../arus-kas/useLogPengajuan'
import {
    BULAN_OPTIONS, OpsiTeks, STATUS_KASBON_LABEL, STATUS_KASBON_TAG, TAG_KASBON_LAMA,
    angkaRupiah, labelBulan, opsiTahun, sudahDicairkan,
} from '../kasbonMeta'

const LABEL_CLASS = 'text-xs text-gray-400 uppercase tracking-wide'
const VALUE_CLASS = 'text-sm font-semibold mt-0.5'
const SECTION_CLASS = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3'
const TH_CLASS = 'py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const MAKS_ALASAN = 255

type ErrorBayar = { tanggal?: string; nominal?: string; keterangan?: string }
type ErrorCicilan = { cicilan?: string; mulai?: string; alasan?: string }

export default function KasbonDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [data, setData] = useState<Kasbon | null>(null)
    const [gagalMuat, setGagalMuat] = useState(false)
    const [hapusOpen, setHapusOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const { bukaLog, dialogLog } = useLogPengajuan(kasbonService.riwayat)

    const [pelunasanOpen, setPelunasanOpen] = useState(false)
    const [menyimpanBayar, setMenyimpanBayar] = useState(false)
    const [tanggalBayar, setTanggalBayar] = useState(dayjs().format('YYYY-MM-DD'))
    const [nominalBayar, setNominalBayar] = useState('')
    const [keteranganBayar, setKeteranganBayar] = useState('')
    const [catatPemasukan, setCatatPemasukan] = useState(true)
    const [errorBayar, setErrorBayar] = useState<ErrorBayar>({})

    const [cicilanOpen, setCicilanOpen] = useState(false)
    const [menyimpanCicilan, setMenyimpanCicilan] = useState(false)
    const [cicilanBaru, setCicilanBaru] = useState('')
    const [bulanPotong, setBulanPotong] = useState('')
    const [tahunPotong, setTahunPotong] = useState('')
    const [alasanCicilan, setAlasanCicilan] = useState('')
    const [errorCicilan, setErrorCicilan] = useState<ErrorCicilan>({})

    const [hapusBayar, setHapusBayar] = useState<PembayaranKasbon | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setData(await kasbonService.get(id))
            setGagalMuat(false)
        } catch (err) {
            setGagalMuat(true)
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }, [id])

    useEffect(() => { fetchData() }, [fetchData])

    const handleHapus = async () => {
        setSubmitting(true)
        try {
            await kasbonService.delete(id)
            toast.push(<Notification type="success" title="Kasbon berhasil dihapus" />)
            router.push(ROUTES.KASBON)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setHapusOpen(false)
            setSubmitting(false)
        }
    }

    const bukaPelunasan = () => {
        if (!data) return
        setTanggalBayar(dayjs().format('YYYY-MM-DD'))
        setNominalBayar(String(Math.ceil(data.sisa)))
        setKeteranganBayar('')
        setCatatPemasukan(true)
        setErrorBayar({})
        setMenyimpanBayar(false)
        setPelunasanOpen(true)
    }

    const handlePelunasan = async () => {
        if (!data || menyimpanBayar) return
        const nilai = Number(nominalBayar) || 0
        const e: ErrorBayar = {}
        const palingAwal = [data.tanggal.slice(0, 10), (data.tanggal_transfer ?? '').slice(0, 10)].sort().pop() ?? ''
        if (!tanggalBayar) e.tanggal = 'Tanggal wajib diisi'
        else if (tanggalBayar < palingAwal) e.tanggal = `Tanggal pelunasan tidak boleh sebelum kasbon diberikan (${dayjs(palingAwal).format('DD/MM/YYYY')})`
        if (nilai < 1) e.nominal = 'Nominal pelunasan wajib diisi'
        else if (nilai > Math.ceil(data.sisa)) e.nominal = `Nominal melebihi sisa kasbon (${formatRupiah(data.sisa)})`
        if (!catatPemasukan && !keteranganBayar.trim()) e.keterangan = 'Keterangan wajib diisi bila tidak dicatat sebagai pemasukan kas'
        setErrorBayar(e)
        if (Object.keys(e).length > 0) return

        setMenyimpanBayar(true)
        try {
            setData(await kasbonService.catatPelunasan(id, {
                tanggal: tanggalBayar,
                nominal: nilai >= Math.floor(data.sisa) ? data.sisa : nilai,
                keterangan: keteranganBayar.trim() || null,
                catat_pemasukan: catatPemasukan,
            }))
            toast.push(<Notification type="success" title="Pelunasan kasbon berhasil dicatat" />)
            setPelunasanOpen(false)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setMenyimpanBayar(false)
        }
    }

    const bukaCicilan = () => {
        if (!data) return
        setCicilanBaru(String(Math.round(data.cicilan_per_periode)))
        setBulanPotong(data.mulai_potong.slice(5, 7))
        setTahunPotong(data.mulai_potong.slice(0, 4))
        setAlasanCicilan('')
        setErrorCicilan({})
        setMenyimpanCicilan(false)
        setCicilanOpen(true)
    }

    const handleCicilan = async () => {
        if (!data || menyimpanCicilan) return
        const nilai = Number(cicilanBaru) || 0
        const mulai = `${tahunPotong}-${bulanPotong}`
        const e: ErrorCicilan = {}
        if (nilai < 1) e.cicilan = 'Cicilan per periode gaji wajib diisi'
        else if (nilai > Math.round(data.nominal)) e.cicilan = 'Cicilan tidak boleh melebihi nominal kasbon'
        else if (nilai === Math.round(data.cicilan_per_periode) && mulai === data.mulai_potong) e.cicilan = 'Cicilan dan bulan mulai dipotong belum berubah'
        if (mulai < data.tanggal.slice(0, 7)) e.mulai = 'Mulai dipotong tidak boleh sebelum bulan kasbon'
        if (!alasanCicilan.trim()) e.alasan = 'Alasan perubahan wajib diisi'
        setErrorCicilan(e)
        if (Object.keys(e).length > 0) return

        setMenyimpanCicilan(true)
        try {
            setData(await kasbonService.ubahCicilan(id, { cicilan_per_periode: nilai, mulai_potong: mulai, alasan: alasanCicilan.trim() }))
            toast.push(<Notification type="success" title="Cicilan kasbon berhasil diperbarui" />)
            setCicilanOpen(false)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setMenyimpanCicilan(false)
        }
    }

    const handleHapusBayar = async () => {
        if (!hapusBayar) return
        setSubmitting(true)
        try {
            setData(await kasbonService.hapusPelunasan(id, hapusBayar.id_kasbon_pembayaran))
            toast.push(<Notification type="success" title="Pelunasan kasbon berhasil dihapus" />)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setHapusBayar(null)
            setSubmitting(false)
        }
    }

    if (!data) {
        if (!gagalMuat) return null
        return (
            <Card>
                <p className="text-sm text-gray-500 mb-4">Kasbon tidak ditemukan atau Anda tidak punya akses.</p>
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.KASBON)}>Kembali</Button>
            </Card>
        )
    }

    const pembayaran = data.pembayaran ?? []
    const perubahanCicilan = data.perubahan_cicilan ?? []
    const cair = sudahDicairkan(data.status)
    const persenLunas = data.status === 'lunas'
        ? 100
        : data.nominal > 0 ? Math.min(99, Math.floor((data.terbayar / data.nominal) * 100)) : 0
    const tahunOptions = opsiTahun(tahunPotong)
    const strip = <p className="text-sm text-gray-400 mt-0.5">—</p>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.push(ROUTES.KASBON)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                        <HiArrowLeft className="text-xl" />
                    </button>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold font-mono">{data.nomor_kasbon}</h3>
                            <Tag className={`text-xs font-semibold ${STATUS_KASBON_TAG[data.status]}`}>{STATUS_KASBON_LABEL[data.status]}</Tag>
                            {data.saldo_awal && <Tag className={`text-xs ${TAG_KASBON_LAMA}`}>Kasbon Lama</Tag>}
                        </div>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {dayjs(data.tanggal).format('DD MMM YYYY')} · {data.nama_karyawan ?? '—'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {data.id_pengajuan && (
                        <Tooltip title="Log Aktivitas Approval">
                            <Button variant="default" size="sm" icon={<HiOutlineClipboardList />} onClick={() => bukaLog(data.id_kasbon)} />
                        </Tooltip>
                    )}
                    {data.bisa_ubah_cicilan && (
                        <Button variant="default" size="sm" icon={<HiOutlineAdjustments />} onClick={bukaCicilan}>Ubah Cicilan</Button>
                    )}
                    {data.bisa_catat_pelunasan && (
                        <Button variant="solid" size="sm" icon={<HiOutlineCash />} onClick={bukaPelunasan}>Catat Pelunasan</Button>
                    )}
                    {data.bisa_diubah && (
                        <>
                            <Tooltip title="Hapus">
                                <Button variant="default" size="sm" icon={<HiOutlineTrash />}
                                    customColorClass={() => 'text-red-500 hover:border-red-300 hover:ring-red-300'}
                                    onClick={() => setHapusOpen(true)} />
                            </Tooltip>
                            <Tooltip title="Edit">
                                <Button variant={data.bisa_catat_pelunasan ? 'default' : 'solid'} size="sm" icon={<HiOutlinePencilAlt />}
                                    onClick={() => router.push(ROUTES.KASBON_EDIT(id))} />
                            </Tooltip>
                        </>
                    )}
                </div>
            </div>

            {data.status === 'ditolak' && data.alasan_ditolak && (
                <Alert type="danger" showIcon>
                    Pengajuan ditolak: {data.alasan_ditolak}. Perbaiki datanya lalu simpan untuk mengajukan ulang.
                </Alert>
            )}
            {data.status === 'menunggu_pencairan' && (
                <Alert type="info" showIcon>
                    Kasbon sudah disetujui dan menunggu ditransfer oleh Keuangan di Proses Pembayaran. Potongan gaji baru berjalan setelah dicairkan.
                    Bila datanya perlu dikoreksi, minta Manager menolak pengajuannya di Proses Pembayaran — setelah ditolak kasbon bisa diedit atau dihapus.
                </Alert>
            )}
            {(data.status === 'menunggu_approval' || data.status === 'menunggu_pencairan') && !data.karyawan_aktif && (
                <Alert type="warning" showIcon>
                    Karyawan sudah tidak aktif, jadi kasbon ini tidak bisa dicairkan. Minta pengajuannya ditolak lalu hapus kasbonnya.
                </Alert>
            )}
            {data.status === 'berjalan' && !data.karyawan_aktif && (
                <Alert type="warning" showIcon>
                    Karyawan sudah tidak aktif. Sisa kasbon dipotong sekaligus pada slip gaji terakhirnya; bila tidak cukup, Keuangan mencatat pelunasan manual di halaman ini.
                </Alert>
            )}

            <Card>
                <p className={SECTION_CLASS}>Karyawan</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                        <p className={LABEL_CLASS}>Nama Karyawan</p>
                        <p className={VALUE_CLASS}>{data.nama_karyawan ?? '—'}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>NIK</p>
                        <p className={`${VALUE_CLASS} font-mono`}>{data.nik ?? '—'}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Jabatan</p>
                        <p className={VALUE_CLASS}>{data.nama_jabatan ?? '—'}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Tanggal Kasbon</p>
                        <p className={VALUE_CLASS}>{dayjs(data.tanggal).format('DD MMM YYYY')}</p>
                    </div>
                    <div className="col-span-2 lg:col-span-4">
                        <p className={LABEL_CLASS}>Keperluan</p>
                        <p className="text-sm mt-0.5 whitespace-pre-line">{data.keperluan}</p>
                    </div>
                </div>
            </Card>

            <Card>
                <p className={SECTION_CLASS}>Nominal &amp; Cicilan</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <div>
                        <p className={LABEL_CLASS}>{data.saldo_awal ? 'Nominal (Sisa Saat Dicatat)' : 'Nominal Kasbon'}</p>
                        <p className="text-base font-bold mt-0.5">{formatRupiah(data.nominal)}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Terbayar</p>
                        {cair ? <p className={`${VALUE_CLASS} text-emerald-600 dark:text-emerald-400`}>{formatRupiah(data.terbayar)}</p> : strip}
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Sisa</p>
                        {cair ? <p className="text-base font-bold mt-0.5">{formatRupiah(data.sisa)}</p> : strip}
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Progres Pelunasan</p>
                        {cair ? (
                            <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${persenLunas}%` }} />
                                </div>
                                <span className="text-xs font-semibold tabular-nums">{persenLunas}%</span>
                            </div>
                        ) : strip}
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Cicilan per Periode Gaji</p>
                        <p className={VALUE_CLASS}>{formatRupiah(data.cicilan_per_periode)}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>Mulai Dipotong</p>
                        <p className={VALUE_CLASS}>Gajian {labelBulan(data.mulai_potong)}</p>
                    </div>
                    <div>
                        <p className={LABEL_CLASS}>{cair ? 'Perkiraan Sisa Potongan' : 'Perkiraan Jumlah Potongan'}</p>
                        {data.status === 'lunas' ? strip : <p className={VALUE_CLASS}>± {formatNum(data.sisa_potongan)} kali potong gaji</p>}
                    </div>
                </div>
            </Card>

            {!data.saldo_awal && (
                <Card>
                    <p className={SECTION_CLASS}>Pencairan &amp; Pengajuan</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <div>
                            <p className={LABEL_CLASS}>Bank</p>
                            <p className={VALUE_CLASS}>{data.nama_bank ?? '—'}</p>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Nomor Rekening</p>
                            <p className={`${VALUE_CLASS} font-mono`}>{data.nomor_rekening ?? '—'}</p>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>No. Pengajuan</p>
                            <p className={`${VALUE_CLASS} font-mono`}>{data.nomor_pengajuan ?? '—'}</p>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Tanggal Transfer</p>
                            <p className={VALUE_CLASS}>{data.tanggal_transfer ? dayjs(data.tanggal_transfer).format('DD MMM YYYY') : '—'}</p>
                        </div>
                    </div>
                </Card>
            )}

            <Card bodyClass="p-0">
                <p className={`${SECTION_CLASS} px-4 pt-4`}>Riwayat Pembayaran</p>
                {pembayaran.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center pb-8 pt-2">Belum ada pembayaran — potongan gaji tercatat otomatis saat periode payroll difinalisasi.</p>
                ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-gray-700 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={`${TH_CLASS} text-left`}>Tanggal</th>
                                    <th className={`${TH_CLASS} text-left`}>Sumber</th>
                                    <th className={`${TH_CLASS} text-left`}>Keterangan</th>
                                    <th className={`${TH_CLASS} text-right`}>Nominal</th>
                                    <th className="py-2.5 px-4 w-16" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {pembayaran.map(p => (
                                    <tr key={p.id_kasbon_pembayaran}>
                                        <td className="py-2.5 px-4 whitespace-nowrap">{dayjs(p.tanggal).format('DD MMM YYYY')}</td>
                                        <td className="py-2.5 px-4">
                                            <Tag className={`text-xs font-semibold ${p.sumber === 'payroll'
                                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100'
                                                : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300'}`}>
                                                {p.sumber === 'payroll' ? 'Potong Gaji' : 'Pelunasan Manual'}
                                            </Tag>
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <div className="flex flex-col">
                                                <span>{p.sumber === 'payroll' ? `Periode ${p.nama_periode ?? '—'}` : (p.keterangan ?? '—')}</span>
                                                {p.tercatat_pemasukan && <span className="text-xs text-gray-400">Tercatat sebagai pemasukan di Arus Kas</span>}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-4 text-right tabular-nums font-semibold whitespace-nowrap">{formatRupiah(p.nominal)}</td>
                                        <td className="py-2.5 px-4">
                                            {p.bisa_dihapus && (
                                                <Tooltip title="Hapus Pelunasan">
                                                    <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                        onClick={() => setHapusBayar(p)}>
                                                        <HiOutlineTrash className="text-lg" />
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {perubahanCicilan.length > 0 && (
                <Card bodyClass="p-0">
                    <p className={`${SECTION_CLASS} px-4 pt-4`}>Riwayat Perubahan Cicilan</p>
                    <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-gray-700 sticky top-0">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={`${TH_CLASS} text-left`}>Waktu</th>
                                    <th className={`${TH_CLASS} text-left`}>Oleh</th>
                                    <th className={`${TH_CLASS} text-left`}>Cicilan</th>
                                    <th className={`${TH_CLASS} text-left`}>Mulai Dipotong</th>
                                    <th className={`${TH_CLASS} text-left`}>Alasan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {perubahanCicilan.map(r => (
                                    <tr key={r.id_riwayat_cicilan}>
                                        <td className="py-2.5 px-4 whitespace-nowrap">{dayjs(r.waktu).format('DD MMM YYYY HH:mm')}</td>
                                        <td className="py-2.5 px-4">{r.oleh ?? '—'}</td>
                                        <td className="py-2.5 px-4 whitespace-nowrap tabular-nums">
                                            {formatRupiah(r.cicilan_lama)} → <span className="font-semibold">{formatRupiah(r.cicilan_baru)}</span>
                                        </td>
                                        <td className="py-2.5 px-4 whitespace-nowrap">
                                            {r.mulai_potong_lama === r.mulai_potong_baru
                                                ? labelBulan(r.mulai_potong_baru)
                                                : <>{labelBulan(r.mulai_potong_lama)} → <span className="font-semibold">{labelBulan(r.mulai_potong_baru)}</span></>}
                                        </td>
                                        <td className="py-2.5 px-4">{r.alasan}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <div className="flex">
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.KASBON)}>Kembali</Button>
            </div>

            <Dialog isOpen={pelunasanOpen} width={480} onRequestClose={() => setPelunasanOpen(false)} onClose={() => setPelunasanOpen(false)}>
                <h5 className="font-bold mb-1">Catat Pelunasan Kasbon</h5>
                <p className="text-xs text-gray-400 mb-4">
                    Untuk pembayaran di luar potongan gaji. Sisa kasbon saat ini {formatRupiah(data.sisa)}.
                    Bila slip gaji draft sudah memotong kasbon ini, koreksi slipnya supaya tidak melebihi sisa.
                </p>
                <form onSubmit={e => { e.preventDefault(); handlePelunasan() }}>
                    <FormItem label="Tanggal" asterisk invalid={!!errorBayar.tanggal} errorMessage={errorBayar.tanggal}>
                        <DatePicker inputFormat="DD/MM/YYYY" maxDate={dayjs().toDate()}
                            value={tanggalBayar ? dayjs(tanggalBayar).toDate() : null}
                            onChange={date => { setTanggalBayar(date ? dayjs(date).format('YYYY-MM-DD') : ''); setErrorBayar(p => ({ ...p, tanggal: undefined })) }} />
                    </FormItem>
                    <FormItem label="Nominal" asterisk invalid={!!errorBayar.nominal} errorMessage={errorBayar.nominal}>
                        <Input prefix="Rp" placeholder="0" value={nominalBayar ? formatNum(Number(nominalBayar)) : ''}
                            invalid={!!errorBayar.nominal}
                            onChange={e => { setNominalBayar(angkaRupiah(e.target.value)); setErrorBayar(p => ({ ...p, nominal: undefined })) }} />
                    </FormItem>
                    <FormItem label={catatPemasukan ? 'Keterangan (opsional)' : 'Keterangan'} asterisk={!catatPemasukan}
                        invalid={!!errorBayar.keterangan} errorMessage={errorBayar.keterangan}>
                        <Input maxLength={200} placeholder={catatPemasukan ? 'Contoh: Bayar tunai ke kasir' : 'Contoh: Pemutihan sisa kasbon'} value={keteranganBayar}
                            invalid={!!errorBayar.keterangan}
                            onChange={e => { setKeteranganBayar(e.target.value); setErrorBayar(p => ({ ...p, keterangan: undefined })) }} />
                    </FormItem>
                    <Checkbox checked={catatPemasukan}
                        onChange={(checked: boolean) => { setCatatPemasukan(checked); setErrorBayar(p => ({ ...p, keterangan: undefined })) }}>
                        Catat sebagai pemasukan kas di Arus Kas
                    </Checkbox>
                    <p className="text-xs text-gray-400 mt-1 ml-6">Hilangkan centang bila tidak ada uang masuk, misalnya pemutihan atau koreksi — keterangan jadi wajib.</p>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setPelunasanOpen(false)}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={menyimpanBayar}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={cicilanOpen} width={480} onRequestClose={() => setCicilanOpen(false)} onClose={() => setCicilanOpen(false)}>
                <h5 className="font-bold mb-1">Ubah Cicilan Kasbon</h5>
                <p className="text-xs text-gray-400 mb-4">Berlaku untuk slip gaji yang dibuat setelah perubahan ini. Slip draft yang sudah ada perlu digenerate ulang atau dikoreksi.</p>
                <form onSubmit={e => { e.preventDefault(); handleCicilan() }}>
                    <FormItem label="Cicilan per Periode Gaji" asterisk invalid={!!errorCicilan.cicilan} errorMessage={errorCicilan.cicilan}>
                        <Input prefix="Rp" placeholder="0" value={cicilanBaru ? formatNum(Number(cicilanBaru)) : ''}
                            invalid={!!errorCicilan.cicilan}
                            onChange={e => { setCicilanBaru(angkaRupiah(e.target.value)); setErrorCicilan(p => ({ ...p, cicilan: undefined })) }} />
                    </FormItem>
                    <div className="grid grid-cols-2 gap-x-4">
                        <FormItem label="Mulai Dipotong — Bulan Gajian" asterisk invalid={!!errorCicilan.mulai} errorMessage={errorCicilan.mulai}>
                            <Select<OpsiTeks> isSearchable={false} options={BULAN_OPTIONS}
                                value={BULAN_OPTIONS.find(o => o.value === bulanPotong) ?? null}
                                onChange={opt => { if (opt) setBulanPotong((opt as OpsiTeks).value); setErrorCicilan(p => ({ ...p, mulai: undefined, cicilan: undefined })) }} />
                        </FormItem>
                        <FormItem label="Tahun" asterisk>
                            <Select<OpsiTeks> isSearchable={false} options={tahunOptions}
                                value={tahunOptions.find(o => o.value === tahunPotong) ?? null}
                                onChange={opt => { if (opt) setTahunPotong((opt as OpsiTeks).value); setErrorCicilan(p => ({ ...p, mulai: undefined, cicilan: undefined })) }} />
                        </FormItem>
                    </div>
                    <FormItem label="Alasan Perubahan" asterisk invalid={!!errorCicilan.alasan} errorMessage={errorCicilan.alasan}>
                        <Input textArea rows={2} maxLength={MAKS_ALASAN} placeholder="Contoh: Permintaan karyawan, cicilan diringankan 3 bulan" value={alasanCicilan}
                            invalid={!!errorCicilan.alasan}
                            onChange={e => { setAlasanCicilan(e.target.value); setErrorCicilan(p => ({ ...p, alasan: undefined })) }} />
                    </FormItem>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setCicilanOpen(false)}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={menyimpanCicilan}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={hapusOpen} type="danger" title="Hapus Kasbon?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setHapusOpen(false)} onCancel={() => setHapusOpen(false)} onConfirm={handleHapus}>
                <p className="text-sm">
                    Kasbon <span className="font-semibold">{data.nomor_kasbon}</span> ({data.nama_karyawan})
                    {data.saldo_awal ? '' : ' beserta pengajuannya'} akan dihapus. Tindakan ini tidak dapat dibatalkan.
                </p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!hapusBayar} type="danger" title="Hapus Pelunasan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={() => setHapusBayar(null)} onCancel={() => setHapusBayar(null)} onConfirm={handleHapusBayar}>
                <p className="text-sm">
                    Pelunasan <span className="font-semibold">{formatRupiah(hapusBayar?.nominal)}</span> akan dihapus dan sisa kasbon bertambah kembali.
                    {hapusBayar?.tercatat_pemasukan ? ' Catatan pemasukannya di Arus Kas ikut dihapus.' : ''}
                </p>
            </ConfirmDialog>

            {dialogLog}
        </div>
    )
}
