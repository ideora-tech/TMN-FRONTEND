'use client'
import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiArrowLeft, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineTrash, HiPlusCircle } from 'react-icons/hi'
import { PiTruckDuotone } from 'react-icons/pi'
import { intervalPerawatanService, IntervalPerawatan } from '@/services/intervalPerawatan.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { sparepartService, Sparepart } from '@/services/sparepart.service'
import { ROUTES } from '@/constants/route.constant'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'

type Option = { value: string; label: string }
type SparepartRow = { id_sparepart: string; qty_standar: string }
type BarisPaket = {
    key: number
    id: string | null
    label: string | null
    interval_km: string
    interval_bulan: string
    sparepart: SparepartRow[]
}

const MAKS_PAKET_BARU = 20
const MAKS_SPAREPART = 30
const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide'

let urutanBaris = 0
const barisDariPaket = (p: IntervalPerawatan): BarisPaket => ({
    key: ++urutanBaris,
    id: p.id_interval_perawatan,
    label: p.label,
    interval_km: p.interval_km != null ? String(p.interval_km) : '',
    interval_bulan: p.interval_bulan != null ? String(p.interval_bulan) : '',
    sparepart: (p.sparepart ?? []).map(sp => ({ id_sparepart: sp.id_sparepart, qty_standar: String(sp.qty_standar) })),
})
const barisKosong = (): BarisPaket => ({ key: ++urutanBaris, id: null, label: null, interval_km: '', interval_bulan: '', sparepart: [] })

const sidikBaris = (b: BarisPaket) =>
    JSON.stringify([b.interval_km, b.interval_bulan, b.sparepart.map(s => `${s.id_sparepart}:${s.qty_standar}`).sort()])

const urutPaket = (a: IntervalPerawatan, b: IntervalPerawatan) =>
    (a.interval_km ?? Infinity) - (b.interval_km ?? Infinity) || (a.interval_bulan ?? Infinity) - (b.interval_bulan ?? Infinity)

function galatBaris(b: BarisPaket): string | null {
    if (!b.interval_km && !b.interval_bulan) return 'Isi minimal interval kilometer atau interval bulan'
    if (b.interval_km && parseInt(b.interval_km) <= 0) return 'Interval kilometer harus lebih dari 0'
    if (b.interval_bulan && parseInt(b.interval_bulan) <= 0) return 'Interval bulan harus lebih dari 0'
    if (b.sparepart.some(s => !s.id_sparepart || !s.qty_standar || parseInt(s.qty_standar) <= 0)) {
        return 'Lengkapi spare part dan qty standar tiap baris (atau hapus baris kosong)'
    }
    return null
}

const payloadBaris = (b: BarisPaket) => ({
    interval_km: b.interval_km ? parseInt(b.interval_km) : null,
    interval_bulan: b.interval_bulan ? parseInt(b.interval_bulan) : null,
    sparepart: b.sparepart.map(s => ({ id_sparepart: s.id_sparepart, qty_standar: parseInt(s.qty_standar) })),
})

