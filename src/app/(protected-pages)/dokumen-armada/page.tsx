'use client'
import { Fragment, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Tag, Tooltip, Pagination, Spinner, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineRefresh, HiOutlineTrash, HiOutlineChevronDown } from 'react-icons/hi'
import { PiTruckDuotone, PiWarningOctagonDuotone, PiClockCountdownDuotone, PiFileDashedDuotone, PiShieldCheckDuotone } from 'react-icons/pi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { dokumenArmadaService, DokumenArmadaWithArmada, DokumenPerUnit, KondisiDokumenUnit, RingkasanDokumenUnit } from '@/services/dokumenArmada.service'
import { armadaService, Armada } from '@/services/armada.service'
import { JENIS_DOKUMEN_OPTIONS, getExpiryInfo, labelJenisDokumen, type Option } from './dokumenArmada.shared'

const JENIS_FILTER_OPTIONS: Option[] = [{ value: '', label: 'Semua Jenis' }, ...JENIS_DOKUMEN_OPTIONS]

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 / halaman' },
    { value: 20, label: '20 / halaman' },
    { value: 50, label: '50 / halaman' },
]

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

const HARI_PERLU_PERHATIAN = 30

const TAG_KONDISI: Record<KondisiDokumenUnit, string> = {
    habis:     'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    segera:    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    belum_ada: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    aman:      'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
}

type Kartu = { kondisi: KondisiDokumenUnit | ''; label: string; icon: ReactNode; bg: string; text: string; ring: string }

const sisaHari = (tanggal: string) => dayjs(tanggal).startOf('day').diff(dayjs().startOf('day'), 'day')

