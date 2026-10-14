'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Alert, Card, Button, Input, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import Tabs from '@/components/ui/Tabs'
import DatePicker from '@/components/ui/DatePicker'
import DataTable from '@/components/shared/DataTable'
import type { ColumnDef, CellContext } from '@/components/shared/DataTable'
import { HiOutlineSearch, HiOutlineX, HiOutlineDownload, HiOutlineEye } from 'react-icons/hi'
import { PiCoinsDuotone, PiTruckDuotone, PiUsersThreeDuotone } from 'react-icons/pi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import {
    feeSupirService, HalamanFeeSupir, RekapFeeSupir, RincianFeeSupir, RingkasanFeeSupir,
} from '@/services/feeSupir.service'

type Tab = 'rekap' | 'rincian'
type SupirTerpilih = { id: string; nama: string }

const RENTANG_MAKS = 366

export default function FeeSupirPage() {
    const [tab, setTab] = useState<Tab>('rekap')
    const [dari, setDari]     = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
    const [sampai, setSampai] = useState(dayjs().endOf('month').format('YYYY-MM-DD'))
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [supir, setSupir] = useState<SupirTerpilih | null>(null)
    const [mengunduh, setMengunduh] = useState(false)

    const [ringkasan, setRingkasan] = useState<RingkasanFeeSupir | null>(null)
    const [rekap, setRekap]         = useState<HalamanFeeSupir<RekapFeeSupir> | null>(null)
    const [rincian, setRincian]     = useState<HalamanFeeSupir<RincianFeeSupir> | null>(null)
    const [loadingRekap, setLoadingRekap]     = useState(true)
    const [loadingRincian, setLoadingRincian] = useState(true)
    const [halamanRekap, setHalamanRekap]     = useState(1)
    const [halamanRincian, setHalamanRincian] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    const urutanRingkasan = useRef(0)
    const urutanRekap     = useRef(0)
    const urutanRincian   = useRef(0)

    const idSupir = tab === 'rincian' ? supir?.id ?? '' : ''

    const fetchRingkasan = useCallback(async () => {
        if (!dari || !sampai) return
        const urutan = ++urutanRingkasan.current
        try {
            const res = await feeSupirService.ringkasan({ dari, sampai, search, id_supir: idSupir })
            if (urutan === urutanRingkasan.current) setRingkasan(res)
        } catch {
            if (urutan === urutanRingkasan.current) setRingkasan(null)
        }
    }, [dari, sampai, search, idSupir])

    const fetchRekap = useCallback(async () => {
        if (!dari || !sampai) return
        const urutan = ++urutanRekap.current
        setLoadingRekap(true)
        try {
            const res = await feeSupirService.rekap(halamanRekap, pageSize, { dari, sampai, search })
            if (urutan !== urutanRekap.current) return
            if (res.data.length === 0 && halamanRekap > 1 && res.meta.total > 0) {
                setHalamanRekap(res.meta.totalPages)
                return
            }
            setRekap(res)
        } catch (err) {
            if (urutan !== urutanRekap.current) return
            setRekap(null)
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === urutanRekap.current) setLoadingRekap(false)
        }
    }, [dari, sampai, search, halamanRekap, pageSize])

    const fetchRincian = useCallback(async () => {
        if (!dari || !sampai) return
        const urutan = ++urutanRincian.current
        setLoadingRincian(true)
        try {
            const res = await feeSupirService.rincian(halamanRincian, pageSize, { dari, sampai, search, id_supir: supir?.id })
            if (urutan !== urutanRincian.current) return
            if (res.data.length === 0 && halamanRincian > 1 && res.meta.total > 0) {
                setHalamanRincian(res.meta.totalPages)
                return
            }
            setRincian(res)
        } catch (err) {
            if (urutan !== urutanRincian.current) return
            setRincian(null)
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (urutan === urutanRincian.current) setLoadingRincian(false)
        }
    }, [dari, sampai, search, supir, halamanRincian, pageSize])

    useEffect(() => { fetchRingkasan() }, [fetchRingkasan])
    useEffect(() => { if (tab === 'rekap') fetchRekap() }, [tab, fetchRekap])
    useEffect(() => { if (tab === 'rincian') fetchRincian() }, [tab, fetchRincian])

    const keHalamanPertama = () => {
        setHalamanRekap(1)
        setHalamanRincian(1)
    }

    const ubahDari = (nilai: string) => {
        setDari(nilai)
        if (nilai && sampai && nilai > sampai) setSampai(nilai)
        else if (nilai && sampai && dayjs(sampai).diff(nilai, 'day') > RENTANG_MAKS) setSampai(dayjs(nilai).add(RENTANG_MAKS, 'day').format('YYYY-MM-DD'))
        keHalamanPertama()
    }
    const ubahSampai = (nilai: string) => {
        setSampai(nilai)
        if (nilai && dari && nilai < dari) setDari(nilai)
        else if (nilai && dari && dayjs(nilai).diff(dari, 'day') > RENTANG_MAKS) setDari(dayjs(nilai).subtract(RENTANG_MAKS, 'day').format('YYYY-MM-DD'))
        keHalamanPertama()
    }

    const terapkanCari = (nilai: string) => {
        setSearch(nilai)
        keHalamanPertama()
    }

    const lihatRincianSupir = (r: RekapFeeSupir) => {
        setSupir({ id: r.id_supir, nama: r.nama_supir ?? 'Supir' })
        setHalamanRincian(1)
        setTab('rincian')
    }

    const hapusFilterSupir = () => {
        setSupir(null)
        setHalamanRincian(1)
    }

    const unduhExcel = async () => {
        setMengunduh(true)
        try {
            await feeSupirService.exportExcel({ dari, sampai, search, id_supir: idSupir })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    const kartu = [
        {
            label: 'Total Fee', nilai: ringkasan ? formatRupiah(ringkasan.total) : '—', catatan: 'fee supir pada periode ini',
            icon: <PiCoinsDuotone className="text-3xl text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Trip Ber-fee', nilai: ringkasan ? formatNum(ringkasan.jumlah_trip) : '—', catatan: 'trip On Call yang sudah selesai',
            icon: <PiTruckDuotone className="text-3xl text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Supir', nilai: ringkasan ? formatNum(ringkasan.jumlah_supir) : '—', catatan: 'supir yang mendapat fee',
            icon: <PiUsersThreeDuotone className="text-3xl text-indigo-500" />, bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400',
        },
    ]

    const kolomRekap: ColumnDef<RekapFeeSupir>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<RekapFeeSupir, unknown>) => (halamanRekap - 1) * pageSize + row.index + 1 },
        { header: 'Supir', accessorKey: 'nama_supir', size: 240,
            cell: ({ row }: CellContext<RekapFeeSupir, unknown>) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{row.original.nama_supir ?? '—'}</span>
                    {row.original.telepon && <span className="text-xs text-gray-400">{row.original.telepon}</span>}
                </div>
            ),
        },
        { header: 'Jumlah Trip', accessorKey: 'jumlah_trip', size: 120,
            cell: ({ row }: CellContext<RekapFeeSupir, unknown>) => <span className="tabular-nums">{formatNum(row.original.jumlah_trip)}</span> },
        { header: 'Total Fee', accessorKey: 'total', size: 170,
            cell: ({ row }: CellContext<RekapFeeSupir, unknown>) => (
                <span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(row.original.total)}</span>
            ),
        },
        { header: 'Trip Terakhir', accessorKey: 'tanggal_terakhir', size: 140,
            cell: ({ row }: CellContext<RekapFeeSupir, unknown>) => (
                row.original.tanggal_terakhir ? dayjs(row.original.tanggal_terakhir).format('DD MMM YYYY') : '—'
            ),
        },
        { header: '', id: 'aksi', size: 80,
            cell: ({ row }: CellContext<RekapFeeSupir, unknown>) => (
                <div className="flex items-center justify-end">
                    <Tooltip title="Lihat Rincian Trip">
                        <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                            onClick={() => lihatRincianSupir(row.original)}>
                            <HiOutlineEye className="text-lg" />
                        </span>
                    </Tooltip>
                </div>
            ),
        },
    ]

    const kolomRincian: ColumnDef<RincianFeeSupir>[] = [
        { header: 'No', id: 'no', size: 50,
            cell: ({ row }: CellContext<RincianFeeSupir, unknown>) => (halamanRincian - 1) * pageSize + row.index + 1 },
        { header: 'Tanggal', accessorKey: 'tanggal', size: 130,
            cell: ({ row }: CellContext<RincianFeeSupir, unknown>) => (
                <div className="flex flex-col">
                    <span className="whitespace-nowrap">{dayjs(row.original.tanggal).format('DD MMM YYYY')}</span>
                    {row.original.waktu_selesai && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">selesai {dayjs(row.original.waktu_selesai).format('DD MMM HH:mm')}</span>
                    )}
                </div>
            ),
        },
        { header: 'Supir', accessorKey: 'nama_supir', size: 180,
            cell: ({ row }: CellContext<RincianFeeSupir, unknown>) => row.original.nama_supir ?? '—' },
        { header: 'Proyek', accessorKey: 'nama_proyek', size: 220,
            cell: ({ row }: CellContext<RincianFeeSupir, unknown>) => (
                <div className="flex flex-col">
                    <span>{row.original.nama_proyek ?? '—'}</span>
                    {row.original.kode_proyek && <span className="font-mono text-xs text-gray-400">{row.original.kode_proyek}</span>}
                </div>
            ),
        },
        { header: 'Rute', accessorKey: 'nama_rute', size: 220,
            cell: ({ row }: CellContext<RincianFeeSupir, unknown>) => {
                const r = row.original
                const arah = r.asal || r.tujuan ? `${r.asal ?? '—'} → ${r.tujuan ?? '—'}` : ''
                return (
                    <div className="flex flex-col">
                        <span>{r.nama_rute ?? '—'}</span>
                        {arah && <span className="text-xs text-gray-400">{arah}</span>}
                    </div>
                )
            },
        },
        { header: 'Nopol', accessorKey: 'nopol', size: 120,
            cell: ({ row }: CellContext<RincianFeeSupir, unknown>) => (
                row.original.nopol ? <span className="font-mono text-sm whitespace-nowrap">{row.original.nopol}</span> : '—'
            ),
        },
        { header: 'Fee', accessorKey: 'nominal', size: 150,
            cell: ({ row }: CellContext<RincianFeeSupir, unknown>) => (
                <span className="tabular-nums font-semibold whitespace-nowrap">{formatRupiah(row.original.nominal)}</span>
            ),
        },
    ]

    const loadingAktif = tab === 'rekap' ? loadingRekap : loadingRincian

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Fee Supir On Call</h3>
                <p className="text-gray-500 text-sm mt-0.5">
                    Fee per trip untuk supir internal di proyek On Call — tercatat saat trip selesai
                </p>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40" clearable={false}
                            value={dari ? dayjs(dari).toDate() : null}
                            onChange={date => ubahDari(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                        <span className="text-gray-400 text-sm">s/d</span>
                        <DatePicker inputFormat="DD/MM/YYYY" className="w-40" clearable={false}
                            value={sampai ? dayjs(sampai).toDate() : null}
                            onChange={date => ubahSampai(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </div>
                    <Input
                        className="flex-1 min-w-60"
                        maxLength={100}
                        placeholder="Cari supir, proyek, rute, atau nopol... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearchInput(''); terapkanCari('') }} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => terapkanCari(searchInput.trim())} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') terapkanCari(searchInput.trim()) }}
                    />
                    {loadingAktif && <Spinner size={20} />}
                    <Button size="sm" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} onClick={unduhExcel}>
                        Unduh Excel
                    </Button>
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {kartu.map(k => (
                    <Card key={k.label} className={k.bg}>
                        <div className="flex flex-col gap-2">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>{k.icon}</div>
                            <div className={`font-bold text-lg tabular-nums ${k.text}`}>{k.nilai}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{k.label}</div>
                            <div className="text-xs text-gray-400">{k.catatan}</div>
                        </div>
                    </Card>
                ))}
            </div>

            <Alert type="info" showIcon>
                Fee diambil dari kolom Fee Supir di Penugasan (bawaan dari tarif rute proyek) dan dicatat untuk supir yang menjalankan trip.
                Bila fee diubah setelah trip selesai, nominal di sini ikut diperbarui. Pembayaran fee belum otomatis — gunakan rekap ini sebagai dasar pembayaran.
            </Alert>

            <Card bodyClass="p-0">
                <Tabs value={tab} onChange={val => setTab(val as Tab)}>
                    <div className="px-4 pt-2">
                        <Tabs.TabList>
                            <Tabs.TabNav value="rekap">Rekap per Supir</Tabs.TabNav>
                            <Tabs.TabNav value="rincian">Rincian Trip</Tabs.TabNav>
                        </Tabs.TabList>
                    </div>
                    <Tabs.TabContent value="rekap">
                        <DataTable
                            columns={kolomRekap}
                            data={(rekap?.data ?? []) as unknown[]}
                            loading={loadingRekap}
                            noData={!loadingRekap && (rekap?.data.length ?? 0) === 0}
                            pagingData={{ total: rekap?.meta.total ?? 0, pageIndex: halamanRekap, pageSize }}
                            onPaginationChange={setHalamanRekap}
                            onSelectChange={size => { setPageSize(size); keHalamanPertama() }}
                        />
                    </Tabs.TabContent>
                    <Tabs.TabContent value="rincian">
                        {supir && (
                            <div className="px-4 pt-3">
                                <Tag className="text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 border-0">
                                    <span className="inline-flex items-center gap-1">
                                        Supir: {supir.nama}
                                        <HiOutlineX className="cursor-pointer text-sm" onClick={hapusFilterSupir} />
                                    </span>
                                </Tag>
                            </div>
                        )}
                        <DataTable
                            columns={kolomRincian}
                            data={(rincian?.data ?? []) as unknown[]}
                            loading={loadingRincian}
                            noData={!loadingRincian && (rincian?.data.length ?? 0) === 0}
                            pagingData={{ total: rincian?.meta.total ?? 0, pageIndex: halamanRincian, pageSize }}
                            onPaginationChange={setHalamanRincian}
                            onSelectChange={size => { setPageSize(size); keHalamanPertama() }}
                        />
                    </Tabs.TabContent>
                </Tabs>
            </Card>
        </div>
    )
}
