'use client'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { PiShieldWarningDuotone } from 'react-icons/pi'
import appConfig from '@/configs/app.config'

export default function AccessDeniedPage() {
    return (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
            <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-500 text-4xl dark:bg-red-500/10">
                <PiShieldWarningDuotone />
            </span>
            <h3 className="font-bold">Akses Ditolak</h3>
            <p className="text-gray-500 text-sm max-w-md">
                Anda tidak memiliki izin untuk mengakses halaman ini. Hubungi manager atau admin jika Anda merasa ini adalah kesalahan.
            </p>
            <Link href={appConfig.authenticatedEntryPath}>
                <Button variant="solid">Kembali ke Dashboard</Button>
            </Link>
        </div>
    )
}
