'use client'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Tag, Tooltip, toast, Notification } from '@/components/ui'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef } from '@/components/shared/DataTable'
import { HiOutlineEye, HiOutlineClipboardList, HiOutlineTruck, HiOutlineRefresh } from 'react-icons/hi'
import {
    PiHourglassMediumDuotone,
    PiThumbsUpDuotone,
    PiGearDuotone,
    PiShoppingCartDuotone,
    PiPackageDuotone,
    PiFileTextDuotone,
    PiCheckCircleDuotone,
    PiXCircleDuotone,
    PiArchiveDuotone,
} from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { pengadaanService, type RingkasanPengadaan, type AntrianPR, type AntrianPV } from '@/services/pengadaan.service'
import { permintaanPembelianService, type StatusPermintaan } from '@/services/permintaanPembelian.service'
import { permintaanVendorService, type PermintaanVendorStatus } from '@/services/permintaan-vendor.service'
import { STATUS_LABEL as STATUS_LABEL_PR, STATUS_TAG as STATUS_TAG_PR } from '../permintaan-pembelian/status'
import { STATUS_LABEL as STATUS_LABEL_PV, STATUS_TAG as STATUS_TAG_PV, MEKANISME_LABEL } from '../permintaan-vendor/status'
import DetailPermintaanDrawer from '../permintaan-pembelian/DetailPermintaanDrawer'

type KartuStatus<K extends string> = { key: K; icon: ReactNode; bg: string; text: string; ring: string }

