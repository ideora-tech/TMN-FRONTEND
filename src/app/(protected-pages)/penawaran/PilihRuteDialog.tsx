'use client'
import { useEffect, useState } from 'react'
import { Button, Dialog, Input, toast, Notification } from '@/components/ui'
import { HiArrowLeft, HiOutlineSearch, HiPlusCircle } from 'react-icons/hi'
import { ruteService, Rute } from '@/services/rute.service'
import { parseApiError } from '@/utils/error.util'
import { RuteBaruForm } from '@/components/shared/RuteBaruDialog'

export type PilihanItemRute = {
    id_rute: string
}

type Props = {
    isOpen: boolean
    onClose: () => void
    onPilih: (pilihan: PilihanItemRute) => void
    onRuteBaru: (rute: Rute) => void
}

type Tampilan = 'daftar' | 'buat'

const LIMIT_RUTE = 20

export default function PilihRuteDialog({ isOpen, onClose, onPilih, onRuteBaru }: Props) {
    const [tampilan, setTampilan] = useState<Tampilan>('daftar')

    const [cari, setCari] = useState('')
    const [cariDebounced, setCariDebounced] = useState('')
    const [ruteRows, setRuteRows] = useState<Rute[]>([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [versiDaftar, setVersiDaftar] = useState(0)
    const [memuatRute, setMemuatRute] = useState(false)
    const [memuatLagi, setMemuatLagi] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setTampilan('daftar')
        setCari('')
        setCariDebounced('')
    }, [isOpen])

    useEffect(() => {
        const t = setTimeout(() => setCariDebounced(cari), 300)
        return () => clearTimeout(t)
    }, [cari])

    useEffect(() => {
        if (!isOpen) return
        let aktif = true
        setMemuatRute(true)
        ruteService.list({ page: 1, limit: LIMIT_RUTE, search: cariDebounced || undefined })
            .then(res => {
                if (!aktif) return
                setRuteRows((res.data ?? []) as Rute[])
                setTotal(res.meta?.total ?? 0)
                setPage(1)
            })
            .catch(err => { if (aktif) toast.push(<Notification type="danger" title={parseApiError(err)} />) })
            .finally(() => { if (aktif) setMemuatRute(false) })
        return () => { aktif = false }
    }, [isOpen, cariDebounced, versiDaftar])

    const adaLagi = ruteRows.length < total

    const muatLebihBanyak = async () => {
        setMemuatLagi(true)
        try {
            const res = await ruteService.list({ page: page + 1, limit: LIMIT_RUTE, search: cariDebounced || undefined })
            setRuteRows(prev => [...prev, ...((res.data ?? []) as Rute[])])
            setTotal(res.meta?.total ?? 0)
            setPage(p => p + 1)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMemuatLagi(false)
        }
    }

    const pilihRute = (idRute: string) => {
        onPilih({ id_rute: idRute })
        toast.push(<Notification type="success" title="Item ditambahkan ke penawaran" />)
    }

    const bukaFormBuat = () => setTampilan('buat')

    const ruteBaruTersimpan = (rute: Rute) => {
        onRuteBaru(rute)
        onPilih({ id_rute: rute.id_rute })
        toast.push(<Notification type="success" title="Rute berhasil dibuat & ditambahkan ke penawaran" />)
        setCari('')
        setCariDebounced('')
        setVersiDaftar(v => v + 1)
        setTampilan('daftar')
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={800}>
            {tampilan === 'daftar' ? (
                <>
                    <h5 className="text-base font-semibold mb-1">Daftar Rute</h5>
                    <p className="text-xs text-gray-400 mb-4">
                        Pilih rute untuk menambah item ke penawaran, atau buat rute baru tanpa pindah halaman
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Cari nama, kode, asal, atau tujuan..."
                                prefix={<HiOutlineSearch className="text-lg" />}
                                value={cari}
                                onChange={e => setCari(e.target.value)}
                            />
                        </div>
                        <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />} onClick={bukaFormBuat}>
                            Rute Baru
                        </Button>
                    </div>
                    <div className="max-h-[55vh] overflow-y-auto pr-1 flex flex-col gap-2">
                        {memuatRute && <p className="text-sm text-gray-400 py-6 text-center">Memuat...</p>}
                        {!memuatRute && ruteRows.length === 0 && (
                            <p className="text-sm text-gray-400 py-6 text-center">
                                Tidak ada rute yang cocok — buat rute baru dengan tombol di atas
                            </p>
                        )}
                        {!memuatRute && ruteRows.map(r => (
                            <div key={r.id_rute}
                                className="flex items-center justify-between gap-3 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{r.nama_rute}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                                        {r.kode_rute}
                                        {(r.asal || r.tujuan) ? ` · ${r.asal ?? '?'} → ${r.tujuan ?? '?'}` : ''}
                                    </p>
                                </div>
                                <Button type="button" size="sm" variant="solid" className="flex-shrink-0"
                                    onClick={() => pilihRute(r.id_rute)}>
                                    Pilih
                                </Button>
                            </div>
                        ))}
                        {!memuatRute && adaLagi && (
                            <Button type="button" size="sm" variant="default" loading={memuatLagi} onClick={muatLebihBanyak}>
                                Muat Lebih Banyak
                            </Button>
                        )}
                    </div>
                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={onClose}>Tutup</Button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-1">
                        <button
                            type="button"
                            onClick={() => setTampilan('daftar')}
                            className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                        >
                            <HiArrowLeft />
                        </button>
                        <h5 className="text-base font-semibold">Rute Baru</h5>
                    </div>
                    <p className="text-xs text-gray-400 mb-4 ml-9">
                        Rute langsung tersedia di penawaran setelah disimpan
                    </p>
                    <RuteBaruForm onBatal={() => setTampilan('daftar')} onSaved={ruteBaruTersimpan} />
                </>
            )}
        </Dialog>
    )
}
