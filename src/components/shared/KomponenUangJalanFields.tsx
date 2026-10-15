'use client'
import { FormItem, Input } from '@/components/ui'
import { formatNum } from '@/utils/formatNumber'
import type { KomponenUangJalan, RincianKomponenUangJalan } from '@/services/komponenUangJalan.service'

export type NilaiKomponen = Record<string, string>

type KomponenTampil = { id: string; nama: string; aktif: boolean }

export function nilaiDariRincian(rincian: RincianKomponenUangJalan[] | null | undefined): NilaiKomponen {
    const nilai: NilaiKomponen = {}
    for (const r of rincian ?? []) {
        if (r.id_komponen_uang_jalan) nilai[r.id_komponen_uang_jalan] = String(Math.round(r.nominal))
    }
    return nilai
}

export function totalKomponen(nilai: NilaiKomponen): number {
    return Object.values(nilai).reduce((jumlah, v) => jumlah + (Number(v) || 0), 0)
}

export function rincianDariNilai(nilai: NilaiKomponen): { id_komponen_uang_jalan: string; nominal: number }[] {
    return Object.entries(nilai)
        .filter(([, v]) => (Number(v) || 0) > 0)
        .map(([id, v]) => ({ id_komponen_uang_jalan: id, nominal: Number(v) }))
}

function komponenTampil(opsi: KomponenUangJalan[], asal: RincianKomponenUangJalan[]): KomponenTampil[] {
    const daftar: KomponenTampil[] = opsi.map(k => ({ id: k.id_komponen_uang_jalan, nama: k.nama, aktif: true }))
    const ada = new Set(daftar.map(k => k.id))
    for (const r of asal) {
        if (r.id_komponen_uang_jalan && !ada.has(r.id_komponen_uang_jalan)) {
            daftar.push({ id: r.id_komponen_uang_jalan, nama: r.nama_komponen, aktif: r.aktif === true })
            ada.add(r.id_komponen_uang_jalan)
        }
    }
    return daftar
}

type Props = {
    opsi: KomponenUangJalan[]
    asal?: RincianKomponenUangJalan[]
    nilai: NilaiKomponen
    onChange: (nilai: NilaiKomponen) => void
    maksDigit?: number
}

export default function KomponenUangJalanFields({ opsi, asal = [], nilai, onChange, maksDigit }: Props) {
    const daftar = komponenTampil(opsi, asal)

    if (daftar.length === 0) {
        return (
            <p className="sm:col-span-2 text-sm text-amber-600 dark:text-amber-400 py-2">
                Belum ada komponen uang jalan aktif — tambahkan di Data Master → Komponen Uang Jalan.
            </p>
        )
    }

    return (
        <>
            {daftar.map(k => (
                <FormItem key={k.id} label={`Estimasi ${k.nama}`}>
                    <Input prefix="Rp" placeholder="0"
                        value={nilai[k.id] ? formatNum(Number(nilai[k.id])) : ''}
                        onChange={e => {
                            const angka = e.target.value.replace(/\D/g, '')
                            onChange({ ...nilai, [k.id]: maksDigit ? angka.slice(0, maksDigit) : angka })
                        }} />
                    {!k.aktif && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Komponen sudah nonaktif — kosongkan bila tidak dipakai lagi</p>}
                </FormItem>
            ))}
        </>
    )
}
