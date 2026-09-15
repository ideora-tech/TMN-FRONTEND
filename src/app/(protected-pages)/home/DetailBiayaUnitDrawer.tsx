'use client'
import { useEffect, useState, Fragment } from 'react'
import dayjs from 'dayjs'
import { Button, Drawer, Spinner, Tag, Tabs, toast, Notification } from '@/components/ui'
import { HiOutlineDownload, HiOutlineChevronDown, HiOutlineChevronRight } from 'react-icons/hi'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { parseApiError } from '@/utils/error.util'
import {
    perawatanArmadaService,
    type RekapPerawatanUnit,
    type RiwayatBiayaUnit,
    type RekapSparepartUnit,
    type ParamPeriode,
} from '@/services/perawatanArmada.service'
import { STATUS_PERAWATAN, SUMBER_SPAREPART, TH_KIRI, TH_KANAN } from './biayaPerawatan.shared'

type Props = {
    unit: RekapPerawatanUnit | null
    periode: ParamPeriode
    onClose: () => void
}

type TabDetail = 'riwayat' | 'sparepart'

type DataUnit = { kunci: string; riwayat: RiwayatBiayaUnit; sparepart: RekapSparepartUnit[] }
type GalatUnit = { kunci: string; pesan: string }

const LEBAR_MAKS = 960

const labelPeriode = (p: ParamPeriode): string => {
    const dari   = p.tanggal_dari ? dayjs(p.tanggal_dari).format('DD MMM YYYY') : null
    const sampai = p.tanggal_sampai ? dayjs(p.tanggal_sampai).format('DD MMM YYYY') : null
    if (dari && sampai) return `${dari} – ${sampai}`
    if (dari) return `Sejak ${dari}`
    if (sampai) return `s.d. ${sampai}`
    return 'Semua periode'
}