const KARTU_PR: KartuStatus<StatusPermintaan>[] = [
    { key: 'menunggu_approval', icon: <PiHourglassMediumDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400' },
    { key: 'disetujui',         icon: <PiThumbsUpDuotone className="text-3xl text-indigo-500" />,       bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-600 dark:text-indigo-400',   ring: 'ring-indigo-400' },
    { key: 'diproses',          icon: <PiGearDuotone className="text-3xl text-blue-500" />,             bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       ring: 'ring-blue-400' },
    { key: 'dibeli',            icon: <PiShoppingCartDuotone className="text-3xl text-violet-500" />,   bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400',   ring: 'ring-violet-400' },
    { key: 'diterima',          icon: <PiPackageDuotone className="text-3xl text-teal-500" />,          bg: 'bg-teal-50 dark:bg-teal-500/10',       text: 'text-teal-600 dark:text-teal-400',       ring: 'ring-teal-400' },
    { key: 'selesai',           icon: <PiCheckCircleDuotone className="text-3xl text-emerald-500" />,   bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
    { key: 'ditolak',           icon: <PiXCircleDuotone className="text-3xl text-red-500" />,           bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400',         ring: 'ring-red-400' },
    { key: 'dibatalkan',        icon: <PiArchiveDuotone className="text-3xl text-gray-500" />,          bg: 'bg-gray-50 dark:bg-gray-500/10',       text: 'text-gray-600 dark:text-gray-400',       ring: 'ring-gray-400' },
]

const KARTU_PV: KartuStatus<PermintaanVendorStatus>[] = [
    { key: 'menunggu_approval', icon: <PiHourglassMediumDuotone className="text-3xl text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400' },
    { key: 'disetujui',         icon: <PiThumbsUpDuotone className="text-3xl text-indigo-500" />,       bg: 'bg-indigo-50 dark:bg-indigo-500/10',   text: 'text-indigo-600 dark:text-indigo-400',   ring: 'ring-indigo-400' },
    { key: 'diproses',          icon: <PiGearDuotone className="text-3xl text-blue-500" />,             bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       ring: 'ring-blue-400' },
    { key: 'dikontrakkan',      icon: <PiFileTextDuotone className="text-3xl text-violet-500" />,       bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400',   ring: 'ring-violet-400' },
    { key: 'selesai',           icon: <PiCheckCircleDuotone className="text-3xl text-emerald-500" />,   bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
    { key: 'ditolak',           icon: <PiXCircleDuotone className="text-3xl text-red-500" />,           bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400',         ring: 'ring-red-400' },
    { key: 'dibatalkan',        icon: <PiArchiveDuotone className="text-3xl text-gray-500" />,          bg: 'bg-gray-50 dark:bg-gray-500/10',       text: 'text-gray-600 dark:text-gray-400',       ring: 'ring-gray-400' },
]

type BarisAntrian = {
    jenis: 'pr' | 'pv'
    id: string
    nomor: string
    keterangan: string
    subketerangan: string | null
    pengaju: string | null
    tanggal: string | null
    status: string
    labelStatus: string
    kelasStatus: string
}

const dariPR = (p: AntrianPR): BarisAntrian => ({
    jenis: 'pr',
    id: p.id_permintaan,
    nomor: p.nomor_permintaan,
    keterangan: p.judul,
    subketerangan: `Estimasi ${formatRupiah(p.total_estimasi)}${p.tipe === 'sparepart' ? ' · Spare Part' : ''}`,
    pengaju: p.username_pengaju,
    tanggal: p.tanggal_permintaan,
    status: p.status,
    labelStatus: STATUS_LABEL_PR[p.status] ?? p.status,
    kelasStatus: STATUS_TAG_PR[p.status] ?? 'bg-gray-100 text-gray-600',
})

const dariPV = (p: AntrianPV): BarisAntrian => {
    const periode = (!p.periode_dari && !p.periode_sampai)
        ? null
        : `${p.periode_dari ? dayjs(p.periode_dari).format('DD/MM/YYYY') : '…'} – ${p.periode_sampai ? dayjs(p.periode_sampai).format('DD/MM/YYYY') : '…'}`
    return {
        jenis: 'pv',
        id: p.id_permintaan,
        nomor: p.nomor_permintaan,
        keterangan: `${formatNum(p.jumlah_unit)} unit · ${MEKANISME_LABEL[p.mekanisme] ?? p.mekanisme}`,
        subketerangan: periode ? `Periode ${periode}` : null,
        pengaju: p.nama_proyek,
        tanggal: p.dibuat_pada,
        status: p.status,
        labelStatus: STATUS_LABEL_PV[p.status] ?? p.status,
        kelasStatus: STATUS_TAG_PV[p.status] ?? 'bg-gray-100 text-gray-600',
    }
}

export default function PengadaanPage() {
    const router = useRouter()
    const [data, setData] = useState<RingkasanPengadaan | null>(null)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [detailPrId, setDetailPrId] = useState<string | null>(null)
    const [filterKartu, setFilterKartu] = useState<{ jenis: 'pr' | 'pv'; status: string } | null>(null)
    const [dataFilter, setDataFilter] = useState<BarisAntrian[]>([])
    const [loadingFilter, setLoadingFilter] = useState(false)

    const fetchFilter = useCallback(async () => {
        if (!filterKartu) return
        setLoadingFilter(true)
        try {
            if (filterKartu.jenis === 'pr') {
                const res = await permintaanPembelianService.list({ page: 1, limit: 100, status: filterKartu.status })
                setDataFilter(res.data.map(p => dariPR({
                    id_permintaan: p.id_permintaan, nomor_permintaan: p.nomor_permintaan, judul: p.judul, status: p.status,
                    tipe: p.tipe ?? 'umum', tanggal_permintaan: p.tanggal_permintaan, username_pengaju: p.username_pengaju ?? null, total_estimasi: p.total_estimasi,
                })))
            } else {
                const res = await permintaanVendorService.list(1, { limit: 100, status: filterKartu.status })
                setDataFilter(res.data.map(p => dariPV({
                    id_permintaan: p.id_permintaan, nomor_permintaan: p.nomor_permintaan, nama_proyek: p.nama_proyek ?? null, status: p.status,
                    mekanisme: p.mekanisme, jumlah_unit: p.jumlah_unit, periode_dari: p.periode_dari, periode_sampai: p.periode_sampai, dibuat_pada: p.dibuat_pada ?? null,
                })))
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoadingFilter(false)
        }
    }, [filterKartu])

    useEffect(() => { fetchFilter() }, [fetchFilter])

    const pilihKartu = (jenis: 'pr' | 'pv', status: string) => {
        setCurrentPage(1)
        setFilterKartu(prev => prev && prev.jenis === jenis && prev.status === status ? null : { jenis, status })
    }

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            setData(await pengadaanService.ringkasan())
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const ringkasanPR = data?.pr.ringkasan ?? {}
    const ringkasanPV = data?.permintaan_vendor.ringkasan ?? {}
    const antrian: BarisAntrian[] = [
        ...(data?.pr.menunggu ?? []).map(dariPR),
        ...(data?.permintaan_vendor.menunggu ?? []).map(dariPV),
    ].sort((a, b) => dayjs(a.tanggal ?? 0).valueOf() - dayjs(b.tanggal ?? 0).valueOf())
    const barisTampil = filterKartu ? dataFilter : antrian
    const antrianHalaman = barisTampil.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    const judulTabel = !filterKartu
        ? 'Menunggu Diproses'
        : `${filterKartu.jenis === 'pr' ? 'PR' : 'Permintaan Vendor'} · ${(filterKartu.jenis === 'pr' ? STATUS_LABEL_PR[filterKartu.status as StatusPermintaan] : STATUS_LABEL_PV[filterKartu.status as PermintaanVendorStatus]) ?? filterKartu.status}`
    const keteranganTabel = !filterKartu
        ? 'PR dan Permintaan Vendor berstatus Disetujui atau Diproses, urut dari yang paling lama'
        : 'Hasil filter dari kartu yang dipilih. Klik kartu yang sama lagi untuk kembali ke antrian.'

    const bukaBaris = (b: BarisAntrian) => {
        if (b.jenis === 'pr') setDetailPrId(b.id)
        else router.push(ROUTES.PERMINTAAN_VENDOR_DETAIL(b.id))
    }

    const columns: ColumnDef<BarisAntrian>[] = [
        { header: 'Jenis', id: 'jenis', size: 90, cell: ({ row }) => (
            row.original.jenis === 'pr'
                ? <Tag className="bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300 border-0 text-xs font-semibold">PR</Tag>
                : <Tag className="bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-0 text-xs font-semibold">Vendor</Tag>
        ) },
        { header: 'Nomor', accessorKey: 'nomor', size: 170, cell: ({ row }) => <span className="font-mono font-semibold text-xs">{row.original.nomor}</span> },
        { header: 'Keterangan', accessorKey: 'keterangan', cell: ({ row }) => (
            <div>
                <p className="font-semibold text-sm">{row.original.keterangan}</p>
                {row.original.subketerangan && <p className="text-xs text-gray-400 mt-0.5">{row.original.subketerangan}</p>}
            </div>
        ) },
        { header: 'Pengaju / Proyek', accessorKey: 'pengaju', size: 180, cell: ({ row }) => (
            row.original.pengaju
                ? <span className="text-sm text-gray-700 dark:text-gray-300">{row.original.pengaju}</span>
                : <span className="text-gray-400">—</span>
        ) },
        { header: 'Tanggal', accessorKey: 'tanggal', size: 130, cell: ({ row }) => (
            row.original.tanggal
                ? <span className="text-sm whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                : <span className="text-gray-400">—</span>
        ) },
        { header: 'Status', accessorKey: 'status', size: 150, cell: ({ row }) => (
            <Tag className={`text-xs font-semibold border-0 ${row.original.kelasStatus}`}>{row.original.labelStatus}</Tag>
        ) },
        { header: '', id: 'aksi', size: 60, cell: ({ row }) => (
            <div className="flex items-center justify-end">
                <Tooltip title="Detail">
                    <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                        onClick={() => bukaBaris(row.original)}>
                        <HiOutlineEye className="text-lg" />
                    </span>
                </Tooltip>
            </div>
        ) },
    ]

    const renderKartu = <K extends string>(daftar: KartuStatus<K>[], ringkasan: Partial<Record<K, number>>, label: Record<string, string>, jenis: 'pr' | 'pv', kolomXl: string) => (
        <div className={`grid grid-cols-2 sm:grid-cols-4 ${kolomXl} gap-4`}>
            {daftar.map(k => (
                <Card key={k.key} clickable onClick={() => pilihKartu(jenis, k.key)}
                    className={`${k.bg} transition-shadow ${filterKartu?.jenis === jenis && filterKartu.status === k.key ? `ring-2 ${k.ring}` : ''}`}>
                    <div className="flex flex-col gap-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                            {k.icon}
                        </div>
                        <div className={`font-bold text-2xl ${k.text}`}>
                            {formatNum(ringkasan[k.key] ?? 0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label[k.key]}</div>
                    </div>
                </Card>
            ))}
        </div>
    )

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Ringkasan Pengadaan</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Antrian Permintaan Pembelian dan Permintaan Vendor yang harus ditangani Pengadaan</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Tooltip title="Muat ulang">
                        <Button variant="default" size="sm" icon={<HiOutlineRefresh />} loading={loading} onClick={fetchData} />
                    </Tooltip>
                    <Button variant="default" size="sm" icon={<HiOutlineClipboardList />} onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN)}>
                        Buka PR
                    </Button>
                    <Button variant="default" size="sm" icon={<HiOutlineTruck />} onClick={() => router.push(ROUTES.PERMINTAAN_VENDOR)}>
                        Buka Permintaan Vendor
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-gray-700 dark:text-gray-200">Permintaan Pembelian (PR)</h5>
                    <span className="text-xs text-gray-400">Klik kartu untuk menyaring tabel di bawah</span>
                </div>
                {renderKartu(KARTU_PR, ringkasanPR, STATUS_LABEL_PR, 'pr', 'xl:grid-cols-8')}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h5 className="font-semibold text-gray-700 dark:text-gray-200">Permintaan Vendor</h5>
                    <span className="text-xs text-gray-400">Klik kartu untuk menyaring tabel di bawah</span>
                </div>
                {renderKartu(KARTU_PV, ringkasanPV, STATUS_LABEL_PV, 'pv', 'xl:grid-cols-7')}
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-100">{judulTabel}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{keteranganTabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {filterKartu && (
                            <Button size="xs" variant="default" onClick={() => { setFilterKartu(null); setCurrentPage(1) }}>Kembali ke antrian</Button>
                        )}
                        {barisTampil.length > 0 && (
                            <Tag className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-0">{formatNum(barisTampil.length)} {filterKartu ? 'data' : 'antrian'}</Tag>
                        )}
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={antrianHalaman as unknown[]}
                    loading={loading || loadingFilter}
                    noData={!loading && !loadingFilter && barisTampil.length === 0}
                    pagingData={{ total: barisTampil.length, pageIndex: currentPage, pageSize }}
                    onPaginationChange={setCurrentPage}
                    onSelectChange={size => { setPageSize(size); setCurrentPage(1) }}
                />
            </Card>

            <DetailPermintaanDrawer id={detailPrId} onClose={() => setDetailPrId(null)} onRefresh={() => { fetchData(); fetchFilter() }} />
        </div>
    )
}
