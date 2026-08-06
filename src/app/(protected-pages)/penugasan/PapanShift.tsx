'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Button, FormItem, toast, Notification, Spinner, Dialog, Input, DatePicker } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiOutlinePlus, HiPlusCircle, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSearch, HiOutlineDownload, HiOutlineUpload, HiOutlineDocumentDownload, HiOutlineRefresh } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { buatXlsx, kolomXlsx, SelXlsx } from '@/utils/xlsx.util'
import { proyekRuteService } from '@/services/proyekRute.service'
import { jadwalShiftService, JadwalShift } from '@/services/jadwalShift.service'
import { shiftService, Shift } from '@/services/shift.service'
import { penugasanService } from '@/services/penugasan.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'
import { alokasiArmadaService } from '@/services/alokasiArmada.service'

type Option = { value: string; label: string }

const AVATAR_COLORS = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#4f46e5', '#65a30d']
const avatarColor = (nama: string) => AVATAR_COLORS[(nama.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const HARI = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']

const jam = (t: string) => t.slice(0, 5) // "08:00:00" -> "08:00"

type BarisSupir = { idSupir: string; nama: string; nopol: string | null; jenis: string | null }

type PilihanSel = { supir: BarisSupir; tanggal: string; jadwal?: JadwalShift }

export default function PapanShift({ idProyek, namaProyek = '' }: { idProyek: string; namaProyek?: string }) {
    const [bulan, setBulan]   = useState(dayjs().startOf('month'))
    const [importing, setImporting] = useState(false)
    const [downloadingTemplate, setDownloadingTemplate] = useState(false)
    const [hitungUlangLoading, setHitungUlangLoading] = useState(false)
    const [importGagal, setImportGagal] = useState<{ baris: number; no_sim: string; alasan: string }[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const selTerakhir = useRef<{ idSupir: string; tanggal: string } | null>(null)
    const [loading, setLoading] = useState(false)

    const [barisSupir, setBarisSupir]   = useState<BarisSupir[]>([])
    const [jadwalList, setJadwalList]   = useState<JadwalShift[]>([])
    const [shiftList, setShiftList]     = useState<Shift[]>([])
    const [cariSupir, setCariSupir]     = useState('')

    // Dialog assign (sel kosong) / ganti shift (ikon pensil) — supir & tanggal ikut sel yang diklik
    const [dialogOpen, setDialogOpen]       = useState(false)
    const [editJadwal, setEditJadwal]       = useState<JadwalShift | null>(null)
    const [pilihSupirId, setPilihSupirId]   = useState('')
    const [tanggalMulai, setTanggalMulai]   = useState('')
    const [pilihShift, setPilihShift]       = useState<string | null>(null)
    const [sampaiTanggal, setSampaiTanggal] = useState('') // opsional: rentang assign sampai tanggal ini
    const [saving, setSaving]               = useState(false)
    const [hasilGagal, setHasilGagal]       = useState<{ sukses: number; gagal: { tanggal?: string; alasan: string }[] } | null>(null)

    // Dialog tambah master shift cepat (tombol toolbar)
    const [shiftFormOpen, setShiftFormOpen]     = useState(false)
    const [shiftHapus, setShiftHapus]           = useState<Shift | null>(null)
    const [menghapusShift, setMenghapusShift]   = useState(false)
    const [shiftEdit, setShiftEdit]             = useState<Shift | null>(null)
    const [shiftForm, setShiftForm]             = useState({ nama: '', jam_mulai: '', jam_selesai: '' })
    const [shiftFormErrors, setShiftFormErrors] = useState<Record<string, string>>({})
    const [shiftSaving, setShiftSaving]         = useState(false)

    // Multi-select sel papan, kosong maupun terisi (klik kartu/kotak) — key `${idSupir}|${tanggal}`
    const [selCells, setSelCells]       = useState<Record<string, PilihanSel>>({})
    const [bulkMode, setBulkMode]       = useState(false)
    const [bulkAksi, setBulkAksi]       = useState<'assign' | 'ganti'>('assign')
    const [downloading, setDownloading] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<JadwalShift | null>(null)
    const [deleting, setDeleting]         = useState(false)

    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [bulkDeleting, setBulkDeleting]     = useState(false)

    const fetchShiftList = useCallback(() => {
        shiftService.list(1, 100)
            .then(res => setShiftList(res.data.filter((s: Shift) => s.aktif)))
            .catch(() => {})
    }, [])

    useEffect(() => { fetchShiftList() }, [fetchShiftList])

    const fetchBoard = useCallback(async () => {
        if (!idProyek) return
        setLoading(true)
        setSelCells({})
        try {
            const dari   = bulan.format('YYYY-MM-DD')
            const sampai = bulan.endOf('month').format('YYYY-MM-DD')
            const [penugasan, jadwal, supirRes, armadaRes] = await Promise.all([
                penugasanService.list(idProyek, 1, 'internal', 100),
                jadwalShiftService.list(idProyek, dari, sampai),
                supirService.list(1, 100),
                armadaService.list(1, 100),
            ])
            const supirMap: Record<string, Supir> = {}
            supirRes.data.forEach((s: Supir) => { supirMap[s.id_supir] = s })
            const armadaMap: Record<string, Armada> = {}
            armadaRes.data.forEach((a: Armada) => { armadaMap[a.id_armada] = a })

            const unik = new Map<string, BarisSupir>()
            penugasan.data
                .filter(p => (p.status === 'pending' || p.status === 'aktif') && p.id_supir)
                .forEach(p => {
                    if (unik.has(p.id_supir!)) return
                    const s = supirMap[p.id_supir!]
                    unik.set(p.id_supir!, {
                        idSupir: p.id_supir!,
                        nama: s?.nama ?? p.id_supir!.slice(0, 8),
                        nopol: p.id_armada ? (armadaMap[p.id_armada]?.nopol ?? null) : null,
                        jenis: p.id_armada ? (armadaMap[p.id_armada]?.nama_jenis ?? null) : null,
                    })
                })
            setBarisSupir(Array.from(unik.values()).sort((a, b) => a.nama.localeCompare(b.nama)))
            setJadwalList(jadwal)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [idProyek, bulan])

    useEffect(() => { fetchBoard() }, [fetchBoard])

    const tanggalList = useMemo(() => {
        const n = bulan.daysInMonth()
        return Array.from({ length: n }, (_, i) => bulan.date(i + 1))
    }, [bulan])

    // jadwal per supir per tanggal (maks 1 — aturan backend)
    const jadwalMap = useMemo(() => {
        const m: Record<string, Record<string, JadwalShift>> = {}
        jadwalList.forEach(j => {
            m[j.id_supir] ??= {}
            m[j.id_supir][j.tanggal] = j
        })
        return m
    }, [jadwalList])

    const barisTampil = useMemo(() => {
        const q = cariSupir.trim().toLowerCase()
        if (!q) return barisSupir
        return barisSupir.filter(b => b.nama.toLowerCase().includes(q) || (b.nopol ?? '').toLowerCase().includes(q))
    }, [barisSupir, cariSupir])

    const shiftOptions: Option[] = shiftList.map(s => ({
        value: s.id_shift,
        label: `${s.nama} — ${jam(s.jam_mulai)}-${jam(s.jam_selesai)}`,
    }))

    const countShift = (idSupir: string) => Object.keys(jadwalMap[idSupir] ?? {}).length

    const selList   = useMemo(() => Object.values(selCells), [selCells])
    const selKosong = useMemo(() => selList.filter(c => !c.jadwal), [selList])
    const selTerisi = useMemo(() => selList.filter(c => !!c.jadwal), [selList])

    const toggleSel = (supir: BarisSupir, tanggal: string, jadwal?: JadwalShift) => {
        const key = `${supir.idSupir}|${tanggal}`
        setSelCells(prev => {
            const next = { ...prev }
            if (next[key]) delete next[key]
            else next[key] = { supir, tanggal, jadwal }
            return next
        })
        selTerakhir.current = { idSupir: supir.idSupir, tanggal }
    }

    // Shift+klik: pilih rentang (persegi) dari sel terakhir diklik sampai sel ini,
    // lintas baris supir dan kolom tanggal — untuk hapus/ganti/assign massal cepat.
    const klikSel = (e: React.MouseEvent, supir: BarisSupir, tanggal: string, jadwal?: JadwalShift) => {
        if (!e.shiftKey || selTerakhir.current === null) {
            toggleSel(supir, tanggal, jadwal)
            return
        }

        const idxBaris1 = barisTampil.findIndex(b => b.idSupir === selTerakhir.current!.idSupir)
        const idxBaris2 = barisTampil.findIndex(b => b.idSupir === supir.idSupir)
        const idxTgl1   = tanggalList.findIndex(t => t.format('YYYY-MM-DD') === selTerakhir.current!.tanggal)
        const idxTgl2   = tanggalList.findIndex(t => t.format('YYYY-MM-DD') === tanggal)
        if (idxBaris1 < 0 || idxBaris2 < 0 || idxTgl1 < 0 || idxTgl2 < 0) {
            toggleSel(supir, tanggal, jadwal)
            return
        }

        const [b1, b2] = [Math.min(idxBaris1, idxBaris2), Math.max(idxBaris1, idxBaris2)]
        const [t1, t2] = [Math.min(idxTgl1, idxTgl2), Math.max(idxTgl1, idxTgl2)]

        setSelCells(prev => {
            const next = { ...prev }
            for (let bi = b1; bi <= b2; bi++) {
                const baris = barisTampil[bi]
                for (let ti = t1; ti <= t2; ti++) {
                    const tgl = tanggalList[ti].format('YYYY-MM-DD')
                    next[`${baris.idSupir}|${tgl}`] = {
                        supir: baris,
                        tanggal: tgl,
                        jadwal: jadwalMap[baris.idSupir]?.[tgl],
                    }
                }
            }
            return next
        })
        selTerakhir.current = { idSupir: supir.idSupir, tanggal }
    }

    const bukaBulkAssign = () => {
        setEditJadwal(null)
        setBulkAksi('assign')
        if (selKosong.length === 1) {
            // satu sel kosong → mode single: rentang tanggal masih bisa dipakai
            setBulkMode(false)
            setPilihSupirId(selKosong[0].supir.idSupir)
            setTanggalMulai(selKosong[0].tanggal)
            setSampaiTanggal(selKosong[0].tanggal)
        } else {
            setBulkMode(true)
        }
        setPilihShift(null)
        setDialogOpen(true)
    }

    const bukaBulkGanti = () => {
        setEditJadwal(null)
        setBulkMode(true)
        setBulkAksi('ganti')
        setPilihSupirId('')
        setTanggalMulai('')
        setSampaiTanggal('')
        setPilihShift(null)
        setDialogOpen(true)
    }

    const bukaGanti = (supir: BarisSupir, jadwal: JadwalShift) => {
        setEditJadwal(jadwal)
        setBulkMode(false)
        setPilihSupirId(supir.idSupir)
        setTanggalMulai(jadwal.tanggal)
        setPilihShift(jadwal.id_shift)
        setSampaiTanggal('')
        setDialogOpen(true)
    }

    const handleHapusShift = async () => {
        if (!shiftHapus) return
        setMenghapusShift(true)
        try {
            await shiftService.delete(shiftHapus.id_shift)
            toast.push(<Notification type="success" title="Shift berhasil dihapus" />)
            setShiftHapus(null)
            fetchShiftList()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenghapusShift(false)
        }
    }

    const bukaTambahShift = () => {
        setShiftEdit(null)
        setShiftForm({ nama: '', jam_mulai: '', jam_selesai: '' })
        setShiftFormErrors({})
        setShiftFormOpen(true)
    }

    const mulaiEditShift = (s: Shift) => {
        setShiftEdit(s)
        setShiftForm({
            nama: s.nama,
            jam_mulai: (s.jam_mulai ?? '').substring(0, 5),
            jam_selesai: (s.jam_selesai ?? '').substring(0, 5),
        })
        setShiftFormErrors({})
    }

    const batalEditShift = () => {
        setShiftEdit(null)
        setShiftForm({ nama: '', jam_mulai: '', jam_selesai: '' })
        setShiftFormErrors({})
    }

    const handleSubmitShift = async () => {
        const e: Record<string, string> = {}
        if (!shiftForm.nama.trim()) e.nama = 'Nama Shift wajib diisi'
        if (!shiftForm.jam_mulai) e.jam_mulai = 'Jam Mulai wajib diisi'
        if (!shiftForm.jam_selesai) e.jam_selesai = 'Jam Selesai wajib diisi'
        setShiftFormErrors(e)
        if (Object.keys(e).length > 0) return
        setShiftSaving(true)
        try {
            if (shiftEdit) {
                await shiftService.update(shiftEdit.id_shift, {
                    nama: shiftForm.nama,
                    jam_mulai: shiftForm.jam_mulai,
                    jam_selesai: shiftForm.jam_selesai,
                })
                toast.push(<Notification type="success" title="Shift diperbarui — semua jadwal yang memakainya ikut terbarui" />)
                batalEditShift()
                fetchShiftList()
                fetchBoard()
            } else {
                await shiftService.create({
                    nama: shiftForm.nama,
                    jam_mulai: shiftForm.jam_mulai,
                    jam_selesai: shiftForm.jam_selesai,
                })
                toast.push(<Notification type="success" title="Shift berhasil ditambahkan" />)
                setShiftFormOpen(false)
                fetchShiftList()
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setShiftSaving(false)
        }
    }

    const handleSubmit = async () => {
        if (!pilihShift) return
        setSaving(true)
        try {
            if (editJadwal) {
                await jadwalShiftService.update(editJadwal.id_jadwal_shift, { id_shift: pilihShift })
                toast.push(<Notification type="success" title="Shift berhasil diganti" />)
            } else if (bulkMode && bulkAksi === 'ganti') {
                let sukses = 0
                const gagal: { tanggal?: string; alasan: string }[] = []
                for (const c of selTerisi) {
                    try {
                        await jadwalShiftService.update(c.jadwal!.id_jadwal_shift, { id_shift: pilihShift })
                        sukses++
                    } catch (err) {
                        gagal.push({ tanggal: c.tanggal, alasan: `${c.supir.nama}: ${parseApiError(err)}` })
                    }
                }
                if (gagal.length > 0) {
                    setHasilGagal({ sukses, gagal })
                } else {
                    toast.push(<Notification type="success" title={`${sukses} shift berhasil diganti`} />)
                }
            } else if (bulkMode) {
                let sukses = 0
                const gagal: { tanggal?: string; alasan: string }[] = []
                for (const c of selKosong) {
                    try {
                        const hasil = await jadwalShiftService.create({
                            id_proyek: idProyek,
                            id_shift: pilihShift,
                            tanggal: c.tanggal,
                            tanggal_sampai: null,
                            supir: [c.supir.idSupir],
                        })
                        if (hasil.gagal.length > 0) {
                            hasil.gagal.forEach(g => gagal.push({ tanggal: g.tanggal ?? c.tanggal, alasan: `${c.supir.nama}: ${g.alasan}` }))
                        } else {
                            sukses += hasil.sukses
                        }
                    } catch (err) {
                        gagal.push({ tanggal: c.tanggal, alasan: `${c.supir.nama}: ${parseApiError(err)}` })
                    }
                }
                if (gagal.length > 0) {
                    setHasilGagal({ sukses, gagal })
                } else {
                    toast.push(<Notification type="success" title={`${sukses} tanggal berhasil dijadwalkan`} />)
                }
            } else {
                if (!pilihSupirId || !tanggalMulai) return
                const pakaiRentang = !!sampaiTanggal && sampaiTanggal > tanggalMulai
                const hasil = await jadwalShiftService.create({
                    id_proyek: idProyek,
                    id_shift: pilihShift,
                    tanggal: tanggalMulai,
                    tanggal_sampai: pakaiRentang ? sampaiTanggal : null,
                    supir: [pilihSupirId],
                })
                if (hasil.gagal.length > 0) {
                    // rentang: sebagian bisa gagal — tampilkan detail per tanggal
                    setHasilGagal({ sukses: hasil.sukses, gagal: hasil.gagal })
                } else {
                    toast.push(<Notification type="success" title={
                        pakaiRentang ? `${hasil.sukses} hari berhasil dijadwalkan` : 'Shift berhasil dijadwalkan'
                    } />)
                }
            }
            setDialogOpen(false)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await jadwalShiftService.delete(deleteTarget.id_jadwal_shift)
            toast.push(<Notification type="success" title="Jadwal shift berhasil dihapus" />)
            setDeleteTarget(null)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDeleting(false)
        }
    }

    const handleBulkDelete = async () => {
        setBulkDeleting(true)
        let sukses = 0
        const gagal: { tanggal?: string; alasan: string }[] = []
        for (const c of selTerisi) {
            try {
                await jadwalShiftService.delete(c.jadwal!.id_jadwal_shift)
                sukses++
            } catch (err) {
                gagal.push({ tanggal: c.tanggal, alasan: `${c.supir.nama}: ${parseApiError(err)}` })
            }
        }
        setBulkDeleting(false)
        setBulkDeleteOpen(false)
        if (gagal.length > 0) setHasilGagal({ sukses, gagal })
        else toast.push(<Notification type="success" title={`${sukses} jadwal shift berhasil dihapus`} />)
        fetchBoard()
    }

    // Ekspor papan sebagai .xlsx asli (tanpa library) — lihat utils/xlsx.util.ts
    const handleDownload = async () => {
        setDownloading(true)
        try {
            await new Promise(r => setTimeout(r, 30))
            const ruteProyek = await proyekRuteService.list(idProyek).catch(() => [])
            const origin = ruteProyek[0]?.asal ?? '-'
            const namaRute = ruteProyek[0]?.nama_rute ?? '-'

            const nKolom = tanggalList.length + 8
            const baris: SelXlsx[][] = []
            baris.push(Array.from({ length: nKolom }, (_, i) => ({
                teks: i === 0 ? (namaProyek || 'JADWAL SHIFT SUPIR') : '',
                gaya: 'judulKuning' as const,
            })))
            baris.push(Array.from({ length: nKolom }, (_, i) => ({
                teks: i === 0 ? `PERIODE ${bulan.format('MMMM YYYY').toUpperCase()}` : '',
                gaya: 'polos' as const,
            })))
            baris.push([
                { teks: 'NO', gaya: 'headerBiru' },
                { teks: 'ORIGIN', gaya: 'headerBiru' },
                { teks: 'ROUTE', gaya: 'headerBiru' },
                { teks: 'FLEET', gaya: 'headerBiru' },
                { teks: 'VENDOR', gaya: 'headerBiru' },
                { teks: 'NOPOL', gaya: 'headerBiru' },
                { teks: 'NAMA DRIVER', gaya: 'headerBiru' },
                { teks: 'STAND BY', gaya: 'headerBiru' },
                ...tanggalList.map(t => ({ teks: String(t.date()), gaya: 'headerBiru' as const })),
            ])
            barisSupir.forEach((b, idx) => {
                const jadwalSupir = jadwalMap[b.idSupir] ?? {}
                const adaJadwal = Object.keys(jadwalSupir).length > 0
                const pertama = Object.values(jadwalSupir)[0]
                baris.push([
                    { teks: String(idx + 1), gaya: 'hadir' },
                    { teks: origin, gaya: 'hadir' },
                    { teks: namaRute, gaya: 'hadir' },
                    { teks: b.jenis ?? '-', gaya: 'hadir' },
                    { teks: 'Internal', gaya: 'hadir' },
                    { teks: b.nopol ?? '-', gaya: 'hadir' },
                    { teks: b.nama, gaya: 'nama' },
                    { teks: pertama ? jam(pertama.jam_mulai) : '-', gaya: 'hadir' },
                    ...tanggalList.map(t => {
                        const j = jadwalSupir[t.format('YYYY-MM-DD')]
                        if (j) return { teks: 'H', gaya: 'hadir' as const }
                        return adaJadwal
                            ? { teks: 'L', gaya: 'libur' as const }
                            : { teks: '', gaya: 'kosong' as const }
                    }),
                ])
            })
            const blob = buatXlsx('Jadwal Shift', baris, {
                gabung: [
                    `A1:${kolomXlsx(nKolom - 1)}1`,
                    `A2:${kolomXlsx(nKolom - 1)}2`,
                ],
                lebarKolom: [
                    { dari: 1, sampai: 1, lebar: 5 },
                    { dari: 2, sampai: 2, lebar: 14 },
                    { dari: 3, sampai: 3, lebar: 18 },
                    { dari: 4, sampai: 5, lebar: 10 },
                    { dari: 6, sampai: 6, lebar: 14 },
                    { dari: 7, sampai: 7, lebar: 26 },
                    { dari: 8, sampai: 8, lebar: 10 },
                    { dari: 9, sampai: nKolom, lebar: 5 },
                ],
                tinggiBaris: { 1: 26 },
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `jadwal-shift-${bulan.format('YYYY-MM')}.xlsx`
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setDownloading(false)
        }
    }

    const hariIni = dayjs().format('YYYY-MM-DD')

    const handleUnduhTemplate = async () => {
        setDownloadingTemplate(true)
        try {
            await jadwalShiftService.downloadTemplate(
                idProyek,
                bulan.format('YYYY-MM-DD'),
                bulan.endOf('month').format('YYYY-MM-DD'),
            )
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setDownloadingTemplate(false)
        }
    }

    const handleHitungUlang = async () => {
        setHitungUlangLoading(true)
        try {
            const dari   = bulan.format('YYYY-MM-DD')
            const sampai = bulan.endOf('month').format('YYYY-MM-DD')
            const hasil = await alokasiArmadaService.hitungUlang({ id_proyek: idProyek, dari, sampai })
            toast.push(<Notification type="success" title={`${hasil.jumlah_dihitung_ulang} jadwal berhasil dihitung ulang alokasinya`} />)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setHitungUlangLoading(false)
        }
    }

    const handleImportFile = async (file: File | null) => {
        if (!file) return
        setImporting(true)
        try {
            const hasil = await jadwalShiftService.importExcel(idProyek, file)
            toast.push(<Notification type={hasil.gagal.length ? 'warning' : 'success'}
                title={`Import selesai: ${hasil.sukses} jadwal masuk${hasil.gagal.length ? `, ${hasil.gagal.length} gagal` : ''}`} />)
            if (hasil.gagal.length) setImportGagal(hasil.gagal)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="default" icon={<HiOutlineChevronLeft />}
                    onClick={() => setBulan(b => b.subtract(1, 'month'))} />
                <span className="font-semibold min-w-[140px] text-center">{bulan.format('MMMM YYYY')}</span>
                <Button size="sm" variant="default" icon={<HiOutlineChevronRight />}
                    onClick={() => setBulan(b => b.add(1, 'month'))} />
                <Button size="sm" variant="default" icon={<HiOutlineDownload />}
                    title="Download jadwal (.xlsx)"
                    disabled={barisSupir.length === 0}
                    loading={downloading}
                    onClick={handleDownload} />
                <Button size="sm" variant="default" icon={<HiOutlineRefresh />}
                    title="Hitung ulang alokasi armada otomatis bulan ini — pakai bila ada supir yang jadwalnya baru diubah/dihapus sehingga armadanya jadi menganggur"
                    disabled={barisSupir.length === 0}
                    loading={hitungUlangLoading}
                    onClick={handleHitungUlang}>
                    Hitung Ulang
                </Button>
                <Button size="sm" variant="solid" icon={<HiPlusCircle />}
                    title="Tambah Shift"
                    onClick={bukaTambahShift} />
                <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="default" icon={<HiOutlineDocumentDownload />}
                        title="Unduh template import"
                        loading={downloadingTemplate}
                        onClick={handleUnduhTemplate}>
                        Template
                    </Button>
                    <Button size="sm" variant="default" icon={<HiOutlineUpload />}
                        title="Import jadwal dari Excel (isi sel H = masuk, L/kosong = libur)"
                        loading={importing}
                        onClick={() => fileInputRef.current?.click()}>
                        Import Excel
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                        onChange={e => handleImportFile(e.target.files?.[0] ?? null)} />
                </div>
            </div>

            <Dialog isOpen={importGagal.length > 0} onClose={() => setImportGagal([])} onRequestClose={() => setImportGagal([])}>
                <h5 className="mb-3">Baris yang Gagal Diimport</h5>
                <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
                    {importGagal.map((g, i) => (
                        <div key={i} className="text-sm px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                            Baris {g.baris} ({g.no_sim}): {g.alasan}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end mt-4">
                    <Button size="sm" variant="solid" onClick={() => setImportGagal([])}>Tutup</Button>
                </div>
            </Dialog>

            {selList.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <span className="text-sm font-semibold">{selList.length} sel terpilih</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{selKosong.length} kosong · {selTerisi.length} terisi</span>
                    <div className="ml-auto flex items-center gap-2">
                        <Button size="xs" variant="plain" onClick={() => setSelCells({})}>Batal</Button>
                        {selTerisi.length > 0 && (
                            <>
                                <Button size="xs" variant="solid" className="bg-red-600 hover:bg-red-700"
                                    onClick={() => setBulkDeleteOpen(true)}>
                                    Hapus {selTerisi.length}
                                </Button>
                                <Button size="xs" variant="solid" onClick={bukaBulkGanti}>
                                    Ganti Shift
                                </Button>
                            </>
                        )}
                        {selKosong.length > 0 && (
                            <Button size="xs" variant="solid" onClick={bukaBulkAssign}>
                                Assign Shift
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-16"><Spinner size={36} /></div>
            ) : barisSupir.length === 0 ? (
                <p className="text-gray-400 text-sm py-10 text-center">
                    Belum ada supir ter-assign di proyek ini — buat penugasan dulu di tab Tabel.
                </p>
            ) : (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-xs">
                    <table className="border-separate border-spacing-0 min-w-full select-none">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className="sticky left-0 z-20 bg-blue-50 dark:bg-gray-800 text-left px-3 py-2 min-w-[220px] border-b border-r border-gray-200 dark:border-gray-600">
                                    <Input size="sm" placeholder="Cari nama supir / nopol..."
                                        prefix={<HiOutlineSearch className="text-gray-400" />}
                                        value={cariSupir}
                                        onChange={e => setCariSupir(e.target.value)} />
                                </th>
                                {tanggalList.map(t => {
                                    const isToday = t.format('YYYY-MM-DD') === hariIni
                                    return (
                                        <th key={t.date()} className="text-center px-2 py-2 min-w-[132px] bg-blue-50 dark:bg-blue-500/10 border-b border-r border-gray-200 dark:border-gray-600">
                                            <div className={`text-[10px] font-semibold tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                                                {HARI[t.day()]}
                                            </div>
                                            <div className={`mt-0.5 text-sm font-bold inline-flex items-center justify-center ${
                                                isToday ? 'w-7 h-7 rounded-full bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200'
                                            }`}>
                                                {t.date()}
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {barisTampil.map(b => {
                                const warna = avatarColor(b.nama)
                                return (
                                    <tr key={b.idSupir}>
                                        <td className="sticky left-0 z-10 px-3 py-3 bg-white dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-600 align-top">
                                            <div className="flex items-center gap-3">
                                                <span className="w-9 h-9 flex items-center justify-center rounded-full font-bold text-sm shrink-0"
                                                    style={{ color: warna, backgroundColor: warna + '15', border: `2px solid ${warna}` }}>
                                                    {b.nama.charAt(0).toUpperCase()}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm truncate uppercase">{b.nama}</p>
                                                    <p className="text-xs text-gray-400 font-mono truncate">{b.nopol ?? '—'}</p>
                                                    <p className="text-[11px] text-gray-400">{countShift(b.idSupir)} shift</p>
                                                </div>
                                            </div>
                                        </td>
                                        {tanggalList.map(t => {
                                            const key = t.format('YYYY-MM-DD')
                                            const j = jadwalMap[b.idSupir]?.[key]
                                            const terpilih = !!selCells[`${b.idSupir}|${key}`]
                                            return (
                                                <td key={key} className="px-1.5 py-2 border-b border-r border-gray-200 dark:border-gray-600 align-middle">
                                                    {j ? (
                                                        <div className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-shadow ${
                                                            j.status_trip === 'berjalan'
                                                                ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10'
                                                                : j.status_trip === 'selesai'
                                                                ? 'border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/10'
                                                                : 'border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10'
                                                        } ${terpilih ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}
                                                            onClick={e => klikSel(e, b, key, j)}>
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-300 uppercase truncate">{j.shift_nama}</span>
                                                                <span className="flex items-center shrink-0">
                                                                    <button type="button" className="p-0.5 text-blue-500 hover:text-blue-700"
                                                                        onClick={e => { e.stopPropagation(); bukaGanti(b, j) }}>
                                                                        <HiOutlinePencilAlt className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button type="button" className="p-0.5 text-red-400 hover:text-red-600"
                                                                        onClick={e => { e.stopPropagation(); setDeleteTarget(j) }}>
                                                                        <HiOutlineTrash className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </span>
                                                            </div>
                                                            <p className={`text-sm font-bold whitespace-nowrap ${
                                                                j.status_trip === 'berjalan'
                                                                    ? 'text-emerald-600 dark:text-emerald-300'
                                                                    : j.status_trip === 'selesai'
                                                                    ? 'text-purple-600 dark:text-purple-300'
                                                                    : 'text-blue-600 dark:text-blue-300'
                                                            }`}>
                                                                {jam(j.jam_mulai)} - {jam(j.jam_selesai)}
                                                            </p>
                                                            {j.status_trip === 'berjalan' && (
                                                                <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    SEDANG JALAN
                                                                </p>
                                                            )}
                                                            {j.status_trip === 'selesai' && (
                                                                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                                                                    ✓ SELESAI
                                                                </p>
                                                            )}
                                                            {j.nopol_alokasi && j.nopol_alokasi !== b.nopol && (
                                                                <p className="text-[10px] font-mono font-semibold text-amber-600 dark:text-amber-400 truncate"
                                                                    title="Armada pinjaman (alokasi otomatis)">
                                                                    {j.nopol_alokasi}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : countShift(b.idSupir) > 0 ? (
                                                        <button type="button"
                                                            title="Libur — klik untuk jadwalkan"
                                                            className={`w-full h-12 rounded-lg border flex items-center justify-center transition-colors ${
                                                                terpilih
                                                                    ? 'border-solid border-blue-500 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'
                                                                    : 'border-dashed border-transparent bg-red-50/80 text-red-300 hover:border-blue-300 hover:text-blue-400 dark:bg-red-500/10 dark:text-red-500/50'
                                                            }`}
                                                            onClick={e => klikSel(e, b, key)}>
                                                            {terpilih ? <HiOutlinePlus className="w-4 h-4" /> : <span className="text-[11px] font-bold tracking-wide">L</span>}
                                                        </button>
                                                    ) : (
                                                        <button type="button"
                                                            className={`w-full h-12 rounded-lg border flex items-center justify-center transition-colors ${
                                                                terpilih
                                                                    ? 'border-solid border-blue-500 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'
                                                                    : 'border-dashed border-transparent hover:border-blue-300 text-transparent hover:text-blue-400'
                                                            }`}
                                                            onClick={e => klikSel(e, b, key)}>
                                                            <HiOutlinePlus className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Dialog assign / ganti shift — dibuka dari sel papan */}
            <Dialog isOpen={dialogOpen} onRequestClose={() => setDialogOpen(false)} onClose={() => setDialogOpen(false)} width={440}>
                <h5 className="text-base font-semibold mb-1">
                    {editJadwal || (bulkMode && bulkAksi === 'ganti') ? 'Ganti Shift' : 'Assign Shift'}
                </h5>
                <p className="text-xs text-gray-400 mb-4">
                    {bulkMode && bulkAksi === 'ganti'
                        ? `${selTerisi.length} shift terpilih akan diganti ke shift yang sama`
                        : bulkMode
                        ? `${selKosong.length} tanggal terpilih — shift yang sama diterapkan ke semuanya`
                        : <>
                            {barisSupir.find(x => x.idSupir === pilihSupirId)?.nama ?? ''}
                            {editJadwal && tanggalMulai && ` — ${dayjs(tanggalMulai).format('dddd, DD MMMM YYYY')}`}
                        </>}
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                    {!editJadwal && !bulkMode && (
                        <FormItem label="Tanggal" asterisk
                            extra="Pilih rentang untuk menjadwalkan beberapa hari sekaligus — hari yang sudah terisi otomatis dilewati">
                            <DatePicker.DatePickerRange
                                placeholder="Pilih rentang tanggal..."
                                value={[
                                    tanggalMulai ? new Date(tanggalMulai) : null,
                                    sampaiTanggal ? new Date(sampaiTanggal) : null,
                                ]}
                                onChange={([awal, akhir]) => {
                                    setTanggalMulai(awal ? dayjs(awal).format('YYYY-MM-DD') : '')
                                    setSampaiTanggal(akhir ? dayjs(akhir).format('YYYY-MM-DD') : '')
                                }}
                            />
                        </FormItem>
                    )}
                    <FormItem label="Shift" asterisk>
                        <Select placeholder="Pilih shift..."
                            options={shiftOptions}
                            value={shiftOptions.find(o => o.value === pilihShift) ?? null}
                            onChange={opt => setPilihShift((opt as Option | null)?.value ?? null)} />
                    </FormItem>
                    {shiftList.length === 0 && (
                        <p className="text-xs text-amber-600 -mt-2 mb-2">
                            Belum ada master Shift — klik tombol <strong>Tambah Shift</strong> di kanan atas papan.
                        </p>
                    )}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}
                            disabled={!pilihShift || (!editJadwal && !bulkMode && !tanggalMulai)}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Dialog tambah master shift cepat */}
            <Dialog isOpen={shiftFormOpen} onRequestClose={() => setShiftFormOpen(false)} onClose={() => setShiftFormOpen(false)} width={440}>
                <h5 className="text-base font-semibold mb-1">Kelola Shift</h5>
                <p className="text-xs text-gray-400 mb-3">Daftar shift yang ada — hapus yang tidak terpakai, atau tambahkan yang baru.</p>
                {shiftList.length > 0 && (
                    <div className="flex flex-col gap-1.5 mb-4 max-h-44 overflow-y-auto">
                        {shiftList.map(s => (
                            <div key={s.id_shift}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                                    shiftEdit?.id_shift === s.id_shift
                                        ? 'border-blue-400 bg-blue-50/60 dark:border-blue-500/50 dark:bg-blue-500/10'
                                        : 'border-gray-100 dark:border-gray-700'
                                }`}>
                                <span className="flex-1 min-w-0 truncate text-sm font-medium">{s.nama}</span>
                                <span className="text-xs text-gray-400 font-mono shrink-0">{jam(s.jam_mulai)} - {jam(s.jam_selesai)}</span>
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors shrink-0"
                                    onClick={() => mulaiEditShift(s)}>
                                    <HiOutlinePencilAlt className="text-sm" />
                                </span>
                                <span
                                    className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors shrink-0"
                                    onClick={() => setShiftHapus(s)}>
                                    <HiOutlineTrash className="text-sm" />
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                        {shiftEdit ? `Edit Shift: ${shiftEdit.nama}` : 'Tambah Shift Baru'}
                    </p>
                    {shiftEdit && (
                        <button type="button" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            onClick={batalEditShift}>
                            Batal edit
                        </button>
                    )}
                </div>
                {shiftEdit && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mb-3">
                        Perubahan jam akan mengubah SEMUA jadwal yang memakai shift ini — termasuk jadwal lampau.
                        Untuk perubahan kebijakan jam ke depan, lebih aman buat shift baru.
                    </p>
                )}
                <form onSubmit={e => { e.preventDefault(); handleSubmitShift() }}>
                    <FormItem label="Nama Shift" asterisk invalid={!!shiftFormErrors.nama} errorMessage={shiftFormErrors.nama}>
                        <Input placeholder="Contoh: Shift Pagi, Shift Malam" value={shiftForm.nama} invalid={!!shiftFormErrors.nama}
                            onChange={e => setShiftForm(p => ({ ...p, nama: e.target.value }))} />
                    </FormItem>
                    <div className="grid grid-cols-2 gap-x-4">
                        <FormItem label="Jam Mulai" asterisk invalid={!!shiftFormErrors.jam_mulai} errorMessage={shiftFormErrors.jam_mulai}>
                            <Input type="time" value={shiftForm.jam_mulai} invalid={!!shiftFormErrors.jam_mulai}
                                onChange={e => setShiftForm(p => ({ ...p, jam_mulai: e.target.value }))} />
                        </FormItem>
                        <FormItem label="Jam Selesai" asterisk invalid={!!shiftFormErrors.jam_selesai} errorMessage={shiftFormErrors.jam_selesai}>
                            <Input type="time" value={shiftForm.jam_selesai} invalid={!!shiftFormErrors.jam_selesai}
                                onChange={e => setShiftForm(p => ({ ...p, jam_selesai: e.target.value }))} />
                        </FormItem>
                    </div>
                    <p className="text-xs text-gray-400 -mt-1">Jam selesai lebih kecil dari jam mulai = shift berakhir keesokan hari</p>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => { batalEditShift(); setShiftFormOpen(false) }}>Tutup</Button>
                        <Button type="submit" variant="solid" loading={shiftSaving}>
                            {shiftEdit ? 'Simpan Perubahan' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!shiftHapus} type="danger" title="Hapus Shift?"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setShiftHapus(null)}
                onCancel={() => setShiftHapus(null)}
                onConfirm={handleHapusShift}
                confirmButtonProps={{ loading: menghapusShift }}>
                <p className="text-sm">
                    Shift <span className="font-semibold">&ldquo;{shiftHapus?.nama}&rdquo;</span> akan dihapus.
                    Shift yang masih dipakai di jadwal aktif akan ditolak sistem.
                </p>
            </ConfirmDialog>

            {/* Dialog hasil rentang — tampil bila ada hari yang gagal */}
            <Dialog isOpen={!!hasilGagal} onRequestClose={() => setHasilGagal(null)} onClose={() => setHasilGagal(null)} width={520}>
                <h5 className="text-base font-semibold mb-1">Hasil Penjadwalan</h5>
                {hasilGagal && (
                    <>
                        <p className="text-sm text-gray-500 mb-4">
                            {hasilGagal.sukses} hari berhasil, {hasilGagal.gagal.length} hari dilewati.
                        </p>
                        <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2 pl-3 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Tanggal</th>
                                        <th className="py-2 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {hasilGagal.gagal.map((g, i) => (
                                        <tr key={i}>
                                            <td className="py-2 pl-3 pr-4 whitespace-nowrap font-medium">
                                                {g.tanggal ? dayjs(g.tanggal).format('DD MMM YYYY') : '—'}
                                            </td>
                                            <td className="py-2 pr-3 text-red-500 text-xs">{g.alasan}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                <div className="flex justify-end mt-5">
                    <Button variant="solid" onClick={() => setHasilGagal(null)}>Tutup</Button>
                </div>
            </Dialog>

            <ConfirmDialog isOpen={!!deleteTarget} type="danger" title="Hapus Jadwal Shift"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setDeleteTarget(null)}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                confirmButtonProps={{ loading: deleting }}>
                <p>Hapus shift <strong>{deleteTarget?.shift_nama}</strong> tanggal <strong>{deleteTarget ? dayjs(deleteTarget.tanggal).format('DD MMM YYYY') : ''}</strong>?</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={bulkDeleteOpen} type="danger" title="Hapus Jadwal Shift Terpilih"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setBulkDeleteOpen(false)}
                onCancel={() => setBulkDeleteOpen(false)}
                onConfirm={handleBulkDelete}
                confirmButtonProps={{ loading: bulkDeleting }}>
                <p>Hapus <strong>{selTerisi.length}</strong> jadwal shift yang terpilih?</p>
            </ConfirmDialog>
        </div>
    )
}
