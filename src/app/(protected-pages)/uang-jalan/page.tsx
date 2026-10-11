'use client'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Button, Input, Select, Tag, Tooltip, Pagination, Spinner, toast, Notification } from '@/components/ui'
import Table from '@/components/ui/Table'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineTrash, HiOutlineEye, HiOutlinePencilAlt, HiOutlineClipboardList, HiOutlineChevronDown } from 'react-icons/hi'
import Loading from '@/components/shared/Loading'
import TableRowSkeleton from '@/components/shared/loaders/TableRowSkeleton'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import FileNotFound from '@/assets/svg/FileNotFound'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { uangJalanService, FILTER_DI_LUAR_PROYEK, KelompokUangJalan, OpsiProyek, UangJalan } from '@/services/uangJalan.service'
import type { StatusPengajuan } from '@/services/arusKas.service'
import { STATUS_LABEL, STATUS_TAG } from '../arus-kas/pengajuanMeta'
import { useLogPengajuan } from '../arus-kas/useLogPengajuan'

const { Tr, Th, Td, THead, TBody } = Table

type StatusOption = { value: '' | StatusPengajuan; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '', label: 'Semua Status' },
    { value: 'menunggu_approval', label: STATUS_LABEL.menunggu_approval },
    { value: 'disetujui', label: STATUS_LABEL.disetujui },
    { value: 'dicek', label: STATUS_LABEL.dicek },
    { value: 'siap_transfer', label: STATUS_LABEL.siap_transfer },
    { value: 'ditolak', label: STATUS_LABEL.ditolak },
    { value: 'ditransfer', label: STATUS_LABEL.ditransfer },
]

const URUTAN_STATUS: StatusPengajuan[] = ['menunggu_approval', 'disetujui', 'diajukan', 'dicek', 'siap_transfer', 'ditolak', 'ditransfer']

type PageSizeOption = { value: number; label: string }
const PAGE_SIZE_OPTIONS: PageSizeOption[] = [10, 25, 50, 100].map(n => ({ value: n, label: `${n} / page` }))

const KOLOM: { label: string; lebar: number }[] = [
    { label: 'No', lebar: 50 },
    { label: 'Nomor', lebar: 180 },
    { label: 'Driver', lebar: 230 },
    { label: 'No. Polisi', lebar: 120 },
    { label: 'Rute', lebar: 190 },
    { label: 'Proyek', lebar: 180 },
    { label: 'UJ/Trip', lebar: 150 },
    { label: 'Nominal Transfer', lebar: 150 },
    { label: 'Status', lebar: 170 },
    { label: '', lebar: 190 },
]

const JUMLAH_ANAK_PER_MUAT = 10
const MAKS_HALAMAN_SEGARKAN = 10

type PermintaanAnak = { halaman: number; segarkan: boolean }
type AnakKelompok = { data: UangJalan[]; total: number; halaman: number; loading: boolean; gagal: PermintaanAnak | null }
const ANAK_KOSONG: AnakKelompok = { data: [], total: 0, halaman: 0, loading: false, gagal: null }

type TargetHapus = { item: UangJalan; kelompok: KelompokUangJalan | null }

const labelStatusDriver = (u: Pick<UangJalan, 'tipe_driver' | 'nama_vendor'>) =>
    u.tipe_driver === 'vendor' ? `Driver Vendor ${u.nama_vendor ?? ''}`.trim() : 'Driver Internal'

const rentangTanggal = (awal: string, akhir: string) => {
    const a = dayjs(awal)
    const b = dayjs(akhir)
    if (a.isSame(b, 'day')) return b.format('DD MMM YYYY')
    return `${a.format(a.isSame(b, 'year') ? 'DD MMM' : 'DD MMM YYYY')} – ${b.format('DD MMM YYYY')}`
}

