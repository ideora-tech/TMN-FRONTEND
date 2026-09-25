'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Button, Card, Input, Tag, Tooltip, Switcher, toast, Notification } from '@/components/ui'
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
    PiShoppingCartDuotone,
    PiPackageDuotone,
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
import { pembelianSparepartService } from '@/services/pembelianSparepart.service'
import { STATUS_LABEL, STATUS_TAG, STATUS_URUT, TIPE_LABEL, TIPE_TAG } from './status'
import DetailPermintaanDrawer from './DetailPermintaanDrawer'
import LaporanPengadaanTab from './LaporanPengadaanTab'
import DaftarPembelianTab from '../pembelian-sparepart/DaftarPembelianTab'

type Option = { value: string; label: string }
const STATUS_OPTIONS: Option[] = [{ value: '', label: 'Semua Status' }, ...STATUS_URUT.map(s => ({ value: s, label: STATUS_LABEL[s] }))]
const TIPE_OPTIONS: Option[] = [{ value: '', label: 'Semua Tipe' }, { value: 'umum', label: TIPE_LABEL.umum }, { value: 'sparepart', label: TIPE_LABEL.sparepart }, { value: 'aset', label: TIPE_LABEL.aset }]
const TIPE_VALUES = ['umum', 'sparepart', 'aset']

const TAB_VALUES = ['permintaan', 'langsung', 'laporan'] as const
type TabValue = (typeof TAB_VALUES)[number]
const PERAN_LAPORAN = ['superadmin', 'admin', 'manager', 'pengadaan', 'keuangan']

