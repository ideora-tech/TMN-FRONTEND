'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, TransaksiKasKecil } from '@/services/kasKecil.service'
import PengeluaranForm from '../../../PengeluaranForm'

export default function PengeluaranKasKecilEditPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [initial, setInitial] = useState<TransaksiKasKecil | null>(null)
    const [gagalMuat, setGagalMuat] = useState(false)

    useEffect(() => {
        kasKecilService.getTransaksi(id)
            .then(data => {
                if (!data.bisa_diubah) {
                    toast.push(<Notification type="warning" title="Hanya pengeluaran kas kecil yang bisa diedit" />)
                    router.replace(ROUTES.KAS_KECIL)
                    return
                }
                setInitial(data)
            })
            .catch(err => {
                setGagalMuat(true)
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
            })
    }, [id, router])

    if (!initial) {
        if (!gagalMuat) return null
        return (
            <Card>
                <p className="text-sm text-gray-500 mb-4">Transaksi kas kecil tidak ditemukan atau Anda tidak punya akses.</p>
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.KAS_KECIL)}>Kembali</Button>
            </Card>
        )
    }

    return <PengeluaranForm mode="edit" initial={initial} />
}
