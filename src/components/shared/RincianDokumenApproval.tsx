'use client'
import dayjs from 'dayjs'
import { Spinner } from '@/components/ui'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import type { NilaiTipe, Rincian, RincianBagian, RincianKolom } from '@/services/approval.service'

const LABEL_CLASS = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'
const VALUE_CLASS = 'text-sm font-medium text-gray-800 dark:text-gray-200 whitespace-pre-line break-words'
const TH_CLASS = 'py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'
const TOTAL_CLASS = 'py-2 px-3 text-right font-semibold text-gray-800 dark:text-gray-100'

function formatAngka(nilai: number): string {
    const bulat = Math.round(nilai * 100) / 100
    if (Number.isInteger(bulat)) return formatNum(bulat)
    const [utuh, pecahan] = Math.abs(bulat).toFixed(2).split('.')
    return `${bulat < 0 ? '-' : ''}${formatNum(Number(utuh))},${pecahan.replace(/0$/, '')}`
}

function formatNilai(nilai: string | number | null | undefined, tipe?: NilaiTipe): string {
    if (nilai === null || nilai === undefined || nilai === '') return '—'
    if (tipe === 'tanggal') {
        const tanggal = dayjs(nilai)
        return tanggal.isValid() ? tanggal.format('DD MMM YYYY') : String(nilai)
    }
    if (tipe === 'rupiah' || tipe === 'angka') {
        const angka = Number(nilai)
        if (Number.isNaN(angka)) return String(nilai)
        return tipe === 'rupiah' ? formatRupiah(angka) : formatAngka(angka)
    }
    return String(nilai)
}

const rataKanan = (kolom: RincianKolom) =>
    (kolom.align ?? (kolom.tipe === 'rupiah' || kolom.tipe === 'angka' ? 'right' : 'left')) === 'right'

const tanpaPatahBaris = (kolom: RincianKolom) => !!kolom.tipe && kolom.tipe !== 'teks'

function TabelBagian({ bagian }: { bagian: RincianBagian }) {
    const daftarKolom = bagian.kolom ?? []
    const daftarBaris = bagian.baris ?? []

    return (
        <div>
            <p className={`${LABEL_CLASS} mb-2`}>{bagian.judul}</p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                        <tr className="border-b border-gray-100 dark:border-gray-700">
                            {daftarKolom.map(kolom => (
                                <th key={kolom.key} className={`${TH_CLASS} ${rataKanan(kolom) ? 'text-right' : 'text-left'}`}>
                                    {kolom.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {daftarBaris.length === 0 && (
                            <tr>
                                <td colSpan={Math.max(daftarKolom.length, 1)} className="py-3 px-3 text-center text-xs text-gray-400 italic">
                                    Tidak ada data.
                                </td>
                            </tr>
                        )}
                        {daftarBaris.map((baris, i) => (
                            <tr key={i}>
                                {daftarKolom.map(kolom => (
                                    <td key={kolom.key}
                                        className={`py-2 px-3 ${rataKanan(kolom) ? 'text-right' : 'text-left'} ${tanpaPatahBaris(kolom) ? 'whitespace-nowrap' : ''}`}>
                                        {formatNilai(baris[kolom.key], kolom.tipe)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {bagian.total && (
                            <tr className="border-t border-gray-200 dark:border-gray-600">
                                <td colSpan={Math.max(daftarKolom.length - 1, 1)} className={TOTAL_CLASS}>{bagian.total.label}</td>
                                <td className={`${TOTAL_CLASS} whitespace-nowrap`}>{formatRupiah(bagian.total.value)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default function RincianDokumenApproval({ rincian, loading }: { rincian: Rincian | null; loading: boolean }) {
    if (loading) {
        return <div className="py-10 text-center"><Spinner className="inline-block" size={28} /></div>
    }
    if (!rincian) return null

    const info = rincian.info ?? []
    const daftarBagian = rincian.bagian ?? []

    return (
        <div className="flex flex-col gap-5">
            {info.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    {info.map((item, idx) => (
                        <div key={`${idx}-${item.label}`}>
                            <p className={LABEL_CLASS}>{item.label}</p>
                            <p className={VALUE_CLASS}>{formatNilai(item.value, item.tipe)}</p>
                        </div>
                    ))}
                </div>
            )}
            {daftarBagian.map((bagian, idx) => (
                <TabelBagian key={`${idx}-${bagian.judul}`} bagian={bagian} />
            ))}
        </div>
    )
}
