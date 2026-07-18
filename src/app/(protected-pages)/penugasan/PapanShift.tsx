'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button, FormItem, toast, Notification, Spinner, Dialog, Input, DatePicker } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { HiOutlinePlus, HiOutlinePencilAlt, HiOutlineTrash, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSearch, HiOutlineDownload } from 'react-icons/hi'
import dayjs from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { buatXlsx, kolomXlsx, SelXlsx } from '@/utils/xlsx.util'
import { jadwalShiftService, JadwalShift } from '@/services/jadwalShift.service'
import { shiftService, Shift } from '@/services/shift.service'
import { penugasanService } from '@/services/penugasan.service'
import { armadaService, Armada } from '@/services/armada.service'
import { supirService, Supir } from '@/services/supir.service'

type Option = { value: string; label: string }

const AVATAR_COLORS = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#4f46e5', '#65a30d']
const avatarColor = (nama: string) => AVATAR_COLORS[(nama.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const HARI = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']

const jam = (t: string) => t.slice(0, 5) // "08:00:00" -> "08:00"

type BarisSupir = { idSupir: string; nama: string; nopol: string | null }

type PilihanSel = { supir: BarisSupir; tanggal: string }

export default function PapanShift({ idProyek }: { idProyek: string }) {
    const [bulan, setBulan]   = useState(dayjs().startOf('month'))
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
    const [shiftForm, setShiftForm]             = useState({ nama: '', jam_mulai: '', jam_selesai: '' })
    const [shiftFormErrors, setShiftFormErrors] = useState<Record<string, string>>({})
    const [shiftSaving, setShiftSaving]         = useState(false)

    // Multi-select sel kosong papan (klik kotak) — key `${idSupir}|${tanggal}`
    const [selCells, setSelCells]       = useState<Record<string, PilihanSel>>({})
    const [bulkMode, setBulkMode]       = useState(false)
    const [downloading, setDownloading] = useState(false)

    const [deleteTarget, setDeleteTarget] = useState<JadwalShift | null>(null)
    const [deleting, setDeleting]         = useState(false)

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

    const selList = useMemo(() => Object.values(selCells), [selCells])

    const toggleSel = (supir: BarisSupir, tanggal: string) => {
        const key = `${supir.idSupir}|${tanggal}`
        setSelCells(prev => {
            const next = { ...prev }
            if (next[key]) delete next[key]
            else next[key] = { supir, tanggal }
            return next
        })
    }

    const bukaBulkAssign = () => {
        setEditJadwal(null)
        if (selList.length === 1) {
            // satu sel → mode single: rentang tanggal masih bisa dipakai
            setBulkMode(false)
            setPilihSupirId(selList[0].supir.idSupir)
            setTanggalMulai(selList[0].tanggal)
            setSampaiTanggal(selList[0].tanggal)
        } else {
            setBulkMode(true)
        }
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

    const bukaTambahShift = () => {
        setShiftForm({ nama: '', jam_mulai: '', jam_selesai: '' })
        setShiftFormErrors({})
        setShiftFormOpen(true)
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
            await shiftService.create({
                nama: shiftForm.nama,
                jam_mulai: shiftForm.jam_mulai,
                jam_selesai: shiftForm.jam_selesai,
            })
            toast.push(<Notification type="success" title="Shift berhasil ditambahkan" />)
            setShiftFormOpen(false)
            fetchShiftList()
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
            } else if (bulkMode) {
                let sukses = 0
                const gagal: { tanggal?: string; alasan: string }[] = []
                for (const c of selList) {
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

    // Ekspor papan sebagai .xlsx asli (tanpa library) — lihat utils/xlsx.util.ts
    const handleDownload = async () => {
        setDownloading(true)
        try {
            await new Promise(r => setTimeout(r, 30))
            const nKolom = tanggalList.length + 1
            const baris: SelXlsx[][] = []
            baris.push([
                { teks: `JADWAL SHIFT SUPIR — ${bulan.format('MMMM YYYY').toUpperCase()}`, gaya: 'judul' },
                ...tanggalList.map(() => ({ teks: '', gaya: 'polos' as const })),
            ])
            baris.push([
                { teks: 'Nama Supir', gaya: 'header' },
                ...tanggalList.map(t => ({ teks: String(t.date()), gaya: 'header' as const })),
            ])
            barisSupir.forEach(b => {
                baris.push([
                    { teks: b.nopol ? `${b.nama} (${b.nopol})` : b.nama, gaya: 'nama' },
                    ...tanggalList.map(t => {
                        const j = jadwalMap[b.idSupir]?.[t.format('YYYY-MM-DD')]
                        return j
                            ? { teks: `${j.shift_nama}\n${jam(j.jam_mulai)}-${jam(j.jam_selesai)}`, gaya: 'isi' as const }
                            : { teks: '', gaya: 'kosong' as const }
                    }),
                ])
            })
            const blob = buatXlsx('Jadwal Shift', baris, {
                gabung: [`A1:${kolomXlsx(nKolom - 1)}1`],
                lebarKolom: [
                    { dari: 1, sampai: 1, lebar: 32 },
                    { dari: 2, sampai: nKolom, lebar: 14 },
                ],
                tinggiBaris: Object.fromEntries(barisSupir.map((_, i) => [i + 3, 30])),
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

    return (
        <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2">
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
                <Button size="sm" variant="solid" icon={<HiOutlinePlus />}
                    title="Tambah Shift"
                    onClick={bukaTambahShift} />
            </div>

            {selList.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 dark:border-blue-500/30 dark:bg-blue-500/10">
                    <span className="text-sm font-semibold">{selList.length} tanggal terpilih</span>
                    <div className="ml-auto flex items-center gap-2">
                        <Button size="xs" variant="plain" onClick={() => setSelCells({})}>Batal</Button>
                        <Button size="xs" variant="solid" onClick={bukaBulkAssign}>
                            Assign Shift
                        </Button>
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
                    <table className="border-separate border-spacing-0 min-w-full">
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
                                                        <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 px-2 py-1.5">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-300 uppercase truncate">{j.shift_nama}</span>
                                                                <span className="flex items-center shrink-0">
                                                                    <button type="button" className="p-0.5 text-blue-500 hover:text-blue-700"
                                                                        onClick={() => bukaGanti(b, j)}>
                                                                        <HiOutlinePencilAlt className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button type="button" className="p-0.5 text-red-400 hover:text-red-600"
                                                                        onClick={() => setDeleteTarget(j)}>
                                                                        <HiOutlineTrash className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-300 whitespace-nowrap">
                                                                {jam(j.jam_mulai)} - {jam(j.jam_selesai)}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <button type="button"
                                                            className={`w-full h-12 rounded-lg border flex items-center justify-center transition-colors ${
                                                                terpilih
                                                                    ? 'border-solid border-blue-500 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300'
                                                                    : 'border-dashed border-transparent hover:border-blue-300 text-transparent hover:text-blue-400'
                                                            }`}
                                                            onClick={() => toggleSel(b, key)}>
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
            <Dialog isOpen={dialogOpen} onRequestClose={() => setDialogOpen(false)} width={440}>
                <h5 className="text-base font-semibold mb-1">{editJadwal ? 'Ganti Shift' : 'Assign Shift'}</h5>
                <p className="text-xs text-gray-400 mb-4">
                    {bulkMode
                        ? `${selList.length} tanggal terpilih — shift yang sama diterapkan ke semuanya`
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
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="plain" onClick={() => setDialogOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={saving}
                            disabled={!pilihShift || (!editJadwal && !bulkMode && !tanggalMulai)}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            {/* Dialog tambah master shift cepat */}
            <Dialog isOpen={shiftFormOpen} onRequestClose={() => setShiftFormOpen(false)} width={440}>
                <h5 className="text-base font-semibold mb-1">Tambah Shift</h5>
                <p className="text-xs text-gray-400 mb-4">Daftarkan shift baru — langsung bisa dipakai di papan ini.</p>
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
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="plain" onClick={() => setShiftFormOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={shiftSaving}>Simpan</Button>
                    </div>
                </form>
            </Dialog>

            {/* Dialog hasil rentang — tampil bila ada hari yang gagal */}
            <Dialog isOpen={!!hasilGagal} onRequestClose={() => setHasilGagal(null)} width={520}>
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
                                        <th className="py-2 pl-3 pr-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Tanggal</th>
                                        <th className="py-2 pr-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Alasan</th>
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
        </div>
    )
}
