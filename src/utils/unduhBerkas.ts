import axios from 'axios'

type GalatApi = { message?: string; errors?: Record<string, string[] | string> }

export function unduhBlob(data: Blob, namaBerkas: string) {
    const href = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = href
    link.download = namaBerkas
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
}

const pesanDariGalat = (galat: GalatApi | null): string | undefined => {
    if (!galat) return undefined

    const pertama = galat.errors ? Object.values(galat.errors)[0] : undefined
    const validasi = Array.isArray(pertama) ? pertama[0] : pertama

    return validasi || galat.message || undefined
}

const bacaGalat = async (data: Blob): Promise<GalatApi | null> => {
    try {
        return JSON.parse(await data.text()) as GalatApi
    } catch {
        return null
    }
}

export async function unduhDariApi(url: string, params: Record<string, unknown>, namaBerkas: string) {
    try {
        const res = await axios.get(url, { responseType: 'blob', params })
        const blob = res.data as Blob

        if (blob.type.includes('text/html')) {
            throw new Error('Sesi berakhir, silakan masuk lagi lalu ulangi unduhan')
        }
        if (blob.type.includes('application/json')) {
            throw new Error(pesanDariGalat(await bacaGalat(blob)) ?? 'Berkas tidak bisa diunduh')
        }

        unduhBlob(blob, namaBerkas)
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
            const pesan = pesanDariGalat(await bacaGalat(err.response.data))
            if (pesan) throw new Error(pesan)
        }
        throw err
    }
}
