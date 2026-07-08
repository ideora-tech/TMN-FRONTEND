'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Input, Select, Tag, Spinner, toast, Notification } from '@/components/ui'
import { HiPlusCircle, HiOutlineSearch, HiOutlineX, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineUserGroup } from 'react-icons/hi'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { karyawanService, Karyawan } from '@/services/karyawan.service'

type StatusOption = { value: string; label: string }
const STATUS_OPTIONS: StatusOption[] = [
    { value: '',        label: 'Semua Status' },
    { value: 'tetap',   label: 'Tetap' },
    { value: 'kontrak', label: 'Kontrak' },
    { value: 'magang',  label: 'Magang' },
]

const STATUS_TAG: Record<string, string> = {
    tetap:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    kontrak: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    magang:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200',
}

const GRAD_COLORS = [
    'from-blue-500 to-blue-700',
    'from-indigo-500 to-indigo-700',
    'from-violet-500 to-violet-700',
    'from-sky-500 to-sky-700',
    'from-cyan-500 to-cyan-700',
    'from-teal-500 to-teal-700',
]

export default function KaryawanPage() {
    const router = useRouter()
    const [list, setList]               = useState<Karyawan[]>([])
    const [loading, setLoading]         = useState(false)
    const [submitting, setSubmitting]   = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch]           = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [currentPage, setCurrentPage]   = useState(1)
    const [total, setTotal]               = useState(0)
    const [totalPages, setTotalPages]     = useState(1)
    const [deleteTarget, setDeleteTarget] = useState<Karyawan | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await karyawanService.list(currentPage)
            setList(res.data)
            setTotal(res.meta.total)
            setTotalPages(res.meta.totalPages)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [currentPage])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSearchSubmit = () => { setSearch(searchInput); setCurrentPage(1) }
    const handleSearchClear  = () => { setSearchInput(''); setSearch(''); setCurrentPage(1) }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setSubmitting(true)
        try {
            await karyawanService.delete(deleteTarget.id_karyawan)
            toast.push(<Notification type="success" title="Karyawan berhasil dihapus" />)
            setDeleteTarget(null)
            fetchData()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSubmitting(false)
        }
    }

    const filteredList = list.filter(k => {
        const matchSearch = !search ||
            k.nama_karyawan.toLowerCase().includes(search.toLowerCase()) ||
            k.nik.toLowerCase().includes(search.toLowerCase())
        const matchStatus = !statusFilter || k.status_kepegawaian === statusFilter
        return matchSearch && matchStatus
    })

    return (
        <div className="flex flex-col gap-4">
            <Card
                header={{
                    content: <h4>Karyawan</h4>,
                    extra: (
                        <Button variant="solid" size="sm" icon={<HiPlusCircle />}
                            onClick={() => router.push(ROUTES.KARYAWAN_BARU)}>
                            Tambah Karyawan
                        </Button>
                    ),
                    bordered: false,
                }}
            >
                {/* Search + Filter */}
                <div className="flex items-center gap-3 mb-5">
                    <Input className="flex-1" placeholder="Cari NIK atau nama karyawan... (tekan Enter)"
                        suffix={searchInput
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchClear} />
                            : <HiOutlineSearch className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={handleSearchSubmit} />}
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit() }} />
                    <div className="w-44 shrink-0">
                        <Select<StatusOption>
                            options={STATUS_OPTIONS}
                            value={STATUS_OPTIONS.find(o => o.value === statusFilter) ?? STATUS_OPTIONS[0]}
                            onChange={opt => { setStatusFilter((opt as StatusOption).value); setCurrentPage(1) }} />
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <Spinner size={40} />
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                            <HiOutlineUserGroup className="text-3xl text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-base font-medium text-gray-500 dark:text-gray-400">Belum ada data karyawan</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Tambah karyawan pertama dengan klik tombol di atas</p>
                    </div>
                ) : (
                    <>
                        {/* Card Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredList.map((k, idx) => {
                                const initials = k.nama_karyawan
                                    .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                                const grad = GRAD_COLORS[idx % GRAD_COLORS.length]
                                return (
                                    <div key={k.id_karyawan}
                                        className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow">
                                        {/* Gradient header */}
                                        <div className={`bg-gradient-to-br ${grad} px-4 pt-4 pb-8`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg select-none ring-2 ring-white/30">
                                                    {initials}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button type="button"
                                                        onClick={() => router.push(ROUTES.KARYAWAN_DETAIL(k.id_karyawan))}
                                                        className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors">
                                                        <HiOutlinePencilAlt className="text-sm" />
                                                    </button>
                                                    <button type="button"
                                                        onClick={() => setDeleteTarget(k)}
                                                        className="p-1.5 rounded-lg bg-white/15 hover:bg-red-400/50 text-white transition-colors">
                                                        <HiOutlineTrash className="text-sm" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-white font-bold text-sm leading-snug tracking-wide uppercase">
                                                {k.nama_karyawan}
                                            </p>
                                            <p className="text-white/70 text-xs mt-0.5">
                                                {k.jabatan?.nama_jabatan ?? '—'}
                                            </p>
                                        </div>

                                        {/* White bottom panel */}
                                        <div className="bg-white dark:bg-gray-800 px-4 py-3 -mt-4 rounded-t-2xl relative flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">NIK</p>
                                                <p className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">
                                                    {k.nik}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {k.status_kepegawaian ? (
                                                    <Tag className={`text-xs ${STATUS_TAG[k.status_kepegawaian] ?? ''}`}>
                                                        {k.status_kepegawaian.charAt(0).toUpperCase() + k.status_kepegawaian.slice(1)}
                                                    </Tag>
                                                ) : null}
                                                <Tag className={`text-xs ${k.aktif
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                    : 'bg-red-50 text-red-500 dark:bg-red-500/20 dark:text-red-400'}`}>
                                                    {k.aktif ? 'Aktif' : 'Tidak Aktif'}
                                                </Tag>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500">Total <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span> karyawan</p>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="default" icon={<HiOutlineChevronLeft />}
                                        disabled={currentPage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button size="sm" variant="default" icon={<HiOutlineChevronRight />}
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Card>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Karyawan?"
                confirmText="Ya, Hapus" cancelText="Batal"
                confirmButtonProps={{ loading: submitting }}
                onClose={() => setDeleteTarget(null)} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}>
                <p className="text-sm">Karyawan <span className="font-semibold">&ldquo;{deleteTarget?.nama_karyawan}&rdquo;</span> akan dihapus secara permanen.</p>
            </ConfirmDialog>
        </div>
    )
}
