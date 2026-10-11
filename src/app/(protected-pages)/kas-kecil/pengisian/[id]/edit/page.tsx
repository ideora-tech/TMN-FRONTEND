'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { kasKecilService, PengisianKasKecil } from '@/services/kasKecil.service'
import PengisianForm from '../../../PengisianForm'

export default function PengisianKasKecilEditPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [initial, setInitial] = useState<PengisianKasKecil | null>(null)
    const [gagalMuat, setGagalMuat] = useState(false)

    useEffect(() => {
        kasKecilService.getPengisian(id)
            .then(data => {
                if (!data.bisa_diubah) {
                    toast.push(<Notification type="warning" title="Pengisian sudah diproses, tidak bisa diedit" />)
                    router.replace(ROUTES.KAS_KECIL_PENGISIAN_DETAIL(id))
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
                <p className="text-sm text-gray-500 mb-4">Pengisian kas kecil tidak ditemukan atau Anda tidak punya akses.</p>
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(`${ROUTES.KAS_KECIL}?tab=pengisian`)}>Kembali</Button>
            </Card>
        )
    }

    return <PengisianForm mode="edit" initial={initial} />
}