const KARTU_STATUS: { key: StatusPermintaan; icon: ReactNode; bg: string; text: string; ring: string }[] = [
    { key: 'menunggu_approval', icon: <PiHourglassMediumDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400' },
    { key: 'disetujui',         icon: <PiThumbsUpDuotone className="text-3xl text-indigo-500" />,       bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-600 dark:text-indigo-400',   ring: 'ring-indigo-400' },
    { key: 'diproses',          icon: <PiGearDuotone className="text-3xl text-blue-500" />,             bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       ring: 'ring-blue-400' },
    { key: 'dibeli',            icon: <PiShoppingCartDuotone className="text-3xl text-violet-500" />,   bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400',   ring: 'ring-violet-400' },
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
    const [langsungTersedia, setLangsungTersedia] = useState<boolean | null>(null)
    const [jumlahLangsung, setJumlahLangsung] = useState<number | null>(null)

    useEffect(() => {
        pembelianSparepartService.list({ page: 1, limit: 1, sumber: 'langsung' })
            .then(res => { setLangsungTersedia(true); setJumlahLangsung(res.meta.total) })
            .catch(err => setLangsungTersedia(!(axios.isAxiosError(err) && err.response?.status === 403)))
    }, [])

    useEffect(() => {
        if (TAB_VALUES.includes(tabParam as TabValue)) setActiveTab(tabParam as TabValue)
    }, [tabParam])

    const tabTampil: TabValue = (activeTab === 'langsung' && langsungTersedia === false) || (activeTab === 'laporan' && !bolehLaporan)
        ? 'permintaan'
        : activeTab

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
    const [milikSaya, setMilikSaya] = useState(false)
    const [dari, setDari] = useState<Date | null>(null)
    const [sampai, setSampai] = useState<Date | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [total, setTotal] = useState(0)
    const detailParam = searchParams.get('detail')
    const [detailId, setDetailId] = useState<string | null>(detailParam)

    useEffect(() => { if (detailParam) setDetailId(detailParam) }, [detailParam])

    const tutupDetail = () => {
        setDetailId(null)
        if (detailParam) router.replace(ROUTES.PERMINTAAN_PEMBELIAN, { scroll: false })
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await permintaanPembelianService.list({
                page: currentPage, limit: pageSize, search: search || undefined, status: statusFilter || undefined,
                tipe: tipeFilter || undefined,
                milik_saya: milikSaya ? '1' : undefined,
                dari: dari ? dayjs(dari).format('YYYY-MM-DD') : undefined, sampai: sampai ? dayjs(sampai).format('YYYY-MM-DD') : undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
            setRingkasan(res.meta.ringkasan ?? {})
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter, tipeFilter, milikSaya, dari, sampai])

    useEffect(() => { fetchData() }, [fetchData])

    const columns: ColumnDef<PermintaanPembelian>[] = [
        { header: 'Nomor', accessorKey: 'nomor_permintaan', size: 150, cell: ({ row }) => <span className="font-mono font-semibold text-xs">{row.original.nomor_permintaan}</span> },
        { header: 'Judul', accessorKey: 'judul', cell: ({ row }) => (
            <div>
                <div className="flex items-center gap-2">
                    <p className="font-semibold">{row.original.judul}</p>
                    {row.original.tipe !== 'umum' && <Tag className={`text-[10px] font-semibold px-1.5 py-0 ${TIPE_TAG[row.original.tipe] ?? TIPE_TAG.umum}`}>{TIPE_LABEL[row.original.tipe] ?? row.original.tipe}</Tag>}
                </div>
                <p className="text-xs text-gray-400">{row.original.username_pengaju ?? '—'}{row.original.nama_departemen ? ` · ${row.original.nama_departemen}` : ''}</p>
            </div>
        ) },
        { header: 'Tanggal', accessorKey: 'tanggal_permintaan', size: 120, cell: ({ row }) => dayjs(row.original.tanggal_permintaan).format('DD MMM YYYY') },
        { header: 'Dibutuhkan', accessorKey: 'tanggal_dibutuhkan', size: 120, cell: ({ row }) => row.original.tanggal_dibutuhkan ? dayjs(row.original.tanggal_dibutuhkan).format('DD MMM YYYY') : <span className="text-gray-400">—</span> },
        { header: 'Estimasi', accessorKey: 'total_estimasi', size: 140, cell: ({ row }) => <span className="tabular-nums">{formatRupiah(row.original.total_estimasi)}</span> },
        { header: 'Aktual', accessorKey: 'total_aktual', size: 140, cell: ({ row }) => row.original.total_aktual !== null ? <span className="tabular-nums font-semibold">{formatRupiah(row.original.total_aktual)}</span> : <span className="text-gray-400">—</span> },
        { header: 'Status', accessorKey: 'status', size: 160, cell: ({ row }) => <Tag className={`text-xs font-semibold ${STATUS_TAG[row.original.status]}`}>{STATUS_LABEL[row.original.status]}</Tag> },
        { header: '', id: 'aksi', size: 60, cell: ({ row }) => (
            <Tooltip title="Detail"><span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300" onClick={() => setDetailId(row.original.id_permintaan)}><HiOutlineEye className="text-lg" /></span></Tooltip>
        ) },
    ]

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
                    {langsungTersedia && <Tabs.TabNav value="langsung">{jumlahLangsung !== null ? `Pembelian Langsung (${formatNum(jumlahLangsung)})` : 'Pembelian Langsung'}</Tabs.TabNav>}
                    {bolehLaporan && <Tabs.TabNav value="laporan">Laporan</Tabs.TabNav>}
                </Tabs.TabList>
                <div>
                    <Tabs.TabContent value="permintaan">
                        <div className="flex flex-col gap-4 mt-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-4">
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
                                    <div className="w-full sm:w-40 shrink-0"><DatePicker inputFormat="DD/MM/YYYY" placeholder="Dari tanggal" value={dari} onChange={d => { setDari(d); setCurrentPage(1) }} /></div>
                                    <div className="w-full sm:w-40 shrink-0"><DatePicker inputFormat="DD/MM/YYYY" placeholder="Sampai tanggal" value={sampai} onChange={d => { setSampai(d); setCurrentPage(1) }} /></div>
                                    <div className="flex items-center gap-2"><Switcher checked={milikSaya} onChange={v => { setMilikSaya(v); setCurrentPage(1) }} /><span className="text-sm">Milik saya</span></div>
                                </div>
                                <DataTable columns={columns} data={list as unknown[]} loading={loading} noData={!loading && list.length === 0}
                                    pagingData={{ total, pageIndex: currentPage, pageSize }} onPaginationChange={setCurrentPage}
                                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }} />
                            </Card>
                        </div>
                    </Tabs.TabContent>
                    {langsungTersedia && (
                        <Tabs.TabContent value="langsung">
                            <div className="mt-4"><DaftarPembelianTab sumber="langsung" /></div>
                        </Tabs.TabContent>
                    )}
                    {bolehLaporan && (
                        <Tabs.TabContent value="laporan">
                            <div className="mt-4"><LaporanPengadaanTab onBukaPr={setDetailId} /></div>
                        </Tabs.TabContent>
                    )}
                </div>
            </Tabs>

            <DetailPermintaanDrawer id={detailId} onClose={tutupDetail} onRefresh={fetchData} />
        </div>
    )
}
