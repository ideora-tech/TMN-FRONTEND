'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card, toast, Notification } from '@/components/ui'
import { HiArrowLeft } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { kasbonService, Kasbon } from '@/services/kasbon.service'
import KasbonForm from '../../KasbonForm'

export default function KasbonEditPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const [initial, setInitial] = useState<Kasbon | null>(null)
    const [gagalMuat, setGagalMuat] = useState(false)

    useEffect(() => {
        kasbonService.get(id)
            .then(data => {
                if (!data.bisa_diubah) {
                    toast.push(<Notification type="warning" title="Kasbon sudah diproses, tidak bisa diedit" />)
                    router.replace(ROUTES.KASBON_DETAIL(id))
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
                <p className="text-sm text-gray-500 mb-4">Kasbon tidak ditemukan atau Anda tidak punya akses.</p>
                <Button type="button" variant="default" icon={<HiArrowLeft />} onClick={() => router.push(ROUTES.KASBON)}>Kembali</Button>
            </Card>
        )
    }

    return <KasbonForm mode="edit" initial={initial} />
}