export default function DokumenArmadaPage() {
    const router = useRouter()
    const [list, setList]           = useState<DokumenPerUnit[]>([])
    const [ringkasan, setRingkasan] = useState<RingkasanDokumenUnit | null>(null)
    const [loading, setLoading]     = useState(false)
    const [armadaOptions, setArmadaOptions] = useState<Option[]>([])

    const [searchInput, setSearchInput]     = useState('')
    const [search, setSearch]               = useState('')
    const [armadaFilter, setArmadaFilter]   = useState('')
    const [jenisFilter, setJenisFilter]     = useState('')
    const [kondisiFilter, setKondisiFilter] = useState<KondisiDokumenUnit | ''>('')
    const [currentPage, setCurrentPage]     = useState(1)
    const [pageSize, setPageSize]           = useState(10)
    const [total, setTotal]                 = useState(0)

    const [deleteTarget, setDeleteTarget] = useState<DokumenArmadaWithArmada | null>(null)
    const [deleting, setDeleting]         = useState(false)
    const [grupTerbuka, setGrupTerbuka]   = useState<Record<string, boolean>>({})

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await dokumenArmadaService.perUnit({
                page: currentPage, limit: pageSize,
                id_armada: armadaFilter || undefined,
                jenis_dokumen: jenisFilter || undefined,
                search: search || undefined,
                kondisi: kondisiFilter || undefined,
            })
            setList(res.data)
            setTotal(res.meta.total)
            setRingkasan(res.meta.ringkasan)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage, pageSize, armadaFilter, jenisFilter, search, kondisiFilter])

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

    const namaJenisFilter = jenisFilter ? labelJenisDokumen(jenisFilter) : null
    const labelBelumAda = namaJenisFilter ? `Belum Ada ${namaJenisFilter}` : 'Belum Ada Dokumen'

    const kartu: Kartu[] = [
        { kondisi: '',          label: 'Semua Unit',               icon: <PiTruckDuotone className="text-3xl text-blue-500" />,             bg: 'bg-blue-50 dark:bg-blue-500/10',       text: 'text-blue-600 dark:text-blue-400',       ring: 'ring-blue-400' },
        { kondisi: 'habis',     label: 'Habis Masa Berlaku',       icon: <PiWarningOctagonDuotone className="text-3xl text-red-500" />,     bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-600 dark:text-red-400',         ring: 'ring-red-400' },
        { kondisi: 'segera',    label: 'Segera Habis (≤ 30 hari)', icon: <PiClockCountdownDuotone className="text-3xl text-amber-500" />,   bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-600 dark:text-amber-400',     ring: 'ring-amber-400' },
        { kondisi: 'belum_ada', label: labelBelumAda,               icon: <PiFileDashedDuotone className="text-3xl text-gray-500" />,        bg: 'bg-gray-50 dark:bg-gray-500/10',       text: 'text-gray-600 dark:text-gray-300',       ring: 'ring-gray-400' },
        { kondisi: 'aman',      label: 'Aman',                     icon: <PiShieldCheckDuotone className="text-3xl text-emerald-500" />,    bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
    ]

    const pilihKondisi = (kondisi: KondisiDokumenUnit | '') => {
        setKondisiFilter(prev => (prev === kondisi ? '' : kondisi))
        setCurrentPage(1)
    }

    const labelKondisi = (u: DokumenPerUnit): string => {
        if (u.kondisi === 'belum_ada') return namaJenisFilter ? `Belum ada ${namaJenisFilter}` : 'Belum ada dokumen'
        if (u.kondisi === 'aman' || !u.terdekat) return 'Aman'
        const jenis = labelJenisDokumen(u.terdekat.jenis_dokumen)
        return u.kondisi === 'habis' ? `${jenis} habis masa berlaku` : `${jenis} · ${getExpiryInfo(u.terdekat.berlaku_sampai).label}`
    }

    const semuaTerbuka = list.length > 0 && list.every(u => grupTerbuka[u.id_armada])
    const toggleGrup = (idArmada: string) => setGrupTerbuka(prev => ({ ...prev, [idArmada]: !prev[idArmada] }))
    const toggleSemua = () => setGrupTerbuka(semuaTerbuka ? {} : Object.fromEntries(list.map(u => [u.id_armada, true])))

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Dokumen Armada</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Pantau dokumen seluruh unit — STNK, KIR, Asuransi, dll</p>
                </div>
                <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.DOKUMEN_ARMADA_BARU)}>Tambah Dokumen</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {kartu.map(k => {
                    const aktif = kondisiFilter === k.kondisi
                    return (
                        <Card key={k.kondisi || 'semua'} clickable onClick={() => pilihKondisi(k.kondisi)}
                            className={`${k.bg} transition-shadow ${aktif ? `ring-2 ${k.ring}` : ''}`}>
                            <div className="flex flex-col gap-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg}`}>
                                    {k.icon}
                                </div>
                                <div className={`font-bold text-lg ${k.text}`}>
                                    {ringkasan ? ringkasan[k.kondisi || 'total'] : '—'}
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
                        placeholder="Cari nopol, merk, atau nomor dokumen... (tekan Enter)"
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
                                    {list.length > 0 && (
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
                                    <td colSpan={6} className="py-10 text-center text-gray-400">Tidak ada unit</td>
                                </tr>
                            ) : (
                                list.map((u, idx) => {
                                    const terbuka = !!grupTerbuka[u.id_armada]
                                    const perhatian = u.dokumen.filter(d => !!d.berlaku_sampai && sisaHari(d.berlaku_sampai) <= HARI_PERLU_PERHATIAN)
                                    return (
                                        <Fragment key={u.id_armada}>
                                            <tr className="bg-gray-50 dark:bg-gray-700/40 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60"
                                                onClick={() => toggleGrup(u.id_armada)}>
                                                <td className="py-2 px-3">{(currentPage - 1) * pageSize + idx + 1}</td>
                                                <td colSpan={4} className="py-2 px-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <HiOutlineChevronDown className={`text-gray-400 transition-transform ${terbuka ? '' : '-rotate-90'}`} />
                                                        <span
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/20 px-2.5 py-1 font-mono text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 cursor-pointer transition-colors"
                                                            onClick={e => { e.stopPropagation(); router.push(ROUTES.ARMADA_DETAIL(u.id_armada)) }}>
                                                            <PiTruckDuotone className="text-base" />
                                                            {u.nopol}
                                                        </span>
                                                        {(u.merk || u.nama_jenis_kendaraan) && (
                                                            <span className="text-xs text-gray-500">
                                                                {[u.merk, u.nama_jenis_kendaraan].filter(Boolean).join(' · ')}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-gray-400">{u.jumlah_dokumen} dokumen</span>
                                                        <Tag className={`text-xs font-semibold whitespace-nowrap ${TAG_KONDISI[u.kondisi]}`}>{labelKondisi(u)}</Tag>
                                                        {perhatian.length > 1 && (
                                                            <Tooltip title={
                                                                <div className="flex flex-col gap-1">
                                                                    {perhatian.slice(1).map(d => (
                                                                        <span key={d.id_dokumen_armada}>
                                                                            {labelJenisDokumen(d.jenis_dokumen)} · {getExpiryInfo(d.berlaku_sampai).label}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            }>
                                                                <Tag className="text-xs font-semibold whitespace-nowrap bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 cursor-help">
                                                                    +{perhatian.length - 1} lainnya
                                                                </Tag>
                                                            </Tooltip>
                                                        )}
                                                        {u.status_armada === 'tidak_aktif' && (
                                                            <Tag className="text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Unit tidak aktif</Tag>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-3">
                                                    <div className="flex items-center justify-end">
                                                        <Tooltip title="Tambah Dokumen Unit Ini">
                                                            <span
                                                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors"
                                                                onClick={e => { e.stopPropagation(); router.push(`${ROUTES.DOKUMEN_ARMADA_BARU}?id_armada=${u.id_armada}`) }}>
                                                                <HiPlusCircle className="text-lg" />
                                                            </span>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                            {terbuka && u.dokumen.length === 0 && (
                                                <tr>
                                                    <td />
                                                    <td colSpan={5} className="py-3 px-3 text-xs text-gray-400">
                                                        {namaJenisFilter ? `Unit ini belum punya dokumen ${namaJenisFilter}.` : 'Unit ini belum punya dokumen.'}
                                                    </td>
                                                </tr>
                                            )}
                                            {terbuka && u.dokumen.map(d => {
                                                const expiry = getExpiryInfo(d.berlaku_sampai)
                                                return (
                                                    <tr key={d.id_dokumen_armada}>
                                                        <td />
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
