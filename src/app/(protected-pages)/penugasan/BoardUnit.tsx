'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Button, FormItem, toast, Notification, Spinner, Dialog, Input, DatePicker, Tag } from '@/components/ui'
import Select from '@/components/ui/Select'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import LaporanPerjalananPanel from '@/components/shared/LaporanPerjalananPanel'
import { HiPlusCircle, HiOutlinePlus, HiOutlineTrash, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineEye, HiOutlinePencilAlt, HiX } from 'react-icons/hi'
import dayjs, { Dayjs } from 'dayjs'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import { ROUTES } from '@/constants/route.constant'
import {
    penugasanHarianService,
    BoardUnit as BoardUnitRow,
    BoardAssignment,
    AssignHarianGagal,
} from '@/services/penugasanHarian.service'
import { penugasanService, TitikDropInput } from '@/services/penugasan.service'
import { projectService } from '@/services/project.service'
import { proyekRuteService, ProyekRute } from '@/services/proyekRute.service'
import { supirService, Supir } from '@/services/supir.service'
import { supirVendorService } from '@/services/supirVendor.service'
import { tripService, Trip } from '@/services/trip.service'

type Option = { value: string; label: string }
type TipeUnitFilter = 'semua' | 'internal' | 'vendor'
const TANPA_SUPIR_DEFAULT = '__tanpa__'
const KATEGORI_UNIT_VALUES: TipeUnitFilter[] = ['semua', 'internal', 'vendor']
const KATEGORI_UNIT_OPTIONS: { value: TipeUnitFilter; label: string }[] = [
    { value: 'semua', label: 'Semua Unit' },
    { value: 'internal', label: 'Internal' },
    { value: 'vendor', label: 'Vendor' },
]

const AVATAR_COLORS = ['#2563eb', '#059669', '#7c3aed', '#db2777', '#d97706', '#0891b2', '#4f46e5', '#65a30d']
const avatarColor = (teks: string) => AVATAR_COLORS[(teks.charCodeAt(0) || 0) % AVATAR_COLORS.length]

const HARI = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']

const MEKANISME_LABEL: Record<string, string> = {
    unit_only: 'Unit Saja', unit_driver: 'Unit + Driver', full: 'Borongan',
}
const unitPaketVendor = (u: BoardUnitRow | null) =>
    !!u && u.tipe === 'vendor' && !!u.mekanisme && u.mekanisme !== 'unit_only'

const kontrakBelumDisetujui = (u: BoardUnitRow | null) =>
    !!u && u.tipe === 'vendor' && (u.status_kontrak === 'draft' || u.status_kontrak === 'menunggu_approval')

/**
 * suffix WAJIB selalu berupa node yang sama (bukan undefined saat kosong) —
 * Input.tsx merender struktur DOM berbeda (bare <input> vs dibungkus span
 * prefix/suffix) tergantung truthy-nya prefix/suffix, jadi toggle
 * undefined<->node di sini akan me-remount elemen <input> dan fokus/kursor
 * hilang setiap ketikan pertama. Ikon disembunyikan via class, bukan dihapus.
 */
const suffixHapus = (value: string, onClear: () => void) => (
    <HiX
        className={`cursor-pointer text-gray-400 hover:text-gray-600 ${value ? '' : 'invisible pointer-events-none'}`}
        onClick={onClear}
    />
)

const unitKey = (u: BoardUnitRow) => (u.tipe === 'internal' ? `internal:${u.id_armada}` : `vendor:${u.id_armada_vendor}`)

type TitikDropRow = { lokasi: string; uang_jalan_tambahan: string }
const emptyTitikDrop = (): TitikDropRow[] => []
const emptyTitikDropRow = (): TitikDropRow => ({ lokasi: '', uang_jalan_tambahan: '' })

type HasilAssign = { sukses: number; gagal: AssignHarianGagal[]; peringatan: string[] }