export default function IntervalPerawatanJenisPage({ params }: { params: Promise<{ idJenis: string }> }) {
    const { idJenis } = use(params)
    const router = useRouter()
    const [paket, setPaket]               = useState<IntervalPerawatan[]>([])
    const [loading, setLoading]           = useState(true)
    const [namaJenisMaster, setNamaJenisMaster] = useState<string | null>(null)
    const [sparepartList, setSparepartList] = useState<Sparepart[]>([])
    const [editing, setEditing]           = useState(false)
    const [baris, setBaris]               = useState<BarisPaket[]>([])
    const [sudahSubmit, setSudahSubmit]   = useState(false)
    const [saving, setSaving]             = useState(false)

    const bolehTambah = idJenis !== '-'

    const muat = useCallback(async () => {
        const res = await intervalPerawatanService.list({
            page: 1, limit: 500,
            ...(idJenis !== '-' ? { id_jenis_kendaraan: idJenis } : {}),
        })
        const milikGrup = res.data.filter(p => (p.id_jenis_kendaraan ?? '-') === idJenis).sort(urutPaket)
        setPaket(milikGrup)
        return milikGrup
    }, [idJenis])

    useEffect(() => {
        muat()
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
        sparepartService.list({ page: 1, limit: 200 })
            .then(res => setSparepartList(res.data.filter(s => s.aktif)))
            .catch(() => {})
        if (idJenis !== '-') {
            jenisKendaraanService.list(1, 100)
                .then(res => setNamaJenisMaster(res.data.find((j: JenisKendaraan) => j.id_jenis_kendaraan === idJenis)?.nama_jenis ?? null))
                .catch(() => {})
        }
    }, [idJenis, muat])

    const namaJenis = paket[0]?.nama_jenis_kendaraan ?? namaJenisMaster ?? 'Tanpa jenis kendaraan'
    const sparepartOptions: Option[] = sparepartList.map(s => ({ value: s.id_sparepart, label: `${s.nama} (${s.satuan})` }))
    const sidikAsal = new Map(paket.map(p => [p.id_interval_perawatan, sidikBaris(barisDariPaket(p))]))
    const jumlahBaru = baris.filter(b => !b.id).length

    const mulaiEdit = () => {
        setBaris(paket.map(barisDariPaket))
        setSudahSubmit(false)
        setEditing(true)
    }

    const ubahBaris = (idx: number, patch: Partial<BarisPaket>) =>
        setBaris(prev => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)))
    const tambahBaris = () => setBaris(prev => (prev.filter(b => !b.id).length >= MAKS_PAKET_BARU ? prev : [...prev, barisKosong()]))
    const hapusBaris = (idx: number) => setBaris(prev => prev.filter((_, i) => i !== idx))

    const ubahSparepart = (idx: number, sIdx: number, patch: Partial<SparepartRow>) =>
        setBaris(prev => prev.map((b, i) => (i === idx
            ? { ...b, sparepart: b.sparepart.map((s, j) => (j === sIdx ? { ...s, ...patch } : s)) }
            : b)))
    const tambahSparepart = (idx: number) =>
        setBaris(prev => prev.map((b, i) => (i === idx && b.sparepart.length < MAKS_SPAREPART
            ? { ...b, sparepart: [...b.sparepart, { id_sparepart: '', qty_standar: '1' }] }
            : b)))
    const hapusSparepart = (idx: number, sIdx: number) =>
        setBaris(prev => prev.map((b, i) => (i === idx ? { ...b, sparepart: b.sparepart.filter((_, j) => j !== sIdx) } : b)))

    const handleSimpan = async () => {
        setSudahSubmit(true)
        const kunciInterval = baris.map(b => `${b.interval_km || '-'}|${b.interval_bulan || '-'}`)
        const dobel = kunciInterval.some((k, i) => kunciInterval.indexOf(k) !== i)
        if (baris.some(b => galatBaris(b) !== null) || dobel) {
            toast.push(<Notification type="danger" title={dobel
                ? 'Ada paket servis dengan interval yang sama — setiap paket harus berbeda'
                : 'Periksa kembali data yang belum lengkap'} />)
            return
        }

        const diubah = baris.filter(b => b.id && sidikAsal.get(b.id) !== sidikBaris(b))
        const baru = baris.filter(b => !b.id)
        if (diubah.length === 0 && baru.length === 0) {
            setEditing(false)
            return
        }

        setSaving(true)
        const pesanGagal: string[] = []
        const gagalUbah = new Map<string, BarisPaket>()
        const gagalBaru: BarisPaket[] = []
        let jumlahDiubah = 0
        let jumlahDitambah = 0

        for (const b of diubah) {
            if (!b.id) continue
            try {
                await intervalPerawatanService.update(b.id, payloadBaris(b))
                jumlahDiubah++
            } catch (err) {
                gagalUbah.set(b.id, b)
                pesanGagal.push(`${b.label ?? 'Paket'}: ${parseApiError(err)}`)
            }
        }
        for (const b of baru) {
            try {
                await intervalPerawatanService.create({ id_jenis_kendaraan: idJenis, ...payloadBaris(b) })
                jumlahDitambah++
            } catch (err) {
                gagalBaru.push(b)
                pesanGagal.push(`Paket baru: ${parseApiError(err)}`)
            }
        }

        const segar = await muat().catch(() => paket)
        setSaving(false)

        const ringkasan = [
            jumlahDiubah > 0 ? `${jumlahDiubah} paket diperbarui` : null,
            jumlahDitambah > 0 ? `${jumlahDitambah} paket ditambahkan` : null,
        ].filter(Boolean).join(' · ')
        if (ringkasan) toast.push(<Notification type="success" title={ringkasan} />)

        if (pesanGagal.length > 0) {
            toast.push(<Notification type="danger" title={`${pesanGagal.length} paket gagal disimpan`}>{pesanGagal[0]}</Notification>)
            setBaris([
                ...segar.map(p => gagalUbah.get(p.id_interval_perawatan) ?? barisDariPaket(p)),
                ...gagalBaru,
            ])
            return
        }
        setEditing(false)
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h4 className="font-bold">{editing ? 'Ubah Paket Servis' : 'Detail Paket Servis'}</h4>
                    <p className="text-sm text-gray-500 mt-0.5">Paket servis rutin (interval km/bulan + sparepart) untuk satu jenis kendaraan</p>
                </div>
            </div>

            <Card>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 flex-shrink-0">
                            <PiTruckDuotone className="text-2xl" />
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-100">{namaJenis}</p>
                            <Tag className="mt-1 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                                {editing ? baris.length : paket.length} paket servis
                            </Tag>
                        </div>
                    </div>
                    {!editing && (
                        <Tooltip title="Edit">
                            <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={mulaiEdit} />
                        </Tooltip>
                    )}
                </div>

                {!editing ? (
                    <>
                        <div className="my-5 border-t border-gray-100 dark:border-gray-700" />
                        {paket.length === 0 ? (
                            <p className="text-gray-400 text-sm py-6 text-center">Belum ada paket servis untuk jenis kendaraan ini</p>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {paket.map((p, idx) => (
                                    <div key={p.id_interval_perawatan} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-3">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                <span className="text-gray-400 font-medium mr-1.5">{idx + 1}.</span>{p.label}
                                            </p>
                                            <span className="text-xs text-gray-500">
                                                Interval km: <span className="font-medium text-gray-700 dark:text-gray-200">{p.interval_km != null ? `${formatNum(p.interval_km)} km` : '—'}</span>
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Interval bulan: <span className="font-medium text-gray-700 dark:text-gray-200">{p.interval_bulan != null ? `${formatNum(p.interval_bulan)} bulan` : '—'}</span>
                                            </span>
                                        </div>
                                        {(p.sparepart ?? []).length === 0 ? (
                                            <p className="text-gray-400 text-xs">Tanpa spare part.</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                                            <th className={TH_CLASS}>Nama Sparepart</th>
                                                            <th className={TH_CLASS}>Qty Standar</th>
                                                            <th className={TH_CLASS}>Satuan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {p.sparepart.map((sp, sIdx) => (
                                                            <tr key={sIdx}>
                                                                <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">{sp.nama_sparepart ?? '—'}</td>
                                                                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{formatNum(sp.qty_standar)}</td>
                                                                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{sp.satuan_sparepart ?? '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="default" icon={<HiArrowLeft />}
                                onClick={() => router.push(ROUTES.INTERVAL_PERAWATAN)}>Batal</Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                    Daftar Paket Servis ({baris.length})
                                </p>
                                {bolehTambah && (
                                    <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                                        disabled={jumlahBaru >= MAKS_PAKET_BARU} onClick={tambahBaris}>Tambah Paket</Button>
                                )}
                            </div>

                            {baris.length === 0 ? (
                                <p className="text-gray-400 text-sm py-6 text-center">Belum ada paket servis — klik Tambah Paket</p>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {baris.map((b, idx) => {
                                        const galat = sudahSubmit ? galatBaris(b) : null
                                        const diubah = !!b.id && sidikAsal.get(b.id) !== sidikBaris(b)
                                        return (
                                            <div key={b.key} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Paket {idx + 1}</p>
                                                        {b.id ? (
                                                            <>
                                                                <span className="text-xs text-gray-400">{b.label}</span>
                                                                {diubah && (
                                                                    <Tag className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Diubah</Tag>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <Tag className="text-xs bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">Baru</Tag>
                                                        )}
                                                    </div>
                                                    {!b.id && (
                                                        <Tooltip title="Hapus">
                                                            <span
                                                                className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
                                                                onClick={() => hapusBaris(idx)}>
                                                                <HiOutlineTrash className="text-base" />
                                                            </span>
                                                        </Tooltip>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                                    <FormItem label="Interval Kilometer (opsional)" invalid={!!galat}>
                                                        <Input type="number" step="1" min="1" suffix="km" placeholder="Contoh: 10000"
                                                            value={b.interval_km} invalid={!!galat}
                                                            onChange={e => ubahBaris(idx, { interval_km: e.target.value.replace(/\D/g, '') })} />
                                                    </FormItem>
                                                    <FormItem label="Interval Bulan (opsional)" invalid={!!galat}>
                                                        <Input type="number" step="1" min="1" suffix="bulan" placeholder="Contoh: 6"
                                                            value={b.interval_bulan} invalid={!!galat}
                                                            onChange={e => ubahBaris(idx, { interval_bulan: e.target.value.replace(/\D/g, '') })} />
                                                    </FormItem>
                                                </div>
                                                {galat && <p className="text-red-500 text-xs -mt-1 mb-2">{galat}</p>}

                                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-2 mb-2">Sparepart yang Diganti (opsional)</p>
                                                {b.sparepart.length === 0 ? (
                                                    <p className="text-gray-400 text-xs py-1">Belum ada spare part ditambahkan.</p>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        {b.sparepart.map((s, sIdx) => {
                                                            const opsi = sparepartOptions.filter(o =>
                                                                o.value === s.id_sparepart || !b.sparepart.some((r, j) => j !== sIdx && r.id_sparepart === o.value))
                                                            return (
                                                                <div key={sIdx} className="flex items-start gap-2">
                                                                    <div className="flex-1 min-w-0">
                                                                        <Select<Option> isSearchable placeholder="Pilih spare part..."
                                                                            options={opsi}
                                                                            value={opsi.find(o => o.value === s.id_sparepart) ?? null}
                                                                            onChange={opt => ubahSparepart(idx, sIdx, { id_sparepart: opt?.value ?? '' })} />
                                                                    </div>
                                                                    <div className="w-28 flex-shrink-0">
                                                                        <Input type="number" min="1" suffix="qty" placeholder="1"
                                                                            value={s.qty_standar}
                                                                            onChange={e => ubahSparepart(idx, sIdx, { qty_standar: e.target.value.replace(/\D/g, '') })} />
                                                                    </div>
                                                                    <button type="button" onClick={() => hapusSparepart(idx, sIdx)}
                                                                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors flex-shrink-0">
                                                                        <HiOutlineTrash />
                                                                    </button>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                                <button type="button" disabled={b.sparepart.length >= MAKS_SPAREPART} onClick={() => tambahSparepart(idx)}
                                                    className="mt-2 inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                                                    <HiOutlinePlus /> Tambah Sparepart
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="plain" disabled={saving} onClick={() => setEditing(false)}>Batal</Button>
                            <Button type="button" variant="solid" loading={saving} onClick={handleSimpan}>Simpan Perubahan</Button>
                        </div>
                    </>
                )}
            </Card>
        </div>
    )
}
