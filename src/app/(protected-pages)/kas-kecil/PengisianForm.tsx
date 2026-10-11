'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import DatePicker from '@/components/ui/DatePicker'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, PengisianKasKecil, RingkasanKasKecil } from '@/services/kasKecil.service'
import { angkaRupiah } from '../kasbon/kasbonMeta'
import { MAKS_NOMINAL, errorPerField } from './kasKecilMeta'

type FieldKey = 'tanggal' | 'nominal' | 'keterangan'
type FormErrors = Partial<Record<FieldKey, string>>

export default function PengisianForm({ mode, initial }: { mode: 'baru' | 'edit'; initial?: PengisianKasKecil }) {
    const router = useRouter()
    const [tanggal, setTanggal]       = useState(initial?.tanggal ?? dayjs().format('YYYY-MM-DD'))
    const [nominal, setNominal]       = useState(initial ? String(Math.round(initial.nominal)) : '')
    const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '')
    const [errors, setErrors]         = useState<FormErrors>({})
    const [loading, setLoading]       = useState(false)
    const [ringkasan, setRingkasan]   = useState<RingkasanKasKecil | null>(null)
    const [gagalRingkasan, setGagalRingkasan] = useState(false)

    useEffect(() => {
        kasKecilService.ringkasan().then(setRingkasan).catch(() => setGagalRingkasan(true))
    }, [])

    const nilaiNominal = Number(nominal)
    const hapusError = (key: FieldKey) => setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))

    const rekening = (() => {
        if (!ringkasan) return gagalRingkasan ? 'Rekening perusahaan tidak bisa dimuat' : 'Memuat...'
        if (!ringkasan.rekening_sumber) return 'Rekening perusahaan belum diisi di profil perusahaan'

        return [ringkasan.rekening_sumber.nama_bank, ringkasan.rekening_sumber.nomor_rekening, ringkasan.rekening_sumber.atas_nama_rekening]
            .filter(Boolean).join(' · ')
    })()

    const validasi = (): FormErrors => {
        const e: FormErrors = {}
        if (!tanggal) e.tanggal = 'Tanggal wajib diisi'
        else if (dayjs(tanggal).isAfter(dayjs(), 'day')) e.tanggal = 'Tanggal pengisian tidak boleh melewati hari ini'
        if (nilaiNominal < 1) e.nominal = 'Nominal pengisian wajib diisi'
        else if (nilaiNominal > MAKS_NOMINAL) e.nominal = `Nominal pengisian maksimal ${formatRupiah(MAKS_NOMINAL)}`
        if (!keterangan.trim()) e.keterangan = 'Keterangan wajib diisi'
        return e
    }

    const handleSubmit = async () => {
        if (loading) return
        const e = validasi()
        setErrors(e)
        if (Object.keys(e).length > 0) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }

        const payload = { tanggal, nominal: nilaiNominal, keterangan: keterangan.trim() }
        setLoading(true)
        try {
            const hasil = mode === 'edit' && initial
                ? await kasKecilService.updatePengisian(initial.id_pengisian, payload)
                : await kasKecilService.createPengisian(payload)
            toast.push(<Notification type="success" title={
                mode === 'edit'
                    ? (initial?.status === 'ditolak' ? 'Pengisian diperbarui dan diajukan ulang' : 'Pengisian berhasil diperbarui')
                    : 'Pengisian kas kecil berhasil diajukan'
            } />)
            router.push(ROUTES.KAS_KECIL_PENGISIAN_DETAIL(hasil.id_pengisian))
        } catch (err) {
            setErrors(prev => ({ ...prev, ...errorPerField(err) }))
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">
                        {mode === 'edit' ? `Edit Pengisian ${initial?.nomor_pengisian ?? ''}` : 'Ajukan Pengisian Kas Kecil'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Pindahkan dana dari rekening ke kas kecil — wajib disetujui sebelum ditransfer
                    </p>
                </div>
            </div>

            <Card>
                <Alert type="info" showIcon className="mb-4">
                    Setelah disimpan, pengajuan menunggu approval. Bila disetujui, Keuangan mentransfernya di Proses Pembayaran
                    dan saldo kas kecil bertambah saat transfer dicatat.
                    {ringkasan && <> Saldo kas kecil saat ini <span className="font-semibold">{formatRupiah(ringkasan.saldo)}</span>.</>}
                </Alert>
                {mode === 'edit' && initial?.status === 'ditolak' && initial.alasan_ditolak && (
                    <Alert type="danger" showIcon className="mb-4">
                        Pengajuan ditolak: {initial.alasan_ditolak}. Perbaiki datanya lalu simpan untuk mengajukan ulang.
                    </Alert>
                )}
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        <FormItem label="Tanggal" asterisk invalid={!!errors.tanggal} errorMessage={errors.tanggal}>
                            <DatePicker inputFormat="DD/MM/YYYY" maxDate={dayjs().toDate()}
                                value={tanggal ? dayjs(tanggal).toDate() : null}
                                onChange={date => { setTanggal(date ? dayjs(date).format('YYYY-MM-DD') : ''); hapusError('tanggal') }} />
                        </FormItem>
                        <FormItem label="Nominal Pengisian" asterisk invalid={!!errors.nominal} errorMessage={errors.nominal}>
                            <Input prefix="Rp" placeholder="0" value={nominal ? formatNum(Number(nominal)) : ''}
                                invalid={!!errors.nominal}
                                onChange={e => { setNominal(angkaRupiah(e.target.value)); hapusError('nominal') }} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Rekening Sumber"
                                extra={<span className="text-xs text-gray-400 ml-2">dari profil perusahaan</span>}>
                                <Input disabled value={rekening} />
                            </FormItem>
                        </div>
                        <div className="sm:col-span-2">
                            <FormItem label="Keterangan" asterisk invalid={!!errors.keterangan} errorMessage={errors.keterangan}>
                                <Input textArea rows={2} maxLength={500} placeholder="Contoh: Isi ulang kas kecil kantor bulan Oktober" value={keterangan}
                                    invalid={!!errors.keterangan}
                                    onChange={e => { setKeterangan(e.target.value); hapusError('keterangan') }} />
                            </FormItem>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.back()}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={loading}>
                            {mode === 'edit' ? 'Simpan Perubahan' : 'Ajukan'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
