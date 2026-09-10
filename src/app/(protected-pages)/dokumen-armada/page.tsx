'use client'
import { Fragment, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Tooltip, Pagination, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineRefresh, HiOutlineTrash, HiOutlineChevronDown } from 'react-icons/hi'
import { PiTruckDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { dokumenArmadaService, DokumenArmadaWithArmada } from '@/services/dokumenArmada.service'
import { armadaService, Armada } from '@/services/armada.service'
import { JENIS_DOKUMEN_OPTIONS, getExpiryInfo, labelJenisDokumen, type Option } from './dokumenArmada.shared'

const JENIS_FILTER_OPTIONS: Option[] = [{ value: '', label: 'Semua Jenis' }, ...JENIS_DOKUMEN_OPTIONS]

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 / halaman' },
    { value: 20, label: '20 / halaman' },
    { value: 50, label: '50 / halaman' },
]

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export default function DokumenArmadaPage() {
    const router = useRouter()
    const [list, setList]       = useState<DokumenArmadaWithArmada[]>([])
    const [loading, setLoading] = useState(false)
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])

    const [searchInput, setSearchInput]   = useState('')
    const [search, setSearch]             = useState('')
    const [armadaFilter, setArmadaFilter] = useState('')
    const [jenisFilter, setJenisFilter]   = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [pageSize, setPageSize]         = useState(10)
    const [total, setTotal]               = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<DokumenArmadaWithArmada | null>(null)
    const [deleting, setDeleting]         = useState(false)
    const [grupTerbuka, setGrupTerbuka]   = useState<Record<string, boolean>>({})

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await dokumenArmadaService.listAll({
                page: currentPage, limit: pageSize,
                id_armada: armadaFilter || undefined,
                jenis_dokumen: jenisFilter || undefined,
                search: search || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, armadaFilter, jenisFilter, search])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        armadaService.list(1, 100).then(res => {
            setArmadaOptions(res.data.map((a: Armada) => ({ value: a.id_armada, label: a.nopol })))
        }).catch(() => {})
    }, [])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await dokumenArmadaService.delete(deleteTarget.id_armada, deleteTarget.id_dokumen_armada)
            toast.push(<Notification type="success" title="Dokumen berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setDeleting(false)
        }
    }

    const groups: { idArmada: string; nopol: string; merk: string | null; rows: DokumenArmadaWithArmada[] }[] = []
    list.forEach(d => {
        const last = groups[groups.length - 1]
        if (last && last.idArmada === d.id_armada) {
            last.rows.push(d)
        } else {
            groups.push({ idArmada: d.id_armada, nopol: d.armada_nopol ?? '—', merk: d.armada_merk ?? null, rows: [d] })
        }
    })

    let nomorBaris = (currentPage - 1) * pageSize
    const semuaTerbuka = groups.length > 0 && groups.every(g => grupTerbuka[g.idArmada])
    const toggleGrup = (idArmada: string) => setGrupTerbuka(prev => ({ ...prev, [idArmada]: !prev[idArmada] }))
    const toggleSemua = () => setGrupTerbuka(semuaTerbuka ? {} : Object.fromEntries(groups.map(g => [g.idArmada, true])))

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Dokumen Armada</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Kelola dokumen seluruh armada — STNK, KIR, Asuransi, dll</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_BARU)}>Tambah Dokumen</Button>
            </div>
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari jenis dokumen, nomor, atau nopol... (tekan Enter)"
                        suffix={
                            searchInput
                                ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                    />
                    <div className="w-full sm:w-52 shrink-0">
                        <Select
                            placeholder="Semua Armada"
                            isClearable
                            options={armadaOptions}
                            value={armadaOptions.find(o => o.value === armadaFilter) ?? null}
                            onChange={(opt) => { setArmadaFilter((opt as Option | null)?.value ?? ''); setCurrentPage(1) }}
                        />
                    </div>
                    <div className="w-full sm:w-44 shrink-0">
                        <Select
                            isSearchable={false}
                            options={JENIS_FILTER_OPTIONS}
                            value={JENIS_FILTER_OPTIONS.find(o => o.value === jenisFilter) ?? JENIS_FILTER_OPTIONS[0]}
                            onChange={(opt) => { setJenisFilter((opt as Option).value); setCurrentPage(1) }}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className={`${TH_CLASS} w-12`}>No</th>
                                <th className={TH_CLASS}>Jenis Dokumen</th>
                                <th className={TH_CLASS}>Nomor</th>
                                <th className={TH_CLASS}>Berlaku Sampai</th>
                                <th className={TH_CLASS}>File</th>
                                <th className="py-2.5 px-3 text-right">
                                    {groups.length > 0 && (
                                        <button type="button" onClick={toggleSemua}
                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                                            {semuaTerbuka ? 'Tutup semua' : 'Buka semua'}
                                        </button>
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center">
                                        <Spinner className="inline-block" size={28} />
                                    </td>
                                </tr>
                            ) : list.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-gray-400">Tidak ada dokumen</td>
                                </tr>
                            ) : (
                                groups.map(g => {
                                    const terbuka = !!grupTerbuka[g.idArmada]
                                    if (!terbuka) nomorBaris += g.rows.length
                                    return (
                                        <Fragment key={`${g.idArmada}-${g.rows[0].id_dokumen_armada}`}>
                                            <tr className="bg-gray-50 dark:bg-gray-700/40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60"
                                                onClick={() => toggleGrup(g.idArmada)}>
                                                <td colSpan={6} className="py-2 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <HiOutlineChevronDown className={`text-gray-400 transition-transform ${terbuka ? '' : '-rotate-90'}`} />
                                                        <span
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/20 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 cursor-pointer transition-colors"
                                                            onClick={e => { e.stopPropagation(); router.push(ROUTES.ARMADA_DETAIL(g.idArmada)) }}>
                                                            <PiTruckDuotone className="text-base" />
                                                            {g.nopol}
                                                        </span>
                                                        {g.merk && <span className="text-xs text-gray-500">{g.merk}</span>}
                                                        <span className="text-xs text-gray-400">{g.rows.length} dokumen</span>
                                                        {g.rows.some(d => !!d.berlaku_sampai && dayjs(d.berlaku_sampai).diff(dayjs(), 'day') <= 30) && (
                                                            <Tag className="text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                                                                Perlu perhatian
                                                            </Tag>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {terbuka && g.rows.map(d => {
                                                nomorBaris += 1
                                                const expiry = getExpiryInfo(d.berlaku_sampai)
                                                return (
                                                    <tr key={d.id_dokumen_armada}>
                                                        <td className="py-2.5 px-3">{nomorBaris}</td>
                                                        <td className="py-2.5 px-3">{labelJenisDokumen(d.jenis_dokumen)}</td>
                                                        <td className="py-2.5 px-3"><span className="font-mono text-xs">{d.nomor ?? '—'}</span></td>
                                                        <td className="py-2.5 px-3">
                                                            <p className="text-xs">{d.berlaku_sampai ? dayjs(d.berlaku_sampai).format('DD MMM YYYY') : '—'}</p>
                                                            <Tag className={`text-xs font-semibold mt-1 ${expiry.className}`}>{expiry.label}</Tag>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            {d.url_file
                                                                ? <a href={d.url_file} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Lihat</a>
                                                                : <span className="text-gray-400 text-xs">—</span>}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Tooltip title="Lihat Detail">
                                                                    <span
                                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                                        onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_DETAIL(d.id_dokumen_armada))}>
                                                                        <HiOutlineEye className="text-lg" />
                                                                    </span>
                                                                </Tooltip>
                                                                <Tooltip title="Perpanjang">
                                                                    <span
                                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition-colors"
                                                                        onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_PERPANJANG(d.id_dokumen_armada))}>
                                                                        <HiOutlineRefresh className="text-lg" />
                                                                    </span>
                                                                </Tooltip>
                                                                <Tooltip title="Hapus">
                                                                    <span
                                                                        className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                                        onClick={() => setDeleteTarget(d)}>
                                                                        <HiOutlineTrash className="text-lg" />
                                                                    </span>
                                                                </Tooltip>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </Fragment>
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
                            onChange={opt => { setPageSize((opt as { value: number } | null)?.value ?? 10); setCurrentPage(1) }}
                        />
                    </div>
                </div>
            </Card>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Dokumen"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: deleting }}
            >
                <p>
                    Hapus dokumen <strong>{deleteTarget ? labelJenisDokumen(deleteTarget.jenis_dokumen) : ''}</strong> untuk armada {deleteTarget?.armada_nopol}?
                    {deleteTarget?.id_dokumen_sebelumnya && ' Dokumen sebelumnya akan kembali menjadi dokumen yang berlaku.'}
                </p>
            </ConfirmDialog>
        </div>
    )
}
