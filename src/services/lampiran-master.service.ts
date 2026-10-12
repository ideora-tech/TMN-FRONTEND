import axios from 'axios'
import { API_ENDPOINTS } from '@/constants/api.constant'

export type JenisPemilikLampiran = 'vendor' | 'supplier'

export interface LampiranMaster {
    id_lampiran: string
    nama_asli: string
    url_file: string | null
    tipe_mime: string | null
    ukuran: number
    gambar: boolean
    dibuat_pada: string
}

export const MAKS_LAMPIRAN_MASTER = 20
export const MAKS_UKURAN_LAMPIRAN_MASTER = 5 * 1024 * 1024
export const EKSTENSI_LAMPIRAN_MASTER = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'xls', 'xlsx', 'doc', 'docx']

const MAKS_BERKAS_PER_PERMINTAAN = 10
const MAKS_BYTE_PER_PERMINTAAN = 8 * 1024 * 1024

const bagiPermintaan = (files: File[]): File[][] => {
    const hasil: File[][] = []
    let kelompok: File[] = []
    let ukuran = 0
    for (const file of files) {
        const penuh = kelompok.length >= MAKS_BERKAS_PER_PERMINTAAN || ukuran + file.size > MAKS_BYTE_PER_PERMINTAAN
        if (kelompok.length > 0 && penuh) {
            hasil.push(kelompok)
            kelompok = []
            ukuran = 0
        }
        kelompok.push(file)
        ukuran += file.size
    }
    if (kelompok.length > 0) hasil.push(kelompok)
    return hasil
}

export const lampiranMasterService = {
    async list(jenis: JenisPemilikLampiran, id: string) {
        const { data } = await axios.get(API_ENDPOINTS.LAMPIRAN_MASTER(jenis, id))
        return data.data as LampiranMaster[]
    },
    async upload(jenis: JenisPemilikLampiran, id: string, files: File[]) {
        let hasil: LampiranMaster[] = []
        for (const kelompok of bagiPermintaan(files)) {
            const fd = new FormData()
            kelompok.forEach(f => fd.append('lampiran[]', f))
            const { data } = await axios.post(API_ENDPOINTS.LAMPIRAN_MASTER(jenis, id), fd)
            hasil = data.data as LampiranMaster[]
        }
        return hasil
    },
    async hapus(jenis: JenisPemilikLampiran, id: string, idLampiran: string) {
        await axios.delete(API_ENDPOINTS.LAMPIRAN_MASTER_DETAIL(jenis, id, idLampiran))
    },
}
