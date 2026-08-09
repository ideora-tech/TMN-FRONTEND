'use client'
import { useEffect, useState } from 'react'
import { Button, Checkbox, Dialog, FormItem, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import dayjs from 'dayjs'
import {
    HiArrowLeft,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
    HiOutlinePencilAlt,
    HiOutlineSearch,
    HiOutlineTrash,
    HiPlusCircle,
} from 'react-icons/hi'
import { ruteService, Rute } from '@/services/rute.service'
import { tarifRuteService, TarifRute } from '@/services/tarifRute.service'
import { lokasiService } from '@/services/lokasi.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'

export type PilihanItemRute = {
    id_rute: string
    id_jenis_kendaraan: string | null
    id_tarif_rute: string | null
    harga_satuan: number | null
}

type Props = {
    isOpen: boolean
    onClose: () => void
    onPilih: (pilihan: PilihanItemRute) => void
    onRuteBaru: (rute: Rute) => void
    idKlien?: string
    namaKlien?: string
}

type Option = { value: string; label: string }
type Tampilan = 'daftar' | 'buat'

interface FormRuteBaru {
    kode_rute: string
    nama_rute: string
    id_lokasi_asal: string
    id_lokasi_tujuan: string
    estimasi_jarak_km: string
    estimasi_durasi_menit: string
}

interface TarifDraft {
    id_jenis_kendaraan: string
    namaJenis: string
    hargaStr: string
    khususKlien: boolean
}

const FORM_RUTE_KOSONG: FormRuteBaru = {
    kode_rute: '', nama_rute: '', id_lokasi_asal: '', id_lokasi_tujuan: '',
    estimasi_jarak_km: '', estimasi_durasi_menit: '',
}

const TARIF_DRAFT_KOSONG: TarifDraft = {
    id_jenis_kendaraan: '', namaJenis: '', hargaStr: '', khususKlien: false,
}

const LIMIT_RUTE = 20

const TAG_UMUM = 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-0'
const TAG_KLIEN = 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 border-0'

export default function PilihRuteDialog({ isOpen, onClose, onPilih, onRuteBaru, idKlien, namaKlien }: Props) {
    const [tampilan, setTampilan] = useState<Tampilan>('daftar')

    const [cari, setCari] = useState('')
    const [cariDebounced, setCariDebounced] = useState('')
    const [ruteRows, setRuteRows] = useState<Rute[]>([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [versiDaftar, setVersiDaftar] = useState(0)
    const [memuatRute, setMemuatRute] = useState(false)
    const [memuatLagi, setMemuatLagi] = useState(false)

    const [ruteTerbuka, setRuteTerbuka] = useState<string | null>(null)
    const [tarifPerRute, setTarifPerRute] = useState<Record<string, TarifRute[]>>({})
    const [memuatTarif, setMemuatTarif] = useState<string | null>(null)

    const [editTarif, setEditTarif] = useState<{ id: string; idRute: string; hargaStr: string } | null>(null)
    const [menyimpanTarif, setMenyimpanTarif] = useState(false)

    const [formRute, setFormRute] = useState<FormRuteBaru>(FORM_RUTE_KOSONG)
    const [errorsRute, setErrorsRute] = useState<Partial<Record<'kode_rute' | 'nama_rute', string>>>({})
    const [lokasiOptions, setLokasiOptions] = useState<Option[]>([])
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [opsiFormDimuat, setOpsiFormDimuat] = useState(false)
    const [tarifDraft, setTarifDraft] = useState<TarifDraft>(TARIF_DRAFT_KOSONG)
    const [showTarifDraft, setShowTarifDraft] = useState(false)
    const [stagedTarif, setStagedTarif] = useState<TarifDraft[]>([])
    const [menyimpanRute, setMenyimpanRute] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setTampilan('daftar')
        setCari('')
        setCariDebounced('')
        setRuteTerbuka(null)
        setTarifPerRute({})
        setEditTarif(null)
        setFormRute(FORM_RUTE_KOSONG)
        setErrorsRute({})
        setTarifDraft(TARIF_DRAFT_KOSONG)
        setShowTarifDraft(false)
        setStagedTarif([])
    }, [isOpen])

    useEffect(() => {
        const t = setTimeout(() => setCariDebounced(cari), 300)
        return () => clearTimeout(t)
    }, [cari])

    useEffect(() => {
        if (!isOpen) return
        let aktif = true
        setMemuatRute(true)
        ruteService.list({ page: 1, limit: LIMIT_RUTE, search: cariDebounced || undefined })
            .then(res => {
                if (!aktif) return
                setRuteRows((res.data ?? []) as Rute[])
                setTotal(res.meta?.total ?? 0)
                setPage(1)
            })
            .catch(err => { if (aktif) toast.push(<Notification type="danger" title={parseApiError(err)} />) })
            .finally(() => { if (aktif) setMemuatRute(false) })
        return () => { aktif = false }
    }, [isOpen, cariDebounced, versiDaftar])

    const adaLagi = ruteRows.length < total

    const muatLebihBanyak = async () => {
        setMemuatLagi(true)
        try {
            const res = await ruteService.list({ page: page + 1, limit: LIMIT_RUTE, search: cariDebounced || undefined })
            setRuteRows(prev => [...prev, ...((res.data ?? []) as Rute[])])
            setTotal(res.meta?.total ?? 0)
            setPage(p => p + 1)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMemuatLagi(false)
        }
    }

    const muatTarifRute = async (idRute: string) => {
        setMemuatTarif(idRute)
        try {
            const res = await tarifRuteService.list({ id_rute: idRute, berlaku: '1', limit: 100 })
            setTarifPerRute(prev => ({ ...prev, [idRute]: (res.data ?? []) as TarifRute[] }))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMemuatTarif(null)
        }
    }

    const toggleRute = (idRute: string) => {
        setEditTarif(null)
        const akanBuka = ruteTerbuka !== idRute
        setRuteTerbuka(akanBuka ? idRute : null)
        if (akanBuka && !tarifPerRute[idRute]) muatTarifRute(idRute)
    }

    const pilihTarif = (t: TarifRute) => {
        onPilih({
            id_rute: t.id_rute,
            id_jenis_kendaraan: t.id_jenis_kendaraan,
            id_tarif_rute: t.id_tarif_rute,
            harga_satuan: t.harga,
        })
        toast.push(<Notification type="success" title="Item ditambahkan ke penawaran" />)
    }

    const pilihRuteSaja = (idRute: string) => {
        onPilih({ id_rute: idRute, id_jenis_kendaraan: null, id_tarif_rute: null, harga_satuan: null })
        toast.push(<Notification type="success" title="Item ditambahkan ke penawaran" />)
    }

    const simpanEditTarif = async () => {
        if (!editTarif || !editTarif.hargaStr) return
        setMenyimpanTarif(true)
        try {
            await tarifRuteService.update(editTarif.id, { harga: Number(editTarif.hargaStr) })
            toast.push(<Notification type="success" title="Harga tarif diperbarui" />)
            const idRute = editTarif.idRute
            setEditTarif(null)
            await muatTarifRute(idRute)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpanTarif(false)
        }
    }

    const bukaFormBuat = () => {
        setTampilan('buat')
        if (opsiFormDimuat) return
        setOpsiFormDimuat(true)
        lokasiService.list(1, 200)
            .then(res => setLokasiOptions(res.data.map(l => ({
                value: l.id_lokasi,
                label: `${l.nama_lokasi}${l.kota && l.kota.trim().toLowerCase() !== l.nama_lokasi.trim().toLowerCase() ? ' — ' + l.kota : ''}`,
            }))))
            .catch(() => { })
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => { })
    }

    const tambahKeDaftarTarif = () => {
        if (!tarifDraft.id_jenis_kendaraan || !tarifDraft.hargaStr) return
        setStagedTarif(prev => [...prev, tarifDraft])
        setTarifDraft(TARIF_DRAFT_KOSONG)
        setShowTarifDraft(false)
    }

    const simpanRuteBaru = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs: Partial<Record<'kode_rute' | 'nama_rute', string>> = {}
        if (!formRute.kode_rute.trim()) errs.kode_rute = 'Kode rute wajib diisi'
        if (!formRute.nama_rute.trim()) errs.nama_rute = 'Nama rute wajib diisi'
        setErrorsRute(errs)
        if (Object.keys(errs).length > 0) return

        setMenyimpanRute(true)
        let rute: Rute
        try {
            rute = await ruteService.create({
                kode_rute: formRute.kode_rute.trim(),
                nama_rute: formRute.nama_rute.trim(),
                id_lokasi_asal: formRute.id_lokasi_asal || null,
                id_lokasi_tujuan: formRute.id_lokasi_tujuan || null,
                estimasi_jarak_km: formRute.estimasi_jarak_km ? parseFloat(formRute.estimasi_jarak_km) : null,
                estimasi_durasi_menit: formRute.estimasi_durasi_menit ? parseInt(formRute.estimasi_durasi_menit) : null,
            })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setMenyimpanRute(false)
            return
        }

        onRuteBaru(rute)

        const tarifDibuat: TarifRute[] = []
        const gagal: string[] = []
        for (const draft of stagedTarif) {
            try {
                const t = await tarifRuteService.create({
                    id_rute: rute.id_rute,
                    id_jenis_kendaraan: draft.id_jenis_kendaraan,
                    id_klien: draft.khususKlien && idKlien ? idKlien : null,
                    harga: Number(draft.hargaStr),
                    tanggal_mulai: dayjs().format('YYYY-MM-DD'),
                })
                tarifDibuat.push(t)
            } catch (err) {
                gagal.push(`${draft.namaJenis}: ${parseApiError(err)}`)
            }
        }

        if (tarifDibuat.length > 0) {
            tarifDibuat.forEach(t => onPilih({
                id_rute: rute.id_rute,
                id_jenis_kendaraan: t.id_jenis_kendaraan,
                id_tarif_rute: t.id_tarif_rute,
                harga_satuan: t.harga,
            }))
        } else {
            onPilih({ id_rute: rute.id_rute, id_jenis_kendaraan: null, id_tarif_rute: null, harga_satuan: null })
        }

        if (gagal.length > 0) {
            toast.push(<Notification type="danger" title={`Sebagian tarif gagal disimpan — ${gagal.join('; ')}`} />)
        }
        toast.push(<Notification type="success" title={
            tarifDibuat.length > 0
                ? `Rute dibuat, ${tarifDibuat.length} item ditambahkan ke penawaran`
                : 'Rute dibuat & item ditambahkan ke penawaran'
        } />)

        setFormRute(FORM_RUTE_KOSONG)
        setErrorsRute({})
        setTarifDraft(TARIF_DRAFT_KOSONG)
        setShowTarifDraft(false)
        setStagedTarif([])
        setMenyimpanRute(false)
        setCari('')
        setCariDebounced('')
        setVersiDaftar(v => v + 1)
        setTampilan('daftar')
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={700}>
            {tampilan === 'daftar' ? (
                <>
                    <h5 className="text-base font-semibold mb-1">Daftar Rute</h5>
                    <p className="text-xs text-gray-400 mb-4">
                        Pilih tarif untuk menambah item rate card, ubah harga, atau buat rute baru tanpa pindah halaman
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Cari nama, kode, asal, atau tujuan..."
                                prefix={<HiOutlineSearch className="text-lg" />}
                                value={cari}
                                onChange={e => setCari(e.target.value)}
                            />
                        </div>
                        <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />} onClick={bukaFormBuat}>
                            Rute Baru
                        </Button>
                    </div>
                    <div className="max-h-[55vh] overflow-y-auto pr-1 flex flex-col gap-2">
                        {memuatRute && <p className="text-sm text-gray-400 py-6 text-center">Memuat...</p>}
                        {!memuatRute && ruteRows.length === 0 && (
                            <p className="text-sm text-gray-400 py-6 text-center">
                                Tidak ada rute yang cocok — buat rute baru dengan tombol di atas
                            </p>
                        )}
                        {!memuatRute && ruteRows.map(r => {
                            const terbuka = ruteTerbuka === r.id_rute
                            const tarifList = tarifPerRute[r.id_rute]
                            return (
                                <div key={r.id_rute} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <div
                                        className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 rounded-lg"
                                        onClick={() => toggleRute(r.id_rute)}
                                    >
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{r.nama_rute}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                {r.kode_rute}
                                                {(r.asal || r.tujuan) ? ` · ${r.asal ?? '?'} → ${r.tujuan ?? '?'}` : ''}
                                            </p>
                                        </div>
                                        {terbuka
                                            ? <HiOutlineChevronUp className="text-gray-400 flex-shrink-0" />
                                            : <HiOutlineChevronDown className="text-gray-400 flex-shrink-0" />}
                                    </div>
                                    {terbuka && (
                                        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
                                            {memuatTarif === r.id_rute && (
                                                <p className="text-sm text-gray-400 py-3">Memuat tarif...</p>
                                            )}
                                            {memuatTarif !== r.id_rute && (tarifList?.length ?? 0) === 0 && (
                                                <p className="text-sm text-gray-400 py-3">Belum ada tarif aktif untuk rute ini</p>
                                            )}
                                            {memuatTarif !== r.id_rute && tarifList && tarifList.length > 0 && (
                                                <div className="overflow-x-auto mt-2">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                                                            <tr className="text-left text-gray-600 dark:text-gray-300">
                                                                <th className="px-2 py-1.5 font-semibold">Jenis Kendaraan</th>
                                                                <th className="px-2 py-1.5 font-semibold">Harga</th>
                                                                <th className="px-2 py-1.5 font-semibold">Berlaku Untuk</th>
                                                                <th className="px-2 py-1.5 w-36"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {tarifList.map(t => (
                                                                <tr key={t.id_tarif_rute} className="border-b border-gray-100 dark:border-gray-700">
                                                                    <td className="px-2 py-2 font-medium text-gray-800 dark:text-gray-200">
                                                                        {t.nama_jenis ?? '-'}
                                                                    </td>
                                                                    <td className="px-2 py-2 whitespace-nowrap">
                                                                        {editTarif && editTarif.id === t.id_tarif_rute ? (
                                                                            <Input
                                                                                prefix="Rp"
                                                                                placeholder="0"
                                                                                className="min-w-[130px]"
                                                                                value={editTarif.hargaStr ? formatNum(Number(editTarif.hargaStr)) : ''}
                                                                                onChange={e => setEditTarif(p => (p ? { ...p, hargaStr: e.target.value.replace(/\D/g, '') } : p))}
                                                                            />
                                                                        ) : formatRupiah(t.harga)}
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        <Tag className={t.id_klien ? TAG_KLIEN : TAG_UMUM}>
                                                                            {t.id_klien ? (t.nama_klien ?? 'Khusus klien') : 'Umum'}
                                                                        </Tag>
                                                                    </td>
                                                                    <td className="px-2 py-2">
                                                                        {editTarif && editTarif.id === t.id_tarif_rute ? (
                                                                            <div className="flex items-center justify-end gap-1">
                                                                                <Button type="button" size="xs" variant="solid"
                                                                                    loading={menyimpanTarif}
                                                                                    disabled={!editTarif.hargaStr}
                                                                                    onClick={simpanEditTarif}>
                                                                                    Simpan
                                                                                </Button>
                                                                                <Button type="button" size="xs" variant="plain"
                                                                                    onClick={() => setEditTarif(null)}>
                                                                                    Batal
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                <Tooltip title="Ubah harga">
                                                                                    <span
                                                                                        className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30 transition-colors"
                                                                                        onClick={() => setEditTarif({
                                                                                            id: t.id_tarif_rute,
                                                                                            idRute: t.id_rute,
                                                                                            hargaStr: String(Math.round(t.harga)),
                                                                                        })}
                                                                                    >
                                                                                        <HiOutlinePencilAlt />
                                                                                    </span>
                                                                                </Tooltip>
                                                                                <Button type="button" size="xs" variant="solid"
                                                                                    onClick={() => pilihTarif(t)}>
                                                                                    Pilih
                                                                                </Button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            {memuatTarif !== r.id_rute && (
                                                <Button type="button" size="xs" variant="default" className="mt-2"
                                                    onClick={() => pilihRuteSaja(r.id_rute)}>
                                                    Pilih Rute Ini (harga manual)
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {!memuatRute && adaLagi && (
                            <Button type="button" size="sm" variant="default" loading={memuatLagi} onClick={muatLebihBanyak}>
                                Muat Lebih Banyak
                            </Button>
                        )}
                    </div>
                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={onClose}>Tutup</Button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-1">
                        <button
                            type="button"
                            onClick={() => setTampilan('daftar')}
                            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                        >
                            <HiArrowLeft />
                        </button>
                        <h5 className="text-base font-semibold">Rute Baru</h5>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 ml-9">
                        Rute langsung tersedia di penawaran setelah disimpan
                    </p>
                    <form onSubmit={simpanRuteBaru}>
                        <div className="max-h-[55vh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                <FormItem label="Kode Rute" asterisk invalid={!!errorsRute.kode_rute} errorMessage={errorsRute.kode_rute}>
                                    <Input placeholder="Contoh: RT-001" value={formRute.kode_rute}
                                        invalid={!!errorsRute.kode_rute}
                                        onChange={e => setFormRute(p => ({ ...p, kode_rute: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Nama Rute" asterisk invalid={!!errorsRute.nama_rute} errorMessage={errorsRute.nama_rute}>
                                    <Input placeholder="Contoh: Jakarta - Surabaya" value={formRute.nama_rute}
                                        invalid={!!errorsRute.nama_rute}
                                        onChange={e => setFormRute(p => ({ ...p, nama_rute: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Asal">
                                    <Select<Option> isClearable isSearchable placeholder="Pilih lokasi asal..."
                                        options={lokasiOptions}
                                        value={lokasiOptions.find(o => o.value === formRute.id_lokasi_asal) ?? null}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                        onChange={opt => setFormRute(p => ({ ...p, id_lokasi_asal: opt?.value ?? '' }))} />
                                </FormItem>
                                <FormItem label="Tujuan">
                                    <Select<Option> isClearable isSearchable placeholder="Pilih lokasi tujuan..."
                                        options={lokasiOptions}
                                        value={lokasiOptions.find(o => o.value === formRute.id_lokasi_tujuan) ?? null}
                                        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                        onChange={opt => setFormRute(p => ({ ...p, id_lokasi_tujuan: opt?.value ?? '' }))} />
                                </FormItem>
                                <FormItem label="Estimasi Jarak (km)">
                                    <Input type="number" step="0.01" min="0" placeholder="Contoh: 750.5"
                                        value={formRute.estimasi_jarak_km}
                                        onChange={e => setFormRute(p => ({ ...p, estimasi_jarak_km: e.target.value }))} />
                                </FormItem>
                                <FormItem label="Estimasi Durasi (menit)">
                                    <Input type="number" min="0" placeholder="Contoh: 480"
                                        value={formRute.estimasi_durasi_menit}
                                        onChange={e => setFormRute(p => ({ ...p, estimasi_durasi_menit: e.target.value }))} />
                                </FormItem>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tarif Awal (opsional)</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{stagedTarif.length} tarif akan disimpan & jadi item penawaran</p>
                                    </div>
                                    <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                        onClick={() => { setTarifDraft(TARIF_DRAFT_KOSONG); setShowTarifDraft(true) }}>
                                        Tambah Tarif
                                    </Button>
                                </div>

                                {showTarifDraft && (
                                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                            <FormItem label="Jenis Kendaraan">
                                                <Select<Option> isSearchable placeholder="Pilih jenis..."
                                                    options={jenisOptions}
                                                    value={jenisOptions.find(o => o.value === tarifDraft.id_jenis_kendaraan) ?? null}
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                    onChange={opt => setTarifDraft(p => ({ ...p, id_jenis_kendaraan: opt?.value ?? '', namaJenis: opt?.label ?? '' }))} />
                                            </FormItem>
                                            <FormItem label="Harga per Trip">
                                                <Input prefix="Rp" placeholder="0"
                                                    value={tarifDraft.hargaStr ? formatNum(Number(tarifDraft.hargaStr)) : ''}
                                                    onChange={e => setTarifDraft(p => ({ ...p, hargaStr: e.target.value.replace(/\D/g, '') }))} />
                                            </FormItem>
                                        </div>
                                        {idKlien && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <Checkbox
                                                    checked={tarifDraft.khususKlien}
                                                    onChange={() => setTarifDraft(p => ({ ...p, khususKlien: !p.khususKlien }))}
                                                />
                                                <span className="text-sm">
                                                    Tarif khusus klien: <span className="font-semibold">{namaKlien ?? ''}</span>
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" size="sm" variant="plain" onClick={() => setShowTarifDraft(false)}>Batal</Button>
                                            <Button type="button" size="sm" variant="solid"
                                                disabled={!tarifDraft.id_jenis_kendaraan || !tarifDraft.hargaStr}
                                                onClick={tambahKeDaftarTarif}>
                                                Tambah ke daftar
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {stagedTarif.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-blue-50 dark:bg-blue-500/10">
                                                <tr className="text-left text-gray-600 dark:text-gray-300">
                                                    <th className="px-2 py-1.5 font-semibold">Jenis Kendaraan</th>
                                                    <th className="px-2 py-1.5 font-semibold">Harga</th>
                                                    <th className="px-2 py-1.5 font-semibold">Berlaku Untuk</th>
                                                    <th className="px-2 py-1.5 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stagedTarif.map((t, i) => (
                                                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                                        <td className="px-2 py-2 font-medium text-gray-800 dark:text-gray-200">{t.namaJenis}</td>
                                                        <td className="px-2 py-2">{formatRupiah(Number(t.hargaStr))}</td>
                                                        <td className="px-2 py-2">
                                                            <Tag className={t.khususKlien ? TAG_KLIEN : TAG_UMUM}>
                                                                {t.khususKlien ? (namaKlien ?? 'Khusus klien') : 'Umum'}
                                                            </Tag>
                                                        </td>
                                                        <td className="px-2 py-2 text-right">
                                                            <span
                                                                className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                                onClick={() => setStagedTarif(prev => prev.filter((_, idx) => idx !== i))}
                                                            >
                                                                <HiOutlineTrash />
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" onClick={() => setTampilan('daftar')}>Kembali</Button>
                            <Button type="submit" variant="solid" loading={menyimpanRute}>Simpan Rute</Button>
                        </div>
                    </form>
                </>
            )}
        </Dialog>
    )
}
