'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, FormItem, Input, Tag, Upload, toast, Notification } from '@/components/ui'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import {
    HiArrowLeft,
    HiOutlineMap,
    HiOutlinePlus,
    HiOutlinePencilAlt,
    HiOutlineTrash,
    HiOutlineX,
    HiOutlineDocumentText,
} from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { ROUTES } from '@/constants/route.constant'
import { API_ENDPOINTS } from '@/constants/api.constant'
import { tripService, Trip, StatusTrip } from '@/services/trip.service'
import {
    laporanPerjalananService,
    LaporanPerjalanan,
    FotoLaporan,
} from '@/services/laporanPerjalanan.service'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import axios from 'axios'
import dayjs from 'dayjs'

const STATUS_TAG: Record<string, string> = {
    belum_mulai: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300',
    berjalan:    'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100',
    selesai:     'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100',
    dibatalkan:  'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100',
}

const STATUS_LABEL: Record<string, string> = {
    belum_mulai: 'Belum Mulai',
    berjalan:    'Berjalan',
    selesai:     'Selesai',
    dibatalkan:  'Dibatalkan',
}

type RekapBiaya = {
    total_bbm: number
    total_uang_jalan: number
    total_biaya_lain: number
    total_keseluruhan: number
    estimasi_biaya: number | null
    selisih: number | null
    jarak_tempuh_km: number | null
    items: { id_biaya_lain: string; nama_biaya: string; nominal: number }[]
}

type BiayaLainRow = { nama_biaya: string; nominal: string }

