'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, Button, Spinner, Tooltip } from '@/components/ui'
import { HiPlusCircle, HiOutlinePencilAlt } from 'react-icons/hi'
import { ROUTES } from '@/constants/route.constant'
import { Penawaran } from '@/services/penawaran.service'
import { permintaanVendorService, PermintaanVendor, ringkasanUnitDiminta } from '@/services/permintaan-vendor.service'
import { STATUS_LABEL, STATUS_TAG, MEKANISME_LABEL, STATUS_TIDAK_DIHITUNG } from '../permintaan-vendor/status'
import { parseApiError } from '@/utils/error.util'

const aksiUbah = (p: PermintaanVendor): { label: string; href: string; kelas: string } | null => {
    if (p.status === 'draft' || p.status === 'ditolak') {
        return {
            label: 'Edit',
            href: `${ROUTES.PERMINTAAN_VENDOR_DETAIL(p.id_permintaan)}?edit=1`,
            kelas: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30',
        }
    }
    if (p.status === 'disetujui') {
        return {
            label: 'Revisi (wajib approval ulang)',
            href: `${ROUTES.PERMINTAAN_VENDOR_DETAIL(p.id_permintaan)}?revisi=1`,
            kelas: 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30',
        }
    }
    return null
}

export default function PermintaanVendorPenawaranCard({ penawaran }: { penawaran: Penawaran }) {
    const router = useRouter()
    const [daftar, setDaftar] = useState<PermintaanVendor[]>([])
    const [loading, setLoading] = useState(true)
    const [tanpaAkses, setTanpaAkses] = useState(false)
    const [galat, setGalat] = useState('')

    useEffect(() => {
        permintaanVendorService.list(1, { id_penawaran: penawaran.id_penawaran, limit: 50 })
            .then(res => setDaftar(res.data))
            .catch(err => {
                if (axios.isAxiosError(err) && err.response?.status === 403) {
                    setTanpaAkses(true)
                } else {
                    setGalat(parseApiError(err))
                }
            })
            .finally(() => setLoading(false))
    }, [penawaran.id_penawaran])

    if (tanpaAkses) return null

    const kebutuhanUnit = (penawaran.items ?? []).reduce((total, it) => total + (it.jumlah_unit ?? 0), 0)
    const sudahDiminta = daftar
        .filter(p => !STATUS_TIDAK_DIHITUNG.includes(p.status))
        .reduce((total, p) => total + p.jumlah_unit, 0)
    const bolehAjukan = penawaran.status !== 'ditolak' && !loading && !galat

    return (
        <Card>
            <div className="flex items-center justify-between gap-3 mb-1">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Permintaan Vendor</p>
                {bolehAjukan && (
                    <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                        onClick={() => router.push(`${ROUTES.PERMINTAAN_VENDOR_BARU}?id_penawaran=${penawaran.id_penawaran}`)}>
                        Ajukan Permintaan Vendor
                    </Button>
                )}
            </div>
            <p className="text-xs text-gray-400 mb-3">
                Kebutuhan unit dari item penawaran: <span className="font-semibold text-gray-600 dark:text-gray-300">{kebutuhanUnit} unit</span>
                {' · '}Sudah diminta ke vendor: <span className="font-semibold text-gray-600 dark:text-gray-300">{sudahDiminta} unit</span>
            </p>
            {loading ? (
                <div className="flex justify-center py-4"><Spinner size={24} /></div>
            ) : galat ? (
                <p className="text-red-500 text-sm py-4 text-center">{galat}</p>
            ) : daftar.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">Belum ada permintaan vendor untuk penawaran ini</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-50 dark:bg-blue-500/10">
                            <tr className="text-left text-gray-600 dark:text-gray-300">
                                <th className="px-3 py-2 font-semibold">Nomor</th>
                                <th className="px-3 py-2 font-semibold">Unit Diminta</th>
                                <th className="px-3 py-2 font-semibold">Mekanisme</th>
                                <th className="px-3 py-2 font-semibold">Status</th>
                                <th className="px-3 py-2 font-semibold w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {daftar.map(p => (
                                <tr key={p.id_permintaan} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="px-3 py-2">
                                        <Link href={ROUTES.PERMINTAAN_VENDOR_DETAIL(p.id_permintaan)} className="font-semibold text-primary hover:underline">
                                            {p.nomor_permintaan}
                                        </Link>
                                    </td>
                                    <td className="px-3 py-2">{ringkasanUnitDiminta(p)}</td>
                                    <td className="px-3 py-2">{MEKANISME_LABEL[p.mekanisme] ?? p.mekanisme}</td>
                                    <td className="px-3 py-2">
                                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${STATUS_TAG[p.status] ?? ''}`}>
                                            {STATUS_LABEL[p.status] ?? p.status}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {(() => {
                                            const aksi = aksiUbah(p)
                                            if (!aksi) return null
                                            return (
                                                <Tooltip title={aksi.label}>
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-colors ${aksi.kelas}`}
                                                        onClick={() => router.push(aksi.href)}>
                                                        <HiOutlinePencilAlt className="text-base" />
                                                    </span>
                                                </Tooltip>
                                            )
                                        })()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    )
}