export default function UangJalanPage() {
    const router = useRouter()
    const [list, setList]             = useState<KelompokUangJalan[]>([])
    const [loading, setLoading]       = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState<'' | StatusPengajuan>('')
    const [proyekFilter, setProyekFilter] = useState('')
    const [proyekOptions, setProyekOptions] = useState<OpsiProyek[]>([])
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)
    const [terbuka, setTerbuka]         = useState<Record<string, boolean>>({})
    const [anak, setAnak]               = useState<Record<string, AnakKelompok>>({})
    const [deleteTarget, setDeleteTarget] = useState<TargetHapus | null>(null)

    const urutanRef     = useRef(0)
    const generasiRef   = useRef(0)
    const urutanAnakRef = useRef<Record<string, number>>({})

    const { bukaLog, dialogLog } = useLogPengajuan(uangJalanService.riwayat)

    const filter = useMemo(
        () => ({ search, status: statusFilter, id_proyek: proyekFilter }),
        [search, statusFilter, proyekFilter],
    )

    const fetchData = useCallback(async (pertahankanTerbuka = false) => {
        const urutan = ++urutanRef.current
        if (!pertahankanTerbuka) {
            generasiRef.current += 1
            urutanAnakRef.current = {}
            setTerbuka({})
            setAnak({})
        }
        setLoading(true)
        try {
            const res = await uangJalanService.listKelompok(currentPage, pageSize, filter)
            if (urutan !== urutanRef.current) return null
            const halamanTerakhir = Math.max(1, res.meta.totalPages)
            if (currentPage > halamanTerakhir) {
                setCurrentPage(halamanTerakhir)
                return null
            }
            setList(res.data)
            setTotal(res.meta.total)
            return res.data
        } catch (err) {
            if (urutan !== urutanRef.current) return null
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            return null
        } finally {
            if (urutan === urutanRef.current) setLoading(false)
        }
    }, [currentPage, pageSize, filter])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        uangJalanService.opsiProyek()
            .then(setProyekOptions)
            .catch(() => {})
    }, [])

    const muatAnak = useCallback(async (k: KelompokUangJalan, halaman: number, segarkan = false) => {
        const generasi = generasiRef.current
        const urutan = (urutanAnakRef.current[k.kunci] ?? 0) + 1
        urutanAnakRef.current[k.kunci] = urutan
        const usang = () => generasi !== generasiRef.current || urutanAnakRef.current[k.kunci] !== urutan

        setAnak(prev => ({ ...prev, [k.kunci]: { ...(prev[k.kunci] ?? ANAK_KOSONG), loading: true, gagal: null } }))
        try {
            const res = segarkan
                ? await uangJalanService.list(1, halaman * JUMLAH_ANAK_PER_MUAT, filter, k)
                : await uangJalanService.list(halaman, JUMLAH_ANAK_PER_MUAT, filter, k)
            if (usang()) return
            setAnak(prev => {
                const lama = segarkan || halaman === 1 ? [] : (prev[k.kunci]?.data ?? [])
                const sudahAda = new Set(lama.map(u => u.id_uang_jalan))
                return {
                    ...prev,
                    [k.kunci]: {
                        data: [...lama, ...res.data.filter(u => !sudahAda.has(u.id_uang_jalan))],
                        total: res.meta.total,
                        halaman,
                        loading: false,
                        gagal: null,
                    },
                }
            })
        } catch (err) {
            if (usang()) return
            setAnak(prev => ({ ...prev, [k.kunci]: { ...(prev[k.kunci] ?? ANAK_KOSONG), loading: false, gagal: { halaman, segarkan } } }))
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        }
    }, [filter])

    const terkiniRef = useRef({ fetchData, muatAnak, anak })
    useEffect(() => { terkiniRef.current = { fetchData, muatAnak, anak } }, [fetchData, muatAnak, anak])

    const toggleKelompok = (k: KelompokUangJalan) => {
        const buka = !terbuka[k.kunci]
        setTerbuka(prev => ({ ...prev, [k.kunci]: buka }))
        if (buka && !anak[k.kunci]) muatAnak(k, 1)
    }

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const tutupHapus = () => { if (!submitting) setDeleteTarget(null) }

    const handleDelete = async () => {
        if (!deleteTarget || submitting) return
        const { item, kelompok } = deleteTarget
        setSubmitting(true)
        try {
            await uangJalanService.delete(item.id_uang_jalan)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
            setSubmitting(false)
            return
        }
        toast.push(<Notification type="success" title="Uang jalan berhasil dihapus" />)
        setDeleteTarget(null)
        setSubmitting(false)

        const generasi = generasiRef.current
        if (kelompok) {
            setAnak(prev => {
                const a = prev[kelompok.kunci]
                if (!a) return prev
                return {
                    ...prev,
                    [kelompok.kunci]: {
                        ...a,
                        data: a.data.filter(u => u.id_uang_jalan !== item.id_uang_jalan),
                        total: Math.max(0, a.total - 1),
                    },
                }
            })
        }

        const daftarBaru = await terkiniRef.current.fetchData(true)
        if (!kelompok || generasi !== generasiRef.current) return
        if (!daftarBaru?.some(k => k.kunci === kelompok.kunci && !k.tunggal)) return
        const halamanDimuat = terkiniRef.current.anak[kelompok.kunci]?.halaman ?? 1
        terkiniRef.current.muatAnak(kelompok, Math.min(MAKS_HALAMAN_SEGARKAN, Math.max(1, halamanDimuat)), true)
    }

    const selDriver = (u: Pick<UangJalan, 'nama_driver' | 'tipe_driver' | 'nama_vendor'>) => (
        <div className="flex flex-col">
            <span className="font-semibold">{u.nama_driver}</span>
            <span className="text-xs text-gray-400">{labelStatusDriver(u)}</span>
        </div>
    )

    const selAlasanLuarProyek = (alasan: string | null | undefined) => alasan
        ? <span className="text-xs text-gray-400 line-clamp-2 max-w-56 [overflow-wrap:anywhere]" title={alasan}>{alasan}</span>
        : null

    const selProyek = (u: Pick<UangJalan, 'id_proyek' | 'nama_proyek' | 'kode_proyek'>, alasan?: string | null) => u.id_proyek
        ? (
            <div className="flex flex-col">
                <span className="font-semibold">{u.nama_proyek}</span>
                <span className="text-xs text-gray-400 font-mono">{u.kode_proyek}</span>
            </div>
        )
        : (
            <div className="flex flex-col">
                <span className="text-gray-500">Di luar proyek</span>
                {selAlasanLuarProyek(alasan)}
            </div>
        )

    const selAksi = (u: UangJalan, kelompok: KelompokUangJalan | null) => (
        <div className="flex items-center justify-end gap-1">
            <Tooltip title="Lihat Detail">
                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                    onClick={() => router.push(ROUTES.UANG_JALAN_DETAIL(u.id_uang_jalan))}>
                    <HiOutlineEye className="text-lg" />
                </span>
            </Tooltip>
            {u.id_pengajuan && (
                <Tooltip title="Log Aktivitas Approval">
                    <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition-colors"
                        onClick={() => bukaLog(u.id_uang_jalan)}>
                        <HiOutlineClipboardList className="text-lg" />
                    </span>
                </Tooltip>
            )}
            {u.bisa_diubah && (
                <Tooltip title="Edit">
                    <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                        onClick={() => router.push(ROUTES.UANG_JALAN_EDIT(u.id_uang_jalan))}>
                        <HiOutlinePencilAlt className="text-lg" />
                    </span>
                </Tooltip>
            )}
            {u.bisa_diubah && (
                <Tooltip title="Hapus">
                    <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                        onClick={() => setDeleteTarget({ item: u, kelompok })}>
                        <HiOutlineTrash className="text-lg" />
                    </span>
                </Tooltip>
            )}
        </div>
    )

    const barisUangJalan = (u: UangJalan, no: number | null, kelompok: KelompokUangJalan | null) => (
        <Tr key={u.id_uang_jalan}>
            <Td>{no}</Td>
            <Td>
                <div className={`flex flex-col ${kelompok ? 'pl-6' : ''}`}>
                    <span className="font-mono font-semibold text-xs">{u.nomor_uang_jalan}</span>
                    <span className="text-xs text-gray-400">{dayjs(u.tanggal).format('DD MMM YYYY')}</span>
                </div>
            </Td>
            <Td>{!kelompok && selDriver(u)}</Td>
            <Td><span className="whitespace-nowrap">{u.nopol}</span></Td>
            <Td>{u.rute}</Td>
            <Td>{kelompok ? selAlasanLuarProyek(u.alasan_tanpa_proyek) : selProyek(u, u.alasan_tanpa_proyek)}</Td>
            <Td>
                <div className="flex flex-col">
                    <span className="tabular-nums whitespace-nowrap">{formatRupiah(u.uang_jalan_per_trip)}</span>
                    <span className="text-xs text-gray-400">{formatNum(u.jumlah_trip)} trip</span>
                </div>
            </Td>
            <Td><span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(u.nominal)}</span></Td>
            <Td>
                {u.status_pengajuan
                    ? <Tag className={`text-xs font-semibold ${STATUS_TAG[u.status_pengajuan]}`}>{STATUS_LABEL[u.status_pengajuan]}</Tag>
                    : '—'}
            </Td>
            <Td>{selAksi(u, kelompok)}</Td>
        </Tr>
    )

    const kakiAnak = (k: KelompokUangJalan, a: AnakKelompok | undefined) => {
        let isi: ReactNode = null
        if (!a || (a.loading && a.data.length === 0)) {
            isi = (
                <div className="flex items-center gap-2 text-gray-400">
                    <Spinner size={16} />
                    <span>Memuat rincian...</span>
                </div>
            )
        } else if (a.gagal) {
            const ulang = a.gagal
            isi = (
                <div className="flex items-center gap-3">
                    <span className="text-gray-400">Rincian gagal dimuat.</span>
                    <button type="button" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={() => muatAnak(k, ulang.halaman, ulang.segarkan)}>
                        Coba lagi
                    </button>
                </div>
            )
        } else if (a.data.length === 0) {
            isi = <span className="text-gray-400">Tidak ada uang jalan pada kelompok ini.</span>
        } else if (a.halaman * JUMLAH_ANAK_PER_MUAT < a.total) {
            isi = (
                <div className="flex items-center gap-3">
                    <span className="text-gray-400">Menampilkan {formatNum(a.data.length)} dari {formatNum(a.total)} uang jalan</span>
                    <button type="button" disabled={a.loading}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
                        onClick={() => muatAnak(k, a.halaman + 1)}>
                        {a.loading ? 'Memuat...' : 'Tampilkan lebih banyak'}
                    </button>
                </div>
            )
        }
        if (!isi) return null

        return (
            <Tr>
                <Td />
                <Td colSpan={KOLOM.length - 1}>
                    <div className="pl-6 text-xs">{isi}</div>
                </Td>
            </Tr>
        )
    }

    const barisKelompok = (k: KelompokUangJalan, no: number) => {
        const buka = !!terbuka[k.kunci]
        const a = anak[k.kunci]
        const statusAda = URUTAN_STATUS.filter(s => (k.status[s] ?? 0) > 0)
        return (
            <Fragment key={k.kunci}>
                <Tr className="cursor-pointer bg-gray-50 dark:bg-gray-700/40" onClick={() => toggleKelompok(k)}>
                    <Td>{no}</Td>
                    <Td>
                        <div className="flex items-start gap-2">
                            <HiOutlineChevronDown className={`mt-0.5 shrink-0 text-gray-400 transition-transform ${buka ? '' : '-rotate-90'}`} />
                            <div className="flex flex-col">
                                <span className="font-semibold text-xs whitespace-nowrap">{formatNum(k.jumlah)} uang jalan</span>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{rentangTanggal(k.tanggal_awal, k.tanggal_akhir)}</span>
                            </div>
                        </div>
                    </Td>
                    <Td>{selDriver(k)}</Td>
                    <Td>
                        {k.jumlah_nopol > 1
                            ? <span className="text-gray-500 whitespace-nowrap">{formatNum(k.jumlah_nopol)} unit</span>
                            : <span className="whitespace-nowrap">{k.nopol}</span>}
                    </Td>
                    <Td>
                        {k.jumlah_rute > 1
                            ? <span className="text-gray-500 whitespace-nowrap">{formatNum(k.jumlah_rute)} rute</span>
                            : k.rute}
                    </Td>
                    <Td>{selProyek(k)}</Td>
                    <Td><span className="whitespace-nowrap">{formatNum(k.total_trip)} trip</span></Td>
                    <Td><span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(k.total_nominal)}</span></Td>
                    <Td>
                        {statusAda.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {statusAda.map(s => (
                                    <Tag key={s} className={`text-xs font-semibold whitespace-nowrap ${STATUS_TAG[s]}`}>
                                        {STATUS_LABEL[s]} · {formatNum(k.status[s] ?? 0)}
                                    </Tag>
                                ))}
                            </div>
                        ) : '—'}
                    </Td>
                    <Td />
                </Tr>
                {buka && a?.data.map(u => barisUangJalan(u, null, k))}
                {buka && kakiAnak(k, a)}
            </Fragment>
        )
    }

    const proyekSelectOptions = [
        { value: FILTER_DI_LUAR_PROYEK, label: 'Di luar proyek' },
        ...proyekOptions.map(p => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` })),
    ]

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Uang Jalan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Input uang jalan driver — diajukan ke approval sesuai konfigurasi, lalu diproses di Proses Pembayaran</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.UANG_JALAN_BARU)}>
                    Tambah Uang Jalan
                </Button>
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input className="flex-1 min-w-60" placeholder="Cari nomor, driver, vendor, no. polisi, atau rute... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                    <div className="w-56 shrink-0">
                        <Select<StatusOption>
                            isSearchable={false}
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }} />
                    </div>
                    <div className="w-56 shrink-0">
                        <Select<{ value: string; label: string }>
                            isSearchable isClearable
                            placeholder="Semua proyek"
                            options={proyekSelectOptions}
                            value={proyekSelectOptions.find(o => o.value === proyekFilter) ?? null}
                            onChange={opt => { setProyekFilter((opt as { value: string } | null)?.value ?? ''); setCurrentPage(1) }} />
                    </div>
                </div>
                <Loading loading={loading && list.length !== 0} type="cover">
                    <Table>
                        <THead className="bg-blue-50 dark:bg-blue-500/10">
                            <Tr>
                                {KOLOM.map((kolom, i) => (
                                    <Th key={i} style={{ width: kolom.lebar }}>{kolom.label}</Th>
                                ))}
                            </Tr>
                        </THead>
                        {loading && list.length === 0 ? (
                            <TableRowSkeleton columns={KOLOM.length} rows={pageSize} />
                        ) : (
                            <TBody>
                                {list.length === 0 ? (
                                    <Tr>
                                        <Td className="hover:bg-transparent" colSpan={KOLOM.length}>
                                            <div className="flex flex-col items-center gap-4">
                                                <FileNotFound />
                                                <span className="font-semibold">Data tidak ditemukan</span>
                                            </div>
                                        </Td>
                                    </Tr>
                                ) : (
                                    list.map((k, idx) => {
                                        const no = (currentPage - 1) * pageSize + idx + 1
                                        return k.tunggal ? barisUangJalan(k.tunggal, no, null) : barisKelompok(k, no)
                                    })
                                )}
                            </TBody>
                        )}
                    </Table>
                    <div className="flex items-center justify-between mt-4 px-4 pb-4">
                        <Pagination pageSize={pageSize} currentPage={currentPage} total={total}
                            onChange={page => { if (!loading) setCurrentPage(page) }} />
                        <div style={{ minWidth: 130 }}>
                            <Select<PageSizeOption>
                                instanceId="uang-jalan-page-size"
                                size="sm"
                                menuPlacement="top"
                                isSearchable={false}
                                options={PAGE_SIZE_OPTIONS}
                                value={PAGE_SIZE_OPTIONS.find(o => o.value === pageSize) ?? PAGE_SIZE_OPTIONS[0]}
                                onChange={opt => {
                                    if (loading || !opt) return
                                    setPageSize((opt as PageSizeOption).value)
                                    setCurrentPage(1)
                                }} />
                        </div>
                    </div>
                </Loading>
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Uang Jalan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting, customColorClass: () => 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white border-red-500' }}
                onClose={tutupHapus} onCancel={tutupHapus} onConfirm={handleDelete}>
                <p className="text-sm">Uang jalan <span className="font-semibold">{deleteTarget?.item.nomor_uang_jalan}</span> ({deleteTarget?.item.nama_driver}) beserta pengajuannya akan dihapus. Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            {dialogLog}
        </div>
    )
}
