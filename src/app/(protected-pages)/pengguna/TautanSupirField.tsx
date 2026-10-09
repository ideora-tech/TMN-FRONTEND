'use client'
import { FormItem } from '@/components/ui'
import Select from '@/components/ui/Select'
import type { OpsiTautanSupir } from '@/services/pengguna.service'

type Opsi = { value: string; label: string; isDisabled: boolean }

export type NilaiTautanSupir = { id_supir: string; id_supir_vendor: string }

interface Props {
    peran: string | null | undefined
    idPengguna?: string
    opsi: OpsiTautanSupir | null
    gagalMuat?: boolean
    nilai: NilaiTautanSupir
    onChange: (nilai: NilaiTautanSupir) => void
}

export const PERAN_SUPIR = 'SUPIR'
export const PERAN_SUPIR_VENDOR = 'SUPIR_VENDOR'

export const peranSupir = (peran: string | null | undefined) => peran === PERAN_SUPIR || peran === PERAN_SUPIR_VENDOR

export default function TautanSupirField({ peran, idPengguna, opsi, gagalMuat = false, nilai, onChange }: Props) {
    if (!peranSupir(peran)) return null

    const vendor = peran === PERAN_SUPIR_VENDOR
    const dipakaiAkunLain = (idAkun: string | null) => idAkun !== null && idAkun !== idPengguna
    const ketAkun = (idAkun: string | null, username: string | null) =>
        dipakaiAkunLain(idAkun) ? ` · sudah memakai akun ${username ?? 'lain'}` : ''

    const options: Opsi[] = vendor
        ? (opsi?.supir_vendor ?? []).map(v => ({
            value: v.id_supir_vendor,
            label: `${v.nama} — ${v.nama_vendor}${v.aktif ? '' : ' (nonaktif)'}${ketAkun(v.id_pengguna, v.username_pengguna)}`,
            isDisabled: dipakaiAkunLain(v.id_pengguna),
        }))
        : (opsi?.supir ?? []).map(s => ({
            value: s.id_supir,
            label: `${s.nama}${s.no_sim ? ` — SIM ${s.no_sim}` : ''}${s.status === 'aktif' ? '' : ' (nonaktif)'}${ketAkun(s.id_pengguna, s.username_pengguna)}`,
            isDisabled: dipakaiAkunLain(s.id_pengguna),
        }))

    const terpilih = vendor ? nilai.id_supir_vendor : nilai.id_supir
    const sebutan = vendor ? 'supir vendor' : 'supir'
    const placeholder = gagalMuat ? `Daftar ${sebutan} gagal dimuat` : opsi ? `Pilih ${sebutan}...` : `Memuat daftar ${sebutan}...`

    return (
        <FormItem label={vendor ? 'Supir Vendor Pemakai Akun (opsional)' : 'Supir Pemakai Akun (opsional)'}>
            <Select<Opsi> isClearable isSearchable isDisabled={!opsi}
                placeholder={placeholder}
                noOptionsMessage={({ inputValue }) => inputValue ? `Tidak ada ${sebutan} yang cocok` : `Belum ada data ${sebutan}`}
                options={options}
                value={options.find(o => o.value === terpilih) ?? null}
                onChange={opt => onChange(vendor
                    ? { ...nilai, id_supir_vendor: opt?.value ?? '' }
                    : { ...nilai, id_supir: opt?.value ?? '' })} />
            <p className="text-xs text-gray-400 mt-1.5">
                Orang ini login ke aplikasi mobile memakai akun ini. Yang sudah punya akun lain tidak bisa dipilih.
                Belum ada di daftar? Tambahkan dulu di menu {vendor ? 'Supir Vendor' : 'Supir'}.
            </p>
        </FormItem>
    )
}
