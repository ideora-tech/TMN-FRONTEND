'use client'
import { useEffect, useState } from 'react'
import { FormItem, Input, Button } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi'
import dayjs from 'dayjs'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { tarifRuteService, TarifRutePayload, EstimasiBok } from '@/services/tarifRute.service'

export type TarifFieldsState = {
    id_jenis_kendaraan: string
    id_klien: string
    harga: string
    tanggal_mulai: string
    tanggal_berakhir: string
    estimasi_tol: string
    estimasi_bbm: string
    estimasi_uang_jalan: string
    estimasi_biaya_lain: string
    keterangan: string
}

export const EMPTY_TARIF_FIELDS_STATE: TarifFieldsState = {
    id_jenis_kendaraan: '',
    id_klien: '',
    harga: '',
    tanggal_mulai: dayjs().format('YYYY-MM-DD'),
    tanggal_berakhir: '',
    estimasi_tol: '',
    estimasi_bbm: '',
    estimasi_uang_jalan: '',
    estimasi_biaya_lain: '',
    keterangan: '',
}

type Option = { value: string; label: string }

type Props = {
    value: TarifFieldsState
    onChange: (next: TarifFieldsState) => void
    jenisOptions: Option[]
    klienOptions: Option[]
    idRute: string | null
}

export default function TarifFields({ value, onChange, jenisOptions, klienOptions, idRute }: Props) {
    const [showRincian, setShowRincian] = useState(false)
    const [estimasi, setEstimasi] = useState<EstimasiBok | null>(null)

    const set = (patch: Partial<TarifFieldsState>) => onChange({ ...value, ...patch })

    // Panel Estimasi Keuangan (BOK) — murni referensi, tidak memblokir simpan.
    // Butuh idRute nyata (rute sudah tersimpan) — saat staging di form Tambah Rute
    // (idRute masih null), panel ini otomatis tidak tampil sama sekali.
    useEffect(() => {
        if (!idRute || !value.id_jenis_kendaraan) { setEstimasi(null); return }
        let aktif = true
        tarifRuteService.estimasiBok({
            id_rute: idRute,
            id_jenis_kendaraan: value.id_jenis_kendaraan,
            estimasi_tol: value.estimasi_tol ? Number(value.estimasi_tol) : undefined,
        })
            .then(est => { if (aktif) setEstimasi(est) })
            .catch(() => { if (aktif) setEstimasi(null) })
        return () => { aktif = false }
    }, [idRute, value.id_jenis_kendaraan, value.estimasi_tol])

    const hargaInput = value.harga ? Number(value.harga) : 0
    const marginAktual = estimasi && estimasi.harga_pokok > 0 && hargaInput > 0
        ? ((hargaInput - estimasi.harga_pokok) / estimasi.harga_pokok) * 100
        : null

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <FormItem label="Jenis Kendaraan" asterisk>
                    <Select<Option> isSearchable placeholder="Pilih jenis kendaraan..."
                        options={jenisOptions}
                        value={jenisOptions.find(o => o.value === value.id_jenis_kendaraan) ?? null}
                        onChange={opt => set({ id_jenis_kendaraan: opt?.value ?? '' })} />
                </FormItem>
                <FormItem label="Klien">
                    <Select<Option> isClearable isSearchable placeholder="Harga umum (semua klien)"
                        options={klienOptions}
                        value={klienOptions.find(o => o.value === value.id_klien) ?? null}
                        onChange={opt => set({ id_klien: opt?.value ?? '' })} />
                </FormItem>
                <FormItem label="Harga per Trip" asterisk>
                    <Input prefix="Rp" placeholder="0"
                        value={value.harga ? formatNum(Number(value.harga)) : ''}
                        onChange={e => set({ harga: e.target.value.replace(/\D/g, '') })} />
                </FormItem>
                <FormItem label="Tanggal Mulai" asterisk>
                    <DatePicker inputFormat="DD/MM/YYYY"
                        value={value.tanggal_mulai ? dayjs(value.tanggal_mulai).toDate() : null}
                        onChange={date => set({ tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                </FormItem>
                <FormItem label="Tanggal Berakhir">
                    <DatePicker inputFormat="DD/MM/YYYY"
                        value={value.tanggal_berakhir ? dayjs(value.tanggal_berakhir).toDate() : null}
                        onChange={date => set({ tanggal_berakhir: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                </FormItem>
            </div>

            <button type="button"
                className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2"
                onClick={() => setShowRincian(v => !v)}>
                {showRincian ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                Detail biaya (opsional)
            </button>
            {showRincian && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <FormItem label="Estimasi Tol">
                        <Input prefix="Rp" placeholder="0"
                            value={value.estimasi_tol ? formatNum(Number(value.estimasi_tol)) : ''}
                            onChange={e => set({ estimasi_tol: e.target.value.replace(/\D/g, '') })} />
                    </FormItem>
                    <FormItem label="Estimasi BBM">
                        <Input prefix="Rp" placeholder="0"
                            value={value.estimasi_bbm ? formatNum(Number(value.estimasi_bbm)) : ''}
                            onChange={e => set({ estimasi_bbm: e.target.value.replace(/\D/g, '') })} />
                    </FormItem>
                    <FormItem label="Estimasi Uang Jalan">
                        <Input prefix="Rp" placeholder="0"
                            value={value.estimasi_uang_jalan ? formatNum(Number(value.estimasi_uang_jalan)) : ''}
                            onChange={e => set({ estimasi_uang_jalan: e.target.value.replace(/\D/g, '') })} />
                    </FormItem>
                    <FormItem label="Estimasi Biaya Lain">
                        <Input prefix="Rp" placeholder="0"
                            value={value.estimasi_biaya_lain ? formatNum(Number(value.estimasi_biaya_lain)) : ''}
                            onChange={e => set({ estimasi_biaya_lain: e.target.value.replace(/\D/g, '') })} />
                    </FormItem>
                </div>
            )}

            {idRute && value.id_jenis_kendaraan && (
                <div className="mt-5 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 p-4">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-3">Estimasi Keuangan (BOK)</p>
                    {estimasi ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">BOK per Km</p>
                                    <p className="text-sm font-semibold">{formatRupiah(estimasi.bok_per_km)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">Harga Pokok</p>
                                    <p className="text-sm font-semibold">{formatRupiah(estimasi.harga_pokok)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">Saran Harga (+{formatNum(estimasi.margin_persen_default, 1)}%)</p>
                                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(estimasi.saran_harga)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">Margin Harga Anda</p>
                                    <p className={`text-sm font-semibold ${
                                        marginAktual === null ? 'text-gray-400'
                                        : marginAktual < 0 ? 'text-red-500'
                                        : marginAktual < estimasi.margin_persen_default ? 'text-amber-500'
                                        : 'text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                        {marginAktual !== null ? `${formatNum(marginAktual, 1)}%` : '—'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-xs text-gray-400">
                                    Jarak {formatNum(estimasi.komponen.jarak_km, 1)} km · BBM {formatRupiah(estimasi.komponen.harga_bbm_per_liter)}/L ÷ {formatNum(estimasi.komponen.konsumsi_km_per_liter, 1)} km/L · referensi saja, tidak mengunci harga
                                </p>
                                <Button type="button" size="sm" onClick={() => set({ harga: String(Math.round(estimasi.saran_harga)) })}>
                                    Pakai Saran Harga
                                </Button>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400">
                            Estimasi belum tersedia — lengkapi Parameter BOK jenis kendaraan ini, harga BBM, dan estimasi jarak pada rute. Form tetap bisa disimpan.
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 mt-3">
                <FormItem label="Keterangan">
                    <Input textArea rows={3} placeholder="Catatan tambahan (opsional)"
                        value={value.keterangan} onChange={e => set({ keterangan: e.target.value })} />
                </FormItem>
            </div>
        </div>
    )
}

export function tarifFieldsToPayload(state: TarifFieldsState, idRute: string): TarifRutePayload {
    return {
        id_rute: idRute,
        id_jenis_kendaraan: state.id_jenis_kendaraan,
        id_klien: state.id_klien || null,
        harga: Number(state.harga),
        tanggal_mulai: state.tanggal_mulai,
        tanggal_berakhir: state.tanggal_berakhir || null,
        estimasi_tol: state.estimasi_tol ? Number(state.estimasi_tol) : null,
        estimasi_bbm: state.estimasi_bbm ? Number(state.estimasi_bbm) : null,
        estimasi_uang_jalan: state.estimasi_uang_jalan ? Number(state.estimasi_uang_jalan) : null,
        estimasi_biaya_lain: state.estimasi_biaya_lain ? Number(state.estimasi_biaya_lain) : null,
        keterangan: state.keterangan.trim() || null,
    }
}
