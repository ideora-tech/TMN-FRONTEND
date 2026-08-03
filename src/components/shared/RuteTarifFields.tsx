'use client'
import { useState } from 'react'
import { FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import { HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi'
import dayjs from 'dayjs'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { tarifRuteService, TarifRutePayload } from '@/services/tarifRute.service'
import { parseApiError } from '@/utils/error.util'

export type TarifBaruForm = {
    harga: string
    tanggal_mulai: string
    tanggal_berakhir: string
    estimasi_tol: string
    estimasi_bbm: string
    estimasi_uang_jalan: string
    estimasi_biaya_lain: string
    keterangan: string
}

export type DetailBiayaForm = {
    estimasi_tol: string
    estimasi_bbm: string
    estimasi_uang_jalan: string
    estimasi_biaya_lain: string
    tanggal_berakhir: string
    keterangan: string
}

export type RuteTarifState = {
    id_rute: string
    id_jenis_kendaraan: string
    id_tarif_rute: string | null
    harga_penawaran: string
    estimasiBiaya: number | null
    tarifBaru: TarifBaruForm | null
    detailBiaya: DetailBiayaForm | null
}

export const EMPTY_TARIF_BARU_FORM: TarifBaruForm = {
    harga: '',
    tanggal_mulai: dayjs().format('YYYY-MM-DD'),
    tanggal_berakhir: '',
    estimasi_tol: '',
    estimasi_bbm: '',
    estimasi_uang_jalan: '',
    estimasi_biaya_lain: '',
    keterangan: '',
}

export const EMPTY_RUTE_TARIF_STATE: RuteTarifState = {
    id_rute: '',
    id_jenis_kendaraan: '',
    id_tarif_rute: null,
    harga_penawaran: '',
    estimasiBiaya: null,
    tarifBaru: null,
    detailBiaya: null,
}

type Option = { value: string; label: string }

export type RuteOption = {
    value: string
    label: string
    asal: string | null
    tujuan: string | null
    estimasi_jarak_km: number | null
    estimasi_durasi_menit: number | null
}

type Props = {
    value: RuteTarifState
    onChange: (next: RuteTarifState) => void
    ruteOptions: RuteOption[]
    jenisOptions: Option[]
    idKlien: string
}

function formatDurasi(menit: number): string {
    if (menit < 60) return `${menit} menit`
    const jam = Math.floor(menit / 60)
    const sisa = menit % 60
    return sisa > 0 ? `${jam} jam ${sisa} menit` : `${jam} jam`
}

export default function RuteTarifFields({ value, onChange, ruteOptions, jenisOptions, idKlien }: Props) {
    const [showDetailBiaya, setShowDetailBiaya] = useState(false)
    const ruteTerpilih = ruteOptions.find(o => o.value === value.id_rute)
    const adaDetailRute = !!ruteTerpilih && (
        (!!ruteTerpilih.asal && !!ruteTerpilih.tujuan)
        || ruteTerpilih.estimasi_jarak_km != null
        || ruteTerpilih.estimasi_durasi_menit != null
    )

    const resolve = async (idRute: string, idJenis: string) => {
        if (!idRute || !idJenis) {
            onChange({ ...EMPTY_RUTE_TARIF_STATE, id_rute: idRute, id_jenis_kendaraan: idJenis })
            return
        }
        try {
            const tarif = await tarifRuteService.resolusi({ id_rute: idRute, id_jenis_kendaraan: idJenis, id_klien: idKlien || undefined })
            if (tarif) {
                const komponen = [tarif.estimasi_tol, tarif.estimasi_bbm, tarif.estimasi_uang_jalan, tarif.estimasi_biaya_lain]
                const estimasi = komponen.every(k => k == null) ? null : komponen.reduce((s: number, k) => s + (k ?? 0), 0)
                onChange({
                    id_rute: idRute,
                    id_jenis_kendaraan: idJenis,
                    id_tarif_rute: tarif.id_tarif_rute,
                    harga_penawaran: String(tarif.harga),
                    estimasiBiaya: estimasi,
                    tarifBaru: null,
                    detailBiaya: {
                        estimasi_tol: tarif.estimasi_tol != null ? String(tarif.estimasi_tol) : '',
                        estimasi_bbm: tarif.estimasi_bbm != null ? String(tarif.estimasi_bbm) : '',
                        estimasi_uang_jalan: tarif.estimasi_uang_jalan != null ? String(tarif.estimasi_uang_jalan) : '',
                        estimasi_biaya_lain: tarif.estimasi_biaya_lain != null ? String(tarif.estimasi_biaya_lain) : '',
                        tanggal_berakhir: tarif.tanggal_berakhir ?? '',
                        keterangan: tarif.keterangan ?? '',
                    },
                })
            } else {
                onChange({
                    id_rute: idRute,
                    id_jenis_kendaraan: idJenis,
                    id_tarif_rute: null,
                    harga_penawaran: '',
                    estimasiBiaya: null,
                    tarifBaru: EMPTY_TARIF_BARU_FORM,
                    detailBiaya: null,
                })
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            onChange({
                id_rute: idRute,
                id_jenis_kendaraan: idJenis,
                id_tarif_rute: null,
                harga_penawaran: '',
                estimasiBiaya: null,
                tarifBaru: null,
                detailBiaya: null,
            })
        }
    }

    const setTarifBaru = (patch: Partial<TarifBaruForm>) => {
        if (!value.tarifBaru) return
        onChange({ ...value, tarifBaru: { ...value.tarifBaru, ...patch } })
    }

    const setDetailBiaya = (patch: Partial<DetailBiayaForm>) => {
        if (!value.detailBiaya) return
        onChange({ ...value, detailBiaya: { ...value.detailBiaya, ...patch } })
    }

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <FormItem label="Rute" asterisk>
                    <Select<Option> placeholder="Pilih rute..." options={ruteOptions}
                        value={ruteOptions.find(o => o.value === value.id_rute) ?? null}
                        onChange={opt => resolve(opt?.value ?? '', value.id_jenis_kendaraan)} />
                </FormItem>
                <FormItem label="Jenis Kendaraan" asterisk>
                    <Select<Option> placeholder="Pilih jenis kendaraan..." options={jenisOptions}
                        value={jenisOptions.find(o => o.value === value.id_jenis_kendaraan) ?? null}
                        onChange={opt => resolve(value.id_rute, opt?.value ?? '')} />
                </FormItem>
            </div>

            {adaDetailRute && ruteTerpilih && (
                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
                    {ruteTerpilih.asal && ruteTerpilih.tujuan && (
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Lokasi Asal → Tujuan</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
                                {ruteTerpilih.asal} <span className="text-blue-500 mx-1">→</span> {ruteTerpilih.tujuan}
                            </p>
                        </div>
                    )}
                    {ruteTerpilih.estimasi_jarak_km != null && (
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Jarak</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{formatNum(ruteTerpilih.estimasi_jarak_km)} km</p>
                        </div>
                    )}
                    {ruteTerpilih.estimasi_durasi_menit != null && (
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Estimasi Waktu</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">{formatDurasi(ruteTerpilih.estimasi_durasi_menit)}</p>
                        </div>
                    )}
                </div>
            )}

            {value.id_rute && value.id_jenis_kendaraan && value.tarifBaru === null && (
                <div className="mt-2">
                    <p className="text-xs text-gray-400">
                        Tarif ditemukan{value.estimasiBiaya != null ? ` — estimasi biaya ${formatRupiah(value.estimasiBiaya)}` : ''}
                    </p>
                    <FormItem label="Harga Penawaran" asterisk className="mt-1">
                        <Input prefix="Rp" placeholder="0"
                            value={value.harga_penawaran ? formatNum(Number(value.harga_penawaran)) : ''}
                            onChange={e => onChange({ ...value, harga_penawaran: e.target.value.replace(/\D/g, '') })} />
                    </FormItem>

                    {value.detailBiaya && (
                        <>
                            <button type="button"
                                className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2"
                                onClick={() => setShowDetailBiaya(s => !s)}>
                                {showDetailBiaya ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                                Uang Jalan (opsional)
                            </button>
                            {showDetailBiaya && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-400 sm:col-span-2 -mt-1 mb-1">
                                        Mengubah uang jalan di sini akan memperbarui tarif ini untuk semua proyek/penawaran lain yang memakainya.
                                    </p>
                                    <FormItem label="Estimasi Tol">
                                        <Input prefix="Rp" placeholder="0"
                                            value={value.detailBiaya.estimasi_tol ? formatNum(Number(value.detailBiaya.estimasi_tol)) : ''}
                                            onChange={e => setDetailBiaya({ estimasi_tol: e.target.value.replace(/\D/g, '') })} />
                                    </FormItem>
                                    <FormItem label="Estimasi BBM">
                                        <Input prefix="Rp" placeholder="0"
                                            value={value.detailBiaya.estimasi_bbm ? formatNum(Number(value.detailBiaya.estimasi_bbm)) : ''}
                                            onChange={e => setDetailBiaya({ estimasi_bbm: e.target.value.replace(/\D/g, '') })} />
                                    </FormItem>
                                    <FormItem label="Estimasi Uang Jalan">
                                        <Input prefix="Rp" placeholder="0"
                                            value={value.detailBiaya.estimasi_uang_jalan ? formatNum(Number(value.detailBiaya.estimasi_uang_jalan)) : ''}
                                            onChange={e => setDetailBiaya({ estimasi_uang_jalan: e.target.value.replace(/\D/g, '') })} />
                                    </FormItem>
                                    <FormItem label="Estimasi Biaya Lain">
                                        <Input prefix="Rp" placeholder="0"
                                            value={value.detailBiaya.estimasi_biaya_lain ? formatNum(Number(value.detailBiaya.estimasi_biaya_lain)) : ''}
                                            onChange={e => setDetailBiaya({ estimasi_biaya_lain: e.target.value.replace(/\D/g, '') })} />
                                    </FormItem>
                                    <FormItem label="Tanggal Berakhir">
                                        <DatePicker inputFormat="DD/MM/YYYY"
                                            value={value.detailBiaya.tanggal_berakhir ? dayjs(value.detailBiaya.tanggal_berakhir).toDate() : null}
                                            onChange={date => setDetailBiaya({ tanggal_berakhir: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                                    </FormItem>
                                    <div className="sm:col-span-2">
                                        <FormItem label="Keterangan Tarif">
                                            <Input textArea value={value.detailBiaya.keterangan}
                                                onChange={e => setDetailBiaya({ keterangan: e.target.value })} />
                                        </FormItem>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {value.tarifBaru !== null && (
                <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs text-amber-500 mb-2">Tarif belum tersedia untuk kombinasi ini — isi untuk membuat tarif baru</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        <FormItem label="Harga Penawaran" asterisk>
                            <Input prefix="Rp" placeholder="0"
                                value={value.tarifBaru.harga ? formatNum(Number(value.tarifBaru.harga)) : ''}
                                onChange={e => setTarifBaru({ harga: e.target.value.replace(/\D/g, '') })} />
                        </FormItem>
                        <FormItem label="Tanggal Mulai" asterisk>
                            <DatePicker inputFormat="DD/MM/YYYY"
                                value={value.tarifBaru.tanggal_mulai ? dayjs(value.tarifBaru.tanggal_mulai).toDate() : null}
                                onChange={date => setTarifBaru({ tanggal_mulai: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                        </FormItem>
                    </div>

                    <button type="button"
                        className="flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-2"
                        onClick={() => setShowDetailBiaya(s => !s)}>
                        {showDetailBiaya ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                        Uang Jalan (opsional)
                    </button>
                    {showDetailBiaya && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                            <FormItem label="Estimasi Tol">
                                <Input prefix="Rp" placeholder="0"
                                    value={value.tarifBaru.estimasi_tol ? formatNum(Number(value.tarifBaru.estimasi_tol)) : ''}
                                    onChange={e => setTarifBaru({ estimasi_tol: e.target.value.replace(/\D/g, '') })} />
                            </FormItem>
                            <FormItem label="Estimasi BBM">
                                <Input prefix="Rp" placeholder="0"
                                    value={value.tarifBaru.estimasi_bbm ? formatNum(Number(value.tarifBaru.estimasi_bbm)) : ''}
                                    onChange={e => setTarifBaru({ estimasi_bbm: e.target.value.replace(/\D/g, '') })} />
                            </FormItem>
                            <FormItem label="Estimasi Uang Jalan">
                                <Input prefix="Rp" placeholder="0"
                                    value={value.tarifBaru.estimasi_uang_jalan ? formatNum(Number(value.tarifBaru.estimasi_uang_jalan)) : ''}
                                    onChange={e => setTarifBaru({ estimasi_uang_jalan: e.target.value.replace(/\D/g, '') })} />
                            </FormItem>
                            <FormItem label="Estimasi Biaya Lain">
                                <Input prefix="Rp" placeholder="0"
                                    value={value.tarifBaru.estimasi_biaya_lain ? formatNum(Number(value.tarifBaru.estimasi_biaya_lain)) : ''}
                                    onChange={e => setTarifBaru({ estimasi_biaya_lain: e.target.value.replace(/\D/g, '') })} />
                            </FormItem>
                            <FormItem label="Tanggal Berakhir">
                                <DatePicker inputFormat="DD/MM/YYYY"
                                    value={value.tarifBaru.tanggal_berakhir ? dayjs(value.tarifBaru.tanggal_berakhir).toDate() : null}
                                    onChange={date => setTarifBaru({ tanggal_berakhir: date ? dayjs(date).format('YYYY-MM-DD') : '' })} />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Keterangan Tarif">
                                    <Input textArea value={value.tarifBaru.keterangan}
                                        onChange={e => setTarifBaru({ keterangan: e.target.value })} />
                                </FormItem>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export async function resolveTarifId(state: RuteTarifState, idKlien: string): Promise<string | null> {
    if (state.id_tarif_rute) {
        if (state.detailBiaya) {
            await tarifRuteService.update(state.id_tarif_rute, {
                estimasi_tol: state.detailBiaya.estimasi_tol === '' ? null : Number(state.detailBiaya.estimasi_tol),
                estimasi_bbm: state.detailBiaya.estimasi_bbm === '' ? null : Number(state.detailBiaya.estimasi_bbm),
                estimasi_uang_jalan: state.detailBiaya.estimasi_uang_jalan === '' ? null : Number(state.detailBiaya.estimasi_uang_jalan),
                estimasi_biaya_lain: state.detailBiaya.estimasi_biaya_lain === '' ? null : Number(state.detailBiaya.estimasi_biaya_lain),
                tanggal_berakhir: state.detailBiaya.tanggal_berakhir || null,
                keterangan: state.detailBiaya.keterangan || null,
            })
        }
        return state.id_tarif_rute
    }
    if (!state.tarifBaru) return null

    const payload: TarifRutePayload = {
        id_rute: state.id_rute,
        id_jenis_kendaraan: state.id_jenis_kendaraan,
        id_klien: idKlien,
        harga: Number(state.tarifBaru.harga),
        tanggal_mulai: state.tarifBaru.tanggal_mulai,
        tanggal_berakhir: state.tarifBaru.tanggal_berakhir || null,
        estimasi_tol: state.tarifBaru.estimasi_tol === '' ? null : Number(state.tarifBaru.estimasi_tol),
        estimasi_bbm: state.tarifBaru.estimasi_bbm === '' ? null : Number(state.tarifBaru.estimasi_bbm),
        estimasi_uang_jalan: state.tarifBaru.estimasi_uang_jalan === '' ? null : Number(state.tarifBaru.estimasi_uang_jalan),
        estimasi_biaya_lain: state.tarifBaru.estimasi_biaya_lain === '' ? null : Number(state.tarifBaru.estimasi_biaya_lain),
        keterangan: state.tarifBaru.keterangan || null,
    }
    const created = await tarifRuteService.create(payload)
    return created.id_tarif_rute
}

export function hargaPenawaranEfektif(state: RuteTarifState): string {
    return state.tarifBaru ? state.tarifBaru.harga : state.harga_penawaran
}
