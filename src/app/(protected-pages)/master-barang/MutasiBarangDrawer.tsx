'use client'
import { useEffect, useState } from 'react'
import { Drawer, Spinner, Tag } from '@/components/ui'
import dayjs from 'dayjs'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { barangService, type Barang, type BarangMutasi } from '@/services/barang.service'

const JENIS_TAG: Record<string, string> = {
    masuk:       'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    keluar:      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
    penyesuaian: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
}

const JENIS_LABEL: Record<string, string> = { masuk: 'Masuk', keluar: 'Pemakaian', penyesuaian: 'Penyesuaian' }

export default function MutasiBarangDrawer({ barang, onClose }: { barang: Barang | null; onClose: () => void }) {
    const [list, setList] = useState<BarangMutasi[]>([])
    const [loading, setLoading] = useState(false)
    const [lebar, setLebar] = useState(640)

    useEffect(() => {
        const sesuaikan = () => setLebar(Math.min(640, window.innerWidth))
        sesuaikan()
        window.addEventListener('resize', sesuaikan)
        return () => window.removeEventListener('resize', sesuaikan)
    }, [])

    useEffect(() => {
        if (!barang) return
        setLoading(true)
        barangService.listMutasi(barang.id_barang, { limit: 50 })
            .then(res => setList(res.data))
            .catch(() => setList([]))
            .finally(() => setLoading(false))
    }, [barang])

    return (
        <Drawer isOpen={!!barang} width={lebar} onClose={onClose} onRequestClose={onClose} bodyClass="p-0"
            title={
                <div className="flex flex-col">
                    <span className="font-semibold text-base">Riwayat Stok</span>
                    <span className="text-xs text-gray-500 font-normal">{barang?.kode} · {barang?.nama}</span>
                </div>
            }>
            <div className="p-5">
                {loading ? (
                    <div className="py-16 text-center"><Spinner className="inline-block" size={32} /></div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Jenis</th>
                                <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {list.length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-gray-400">Belum ada mutasi</td></tr>
                            ) : list.map(m => (
                                <tr key={m.id_mutasi}>
                                    <td className="py-2 px-3 whitespace-nowrap">{dayjs(m.tanggal).format('DD MMM YYYY')}</td>
                                    <td className="py-2 px-3"><Tag className={`text-xs font-semibold ${JENIS_TAG[m.jenis]}`}>{JENIS_LABEL[m.jenis]}</Tag></td>
                                    <td className={`py-2 px-3 text-right tabular-nums font-semibold ${m.jenis === 'keluar' || m.qty < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {m.jenis === 'keluar' ? '-' : m.qty > 0 ? '+' : ''}{formatNum(Math.abs(m.qty))}
                                    </td>
                                    <td className="py-2 px-3 text-gray-600 dark:text-gray-300">
                                        {m.nomor_permintaan ? <span className="font-mono text-xs mr-1">{m.nomor_permintaan}</span> : null}
                                        {m.pemakai ? <span className="mr-1">{m.pemakai}</span> : null}
                                        {m.harga !== null ? <span className="text-xs text-gray-400">@ {formatRupiah(m.harga)}</span> : null}
                                        {m.keterangan ? <div className="text-xs text-gray-400">{m.keterangan}</div> : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Drawer>
    )
}
