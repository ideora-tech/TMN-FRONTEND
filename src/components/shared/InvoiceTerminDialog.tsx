'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Button, Dialog, FormItem, Input, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { projectService } from '@/services/project.service'

export default function InvoiceTerminDialog({ isOpen, idProyek, namaProyek, nilaiKontrak, sisaKontrak, onClose }: {
    isOpen: boolean
    idProyek: string | null
    namaProyek?: string | null
    nilaiKontrak: number | null
    sisaKontrak: number | null
    onClose: () => void
}) {
    const router = useRouter()
    const [nominal, setNominal]       = useState('')
    const [uraian, setUraian]         = useState('')
    const [tanggal, setTanggal]       = useState(dayjs().format('YYYY-MM-DD'))
    const [jatuhTempo, setJatuhTempo] = useState('')
    const [dicoba, setDicoba]         = useState(false)
    const [menyimpan, setMenyimpan]   = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setNominal('')
        setUraian('')
        setTanggal(dayjs().format('YYYY-MM-DD'))
        setJatuhTempo('')
        setDicoba(false)
        setMenyimpan(false)
    }, [isOpen])

    const sisa = Math.max(0, Math.floor(sisaKontrak ?? 0))
    const sudahDitagih = nilaiKontrak !== null ? Math.max(0, nilaiKontrak - (sisaKontrak ?? 0)) : 0
    const nilai = Number(nominal) || 0

    const galatNominal = nilai < 1
        ? 'Nominal wajib diisi'
        : nilai > sisa
            ? `Melebihi sisa nilai kontrak (${formatRupiah(sisa)})`
            : ''
    const galatUraian = uraian.trim() === '' ? 'Uraian wajib diisi' : ''
    const galatTanggal = tanggal === '' ? 'Tanggal invoice wajib diisi' : ''
    const galatJatuhTempo = jatuhTempo !== '' && tanggal !== '' && jatuhTempo < tanggal
        ? 'Jatuh tempo tidak boleh sebelum tanggal invoice'
        : ''

    const simpan = async () => {
        setDicoba(true)
        if (!idProyek || galatNominal || galatUraian || galatTanggal || galatJatuhTempo) return
        setMenyimpan(true)
        try {
            const faktur = await projectService.fakturBorongan(idProyek, {
                nominal:        nilai,
                uraian:         uraian.trim(),
                tanggal_faktur: tanggal,
                jatuh_tempo:    jatuhTempo || null,
            })
            toast.push(<Notification type="success" title="Draft invoice termin berhasil dibuat" />)
            router.push(ROUTES.FAKTUR_DETAIL(faktur.id_faktur))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setMenyimpan(false)
        }
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={800}>
            <h5 className="text-base font-semibold mb-1">Buat Invoice Termin</h5>
            <p className="text-xs text-gray-500 mb-4">
                {namaProyek ? `${namaProyek} — ` : ''}proyek nilai tetap ditagih per termin terhadap nilai kontrak. Hasilnya draft invoice bernomor otomatis.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Nilai Kontrak</p>
                    <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{nilaiKontrak !== null ? formatRupiah(nilaiKontrak) : '—'}</p>
                </div>
                <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Sudah Dibuatkan Invoice</p>
                    <p className="font-bold text-base text-gray-800 dark:text-gray-100 mt-1">{formatRupiah(sudahDitagih)}</p>
                </div>
                <div className="rounded-lg p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Sisa</p>
                    <p className="font-bold text-base text-amber-700 dark:text-amber-300 mt-1">{formatRupiah(sisa)}</p>
                </div>
            </div>
            <form onSubmit={e => { e.preventDefault(); simpan() }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                    <div className="sm:col-span-2">
                        <FormItem label="Nominal Termin" asterisk invalid={dicoba && !!galatNominal} errorMessage={galatNominal}>
                            <Input prefix="Rp" placeholder="0" invalid={dicoba && !!galatNominal}
                                value={nilai ? formatNum(nilai) : ''}
                                onChange={e => setNominal(e.target.value.replace(/\D/g, ''))} />
                            {sisa > 0 && nilai !== sisa && (
                                <button type="button" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline mt-1"
                                    onClick={() => setNominal(String(sisa))}>
                                    Tagih seluruh sisa ({formatRupiah(sisa)})
                                </button>
                            )}
                        </FormItem>
                    </div>
                    <FormItem label="Tanggal Invoice" asterisk invalid={dicoba && !!galatTanggal} errorMessage={galatTanggal}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={tanggal ? dayjs(tanggal).toDate() : null}
                            onChange={date => setTanggal(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <FormItem label="Jatuh Tempo (opsional)" invalid={!!galatJatuhTempo} errorMessage={galatJatuhTempo}>
                        <DatePicker inputFormat="DD/MM/YYYY"
                            value={jatuhTempo ? dayjs(jatuhTempo).toDate() : null}
                            onChange={date => setJatuhTempo(date ? dayjs(date).format('YYYY-MM-DD') : '')} />
                    </FormItem>
                    <div className="sm:col-span-2">
                        <FormItem label="Uraian Invoice" asterisk invalid={dicoba && !!galatUraian} errorMessage={galatUraian}>
                            <Input textArea rows={3} maxLength={500} invalid={dicoba && !!galatUraian}
                                placeholder="Contoh: Termin 1 — Jasa Angkutan Unit Dedicated Periode Oktober 2026"
                                value={uraian}
                                onChange={e => setUraian(e.target.value)} />
                            <p className="text-xs text-gray-400 mt-1">Tampil sebagai deskripsi baris invoice.</p>
                        </FormItem>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={onClose}>Kembali</Button>
                    <Button type="submit" variant="solid" loading={menyimpan}>Buat Invoice</Button>
                </div>
            </form>
        </Dialog>
    )
}
