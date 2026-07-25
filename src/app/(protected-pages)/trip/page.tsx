'use client'
import { Fragment, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Select, Tag, Tooltip, Spinner, Pagination, toast, Notification } from '@/components/ui'
import {
    HiOutlineSearch,
    HiOutlineX,
    HiPlusCircle,
    HiOutlineChevronDown,
    HiOutlineChevronRight,
    HiOutlineDocumentText,
} from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { tripService, Trip, RingkasanProyekTrip } from '@/services/trip.service'
import MulaiTripDialog from './MulaiTripDialog'
import dayjs from 'dayjs'

type StatusOption = { value: string; label: string }

const STATUS_OPTIONS: StatusOption[] = [
    { value: '',           label: 'Semua Status' },
    { value: 'belum_mulai', label: 'Belum Mulai' },
    { value: 'berjalan',   label: 'Berjalan' },
    { value: 'selesai',    label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
]

const STATUS_LABEL: Record<string, string> = {
    belum_mulai: 'Belum Mulai',
    berjalan:    'Berjalan',
    selesai:     'Selesai',
    dibatalkan:  'Dibatalkan',
}

const STATUS_TAG: Record<string, string> = {
    belum_mulai: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    berjalan:    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    selesai:     'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const TRIP_TAMPIL_AWAL = 5

const kelompokkanPerRute = (trips: Trip[]) => {
    const map = new Map<string, Trip[]>()
    for (const trip of trips) {
        const nama = trip.rute?.trim() || 'Tanpa Rute'
        const list = map.get(nama) ?? []
        list.push(trip)
        map.set(nama, list)
    }
    return [...map.entries()].map(([nama, list]) => ({
        nama,
        trips: [...list].sort((a, b) => (b.waktu_berangkat ?? '').localeCompare(a.waktu_berangkat ?? '')),
    }))
}

export default function TripPage() {
    const router = useRouter()

    const [list, setList]       = useState<RingkasanProyekTrip[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize]                      = useState(10)
    const [total, setTotal]               = useState(0)

    const [showMulai, setShowMulai]               = useState(false)
    const [proyekUntukMulai, setProyekUntukMulai]  = useState<string | undefined>(undefined)

    const [expanded, setExpanded]         = useState<Set<string>>(new Set())
    const [expandedRute, setExpandedRute] = useState<Set<string>>(new Set())
    const [showAllRute, setShowAllRute]   = useState<Set<string>>(new Set())
    const [tripsByProyek, setTripsByProyek] = useState<Record<string, Trip[]>>({})
    const [loadingTrips, setLoadingTrips]   = useState<Set<string>>(new Set())

    useEffect(() => {
        setExpanded(new Set())
        setExpandedRute(new Set())
        setShowAllRute(new Set())
        setTripsByProyek({})
    }, [search, statusFilter])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await tripService.ringkasanProyek({
                page: currentPage,
                limit: pageSize,
                search: search || undefined,
                status: statusFilter || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, statusFilter])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleTambah = (idProyek: string) => {
        setProyekUntukMulai(idProyek)
        setShowMulai(true)
    }

    const toggleExpand = async (idProyek: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(idProyek)) next.delete(idProyek)
            else next.add(idProyek)
            return next
        })

        if (!tripsByProyek[idProyek]) {
            setLoadingTrips(prev => new Set(prev).add(idProyek))
            try {
                const res = await tripService.list({ id_proyek: idProyek, status: statusFilter || undefined, limit: 100 })
                setTripsByProyek(prev => ({ ...prev, [idProyek]: res.data }))
            } catch (err) {
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            } finally {
                setLoadingTrips(prev => {
                    const next = new Set(prev)
                    next.delete(idProyek)
                    return next
                })
            }
        }
    }

    const toggleRute = (kunci: string) => {
        setExpandedRute(prev => {
            const next = new Set(prev)
            if (next.has(kunci)) next.delete(kunci)
            else next.add(kunci)
            return next
        })
    }

    const handleSuksesMulai = async (idProyek: string) => {
        fetchData()
        if (!idProyek) return
        setExpanded(prev => new Set(prev).add(idProyek))
        setLoadingTrips(prev => new Set(prev).add(idProyek))
        try {
            const res = await tripService.list({ id_proyek: idProyek, status: statusFilter || undefined, limit: 100 })
            setTripsByProyek(prev => ({ ...prev, [idProyek]: res.data }))
            const terbaru = [...res.data].sort((a, b) => (b.waktu_berangkat ?? '').localeCompare(a.waktu_berangkat ?? ''))[0]
            if (terbaru) {
                const namaRute = terbaru.rute?.trim() || 'Tanpa Rute'
                setExpandedRute(prev => new Set(prev).add(`${idProyek}::${namaRute}`))
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoadingTrips(prev => {
                const next = new Set(prev)
                next.delete(idProyek)
                return next
            })
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Trip</h3>
                <p className="text-gray-500 text-sm mt-0.5">Monitor seluruh trip, dikelompokkan per proyek</p>
            </div>

            <Card bodyClass="p-0">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1"
                        placeholder="Cari nama proyek, kode, atau klien... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-44 shrink-0">
                        <Select<StatusOption>
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={(opt) => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16"><Spinner size={40} /></div>
                ) : list.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-8">Belum ada trip ditemukan.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className="w-10" />
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Proyek</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Klien</th>
                                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Jumlah Trip</th>
                                    <th className="w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {list.map(proyek => {
                                    const isExpanded = expanded.has(proyek.id_proyek)
                                    const trips = tripsByProyek[proyek.id_proyek]
                                    const isLoadingTrips = loadingTrips.has(proyek.id_proyek)
                                    return (
                                        <Fragment key={proyek.id_proyek}>
                                            <tr
                                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                onClick={() => toggleExpand(proyek.id_proyek)}
                                            >
                                                <td className="pl-3">
                                                    {isExpanded
                                                        ? <HiOutlineChevronDown className="text-gray-400" />
                                                        : <HiOutlineChevronRight className="text-gray-400" />}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <p className="font-semibold">
                                                        {proyek.nama_proyek}
                                                        {proyek.kode_proyek && <span className="text-gray-400 font-normal"> ({proyek.kode_proyek})</span>}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-3">
                                                    {proyek.nama_klien ?? <span className="text-gray-400">—</span>}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                        {proyek.jumlah_trip} trip
                                                    </Tag>
                                                </td>
                                                <td className="py-3 pr-3 text-right">
                                                    <Tooltip title="Tambah Trip">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleTambah(proyek.id_proyek) }}
                                                        >
                                                            <HiPlusCircle className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} className="p-0 bg-gray-50/60 dark:bg-gray-800/30">
                                                        {isLoadingTrips ? (
                                                            <div className="flex justify-center py-6"><Spinner size={30} /></div>
                                                        ) : !trips || trips.length === 0 ? (
                                                            <p className="text-gray-400 text-xs text-center py-4">Belum ada trip untuk proyek ini.</p>
                                                        ) : (
                                                            <div className="pl-10 pr-3 py-1">
                                                                {kelompokkanPerRute(trips).map(grup => {
                                                                    const kunciRute = `${proyek.id_proyek}::${grup.nama}`
                                                                    const ruteTerbuka = expandedRute.has(kunciRute)
                                                                    const tampilSemua = showAllRute.has(kunciRute)
                                                                    const tripTampil = tampilSemua ? grup.trips : grup.trips.slice(0, TRIP_TAMPIL_AWAL)
                                                                    return (
                                                                        <div key={kunciRute}>
                                                                            <div
                                                                                className="flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700/40 rounded-lg transition-colors"
                                                                                onClick={() => toggleRute(kunciRute)}
                                                                            >
                                                                                {ruteTerbuka
                                                                                    ? <HiOutlineChevronDown className="text-gray-400 shrink-0" />
                                                                                    : <HiOutlineChevronRight className="text-gray-400 shrink-0" />}
                                                                                <p className="font-medium flex-1 truncate">{grup.nama}</p>
                                                                                <Tag className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                                                    {grup.trips.length} trip
                                                                                </Tag>
                                                                            </div>
                                                                            {ruteTerbuka && (
                                                                                <div className="pl-7 divide-y divide-gray-100 dark:divide-gray-700">
                                                                                    {tripTampil.map(trip => (
                                                                                        <div
                                                                                            key={trip.id_trip}
                                                                                            className="flex items-center gap-2 py-2 px-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700/40 rounded-lg transition-colors"
                                                                                            onClick={() => router.push(ROUTES.TRIP_DETAIL(trip.id_trip))}
                                                                                        >
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="truncate">
                                                                                                    {trip.supir_nama ?? <span className="text-gray-400">Tanpa supir</span>}
                                                                                                    <span className="text-gray-400"> · {trip.armada_nopol ?? '—'}</span>
                                                                                                </p>
                                                                                                {trip.waktu_berangkat && (
                                                                                                    <p className="text-xs text-gray-400">{dayjs(trip.waktu_berangkat).format('DD/MM/YY HH:mm')}</p>
                                                                                                )}
                                                                                            </div>
                                                                                            <Tag className={`shrink-0 ${STATUS_TAG[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                                                                                {STATUS_LABEL[trip.status] ?? trip.status}
                                                                                            </Tag>
                                                                                            <Tooltip title="Isi Laporan">
                                                                                                <span
                                                                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors shrink-0"
                                                                                                    onClick={(e) => { e.stopPropagation(); router.push(`${ROUTES.TRIP_DETAIL(trip.id_trip)}?laporan=1`) }}
                                                                                                >
                                                                                                    <HiOutlineDocumentText className="text-lg" />
                                                                                                </span>
                                                                                            </Tooltip>
                                                                                        </div>
                                                                                    ))}
                                                                                    {grup.trips.length > TRIP_TAMPIL_AWAL && !tampilSemua && (
                                                                                        <div className="py-2 px-2">
                                                                                            <span
                                                                                                className="text-xs text-blue-600 dark:text-blue-300 cursor-pointer hover:underline"
                                                                                                onClick={() => setShowAllRute(prev => new Set(prev).add(kunciRute))}
                                                                                            >
                                                                                                Tampilkan semua ({grup.trips.length} trip)
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {!loading && total > pageSize && (
                <div className="flex justify-end">
                    <Pagination currentPage={currentPage} total={total} pageSize={pageSize} onChange={setCurrentPage} />
                </div>
            )}

            <MulaiTripDialog
                isOpen={showMulai}
                onClose={() => setShowMulai(false)}
                onSukses={handleSuksesMulai}
                idProyekTerkunci={proyekUntukMulai}
            />
        </div>
    )
}
