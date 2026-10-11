'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, toast, Notification } from '@/components/ui'
import Tabs from '@/components/ui/Tabs'
import { HiPlusCircle, HiOutlineCash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, RingkasanKasKecil } from '@/services/kasKecil.service'
import BukuKasTab from './BukuKasTab'
import PengisianTab from './PengisianTab'
import SaldoAwalDialog from './SaldoAwalDialog'
import { TAB_KAS_KECIL, TabKasKecil } from './kasKecilMeta'

export default function KasKecilPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam     = searchParams.get('tab')
    const cariParam    = searchParams.get('cari') ?? ''
    const tanggalParam = searchParams.get('tanggal') ?? ''
    const tabAwal: TabKasKecil = TAB_KAS_KECIL.includes(tabParam as TabKasKecil) ? (tabParam as TabKasKecil) : 'buku'

    const [tab, setTab] = useState<TabKasKecil>(tabAwal)
    const [acuanBuku, setAcuanBuku] = useState({ cari: cariParam, tanggal: tanggalParam, versi: 0 })
    const [ringkasan, setRingkasan] = useState<RingkasanKasKecil | null>(null)
    const [saldoAwalOpen, setSaldoAwalOpen] = useState(false)

    const muatRingkasan = useCallback(() => {
        kasKecilService.ringkasan()
            .then(setRingkasan)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    }, [])

    useEffect(() => { muatRingkasan() }, [muatRingkasan])

    useEffect(() => {
        if (TAB_KAS_KECIL.includes(tabParam as TabKasKecil)) setTab(tabParam as TabKasKecil)
    }, [tabParam])

    useEffect(() => {
        setAcuanBuku(a => (a.cari === cariParam && a.tanggal === tanggalParam
            ? a
            : { cari: cariParam, tanggal: tanggalParam, versi: a.versi + 1 }))
    }, [cariParam, tanggalParam])

    const gantiTab = (val: string) => {
        setTab(val as TabKasKecil)
        router.replace(`${ROUTES.KAS_KECIL}?tab=${val}`, { scroll: false })
    }

    const bolehSaldoAwal = !!ringkasan?.boleh_saldo_awal
    const tawarkanSaldoAwal = bolehSaldoAwal && !ringkasan?.ada_saldo_awal && !ringkasan?.ada_transaksi

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold">Kas Kecil</h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Dana tunai kantor — diisi dari rekening lewat approval, lalu dipakai untuk pengeluaran harian
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {tab === 'buku' && tawarkanSaldoAwal && (
                        <Button variant="default" size="sm" icon={<HiOutlineCash />} onClick={() => setSaldoAwalOpen(true)}>
                            Catat Saldo Awal
                        </Button>
                    )}
                    {tab === 'buku' ? (
                        <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.KAS_KECIL_PENGELUARAN_BARU)}>
                            Catat Pengeluaran
                        </Button>
                    ) : (
                        <Button variant="solid" size="sm" icon={<HiPlusCircle />} onClick={() => router.push(ROUTES.KAS_KECIL_PENGISIAN_BARU)}>
                            Ajukan Pengisian
                        </Button>
                    )}
                </div>
            </div>

            {ringkasan && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { label: 'Saldo Kas Kecil', value: formatRupiah(ringkasan.saldo), highlight: true },
                        { label: 'Masuk Bulan Ini', value: formatRupiah(ringkasan.masuk_bulan_ini) },
                        { label: 'Keluar Bulan Ini', value: formatRupiah(ringkasan.keluar_bulan_ini) },
                        {
                            label: 'Pengisian Sedang Diproses',
                            value: ringkasan.pengisian_diproses.jumlah > 0
                                ? `${formatRupiah(ringkasan.pengisian_diproses.nominal)} · ${formatNum(ringkasan.pengisian_diproses.jumlah)} pengajuan`
                                : 'Tidak ada',
                        },
                    ].map(({ label, value, highlight }) => (
                        <div key={label} className={`rounded-lg p-3 ${highlight
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700'}`}>
                            <p className={`text-xs mb-1 ${highlight ? 'text-blue-500' : 'text-gray-500'}`}>{label}</p>
                            <p className={`font-semibold text-sm ${highlight ? 'text-blue-700 dark:text-blue-300' : ''}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            <Tabs value={tab} onChange={gantiTab}>
                <Tabs.TabList>
                    <Tabs.TabNav value="buku">Buku Kas</Tabs.TabNav>
                    <Tabs.TabNav value="pengisian">Pengisian dari Rekening</Tabs.TabNav>
                </Tabs.TabList>
                <div className="mt-4">
                    <Tabs.TabContent value="buku">
                        <BukuKasTab
                            key={acuanBuku.versi}
                            opsiKategori={ringkasan?.opsi_kategori ?? []}
                            bolehSaldoAwal={bolehSaldoAwal}
                            cariAwal={acuanBuku.cari}
                            tanggalAwal={acuanBuku.tanggal}
                            onBerubah={muatRingkasan}
                        />
                    </Tabs.TabContent>
                    <Tabs.TabContent value="pengisian">
                        <PengisianTab onBerubah={muatRingkasan} />
                    </Tabs.TabContent>
                </div>
            </Tabs>

            <SaldoAwalDialog
                isOpen={saldoAwalOpen}
                onClose={() => setSaldoAwalOpen(false)}
                onTersimpan={tanggal => {
                    setSaldoAwalOpen(false)
                    muatRingkasan()
                    setAcuanBuku(a => ({ cari: '', tanggal, versi: a.versi + 1 }))
                }}
            />
        </div>
    )
}
