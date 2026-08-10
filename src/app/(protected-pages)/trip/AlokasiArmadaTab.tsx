'use client'
import { useEffect, useState, useCallback } from 'react'
import { Card, Input, Tag, Tooltip, toast, Notification, DatePicker, Pagination, Spinner, Button } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineSearch, HiOutlineX, HiOutlineDownload } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { alokasiArmadaService, AlokasiArmada } from '@/services/alokasiArmada.service'
import { armadaService, Armada } from '@/services/armada.service'

type Option = { value: string; label: string }

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 / halaman' },
    { value: 20, label: '20 / halaman' },
    { value: 50, label: '50 / halaman' },
]

const SUMBER_TAG: Record<string, { label: string; className: string }> = {
    penugasan: { label: 'Dari Penugasan', className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100' },
    default:  { label: 'Default',  className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100' },
    otomatis: { label: 'Otomatis', className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100' },
    manual:   { label: 'Manual',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
}

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function AlokasiArmadaTab() {
    const [list, setList]       = useState<AlokasiArmada[]>([])
    const [loading, setLoading] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [tanggalDari, setTanggalDari]     = useState<Date | null>(new Date())
    const [tanggalSampai, setTanggalSampai] = useState<Date | null>(new Date())
    const [armadaFilter, setArmadaFilter]   = useState('')
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])
    const [mengunduh, setMengunduh]         = useState<'excel' | 'pdf' | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await alokasiArmadaService.list({
                page: currentPage, limit: pageSize,
                tanggal_dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
                tanggal_sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
                search: search || undefined,
                id_armada: armadaFilter || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, tanggalDari, tanggalSampai, search, armadaFilter])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        armadaService.list(1, 100).then(res => {
            setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol })))
        }).catch(() => {})
    }, [])

    const unduhRiwayat = async (format: 'excel' | 'pdf') => {
        if (!armadaFilter) return
        const nopol = armadaOptions.find(o => o.value === armadaFilter)?.label ?? 'armada'
        setMengunduh(format)
        try {
            await alokasiArmadaService.downloadRiwayatArmada(nopol, format, {
                id_armada: armadaFilter,
                tanggal_dari: tanggalDari ? dayjs(tanggalDari).format('YYYY-MM-DD') : undefined,
                tanggal_sampai: tanggalSampai ? dayjs(tanggalSampai).format('YYYY-MM-DD') : undefined,
            })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(null)
        }
    }

    const kolomStatus = !!armadaFilter
    const jumlahKolom = kolomStatus ? 7 : 6

    return (
        <div className="flex flex-col gap-4">
            <p className="text-gray-500 text-sm">
                History pasangan supir & armada per hari — otomatis dari papan jadwal.
                Pilih armada untuk riwayat lengkap pemegang unit (termasuk alokasi yang digantikan).
            </p>
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nama supir atau nopol... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearchInput(''); setSearch(''); setCurrentPage(1) }} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => { setSearch(searchInput); setCurrentPage(1) }} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setCurrentPage(1) } }}
                    />
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker placeholder="Dari tanggal" value={tanggalDari}
                            onChange={(date) => { setTanggalDari(date); setCurrentPage(1) }} />
                    </div>
                    <div className="w-full sm:w-40 shrink-0">
                        <DatePicker placeholder="Sampai tanggal" value={tanggalSampai}
                            onChange={(date) => { setTanggalSampai(date); setCurrentPage(1) }} />
                    </div>
                    <div className="w-full sm:w-48 shrink-0">
                        <Select
                            placeholder="Semua Armada"
                            isClearable
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === armadaFilter) ?? null}
                            onChange={opt => {
                                const v = (opt as Option | null)?.value ?? ''
                                setArmadaFilter(v)
                                setTanggalDari(v ? null : new Date())
                                setTanggalSampai(v ? null : new Date())
                                setCurrentPage(1)
                            }}
                        />
                    </div>
                    <Tooltip title={armadaFilter ? 'Unduh riwayat pemegang armada terpilih (Excel)' : 'Pilih armada dulu untuk laporan per mobil'}>
                        <span>
                            <Button size="sm" icon={<HiOutlineDownload />} disabled={!armadaFilter}
                                loading={mengunduh === 'excel'} onClick={() => unduhRiwayat('excel')}>
                                Excel
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={armadaFilter ? 'Unduh riwayat pemegang armada terpilih (PDF)' : 'Pilih armada dulu untuk laporan per mobil'}>
                        <span>
                            <Button size="sm" icon={<HiOutlineDownload />} disabled={!armadaFilter}
                                loading={mengunduh === 'pdf'} onClick={() => unduhRiwayat('pdf')}>
                                PDF
                            </Button>
                        </span>
                    </Tooltip>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={TH_CLASS}>Tanggal</th>
                                <th className={TH_CLASS}>Proyek</th>
                                <th className={TH_CLASS}>Supir</th>
                                <th className={TH_CLASS}>Armada</th>
                                <th className={TH_CLASS}>Sumber</th>
                                <th className={TH_CLASS}>Milik / Keterangan</th>
                                {kolomStatus && <th className={TH_CLASS}>Status</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={jumlahKolom} className="py-10 text-center">
                                        <Spinner className="inline-block" size={28} />
                                    </td>
                                </tr>
                            ) : list.length === 0 ? (
                                <tr>
                                    <td colSpan={jumlahKolom} className="py-10 text-center text-gray-400">
                                        Belum ada alokasi pada periode ini — alokasi terbentuk otomatis saat papan jadwal diisi
                                    </td>
                                </tr>
                            ) : (
                                list.map(item => {
                                    const sumber = SUMBER_TAG[item.sumber] ?? SUMBER_TAG.otomatis
                                    const digantikan = item.dihapus_pada !== null
                                    return (
                                        <tr key={item.id_alokasi} className={digantikan ? 'opacity-50' : ''}>
                                            <td className="py-2.5 px-3 whitespace-nowrap">{dayjs(item.tanggal).format('DD MMM YYYY')}</td>
                                            <td className="py-2.5 px-3">{item.nama_proyek ?? '—'}</td>
                                            <td className="py-2.5 px-3 font-semibold">{item.supir_nama}</td>
                                            <td className="py-2.5 px-3">
                                                {item.armada_nopol
                                                    ? <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{item.armada_nopol}</span>
                                                    : <Tag className="text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">Belum dapat armada</Tag>}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <Tag className={`text-xs font-semibold ${sumber.className}`}>{sumber.label}</Tag>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {item.pemilik_nama
                                                    ? <span className="text-xs">{item.pemilik_nama}{item.keterangan ? ` — ${item.keterangan}` : ''}</span>
                                                    : <span className="text-xs text-gray-400">{item.keterangan ?? '—'}</span>}
                                            </td>
                                            {kolomStatus && (
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    {item.dihapus_pada
                                                        ? <span className="text-xs text-gray-400">Digantikan {dayjs(item.dihapus_pada).format('DD MMM HH:mm')}</span>
                                                        : <Tag className="text-xs font-semibold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100">Berlaku</Tag>}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })
                            )}
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
                            onChange={opt => { if (opt) { setPageSize((opt as { value: number }).value); setCurrentPage(1) } }}
                        />
                    </div>
                </div>
            </Card>
        </div>
    )
}
