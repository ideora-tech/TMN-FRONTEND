'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, Input, Spinner, Tag, Tooltip, Switcher, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Tabs from '@/components/ui/Tabs'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import {
    PiHourglassMediumDuotone,
    PiThumbsUpDuotone,
    PiGearDuotone,
    PiFileTextDuotone,
    PiShoppingCartDuotone,
    PiPackageDuotone,
    PiTruckDuotone,
    PiCheckCircleDuotone,
    PiXCircleDuotone,
    PiArchiveDuotone,
} from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import useCurrentSession from '@/utils/hooks/useCurrentSession'
import { permintaanPembelianService, type PermintaanPembelian, type StatusPermintaan } from '@/services/permintaanPembelian.service'
import { STATUS_LABEL, STATUS_TAG, STATUS_URUT, TIPE_LABEL, TIPE_TAG } from './status'
import LaporanPengadaanTab from './LaporanPengadaanTab'

type Option = { value: string; label: string }
const STATUS_OPTIONS: Option[] = [{ value: '', label: 'Semua Status' }, ...STATUS_URUT.map(s => ({ value: s, label: STATUS_LABEL[s] }))]
const TIPE_OPTIONS: Option[] = [{ value: '', label: 'Semua Tipe' }, { value: 'umum', label: TIPE_LABEL.umum }, { value: 'sparepart', label: TIPE_LABEL.sparepart }, { value: 'aset', label: TIPE_LABEL.aset }]
const TIPE_VALUES = ['umum', 'sparepart', 'aset']
const PRIORITAS_OPTIONS: Option[] = [{ value: '', label: 'Semua Prioritas' }, { value: 'normal', label: 'Normal' }, { value: 'urgent', label: 'Urgent' }]

const TAB_VALUES = ['permintaan', 'laporan'] as const
type TabValue = (typeof TAB_VALUES)[number]
const PERAN_LAPORAN = ['superadmin', 'admin', 'manager', 'pengadaan', 'keuangan']

