'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Spinner, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { permintaanPembelianService, type PermintaanPembelian, type PermintaanPayload } from '@/services/permintaanPembelian.service'
import { bolehDiubah } from '../../status'
import PermintaanForm from '../../PermintaanForm'

export default function PermintaanEditPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [awal, setAwal] = useState<PermintaanPembelian | null>(null)
    const [memuat, setMemuat] = useState(true)

    useEffect(() => {
        setMemuat(true)
        permintaanPembelianService.get(id)
            .then(setAwal)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setMemuat(false))
    }, [id])

    const handleSubmit = async (payload: PermintaanPayload) => {
        try {
            await permintaanPembelianService.update(id, payload)
            toast.push(<Notification type="success" title="Permintaan berhasil diperbarui" />)
            router.push(`${ROUTES.PERMINTAAN_PEMBELIAN}?detail=${id}`)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            throw err
        }
    }

    const kembali = () => router.push(`${ROUTES.PERMINTAAN_PEMBELIAN}?detail=${id}`)

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button type="button" onClick={kembali}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Edit Permintaan {awal?.nomor_permintaan ?? ''}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Ubah permintaan yang belum diproses tim Pengadaan</p>
                </div>
            </div>
            {memuat ? (
                <Card><div className="flex justify-center py-10"><Spinner size={32} /></div></Card>
            ) : !awal ? (
                <Card>
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <p className="text-gray-500">Permintaan tidak ditemukan atau Anda tidak memiliki akses</p>
                        <Button size="sm" variant="default" onClick={() => router.push(ROUTES.PERMINTAAN_PEMBELIAN)}>Kembali ke daftar</Button>
                    </div>
                </Card>
            ) : !bolehDiubah(awal.status) ? (
                <Card>
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <p className="font-semibold">Permintaan ini sudah diproses Pengadaan dan tidak bisa diubah</p>
                        <p className="text-gray-500 text-sm">Hubungi tim Pengadaan bila ada perubahan kebutuhan, atau ajukan permintaan baru</p>
                        <Button size="sm" variant="default" onClick={kembali}>Kembali ke detail</Button>
                    </div>
                </Card>
            ) : (
                <PermintaanForm mode="edit" awal={awal} onSubmit={handleSubmit} />
            )}
        </div>
    )
}
