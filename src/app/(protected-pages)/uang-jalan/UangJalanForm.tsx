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
import {
    uangJalanService,
    OpsiProyek,
    OpsiRute,
    OpsiUangJalan,
    OpsiUangJalanVendor,
    TipeDriver,
    UangJalan,
    UangJalanPayload,
} from '@/services/uangJalan.service'

type Option = { value: string; label: string }

type TipeOption = { value: TipeDriver; label: string }
const TIPE_OPTIONS: TipeOption[] = [
    { value: 'internal', label: 'Driver Internal' },
    { value: 'vendor', label: 'Driver Vendor' },
]

type FieldKey =
    | 'tanggal' | 'id_supir' | 'id_armada' | 'id_vendor' | 'id_supir_vendor' | 'id_armada_vendor'
    | 'id_rute' | 'uang_jalan_per_trip' | 'jumlah_trip' | 'nomor_rekening' | 'nama_bank'

type FormErrors = Partial<Record<FieldKey, string>>

type Props = {
    mode: 'baru' | 'edit'
    initial?: UangJalan
}

const MAKS_UJ_PER_TRIP = 100000000

const SECTION_CLASS = 'sm:col-span-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-2 mb-3'

const TEKS_PEMEGANG = 'Pemegang unit ini — terisi otomatis, bisa diganti'

const kosongkanNull = (v: string) => (v === '' ? null : v)

