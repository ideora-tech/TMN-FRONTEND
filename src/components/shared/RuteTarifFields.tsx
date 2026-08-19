'use client'
import { useState } from 'react'
import { Button, FormItem, Input } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiPlusCircle } from 'react-icons/hi'
import { formatNum } from '@/utils/formatNumber'
import { ProyekRute, ProyekRutePayload } from '@/services/proyekRute.service'
import { Rute } from '@/services/rute.service'
import RuteBaruDialog from '@/components/shared/RuteBaruDialog'

export type RuteTarifState = {
    id_rute: string
    id_jenis_kendaraan: string
    harga_penawaran: string
    estimasi_ritase: string
    uang_jalan: string
    estimasi_tol: string
    estimasi_bbm: string
    estimasi_biaya_lain: string
    keterangan: string
}

export const EMPTY_RUTE_TARIF_STATE: RuteTarifState = {
    id_rute: '',
    id_jenis_kendaraan: '',
    harga_penawaran: '',
    estimasi_ritase: '1',
    uang_jalan: '',
    estimasi_tol: '',
    estimasi_bbm: '',
    estimasi_biaya_lain: '',
    keterangan: '',
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
    onRuteCreated?: (rute: Rute) => void
    hargaTerkunci?: boolean
}

const JENIS_SEMUA: Option = { value: '', label: 'Semua jenis' }

function formatDurasi(menit: number): string {
    if (menit < 60) return `${menit} menit`
    const jam = Math.floor(menit / 60)
    const sisa = menit % 60
    return sisa > 0 ? `${jam} jam ${sisa} menit` : `${jam} jam`
}

function angka(v: string): string {
    return v.replace(/\D/g, '')
}

export default function RuteTarifFields({ value, onChange, ruteOptions, jenisOptions, onRuteCreated, hargaTerkunci }: Props) {
    const [showRuteBaru, setShowRuteBaru] = useState(false)
    const ruteTerpilih = ruteOptions.find(o => o.value === value.id_rute)
    const adaDetailRute = !!ruteTerpilih && (
        (!!ruteTerpilih.asal && !!ruteTerpilih.tujuan)
        || ruteTerpilih.estimasi_jarak_km != null
        || ruteTerpilih.estimasi_durasi_menit != null
    )
    const jenisOptionsSemua = [JENIS_SEMUA, ...jenisOptions]

    const setField = (patch: Partial<RuteTarifState>) => onChange({ ...value, ...patch })

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <FormItem label="Rute" asterisk>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <Select<Option> placeholder="Pilih rute..." options={ruteOptions}
                                value={ruteOptions.find(o => o.value === value.id_rute) ?? null}
                                onChange={opt => setField({ id_rute: opt?.value ?? '' })} />
                        </div>
                        <Button type="button" size="sm" variant="default" icon={<HiPlusCircle />}
                            onClick={() => setShowRuteBaru(true)}>
                            Rute Baru
                        </Button>
                    </div>
                </FormItem>
                <FormItem label="Jenis Kendaraan">
                    <Select<Option> placeholder="Semua jenis" options={jenisOptionsSemua}
                        value={jenisOptionsSemua.find(o => o.value === value.id_jenis_kendaraan) ?? JENIS_SEMUA}
                        onChange={opt => setField({ id_jenis_kendaraan: opt?.value ?? '' })} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <FormItem label="Harga Penawaran">
                    <Input prefix="Rp" placeholder="0" disabled={hargaTerkunci}
                        value={value.harga_penawaran ? formatNum(Number(value.harga_penawaran)) : ''}
                        onChange={e => setField({ harga_penawaran: angka(e.target.value) })} />
                    {hargaTerkunci && (
                        <p className="text-xs text-amber-500 mt-1">Harga terkunci — ubah lewat penawaran revisi</p>
                    )}
                </FormItem>
                <FormItem label="Estimasi Ritase">
                    <Input type="number" min="1" disabled={hargaTerkunci}
                        value={value.estimasi_ritase}
                        onChange={e => setField({ estimasi_ritase: e.target.value })} />
                    {hargaTerkunci && (
                        <p className="text-xs text-amber-500 mt-1">Ritase terkunci — ubah lewat penawaran revisi</p>
                    )}
                </FormItem>
                <FormItem label="Uang Jalan">
                    <Input prefix="Rp" placeholder="0"
                        value={value.uang_jalan ? formatNum(Number(value.uang_jalan)) : ''}
                        onChange={e => setField({ uang_jalan: angka(e.target.value) })} />
                </FormItem>
                <FormItem label="Estimasi Tol">
                    <Input prefix="Rp" placeholder="0"
                        value={value.estimasi_tol ? formatNum(Number(value.estimasi_tol)) : ''}
                        onChange={e => setField({ estimasi_tol: angka(e.target.value) })} />
                </FormItem>
                <FormItem label="Estimasi BBM">
                    <Input prefix="Rp" placeholder="0"
                        value={value.estimasi_bbm ? formatNum(Number(value.estimasi_bbm)) : ''}
                        onChange={e => setField({ estimasi_bbm: angka(e.target.value) })} />
                </FormItem>
                <FormItem label="Estimasi Biaya Lain">
                    <Input prefix="Rp" placeholder="0"
                        value={value.estimasi_biaya_lain ? formatNum(Number(value.estimasi_biaya_lain)) : ''}
                        onChange={e => setField({ estimasi_biaya_lain: angka(e.target.value) })} />
                </FormItem>
                <div className="sm:col-span-2">
                    <FormItem label="Keterangan">
                        <Input textArea placeholder="Keterangan tambahan (opsional)" value={value.keterangan}
                            onChange={e => setField({ keterangan: e.target.value })} />
                    </FormItem>
                </div>
            </div>

            <RuteBaruDialog isOpen={showRuteBaru} onClose={() => setShowRuteBaru(false)}
                onSaved={(rute) => {
                    setShowRuteBaru(false)
                    onRuteCreated?.(rute)
                    setField({ id_rute: rute.id_rute })
                }} />
        </div>
    )
}

