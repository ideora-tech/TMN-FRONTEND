'use client'
import { useEffect, useState } from 'react'
import { Card, Spinner, toast, Notification } from '@/components/ui'
import { parseApiError } from '@/utils/error.util'
import { strukturOrganisasiService, JabatanTreeNode } from '@/services/strukturOrganisasi.service'
import StrukturOrganisasiTree from './StrukturOrganisasiTree'

export default function StrukturOrganisasiPage() {
    const [pohon, setPohon] = useState<JabatanTreeNode[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        strukturOrganisasiService.get()
            .then(setPohon)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="flex flex-col gap-4">
            <div>
                <h3 className="font-bold">Struktur Organisasi</h3>
                <p className="text-gray-500 text-sm mt-0.5">Hirarki jabatan &amp; siapa yang menjabat saat ini</p>
            </div>
            <Card>
                {loading ? (
                    <div className="flex justify-center py-16"><Spinner size={36} /></div>
                ) : pohon.length === 0 ? (
                    <p className="text-gray-400 text-sm py-10 text-center">
                        Belum ada jabatan yang terdaftar — tambahkan jabatan terlebih dahulu di menu Jabatan.
                    </p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {pohon.map(root => <StrukturOrganisasiTree key={root.id_jabatan} node={root} />)}
                    </div>
                )}
            </Card>
        </div>
    )
}