const emptyLaporanForm = () => ({
    biaya_bbm:        '',
    uang_jalan:       '',
    jarak_tempuh_km:  '',
    catatan_insiden:  '',
    biaya_lain:       [] as BiayaLainRow[],
})

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [trip, setTrip]                 = useState<Trip | null>(null)
    const [statuses, setStatuses]         = useState<StatusTrip[]>([])
    const [loading, setLoading]           = useState(true)
    const [rekap, setRekap]               = useState<RekapBiaya | null>(null)
    const [rekapLoading, setRekapLoading] = useState(true)

    // laporan perjalanan
    const [laporan, setLaporan]               = useState<LaporanPerjalanan | null>(null)
    const [laporanLoading, setLaporanLoading] = useState(true)
    const [showLaporanForm, setShowLaporanForm] = useState(false)
    const [laporanForm, setLaporanForm]       = useState(emptyLaporanForm())
    const [savingLaporan, setSavingLaporan]   = useState(false)

    // foto laporan
    const [fotoFile, setFotoFile]             = useState<File | null>(null)
    const [fotoKeterangan, setFotoKeterangan] = useState('')
    const [uploadingFoto, setUploadingFoto]   = useState(false)
    const [deleteFotoTarget, setDeleteFotoTarget] = useState<FotoLaporan | null>(null)
    const [deletingFoto, setDeletingFoto]         = useState(false)

    useEffect(() => {
        tripService.get(id)
            .then(setTrip)
            .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
            .finally(() => setLoading(false))
    }, [id])

    useEffect(() => {
        const load = () => tripService.getStatus(id).then(setStatuses).catch(console.error)
        load()
        const interval = setInterval(load, 30_000)
        return () => clearInterval(interval)
    }, [id])

    const fetchRekap = useCallback(async () => {
        setRekapLoading(true)
        try {
            const res = await axios.get(API_ENDPOINTS.TRIP_REKAP_BIAYA(id))
            setRekap(res.data?.data ?? null)
        } catch {
            // silently fail if no data yet
        } finally {
            setRekapLoading(false)
        }
    }, [id])

    useEffect(() => { fetchRekap() }, [fetchRekap])

    const fetchLaporan = useCallback(async () => {
        setLaporanLoading(true)
        try {
            setLaporan(await laporanPerjalananService.getByTrip(id))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLaporanLoading(false)
        }
    }, [id])

    useEffect(() => { fetchLaporan() }, [fetchLaporan])

    // --- handlers laporan perjalanan ---
    const handleOpenCreateLaporan = () => {
        setLaporanForm(emptyLaporanForm())
        setShowLaporanForm(true)
    }

    const handleOpenEditLaporan = () => {
        if (!laporan) return
        setLaporanForm({
            biaya_bbm:       String(laporan.biaya_bbm ?? ''),
            uang_jalan:      String(laporan.uang_jalan ?? ''),
            jarak_tempuh_km: String(laporan.jarak_tempuh_km ?? ''),
            catatan_insiden: laporan.catatan_insiden ?? '',
            biaya_lain:      laporan.biaya_lain.map(b => ({ nama_biaya: b.nama_biaya, nominal: String(b.nominal) })),
        })
        setShowLaporanForm(true)
    }

    const addBiayaLainRow = () => {
        setLaporanForm(p => ({ ...p, biaya_lain: [...p.biaya_lain, { nama_biaya: '', nominal: '' }] }))
    }

    const removeBiayaLainRow = (idx: number) => {
        setLaporanForm(p => ({ ...p, biaya_lain: p.biaya_lain.filter((_, i) => i !== idx) }))
    }

    const updateBiayaLainRow = (idx: number, field: keyof BiayaLainRow, value: string) => {
        setLaporanForm(p => {
            const next = [...p.biaya_lain]
            next[idx] = { ...next[idx], [field]: value }
            return { ...p, biaya_lain: next }
        })
    }

    const handleSubmitLaporan = async () => {
        setSavingLaporan(true)
        try {
            const payload = {
                biaya_bbm:       Number(laporanForm.biaya_bbm) || 0,
                uang_jalan:      Number(laporanForm.uang_jalan) || 0,
                jarak_tempuh_km: Number(laporanForm.jarak_tempuh_km) || 0,
                catatan_insiden: laporanForm.catatan_insiden || null,
                biaya_lain: laporanForm.biaya_lain
                    .filter(b => b.nama_biaya.trim())
                    .map(b => ({ nama_biaya: b.nama_biaya, nominal: Number(b.nominal) || 0 })),
            }
            if (laporan) {
                await laporanPerjalananService.update(laporan.id_laporan, payload)
                toast.push(<Notification type="success" title="Laporan perjalanan berhasil diperbarui" />)
            } else {
                await laporanPerjalananService.create(id, payload)
                toast.push(<Notification type="success" title="Laporan perjalanan berhasil disimpan" />)
            }
            setShowLaporanForm(false)
            await Promise.all([fetchLaporan(), fetchRekap()])
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingLaporan(false)
        }
    }

    // --- handlers foto ---
    const handleUploadFoto = async () => {
        if (!laporan || !fotoFile) return
        setUploadingFoto(true)
        try {
            await laporanPerjalananService.uploadFoto(laporan.id_laporan, fotoFile, fotoKeterangan || undefined)
            toast.push(<Notification type="success" title="Foto berhasil diunggah" />)
            setFotoFile(null)
            setFotoKeterangan('')
            await fetchLaporan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setUploadingFoto(false)
        }
    }

    const handleDeleteFoto = async () => {
        if (!laporan || !deleteFotoTarget) return
        setDeletingFoto(true)
        try {
            await laporanPerjalananService.deleteFoto(laporan.id_laporan, deleteFotoTarget.id_foto)
            toast.push(<Notification type="success" title="Foto berhasil dihapus" />)
            setDeleteFotoTarget(null)
            await fetchLaporan()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeletingFoto(false)
        }
    }

    if (loading) return <div className="p-6 text-gray-500">Memuat...</div>
    if (!trip)   return <div className="p-6 text-red-500">Trip tidak ditemukan.</div>

    const canIsiLaporan = trip.status === 'berjalan' || trip.status === 'selesai'

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => router.push(ROUTES.TRIP)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                >
                    <HiArrowLeft className="text-xl" />
                </button>
                <div>
                    <h3 className="font-bold">Detail Trip</h3>
                    <p className="text-gray-500 text-sm mt-0.5">Informasi dan riwayat status trip</p>
                </div>
            </div>

            <Card>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex-shrink-0 select-none">
                            <HiOutlineMap className="text-2xl" />
                        </div>
                        <div>
                            <p className="font-semibold text-base text-gray-800 dark:text-gray-100 leading-tight">
                                {trip.waktu_checkin ? dayjs(trip.waktu_checkin).format('DD MMM YYYY HH:mm') : 'Belum Check-in'}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5 font-mono">#{trip.id_trip.slice(0, 8)}</p>
                        </div>
                    </div>
                    <Tag className={`${STATUS_TAG[trip.status] ?? 'bg-gray-100 text-gray-700'} border-0 flex-shrink-0`}>
                        {STATUS_LABEL[trip.status] ?? trip.status}
                    </Tag>
                </div>

                <div className="my-5 border-t border-gray-100 dark:border-gray-700" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {(
                        [
                            { label: 'ID Trip',   value: <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{trip.id_trip}</span> },
                            { label: 'ID Jadwal', value: <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{trip.id_jadwal}</span> },
                            {
                                label: 'Check-in',
                                value: trip.waktu_checkin ? dayjs(trip.waktu_checkin).format('DD MMM YYYY HH:mm') : <span className="text-gray-400">-</span>,
                            },
                            {
                                label: 'Check-out',
                                value: trip.waktu_checkout ? dayjs(trip.waktu_checkout).format('DD MMM YYYY HH:mm') : <span className="text-gray-400">-</span>,
                            },
                            ...(trip.catatan
                                ? [{ label: 'Catatan', value: trip.catatan as React.ReactNode }]
                                : []),
                        ] as { label: string; value: React.ReactNode }[]
                    ).map(({ label, value }) => (
                        <div key={label}>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                                {label}
                            </p>
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h5>Riwayat Status</h5>
                    <span className="text-xs text-gray-400">Auto-refresh 30 detik</span>
                </div>
                {statuses.length === 0 ? (
                    <div className="text-gray-400 text-sm">Belum ada riwayat status.</div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {statuses.map(s => (
                            <div key={s.id_status} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium">{s.status}</span>
                                    <span className="text-xs text-gray-400">{dayjs(s.dibuat_pada).format('DD/MM/YYYY HH:mm')}</span>
                                </div>
                                {s.keterangan && <div className="text-sm text-gray-600 mt-1">{s.keterangan}</div>}
                                {s.latitude && s.longitude && <div className="text-xs text-gray-400 mt-1">Koordinat: {s.latitude}, {s.longitude}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h5>Laporan Perjalanan</h5>
                    {laporanLoading && <span className="text-xs text-gray-400">Memuat...</span>}
                    {!laporanLoading && !showLaporanForm && laporan && (
                        <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={handleOpenEditLaporan}>
                            Edit
                        </Button>
                    )}
                    {!laporanLoading && !showLaporanForm && !laporan && canIsiLaporan && (
                        <Button size="sm" variant="solid" icon={<HiOutlinePlus />} onClick={handleOpenCreateLaporan}>
                            Isi Laporan
                        </Button>
                    )}
                </div>

                {!laporanLoading && !showLaporanForm && !laporan && !canIsiLaporan && (
                    <div className="text-gray-400 text-sm">Laporan perjalanan dapat diisi setelah trip berjalan.</div>
                )}

                {showLaporanForm && (
                    <form onSubmit={e => { e.preventDefault(); handleSubmitLaporan() }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Biaya BBM (Rp)">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={laporanForm.biaya_bbm ? formatNum(Number(laporanForm.biaya_bbm)) : ''}
                                    onChange={e => setLaporanForm(p => ({ ...p, biaya_bbm: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                            <FormItem label="Uang Jalan (Rp)">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={laporanForm.uang_jalan ? formatNum(Number(laporanForm.uang_jalan)) : ''}
                                    onChange={e => setLaporanForm(p => ({ ...p, uang_jalan: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                            <FormItem label="Jarak Tempuh (km)">
                                <Input
                                    type="number"
                                    suffix="km"
                                    placeholder="0"
                                    value={laporanForm.jarak_tempuh_km}
                                    onChange={e => setLaporanForm(p => ({ ...p, jarak_tempuh_km: e.target.value }))}
                                />
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Catatan Insiden">
                                    <Input
                                        textArea
                                        placeholder="Catatan insiden selama perjalanan (opsional)"
                                        value={laporanForm.catatan_insiden}
                                        onChange={e => setLaporanForm(p => ({ ...p, catatan_insiden: e.target.value }))}
                                    />
                                </FormItem>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 mb-1">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Biaya Lain</p>
                            <Button type="button" size="sm" variant="plain" icon={<HiOutlinePlus />} onClick={addBiayaLainRow}>
                                Tambah Biaya
                            </Button>
                        </div>
                        {laporanForm.biaya_lain.length === 0 ? (
                            <p className="text-gray-400 text-xs py-2">Belum ada biaya lain ditambahkan.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {laporanForm.biaya_lain.map((row, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Input
                                            size="sm"
                                            placeholder="Nama biaya"
                                            value={row.nama_biaya}
                                            onChange={e => updateBiayaLainRow(idx, 'nama_biaya', e.target.value)}
                                            className="flex-1"
                                        />
                                        <Input
                                            size="sm"
                                            prefix="Rp"
                                            placeholder="0"
                                            value={row.nominal ? formatNum(Number(row.nominal)) : ''}
                                            onChange={e => updateBiayaLainRow(idx, 'nominal', e.target.value.replace(/\D/g, ''))}
                                            className="w-40"
                                        />
                                        <span
                                            className="cursor-pointer inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors flex-shrink-0"
                                            onClick={() => removeBiayaLainRow(idx)}
                                        >
                                            <HiOutlineTrash className="text-base" />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 mt-4">
                            <Button size="sm" variant="plain" icon={<HiOutlineX />} onClick={() => setShowLaporanForm(false)}>
                                Batal
                            </Button>
                            <Button type="submit" size="sm" variant="solid" loading={savingLaporan}>
                                Simpan
                            </Button>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-700 mt-5" />
                    </form>
                )}

                {!showLaporanForm && laporan && (
                    <>
                        <div className="flex flex-col gap-0">
                            {[
                                { label: 'Biaya BBM',      value: formatRupiah(laporan.biaya_bbm) },
                                { label: 'Uang Jalan',     value: formatRupiah(laporan.uang_jalan) },
                                { label: 'Jarak Tempuh',   value: `${formatNum(laporan.jarak_tempuh_km)} km` },
                                { label: 'Catatan Insiden', value: laporan.catatan_insiden || '-' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between py-2 border-b last:border-b-0">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="font-medium">{value}</span>
                                </div>
                            ))}
                        </div>

                        {laporan.biaya_lain.length > 0 && (
                            <div className="overflow-x-auto mt-4">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nama Biaya</th>
                                            <th className="text-right py-2 text-gray-500 font-medium">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {laporan.biaya_lain.map(b => (
                                            <tr key={b.id_biaya_lain} className="border-b last:border-b-0">
                                                <td className="py-2 pr-4">{b.nama_biaya}</td>
                                                <td className="py-2 text-right">{formatRupiah(b.nominal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Dokumentasi Foto</p>

                            {laporan.foto.length === 0 ? (
                                <p className="text-gray-400 text-sm mb-3">Belum ada foto.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    {laporan.foto.map(f => (
                                        <div key={f.id_foto} className="relative group">
                                            <a href={f.url_file} target="_blank" rel="noreferrer">
                                                <img
                                                    src={f.url_file}
                                                    alt={f.keterangan ?? 'Foto laporan perjalanan'}
                                                    className="w-full max-h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                                />
                                            </a>
                                            {f.keterangan && (
                                                <p className="text-xs text-gray-500 mt-1 truncate">{f.keterangan}</p>
                                            )}
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                                onClick={() => setDeleteFotoTarget(f)}
                                            >
                                                <HiOutlineTrash className="text-xs" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                <FormItem label="Keterangan Foto" className="flex-1 mb-0">
                                    <Input
                                        size="sm"
                                        placeholder="Keterangan (opsional)"
                                        value={fotoKeterangan}
                                        onChange={e => setFotoKeterangan(e.target.value)}
                                    />
                                </FormItem>
                                <Upload accept=".jpg,.jpeg,.png,.pdf" showList={false} uploadLimit={1}
                                    onChange={files => setFotoFile(files[0] ?? null)}>
                                    <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                        {fotoFile ? fotoFile.name : 'Pilih file'}
                                    </Button>
                                </Upload>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="solid"
                                    loading={uploadingFoto}
                                    disabled={!fotoFile}
                                    onClick={handleUploadFoto}
                                >
                                    Upload
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h5>Rekap Biaya</h5>
                    {rekapLoading && <span className="text-xs text-gray-400">Memuat...</span>}
                </div>

                {!rekapLoading && (!rekap || (rekap.total_keseluruhan === 0 && rekap.estimasi_biaya == null)) ? (
                    <div className="text-gray-400 text-sm">Belum ada data biaya untuk trip ini.</div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
                            {[
                                { label: 'Total BBM',         value: rekap?.total_bbm ?? 0 },
                                { label: 'Total Uang Jalan',  value: rekap?.total_uang_jalan ?? 0 },
                                { label: 'Total Biaya Lain',  value: rekap?.total_biaya_lain ?? 0 },
                                { label: 'Total Keseluruhan', value: rekap?.total_keseluruhan ?? 0, highlight: true },
                            ].map(({ label, value, highlight }) => (
                                <div
                                    key={label}
                                    className={`rounded-lg p-3 ${highlight
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                        : 'bg-gray-50 dark:bg-gray-800'
                                    }`}
                                >
                                    <div className={`text-xs mb-1 ${highlight ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500'}`}>
                                        {label}
                                    </div>
                                    <div className={`font-semibold text-sm ${highlight ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                                        {formatRupiah(value)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {rekap && rekap.estimasi_biaya != null && (
                            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
                                <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                                    <div className="text-xs mb-1 text-gray-500">Estimasi Biaya</div>
                                    <div className="font-semibold text-sm">{formatRupiah(rekap.estimasi_biaya)}</div>
                                </div>
                                <div className={`rounded-lg p-3 border ${
                                    (rekap.selisih ?? 0) >= 0
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}>
                                    <div className={`text-xs mb-1 ${(rekap.selisih ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        Selisih
                                    </div>
                                    <div className={`font-semibold text-sm ${(rekap.selisih ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {formatRupiah(Math.abs(rekap.selisih ?? 0))} {(rekap.selisih ?? 0) >= 0 ? '(hemat)' : '(melebihi estimasi)'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {rekap && rekap.items.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nama Biaya</th>
                                            <th className="text-right py-2 text-gray-500 font-medium">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rekap.items.map(item => (
                                            <tr key={item.id_biaya_lain} className="border-b last:border-b-0">
                                                <td className="py-2 pr-4">{item.nama_biaya}</td>
                                                <td className="py-2 text-right">{formatRupiah(item.nominal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2">
                                            <td className="pt-2 pr-4 text-gray-500 font-medium">Total</td>
                                            <td className="pt-2 text-right font-bold text-blue-700 dark:text-blue-300">
                                                {formatRupiah(rekap.total_keseluruhan)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!deleteFotoTarget}
                type="danger"
                title="Hapus Foto"
                confirmText="Ya, Hapus"
                cancelText="Batal"
                onClose={() => setDeleteFotoTarget(null)}
                onCancel={() => setDeleteFotoTarget(null)}
                onConfirm={handleDeleteFoto}
                confirmButtonProps={{ loading: deletingFoto }}
            >
                <p>Hapus foto ini dari laporan perjalanan?</p>
            </ConfirmDialog>
        </div>
    )
}
