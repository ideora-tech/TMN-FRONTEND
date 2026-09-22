import dayjs from 'dayjs'
import type { StatusKetersediaan, SumberUnit, UnitKetersediaan } from '@/services/ketersediaanVendor.service'

export const STATUS_KETERSEDIAAN: Record<StatusKetersediaan, { label: string; tag: string }> = {
    tersedia:  { label: 'Tersedia',        tag: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
    terjadwal: { label: 'Terjadwal',       tag: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
    dipakai:   { label: 'Sedang Dipakai',  tag: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300' },
    perawatan: { label: 'Dalam Perawatan', tag: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
}

export const SUMBER_UNIT: Record<SumberUnit, { label: string; tag: string }> = {
    aset:   { label: 'Aset Milik', tag: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300' },
    vendor: { label: 'Vendor',     tag: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
}

export const TH_CLASS = 'py-2.5 px-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide'

export const formatTanggal = (tanggal: string | null | undefined): string =>
    tanggal ? dayjs(tanggal).format('DD MMM YYYY') : '—'

export const ringkasSpesifikasi = (u: UnitKetersediaan): string =>
    [[u.merk, u.model].filter(Boolean).join(' '), u.nama_jenis_kendaraan, u.kapasitas, u.tahun]
        .filter(v => v != null && v !== '')
        .join(' · ')

export const kontakPemilik = (u: UnitKetersediaan): string =>
    u.sumber === 'aset' ? '' : [u.pic_vendor, u.telepon_vendor].filter(Boolean).join(' · ')

export type KeteranganStatus = { utama: string; tambahan: string | null }

export function keteranganStatus(u: UnitKetersediaan): KeteranganStatus {
    const proyek = u.proyek_jadwal
    const namaProyek = proyek ? [proyek.nama_proyek, proyek.nama_klien].filter(Boolean).join(' · ') : null
    const bebas = u.perkiraan_bebas ? `Perkiraan bebas ${formatTanggal(u.perkiraan_bebas)}` : null
    const servis = u.perawatan_berikutnya ? `Servis dijadwalkan ${formatTanggal(u.perawatan_berikutnya)}` : null
    const gabung = (...bagian: (string | null)[]) => bagian.filter(Boolean).join(' — ') || null

    if (u.status_ketersediaan === 'perawatan') {
        return { utama: 'Sedang dalam perawatan', tambahan: 'Belum dapat dipakai sampai perawatan selesai' }
    }
    if (u.status_ketersediaan === 'tersedia') {
        return { utama: 'Kosong, belum ada jadwal', tambahan: servis }
    }
    if (u.status_ketersediaan === 'terjadwal') {
        return {
            utama: `Dipakai mulai ${formatTanggal(u.jadwal_berikutnya)}`,
            tambahan: gabung(namaProyek, bebas, servis),
        }
    }
    return {
        utama: proyek?.nama_proyek ? `Di proyek ${proyek.nama_proyek}` : 'Sedang dalam perjalanan',
        tambahan: gabung(bebas, servis),
    }
}

export type TagDokumen = { label: string; className: string }

export function tagDokumen(nama: string, berlakuSampai: string | null): TagDokumen {
    if (!berlakuSampai) {
        return { label: `${nama} —`, className: 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400' }
    }
    const sisa = dayjs(berlakuSampai).startOf('day').diff(dayjs().startOf('day'), 'day')
    if (sisa < 0) {
        return { label: `${nama} habis`, className: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' }
    }
    if (sisa <= 30) {
        return { label: `${nama} ${sisa} hari`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' }
    }
    return { label: `${nama} ${dayjs(berlakuSampai).format('MMM YYYY')}`, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' }
}
