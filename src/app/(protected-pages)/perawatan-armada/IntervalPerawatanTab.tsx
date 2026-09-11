'use client'
import { Fragment, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, Tag, Tooltip, Spinner, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiOutlineSearch, HiOutlineX, HiOutlineEye, HiOutlineTrash, HiOutlineChevronDown } from 'react-icons/hi'
import { PiTruckDuotone } from 'react-icons/pi'
import { intervalPerawatanService, IntervalPerawatan } from '@/services/intervalPerawatan.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

type GrupInterval = {
    key: string
    nama_jenis_kendaraan: string
    rows: IntervalPerawatan[]
}

function ringkasSparepart(row: IntervalPerawatan) {
    const sparepart = row.sparepart ?? []
    if (sparepart.length === 0) return <span className="text-gray-400">—</span>
    const tampil = sparepart.slice(0, 2)
    const sisa = sparepart.slice(2)
    const teks = tampil.map(sp => `${sp.nama_sparepart ?? '—'} ×${formatNum(sp.qty_standar)}`).join(', ')
    return (
        <div className="flex items-center gap-1.5">
            <span>{teks}</span>
            {sisa.length > 0 && (
                <Tooltip title={
                    <div className="flex flex-col gap-1">
                        {sisa.map((sp, idx) => <span key={idx}>{sp.nama_sparepart ?? '—'} ×{formatNum(sp.qty_standar)}</span>)}
                    </div>
                }>
                    <span className="text-xs text-gray-400 cursor-help whitespace-nowrap">+{sisa.length} lainnya</span>
                </Tooltip>
            )}
        </div>
    )
}

export default function IntervalPerawatanTab() {
    const router = useRouter()
    const [list, setList] = useState<IntervalPerawatan[]>([])
    const [loading, setLoading] = useState(true)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')

    const [deleteTarget, setDeleteTarget] = useState<IntervalPerawatan | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [grupTerbuka, setGrupTerbuka] = useState<Record<string, boolean>>({})

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await intervalPerawatanService.list({ page: 1, limit: 500, search })
            setList(res.data)
            if (search) setGrupTerbuka(Object.fromEntries(res.data.map(r => [r.id_jenis_kendaraan ?? '-', true])))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => { fetchData() }, [fetchData])

    const grup = useMemo(() => {
        const map = new Map<string, GrupInterval>()
        for (const row of list) {
            const key = row.id_jenis_kendaraan ?? '-'
            let g = map.get(key)
            if (!g) {
                g = { key, nama_jenis_kendaraan: row.nama_jenis_kendaraan ?? 'Tanpa jenis kendaraan', rows: [] }
                map.set(key, g)
            }
            g.rows.push(row)
        }
        const hasil = [...map.values()]
        hasil.sort((a, b) => a.nama_jenis_kendaraan.localeCompare(b.nama_jenis_kendaraan))
        hasil.forEach(g => g.rows.sort((a, b) =>
            (a.interval_km ?? Infinity) - (b.interval_km ?? Infinity) || (a.interval_bulan ?? Infinity) - (b.interval_bulan ?? Infinity)))
        return hasil
    }, [list])

    const semuaTerbuka = grup.length > 0 && grup.every(g => grupTerbuka[g.key])
    const toggleGrup = (key: string) => setGrupTerbuka(prev => ({ ...prev, [key]: !prev[key] }))
    const toggleSemua = () => setGrupTerbuka(semuaTerbuka ? {} : Object.fromEntries(grup.map(g => [g.key, true])))

    const handleSearchSubmit = () => setSearch(searchInput)
    const handleSearchClear = () => { setSearchInput(''); setSearch('') }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await intervalPerawatanService.delete(deleteTarget.id_interval_perawatan)
            toast.push(<Notification type="success" title="Paket servis berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setDeleteTarget(null)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <Card bodyClass="p-0">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex-1">
                        <Input
                            placeholder="Cari paket servis atau jenis kendaraan... (tekan Enter)"
                            suffix={
                                searchInput
                                    ? <HiOutlineX className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                                    : <HiOutlineSearch className="text-gray-400 cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />
                            }
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10"><Spinner /></div>
                ) : grup.length === 0 ? (
                    <p className="text-gray-400 text-sm py-10 text-center">Belum ada paket servis</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                <tr className="border-b border-gray-100 dark:border-gray-700">
                                    <th className={TH_CLASS}>Paket Servis</th>
                                    <th className={TH_CLASS}>Sparepart</th>
                                    <th className="py-2.5 px-3 text-right">
                                        <button type="button" onClick={toggleSemua}
                                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                                            {semuaTerbuka ? 'Tutup semua' : 'Buka semua'}
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {grup.map(g => {
                                    const terbuka = !!grupTerbuka[g.key]
                                    return (
                                        <Fragment key={g.key}>
                                            <tr className="bg-gray-50 dark:bg-gray-800/60 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60"
                                                onClick={() => toggleGrup(g.key)}>
                                                <td colSpan={3} className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <HiOutlineChevronDown className={`text-gray-400 transition-transform ${terbuka ? '' : '-rotate-90'}`} />
                                                        <PiTruckDuotone className="text-lg text-blue-500" />
                                                        <span className="font-semibold text-gray-800 dark:text-gray-100">{g.nama_jenis_kendaraan}</span>
                                                        <Tag className="bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                                                            {g.rows.length} paket servis
                                                        </Tag>
                                                    </div>
                                                </td>
                                            </tr>
                                            {terbuka && g.rows.map(row => (
                                                <tr key={row.id_interval_perawatan}>
                                                    <td className="py-3 px-3 pl-9 text-gray-800 dark:text-gray-200">
                                                        {row.label}
                                                    </td>
                                                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                                                        {ringkasSparepart(row)}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Tooltip title="Lihat Detail">
                                                                <span
                                                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/30 cursor-pointer transition-colors"
                                                                    onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN_DETAIL(row.id_interval_perawatan))}
                                                                ><HiOutlineEye className="text-base" /></span>
                                                            </Tooltip>
                                                            <Tooltip title="Hapus">
                                                                <span
                                                                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-200 cursor-pointer transition-colors"
                                                                    onClick={() => setDeleteTarget(row)}
                                                                ><HiOutlineTrash className="text-base" /></span>
                                                            </Tooltip>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <ConfirmDialog
                isOpen={!!deleteTarget}
                type="danger"
                title="Hapus Paket Servis?"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            >
                <p className="text-sm">
                    Paket servis <span className="font-semibold">&ldquo;{deleteTarget?.label}&rdquo;</span> untuk jenis kendaraan <span className="font-semibold">{deleteTarget?.nama_jenis_kendaraan ?? '—'}</span> akan dihapus. Reminder servis untuk kombinasi ini tidak akan terhitung otomatis lagi. Lanjutkan?
                </p>
            </ConfirmDialog>
        </div>
    )
}