const KARTU_STATUS: { key: StatusPermintaan; icon: ReactNode; bg: string; text: string; ring: string }[] = [
    { key: 'menunggu_approval', icon: <PiHourglassMediumDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400' },
    { key: 'disetujui',         icon: <PiThumbsUpDuotone className="text-3xl text-indigo-500" />,       bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-600 dark:text-indigo-400',   ring: 'ring-indigo-400' },
    { key: 'diproses',          icon: <PiGearDuotone className="text-3xl text-blue-500" />,             bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       ring: 'ring-blue-400' },
    { key: 'dipesan',           icon: <PiFileTextDuotone className="text-3xl text-cyan-500" />,         bg: 'bg-cyan-50 dark:bg-cyan-500/10',       text: 'text-cyan-600 dark:text-cyan-400',       ring: 'ring-cyan-400' },
    { key: 'dibeli',            icon: <PiShoppingCartDuotone className="text-3xl text-violet-500" />,   bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400',   ring: 'ring-violet-400' },
    { key: 'diterima_sebagian', icon: <PiTruckDuotone className="text-3xl text-orange-500" />,          bg: 'bg-orange-50 dark:bg-orange-500/10',   text: 'text-orange-600 dark:text-orange-400',   ring: 'ring-orange-400' },
    { key: 'diterima',          icon: <PiPackageDuotone className="text-3xl text-teal-500" />,          bg: 'bg-teal-50 dark:bg-teal-500/10',       text: 'text-teal-600 dark:text-teal-400',       ring: 'ring-teal-400' },
    { key: 'selesai',           icon: <PiCheckCircleDuotone className="text-3xl text-emerald-500" />,   bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
    { key: 'ditolak',           icon: <PiXCircleDuotone className="text-3xl text-red-500" />,           bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400',         ring: 'ring-red-400' },
    { key: 'dibatalkan',        icon: <PiArchiveDuotone className="text-3xl text-gray-500" />,          bg: 'bg-gray-50 dark:bg-gray-500/10',       text: 'text-gray-600 dark:text-gray-400',       ring: 'ring-gray-400' },
]

export default function PermintaanPembelianPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { session } = useCurrentSession()
    const authority = ((session?.user?.authority ?? []) as string[]).map(a => a.toLowerCase())
    const bolehLaporan = PERAN_LAPORAN.some(r => authority.includes(r))

    const tabParam = searchParams.get('tab')
    const tabAwal: TabValue = TAB_VALUES.includes(tabParam as TabValue) ? (tabParam as TabValue) : 'permintaan'
    const [activeTab, setActiveTab] = useState<TabValue>(tabAwal)

    useEffect(() => {
        if (TAB_VALUES.includes(tabParam as TabValue)) setActiveTab(tabParam as TabValue)
    }, [tabParam])

    const tabTampil: TabValue = activeTab === 'laporan' && !bolehLaporan ? 'permintaan' : activeTab

    const gantiTab = (val: string) => {
        setActiveTab(val as TabValue)
        const params = new URLSearchParams(Array.from(searchParams.entries()))
        params.set('tab', val)
        router.replace(`${ROUTES.PERMINTAAN_PEMBELIAN}?${params.toString()}`, { scroll: false })
    }

    const statusParam = searchParams.get('status')
    const statusAwal = STATUS_URUT.includes(statusParam as StatusPermintaan) ? (statusParam as string) : ''
    const tipeParam = searchParams.get('tipe')
    const tipeAwal = TIPE_VALUES.includes(tipeParam ?? '') ? (tipeParam as string) : ''
    const [list, setList] = useState<PermintaanPembelian[]>([])
    const [loading, setLoading] = useState(false)
    const [ringkasan, setRingkasan] = useState<Partial<Record<StatusPermintaan, number>>>({})
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState(statusAwal)
    const [tipeFilter, setTipeFilter] = useState(tipeAwal)
    const [prioritasFilter, setPrioritasFilter] = useState('')
    const [milikSaya, setMilikSaya] = useState(false)
    const [hanyaDitolak, setHanyaDitolak] = useState(false)
    const [jumlahDitolak, setJumlahDitolak] = useState(0)
    const [hanyaMenungguBarang, setHanyaMenungguBarang] = useState(false)
    const [jumlahMenungguBarang, setJumlahMenungguBarang] = useState(0)
    const [lihatSemua, setLihatSemua] = useState(true)
    const [dari, setDari] = useState<Date | null>(null)
    const [sampai, setSampai] = useState<Date | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [total, setTotal] = useState(0)
    const detailParam = searchParams.get('detail')
    const bukaDetail = (idPermintaan: string) => router.push(ROUTES.PERMINTAAN_PEMBELIAN_DETAIL(idPermintaan))

    useEffect(() => {
        if (detailParam) router.replace(ROUTES.PERMINTAAN_PEMBELIAN_DETAIL(detailParam))
    }, [detailParam, router])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await permintaanPembelianService.list({
                page: currentPage, limit: pageSize, search: search || undefined, status: statusFilter || undefined,
                tipe: tipeFilter || undefined,
                prioritas: prioritasFilter || undefined,
                milik_saya: milikSaya ? '1' : undefined,
                pembayaran_ditolak: hanyaDitolak ? '1' : undefined,
                menunggu_barang: hanyaMenungguBarang ? '1' : undefined,
                dari: dari ? dayjs(dari).format('YYYY-MM-DD') : undefined, sampai: sampai ? dayjs(sampai).format('YYYY-MM-DD') : undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
            setRingkasan(res.meta.ringkasan ?? {})
            setJumlahDitolak(res.meta.pembayaran_ditolak ?? 0)
            setJumlahMenungguBarang(res.meta.dibayar_menunggu_barang ?? 0)
            setLihatSemua(res.meta.lihat_semua ?? true)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter, tipeFilter, prioritasFilter, milikSaya, hanyaDitolak, hanyaMenungguBarang, dari, sampai])

    useEffect(() => { fetchData() }, [fetchData])

    const columns: ColumnDef<PermintaanPembelian>[] = [
        { header: 'Nomor', accessorKey: 'nomor_permintaan', size: 150, cell: ({ row }) => (
            <Link href={ROUTES.PERMINTAAN_PEMBELIAN_DETAIL(row.original.id_permintaan)} className="font-mono font-semibold text-xs text-blue-500 hover:underline whitespace-nowrap">{row.original.nomor_permintaan}</Link>
        ) },
        { header: 'Judul', accessorKey: 'judul', cell: ({ row }) => (
            <div>
                <div className="flex items-center gap-2">
                    <p className="font-semibold">{row.original.judul}</p>
                    {row.original.prioritas === 'urgent' && <Tag className="text-[10px] font-semibold px-1.5 py-0 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Urgent</Tag>}
                    {row.original.tipe !== 'umum' && <Tag className={`text-[10px] font-semibold px-1.5 py-0 ${TIPE_TAG[row.original.tipe] ?? TIPE_TAG.umum}`}>{TIPE_LABEL[row.original.tipe] ?? row.original.tipe}</Tag>}
                </div>
                <p className="text-xs text-gray-400">
                    {row.original.username_pengaju ?? '—'}{row.original.nama_departemen ? ` · ${row.original.nama_departemen}` : ''}
                    {row.original.nama_kategori && row.original.nama_kategori !== row.original.judul ? ` · ${row.original.nama_kategori}` : ''}
                </p>
            </div>
        ) },
        { header: 'Tanggal', accessorKey: 'tanggal_permintaan', size: 120, cell: ({ row }) => dayjs(row.original.tanggal_permintaan).format('DD MMM YYYY') },
        { header: 'Dibutuhkan', accessorKey: 'tanggal_dibutuhkan', size: 120, cell: ({ row }) => row.original.tanggal_dibutuhkan ? dayjs(row.original.tanggal_dibutuhkan).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
        { header: 'Estimasi', accessorKey: 'total_estimasi', size: 140, cell: ({ row }) => <span className="tabular-nums">{formatRupiah(row.original.total_estimasi)}</span> },
        { header: 'Aktual', accessorKey: 'total_aktual', size: 140, cell: ({ row }) => row.original.total_aktual !== null ? <span className="tabular-nums font-semibold">{formatRupiah(row.original.total_aktual)}</span> : <span className="text-gray-400">—</span> },
        { header: 'Status', accessorKey: 'status', size: 160, cell: ({ row }) => (
            <div className="flex flex-col items-start gap-1">
                <Tag className={`text-xs font-semibold ${STATUS_TAG[row.original.status]}`}>{STATUS_LABEL[row.original.status]}</Tag>
                {row.original.pembayaran_ditolak && <Tag className="text-[10px] font-semibold px-1.5 py-0 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Pembayaran ditolak</Tag>}
            </div>
        ) },
        { header: '', id: 'aksi', size: 60, cell: ({ row }) => (
            <Tooltip title="Detail"><span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300" onClick={() => bukaDetail(row.original.id_permintaan)}><HiOutlineEye className="text-lg" /></span></Tooltip>
        ) },
    ]

    if (detailParam) return <div className="py-16 text-center"><Spinner className="inline-block" size={32} /></div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Permintaan Pembelian (PR)</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Satu pintu permintaan barang, jasa, spare part & aset armada — diproses tim Pengadaan</p>
                </div>
                {tabTampil === 'permintaan' && (
                    <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN_BARU)}>Tambah Permintaan</Button>
                )}
            </div>

            <Tabs value={tabTampil} onChange={gantiTab}>
                <Tabs.TabList>
                    <Tabs.TabNav value="permintaan">Permintaan</Tabs.TabNav>
                    {bolehLaporan && <Tabs.TabNav value="laporan">Laporan</Tabs.TabNav>}
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="permintaan">
                        <div className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-10 gap-4">
                                {KARTU_STATUS.map(k => {
                                    const aktif = statusFilter === k.key
                                    return (
                                        <Card key={k.key} clickable onClick={() => { setStatusFilter(aktif ? '' : k.key); setCurrentPage(1) }}
                                            className={`${k.bg} transition-shadow ${aktif ? `ring-2 ${k.ring}` : ''}`}>
                                            <div className="flex flex-col gap-2">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                                                    {k.icon}
                                                </div>
                                                <div className={`font-bold text-2xl ${k.text}`}>
                                                    {formatNum(ringkasan[k.key] ?? 0)}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{STATUS_LABEL[k.key]}</div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>

                            {(jumlahDitolak > 0 || hanyaDitolak) && (
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
                                    <p className="flex-1 min-w-48 text-sm text-red-700 dark:text-red-300">
                                        <span className="font-semibold">{formatNum(jumlahDitolak)} PR</span> pembayarannya ditolak dan menunggu diajukan ulang.
                                    </p>
                                    <Button size="sm" variant={hanyaDitolak ? 'solid' : 'default'} onClick={() => { setHanyaDitolak(v => !v); setHanyaMenungguBarang(false); setCurrentPage(1) }}>
                                        {hanyaDitolak ? 'Tampilkan semua' : 'Tampilkan'}
                                    </Button>
                                </div>
                            )}

                            {(jumlahMenungguBarang > 0 || hanyaMenungguBarang) && (
                                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                                    <p className="flex-1 min-w-48 text-sm text-amber-700 dark:text-amber-300">
                                        <span className="font-semibold">{formatNum(jumlahMenungguBarang)} PR</span> sudah dibayar di muka tetapi barangnya belum diterima lengkap.
                                    </p>
                                    <Button size="sm" variant={hanyaMenungguBarang ? 'solid' : 'default'} onClick={() => { setHanyaMenungguBarang(v => !v); setHanyaDitolak(false); setCurrentPage(1) }}>
                                        {hanyaMenungguBarang ? 'Tampilkan semua' : 'Tampilkan'}
                                    </Button>
                                </div>
                            )}

                            <Card bodyClass="p-0">
                                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                                    <Input className="flex-1 min-w-60" placeholder="Cari nomor / judul... (tekan Enter)"
                                        suffix={searchInput ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1) }} /> : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer" onClick={() => { setSearch(searchInput); setCurrentPage(1) }} />}
                                        value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setCurrentPage(1) } }} />
                                    <div className="w-full sm:w-48 shrink-0">
                                        <Select<Option> isSearchable={false} options={STATUS_OPTIONS} value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]} onChange={opt => { setStatusFilter((opt as Option).value); setCurrentPage(1) }} />
                                    </div>
                                    <div className="w-full sm:w-40 shrink-0">
                                        <Select<Option> isSearchable={false} options={TIPE_OPTIONS} value={TIPE_OPTIONS.find(o => o.value === tipeFilter) ?? TIPE_OPTIONS[0]} onChange={opt => { setTipeFilter((opt as Option).value); setCurrentPage(1) }} />
                                    </div>
                                    <div className="w-full sm:w-44 shrink-0">
                                        <Select<Option> isSearchable={false} options={PRIORITAS_OPTIONS} value={PRIORITAS_OPTIONS.find(o => o.value === prioritasFilter) ?? PRIORITAS_OPTIONS[0]} onChange={opt => { setPrioritasFilter((opt as Option).value); setCurrentPage(1) }} />
                                    </div>
                                    <div className="w-full sm:w-40 shrink-0"><DatePicker inputFormat="DD/MM/YYYY" placeholder="Dari tanggal" value={dari} onChange={d => { setDari(d); setCurrentPage(1) }} /></div>
                                    <div className="w-full sm:w-40 shrink-0"><DatePicker inputFormat="DD/MM/YYYY" placeholder="Sampai tanggal" value={sampai} onChange={d => { setSampai(d); setCurrentPage(1) }} /></div>
                                    {lihatSemua
                                        ? <div className="flex items-center gap-2"><Switcher checked={milikSaya} onChange={v => { setMilikSaya(v); setCurrentPage(1) }} /><span className="text-sm">Milik saya</span></div>
                                        : <span className="text-xs text-gray-400">Menampilkan permintaan yang Anda ajukan atau perlu Anda setujui</span>}
                                </div>
                                <DataTable columns={columns} data={list as unknown[]} loading={loading} noData={!loading && list.length === 0}
                                    pagingData={{ total, pageIndex: currentPage, pageSize }} onPaginationChange={setCurrentPage}
                                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
                            </Card>
                        </div>
                    </Tabs.TabContent>
                    {bolehLaporan && (
                        <Tabs.TabContent value="laporan">
                            <div className="mt-4"><LaporanPengadaanTab onBukaPr={bukaDetail} /></div>
                        </Tabs.TabContent>
                    )}
                </div>
            </Tabs>
        </div>
    )
}
