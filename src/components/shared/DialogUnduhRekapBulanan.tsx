'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import { Button, Dialog, FormItem, Select, toast, Notification } from '@/components/ui'
import { HiOutlineDownload } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'

type Opsi = { value: string; label: string }

const BULAN_OPTIONS: Opsi[] = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
].map((nama, i) => ({ value: String(i + 1).padStart(2, '0'), label: nama }))

const TAHUN_SEKARANG = dayjs().year()
const TAHUN_OPTIONS: Opsi[] = Array.from({ length: 5 }, (_, i) => String(TAHUN_SEKARANG - i))
    .map(tahun => ({ value: tahun, label: tahun }))

type Props = {
    isOpen: boolean
    judul: string
    keterangan: string
    onClose: () => void
    onUnduh: (bulan: string) => Promise<void>
}

export default function DialogUnduhRekapBulanan({ isOpen, judul, keterangan, onClose, onUnduh }: Props) {
    const [bulan, setBulan]         = useState(dayjs().format('MM'))
    const [tahun, setTahun]         = useState(String(TAHUN_SEKARANG))
    const [mengunduh, setMengunduh] = useState(false)

    const tutup = () => { if (!mengunduh) onClose() }

    const unduh = async () => {
        if (mengunduh) return
        setMengunduh(true)
        try {
            await onUnduh(`${tahun}-${bulan}`)
            onClose()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMengunduh(false)
        }
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={tutup} onClose={tutup} width={460}>
            <h5 className="text-base font-semibold mb-1">{judul}</h5>
            <p className="text-xs text-gray-500 mb-4">{keterangan}</p>
            <div className="grid grid-cols-2 gap-x-4">
                <FormItem label="Bulan">
                    <Select<Opsi> isSearchable={false} maxMenuHeight={220}
                        options={BULAN_OPTIONS}
                        value={BULAN_OPTIONS.find(o => o.value === bulan) ?? null}
                        onChange={opt => setBulan((opt as Opsi).value)} />
                </FormItem>
                <FormItem label="Tahun">
                    <Select<Opsi> isSearchable={false} maxMenuHeight={220}
                        options={TAHUN_OPTIONS}
                        value={TAHUN_OPTIONS.find(o => o.value === tahun) ?? null}
                        onChange={opt => setTahun((opt as Opsi).value)} />
                </FormItem>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" disabled={mengunduh} onClick={tutup}>Kembali</Button>
                <Button type="button" variant="solid" icon={<HiOutlineDownload />} loading={mengunduh} onClick={unduh}>
                    Unduh Excel
                </Button>
            </div>
        </Dialog>
    )
}
