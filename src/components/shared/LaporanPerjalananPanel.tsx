'use client'
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, FormItem, Input, Upload, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiOutlinePencilAlt, HiPlusCircle, HiOutlineX, HiOutlineDocumentText, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah, formatNum } from '@/utils/formatNumber'
import { tripService, Trip } from '@/services/trip.service'
import { laporanPerjalananService, LaporanPerjalanan, FotoLaporan } from '@/services/laporanPerjalanan.service'
import { jenisBbmService, JenisBbm } from '@/services/jenisBbm.service'

const EKSTENSI_GAMBAR = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_UKURAN_FOTO = 10 * 1024 * 1024 // 10MB

const ekstensiFile = (url: string): string =>
    (url.split('?')[0].split('.').pop() ?? '').toLowerCase()

const validasiUkuranFoto = (fileList: FileList | null): boolean | string => {
    if (!fileList) return true
    for (const f of fileList) {
        if (f.size > MAX_UKURAN_FOTO) return `Ukuran file "${f.name}" melebihi 10MB`
    }
    return true
}

/** Preview file laporan: gambar tampil apa adanya; PDF/file lain (atau gambar gagal load) tampil placeholder. */
function FotoPreview({ url, alt }: { url: string; alt: string }) {
    const [gagal, setGagal] = useState(false)
    const ekstensi = ekstensiFile(url)

    if (!EKSTENSI_GAMBAR.includes(ekstensi) || gagal) {
        return (
            <div className="w-full h-32 flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400">
                <HiOutlineDocumentText className="text-3xl" />
                <span className="text-xs font-semibold uppercase">{ekstensi || 'File'}</span>
            </div>
        )
    }

    return (
        <img
            src={url}
            alt={alt}
            className="w-full max-h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
            onError={() => setGagal(true)}
        />
    )
}

/** Preview file yang baru dipilih (belum diupload) — gambar tampil dari object URL lokal, file lain tampil placeholder. */
function LocalFotoPreview({ file }: { file: File }) {
    const isGambar = file.type.startsWith('image/')
    const url = useMemo(() => (isGambar ? URL.createObjectURL(file) : null), [file, isGambar])
    useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

    if (!url) {
        const ekstensi = (file.name.split('.').pop() ?? '').toLowerCase()
        return (
            <div className="w-full h-32 flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400">
                <HiOutlineDocumentText className="text-3xl" />
                <span className="text-xs font-semibold uppercase">{ekstensi || 'File'}</span>
            </div>
        )
    }

    return (
        <img
            src={url}
            alt={file.name}
            className="w-full max-h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
        />
    )
}

type BiayaLainRow = { nama_biaya: string; nominal: string }
type BiayaTagihanRow = { nama_biaya: string; nominal: string }

const emptyLaporanForm = () => ({
    biaya_bbm:        '',
    uang_jalan:       '',
    uang_tol:         '',
    jarak_tempuh_km:  '',
    catatan_insiden:  '',
    id_jenis_bbm:     '',
    jumlah_liter:     '',
    biaya_lain:       [] as BiayaLainRow[],
    biaya_tagihan:    [] as BiayaTagihanRow[],
})

type Props = {
    idTrip: string
    onSaved?: () => void
}