export default function DetailBiayaUnitDrawer({ unit, periode, onClose }: Props) {
    const [unitTampil, setUnitTampil] = useState<RekapPerawatanUnit | null>(unit)
    const [lebar, setLebar]         = useState(LEBAR_MAKS)
    const [mengunduh, setMengunduh] = useState(false)
    const [tab, setTab]             = useState<TabDetail>('riwayat')
    const [data, setData]           = useState<DataUnit | null>(null)
    const [galat, setGalat]         = useState<GalatUnit | null>(null)
    const [percobaan, setPercobaan] = useState(0)
    const [terbuka, setTerbuka]     = useState<Record<string, boolean>>({})

    if (unit && unit !== unitTampil) setUnitTampil(unit)

    useEffect(() => {
        const sesuaikan = () => setLebar(Math.min(LEBAR_MAKS, window.innerWidth))
        sesuaikan()
        window.addEventListener('resize', sesuaikan)
        return () => window.removeEventListener('resize', sesuaikan)
    }, [])

    const drawerTerbuka = !!unit
    const idArmada = unitTampil?.id_armada ?? null
    const kunci = idArmada ? `${idArmada}|${periode.tanggal_dari ?? ''}|${periode.tanggal_sampai ?? ''}` : null

    useEffect(() => {
        if (!drawerTerbuka || !idArmada || !kunci) return
        let aktif = true
        setGalat(null)
        setTab('riwayat')
        setTerbuka({})
        Promise.all([
            perawatanArmadaService.riwayatBiayaUnit(idArmada, periode),
            perawatanArmadaService.rekapSparepartUnit(idArmada, periode),
        ])
            .then(([r, s]) => { if (aktif) setData({ kunci, riwayat: r, sparepart: s }) })
            .catch(err => {
                if (!aktif) return
                const pesan = parseApiError(err)
                setGalat({ kunci, pesan })
                toast.push(<Notification type="danger" title={pesan} />)
            })
        return () => { aktif = false }
    }, [drawerTerbuka, idArmada, kunci, periode, percobaan])

    const dataAktif  = data?.kunci === kunci ? data : null
    const galatAktif = galat?.kunci === kunci ? galat.pesan : null
    const riwayat    = dataAktif?.riwayat ?? null
    const sparepart  = dataAktif?.sparepart ?? []

    const unduhExcel = async () => {
        if (!unitTampil) return
        setMengunduh(true)
        try {
            await perawatanArmadaService.downloadLaporanUnit(unitTampil.id_armada, unitTampil.nopol, 'excel', periode)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    const ringkasan = riwayat?.ringkasan
    const totalQtySparepart   = sparepart.reduce((s, r) => s + r.total_qty, 0)
    const totalBiayaSparepart = sparepart.reduce((s, r) => s + r.total_biaya, 0)

    return (
        <Drawer
            isOpen={drawerTerbuka}
            width={lebar}
            onClose={onClose}
            onRequestClose={onClose}
            bodyClass="p-0"
            title={
                <div className="flex flex-col">
                    <span className="font-mono font-bold text-base">{unitTampil?.nopol ?? ''}</span>
                    <span className="text-xs text-gray-500 font-normal">{unitTampil?.merk ?? '—'} · {labelPeriode(periode)}</span>
                </div>
            }
        >
            {galatAktif ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{galatAktif}</span>
                    <Button size="sm" onClick={() => setPercobaan(n => n + 1)}>Coba lagi</Button>
                </div>
            ) : !riwayat ? (
                <div className="py-16 text-center"><Spinner className="inline-block" size={32} /></div>
            ) : (
                <div className="flex flex-col gap-4 p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {[
                            { label: 'Total Keluar',   value: formatRupiah(ringkasan?.total_biaya ?? 0),     className: 'text-red-600 dark:text-red-400' },
                            { label: 'Biaya Jasa',     value: formatRupiah(ringkasan?.biaya_jasa ?? 0),      className: 'text-amber-600 dark:text-amber-400' },
                            { label: 'Biaya Sparepart', value: formatRupiah(ringkasan?.biaya_sparepart ?? 0), className: 'text-violet-600 dark:text-violet-400' },
                            { label: 'Perawatan',      value: `${formatNum(ringkasan?.jumlah_perawatan ?? 0)}×`, className: 'text-blue-600 dark:text-blue-400' },
                            { label: 'KM Terakhir',    value: ringkasan?.km_terakhir != null ? `${formatNum(ringkasan.km_terakhir)} km` : '—', className: 'text-gray-800 dark:text-gray-100' },
                        ].map(k => (
                            <div key={k.label} className="rounded-xl bg-gray-50 dark:bg-gray-700/40 px-3 py-2.5">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 font-medium">{k.label}</div>
                                <div className={`font-bold text-sm mt-0.5 ${k.className}`}>{k.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <Tabs value={tab} onChange={v => setTab(v as TabDetail)} variant="pill">
                            <Tabs.TabList>
                                <Tabs.TabNav value="riwayat">Riwayat Perawatan ({riwayat.riwayat.length})</Tabs.TabNav>
                                <Tabs.TabNav value="sparepart">Rekap Spare Part ({sparepart.length})</Tabs.TabNav>
                            </Tabs.TabList>
                        </Tabs>
                        <Button size="sm" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} onClick={unduhExcel}>
                            Unduh Excel
                        </Button>
                    </div>

                    {tab === 'riwayat' && (
                        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr>
                                        <th className={`${TH_KIRI} w-8`}></th>
                                        <th className={TH_KIRI}>Tanggal</th>
                                        <th className={TH_KIRI}>Jenis</th>
                                        <th className={TH_KIRI}>Status</th>
                                        <th className={TH_KANAN}>KM</th>
                                        <th className={TH_KIRI}>Bengkel</th>
                                        <th className={TH_KANAN}>Jasa</th>
                                        <th className={TH_KANAN}>Sparepart</th>
                                        <th className={TH_KANAN}>Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {riwayat.riwayat.length === 0 ? (
                                        <tr><td colSpan={9} className="py-8 text-center text-gray-400">Tidak ada perawatan pada periode ini</td></tr>
                                    ) : riwayat.riwayat.map(p => {
                                        const status = STATUS_PERAWATAN[p.status]
                                        const buka = !!terbuka[p.id_perawatan]
                                        const adaPart = p.sparepart.length > 0
                                        return (
                                            <Fragment key={p.id_perawatan}>
                                                <tr className={adaPart ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40' : ''}
                                                    onClick={() => adaPart && setTerbuka(t => ({ ...t, [p.id_perawatan]: !buka }))}>
                                                    <td className="py-2.5 px-3 text-gray-400">
                                                        {adaPart && (buka ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />)}
                                                    </td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">{dayjs(p.tanggal).format('DD MMM YYYY')}</td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-medium">{p.jenis_perawatan}</div>
                                                        {p.keterangan && <div className="text-xs text-gray-400 truncate max-w-[220px]">{p.keterangan}</div>}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <Tag className={`text-xs ${status?.className ?? ''}`}>{status?.label ?? p.status}</Tag>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">{p.km_odometer !== null ? formatNum(p.km_odometer) : '—'}</td>
                                                    <td className="py-2.5 px-3">{p.nama_supplier ?? <span className="text-gray-400">—</span>}</td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(p.biaya_jasa)}</td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                        {formatRupiah(p.biaya_sparepart)}
                                                        {adaPart && <span className="block text-[11px] text-gray-400">{p.sparepart.length} item</span>}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold">{formatRupiah(p.total_biaya)}</td>
                                                </tr>
                                                {buka && (
                                                    <tr className="bg-gray-50/70 dark:bg-gray-700/20">
                                                        <td colSpan={9} className="px-3 py-2">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="text-gray-400">
                                                                        <th className="text-left py-1 pl-8 font-medium">Spare Part</th>
                                                                        <th className="text-left py-1 font-medium">Sumber</th>
                                                                        <th className="text-right py-1 font-medium">Qty</th>
                                                                        <th className="text-right py-1 font-medium">Harga</th>
                                                                        <th className="text-right py-1 pr-3 font-medium">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {p.sparepart.map((s, i) => {
                                                                        const sumber = SUMBER_SPAREPART[s.sumber]
                                                                        return (
                                                                            <tr key={`${p.id_perawatan}-${i}`}>
                                                                                <td className="py-1 pl-8">
                                                                                    <span className="font-medium">{s.nama_sparepart}</span>
                                                                                    {s.kode_sparepart && <span className="font-mono text-gray-400 ml-1">({s.kode_sparepart})</span>}
                                                                                </td>
                                                                                <td className="py-1"><Tag className={`text-[10px] ${sumber?.className ?? ''}`}>{sumber?.label ?? s.sumber}</Tag></td>
                                                                                <td className="py-1 text-right">{formatNum(s.qty)} {s.satuan ?? ''}</td>
                                                                                <td className="py-1 text-right whitespace-nowrap">{formatRupiah(s.harga)}</td>
                                                                                <td className="py-1 pr-3 text-right whitespace-nowrap font-semibold">{formatRupiah(s.subtotal)}</td>
                                                                            </tr>
                                                                        )
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        )
                                    })}
                                    {riwayat.riwayat.length > 0 && (
                                        <tr className="bg-blue-50/60 dark:bg-blue-500/10 font-bold">
                                            <td colSpan={6} className="py-2.5 px-3">TOTAL</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(ringkasan?.biaya_jasa ?? 0)}</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(ringkasan?.biaya_sparepart ?? 0)}</td>
                                            <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(ringkasan?.total_biaya ?? 0)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {tab === 'sparepart' && (
                        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr>
                                        <th className={TH_KIRI}>Spare Part</th>
                                        <th className={TH_KIRI}>Sumber</th>
                                        <th className={TH_KANAN}>Total Qty</th>
                                        <th className={TH_KANAN}>Harga Rata-rata</th>
                                        <th className={TH_KANAN}>Total Biaya</th>
                                        <th className={TH_KANAN}>Perawatan</th>
                                        <th className={TH_KIRI}>Terakhir Dipakai</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {sparepart.length === 0 ? (
                                        <tr><td colSpan={7} className="py-8 text-center text-gray-400">Belum ada spare part yang dipakai pada periode ini</td></tr>
                                    ) : (
                                        <>
                                            {sparepart.map((s, i) => {
                                                const sumber = SUMBER_SPAREPART[s.sumber]
                                                return (
                                                    <tr key={`${s.id_sparepart ?? s.nama_sparepart}-${i}`}>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-medium">{s.nama_sparepart}</div>
                                                            {s.kode_sparepart && <div className="font-mono text-xs text-gray-400">{s.kode_sparepart}</div>}
                                                        </td>
                                                        <td className="py-2.5 px-3"><Tag className={`text-xs ${sumber?.className ?? ''}`}>{sumber?.label ?? s.sumber}</Tag></td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatNum(s.total_qty)} {s.satuan ?? ''}</td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(s.harga_rata)}</td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold">{formatRupiah(s.total_biaya)}</td>
                                                        <td className="py-2.5 px-3 text-right">{formatNum(s.jumlah_perawatan)}×</td>
                                                        <td className="py-2.5 px-3 whitespace-nowrap">{s.terakhir_dipakai ? dayjs(s.terakhir_dipakai).format('DD MMM YYYY') : '—'}</td>
                                                    </tr>
                                                )
                                            })}
                                            <tr className="bg-blue-50/60 dark:bg-blue-500/10 font-bold">
                                                <td colSpan={2} className="py-2.5 px-3">TOTAL</td>
                                                <td className="py-2.5 px-3 text-right">{formatNum(totalQtySparepart)}</td>
                                                <td className="py-2.5 px-3" />
                                                <td className="py-2.5 px-3 text-right whitespace-nowrap">{formatRupiah(totalBiayaSparepart)}</td>
                                                <td colSpan={2} className="py-2.5 px-3" />
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </Drawer>
    )
}