export function ruteTarifValid(state: RuteTarifState): boolean {
    return !!state.id_rute
}

export function toProyekRutePayload(state: RuteTarifState): ProyekRutePayload {
    return {
        id_rute: state.id_rute,
        id_jenis_kendaraan: state.id_jenis_kendaraan || null,
        harga_penawaran: state.harga_penawaran !== '' ? Number(state.harga_penawaran) : null,
        estimasi_ritase: state.estimasi_ritase !== '' ? Number(state.estimasi_ritase) : 1,
        uang_jalan: state.uang_jalan !== '' ? Number(state.uang_jalan) : null,
        estimasi_tol: state.estimasi_tol !== '' ? Number(state.estimasi_tol) : null,
        estimasi_bbm: state.estimasi_bbm !== '' ? Number(state.estimasi_bbm) : null,
        estimasi_biaya_lain: state.estimasi_biaya_lain !== '' ? Number(state.estimasi_biaya_lain) : null,
        keterangan: state.keterangan.trim() || null,
    }
}

export function stateFromProyekRute(r: ProyekRute): RuteTarifState {
    return {
        id_rute: r.id_rute,
        id_jenis_kendaraan: r.id_jenis_kendaraan ?? '',
        harga_penawaran: r.harga_penawaran != null ? String(r.harga_penawaran) : '',
        estimasi_ritase: String(r.estimasi_ritase ?? 1),
        uang_jalan: r.uang_jalan != null ? String(r.uang_jalan) : '',
        estimasi_tol: r.estimasi_tol != null ? String(r.estimasi_tol) : '',
        estimasi_bbm: r.estimasi_bbm != null ? String(r.estimasi_bbm) : '',
        estimasi_biaya_lain: r.estimasi_biaya_lain != null ? String(r.estimasi_biaya_lain) : '',
        keterangan: r.keterangan ?? '',
    }
}
