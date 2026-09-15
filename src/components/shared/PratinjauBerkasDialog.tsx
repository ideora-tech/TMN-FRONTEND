'use client'
import { Button, Dialog } from '@/components/ui'
import { HiOutlineDownload, HiOutlineExternalLink } from 'react-icons/hi'

export type BerkasPratinjau = {
    url: string
    judul: string
    namaUnduh?: string
}

type Props = {
    berkas: BerkasPratinjau | null
    onClose: () => void
}

const IMAGE_URL_REGEX = /\.(jpe?g|png|webp|gif)(\?|$)/i
const PDF_URL_REGEX = /\.pdf(\?|$)/i

export const urlUnduhBerkas = (url: string, nama?: string) =>
    `/api/berkas?u=${encodeURIComponent(url)}${nama ? `&nama=${encodeURIComponent(nama)}` : ''}`

export default function PratinjauBerkasDialog({ berkas, onClose }: Props) {
    const url = berkas?.url ?? ''
    const judul = berkas?.judul ?? ''
    const gambar = IMAGE_URL_REGEX.test(url)
    const pdf = PDF_URL_REGEX.test(url)

    const unduh = () => {
        if (!url) return
        const a = document.createElement('a')
        a.href = urlUnduhBerkas(url, berkas?.namaUnduh)
        a.download = ''
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    return (
        <Dialog isOpen={!!berkas} onRequestClose={onClose} onClose={onClose} width={960}>
            <div className="flex items-center justify-between gap-3 mb-4 pr-8">
                <h5 className="font-semibold truncate">{judul}</h5>
                <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="default" icon={<HiOutlineExternalLink />}
                        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                        Tab Baru
                    </Button>
                    <Button size="sm" variant="solid" icon={<HiOutlineDownload />} onClick={unduh}>
                        Unduh
                    </Button>
                </div>
            </div>
            <div className="rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700/40 flex items-center justify-center" style={{ height: '70vh' }}>
                {gambar ? (
                    <img src={url} alt={judul} className="max-w-full max-h-full object-contain" />
                ) : pdf ? (
                    <iframe src={url} title={judul} className="w-full h-full border-0 bg-white" />
                ) : (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 px-6">
                        Pratinjau tidak tersedia untuk jenis berkas ini — gunakan tombol Unduh atau Tab Baru.
                    </div>
                )}
            </div>
        </Dialog>
    )
}