export default function LaporanPerjalananPanel({ idTrip, onSaved }: Props) {
    const searchParams = useSearchParams()
    const [trip, setTrip] = useState<Trip | null>(null)

    useEffect(() => {
        tripService.get(idTrip).then(setTrip).catch(() => {})
    }, [idTrip])

    const [laporan, setLaporan]               = useState<LaporanPerjalanan | null>(null)
    const [laporanLoading, setLaporanLoading] = useState(true)
    const [showLaporanForm, setShowLaporanForm] = useState(false)
    const [laporanForm, setLaporanForm]       = useState(emptyLaporanForm())
    const [laporanFotoFiles, setLaporanFotoFiles] = useState<File[]>([])
    const [savingLaporan, setSavingLaporan]   = useState(false)

    const [fotoFiles, setFotoFiles]           = useState<File[]>([])
    const [fotoKeterangan, setFotoKeterangan] = useState('')
    const [uploadingFoto, setUploadingFoto]   = useState(false)
    const [deleteFotoTarget, setDeleteFotoTarget] = useState<FotoLaporan | null>(null)
    const [deletingFoto, setDeletingFoto]         = useState(false)

    const [jenisBbmList, setJenisBbmList] = useState<JenisBbm[]>([])

    const fetchLaporan = useCallback(async () => {
        setLaporanLoading(true)
        try {
            setLaporan(await laporanPerjalananService.getByTrip(idTrip))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLaporanLoading(false)
        }
    }, [idTrip])

    useEffect(() => { fetchLaporan() }, [fetchLaporan])

    useEffect(() => {
        jenisBbmService.list(1, 100)
            .then(res => setJenisBbmList(res.data))
            .catch(() => {})
    }, [])

    const jenisBbmOptions = jenisBbmList
        .filter(j => j.aktif)
        .map(j => ({
            value: j.id_jenis_bbm,
            label: j.harga_per_liter != null ? `${j.nama_bbm} — ${formatRupiah(j.harga_per_liter)}/L` : j.nama_bbm,
        }))

    const mekanisme = trip?.sumber === 'vendor' ? (trip.mekanisme ?? null) : null
    const sembunyikanUangJalan = mekanisme === 'unit_driver' || mekanisme === 'full'
    const sembunyikanBiayaOps = mekanisme === 'full'
    const canIsiLaporan = !!trip && (trip.status === 'berjalan' || trip.status === 'selesai')
    const sudahDifakturkan = trip?.sudah_difakturkan ?? false

    const recalcBiayaBbm = (idJenisBbm: string, jumlahLiter: string) => {
        const jenis = jenisBbmList.find(j => j.id_jenis_bbm === idJenisBbm)
        if (jenis?.harga_per_liter != null && jumlahLiter) {
            const liter = Number(jumlahLiter)
            if (!Number.isNaN(liter)) {
                setLaporanForm(p => ({ ...p, biaya_bbm: String(Math.round(liter * jenis.harga_per_liter!)) }))
            }
        }
    }

    const handleOpenCreateLaporan = () => {
        setLaporanForm(emptyLaporanForm())
        setLaporanFotoFiles([])
        setShowLaporanForm(true)
    }

    const handleOpenEditLaporan = () => {
        if (!laporan) return
        setLaporanForm({
            biaya_bbm:       String(laporan.biaya_bbm ?? ''),
            uang_jalan:      String(laporan.uang_jalan ?? ''),
            uang_tol:        String(laporan.uang_tol ?? ''),
            jarak_tempuh_km: String(laporan.jarak_tempuh_km ?? ''),
            catatan_insiden: laporan.catatan_insiden ?? '',
            id_jenis_bbm:    laporan.id_jenis_bbm ?? '',
            jumlah_liter:    laporan.jumlah_liter != null ? String(laporan.jumlah_liter) : '',
            biaya_lain:      laporan.biaya_lain.map(b => ({ nama_biaya: b.nama_biaya, nominal: String(b.nominal) })),
            biaya_tagihan:   laporan.biaya_tagihan.map(b => ({ nama_biaya: b.nama_biaya, nominal: String(b.nominal) })),
        })
        setLaporanFotoFiles([])
        setShowLaporanForm(true)
    }

    // Auto-buka form laporan kalau datang dari tombol "Isi Laporan" di list Trip Monitor
    // (?laporan=1) — hanya sekali per kunjungan, dan cuma kalau statusnya memang boleh diisi laporan.
    const autoOpenLaporanRef = useRef(false)
    useEffect(() => {
        if (autoOpenLaporanRef.current) return
        if (!trip || laporanLoading) return
        if (searchParams.get('laporan') !== '1') return
        if (!canIsiLaporan) return

        autoOpenLaporanRef.current = true
        if (laporan) handleOpenEditLaporan()
        else handleOpenCreateLaporan()
        document.getElementById('laporan-perjalanan-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trip, laporan, laporanLoading, searchParams, canIsiLaporan])

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

    const addBiayaTagihanRow = () => {
        setLaporanForm(p => (p.biaya_tagihan.length >= 10 ? p : { ...p, biaya_tagihan: [...p.biaya_tagihan, { nama_biaya: '', nominal: '' }] }))
    }

    const removeBiayaTagihanRow = (idx: number) => {
        setLaporanForm(p => ({ ...p, biaya_tagihan: p.biaya_tagihan.filter((_, i) => i !== idx) }))
    }

    const updateBiayaTagihanRow = (idx: number, field: keyof BiayaTagihanRow, value: string) => {
        setLaporanForm(p => {
            const next = [...p.biaya_tagihan]
            next[idx] = { ...next[idx], [field]: value }
            return { ...p, biaya_tagihan: next }
        })
    }

    const handleSubmitLaporan = async () => {
        setSavingLaporan(true)
        try {
            const payload = {
                biaya_bbm:       sembunyikanBiayaOps ? 0 : Number(laporanForm.biaya_bbm) || 0,
                uang_jalan:      sembunyikanUangJalan ? 0 : Number(laporanForm.uang_jalan) || 0,
                uang_tol:        sembunyikanBiayaOps ? 0 : Number(laporanForm.uang_tol) || 0,
                jarak_tempuh_km: Number(laporanForm.jarak_tempuh_km) || 0,
                catatan_insiden: laporanForm.catatan_insiden || null,
                id_jenis_bbm:    sembunyikanBiayaOps ? null : laporanForm.id_jenis_bbm || null,
                jumlah_liter:    sembunyikanBiayaOps ? null : Number(laporanForm.jumlah_liter) || null,
                biaya_lain: sembunyikanBiayaOps ? [] : laporanForm.biaya_lain
                    .filter(b => b.nama_biaya.trim())
                    .map(b => ({ nama_biaya: b.nama_biaya, nominal: Number(b.nominal) || 0 })),
                ...(sudahDifakturkan ? {} : {
                    biaya_tagihan: laporanForm.biaya_tagihan
                        .filter(b => b.nama_biaya.trim())
                        .map(b => ({ nama_biaya: b.nama_biaya, nominal: Number(b.nominal) || 0 })),
                }),
            }
            if (laporan) {
                await laporanPerjalananService.update(laporan.id_laporan, payload, laporanFotoFiles)
                toast.push(<Notification type="success" title="Laporan perjalanan berhasil diperbarui" />)
            } else {
                await laporanPerjalananService.create(idTrip, payload, laporanFotoFiles)
                toast.push(<Notification type="success" title="Laporan perjalanan berhasil disimpan" />)
            }
            setShowLaporanForm(false)
            setLaporanFotoFiles([])
            await fetchLaporan()
            onSaved?.()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSavingLaporan(false)
        }
    }

    const handleUploadFoto = async () => {
        if (!laporan || fotoFiles.length === 0) return
        setUploadingFoto(true)
        try {
            await laporanPerjalananService.uploadFoto(laporan.id_laporan, fotoFiles, fotoKeterangan || undefined)
            toast.push(<Notification type="success" title="Foto berhasil diunggah" />)
            setFotoFiles([])
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

    return (
        <div>
            <div className="flex justify-between items-center gap-3 mb-4 pr-12">
                <h5>Laporan Perjalanan</h5>
                {laporanLoading && <span className="text-xs text-gray-400">Memuat...</span>}
                {!laporanLoading && !showLaporanForm && laporan && (
                    <Button size="sm" variant="solid" icon={<HiOutlinePencilAlt />} onClick={handleOpenEditLaporan}>
                        Edit
                    </Button>
                )}
                {!laporanLoading && !showLaporanForm && !laporan && canIsiLaporan && (
                    <Button size="sm" variant="solid" icon={<HiPlusCircle />} onClick={handleOpenCreateLaporan}>
                        Isi Laporan
                    </Button>
                )}
            </div>

            {!laporanLoading && !showLaporanForm && !laporan && !canIsiLaporan && (
                <div className="text-gray-400 text-sm">Laporan perjalanan dapat diisi setelah trip berjalan.</div>
            )}

            {showLaporanForm && (
                <form onSubmit={e => { e.preventDefault(); handleSubmitLaporan() }}>
                    {(sembunyikanUangJalan || sembunyikanBiayaOps) && (
                        <div className="rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 text-xs px-3 py-2 mb-3">
                            {sembunyikanBiayaOps
                                ? 'Biaya operasional (BBM, tol, uang jalan, biaya lain) ditanggung vendor sesuai kontrak Full — cukup isi jarak, catatan, dan foto.'
                                : 'Uang jalan ditanggung vendor sesuai kontrak Unit + Driver.'}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                        {!sembunyikanBiayaOps && (
                            <>
                                <FormItem label="Jenis BBM">
                                    <Select
                                        placeholder="Pilih jenis BBM..."
                                        options={jenisBbmOptions}
                                        value={jenisBbmOptions.find(o => o.value === laporanForm.id_jenis_bbm) ?? null}
                                        onChange={(opt) => {
                                            const idJenisBbm = opt?.value ?? ''
                                            setLaporanForm(p => ({ ...p, id_jenis_bbm: idJenisBbm }))
                                            recalcBiayaBbm(idJenisBbm, laporanForm.jumlah_liter)
                                        }}
                                        isClearable
                                    />
                                </FormItem>
                                <FormItem label="Jumlah Liter">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        suffix="L"
                                        placeholder="0"
                                        value={laporanForm.jumlah_liter}
                                        onChange={e => {
                                            const jumlahLiter = e.target.value
                                            setLaporanForm(p => ({ ...p, jumlah_liter: jumlahLiter }))
                                            recalcBiayaBbm(laporanForm.id_jenis_bbm, jumlahLiter)
                                        }}
                                    />
                                </FormItem>
                                <FormItem label="Biaya BBM (Rp)">
                                    <Input
                                        prefix="Rp"
                                        placeholder="0"
                                        value={laporanForm.biaya_bbm ? formatNum(Number(laporanForm.biaya_bbm)) : ''}
                                        onChange={e => setLaporanForm(p => ({ ...p, biaya_bbm: e.target.value.replace(/\D/g, '') }))}
                                    />
                                </FormItem>
                            </>
                        )}
                        {!sembunyikanUangJalan && (
                            <FormItem label="Uang Jalan (Rp)">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={laporanForm.uang_jalan ? formatNum(Number(laporanForm.uang_jalan)) : ''}
                                    onChange={e => setLaporanForm(p => ({ ...p, uang_jalan: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                        )}
                        {!sembunyikanBiayaOps && (
                            <FormItem label="Uang Tol (Rp)">
                                <Input
                                    prefix="Rp"
                                    placeholder="0"
                                    value={laporanForm.uang_tol ? formatNum(Number(laporanForm.uang_tol)) : ''}
                                    onChange={e => setLaporanForm(p => ({ ...p, uang_tol: e.target.value.replace(/\D/g, '') }))}
                                />
                            </FormItem>
                        )}
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

                    <div className="mt-2">
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Dokumentasi Foto</p>
                        <Upload
                            accept=".jpg,.jpeg,.png"
                            multiple
                            showList={false}
                            fileList={laporanFotoFiles}
                            beforeUpload={validasiUkuranFoto}
                            onChange={files => setLaporanFotoFiles(files)}
                        >
                            <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                Pilih foto (bisa lebih dari satu, maks. 10MB/file)
                            </Button>
                        </Upload>
                        {laporanFotoFiles.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                {laporanFotoFiles.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`} className="relative group">
                                        <LocalFotoPreview file={file} />
                                        <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                        <button
                                            type="button"
                                            className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                            onClick={() => setLaporanFotoFiles(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <HiOutlineTrash className="text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {!sembunyikanBiayaOps && (
                        <>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 mb-1">
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
                        </>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 mb-1">
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Biaya Tagihan Klien</p>
                            {sudahDifakturkan && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Terkunci — trip sudah masuk invoice</p>
                            )}
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="plain"
                            icon={<HiOutlinePlus />}
                            disabled={sudahDifakturkan || laporanForm.biaya_tagihan.length >= 10}
                            onClick={addBiayaTagihanRow}
                        >
                            Tambah Biaya
                        </Button>
                    </div>
                    {laporanForm.biaya_tagihan.length === 0 ? (
                        <p className="text-gray-400 text-xs py-2">Belum ada biaya tagihan ditambahkan.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {laporanForm.biaya_tagihan.map((row, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Input
                                        size="sm"
                                        placeholder="Nama biaya"
                                        value={row.nama_biaya}
                                        disabled={sudahDifakturkan}
                                        onChange={e => updateBiayaTagihanRow(idx, 'nama_biaya', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        size="sm"
                                        prefix="Rp"
                                        placeholder="0"
                                        value={row.nominal ? formatNum(Number(row.nominal)) : ''}
                                        disabled={sudahDifakturkan}
                                        onChange={e => updateBiayaTagihanRow(idx, 'nominal', e.target.value.replace(/\D/g, ''))}
                                        className="w-40"
                                    />
                                    <span
                                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 dark:bg-red-500/10 transition-colors flex-shrink-0 ${
                                            sudahDifakturkan ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-red-100 dark:hover:bg-red-500/20'
                                        }`}
                                        onClick={() => { if (!sudahDifakturkan) removeBiayaTagihanRow(idx) }}
                                    >
                                        <HiOutlineTrash className="text-base" />
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button size="sm" variant="plain" icon={<HiOutlineX />} onClick={() => { setShowLaporanForm(false); setLaporanFotoFiles([]) }}>
                            Batal
                        </Button>
                        <Button type="submit" size="sm" variant="solid" loading={savingLaporan}>
                            Simpan
                        </Button>
                    </div>
                </form>
            )}

            {!showLaporanForm && laporan && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                        {[
                            ...(laporan.id_jenis_bbm
                                ? [{ label: 'Jenis BBM', value: jenisBbmList.find(j => j.id_jenis_bbm === laporan.id_jenis_bbm)?.nama_bbm ?? '-' }]
                                : []),
                            ...(laporan.jumlah_liter != null
                                ? [{ label: 'Jumlah Liter', value: `${formatNum(laporan.jumlah_liter, 2)} L` }]
                                : []),
                            { label: 'Biaya BBM',      value: formatRupiah(laporan.biaya_bbm) },
                            { label: 'Uang Jalan',     value: formatRupiah(laporan.uang_jalan) },
                            { label: 'Uang Tol',       value: formatRupiah(laporan.uang_tol) },
                            { label: 'Jarak Tempuh',   value: laporan.jarak_tempuh_km != null ? `${formatNum(laporan.jarak_tempuh_km)} km` : '-' },
                            { label: 'Catatan Insiden', value: laporan.catatan_insiden || '-' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                                    {label}
                                </p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
                            </div>
                        ))}
                    </div>

                    {laporan.biaya_lain.length > 0 && (
                        <div className="overflow-x-auto mt-4">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nama Biaya</th>
                                        <th className="text-right py-2 text-gray-500 font-medium">Nominal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {laporan.biaya_lain.map(b => (
                                        <tr key={b.id_biaya_lain}>
                                            <td className="py-2 pr-4">{b.nama_biaya}</td>
                                            <td className="py-2 text-right">{formatRupiah(b.nominal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {laporan.biaya_tagihan.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Biaya Tagihan Klien</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-blue-50 dark:bg-blue-500/10">
                                        <tr className="border-b border-gray-100 dark:border-gray-700">
                                            <th className="text-left py-2 pr-4 text-gray-500 font-medium">Nama Biaya</th>
                                            <th className="text-right py-2 text-gray-500 font-medium">Nominal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {laporan.biaya_tagihan.map(b => (
                                            <tr key={b.id_biaya_tagihan}>
                                                <td className="py-2 pr-4">{b.nama_biaya}</td>
                                                <td className="py-2 text-right">{formatRupiah(b.nominal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                                            <FotoPreview url={f.url_file} alt={f.keterangan ?? 'Foto laporan perjalanan'} />
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
                            <FormItem label="File" asterisk className="mb-0">
                                <Upload accept=".jpg,.jpeg,.png" showList={false} multiple
                                    fileList={fotoFiles}
                                    beforeUpload={validasiUkuranFoto}
                                    onChange={files => setFotoFiles(files)}>
                                    <Button type="button" variant="default" size="sm" icon={<HiOutlineDocumentText />}>
                                        {fotoFiles.length > 0 ? `${fotoFiles.length} foto dipilih` : 'Pilih foto (bisa lebih dari satu)'}
                                    </Button>
                                </Upload>
                            </FormItem>
                            <Button
                                type="button"
                                size="sm"
                                variant="solid"
                                loading={uploadingFoto}
                                disabled={fotoFiles.length === 0}
                                onClick={handleUploadFoto}
                            >
                                Upload
                            </Button>
                        </div>

                        {fotoFiles.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                {fotoFiles.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`} className="relative group">
                                        <LocalFotoPreview file={file} />
                                        <p className="text-xs text-gray-500 mt-1 truncate">{file.name}</p>
                                        <button
                                            type="button"
                                            className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full bg-white/90 dark:bg-gray-800/90 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 shadow"
                                            onClick={() => setFotoFiles(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <HiOutlineTrash className="text-xs" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

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