export default function BoardUnit() {
    const [bulan, setBulan] = useState<Dayjs>(dayjs().startOf('month'))
    const [loading, setLoading] = useState(false)
    const [units, setUnits] = useState<BoardUnitRow[]>([])
    const [assignments, setAssignments] = useState<BoardAssignment[]>([])
    const [filterUnit, setFilterUnit] = useState<string>('semua')
    const [filterSupirDefault, setFilterSupirDefault] = useState<string | null>(null)
    const todayColRef = useRef<HTMLTableCellElement>(null)

    const [supirAktif, setSupirAktif] = useState<Supir[]>([])
    const [supirVendorOptions, setSupirVendorOptions] = useState<Option[]>([])
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
    const [assignTitikDrop, setAssignTitikDrop] = useState<TitikDropRow[]>(emptyTitikDrop())
    const [assignSubmitting, setAssignSubmitting] = useState(false)
    const [hasilAssign, setHasilAssign] = useState<HasilAssign | null>(null)

    const [detailDialogOpen, setDetailDialogOpen] = useState(false)
    const [detailAssignment, setDetailAssignment] = useState<BoardAssignment | null>(null)
    const [detailUnit, setDetailUnit] = useState<BoardUnitRow | null>(null)
    const [detailTrips, setDetailTrips] = useState<Trip[]>([])
    const [detailTripsLoading, setDetailTripsLoading] = useState(false)
    const detailFetchRef = useRef<string | null>(null)

    const [aksiDialogOpen, setAksiDialogOpen] = useState(false)
    const [aksiAssignment, setAksiAssignment] = useState<BoardAssignment | null>(null)
    const [aksiUnit, setAksiUnit] = useState<BoardUnitRow | null>(null)
    const [aksiSupirId, setAksiSupirId] = useState('')
    const [aksiRuteId, setAksiRuteId] = useState<string | null>(null)
    const [aksiRuteRows, setAksiRuteRows] = useState<ProyekRute[]>([])
    const [aksiUangJalan, setAksiUangJalan] = useState('')
    const [aksiTitikDrop, setAksiTitikDrop] = useState<TitikDropRow[]>(emptyTitikDrop())
    const [aksiSaving, setAksiSaving] = useState(false)

    const [hapusTarget, setHapusTarget] = useState<BoardAssignment | null>(null)
    const [menghapus, setMenghapus] = useState(false)

    const [batalTripTarget, setBatalTripTarget] = useState<string | null>(null)
    const [membatalkanTrip, setMembatalkanTrip] = useState(false)
    const [selesaiTripTarget, setSelesaiTripTarget] = useState<string | null>(null)
    // const [selesaikanPenugasanJuga, setSelesaikanPenugasanJuga] = useState(false) — nonaktif, trip kedua sudah ditolak backend; buka lagi kalau multi-rit per penugasan dibutuhkan
    const [menyelesaikanTrip, setMenyelesaikanTrip] = useState(false)
    const [showMulaiTripDariSel, setShowMulaiTripDariSel] = useState(false)
    const [mulaiTripLoading, setMulaiTripLoading] = useState(false)
    const [laporanDialogTrip, setLaporanDialogTrip] = useState<string | null>(null)
    const aksiFetchRef = useRef<string | null>(null)
    const assignRuteFetchRef = useRef<string | null>(null)

    const fetchBoard = useCallback(async (senyap = false) => {
        if (!senyap) setLoading(true)
        try {
            const dari   = bulan.format('YYYY-MM-DD')
            const sampai = bulan.endOf('month').format('YYYY-MM-DD')
            const hasil = await penugasanHarianService.board(dari, sampai)
            setUnits(hasil.units)
            setAssignments(hasil.assignments)
        } catch (err) {
            if (!senyap) toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            if (!senyap) setLoading(false)
        }
    }, [bulan])

    useEffect(() => { fetchBoard() }, [fetchBoard])

    const stempelTerakhir = useRef<string | null>(null)

    useEffect(() => {
        const cekAktivitas = async () => {
            if (document.hidden) return
            try {
                const { terakhir } = await penugasanHarianService.aktivitasBoard()
                if (terakhir !== stempelTerakhir.current) {
                    const pertamaKali = stempelTerakhir.current === null
                    stempelTerakhir.current = terakhir
                    if (!pertamaKali) fetchBoard(true)
                }
            } catch {
                /* cek berikutnya akan mencoba lagi */
            }
        }
        cekAktivitas()
        const interval = setInterval(cekAktivitas, 8000)
        document.addEventListener('visibilitychange', cekAktivitas)
        return () => {
            clearInterval(interval)
            document.removeEventListener('visibilitychange', cekAktivitas)
        }
    }, [fetchBoard])

    useEffect(() => {
        supirService.list(1, 500, undefined, 'aktif').then(res => setSupirAktif(res.data)).catch(() => {})
        projectService.list(1, 500).then(res => setProyekOptions(
            res.data.map(p => ({ value: p.id_proyek, label: `${p.kode_proyek} — ${p.nama_proyek}` }))
        )).catch(() => {})
    }, [])

    const supirDefaultOptions = useMemo<Option[]>(() => {
        const peta = new Map<string, string>()
        units.forEach(u => { if (u.id_supir_default && u.nama_supir_default) peta.set(u.id_supir_default, u.nama_supir_default) })
        const daftar = [...peta.entries()]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        return [{ value: TANPA_SUPIR_DEFAULT, label: 'Tanpa supir default' }, ...daftar]
    }, [units])

    const unitFilterOptions = useMemo<Option[]>(() => {
        const daftarUnit = [...units]
            .sort((a, b) => a.nopol.localeCompare(b.nopol))
            .map(u => ({
                value: unitKey(u),
                label: [u.nopol, u.nama_jenis, u.nama_vendor, u.nama_supir_default].filter(Boolean).join(' · '),
            }))
        return [...KATEGORI_UNIT_OPTIONS, ...daftarUnit]
    }, [units])

    const unitsTampil = useMemo(() => {
        const isKategori = (KATEGORI_UNIT_VALUES as string[]).includes(filterUnit)
        let terurut = [...units]
        if (isKategori) {
            const tipe = filterUnit as TipeUnitFilter
            terurut = terurut.filter(u => tipe === 'semua' || u.tipe === tipe)
        } else {
            terurut = terurut.filter(u => unitKey(u) === filterUnit)
        }
        terurut = terurut.filter(u => {
            if (!filterSupirDefault) return true
            if (filterSupirDefault === TANPA_SUPIR_DEFAULT) return !u.id_supir_default
            return u.id_supir_default === filterSupirDefault
        })
        return terurut.sort((a, b) => a.nopol.localeCompare(b.nopol))
    }, [units, filterUnit, filterSupirDefault])

    const tanggalList = useMemo(() => {
        const n = bulan.daysInMonth()
        return Array.from({ length: n }, (_, i) => bulan.date(i + 1))
    }, [bulan])

    /** Assignment berstatus 'batal' tidak dianggap menghuni sel ini. Satu unit boleh punya lebih dari 1 assignment (proyek berbeda) di tanggal yang sama — ditampilkan bertumpuk. */
    const assignMap = useMemo(() => {
        const m: Record<string, Record<string, BoardAssignment[]>> = {}
        assignments.filter(a => a.status !== 'batal').forEach(a => {
            const key = a.id_armada ? `internal:${a.id_armada}` : a.id_armada_vendor ? `vendor:${a.id_armada_vendor}` : null
            if (!key) return
            m[key] ??= {}
            m[key][a.tanggal] ??= []
            m[key][a.tanggal].push(a)
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
        setAssignSupirId(unitPaketVendor(unit) ? (unit.id_supir_vendor_default ?? '') : (unit.id_supir_default ?? ''))
        setSupirVendorOptions([])
        if (unitPaketVendor(unit) && unit.id_vendor) {
            supirVendorService.list(1, 500, unit.id_vendor)
                .then(res => {
                    const cocok = unit.id_kontrak_vendor_unit
                        ? res.data.filter(s => !s.id_kontrak_vendor || s.id_kontrak_vendor === unit.id_kontrak_vendor_unit)
                        : res.data
                    setSupirVendorOptions(cocok.map(s => ({ value: s.id_supir_vendor, label: s.nama })))
                })
                .catch(() => setSupirVendorOptions([]))
        }
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
            const titikDropBersih: TitikDropInput[] = assignTitikDrop
                .filter(r => r.lokasi.trim())
                .map(r => ({ lokasi: r.lokasi.trim(), uang_jalan_tambahan: r.uang_jalan_tambahan ? Number(r.uang_jalan_tambahan) : 0 }))
            const hasil = await penugasanHarianService.assign({
                tanggal: assignTanggalMulai,
                tanggal_sampai: pakaiRentang ? assignTanggalSampai : null,
                ...(unitPaketVendor(assignUnit) ? { id_supir_vendor: assignSupirId } : { id_supir: assignSupirId }),
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

    const refreshDetailTrips = (assignment: BoardAssignment) => {
        setDetailTrips([])
        if (assignment.trips.length === 0) return
        setDetailTripsLoading(true)
        detailFetchRef.current = assignment.id_penugasan
        const idPenugasanDiminta = assignment.id_penugasan
        Promise.all(assignment.trips.map(t => tripService.get(t.id_trip)))
            .then(rows => { if (detailFetchRef.current === idPenugasanDiminta) setDetailTrips(rows) })
            .catch(() => { if (detailFetchRef.current === idPenugasanDiminta) setDetailTrips([]) })
            .finally(() => { if (detailFetchRef.current === idPenugasanDiminta) setDetailTripsLoading(false) })
    }

    const bukaDetail = (assignment: BoardAssignment, unit: BoardUnitRow) => {
        setDetailAssignment(assignment)
        setDetailUnit(unit)
        setDetailDialogOpen(true)
        refreshDetailTrips(assignment)
    }

    const tutupDetail = () => setDetailDialogOpen(false)

    const bukaAksi = (assignment: BoardAssignment, unit: BoardUnitRow) => {
        setAksiAssignment(assignment)
        setAksiUnit(unit)
        setAksiSupirId(unitPaketVendor(unit) ? (assignment.id_supir_vendor ?? '') : (assignment.id_supir ?? ''))
        setSupirVendorOptions([])
        if (unitPaketVendor(unit) && unit.id_vendor) {
            supirVendorService.list(1, 500, unit.id_vendor)
                .then(res => {
                    const cocok = unit.id_kontrak_vendor_unit
                        ? res.data.filter(s => !s.id_kontrak_vendor || s.id_kontrak_vendor === unit.id_kontrak_vendor_unit)
                        : res.data
                    setSupirVendorOptions(cocok.map(s => ({ value: s.id_supir_vendor, label: s.nama })))
                })
                .catch(() => setSupirVendorOptions([]))
        }
        setAksiRuteId(assignment.id_rute)
        setAksiUangJalan(assignment.estimasi_biaya != null ? String(Math.round(assignment.estimasi_biaya)) : '')
        setAksiTitikDrop(emptyTitikDrop())
        setAksiRuteRows([])
        setAksiDialogOpen(true)
        aksiFetchRef.current = assignment.id_penugasan
        penugasanService.get(assignment.id_penugasan)
            .then(record => {
                if (aksiFetchRef.current === assignment.id_penugasan) {
                    setAksiTitikDrop((record.titik_drop_detail ?? []).map(d => ({
                        lokasi: d.lokasi,
                        uang_jalan_tambahan: d.uang_jalan_tambahan ? String(d.uang_jalan_tambahan) : '',
                    })))
                }
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

    const bukaEditDariDetail = () => {
        if (!detailAssignment || !detailUnit) return
        setDetailDialogOpen(false)
        bukaAksi(detailAssignment, detailUnit)
    }

    const handleSubmitAksi = async () => {
        if (!aksiAssignment || !aksiSupirId || !aksiRuteId) return
        setAksiSaving(true)
        try {
            await penugasanHarianService.update(aksiAssignment.id_penugasan, {
                ...(unitPaketVendor(aksiUnit) ? { id_supir_vendor: aksiSupirId } : { id_supir: aksiSupirId }),
                id_rute:        aksiRuteId,
                estimasi_biaya: aksiUangJalan !== '' ? Number(aksiUangJalan) : null,
                titik_drop:     aksiTitikDrop
                    .filter(r => r.lokasi.trim())
                    .map(r => ({ lokasi: r.lokasi.trim(), uang_jalan_tambahan: r.uang_jalan_tambahan ? Number(r.uang_jalan_tambahan) : 0 })),
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
            setDetailDialogOpen(false)
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
            await tripService.checkout(selesaiTripTarget, true)
            toast.push(<Notification type="success" title="Trip berhasil diselesaikan" />)
            setSelesaiTripTarget(null)
            setDetailDialogOpen(false)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyelesaikanTrip(false)
        }
    }

    const handleMulaiTripLangsung = async () => {
        if (!detailAssignment) return
        setMulaiTripLoading(true)
        try {
            await tripService.mulai({
                id_penugasan: detailAssignment.id_penugasan,
                id_rute: detailAssignment.id_rute,
                uang_jalan_alokasi: detailAssignment.estimasi_biaya,
            })
            toast.push(<Notification type="success" title="Trip berhasil dimulai" />)
            setShowMulaiTripDariSel(false)
            fetchBoard()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMulaiTripLoading(false)
        }
    }

    const hariIni = dayjs().format('YYYY-MM-DD')
    const tripBerjalanDetail = detailAssignment?.trips.find(t => t.status === 'berjalan') ?? null
    const tripBerjalanFull = detailTrips.find(t => t.id_trip === tripBerjalanDetail?.id_trip) ?? null
    const tripTerakhirDetail = detailAssignment && detailAssignment.trips.length > 0 ? detailAssignment.trips[detailAssignment.trips.length - 1] : null
    const selesaiSemuaDetail = !tripBerjalanDetail && (detailAssignment?.trips.length ?? 0) > 0
    const statusDetailLabel = tripBerjalanDetail ? 'Sedang Jalan' : selesaiSemuaDetail ? 'Selesai' : 'Belum Mulai'
    const statusDetailClass = tripBerjalanDetail
        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
        : selesaiSemuaDetail
        ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100'
        : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100'

    return (
        <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="default" icon={<HiOutlineChevronLeft />}
                    onClick={() => setBulan(b => b.subtract(1, 'month'))} />
                <span className="font-semibold min-w-[140px] text-center">{bulan.format('MMMM YYYY')}</span>
                <Button size="sm" variant="default" icon={<HiOutlineChevronRight />}
                    onClick={() => setBulan(b => b.add(1, 'month'))} />
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                    <div className="w-56">
                        <Select size="sm" isClearable placeholder="Filter supir default..."
                            options={supirDefaultOptions}
                            value={supirDefaultOptions.find(o => o.value === filterSupirDefault) ?? null}
                            onChange={opt => setFilterSupirDefault(opt?.value ?? null)} />
                    </div>
                    <div className="w-64">
                        <Select size="sm" isClearable placeholder="Cari / pilih unit..."
                            options={unitFilterOptions}
                            value={unitFilterOptions.find(o => o.value === filterUnit) ?? unitFilterOptions[0]}
                            onChange={opt => setFilterUnit(opt?.value ?? 'semua')} />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Spinner size={36} /></div>
            ) : units.length === 0 ? (
                <p className="text-gray-400 text-sm py-10 text-center">
                    Belum ada unit armada aktif — tambahkan armada atau unit vendor Unit Only terlebih dahulu.
                </p>
            ) : (
                <div className="max-h-[70vh] overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-xs">
                    <table className="border-separate border-spacing-0 min-w-full select-none">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th className="sticky left-0 z-20 bg-blue-50 dark:bg-gray-800 text-left px-3 py-2 min-w-[260px] border-b border-r border-gray-200 dark:border-gray-600">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unit</span>
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
                            {unitsTampil.length === 0 && (
                                <tr>
                                    <td colSpan={tanggalList.length + 1} className="text-center text-sm text-gray-400 py-10">
                                        Tidak ada unit yang cocok dengan filter
                                    </td>
                                </tr>
                            )}
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
                                                                {`Vendor${u.mekanisme && u.mekanisme !== 'unit_only' ? ` · ${MEKANISME_LABEL[u.mekanisme] ?? u.mekanisme}` : ''}`}
                                                            </Tag>
                                                        )}
                                                        {kontrakBelumDisetujui(u) && (
                                                            <Tag className="text-[10px] shrink-0 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                                                                {u.status_kontrak === 'draft' ? 'Draft' : 'Menunggu Approval'}
                                                            </Tag>
                                                        )}
                                                        {u.tipe === 'vendor' && u.kontrak_habis && !kontrakBelumDisetujui(u) && (
                                                            <Tag className="text-[10px] shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                                                Kontrak Habis
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
                                            const daftar = assignMap[key]?.[tglKey] ?? []
                                            return (
                                                <td key={tglKey} className="px-1.5 py-2 border-b border-r border-gray-200 dark:border-gray-600 align-top">
                                                    <div className="flex flex-col gap-1">
                                                        {daftar.map(a => {
                                                            const berjalan = a.trips.some(tr => tr.status === 'berjalan')
                                                            const selesaiSemua = !berjalan && a.trips.length > 0
                                                            const kelasWarna = berjalan
                                                                ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/10'
                                                                : selesaiSemua
                                                                ? 'border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/10'
                                                                : 'border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10'
                                                            return (
                                                                <div key={a.id_penugasan} className={`rounded-lg border px-2 py-1.5 cursor-pointer transition-shadow ${kelasWarna}`}
                                                                    onClick={() => bukaDetail(a, u)}>
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className="flex items-center gap-1 min-w-0">
                                                                            <span className="text-sm font-bold text-blue-600 dark:text-blue-300 truncate">
                                                                                {a.kode_proyek ?? '—'}
                                                                            </span>
                                                                            {a.trips.length > 1 && (
                                                                                <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                                                                    title={`${a.trips.length} trip hari ini`}>
                                                                                    {a.trips.length} rit
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                        <button type="button" className="p-0.5 shrink-0 text-red-400 hover:text-red-600"
                                                                            title="Hapus penugasan"
                                                                            onClick={e => { e.stopPropagation(); setHapusTarget(a) }}>
                                                                            <HiOutlineTrash className="w-3.5 h-3.5" />
                                                                        </button>
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
                                                        })}
                                                        <button type="button"
                                                            className={`w-full rounded-lg border border-dashed border-transparent hover:border-blue-300 text-transparent hover:text-blue-400 flex items-center justify-center transition-colors ${daftar.length > 0 ? 'h-6' : 'h-12'}`}
                                                            onClick={() => bukaAssignDialog(u, tglKey)}>
                                                            <HiOutlinePlus className="w-4 h-4" />
                                                        </button>
                                                    </div>
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

            <Dialog isOpen={assignDialogOpen} onRequestClose={() => setAssignDialogOpen(false)} onClose={() => setAssignDialogOpen(false)} width={720}>
                <h5 className="text-base font-semibold mb-1">Tambah Penugasan Harian</h5>
                <p className="text-xs text-gray-400 mb-4">
                    {assignUnit?.nopol}
                    {assignUnit?.tipe === 'vendor' && assignUnit?.nama_vendor ? ` · Vendor ${assignUnit.nama_vendor}` : ''}
                </p>
                {kontrakBelumDisetujui(assignUnit) ? (
                    <p className="text-xs text-red-600 dark:text-red-400 -mt-3 mb-4">
                        Kontrak vendor unit ini {assignUnit?.status_kontrak === 'draft' ? 'masih draft' : 'sedang menunggu approval'} — ajukan dan selesaikan approval kontrak dahulu sebelum menugaskan unit ini.
                    </p>
                ) : assignUnit?.tipe === 'vendor' && assignUnit?.kontrak_habis && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 -mt-3 mb-4">
                        Kontrak vendor unit ini sudah habis — penugasan tetap bisa disimpan.
                    </p>
                )}
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
                    {unitPaketVendor(assignUnit) ? (
                        <FormItem label="Supir Vendor" asterisk
                            extra={<span className="text-xs text-gray-400">Unit paket — driver dari vendor {assignUnit?.nama_vendor}</span>}>
                            <Select placeholder="Pilih supir vendor..."
                                options={supirVendorOptions}
                                value={supirVendorOptions.find(o => o.value === assignSupirId) ?? null}
                                onChange={opt => setAssignSupirId((opt as Option | null)?.value ?? '')} />
                        </FormItem>
                    ) : (
                        <FormItem label="Supir" asterisk>
                            <Select placeholder="Pilih supir..."
                                options={supirOptions}
                                value={supirOptions.find(o => o.value === assignSupirId) ?? null}
                                onChange={opt => setAssignSupirId((opt as Option | null)?.value ?? '')} />
                        </FormItem>
                    )}
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
                            <Button type="button" size="xs" variant="solid" icon={<HiPlusCircle />}
                                disabled={assignTitikDrop.length >= 10}
                                onClick={() => setAssignTitikDrop(prev => [...prev, emptyTitikDropRow()])}>
                                Tambah Titik
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {assignTitikDrop.map((row, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                    <Input size="sm" placeholder={`Titik drop ${i + 1}...`} value={row.lokasi}
                                        suffix={suffixHapus(row.lokasi, () => setAssignTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, lokasi: '' } : r))))}
                                        onChange={e => setAssignTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, lokasi: e.target.value } : r)))} />
                                    <Input size="sm" className="w-72" prefix="Rp" placeholder="Uang jalan tambahan"
                                        value={row.uang_jalan_tambahan ? formatNum(Number(row.uang_jalan_tambahan)) : ''}
                                        suffix={suffixHapus(row.uang_jalan_tambahan, () => setAssignTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, uang_jalan_tambahan: '' } : r))))}
                                        onChange={e => setAssignTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, uang_jalan_tambahan: e.target.value.replace(/\D/g, '') } : r)))} />
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
                            disabled={!assignSupirId || !assignProyekId || !assignRuteId || !assignTanggalMulai || kontrakBelumDisetujui(assignUnit)}>
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

            <Dialog isOpen={detailDialogOpen} onRequestClose={tutupDetail} onClose={tutupDetail} width={520}>
                <div className="flex items-start justify-between gap-3 mb-1 pr-10">
                    <div className="min-w-0">
                        <h5 className="text-base font-semibold">Detail Penugasan</h5>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {detailUnit?.nopol} — {detailAssignment?.kode_proyek ?? '—'}
                            {detailAssignment && ` · ${dayjs(detailAssignment.tanggal).format('dddd, DD MMMM YYYY')}`}
                        </p>
                    </div>
                    <Button size="sm" variant="solid" className="shrink-0" icon={<HiOutlinePencilAlt />} onClick={bukaEditDariDetail}>
                        Edit
                    </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Unit / Armada</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {detailUnit?.nopol ?? '—'}
                            {detailUnit?.nama_jenis && <span className="text-gray-400 font-normal"> · {detailUnit.nama_jenis}</span>}
                            {detailUnit?.tipe === 'vendor' && detailUnit?.nama_vendor && (
                                <span className="text-purple-500 font-normal"> · Vendor {detailUnit.nama_vendor}</span>
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Status</p>
                        <Tag className={`${statusDetailClass} border-0 font-semibold`}>{statusDetailLabel}</Tag>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Proyek</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailAssignment?.nama_proyek ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Supir</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailAssignment?.nama_supir ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Rute</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{detailAssignment?.nama_rute ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Uang Jalan</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            {detailAssignment?.estimasi_biaya != null ? formatRupiah(detailAssignment.estimasi_biaya) : <span className="text-gray-400">—</span>}
                        </p>
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Perjalanan</p>
                    {detailTripsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 py-2"><Spinner size={16} /> Memuat data trip...</div>
                    ) : detailTrips.length === 0 ? (
                        <p className="text-sm text-gray-400">Trip belum dimulai.</p>
                    ) : detailTrips.length === 1 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                            {detailTrips[0].status === 'dibatalkan' && detailTrips[0].alasan_dibatalkan && (
                                <div className="sm:col-span-2">
                                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Alasan Dibatalkan</p>
                                    <p className="text-sm font-medium text-red-500 dark:text-red-400">{detailTrips[0].alasan_dibatalkan}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Mulai Jalan</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {detailTrips[0].waktu_checkin ? dayjs(detailTrips[0].waktu_checkin).format('DD MMM YYYY HH:mm') : <span className="text-gray-400">—</span>}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Selesai Jalan</p>
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {detailTrips[0].waktu_checkout ? dayjs(detailTrips[0].waktu_checkout).format('DD MMM YYYY HH:mm') : <span className="text-gray-400">Belum selesai</span>}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {detailTrips.map((trip, idx) => (
                                <div key={trip.id_trip} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">Rit {idx + 1}</span>
                                            <Tag className={`text-[10px] border-0 font-semibold ${
                                                trip.status === 'berjalan'
                                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-100'
                                                    : trip.status === 'dibatalkan'
                                                        ? 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-100'
                                                        : 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-100'
                                            }`}>
                                                {trip.status === 'berjalan' ? 'Sedang Jalan' : trip.status === 'dibatalkan' ? 'Dibatalkan' : 'Selesai'}
                                            </Tag>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {trip.waktu_checkin ? dayjs(trip.waktu_checkin).format('DD MMM HH:mm') : '—'}
                                            {' → '}
                                            {trip.waktu_checkout ? dayjs(trip.waktu_checkout).format('DD MMM HH:mm') : 'Belum selesai'}
                                        </p>
                                        {trip.status === 'dibatalkan' && trip.alasan_dibatalkan && (
                                            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                                                {trip.alasan_dibatalkan}
                                            </p>
                                        )}
                                    </div>
                                    <button type="button" className="p-1 shrink-0 text-gray-400 hover:text-blue-600"
                                        title="Lihat detail lengkap trip ini"
                                        onClick={() => window.open(ROUTES.TRIP_DETAIL(trip.id_trip), '_blank', 'noopener')}>
                                        <HiOutlineEye className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aksi Trip</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Status saat ini: <span className="font-semibold">{statusDetailLabel}</span>
                            </p>
                            {tripBerjalanDetail && !tripBerjalanFull?.punya_laporan && (
                                <p
                                    className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 cursor-pointer hover:underline"
                                    onClick={() => setLaporanDialogTrip(tripBerjalanDetail.id_trip)}
                                >
                                    Isi laporan perjalanan dulu sebelum bisa diselesaikan
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tripTerakhirDetail && (
                                <Button type="button" size="sm" variant="default" onClick={() => setLaporanDialogTrip(tripTerakhirDetail.id_trip)}>
                                    Isi Laporan
                                </Button>
                            )}
                            {tripBerjalanDetail ? (
                                <>
                                    <Button type="button" size="sm" variant="default" className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                                        onClick={() => setBatalTripTarget(tripBerjalanDetail.id_trip)}>
                                        Batalkan Trip
                                    </Button>
                                    {tripBerjalanFull?.punya_laporan && (
                                        <Button type="button" size="sm" variant="solid"
                                            onClick={() => setSelesaiTripTarget(tripBerjalanDetail.id_trip)}>
                                            Selesaikan Trip
                                        </Button>
                                    )}
                                </>
                            ) : selesaiSemuaDetail ? (
                                <span className="text-xs text-gray-400">Trip sudah selesai — buat penugasan baru untuk perjalanan berikutnya</span>
                            ) : (
                                <Button type="button" size="sm" variant="solid"
                                    onClick={() => { setDetailDialogOpen(false); setShowMulaiTripDariSel(true) }}>
                                    Mulai Trip
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={tutupDetail}>Tutup</Button>
                </div>
            </Dialog>

            <Dialog isOpen={aksiDialogOpen} onRequestClose={tutupAksi} onClose={tutupAksi} width={720}>
                <h5 className="text-base font-semibold mb-1">Ubah Penugasan</h5>
                <p className="text-xs text-gray-400 mb-4">
                    {aksiUnit?.nopol} — {aksiAssignment?.kode_proyek ?? '—'}
                    {aksiAssignment && ` · ${dayjs(aksiAssignment.tanggal).format('dddd, DD MMMM YYYY')}`}
                </p>
                {aksiUnit?.tipe === 'vendor' && aksiUnit?.kontrak_habis && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 -mt-3 mb-4">
                        Kontrak vendor unit ini sudah habis — perubahan tetap bisa disimpan.
                    </p>
                )}
                <form onSubmit={e => { e.preventDefault(); handleSubmitAksi() }}>
                    <FormItem label={unitPaketVendor(aksiUnit) ? 'Supir Vendor' : 'Supir'} asterisk>
                        <Select placeholder={unitPaketVendor(aksiUnit) ? 'Pilih supir vendor...' : 'Pilih supir...'}
                            options={unitPaketVendor(aksiUnit) ? supirVendorOptions : aksiSupirOptions}
                            value={(unitPaketVendor(aksiUnit) ? supirVendorOptions : aksiSupirOptions).find(o => o.value === aksiSupirId) ?? null}
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
                            <Button type="button" size="xs" variant="solid" icon={<HiPlusCircle />}
                                disabled={aksiTitikDrop.length >= 10}
                                onClick={() => setAksiTitikDrop(prev => [...prev, emptyTitikDropRow()])}>
                                Tambah Titik
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {aksiTitikDrop.map((row, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                                    <Input size="sm" placeholder={`Titik drop ${i + 1}...`} value={row.lokasi}
                                        suffix={suffixHapus(row.lokasi, () => setAksiTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, lokasi: '' } : r))))}
                                        onChange={e => setAksiTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, lokasi: e.target.value } : r)))} />
                                    <Input size="sm" className="w-72" prefix="Rp" placeholder="Uang jalan tambahan"
                                        value={row.uang_jalan_tambahan ? formatNum(Number(row.uang_jalan_tambahan)) : ''}
                                        suffix={suffixHapus(row.uang_jalan_tambahan, () => setAksiTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, uang_jalan_tambahan: '' } : r))))}
                                        onChange={e => setAksiTitikDrop(prev => prev.map((r, idx) => (idx === i ? { ...r, uang_jalan_tambahan: e.target.value.replace(/\D/g, '') } : r)))} />
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
                        <Button type="button" variant="plain" onClick={tutupAksi}>Batal</Button>
                        <Button type="button" variant="solid" className="bg-red-600 hover:bg-red-700"
                            onClick={() => aksiAssignment && setHapusTarget(aksiAssignment)}>
                            Hapus Penugasan
                        </Button>
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
                onClose={() => setSelesaiTripTarget(null)}
                onCancel={() => setSelesaiTripTarget(null)}
                onConfirm={handleSelesaikanTrip}
                confirmButtonProps={{ loading: menyelesaikanTrip }}>
                <p>Selesaikan trip yang sedang berjalan ini? Status akan berubah menjadi selesai dan penugasan ikut ditutup. Armada otomatis kembali tersedia setelah checkout.</p>
                {/* Checkbox "Sekalian selesaikan penugasan" nonaktif — trip kedua per penugasan sudah ditolak backend, jadi penugasan selalu ditutup. Buka lagi kalau multi-rit per penugasan dibutuhkan:
                <div className="mt-3">
                    <Checkbox checked={selesaikanPenugasanJuga} onChange={(checked: boolean) => setSelesaikanPenugasanJuga(checked)}>
                        Sekalian selesaikan penugasan
                    </Checkbox>
                    <p className="text-xs text-gray-400 mt-1 ml-7">
                        Armada otomatis kembali tersedia setelah checkout. Centang bila ini rit terakhir — penugasan ikut ditutup. Biarkan kosong bila masih ada rit berikutnya.
                    </p>
                </div>
                */}
            </ConfirmDialog>

            <ConfirmDialog isOpen={showMulaiTripDariSel} type="info" title="Mulai Trip"
                confirmText="Ya, Mulai Trip" cancelText="Batal"
                onClose={() => setShowMulaiTripDariSel(false)}
                onCancel={() => setShowMulaiTripDariSel(false)}
                onConfirm={handleMulaiTripLangsung}
                confirmButtonProps={{ loading: mulaiTripLoading }}>
                <p>
                    Mulai trip untuk <strong>{detailUnit?.nopol}</strong> — {detailAssignment?.nama_supir ?? '-'}
                    {detailAssignment?.nama_rute && <> di rute <strong>{detailAssignment.nama_rute}</strong></>}?
                    Trip langsung berjalan (check-in otomatis) — pastikan supir & armada siap berangkat.
                </p>
            </ConfirmDialog>

            <Dialog isOpen={!!laporanDialogTrip} onRequestClose={() => setLaporanDialogTrip(null)} onClose={() => setLaporanDialogTrip(null)} width={900}>
                {laporanDialogTrip && (
                    <LaporanPerjalananPanel
                        idTrip={laporanDialogTrip}
                        onSaved={() => { fetchBoard(); if (detailAssignment) refreshDetailTrips(detailAssignment) }}
                        autoOpenForm
                    />
                )}
            </Dialog>
        </div>
    )
}
