'use client'
import { useState } from 'react'
import { Button, FormItem, Input } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiPlusCircle } from 'react-icons/hi'
import { formatNum } from '@/utils/formatNumber'
import { ProyekRute, ProyekRutePayload } from '@/services/proyekRute.service'
import { Rute } from '@/services/rute.service'
import type { KomponenUangJalan, RincianKomponenUangJalan } from '@/services/komponenUangJalan.service'
import RuteBaruDialog from '@/components/shared/RuteBaruDialog'
import KomponenUangJalanFields, {
    NilaiKomponen, nilaiDariRincian, rincianDariNilai, totalKomponen,
} from '@/components/shared/KomponenUangJalanFields'

export type RuteTarifState = {
    id_rute: string
    id_jenis_kendaraan: string
    harga_penawaran: string
    estimasi_ritase: string
    uang_jalan: string
    komponen: NilaiKomponen
    komponen_asal: RincianKomponenUangJalan[]
    keterangan: string
}

export const EMPTY_RUTE_TARIF_STATE: RuteTarifState = {
    id_rute: '',
    id_jenis_kendaraan: '',
    harga_penawaran: '',
    estimasi_ritase: '1',
    uang_jalan: '',
    komponen: {},
    komponen_asal: [],
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
    komponenOpsi: KomponenUangJalan[]
    onRuteCreated?: (rute: Rute) => void
    hargaTerkunci?: boolean
    modeEdit?: boolean
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

export default function RuteTarifFields({ value, onChange, ruteOptions, jenisOptions, komponenOpsi, onRuteCreated, hargaTerkunci, modeEdit }: Props) {
    const [showRuteBaru, setShowRuteBaru] = useState(false)
    const ruteHargaTerkunci = !!hargaTerkunci || !!modeEdit
    const ruteTerpilih = ruteOptions.find(o => o.value === value.id_rute)
    const adaDetailRute = !!ruteTerpilih && (
        (!!ruteTerpilih.asal && !!ruteTerpilih.tujuan)
        || ruteTerpilih.estimasi_jarak_km != null
        || ruteTerpilih.estimasi_durasi_menit != null
    )
    const jenisOptionsSemua = [JENIS_SEMUA, ...jenisOptions]

    const setField = (patch: Partial<RuteTarifState>) => onChange({ ...value, ...patch })
    const totalAsal = value.komponen_asal.reduce((jumlah, r) => jumlah + r.nominal, 0)
    const totalTersimpan = Number(value.uang_jalan) || 0
    const totalLamaBeda = !!modeEdit && Math.abs(totalTersimpan - totalAsal) >= 1

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                <FormItem label="Rute" asterisk>
                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <Select<Option> placeholder="Pilih rute..." options={ruteOptions} isDisabled={ruteHargaTerkunci}
                                value={ruteOptions.find(o => o.value === value.id_rute) ?? null}
                                onChange={opt => setField({ id_rute: opt?.value ?? '' })} />
                        </div>
                        {!ruteHargaTerkunci && (
                            <Button type="button" size="sm" variant="default" icon={<HiPlusCircle />}
                                onClick={() => setShowRuteBaru(true)}>
                                Rute Baru
                            </Button>
                        )}
                    </div>
                    {ruteHargaTerkunci && (
                        <p className="text-xs text-amber-500 mt-1">
                            {hargaTerkunci ? 'Rute terkunci — ubah lewat penawaran revisi' : 'Rute tidak dapat diubah dari sini'}
                        </p>
                    )}
                </FormItem>
                <FormItem label="Jenis Kendaraan">
                    <Select<Option> placeholder="Semua jenis" options={jenisOptionsSemua} isDisabled={ruteHargaTerkunci}
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
                    <Input prefix="Rp" placeholder="0" disabled={ruteHargaTerkunci}
                        value={value.harga_penawaran ? formatNum(Number(value.harga_penawaran)) : ''}
                        onChange={e => setField({ harga_penawaran: angka(e.target.value) })} />
                    {ruteHargaTerkunci && (
                        <p className="text-xs text-amber-500 mt-1">
                            {hargaTerkunci ? 'Harga terkunci — ubah lewat penawaran revisi' : 'Harga penawaran diatur lewat penawaran, bukan dari sini'}
                        </p>
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
                <KomponenUangJalanFields opsi={komponenOpsi} asal={value.komponen_asal}
                    nilai={value.komponen} onChange={komponen => setField({ komponen })} />
                <FormItem label="Uang Jalan">
                    <Input prefix="Rp" disabled value={formatNum(totalKomponen(value.komponen))} />
                    <p className="text-xs text-gray-400 mt-1">Otomatis: jumlah semua komponen uang jalan di atas</p>
                    {totalLamaBeda && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Data lama: uang jalan tersimpan {formatNum(totalTersimpan)} tidak sama dengan jumlah rinciannya {formatNum(totalAsal)}.
                            Setelah disimpan, uang jalan mengikuti jumlah rincian dan dipakai sebagai estimasi di Penugasan.
                        </p>
                    )}
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
        komponen_uang_jalan: rincianDariNilai(state.komponen),
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
        komponen: nilaiDariRincian(r.komponen_uang_jalan),
        komponen_asal: r.komponen_uang_jalan ?? [],
        keterangan: r.keterangan ?? '',
    }
}
