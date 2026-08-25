'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import LogAktivitasKeuanganDialog from '@/components/shared/LogAktivitasKeuanganDialog'
import PengajuanBulkTable from '../proses-pembayaran/PengajuanBulkTable'
import { KATEGORI_OPTIONS_FILTER } from '../arus-kas/pengajuanMeta'
import { HiOutlineArrowRight, HiOutlineSearch, HiOutlineX } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { arusKasService, PengajuanPengeluaran, PengajuanKeuanganInfo } from '@/services/arusKas.service'

type Option = { value: string; label: string }

export default function ApprovalSayaPage() {
    const router = useRouter()
    const [list, setList]               = useState<PengajuanPengeluaran[]>([])
    const [totalNominal, setTotalNominal] = useState(0)
    const [loading, setLoading]         = useState(true)

    const [search, setSearch]                 = useState('')
    const [kategoriFilter, setKategoriFilter]  = useState('')

    const [logOpen, setLogOpen]       = useState(false)
    const [logInfo, setLogInfo]       = useState<PengajuanKeuanganInfo | null>(null)
    const [logLoading, setLogLoading] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await arusKasService.menungguApprovalSaya()
            setList(res.pengajuan)
            setTotalNominal(res.ringkasan.total_nominal)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setList([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    const filteredList = useMemo(() => {
        const q = search.trim().toLowerCase()
        return list.filter(p => {
            if (kategoriFilter && p.kategori !== kategoriFilter) return false
            if (q && !p.nomor_pengajuan.toLowerCase().includes(q) && !p.penerima.toLowerCase().includes(q)) return false
            return true
        })
    }, [list, kategoriFilter, search])

    const openLog = (p: PengajuanPengeluaran) => {
        setLogOpen(true)
        setLogInfo(null)
        setLogLoading(true)
        arusKasService.riwayatPengajuan(p.id_pengajuan)
            .then(setLogInfo)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLogLoading(false))
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold">Approval Saya</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Pengajuan pengeluaran yang menunggu keputusan Anda sebagai approver
                    </p>
                </div>
                <button type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => router.push(ROUTES.PROSES_PEMBAYARAN)}>
                    Lihat semua di Proses Pembayaran <HiOutlineArrowRight />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Menunggu Keputusan Anda</p>
                    <p className="text-2xl font-bold mt-1">{list.length}</p>
                </Card>
                <Card>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Nominal</p>
                    <p className="text-2xl font-bold mt-1">{formatRupiah(totalNominal)}</p>
                </Card>
            </div>

            <Card bodyClass="p-0">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                    <Input
                        className="flex-1 min-w-60"
                        placeholder="Cari nomor pengajuan atau penerima..."
                        suffix={search
                            ? <HiOutlineX className="text-gray-400 text-lg cursor-pointer hover:text-gray-600" onClick={() => setSearch('')} />
                            : <HiOutlineSearch className="text-gray-400 text-lg" />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="w-full sm:w-56 shrink-0">
                        <Select
                            isSearchable={false}
                            placeholder="Semua kategori"
                            isClearable
                            options={KATEGORI_OPTIONS_FILTER}
                            value={KATEGORI_OPTIONS_FILTER.find(o => o.value === kategoriFilter) ?? null}
                            onChange={opt => setKategoriFilter((opt as Option | null)?.value ?? '')}
                        />
                    </div>
                </div>

                <div className="p-4">
                    <PengajuanBulkTable
                        list={filteredList}
                        loading={loading}
                        bulkActions={['setuju', 'tolak']}
                        showStatusColumn={false}
                        onRefresh={fetchData}
                        onShowLog={openLog}
                    />
                </div>
            </Card>

            <LogAktivitasKeuanganDialog
                isOpen={logOpen}
                info={logInfo}
                loading={logLoading}
                onClose={() => setLogOpen(false)}
            />
        </div>
    )
}
