'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, Card, Button, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import { kasbonService, Kasbon, KasbonPayload, OpsiKaryawanKasbon } from '@/services/kasbon.service'
import { payrollService } from '@/services/payroll.service'
import { BULAN_OPTIONS, OpsiTeks, angkaRupiah, opsiTahun } from './kasbonMeta'

type JenisOption = { value: 'baru' | 'lama'; label: string }
const JENIS_OPTIONS: JenisOption[] = [
    { value: 'baru', label: 'Kasbon Baru — dicairkan lewat Proses Pembayaran' },
    { value: 'lama', label: 'Kasbon Lama — sudah dicairkan sebelum pakai sistem' },
]

type FieldKey = 'id_karyawan' | 'tanggal' | 'nominal' | 'cicilan_per_periode' | 'mulai_potong' | 'keperluan' | 'nomor_rekening'

type FormErrors = Partial<Record<FieldKey, string>>

type Props = {
    mode: 'baru' | 'edit'
    initial?: Kasbon
}

const MAKS_NOMINAL = 1000000000

const SECTION_CLASS = 'sm:col-span-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-2 mb-3'

export default function KasbonForm({ mode, initial }: Props) {
    const router = useRouter()

    const [saldoAwal, setSaldoAwal] = useState(initial?.saldo_awal ?? false)
    const [idKaryawan, setIdKaryawan] = useState(initial?.id_karyawan ?? '')
    const [tanggal, setTanggal] = useState(initial?.tanggal ?? dayjs().format('YYYY-MM-DD'))
    const [nominal, setNominal] = useState(initial ? String(Math.round(initial.nominal)) : '')
    const [cicilan, setCicilan] = useState(initial ? String(Math.round(initial.cicilan_per_periode)) : '')
    const [bulanPotong, setBulanPotong] = useState(initial?.mulai_potong?.slice(5, 7) || dayjs().format('MM'))
    const [tahunPotong, setTahunPotong] = useState(initial?.mulai_potong?.slice(0, 4) || dayjs().format('YYYY'))
    const [keperluan, setKeperluan] = useState(initial?.keperluan ?? '')
    const [namaBank, setNamaBank] = useState(initial?.nama_bank ?? '')
    const [nomorRekening, setNomorRekening] = useState(initial?.nomor_rekening ?? '')

    const [karyawanList, setKaryawanList] = useState<OpsiKaryawanKasbon[]>([])
    const [rentangPeriode, setRentangPeriode] = useState('')
    const [errors, setErrors] = useState<FormErrors>({})
    const [loading, setLoading] = useState(false)
    const rentangTerbaru = useRef(0)

    useEffect(() => {
        kasbonService.opsiKaryawan()
            .then(setKaryawanList)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
    }, [])

    useEffect(() => {
        const urutan = ++rentangTerbaru.current
        payrollService.previewRentang(`${tahunPotong}-${bulanPotong}`)
            .then(hasil => { if (urutan === rentangTerbaru.current) setRentangPeriode(hasil.nama) })
            .catch(() => { if (urutan === rentangTerbaru.current) setRentangPeriode('') })
    }, [bulanPotong, tahunPotong])

    const hapusError = (key: FieldKey) => setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))

    const karyawanOptions: OpsiTeks[] = karyawanList
        .filter(k => saldoAwal || k.aktif || k.id_karyawan === initial?.id_karyawan)
        .map(k => ({
            value: k.id_karyawan,
            label: `${k.nama_karyawan}${k.nik ? ` — ${k.nik}` : ''}${k.aktif ? '' : ' (nonaktif)'}`,
        }))
    if (initial && !karyawanOptions.some(o => o.value === initial.id_karyawan)) {
        karyawanOptions.unshift({
            value: initial.id_karyawan,
            label: `${initial.nama_karyawan ?? 'Karyawan'}${initial.nik ? ` — ${initial.nik}` : ''}`,
        })
    }
    const tahunOptions = opsiTahun(tahunPotong)

    const karyawanTerpilih = karyawanList.find(k => k.id_karyawan === idKaryawan)
    const tampilkanSisa = !!karyawanTerpilih && karyawanTerpilih.sisa_kasbon > 0
        && (mode === 'baru' || idKaryawan !== initial?.id_karyawan)

    const nilaiNominal = Number(nominal) || 0
    const nilaiCicilan = Number(cicilan) || 0
    const kaliPotong = nilaiNominal > 0 && nilaiCicilan > 0 ? Math.ceil(nilaiNominal / nilaiCicilan) : 0

    const pilihJenis = (lama: boolean) => {
        setSaldoAwal(lama)
        if (!lama && karyawanTerpilih && !karyawanTerpilih.aktif) {
            setIdKaryawan('')
        }
    }

    const pilihKaryawan = (id: string) => {
        setIdKaryawan(id)
        hapusError('id_karyawan')
        const dipilih = karyawanList.find(k => k.id_karyawan === id)
        setNamaBank(dipilih?.nama_bank ?? '')
        setNomorRekening(dipilih?.nomor_rekening ?? '')
        hapusError('nomor_rekening')
    }

    const validasi = (): FormErrors => {
        const e: FormErrors = {}
        if (!idKaryawan) e.id_karyawan = 'Karyawan wajib dipilih'
        if (!tanggal) e.tanggal = 'Tanggal wajib diisi'
        else if (dayjs(tanggal).isAfter(dayjs(), 'day')) e.tanggal = 'Tanggal kasbon tidak boleh melewati hari ini'
        if (nilaiNominal < 1) e.nominal = 'Nominal kasbon wajib diisi'
        else if (nilaiNominal > MAKS_NOMINAL) e.nominal = `Nominal kasbon maksimal ${formatRupiah(MAKS_NOMINAL)}`
        if (nilaiCicilan < 1) e.cicilan_per_periode = 'Cicilan per periode gaji wajib diisi'
        else if (nilaiCicilan > nilaiNominal) e.cicilan_per_periode = 'Cicilan tidak boleh melebihi nominal kasbon'
        if (tanggal && `${tahunPotong}-${bulanPotong}` < tanggal.slice(0, 7)) e.mulai_potong = 'Mulai dipotong tidak boleh sebelum bulan kasbon'
        if (!keperluan.trim()) e.keperluan = 'Keperluan wajib diisi'
        if (!saldoAwal && nomorRekening.trim() && !/^[0-9][0-9\s.-]*$/.test(nomorRekening.trim())) {
            e.nomor_rekening = 'Nomor rekening hanya boleh berisi angka, spasi, titik, atau strip'
        }
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

        const payload: KasbonPayload = {
            id_karyawan: idKaryawan,
            tanggal,
            nominal: nilaiNominal,
            cicilan_per_periode: nilaiCicilan,
            mulai_potong: `${tahunPotong}-${bulanPotong}`,
            keperluan: keperluan.trim(),
            nama_bank: saldoAwal ? null : namaBank.trim() || null,
            nomor_rekening: saldoAwal ? null : nomorRekening.trim() || null,
            saldo_awal: saldoAwal,
        }

        setLoading(true)
        try {
            const hasil = mode === 'edit' && initial
                ? await kasbonService.update(initial.id_kasbon, payload)
                : await kasbonService.create(payload)
            toast.push(<Notification type="success" title={
                mode === 'edit'
                    ? (initial?.status === 'ditolak' ? 'Kasbon diperbarui dan diajukan ulang' : 'Kasbon berhasil diperbarui')
                    : 'Kasbon berhasil dibuat'
            } />)
            router.push(ROUTES.KASBON_DETAIL(hasil.id_kasbon))
        } catch (err) {
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
                        {mode === 'edit' ? `Edit Kasbon ${initial?.nomor_kasbon ?? ''}` : 'Tambah Kasbon'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {mode === 'edit'
                            ? 'Ubah data kasbon yang belum diproses keuangan'
                            : 'Setelah disimpan, kasbon diajukan ke approval sesuai konfigurasi lalu dicairkan di Proses Pembayaran'}
                    </p>
                </div>
            </div>

            <Card>
                {saldoAwal && (
                    <Alert type="info" showIcon className="mb-4">
                        Kasbon lama tidak membuat pengajuan maupun pengeluaran kas. Statusnya langsung Berjalan dan sisanya dipotong dari gaji sesuai cicilan.
                    </Alert>
                )}
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        <p className={SECTION_CLASS}>Karyawan</p>
                        <div className="sm:col-span-2">
                            <FormItem label="Jenis Kasbon" asterisk
                                extra={mode === 'edit' ? <span className="text-xs text-gray-400">Tidak bisa diubah setelah disimpan</span> : undefined}>
                                <Select<JenisOption> isSearchable={false} isDisabled={mode === 'edit'}
                                    options={JENIS_OPTIONS}
                                    value={JENIS_OPTIONS.find(o => o.value === (saldoAwal ? 'lama' : 'baru')) ?? null}
                                    onChange={opt => { if (opt) pilihJenis((opt as JenisOption).value === 'lama') }} />
                            </FormItem>
                        </div>
                        <FormItem label="Karyawan" asterisk invalid={!!errors.id_karyawan} errorMessage={errors.id_karyawan}>
                            <Select<OpsiTeks> isSearchable placeholder="Pilih karyawan..."
                                options={karyawanOptions}
                                value={karyawanOptions.find(o => o.value === idKaryawan) ?? null}
                                onChange={opt => pilihKaryawan((opt as OpsiTeks | null)?.value ?? '')} />
                            {tampilkanSisa && karyawanTerpilih && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Masih punya {formatNum(karyawanTerpilih.jumlah_kasbon_berjalan)} kasbon berjalan, sisa {formatRupiah(karyawanTerpilih.sisa_kasbon)}
                                </p>
                            )}
                            {!saldoAwal && (
                                <p className="text-xs text-gray-400 mt-1">Karyawan nonaktif hanya bisa dipilih untuk Kasbon Lama</p>
                            )}
                        </FormItem>
                        <FormItem label={saldoAwal ? 'Tanggal Kasbon Diberikan' : 'Tanggal'} asterisk invalid={!!errors.tanggal} errorMessage={errors.tanggal}>
                            <DatePicker inputFormat="DD/MM/YYYY" maxDate={dayjs().toDate()}
                                value={tanggal ? dayjs(tanggal).toDate() : null}
                                onChange={date => { setTanggal(date ? dayjs(date).format('YYYY-MM-DD') : ''); hapusError('tanggal'); hapusError('mulai_potong') }} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Keperluan" asterisk invalid={!!errors.keperluan} errorMessage={errors.keperluan}>
                                <Input textArea rows={2} maxLength={500} placeholder="Contoh: Biaya sekolah anak" value={keperluan}
                                    invalid={!!errors.keperluan}
                                    onChange={e => { setKeperluan(e.target.value); hapusError('keperluan') }} />
                            </FormItem>
                        </div>

                        <p className={SECTION_CLASS}>Nominal &amp; Cicilan</p>
                        <FormItem label={saldoAwal ? 'Sisa Kasbon Saat Ini' : 'Nominal Kasbon'} asterisk invalid={!!errors.nominal} errorMessage={errors.nominal}
                            extra={saldoAwal ? <span className="text-xs text-gray-400">Isi sisa yang belum lunas</span> : undefined}>
                            <Input prefix="Rp" placeholder="0" value={nominal ? formatNum(Number(nominal)) : ''}
                                invalid={!!errors.nominal}
                                onChange={e => { setNominal(angkaRupiah(e.target.value)); hapusError('nominal'); hapusError('cicilan_per_periode') }} />
                        </FormItem>
                        <FormItem label="Cicilan per Periode Gaji" asterisk invalid={!!errors.cicilan_per_periode} errorMessage={errors.cicilan_per_periode}
                            extra={kaliPotong > 0 ? <span className="text-xs text-gray-400">± {formatNum(kaliPotong)} kali potong gaji</span> : undefined}>
                            <Input prefix="Rp" placeholder="0" value={cicilan ? formatNum(Number(cicilan)) : ''}
                                invalid={!!errors.cicilan_per_periode}
                                onChange={e => { setCicilan(angkaRupiah(e.target.value)); hapusError('cicilan_per_periode') }} />
                        </FormItem>
                        <FormItem label="Mulai Dipotong — Bulan Gajian" asterisk invalid={!!errors.mulai_potong} errorMessage={errors.mulai_potong}>
                            <Select<OpsiTeks> isSearchable={false} options={BULAN_OPTIONS}
                                value={BULAN_OPTIONS.find(o => o.value === bulanPotong) ?? null}
                                onChange={opt => { if (opt) setBulanPotong((opt as OpsiTeks).value); hapusError('mulai_potong') }} />
                            {rentangPeriode && (
                                <p className="text-xs text-gray-400 mt-1">Periode gaji bulan itu: {rentangPeriode}</p>
                            )}
                        </FormItem>
                        <FormItem label="Tahun" asterisk>
                            <Select<OpsiTeks> isSearchable={false} options={tahunOptions}
                                value={tahunOptions.find(o => o.value === tahunPotong) ?? null}
                                onChange={opt => { if (opt) setTahunPotong((opt as OpsiTeks).value); hapusError('mulai_potong') }} />
                        </FormItem>

                        {!saldoAwal && (
                            <>
                                <p className={SECTION_CLASS}>Tujuan Pencairan (opsional)</p>
                                <FormItem label="Bank" extra={<span className="text-xs text-gray-400">Terisi dari data karyawan — kosongkan bila tunai</span>}>
                                    <Input placeholder="Contoh: BCA" maxLength={100} value={namaBank}
                                        onChange={e => setNamaBank(e.target.value)} />
                                </FormItem>
                                <FormItem label="Nomor Rekening" invalid={!!errors.nomor_rekening} errorMessage={errors.nomor_rekening}>
                                    <Input placeholder="Nomor rekening karyawan" maxLength={50} value={nomorRekening}
                                        invalid={!!errors.nomor_rekening}
                                        onChange={e => { setNomorRekening(e.target.value); hapusError('nomor_rekening') }} />
                                </FormItem>
                            </>
                        )}
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
