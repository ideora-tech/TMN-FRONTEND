'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Card, Button, Checkbox, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import UploadBerkas from '@/components/shared/UploadBerkas'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, RingkasanKasKecil, TransaksiKasKecil } from '@/services/kasKecil.service'
import { angkaRupiah } from '../kasbon/kasbonMeta'
import { MAKS_BERKAS, MAKS_NOMINAL, OpsiTeks, errorPerField } from './kasKecilMeta'

type FieldKey = 'tanggal' | 'kategori' | 'nominal' | 'penerima' | 'keterangan' | 'bukti'
type FormErrors = Partial<Record<FieldKey, string>>

export default function PengeluaranForm({ mode, initial }: { mode: 'baru' | 'edit'; initial?: TransaksiKasKecil }) {
    const router = useRouter()
    const [tanggal, setTanggal]       = useState(initial?.tanggal ?? dayjs().format('YYYY-MM-DD'))
    const [kategori, setKategori]     = useState(initial?.kategori ?? '')
    const [nominal, setNominal]       = useState(initial ? String(Math.round(initial.nominal)) : '')
    const [penerima, setPenerima]     = useState(initial?.penerima ?? '')
    const [keterangan, setKeterangan] = useState(initial?.keterangan ?? '')
    const [bukti, setBukti]           = useState<File | null>(null)
    const [hapusBukti, setHapusBukti] = useState(false)
    const [errors, setErrors]         = useState<FormErrors>({})
    const [loading, setLoading]       = useState(false)
    const [ringkasan, setRingkasan]   = useState<RingkasanKasKecil | null>(null)

    useEffect(() => {
        kasKecilService.ringkasan()
            .then(setRingkasan)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    }, [])

    const kategoriOptions: OpsiTeks[] = ringkasan?.opsi_kategori ?? []
    const nilaiNominal = Number(nominal)
    const hapusError = (key: FieldKey) => setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))

    const pilihBukti = (f: File | null) => {
        if (f && f.size > MAKS_BERKAS) {
            toast.push(<Notification type="danger" title={`Ukuran file maksimal 5 MB (file dipilih: ${(f.size / 1024 / 1024).toFixed(1)} MB)`} />)
            return
        }
        setBukti(f)
        if (f) setHapusBukti(false)
        hapusError('bukti')
    }

    const validasi = (): FormErrors => {
        const e: FormErrors = {}
        if (!tanggal) e.tanggal = 'Tanggal wajib diisi'
        else if (dayjs(tanggal).isAfter(dayjs(), 'day')) e.tanggal = 'Tanggal pengeluaran tidak boleh melewati hari ini'
        if (!kategori) e.kategori = 'Kategori wajib dipilih'
        if (nilaiNominal < 1) e.nominal = 'Nominal wajib diisi'
        else if (nilaiNominal > MAKS_NOMINAL) e.nominal = `Nominal maksimal ${formatRupiah(MAKS_NOMINAL)}`
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

        const payload = {
            tanggal,
            kategori,
            nominal: nilaiNominal,
            penerima: penerima.trim() || null,
            keterangan: keterangan.trim(),
            hapus_bukti: mode === 'edit' && hapusBukti && !bukti,
        }
        setLoading(true)
        try {
            if (mode === 'edit' && initial) {
                await kasKecilService.updatePengeluaran(initial.id_transaksi, payload, bukti)
            } else {
                await kasKecilService.createPengeluaran(payload, bukti)
            }
            toast.push(<Notification type="success" title={mode === 'edit' ? 'Pengeluaran berhasil diperbarui' : 'Pengeluaran kas kecil berhasil dicatat'} />)
            router.push(ROUTES.KAS_KECIL)
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
                        {mode === 'edit' ? `Edit Pengeluaran ${initial?.nomor_transaksi ?? ''}` : 'Catat Pengeluaran Kas Kecil'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Pengeluaran tunai dari kas kecil — langsung mengurangi saldo
                        {ringkasan && <> (saldo saat ini <span className="font-semibold">{formatRupiah(ringkasan.saldo)}</span>)</>}
                    </p>
                </div>
            </div>

            <Card>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        <FormItem label="Tanggal" asterisk invalid={!!errors.tanggal} errorMessage={errors.tanggal}>
                            <DatePicker inputFormat="DD/MM/YYYY" maxDate={dayjs().toDate()}
                                value={tanggal ? dayjs(tanggal).toDate() : null}
                                onChange={date => { setTanggal(date ? dayjs(date).format('YYYY-MM-DD') : ''); hapusError('tanggal'); hapusError('nominal') }} />
                        </FormItem>
                        <FormItem label="Kategori" asterisk invalid={!!errors.kategori} errorMessage={errors.kategori}>
                            <Select<OpsiTeks> isSearchable={false} placeholder="Pilih kategori..."
                                options={kategoriOptions}
                                value={kategoriOptions.find(o => o.value === kategori) ?? null}
                                onChange={opt => { setKategori((opt as OpsiTeks | null)?.value ?? ''); hapusError('kategori') }} />
                        </FormItem>
                        <FormItem label="Nominal" asterisk invalid={!!errors.nominal} errorMessage={errors.nominal}>
                            <Input prefix="Rp" placeholder="0" value={nominal ? formatNum(Number(nominal)) : ''}
                                invalid={!!errors.nominal}
                                onChange={e => { setNominal(angkaRupiah(e.target.value)); hapusError('nominal') }} />
                        </FormItem>
                        <FormItem label="Dibayar Kepada" invalid={!!errors.penerima} errorMessage={errors.penerima}
                            extra={<span className="text-xs text-gray-400 ml-2">opsional</span>}>
                            <Input maxLength={150} placeholder="Contoh: Toko Sumber Jaya" value={penerima}
                                onChange={e => { setPenerima(e.target.value); hapusError('penerima') }} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Keterangan" asterisk invalid={!!errors.keterangan} errorMessage={errors.keterangan}>
                                <Input textArea rows={2} maxLength={255} placeholder="Contoh: Kertas HVS dan tinta printer" value={keterangan}
                                    invalid={!!errors.keterangan}
                                    onChange={e => { setKeterangan(e.target.value); hapusError('keterangan') }} />
                            </FormItem>
                        </div>
                        <div className="sm:col-span-2">
                            <FormItem label="Bukti / Nota" invalid={!!errors.bukti} errorMessage={errors.bukti}
                                extra={<span className="text-xs text-gray-400 ml-2">opsional, tapi sebaiknya dilampirkan</span>}>
                                <UploadBerkas
                                    file={bukti}
                                    label={initial?.url_bukti ? 'Ganti file (opsional)' : 'Pilih file'}
                                    existingUrl={hapusBukti ? null : initial?.url_bukti ?? null}
                                    existingLabel="Bukti saat ini"
                                    emptyText={mode === 'edit' ? 'Belum ada bukti tersimpan' : null}
                                    onChange={pilihBukti}
                                />
                                {mode === 'edit' && initial?.url_bukti && !bukti && (
                                    <Checkbox className="mt-2" checked={hapusBukti} onChange={(checked: boolean) => setHapusBukti(checked)}>
                                        Hapus bukti yang tersimpan
                                    </Checkbox>
                                )}
                            </FormItem>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => router.back()}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={loading}>
                            {mode === 'edit' ? 'Simpan Perubahan' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
