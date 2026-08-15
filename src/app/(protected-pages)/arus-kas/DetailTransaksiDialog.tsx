'use client'
import dayjs from 'dayjs'
import { Dialog, Tag } from '@/components/ui'
import { HiOutlineDocumentText } from 'react-icons/hi'
import { formatRupiah } from '@/utils/formatNumber'

export type DetailTransaksi = {
    tanggal: string
    arah: 'masuk' | 'keluar'
    sumberLabel: string
    sumberTagClass: string
    kategoriLabel: string | null
    nomor: string | null
    referensiHref: string | null
    sumberDana: string | null
    keterangan: string | null
    nominal: number
    url_bukti: string | null
}

const LABEL_CLASS = 'text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1'
const VALUE_CLASS = 'text-sm font-medium text-gray-800 dark:text-gray-200'

const isGambar = (url: string) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)

export default function DetailTransaksiDialog({ transaksi, onClose }: { transaksi: DetailTransaksi | null; onClose: () => void }) {
    const t = transaksi
    return (
        <Dialog isOpen={!!t} onRequestClose={onClose} onClose={onClose} width={560}>
            <h5 className="text-base font-semibold mb-1">Detail Transaksi</h5>
            <p className="text-xs font-mono text-gray-400 mb-4">{t?.nomor ?? '—'}</p>
            {t && (
                <div className="max-h-[65vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                            <p className={LABEL_CLASS}>Tanggal</p>
                            <p className={VALUE_CLASS}>{dayjs(t.tanggal).format('DD MMM YYYY')}</p>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Sumber</p>
                            <div className="flex items-center gap-2">
                                <Tag className={`text-xs font-semibold ${t.sumberTagClass}`}>{t.sumberLabel}</Tag>
                                {t.kategoriLabel && <span className="text-xs text-gray-400">{t.kategoriLabel}</span>}
                            </div>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Nominal</p>
                            <p className={`text-sm font-bold tabular-nums ${
                                t.arah === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                            }`}>
                                {t.arah === 'masuk' ? '+ ' : '- '}{formatRupiah(t.nominal)}
                            </p>
                        </div>
                        <div>
                            <p className={LABEL_CLASS}>Referensi</p>
                            {t.referensiHref ? (
                                <a href={t.referensiHref} target="_blank" rel="noreferrer"
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                    {t.nomor ?? 'Lihat referensi'}
                                </a>
                            ) : (
                                <p className={VALUE_CLASS}>{t.nomor ?? '—'}</p>
                            )}
                        </div>
                        {t.sumberDana && (
                            <div>
                                <p className={LABEL_CLASS}>Sumber Dana</p>
                                <p className={VALUE_CLASS}>{t.sumberDana}</p>
                            </div>
                        )}
                    </div>

                    {t.keterangan && (
                        <div className="mt-4">
                            <p className={LABEL_CLASS}>Keterangan</p>
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{t.keterangan}</p>
                        </div>
                    )}

                    <div className="mt-5">
                        <p className={`${LABEL_CLASS} mb-2`}>Bukti</p>
                        {t.url_bukti ? (
                            isGambar(t.url_bukti) ? (
                                <div className="w-fit">
                                    <a href={t.url_bukti} target="_blank" rel="noreferrer">
                                        <img src={t.url_bukti} alt="Bukti transaksi"
                                            className="h-24 w-40 object-cover rounded-lg border border-gray-100 dark:border-gray-700" />
                                    </a>
                                    <p className="text-xs text-gray-400 mt-1">Klik untuk membuka</p>
                                </div>
                            ) : (
                                <a href={t.url_bukti} target="_blank" rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                    <HiOutlineDocumentText className="text-base" /> Lihat bukti
                                </a>
                            )
                        ) : (
                            <p className="text-xs text-gray-400 italic">Tidak ada bukti tersimpan.</p>
                        )}
                    </div>
                </div>
            )}
        </Dialog>
    )
}
