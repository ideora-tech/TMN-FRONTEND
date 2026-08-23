'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Button, FormItem, toast, Notification, Spinner, Dialog, Input, DatePicker, Checkbox, Tag, Dropdown } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LaporanPerjalananPanel from '@/components/shared/LaporanPerjalananPanel'
import { HiOutlinePlus, HiOutlineTrash, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSearch, HiOutlineEye } from 'react-icons/hi'
import dayjs, { Dayjs } from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import {
    penugasanHarianService,
    BoardUnit as BoardUnitRow,
    BoardAssignment,
    AssignHarianGagal,
} from '@/services/penugasanHarian.service'
import { penugasanService } from '@/services/penugasan.service'
import { projectService } from '@/services/project.service'
import { proyekRuteService, ProyekRute } from '@/services/proyekRute.service'
import { supirService, Supir } from '@/services/supir.service'
import { tripService } from '@/services/trip.service'
import MulaiTripDialog from '../trip/MulaiTripDialog'

type Option = { value: string; label: string }

const AVATAR_COLORS = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#4f46e5', '#65a30d']
const avatarColor = (teks: string) => AVATAR_COLORS[(teks.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const HARI = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']

const unitKey = (u: BoardUnitRow) => (u.tipe === 'internal' ? `internal:${u.id_armada}` : `vendor:${u.id_armada_vendor}`)

const emptyTitikDrop = (): string[] => []

type HasilAssign = { sukses: number; gagal: AssignHarianGagal[]; peringatan: string[] }

export default function BoardUnit() {
    const [bulan, setBulan] = useState<Dayjs>(dayjs().startOf('month'))
    const [loading, setLoading] = useState(false)
    const [units, setUnits] = useState<BoardUnitRow[]>([])
    const [assignments, setAssignments] = useState<BoardAssignment[]>([])
    const [cariUnit, setCariUnit] = useState('')
    const todayColRef = useRef<HTMLTableCellElement>(null)

    const [supirAktif, setSupirAktif] = useState<Supir[]>([])
    const [proyekOptions, setProyekOptions] = useState<Option[]>([])

    const [assignDialogOpen, setAssignDialogOpen] = useState(false)
    const [assignUnit, setAssignUnit] = useState<BoardUnitRow | null>(null)
    const [assignTanggalMulai, setAssignTanggalMulai] = useState('')
    const [assignTanggalSampai, setAssignTanggalSampai] = useState('')
    const [assignSupirId, setAssignSupirId] = useState('')
    const [assignProyekId, setAssignProyekId] = useState('')
    const [assignRuteId, setAssignRuteId] = useState<string | null>(null)
    const [assignRuteRows, setAssignRuteRows] = useState<ProyekRute[]>([])
    const [assignUangJalan, setAssignUangJalan] = useState('')
    const [assignTitikDrop, setAssignTitikDrop] = useState<string[]>(emptyTitikDrop())
    const [assignSubmitting, setAssignSubmitting] = useState(false)
    const [hasilAssign, setHasilAssign] = useState<HasilAssign | null>(null)

    const [aksiDialogOpen, setAksiDialogOpen] = useState(false)
    const [aksiAssignment, setAksiAssignment] = useState<BoardAssignment | null>(null)
    const [aksiUnit, setAksiUnit] = useState<BoardUnitRow | null>(null)
    const [aksiSupirId, setAksiSupirId] = useState('')
    const [aksiRuteId, setAksiRuteId] = useState<string | null>(null)
    const [aksiRuteRows, setAksiRuteRows] = useState<ProyekRute[]>([])
    const [aksiUangJalan, setAksiUangJalan] = useState('')
    const [aksiTitikDrop, setAksiTitikDrop] = useState<string[]>(emptyTitikDrop())
    const [aksiSaving, setAksiSaving] = useState(false)

    const [hapusTarget, setHapusTarget] = useState<BoardAssignment | null>(null)
    const [menghapus, setMenghapus] = useState(false)

    const [batalTripTarget, setBatalTripTarget] = useState<string | null>(null)
    const [membatalkanTrip, setMembatalkanTrip] = useState(false)
    const [selesaiTripTarget, setSelesaiTripTarget] = useState<string | null>(null)
    const [selesaikanPenugasanJuga, setSelesaikanPenugasanJuga] = useState(false)
    const [menyelesaikanTrip, setMenyelesaikanTrip] = useState(false)
    const [showMulaiTripDariSel, setShowMulaiTripDariSel] = useState(false)
    const [laporanDialogTrip, setLaporanDialogTrip] = useState<string | null>(null)
    const aksiFetchRef = useRef<string | null>(null)
    const assignRuteFetchRef = useRef<string | null>(null)

    const fetchBoard = useCallback(async () => {
        setLoading(true)
        try {
            const dari   = bulan.format('YYYY-MM-DD')
            const sampai = bulan.endOf('month').format('YYYY-MM-DD')
            const hasil = await penugasanHarianService.board(dari, sampai)
            setUnits(hasil.units)
            setAssignments(hasil.assignments)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setLoading(false)
        }
    }, [bulan])

    useEffect(() => { fetchBoard() }, [fetchBoard])

    useEffect(() => {
        supirService.list(1, 500, undefined, 'aktif').then(res => setSupirAktif(res.data)).catch(() => {})
        projectService.list(1, 500).then(res => setProyekOptions(
            res.data.map(p => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))
        )).catch(() => {})
    }, [])

    const unitsTampil = useMemo(() => {
        const q = cariUnit.trim().toLowerCase()
        const terurut = [...units].sort((a, b) => a.nopol.localeCompare(b.nopol))
        if (!q) return terurut
        return terurut.filter(u =>
            u.nopol.toLowerCase().includes(q) ||
            (u.nama_jenis ?? '').toLowerCase().includes(q) ||
            (u.nama_vendor ?? '').toLowerCase().includes(q))
    }, [units, cariUnit])

    const tanggalList = useMemo(() => {
        const n = bulan.daysInMonth()
        return Array.from({ length: n }, (_, i) => bulan.date(i + 1))
    }, [bulan])

    /** Assignment berstatus 'batal' sengaja diabaikan di sini — backend tidak menganggapnya menghuni tanggal tersebut (lihat adaPenugasanUnitPadaTanggal), jadi sel tetap tampil kosong/bisa diisi lagi. */
    const assignMap = useMemo(() => {
        const m: Record<string, Record<string, BoardAssignment>> = {}
        assignments.filter(a => a.status !== 'batal').forEach(a => {
            const key = a.id_armada ? `internal:${a.id_armada}` : a.id_armada_vendor ? `vendor:${a.id_armada_vendor}` : null
            if (!key) return
            m[key] ??= {}
            m[key][a.tanggal] = a
        })
        return m
    }, [assignments])

    useEffect(() => {
        if (!loading && unitsTampil.length > 0 && todayColRef.current) {
            todayColRef.current.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
        }
    }, [loading, bulan, unitsTampil.length])

    const supirOptions: Option[] = supirAktif.map(s => ({ value: s.id_supir, label: s.nama }))

    const aksiSupirOptions = useMemo(() => {
        const opts = [...supirOptions]
        if (aksiAssignment?.id_supir && !opts.some(o => o.value === aksiAssignment.id_supir)) {
            opts.push({ value: aksiAssignment.id_supir, label: `${aksiAssignment.nama_supir ?? aksiAssignment.id_supir.slice(0, 8)} (Nonaktif)` })
        }
        return opts
    }, [supirOptions, aksiAssignment])

    const assignRuteOptions: Option[] = assignRuteRows.map(r => ({ value: r.id_rute, label: r.nama_rute ?? r.kode_rute ?? r.id_rute }))
    const aksiRuteOptions: Option[] = aksiRuteRows.map(r => ({ value: r.id_rute, label: r.nama_rute ?? r.kode_rute ?? r.id_rute }))

    const bukaAssignDialog = (unit: BoardUnitRow, tanggal: string) => {
        setAssignUnit(unit)
        setAssignTanggalMulai(tanggal)
        setAssignTanggalSampai(tanggal)
        setAssignSupirId(unit.id_supir_default ?? '')
        setAssignProyekId('')
        setAssignRuteId(null)
        setAssignRuteRows([])
        setAssignUangJalan('')
        setAssignTitikDrop(emptyTitikDrop())
        setAssignDialogOpen(true)
    }

    useEffect(() => {
        if (!assignDialogOpen || !assignProyekId) return
        setAssignRuteId(null)
        setAssignRuteRows([])
        assignRuteFetchRef.current = assignProyekId
        const idProyekDiminta = assignProyekId
        proyekRuteService.list(assignProyekId)
            .then(rows => { if (assignRuteFetchRef.current === idProyekDiminta) setAssignRuteRows(rows) })
            .catch(() => { if (assignRuteFetchRef.current === idProyekDiminta) setAssignRuteRows([]) })
    }, [assignDialogOpen, assignProyekId])

    const handleSubmitAssign = async () => {
        if (!assignUnit || !assignSupirId || !assignProyekId || !assignRuteId || !assignTanggalMulai) return
        setAssignSubmitting(true)
        try {
            const pakaiRentang = !!assignTanggalSampai && assignTanggalSampai > assignTanggalMulai
            const titikDropBersih = assignTitikDrop.map(d => d.trim()).filter(Boolean)
            const hasil = await penugasanHarianService.assign({
                tanggal: assignTanggalMulai,
                tanggal_sampai: pakaiRentang ? assignTanggalSampai : null,
                id_supir: assignSupirId,
                id_proyek: assignProyekId,
                id_rute: assignRuteId,
                uang_jalan: assignUangJalan !== '' ? Number(assignUangJalan) : null,
                ...(assignUnit.tipe === 'internal' ? { id_armada: assignUnit.id_armada } : { id_armada_vendor: assignUnit.id_armada_vendor }),
                ...(titikDropBersih.length > 0 ? { titik_drop: titikDropBersih } : {}),
            })
            setAssignDialogOpen(false)
            fetchBoard()
            if (hasil.gagal.length > 0) {
                setHasilAssign({ sukses: hasil.sukses, gagal: hasil.gagal, peringatan: hasil.peringatan })
            } else {
                toast.push(<Notification type="success" title={
                    pakaiRentang ? `${hasil.sukses} hari berhasil dijadwalkan` : 'Penugasan berhasil dijadwalkan'
                } />)
                if (hasil.peringatan.length > 0) {
                    toast.push(<Notification type="warning" title="Pengajuan uang jalan" duration={6000}>{hasil.peringatan.join('; ')}</Notification>)
                }
            }
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAssignSubmitting(false)
        }
    }

    const bukaAksi = (assignment: BoardAssignment, unit: BoardUnitRow) => {
        setAksiAssignment(assignment)
        setAksiUnit(unit)
        setAksiSupirId(assignment.id_supir ?? '')
        setAksiRuteId(assignment.id_rute)
        setAksiUangJalan(assignment.estimasi_biaya != null ? String(Math.round(assignment.estimasi_biaya)) : '')
        setAksiTitikDrop(emptyTitikDrop())
        setAksiRuteRows([])
        setAksiDialogOpen(true)
        aksiFetchRef.current = assignment.id_penugasan
        penugasanService.get(assignment.id_penugasan)
            .then(record => {
                if (aksiFetchRef.current === assignment.id_penugasan) setAksiTitikDrop(record.titik_drop ?? [])
            })
            .catch(() => {})
    }

    useEffect(() => {
        if (!aksiDialogOpen || !aksiAssignment) return
        const idPenugasanDiminta = aksiAssignment.id_penugasan
        proyekRuteService.list(aksiAssignment.id_proyek)
            .then(rows => { if (aksiFetchRef.current === idPenugasanDiminta) setAksiRuteRows(rows) })
            .catch(() => { if (aksiFetchRef.current === idPenugasanDiminta) setAksiRuteRows([]) })
    }, [aksiDialogOpen, aksiAssignment])

    const tutupAksi = () => setAksiDialogOpen(false)

    const handleSubmitAksi = async () => {
        if (!aksiAssignment || !aksiSupirId || !aksiRuteId) return
        setAksiSaving(true)
        try {
            await penugasanHarianService.update(aksiAssignment.id_penugasan, {
                id_supir:       aksiSupirId,
                id_rute:        aksiRuteId,
                estimasi_biaya: aksiUangJalan !== '' ? Number(aksiUangJalan) : null,
                titik_drop:     aksiTitikDrop.map(d => d.trim()).filter(Boolean),
            })
            toast.push(<Notification type="success" title="Penugasan berhasil diperbarui" />)
            setAksiDialogOpen(false)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setAksiSaving(false)
        }
    }

    const handleHapus = async () => {
        if (!hapusTarget) return
        setMenghapus(true)
        try {
            await penugasanHarianService.hapus(hapusTarget.id_penugasan)
            toast.push(<Notification type="success" title="Penugasan berhasil dihapus" />)
            setHapusTarget(null)
            setAksiDialogOpen(false)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenghapus(false)
        }
    }

    const handleBatalTrip = async () => {
        if (!batalTripTarget) return
        setMembatalkanTrip(true)
        try {
            await tripService.batalkan(batalTripTarget)
            toast.push(<Notification type="success" title="Trip berhasil dibatalkan" />)
            setBatalTripTarget(null)
            setAksiDialogOpen(false)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMembatalkanTrip(false)
        }
    }

    const handleSelesaikanTrip = async () => {
        if (!selesaiTripTarget) return
        setMenyelesaikanTrip(true)
        try {
            await tripService.checkout(selesaiTripTarget, selesaikanPenugasanJuga)
            toast.push(<Notification type="success" title="Trip berhasil diselesaikan" />)
            setSelesaiTripTarget(null)
            setSelesaikanPenugasanJuga(false)
            setAksiDialogOpen(false)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyelesaikanTrip(false)
        }
    }

    const hariIni = dayjs().format('YYYY-MM-DD')
    const tripBerjalanAksi = aksiAssignment?.trips.find(t => t.status === 'berjalan') ?? null
    const tripTerakhirAksi = aksiAssignment && aksiAssignment.trips.length > 0 ? aksiAssignment.trips[aksiAssignment.trips.length - 1] : null

    return (
        <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="default" icon={<HiOutlineChevronLeft />}
                    onClick={() => setBulan(b => b.subtract(1, 'month'))} />
                <span className="font-semibold min-w-[140px] text-center">{bulan.format('MMMM YYYY')}</span>
                <Button size="sm" variant="default" icon={<HiOutlineChevronRight />}
                    onClick={() => setBulan(b => b.add(1, 'month'))} />
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Spinner size={36} /></div>
            ) : units.length === 0 ? (
                <p className="text-gray-400 text-sm py-10 text-center">
                    Belum ada unit armada aktif — tambahkan armada atau unit vendor Unit Only terlebih dahulu.
                </p>
            ) : (
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-xs">
                    <table className="border-separate border-spacing-0 min-w-full select-none">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className="sticky left-0 z-20 bg-blue-50 dark:bg-gray-800 text-left px-3 py-2 min-w-[260px] border-b border-r border-gray-200 dark:border-gray-600">
                                    <Input size="sm" placeholder="Cari nopol / jenis / vendor..."
                                        prefix={<HiOutlineSearch className="text-gray-400" />}
                                        value={cariUnit}
                                        onChange={e => setCariUnit(e.target.value)} />
                                </th>
                                {tanggalList.map(t => {
                                    const isToday = t.format('YYYY-MM-DD') === hariIni
                                    return (
                                        <th key={t.date()} ref={isToday ? todayColRef : undefined} className="text-center px-2 py-2 min-w-[132px] bg-blue-50 dark:bg-blue-500/10 border-b border-r border-gray-200 dark:border-gray-600">
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
                            {unitsTampil.map(u => {
                                const warna = avatarColor(u.nopol)
                                const key = unitKey(u)
                                return (
                                    <tr key={key}>
                                        <td className="sticky left-0 z-10 px-3 py-3 bg-white dark:bg-gray-900 border-b border-r border-gray-200 dark:border-gray-600 align-top">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-9 h-9 flex items-center justify-center rounded-full font-bold text-sm shrink-0"
                                                    style={{ color: warna, backgroundColor: warna + '15', border: `2px solid ${warna}` }}>
                                                    {u.nopol.charAt(0).toUpperCase()}
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-semibold text-sm truncate font-mono">{u.nopol}</p>
                                                        {u.tipe === 'vendor' && (
                                                            <Tag className="text-[10px] shrink-0 bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                                                                Vendor
                                                            </Tag>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 truncate">
                                                        {u.nama_jenis ?? '—'}
                                                        {u.nama_vendor && <span className="ml-1 text-blue-500">· {u.nama_vendor}</span>}
                                                    </p>
                                                    {u.nama_supir_default && (
                                                        <p className="text-[11px] text-gray-400 truncate">Default: {u.nama_supir_default}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {tanggalList.map(t => {
                                            const tglKey = t.format('YYYY-MM-DD')
                                            const a = assignMap[key]?.[tglKey]
                                            return (
                                                <td key={tglKey} className="px-1.5 py-2 border-b border-r border-gray-200 dark:border-gray-600 align-middle">
                                                    {a ? (
                                                        (() => {
                                                            const berjalan = a.trips.some(tr => tr.status === 'berjalan')
                                                            const selesaiSemua = !berjalan && a.trips.length > 0
                                                            const kelasWarna = berjalan
                                                                ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10'
                                                                : selesaiSemua
                                                                ? 'border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/10'
                                                                : 'border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10'
                                                            return (
                                                                <div className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-shadow ${kelasWarna}`}
                                                                    onClick={() => bukaAksi(a, u)}>
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-300 truncate">
                                                                            {a.kode_proyek ?? '—'}
                                                                        </span>
                                                                        <span className="flex items-center shrink-0">
                                                                            {a.trips.length > 1 ? (
                                                                                <Dropdown
                                                                                    placement="bottom-end"
                                                                                    renderTitle={
                                                                                        <span className="relative inline-flex p-0.5 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 cursor-pointer"
                                                                                            title={`${a.trips.length} trip hari ini`}
                                                                                            onClick={e => e.stopPropagation()}>
                                                                                            <HiOutlineEye className="w-3.5 h-3.5" />
                                                                                            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold leading-none">
                                                                                                {a.trips.length}
                                                                                            </span>
                                                                                        </span>
                                                                                    }
                                                                                >
                                                                                    {a.trips.map((trip, idx) => (
                                                                                        <Dropdown.Item key={trip.id_trip} eventKey={trip.id_trip}
                                                                                            onClick={() => window.open(ROUTES.TRIP_DETAIL(trip.id_trip), '_blank', 'noopener')}>
                                                                                            <span className="flex items-center gap-2 text-sm whitespace-nowrap">
                                                                                                Rit {idx + 1}
                                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                                                                                    trip.status === 'berjalan'
                                                                                                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
                                                                                                        : 'bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300'
                                                                                                }`}>
                                                                                                    {trip.status === 'berjalan' ? 'Sedang Jalan' : 'Selesai'}
                                                                                                </span>
                                                                                            </span>
                                                                                        </Dropdown.Item>
                                                                                    ))}
                                                                                </Dropdown>
                                                                            ) : a.trips.length === 1 ? (
                                                                                <button type="button" className="p-0.5 text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                                                                                    title={a.trips[0].status === 'berjalan' ? 'Lihat trip yang sedang jalan' : 'Lihat trip selesai'}
                                                                                    onClick={e => { e.stopPropagation(); window.open(ROUTES.TRIP_DETAIL(a.trips[0].id_trip), '_blank', 'noopener') }}>
                                                                                    <HiOutlineEye className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            ) : null}
                                                                            <button type="button" className="p-0.5 text-red-400 hover:text-red-600"
                                                                                onClick={e => { e.stopPropagation(); setHapusTarget(a) }}>
                                                                                <HiOutlineTrash className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-300 uppercase truncate">{a.nama_rute ?? '—'}</p>
                                                                    <p className="text-[11px] text-gray-500 dark:text-gray-300 truncate">{a.nama_supir ?? '—'}</p>
                                                                    {berjalan && (
                                                                        <p className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                            SEDANG JALAN
                                                                        </p>
                                                                    )}
                                                                    {selesaiSemua && (
                                                                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400">✓ SELESAI</p>
                                                                    )}
                                                                </div>
                                                            )
                                                        })()
                                                    ) : (
                                                        <button type="button"
                                                            className="w-full h-12 rounded-lg border border-dashed border-transparent hover:border-blue-300 text-transparent hover:text-blue-400 flex items-center justify-center transition-colors"
                                                            onClick={() => bukaAssignDialog(u, tglKey)}>
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

            <Dialog isOpen={assignDialogOpen} onRequestClose={() => setAssignDialogOpen(false)} onClose={() => setAssignDialogOpen(false)} width={560}>
                <h5 className="text-base font-semibold mb-1">Tambah Penugasan Harian</h5>
                <p className="text-xs text-gray-400 mb-4">
                    {assignUnit?.nopol}
                    {assignUnit?.tipe === 'vendor' && assignUnit?.nama_vendor ? ` · Vendor ${assignUnit.nama_vendor}` : ''}
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitAssign() }}>
                    <FormItem label="Tanggal" asterisk
                        extra="Pilih rentang untuk menjadwalkan beberapa hari sekaligus — hari yang sudah terisi otomatis dilewati">
                        <DatePicker.DatePickerRange
                            placeholder="Pilih rentang tanggal..."
                            value={[
                                assignTanggalMulai ? new Date(assignTanggalMulai) : null,
                                assignTanggalSampai ? new Date(assignTanggalSampai) : null,
                            ]}
                            onChange={([awal, akhir]) => {
                                setAssignTanggalMulai(awal ? dayjs(awal).format('YYYY-MM-DD') : '')
                                setAssignTanggalSampai(akhir ? dayjs(akhir).format('YYYY-MM-DD') : '')
                            }}
                        />
                    </FormItem>
                    <FormItem label="Supir" asterisk>
                        <Select placeholder="Pilih supir..."
                            options={supirOptions}
                            value={supirOptions.find(o => o.value === assignSupirId) ?? null}
                            onChange={opt => setAssignSupirId((opt as Option | null)?.value ?? '')} />
                    </FormItem>
                    <FormItem label="Proyek" asterisk>
                        <Select placeholder="Pilih proyek..."
                            options={proyekOptions}
                            value={proyekOptions.find(o => o.value === assignProyekId) ?? null}
                            onChange={opt => setAssignProyekId((opt as Option | null)?.value ?? '')} />
                    </FormItem>
                    <FormItem label="Rute" asterisk>
                        <Select
                            isDisabled={!assignProyekId}
                            placeholder={!assignProyekId ? 'Pilih proyek dahulu...' : assignRuteOptions.length === 0 ? 'Belum ada rute terdaftar untuk proyek ini' : 'Pilih rute...'}
                            options={assignRuteOptions}
                            value={assignRuteOptions.find(o => o.value === assignRuteId) ?? null}
                            onChange={opt => {
                                const idRute = (opt as Option | null)?.value ?? null
                                setAssignRuteId(idRute)
                                const row = idRute ? assignRuteRows.find(r => r.id_rute === idRute) : null
                                setAssignUangJalan(row?.uang_jalan != null ? String(Math.round(row.uang_jalan)) : '')
                            }} />
                    </FormItem>
                    <FormItem label="Uang Jalan" extra="Otomatis dari rate card rute — bisa diubah">
                        <Input prefix="Rp" placeholder="0"
                            value={assignUangJalan ? formatNum(Number(assignUangJalan)) : ''}
                            onChange={e => setAssignUangJalan(e.target.value.replace(/\D/g, ''))} />
                    </FormItem>
                    <div className="mt-1 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">Titik Drop (opsional)</p>
                            <Button type="button" size="xs" variant="plain" icon={<HiOutlinePlus />}
                                disabled={assignTitikDrop.length >= 10}
                                onClick={() => setAssignTitikDrop(prev => [...prev, ''])}>
                                Tambah Titik
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {assignTitikDrop.map((lokasi, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                    <Input size="sm" placeholder={`Titik drop ${i + 1}...`} value={lokasi}
                                        onChange={e => setAssignTitikDrop(prev => prev.map((d, idx) => (idx === i ? e.target.value : d)))} />
                                    <button type="button"
                                        onClick={() => setAssignTitikDrop(prev => prev.filter((_, idx) => idx !== i))}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={() => setAssignDialogOpen(false)}>Batal</Button>
                        <Button type="submit" variant="solid" loading={assignSubmitting}
                            disabled={!assignSupirId || !assignProyekId || !assignRuteId || !assignTanggalMulai}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <Dialog isOpen={!!hasilAssign} onRequestClose={() => setHasilAssign(null)} onClose={() => setHasilAssign(null)} width={520}>
                <h5 className="text-base font-semibold mb-1">Hasil Penugasan Harian</h5>
                {hasilAssign && (
                    <>
                        <p className="text-sm text-gray-500 mb-3">
                            {hasilAssign.sukses} tanggal berhasil, {hasilAssign.gagal.length} tanggal dilewati.
                        </p>
                        {hasilAssign.peringatan.length > 0 && (
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs px-3 py-2 mb-3">
                                {hasilAssign.peringatan.join('; ')}
                            </div>
                        )}
                        <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10 sticky top-0">
                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                        <th className="py-2 pl-3 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Tanggal</th>
                                        <th className="py-2 pr-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-100 uppercase tracking-wide">Alasan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {hasilAssign.gagal.map((g, i) => (
                                        <tr key={i}>
                                            <td className="py-2 pl-3 pr-4 whitespace-nowrap font-medium">{dayjs(g.tanggal).format('DD MMM YYYY')}</td>
                                            <td className="py-2 pr-3 text-red-500 text-xs">{g.alasan}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                <div className="flex justify-end mt-5">
                    <Button variant="solid" onClick={() => setHasilAssign(null)}>Tutup</Button>
                </div>
            </Dialog>

            <Dialog isOpen={aksiDialogOpen} onRequestClose={tutupAksi} onClose={tutupAksi} width={560}>
                <h5 className="text-base font-semibold mb-1">Detail Penugasan</h5>
                <p className="text-xs text-gray-400 mb-4">
                    {aksiUnit?.nopol} — {aksiAssignment?.kode_proyek ?? '—'}
                    {aksiAssignment && ` · ${dayjs(aksiAssignment.tanggal).format('dddd, DD MMMM YYYY')}`}
                </p>
                <form onSubmit={e => { e.preventDefault(); handleSubmitAksi() }}>
                    <FormItem label="Supir" asterisk>
                        <Select placeholder="Pilih supir..."
                            options={aksiSupirOptions}
                            value={aksiSupirOptions.find(o => o.value === aksiSupirId) ?? null}
                            onChange={opt => setAksiSupirId((opt as Option | null)?.value ?? '')} />
                        {aksiAssignment?.id_pengajuan && aksiSupirId !== (aksiAssignment?.id_supir ?? '') && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Pengajuan uang jalan supir lama akan disesuaikan; tanggal ini tidak lagi punya pengajuan otomatis.
                            </p>
                        )}
                    </FormItem>
                    <FormItem label="Rute" asterisk>
                        <Select placeholder="Pilih rute..."
                            options={aksiRuteOptions}
                            value={aksiRuteOptions.find(o => o.value === aksiRuteId) ?? null}
                            onChange={opt => {
                                const idRute = (opt as Option | null)?.value ?? null
                                setAksiRuteId(idRute)
                                const row = idRute ? aksiRuteRows.find(r => r.id_rute === idRute) : null
                                if (row?.uang_jalan != null) setAksiUangJalan(String(Math.round(row.uang_jalan)))
                            }} />
                    </FormItem>
                    <FormItem label="Uang Jalan">
                        <Input prefix="Rp" placeholder="0"
                            value={aksiUangJalan ? formatNum(Number(aksiUangJalan)) : ''}
                            onChange={e => setAksiUangJalan(e.target.value.replace(/\D/g, ''))} />
                    </FormItem>
                    <div className="mt-1 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold">Titik Drop (opsional)</p>
                            <Button type="button" size="xs" variant="plain" icon={<HiOutlinePlus />}
                                disabled={aksiTitikDrop.length >= 10}
                                onClick={() => setAksiTitikDrop(prev => [...prev, ''])}>
                                Tambah Titik
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {aksiTitikDrop.map((lokasi, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                    <Input size="sm" placeholder={`Titik drop ${i + 1}...`} value={lokasi}
                                        onChange={e => setAksiTitikDrop(prev => prev.map((d, idx) => (idx === i ? e.target.value : d)))} />
                                    <button type="button"
                                        onClick={() => setAksiTitikDrop(prev => prev.filter((_, idx) => idx !== i))}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 transition-colors">
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={tutupAksi}>Tutup</Button>
                        <Button type="button" variant="solid" className="bg-red-600 hover:bg-red-700"
                            onClick={() => aksiAssignment && setHapusTarget(aksiAssignment)}>
                            Hapus
                        </Button>
                        {tripTerakhirAksi && (
                            <Button type="button" variant="default" onClick={() => setLaporanDialogTrip(tripTerakhirAksi.id_trip)}>
                                Isi Laporan
                            </Button>
                        )}
                        {tripBerjalanAksi ? (
                            <>
                                <Button type="button" variant="solid" className="bg-red-600 hover:bg-red-700"
                                    onClick={() => setBatalTripTarget(tripBerjalanAksi.id_trip)}>
                                    Batal Trip
                                </Button>
                                <Button type="button" variant="solid" onClick={() => setSelesaiTripTarget(tripBerjalanAksi.id_trip)}>
                                    Selesaikan
                                </Button>
                            </>
                        ) : (
                            <Button type="button" variant="solid"
                                onClick={() => { setAksiDialogOpen(false); setShowMulaiTripDariSel(true) }}>
                                Mulai Trip
                            </Button>
                        )}
                        <Button type="submit" variant="solid" loading={aksiSaving} disabled={!aksiSupirId || !aksiRuteId}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Dialog>

            <ConfirmDialog isOpen={!!hapusTarget} type="danger" title="Hapus Penugasan"
                confirmText="Ya, Hapus" cancelText="Batal"
                onClose={() => setHapusTarget(null)}
                onCancel={() => setHapusTarget(null)}
                onConfirm={handleHapus}
                confirmButtonProps={{ loading: menghapus }}>
                <p>
                    Hapus penugasan <strong>{hapusTarget?.nama_supir ?? '—'}</strong> tanggal{' '}
                    <strong>{hapusTarget ? dayjs(hapusTarget.tanggal).format('DD MMM YYYY') : ''}</strong>?
                    Pengajuan uang jalan yang tersinkron ikut disesuaikan otomatis.
                </p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!batalTripTarget} type="danger" title="Batalkan Trip"
                confirmText="Ya, Batalkan" cancelText="Tidak"
                onClose={() => setBatalTripTarget(null)}
                onCancel={() => setBatalTripTarget(null)}
                onConfirm={handleBatalTrip}
                confirmButtonProps={{ loading: membatalkanTrip }}>
                <p>Batalkan trip yang sedang berjalan ini? Tindakan ini tidak dapat dibatalkan.</p>
            </ConfirmDialog>

            <ConfirmDialog isOpen={!!selesaiTripTarget} type="warning" title="Selesaikan Trip"
                confirmText="Ya, Lanjutkan" cancelText="Batal"
                onClose={() => { setSelesaiTripTarget(null); setSelesaikanPenugasanJuga(false) }}
                onCancel={() => { setSelesaiTripTarget(null); setSelesaikanPenugasanJuga(false) }}
                onConfirm={handleSelesaikanTrip}
                confirmButtonProps={{ loading: menyelesaikanTrip }}>
                <p>Selesaikan trip yang sedang berjalan ini? Status akan berubah menjadi selesai.</p>
                <div className="mt-3">
                    <Checkbox checked={selesaikanPenugasanJuga} onChange={(checked: boolean) => setSelesaikanPenugasanJuga(checked)}>
                        Sekalian selesaikan penugasan
                    </Checkbox>
                    <p className="text-xs text-gray-400 mt-1 ml-7">
                        Armada otomatis kembali tersedia setelah checkout. Centang bila ini rit terakhir — penugasan ikut ditutup. Biarkan kosong bila masih ada rit berikutnya.
                    </p>
                </div>
            </ConfirmDialog>

            <MulaiTripDialog
                isOpen={showMulaiTripDariSel}
                onClose={() => setShowMulaiTripDariSel(false)}
                onSukses={() => { setShowMulaiTripDariSel(false); fetchBoard() }}
                idPenugasanTerkunci={aksiAssignment?.id_penugasan}
                idProyekTerkunci={aksiAssignment?.id_proyek}
            />

            <Dialog isOpen={!!laporanDialogTrip} onRequestClose={() => setLaporanDialogTrip(null)} onClose={() => setLaporanDialogTrip(null)} width={900}>
                {laporanDialogTrip && (
                    <LaporanPerjalananPanel idTrip={laporanDialogTrip} onSaved={fetchBoard} autoOpenForm />
                )}
            </Dialog>
        </div>
    )
}
