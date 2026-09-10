'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Dropdown, Input, Tag, Tooltip, Switcher, Pagination, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi'
import { PiWrenchDuotone, PiScrewdriverDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { perawatanArmadaService, PapanUnitRow, StatusJatuhTempoUnit } from '@/services/perawatanArmada.service'

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 / halaman' },
    { value: 20, label: '20 / halaman' },
    { value: 50, label: '50 / halaman' },
]

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const BADGE_PREFIX: Record<StatusJatuhTempoUnit, string> = {
    lewat_jatuh_tempo: 'Lewat',
    segera: 'Segera',
}

const BADGE_CLASS: Record<StatusJatuhTempoUnit, string> = {
    lewat_jatuh_tempo: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    segera: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
}

function labelJatuhTempo(item: PapanUnitRow['jatuh_tempo'][number]): string {
    return `${BADGE_PREFIX[item.status]} — ${item.label} (${item.keterangan})`
}

export default function PapanUnitTab({ onGoToInterval }: { onGoToInterval?: () => void }) {
    const router = useRouter()
    const [list, setList]       = useState<PapanUnitRow[]>([])
    const [loading, setLoading] = useState(false)

    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [hanyaJatuhTempo, setHanyaJatuhTempo] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]       = useState(10)
    const [total, setTotal]             = useState(0)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await perawatanArmadaService.papanUnit({
                page: currentPage, limit: pageSize,
                search: search || undefined,
                hanya_jatuh_tempo: hanyaJatuhTempo ? '1' : undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, search, hanyaJatuhTempo])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    let nomorBaris = (currentPage - 1) * pageSize

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nopol armada... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                        <Switcher checked={hanyaJatuhTempo} onChange={checked => { setHanyaJatuhTempo(checked); setCurrentPage(1) }} />
                        <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">Hanya jatuh tempo</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={`${TH_CLASS} w-12`}>No</th>
                                <th className={TH_CLASS}>Armada</th>
                                <th className={TH_CLASS}>Servis Terakhir</th>
                                <th className={TH_CLASS}>Pemberitahuan</th>
                                <th className="py-2.5 px-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center">
                                        <Spinner className="inline-block" size={28} />
                                    </td>
                                </tr>
                            ) : list.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-gray-400">
                                        Tidak ada data armada
                                    </td>
                                </tr>
                            ) : (
                                list.map(r => {
                                    nomorBaris += 1
                                    const shown = r.jatuh_tempo.slice(0, 2)
                                    const sisa  = r.jatuh_tempo.slice(2)
                                    return (
                                        <tr key={r.id_armada}>
                                            <td className="py-2.5 px-3">{nomorBaris}</td>
                                            <td className="py-2.5 px-3">
                                                <p className="font-semibold text-gray-800 dark:text-gray-100">{r.nopol}</p>
                                                <p className="text-xs text-gray-400">{r.nama_jenis_kendaraan ?? '—'}</p>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {r.servis_terakhir ? (
                                                    <div>
                                                        <p className="text-sm">{dayjs(r.servis_terakhir.tanggal).format('DD MMM YYYY')}</p>
                                                        <p className="text-xs text-gray-400">{r.servis_terakhir.label}</p>
                                                    </div>
                                                ) : <span className="text-gray-400">—</span>}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {r.jumlah_interval === 0 ? (
                                                    <span
                                                        className="cursor-pointer inline-block"
                                                        onClick={() => onGoToInterval ? onGoToInterval() : router.push(ROUTES.INTERVAL_PERAWATAN)}>
                                                        <Tag className="text-xs font-semibold whitespace-nowrap bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                                            Belum ada interval
                                                        </Tag>
                                                    </span>
                                                ) : r.jatuh_tempo.length === 0 ? (
                                                    r.belum_pernah_servis ? (
                                                        <Tag className="text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                                                            Belum pernah servis
                                                        </Tag>
                                                    ) : (
                                                        <Tag className="text-xs font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                            Aman
                                                        </Tag>
                                                    )
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                                        {shown.map((item, idx) => (
                                                            <Tag key={idx} className={`text-xs font-semibold whitespace-nowrap ${BADGE_CLASS[item.status]}`}>
                                                                {labelJatuhTempo(item)}
                                                            </Tag>
                                                        ))}
                                                        {sisa.length > 0 && (
                                                            <Tooltip title={
                                                                <div className="flex flex-col gap-1">
                                                                    {sisa.map((item, idx) => <span key={idx}>{labelJatuhTempo(item)}</span>)}
                                                                </div>
                                                            }>
                                                                <Tag className="text-xs font-semibold whitespace-nowrap bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 cursor-help">
                                                                    +{sisa.length} lainnya
                                                                </Tag>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {r.jatuh_tempo.length === 1 && (
                                                        <Tooltip title="Catat Servis Rutin">
                                                            <span
                                                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                                                                onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_BARU}?id_armada=${r.id_armada}&id_interval_perawatan=${r.jatuh_tempo[0].id_interval_perawatan}&rutin=1`)}>
                                                                <PiWrenchDuotone className="text-lg" />
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                    {r.jatuh_tempo.length > 1 && (
                                                        <Dropdown
                                                            placement="bottom-end"
                                                            renderTitle={
                                                                <span
                                                                    title={`Catat Servis Rutin (${r.jatuh_tempo.length} jatuh tempo)`}
                                                                    className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors">
                                                                    <PiWrenchDuotone className="text-lg" />
                                                                </span>
                                                            }>
                                                            {r.jatuh_tempo.map((item, idx) => (
                                                                <Dropdown.Item key={idx} eventKey={String(idx)}
                                                                    onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_BARU}?id_armada=${r.id_armada}&id_interval_perawatan=${item.id_interval_perawatan}&rutin=1`)}>
                                                                    <span className="text-sm">{labelJatuhTempo(item)}</span>
                                                                </Dropdown.Item>
                                                            ))}
                                                        </Dropdown>
                                                    )}
                                                    <Tooltip title="Catat Perbaikan">
                                                        <span
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 transition-colors"
                                                            onClick={() => router.push(`${ROUTES.PERAWATAN_ARMADA_BARU}?id_armada=${r.id_armada}`)}>
                                                            <PiScrewdriverDuotone className="text-lg" />
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title="Lihat Detail Unit">
                                                        <a
                                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                            href={ROUTES.ARMADA_DETAIL(r.id_armada)}
                                                            target="_blank"
                                                            rel="noopener noreferrer">
                                                            <HiOutlineEye className="text-lg" />
                                                        </a>
                                                    </Tooltip>
                                                </div>
                                            </td>
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
                            onChange={opt => {
                                if (opt) { setPageSize((opt as { value: number }).value); setCurrentPage(1) }
                            }}
                        />
                    </div>
                </div>
            </Card>
        </div>
    )
}
