'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { permintaanPembelianService, type PermintaanPayload, type TipePermintaan } from '@/services/permintaanPembelian.service'
import PermintaanForm from '../PermintaanForm'

const TIPE_VALID: TipePermintaan[] = ['umum', 'sparepart', 'aset']

export default function PermintaanBaruPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tipeParam = searchParams.get('tipe')
    const tipeAwal: TipePermintaan = TIPE_VALID.includes(tipeParam as TipePermintaan) ? (tipeParam as TipePermintaan) : 'umum'
    const idArmadaAwal = tipeAwal === 'sparepart' ? (searchParams.get('id_armada') ?? undefined) : undefined
    const idPerawatanAwal = tipeAwal === 'sparepart' ? (searchParams.get('id_perawatan') ?? undefined) : undefined

    const handleSubmit = async (payload: PermintaanPayload, bukti: File[]) => {
        try {
            const hasil = await permintaanPembelianService.create(payload, bukti)
            toast.push(<Notification type="success" title={`PR ${hasil.nomor_permintaan} berhasil diajukan`} />)
            router.push(`${ROUTES.PERMINTAAN_PEMBELIAN}?detail=${hasil.id_permintaan}`)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            throw err
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Tambah Permintaan Pembelian</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Ajukan kebutuhan barang/jasa, spare part, atau unit armada baru — akan diproses tim Pengadaan</p>
                </div>
            </div>
            <PermintaanForm mode="baru" tipeAwal={tipeAwal} idArmadaAwal={idArmadaAwal} idPerawatanAwal={idPerawatanAwal} onSubmit={handleSubmit} />
        </div>
    )
}