export default function UangJalanForm({ mode, initial }: Props) {
    const router = useRouter()

    const [idProyek, setIdProyek] = useState(initial?.id_proyek ?? '')
    const [tanggal, setTanggal] = useState(initial?.tanggal ?? dayjs().format('YYYY-MM-DD'))
    const [tipe, setTipe] = useState<TipeDriver>(initial?.tipe_driver ?? 'internal')
    const [idSupir, setIdSupir] = useState(initial?.id_supir ?? '')
    const [idArmada, setIdArmada] = useState(initial?.id_armada ?? '')
    const [idVendor, setIdVendor] = useState(initial?.id_vendor ?? '')
    const [idSupirVendor, setIdSupirVendor] = useState(initial?.id_supir_vendor ?? '')
    const [idArmadaVendor, setIdArmadaVendor] = useState(initial?.id_armada_vendor ?? '')
    const [idRute, setIdRute] = useState(initial?.id_rute ?? '')
    const [tolPerTrip, setTolPerTrip] = useState(initial?.tol_per_trip ? String(Math.round(initial.tol_per_trip)) : '')
    const [bbmPerTrip, setBbmPerTrip] = useState(initial?.bbm_per_trip ? String(Math.round(initial.bbm_per_trip)) : '')
    const [biayaLainPerTrip, setBiayaLainPerTrip] = useState(initial?.biaya_lain_per_trip ? String(Math.round(initial.biaya_lain_per_trip)) : '')
    const [jumlahTrip, setJumlahTrip] = useState(initial ? String(initial.jumlah_trip) : '1')
    const [nomorRekening, setNomorRekening] = useState(initial?.nomor_rekening ?? '')
    const [namaBank, setNamaBank] = useState(initial?.nama_bank ?? '')
    const [catatan, setCatatan] = useState(initial?.catatan ?? '')

    const [opsi, setOpsi] = useState<OpsiUangJalan | null>(null)
    const [opsiVendor, setOpsiVendor] = useState<OpsiUangJalanVendor | null>(null)
    const [proyekOptions, setProyekOptions] = useState<OpsiProyek[]>([])
    const [ruteProyek, setRuteProyek] = useState<OpsiRute[] | null>(null)
    const [errors, setErrors] = useState<FormErrors>({})
    const [loading, setLoading] = useState(false)
    const vendorTerpilih = useRef(initial?.id_vendor ?? '')
    const proyekTerpilih = useRef(initial?.id_proyek ?? '')
    const rateCardTerbaru = useRef(0)
    const isiDariRateCard = useRef(false)
    const [sumberRateCard, setSumberRateCard] = useState(false)

    useEffect(() => {
        uangJalanService.opsi()
            .then(setOpsi)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
        uangJalanService.opsiProyek()
            .then(setProyekOptions)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
        if (initial?.tipe_driver === 'vendor' && initial.id_vendor) {
            uangJalanService.opsiVendor(initial.id_vendor)
                .then(setOpsiVendor)
                .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
        }
        if (initial?.id_proyek) {
            muatDataProyek(initial.id_proyek)
        }
    }, [initial])

    const hapusError = (key: FieldKey) => setErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev))

    const isiRekening = (bank: string | null | undefined, nomor: string | null | undefined) => {
        setNamaBank(bank ?? '')
        setNomorRekening(nomor ?? '')
        hapusError('nama_bank')
        hapusError('nomor_rekening')
    }

    const kosongkanRincian = () => {
        setTolPerTrip('')
        setBbmPerTrip('')
        setBiayaLainPerTrip('')
        isiDariRateCard.current = false
        setSumberRateCard(false)
    }

    const ubahRincian = (setter: (nilai: string) => void, nilai: string) => {
        setter(nilai)
        isiDariRateCard.current = false
        setSumberRateCard(false)
        hapusError('uang_jalan_per_trip')
    }

    const muatRateCard = (proyekId: string, ruteId: string, armadaId: string, armadaVendorId: string) => {
        const urutan = ++rateCardTerbaru.current
        if (!proyekId || !ruteId) {
            if (isiDariRateCard.current) kosongkanRincian()
            return
        }
        const adaIsiManual = !isiDariRateCard.current && !!(tolPerTrip || bbmPerTrip || biayaLainPerTrip)
        uangJalanService.tarifRateCard({
            id_proyek: proyekId,
            id_rute: ruteId,
            id_armada: armadaId || undefined,
            id_armada_vendor: armadaVendorId || undefined,
        })
            .then(hasil => {
                if (urutan !== rateCardTerbaru.current || adaIsiManual) return
                if (hasil) {
                    setTolPerTrip(String(Math.round(hasil.tol_per_trip)))
                    setBbmPerTrip(String(Math.round(hasil.bbm_per_trip)))
                    setBiayaLainPerTrip(String(Math.round(hasil.biaya_lain_per_trip)))
                    isiDariRateCard.current = true
                    setSumberRateCard(true)
                    hapusError('uang_jalan_per_trip')
                } else if (isiDariRateCard.current) {
                    kosongkanRincian()
                }
            })
            .catch(() => {})
    }

    const muatDataProyek = (id: string) => {
        proyekTerpilih.current = id
        uangJalanService.opsiRuteProyek(id)
            .then(rute => {
                if (proyekTerpilih.current !== id) return
                setRuteProyek(rute)
            })
            .catch(err => {
                if (proyekTerpilih.current !== id) return
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            })
    }

    const pilihProyek = (id: string) => {
        setIdProyek(id)
        setIdRute('')
        hapusError('id_rute')
        rateCardTerbaru.current++
        if (isiDariRateCard.current) kosongkanRincian()
        if (!id) {
            proyekTerpilih.current = ''
            setRuteProyek(null)
            return
        }
        setRuteProyek(null)
        muatDataProyek(id)
    }

    const pilihRute = (id: string) => {
        setIdRute(id)
        hapusError('id_rute')
        muatRateCard(idProyek, id, tipe === 'internal' ? idArmada : '', tipe === 'vendor' ? idArmadaVendor : '')
    }

    const pilihArmada = (id: string) => {
        setIdArmada(id)
        hapusError('id_armada')
        const pemegang = id ? opsi?.supir.find(s => s.id_armada_default === id) : undefined
        if (pemegang) pilihSupir(pemegang.id_supir)
        muatRateCard(idProyek, idRute, id, '')
    }

    const pilihArmadaVendor = (id: string) => {
        setIdArmadaVendor(id)
        hapusError('id_armada_vendor')
        const pemegang = opsiVendor?.armada_vendor.find(a => a.id_armada_vendor === id)?.id_supir_vendor_default
        if (pemegang && opsiVendor?.supir_vendor.some(s => s.id_supir_vendor === pemegang)) {
            setIdSupirVendor(pemegang)
            hapusError('id_supir_vendor')
        }
        muatRateCard(idProyek, idRute, '', id)
    }

    const pilihTipe = (baru: TipeDriver) => {
        if (baru === tipe) return
        setTipe(baru)
        setIdSupir('')
        setIdArmada('')
        setIdVendor('')
        setIdSupirVendor('')
        setIdArmadaVendor('')
        setOpsiVendor(null)
        vendorTerpilih.current = ''
        isiRekening('', '')
        setErrors(prev => ({ ...prev, id_supir: undefined, id_armada: undefined, id_vendor: undefined, id_supir_vendor: undefined, id_armada_vendor: undefined }))
    }

    const pilihSupir = (id: string) => {
        setIdSupir(id)
        hapusError('id_supir')
        const dipilih = opsi?.supir.find(s => s.id_supir === id)
        isiRekening(dipilih?.nama_bank, dipilih?.nomor_rekening)
    }

    const pilihVendor = (id: string) => {
        setIdVendor(id)
        setIdSupirVendor('')
        setIdArmadaVendor('')
        setOpsiVendor(null)
        hapusError('id_vendor')
        isiRekening('', '')
        vendorTerpilih.current = id
        if (!id) return

        uangJalanService.opsiVendor(id)
            .then(hasil => {
                if (vendorTerpilih.current !== id) return
                setOpsiVendor(hasil)
                const pertama = hasil.rekening[0]
                if (pertama) isiRekening(pertama.nama_bank, pertama.nomor_rekening)
            })
            .catch(err => {
                if (vendorTerpilih.current !== id) return
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            })
    }

    const supirAdalahPemegang = !!idSupir && !!idArmada
        && opsi?.supir.find(s => s.id_supir === idSupir)?.id_armada_default === idArmada
    const driverVendorAdalahPemegang = !!idSupirVendor
        && opsiVendor?.armada_vendor.find(a => a.id_armada_vendor === idArmadaVendor)?.id_supir_vendor_default === idSupirVendor

    const supirOptions: Option[] = (opsi?.supir ?? []).map(s => ({ value: s.id_supir, label: s.nama }))
    const armadaOptions: Option[] = (opsi?.armada ?? []).map(a => ({ value: a.id_armada, label: a.merk ? `${a.nopol} — ${a.merk}` : a.nopol }))
    const vendorOptions: Option[] = (opsi?.vendor ?? []).map(v => ({ value: v.id_vendor, label: v.nama_vendor }))
    const proyekSelectOptions: Option[] = proyekOptions.map(p => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))
    const ruteOptions: Option[] = (idProyek ? (ruteProyek ?? []) : (opsi?.rute ?? [])).map(r => ({ value: r.id_rute, label: r.nama_rute }))
    const supirVendorOptions: Option[] = (opsiVendor?.supir_vendor ?? []).map(s => ({ value: s.id_supir_vendor, label: s.nama }))
    const armadaVendorOptions: Option[] = (opsiVendor?.armada_vendor ?? []).map(a => ({ value: a.id_armada_vendor, label: a.merk ? `${a.nopol} — ${a.merk}` : a.nopol }))
    const rekeningVendorOptions: Option[] = (opsiVendor?.rekening ?? []).map((r, i) => ({
        value: String(i),
        label: `${r.nama_bank} — ${r.nomor_rekening} (a.n. ${r.atas_nama})`,
    }))
    const rekeningVendorTerpilih = rekeningVendorOptions.find(o => {
        const r = opsiVendor?.rekening[Number(o.value)]
        return r?.nama_bank === namaBank && r?.nomor_rekening === nomorRekening
    }) ?? null

    const totalPerTrip = (Number(tolPerTrip) || 0) + (Number(bbmPerTrip) || 0) + (Number(biayaLainPerTrip) || 0)
    const nominalTransfer = totalPerTrip * (Number(jumlahTrip) || 0)
    const dataLama = mode === 'edit' && !!initial && !initial.id_rute
    const rutePlaceholder = !idProyek
        ? 'Pilih rute...'
        : ruteProyek === null
            ? 'Memuat rute proyek...'
            : ruteProyek.length === 0
                ? 'Proyek ini belum punya rute terdaftar'
                : 'Pilih rute...'

    const validasi = (): FormErrors => {
        const e: FormErrors = {}
        if (!tanggal) e.tanggal = 'Tanggal wajib diisi'
        if (tipe === 'internal') {
            if (!idSupir) e.id_supir = 'Supir wajib dipilih'
            if (!idArmada) e.id_armada = 'Unit wajib dipilih'
        } else {
            if (!idVendor) e.id_vendor = 'Vendor wajib dipilih'
            if (!idSupirVendor) e.id_supir_vendor = 'Driver vendor wajib dipilih'
            if (!idArmadaVendor) e.id_armada_vendor = 'Unit vendor wajib dipilih'
        }
        if (!idRute) e.id_rute = 'Rute wajib dipilih'
        if (totalPerTrip < 1) e.uang_jalan_per_trip = 'Isi minimal salah satu rincian biaya per trip (tol, BBM, atau biaya lain)'
        else if (totalPerTrip > MAKS_UJ_PER_TRIP) e.uang_jalan_per_trip = `Total uang jalan per trip maksimal ${formatRupiah(MAKS_UJ_PER_TRIP)}`
        if (!jumlahTrip) e.jumlah_trip = 'Jumlah trip wajib diisi'
        else if (Number(jumlahTrip) < 1) e.jumlah_trip = 'Jumlah trip minimal 1'
        if (!nomorRekening.trim()) e.nomor_rekening = 'Nomor rekening wajib diisi'
        else if (!/^[0-9][0-9\s.-]*$/.test(nomorRekening.trim())) e.nomor_rekening = 'Nomor rekening hanya boleh berisi angka, spasi, titik, atau strip'
        if (!namaBank.trim()) e.nama_bank = 'Bank wajib diisi'
        return e
    }

    const handleSubmit = async () => {
        const e = validasi()
        setErrors(e)
        if (Object.keys(e).length > 0) {
            toast.push(<Notification type="danger" title="Periksa kembali data yang belum lengkap" />)
            return
        }

        const payload: UangJalanPayload = {
            tanggal,
            tipe_driver: tipe,
            id_supir: tipe === 'internal' ? kosongkanNull(idSupir) : null,
            id_armada: tipe === 'internal' ? kosongkanNull(idArmada) : null,
            id_vendor: tipe === 'vendor' ? kosongkanNull(idVendor) : null,
            id_supir_vendor: tipe === 'vendor' ? kosongkanNull(idSupirVendor) : null,
            id_armada_vendor: tipe === 'vendor' ? kosongkanNull(idArmadaVendor) : null,
            id_rute: idRute,
            id_proyek: kosongkanNull(idProyek),
            id_penugasan: null,
            tol_per_trip: Number(tolPerTrip) || 0,
            bbm_per_trip: Number(bbmPerTrip) || 0,
            biaya_lain_per_trip: Number(biayaLainPerTrip) || 0,
            jumlah_trip: Number(jumlahTrip),
            nomor_rekening: nomorRekening.trim(),
            nama_bank: namaBank.trim(),
            catatan: catatan.trim() || null,
        }

        setLoading(true)
        try {
            const hasil = mode === 'edit' && initial
                ? await uangJalanService.update(initial.id_uang_jalan, payload)
                : await uangJalanService.create(payload)
            toast.push(<Notification type="success" title={
                mode === 'edit'
                    ? (initial?.status_pengajuan === 'ditolak' ? 'Uang jalan diperbarui dan diajukan ulang' : 'Uang jalan berhasil diperbarui')
                    : 'Uang jalan berhasil dibuat'
            } />)
            router.push(ROUTES.UANG_JALAN_DETAIL(hasil.id_uang_jalan))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
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
                        {mode === 'edit' ? `Edit Uang Jalan ${initial?.nomor_uang_jalan ?? ''}` : 'Tambah Uang Jalan'}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {mode === 'edit'
                            ? 'Ubah data uang jalan yang belum diproses keuangan'
                            : 'Setelah disimpan, uang jalan diajukan ke approval sesuai konfigurasi lalu diproses di Proses Pembayaran'}
                    </p>
                </div>
            </div>

            <Card>
                {dataLama && (
                    <Alert type="warning" showIcon className="mb-4">
                        Data ini dibuat sebelum driver, unit, dan rute tertaut ke master. Pilih ulang dari master sebelum menyimpan.
                    </Alert>
                )}
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        <p className={SECTION_CLASS}>Proyek (opsional)</p>
                        <div className="sm:col-span-2">
                            <FormItem label="Proyek" extra="Membatasi pilihan rute ke rute yang dikontrak proyek ini">
                                <Select<Option> isSearchable isClearable placeholder="Pilih proyek bila terkait..."
                                    options={proyekSelectOptions}
                                    value={proyekSelectOptions.find(o => o.value === idProyek) ?? null}
                                    onChange={opt => pilihProyek((opt as Option | null)?.value ?? '')} />
                            </FormItem>
                        </div>

                        <p className={SECTION_CLASS}>Driver &amp; Unit</p>
                        <FormItem label="Tanggal" asterisk invalid={!!errors.tanggal} errorMessage={errors.tanggal}>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={tanggal ? dayjs(tanggal).toDate() : null}
                                onChange={date => { setTanggal(date ? dayjs(date).format('YYYY-MM-DD') : ''); hapusError('tanggal') }} />
                        </FormItem>
                        <FormItem label="Status Driver" asterisk>
                            <Select<TipeOption> isSearchable={false}
                                options={TIPE_OPTIONS}
                                value={TIPE_OPTIONS.find(o => o.value === tipe) ?? null}
                                onChange={opt => pilihTipe((opt as TipeOption).value)} />
                        </FormItem>

                        {tipe === 'internal' ? (
                            <>
                                <FormItem label="No. Polisi" asterisk invalid={!!errors.id_armada} errorMessage={errors.id_armada}>
                                    <Select<Option> isSearchable placeholder="Pilih unit..."
                                        options={armadaOptions}
                                        value={armadaOptions.find(o => o.value === idArmada) ?? null}
                                        onChange={opt => pilihArmada((opt as Option | null)?.value ?? '')} />
                                </FormItem>
                                <FormItem label="Nama Driver" asterisk invalid={!!errors.id_supir} errorMessage={errors.id_supir}>
                                    <Select<Option> isSearchable placeholder="Pilih supir..."
                                        options={supirOptions}
                                        value={supirOptions.find(o => o.value === idSupir) ?? null}
                                        onChange={opt => pilihSupir((opt as Option | null)?.value ?? '')} />
                                    {supirAdalahPemegang && <p className="text-xs text-gray-400 mt-1">{TEKS_PEMEGANG}</p>}
                                </FormItem>
                            </>
                        ) : (
                            <>
                                <FormItem label="Vendor" asterisk invalid={!!errors.id_vendor} errorMessage={errors.id_vendor}>
                                    <Select<Option> isSearchable placeholder="Pilih vendor..."
                                        options={vendorOptions}
                                        value={vendorOptions.find(o => o.value === idVendor) ?? null}
                                        onChange={opt => pilihVendor((opt as Option | null)?.value ?? '')} />
                                </FormItem>
                                <div className="hidden sm:block" />
                                <FormItem label="No. Polisi" asterisk invalid={!!errors.id_armada_vendor} errorMessage={errors.id_armada_vendor}>
                                    <Select<Option> isSearchable isDisabled={!idVendor}
                                        placeholder={!idVendor ? 'Pilih vendor dahulu...' : armadaVendorOptions.length === 0 ? 'Vendor belum punya unit terdaftar' : 'Pilih unit...'}
                                        options={armadaVendorOptions}
                                        value={armadaVendorOptions.find(o => o.value === idArmadaVendor) ?? null}
                                        onChange={opt => pilihArmadaVendor((opt as Option | null)?.value ?? '')} />
                                </FormItem>
                                <FormItem label="Nama Driver" asterisk invalid={!!errors.id_supir_vendor} errorMessage={errors.id_supir_vendor}>
                                    <Select<Option> isSearchable isDisabled={!idVendor}
                                        placeholder={!idVendor ? 'Pilih vendor dahulu...' : supirVendorOptions.length === 0 ? 'Vendor belum punya driver terdaftar' : 'Pilih driver...'}
                                        options={supirVendorOptions}
                                        value={supirVendorOptions.find(o => o.value === idSupirVendor) ?? null}
                                        onChange={opt => { setIdSupirVendor((opt as Option | null)?.value ?? ''); hapusError('id_supir_vendor') }} />
                                    {driverVendorAdalahPemegang && <p className="text-xs text-gray-400 mt-1">{TEKS_PEMEGANG}</p>}
                                </FormItem>
                            </>
                        )}

                        <div className="sm:col-span-2">
                            <FormItem label="Rute" asterisk invalid={!!errors.id_rute} errorMessage={errors.id_rute}>
                                <Select<Option> isSearchable placeholder={rutePlaceholder}
                                    isDisabled={!!idProyek && ruteProyek !== null && ruteProyek.length === 0}
                                    options={ruteOptions}
                                    value={ruteOptions.find(o => o.value === idRute) ?? null}
                                    onChange={opt => pilihRute((opt as Option | null)?.value ?? '')} />
                            </FormItem>
                        </div>

                        <p className={SECTION_CLASS}>Nominal</p>
                        <FormItem label="Estimasi Tol">
                            <Input prefix="Rp" placeholder="0" value={tolPerTrip ? formatNum(Number(tolPerTrip)) : ''}
                                onChange={e => ubahRincian(setTolPerTrip, e.target.value.replace(/\D/g, '').slice(0, 9))} />
                        </FormItem>
                        <FormItem label="Estimasi BBM">
                            <Input prefix="Rp" placeholder="0" value={bbmPerTrip ? formatNum(Number(bbmPerTrip)) : ''}
                                onChange={e => ubahRincian(setBbmPerTrip, e.target.value.replace(/\D/g, '').slice(0, 9))} />
                        </FormItem>
                        <FormItem label="Estimasi Biaya Lain">
                            <Input prefix="Rp" placeholder="0" value={biayaLainPerTrip ? formatNum(Number(biayaLainPerTrip)) : ''}
                                onChange={e => ubahRincian(setBiayaLainPerTrip, e.target.value.replace(/\D/g, '').slice(0, 9))} />
                        </FormItem>
                        <FormItem label="UJ per Trip" invalid={!!errors.uang_jalan_per_trip} errorMessage={errors.uang_jalan_per_trip}
                            extra={<span className="text-xs text-gray-400">{sumberRateCard ? 'Diisi dari rate card proyek & rute — bisa diubah' : 'Otomatis: Estimasi Tol + BBM + Biaya Lain'}</span>}>
                            <Input disabled prefix="Rp" value={totalPerTrip > 0 ? formatNum(totalPerTrip) : ''} placeholder="0" />
                        </FormItem>
                        <FormItem label="Jumlah Trip" asterisk invalid={!!errors.jumlah_trip} errorMessage={errors.jumlah_trip}>
                            <Input placeholder="1" value={jumlahTrip} invalid={!!errors.jumlah_trip}
                                onChange={e => { setJumlahTrip(e.target.value.replace(/\D/g, '').slice(0, 3)); hapusError('jumlah_trip') }} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Nominal Transfer">
                                <Input disabled prefix="Rp" value={nominalTransfer > 0 ? formatNum(nominalTransfer) : ''} placeholder="Otomatis: UJ per trip × jumlah trip" />
                            </FormItem>
                        </div>

                        <p className={SECTION_CLASS}>Tujuan Transfer</p>
                        {tipe === 'vendor' && rekeningVendorOptions.length > 0 && (
                            <div className="sm:col-span-2">
                                <FormItem label="Rekening Tersimpan Vendor (opsional)">
                                    <Select<Option> isSearchable={false} placeholder="Pilih rekening tersimpan..."
                                        options={rekeningVendorOptions}
                                        value={rekeningVendorTerpilih}
                                        onChange={opt => {
                                            const r = opsiVendor?.rekening[Number((opt as Option).value)]
                                            if (r) isiRekening(r.nama_bank, r.nomor_rekening)
                                        }} />
                                </FormItem>
                            </div>
                        )}
                        <FormItem label="Nomor Rekening" asterisk invalid={!!errors.nomor_rekening} errorMessage={errors.nomor_rekening}>
                            <Input placeholder="Nomor rekening tujuan transfer" maxLength={50} value={nomorRekening}
                                invalid={!!errors.nomor_rekening}
                                onChange={e => { setNomorRekening(e.target.value); hapusError('nomor_rekening') }} />
                        </FormItem>
                        <FormItem label="Bank" asterisk invalid={!!errors.nama_bank} errorMessage={errors.nama_bank}>
                            <Input placeholder="Contoh: Mandiri" maxLength={100} value={namaBank}
                                invalid={!!errors.nama_bank}
                                onChange={e => { setNamaBank(e.target.value); hapusError('nama_bank') }} />
                        </FormItem>
                        <div className="sm:col-span-2">
                            <FormItem label="Catatan (opsional)">
                                <Input textArea rows={3} maxLength={1000} placeholder="Contoh: UJ untuk 2 Trip." value={catatan}
                                    onChange={e => setCatatan(e.target.value)} />
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
