'use client'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, Card, Input, Pagination, Spinner, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineDownload, HiOutlineEye, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import {
    PiTruckDuotone,
    PiCheckCircleDuotone,
    PiCalendarCheckDuotone,
    PiSteeringWheelDuotone,
    PiWrenchDuotone,
} from 'react-icons/pi'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import {
    ketersediaanVendorService,
    type FilterKetersediaan,
    type HasilKetersediaan,
    type StatusKetersediaan,
    type SumberUnit,
    type UnitKetersediaan,
} from '@/services/ketersediaanVendor.service'
import DetailUnitDrawer from './DetailUnitDrawer'
import {
    STATUS_KETERSEDIAAN, SUMBER_UNIT, TH_CLASS, formatTanggal, keteranganStatus, kontakPemilik, ringkasSpesifikasi, tagDokumen,
} from './ketersediaanVendor.shared'

type Option = { value: string; label: string }
type FilterStatus = StatusKetersediaan | ''
type FilterSumber = SumberUnit | ''
type Kartu = { status: FilterStatus; label: string; icon: ReactNode; bg: string; text: string; ring: string }

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 / halaman' },
    { value: 20, label: '20 / halaman' },
    { value: 50, label: '50 / halaman' },
]

const OPSI_SUMBER: { value: FilterSumber; label: string }[] = [
    { value: '',       label: 'Semua Sumber' },
    { value: 'aset',   label: 'Aset Milik' },
    { value: 'vendor', label: 'Vendor' },
]

const KARTU: Kartu[] = [
    { status: '',          label: 'Semua Unit',      icon: <PiTruckDuotone className="text-3xl text-blue-500" />,             bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       ring: 'ring-blue-400' },
    { status: 'tersedia',  label: 'Tersedia',        icon: <PiCheckCircleDuotone className="text-3xl text-emerald-500" />,    bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
    { status: 'terjadwal', label: 'Terjadwal',       icon: <PiCalendarCheckDuotone className="text-3xl text-amber-500" />,    bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400' },
    { status: 'dipakai',   label: 'Sedang Dipakai',  icon: <PiSteeringWheelDuotone className="text-3xl text-violet-500" />,   bg: 'bg-violet-50 dark:bg-violet-500/10',   text: 'text-violet-600 dark:text-violet-400',   ring: 'ring-violet-400' },
    { status: 'perawatan', label: 'Dalam Perawatan', icon: <PiWrenchDuotone className="text-3xl text-red-500" />,             bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400',         ring: 'ring-red-400' },
]

const CHIP_AKTIF = 'bg-blue-600 text-white border-blue-600'
const CHIP_BIASA = 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'

export default function KetersediaanVendorPage() {
    const [hasil, setHasil]       = useState<HasilKetersediaan | null>(null)
    const [galat, setGalat]       = useState<string | null>(null)
    const [percobaan, setPercobaan] = useState(0)
    const [loading, setLoading]   = useState(true)
    const [mengunduh, setMengunduh] = useState(false)
    const [unitTerpilih, setUnitTerpilih] = useState<UnitKetersediaan | null>(null)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState<FilterStatus>('tersedia')
    const [sumberFilter, setSumberFilter] = useState<FilterSumber>('')
    const [vendorFilter, setVendorFilter] = useState('')
    const [jenisFilter, setJenisFilter]   = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)

    const filter = useMemo<FilterKetersediaan>(() => ({
        search: search || undefined,
        status: statusFilter || undefined,
        sumber: sumberFilter || undefined,
        id_vendor: vendorFilter || undefined,
        id_jenis_kendaraan: jenisFilter || undefined,
    }), [search, statusFilter, sumberFilter, vendorFilter, jenisFilter])

    useEffect(() => {
        let aktif = true
        setLoading(true)
        ketersediaanVendorService.list({ ...filter, page: currentPage, limit: pageSize })
            .then(res => { if (aktif) { setHasil(res); setGalat(null) } })
            .catch(err => {
                if (!aktif) return
                const pesan = parseApiError(err)
                setGalat(pesan)
                toast.push(<Notification type="danger" title={pesan} />)
            })
            .finally(() => { if (aktif) setLoading(false) })
        return () => { aktif = false }
    }, [filter, currentPage, pageSize, percobaan])

    const list = galat ? [] : hasil?.data ?? []
    const total = galat ? 0 : hasil?.meta.total ?? 0
    const ringkasan = galat ? null : hasil?.meta.ringkasan ?? null
    const perJenis = hasil?.meta.per_jenis ?? []
    const vendorOptions = useMemo<Option[]>(
        () => (hasil?.meta.opsi_vendor ?? []).map(v => ({ value: v.id_vendor, label: v.nama_vendor })),
        [hasil?.meta.opsi_vendor],
    )

    const handleSearchSubmit = () => { setSearch(searchInput.trim()); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const pilihStatus = (status: FilterStatus) => {
        setStatusFilter(prev => (status !== '' && prev === status ? '' : status))
        setCurrentPage(1)
    }

    const pilihSumber = (sumber: FilterSumber) => {
        setSumberFilter(sumber)
        if (sumber === 'aset') setVendorFilter('')
        setCurrentPage(1)
    }

    const pilihJenis = (id: string) => {
        setJenisFilter(prev => (prev === id ? '' : id))
        setCurrentPage(1)
    }

    const unduh = async () => {
        setMengunduh(true)
        try {
            await ketersediaanVendorService.downloadExcel(filter)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Ketersediaan Unit</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Unit aset milik dan unit vendor beserta status ketersediaannya — acuan tim marketing sebelum meminta unit ke pengadaan
                    </p>
                </div>
                <Button size="sm" variant="default" icon={<HiOutlineDownload />} loading={mengunduh} onClick={unduh}>
                    Unduh Excel
                </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {KARTU.map(k => {
                    const aktif = statusFilter === k.status
                    return (
                        <Card key={k.status || 'semua'} clickable onClick={() => pilihStatus(k.status)}
                            className={`${k.bg} transition-shadow ${aktif ? `ring-2 ${k.ring}` : ''}`}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                                    {k.icon}
                                </div>
                                <div className={`font-bold text-2xl ${k.text}`}>
                                    {ringkasan ? formatNum(ringkasan[k.status || 'total']) : '—'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{k.label} · unit</div>
                            </div>
                        </Card>
                    )
                })}
            </div>

            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nopol, merk, jenis, atau vendor... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-60 shrink-0">
                        <Select
                            placeholder="Semua Vendor"
                            isClearable
                            isDisabled={sumberFilter === 'aset'}
                            options={vendorOptions}
                            value={vendorOptions.find(o => o.value === vendorFilter) ?? null}
                            onChange={opt => { setVendorFilter((opt as Option | null)?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1">Sumber</span>
                    {OPSI_SUMBER.map(o => (
                        <button key={o.value || 'semua'} type="button" onClick={() => pilihSumber(o.value)}
                            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${sumberFilter === o.value ? CHIP_AKTIF : CHIP_BIASA}`}>
                            {o.label}
                        </button>
                    ))}
                </div>

                {perJenis.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mr-1">Jenis</span>
                        <button type="button" onClick={() => { setJenisFilter(''); setCurrentPage(1) }}
                            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${jenisFilter === '' ? CHIP_AKTIF : CHIP_BIASA}`}>
                            Semua Jenis
                        </button>
                        {perJenis.map(j => {
                            const dapatDifilter = !!j.id_jenis_kendaraan
                            const aktif = dapatDifilter && jenisFilter === j.id_jenis_kendaraan
                            const rincian = `${j.tersedia} tersedia (${j.tersedia_aset} aset · ${j.tersedia_vendor} vendor) · ${j.terjadwal} terjadwal · ${j.dipakai} sedang dipakai · ${j.perawatan} perawatan · ${j.total} unit`
                            return (
                                <Tooltip key={j.id_jenis_kendaraan ?? j.nama_jenis}
                                    title={dapatDifilter ? rincian : `${rincian} — jenis belum terdaftar di master sehingga tidak bisa difilter`}>
                                    <button type="button" disabled={!dapatDifilter}
                                        onClick={() => j.id_jenis_kendaraan && pilihJenis(j.id_jenis_kendaraan)}
                                        className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border text-xs font-semibold transition-colors ${aktif ? CHIP_AKTIF : CHIP_BIASA} ${dapatDifilter ? '' : 'opacity-70 cursor-default'}`}>
                                        {j.nama_jenis}
                                        <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                                            j.tersedia > 0
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                            {j.tersedia}
                                        </span>
                                    </button>
                                </Tooltip>
                            )
                        })}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={`${TH_CLASS} w-12`}>No</th>
                                <th className={TH_CLASS}>Unit</th>
                                <th className={TH_CLASS}>Kepemilikan</th>
                                <th className={TH_CLASS}>Status</th>
                                <th className={TH_CLASS}>Riwayat Pemakaian</th>
                                <th className={TH_CLASS}>Dokumen</th>
                                <th className={`${TH_CLASS} w-16`}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center"><Spinner className="inline-block" size={28} /></td>
                                </tr>
                            ) : galat ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{galat}</p>
                                        <Button size="sm" onClick={() => setPercobaan(n => n + 1)}>Coba lagi</Button>
                                    </td>
                                </tr>
                            ) : list.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-gray-400">
                                        Tidak ada unit yang sesuai filter
                                    </td>
                                </tr>
                            ) : list.map((u, idx) => {
                                const status = STATUS_KETERSEDIAAN[u.status_ketersediaan]
                                const sumber = SUMBER_UNIT[u.sumber]
                                const ket = keteranganStatus(u)
                                const stnk = tagDokumen('STNK', u.masa_berlaku_stnk)
                                const kir = tagDokumen('KIR', u.masa_berlaku_kir)
                                const spesifikasi = ringkasSpesifikasi(u)
                                const kontak = kontakPemilik(u)
                                return (
                                    <tr key={`${u.sumber}-${u.id_unit}`} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                        onClick={() => setUnitTerpilih(u)}>
                                        <td className="py-3 px-3 align-top">{(currentPage - 1) * pageSize + idx + 1}</td>
                                        <td className="py-3 px-3 align-top">
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/20 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 dark:text-blue-300">
                                                <PiTruckDuotone className="text-base" />
                                                {u.nopol}
                                            </span>
                                            {spesifikasi && <p className="text-xs text-gray-500 mt-1">{spesifikasi}</p>}
                                        </td>
                                        <td className="py-3 px-3 align-top">
                                            <Tag className={`text-xs font-semibold ${sumber.tag}`}>{sumber.label}</Tag>
                                            {u.sumber === 'vendor' && <p className="font-semibold mt-1">{u.nama_vendor}</p>}
                                            {kontak && <p className="text-xs text-gray-500 mt-0.5">{kontak}</p>}
                                        </td>
                                        <td className="py-3 px-3 align-top">
                                            <Tag className={`text-xs font-semibold ${status.tag}`}>{status.label}</Tag>
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{ket.utama}</p>
                                            {ket.tambahan && <p className="text-xs text-gray-400 mt-0.5">{ket.tambahan}</p>}
                                        </td>
                                        <td className="py-3 px-3 align-top">
                                            {u.jumlah_proyek === 0 ? (
                                                <p className="text-xs text-gray-400">Belum pernah dipakai di proyek</p>
                                            ) : (
                                                <>
                                                    <p className="text-xs font-medium">{formatNum(u.jumlah_proyek)} proyek · {formatNum(u.hari_pakai)} hari</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Terakhir {formatTanggal(u.terakhir_dipakai)}
                                                        {u.proyek_terakhir?.nama_proyek && ` · ${u.proyek_terakhir.nama_proyek}`}
                                                    </p>
                                                    {u.proyek_terakhir?.nama_klien && (
                                                        <p className="text-xs text-gray-400">{u.proyek_terakhir.nama_klien}</p>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 align-top">
                                            <div className="flex flex-col items-start gap-1">
                                                <Tag className={`text-xs font-semibold whitespace-nowrap ${stnk.className}`}>{stnk.label}</Tag>
                                                <Tag className={`text-xs font-semibold whitespace-nowrap ${kir.className}`}>{kir.label}</Tag>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 align-top">
                                            <Tooltip title="Riwayat proyek unit">
                                                <span className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors">
                                                    <HiOutlineEye className="text-lg" />
                                                </span>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                    <Pagination currentPage={currentPage} pageSize={pageSize} total={total} onChange={setCurrentPage} />
                    <div className="w-40">
                        <Select
                            size="sm"
                            isSearchable={false}
                            options={PAGE_SIZE_OPTIONS}
                            value={PAGE_SIZE_OPTIONS.find(o => o.value === pageSize) ?? PAGE_SIZE_OPTIONS[0]}
                            onChange={opt => { setPageSize((opt as { value: number } | null)?.value ?? 10); setCurrentPage(1) }}
                        />
                    </div>
                </div>
            </Card>

            <DetailUnitDrawer unit={unitTerpilih} onClose={() => setUnitTerpilih(null)} />
        </div>
    )
}
