'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button, FormItem, Input, toast, Notification, Dialog } from '@/components/ui'
import Select from '@/components/ui/Select'
import { parseApiError } from '@/utils/error.util'
import { formatNum } from '@/utils/formatNumber'
import { tripService } from '@/services/trip.service'
import { projectService } from '@/services/project.service'
import { penugasanService, Penugasan } from '@/services/penugasan.service'
import { proyekRuteService } from '@/services/proyekRute.service'
import { supirService } from '@/services/supir.service'
import { armadaService } from '@/services/armada.service'
import { supirVendorService } from '@/services/supirVendor.service'
import { armadaVendorService } from '@/services/armadaVendor.service'
import { cutiService } from '@/services/cuti.service'
import { jadwalShiftService } from '@/services/jadwalShift.service'
import dayjs from 'dayjs'

type Option = { value: string; label: string; isDisabled?: boolean }

type Props = {
    isOpen: boolean
    onClose: () => void
    onSukses: (idProyek: string) => void
    idPenugasanTerkunci?: string
    idProyekTerkunci?: string
}

export default function MulaiTripDialog({ isOpen, onClose, onSukses, idPenugasanTerkunci, idProyekTerkunci }: Props) {
    const terkunci = !!idPenugasanTerkunci

    const [proyekOptions, setProyekOptions] = useState<Option[]>([])
    const [pilihProyek, setPilihProyek]     = useState('')
    const [penugasanOptions, setPenugasanOptions] = useState<Option[]>([])
    const [pilihPenugasan, setPilihPenugasan]     = useState('')
    const [ruteOptions, setRuteOptions] = useState<Option[]>([])
    const [pilihRute, setPilihRute]     = useState<string | null>(null)
    const [uangJalan, setUangJalan]     = useState('')
    const [memuat, setMemuat] = useState(false)
    const [saving, setSaving] = useState(false)
    const [warnShiftTerkunci, setWarnShiftTerkunci] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setPilihProyek(idProyekTerkunci ?? '')
        setPilihPenugasan(idPenugasanTerkunci ?? '')
        setPilihRute(null)
        setUangJalan('')
        if (!terkunci) {
            projectService.list(1, 100)
                .then(res => setProyekOptions(res.data.map(p => ({ value: p.id_proyek, label: p.nama_proyek }))))
                .catch(err => toast.push(<Notification type="danger" title={parseApiError(err)} />))
        }
    }, [isOpen, terkunci, idPenugasanTerkunci, idProyekTerkunci])

    const idProyekEfektif = pilihProyek || idProyekTerkunci || ''

    useEffect(() => {
        if (!isOpen || !terkunci || !idPenugasanTerkunci || !idProyekTerkunci) {
            setWarnShiftTerkunci(false)
            return
        }
        let dibatalkan = false
        Promise.all([
            penugasanService.get(idPenugasanTerkunci),
            jadwalShiftService.list(idProyekTerkunci, dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().endOf('month').format('YYYY-MM-DD')),
        ]).then(([p, jadwal]) => {
            if (dibatalkan) return
            const hariIni = dayjs().format('YYYY-MM-DD')
            const punyaShift = jadwal.some(j => j.id_supir === p.id_supir && j.tanggal === hariIni)
            setWarnShiftTerkunci(jadwal.length > 0 && !!p.id_supir && !punyaShift)
        }).catch(() => setWarnShiftTerkunci(false))
        return () => { dibatalkan = true }
    }, [isOpen, terkunci, idPenugasanTerkunci, idProyekTerkunci])

    useEffect(() => {
        if (!isOpen || !idProyekEfektif) {
            setRuteOptions([])
            setPilihRute(null)
            return
        }
        setPilihRute(null)
        proyekRuteService.list(idProyekEfektif)
            .then(rows => setRuteOptions(rows.map(r => ({ value: r.id_rute, label: r.nama_rute ?? r.kode_rute ?? r.id_rute }))))
            .catch(() => setRuteOptions([]))
    }, [isOpen, idProyekEfektif])

    const muatPenugasan = useCallback(async (idProyek: string) => {
        setMemuat(true)
        try {
            const res = await penugasanService.list(idProyek, 1, undefined, 100)
            const rows = res.data.filter(p => p.status === 'pending' || p.status === 'aktif')
            const supirCuti = new Set(
                (await cutiService.cutiAktif().catch(() => []))
                    .map(c => c.id_supir)
                    .filter(Boolean) as string[]
            )
            const hariIni = dayjs().format('YYYY-MM-DD')
            const jadwalShiftBulanIni = await jadwalShiftService
                .list(idProyek, dayjs().startOf('month').format('YYYY-MM-DD'), dayjs().endOf('month').format('YYYY-MM-DD'))
                .catch(() => [])
            const proyekPakaiShift = jadwalShiftBulanIni.length > 0
            const supirShiftHariIni = new Set(jadwalShiftBulanIni.filter(j => j.tanggal === hariIni).map(j => j.id_supir))
            const supirIds        = [...new Set(rows.map(p => p.id_supir).filter(Boolean))] as string[]
            const armadaIds       = [...new Set(rows.map(p => p.id_armada).filter(Boolean))] as string[]
            const supirVendorIds  = [...new Set(rows.map(p => p.id_supir_vendor).filter(Boolean))] as string[]
            const armadaVendorIds = [...new Set(rows.map(p => p.id_armada_vendor).filter(Boolean))] as string[]
            const [supirs, armadas, supirVendors, armadaVendors] = await Promise.all([
                Promise.all(supirIds.map(x => supirService.get(x).catch(() => null))),
                Promise.all(armadaIds.map(x => armadaService.get(x).catch(() => null))),
                Promise.all(supirVendorIds.map(x => supirVendorService.get(x).catch(() => null))),
                Promise.all(armadaVendorIds.map(x => armadaVendorService.get(x).catch(() => null))),
            ])
            const namaSupir: Record<string, string> = {}
            supirs.forEach(s => { if (s) namaSupir[s.id_supir] = s.nama })
            supirVendors.forEach(s => { if (s) namaSupir[s.id_supir_vendor] = s.nama })
            const simKadaluarsa = new Set<string>()
            supirs.forEach(s => {
                if (s?.tgl_kadaluarsa_sim && new Date(s.tgl_kadaluarsa_sim).getTime() < Date.now()) {
                    simKadaluarsa.add(s.id_supir)
                }
            })
            const nopolArmada: Record<string, string> = {}
            armadas.forEach(a => { if (a) nopolArmada[a.id_armada] = a.nopol })
            armadaVendors.forEach(a => { if (a) nopolArmada[a.id_armada_vendor] = a.nopol })
            const armadaSedangJalan = new Set<string>()
            armadas.forEach(a => { if (a?.status === 'digunakan') armadaSedangJalan.add(a.id_armada) })

            setPenugasanOptions(rows.map((p: Penugasan) => {
                const supir  = namaSupir[p.id_supir ?? p.id_supir_vendor ?? ''] ?? 'Tanpa supir'
                const armada = nopolArmada[p.id_armada ?? p.id_armada_vendor ?? ''] ?? 'tanpa armada'
                const warnSim = p.id_supir && simKadaluarsa.has(p.id_supir) ? ' ⚠ SIM kadaluarsa' : ''
                const warnJalan = p.id_armada && armadaSedangJalan.has(p.id_armada) ? ' ⚠ armada sedang dalam perjalanan' : ''
                const warnShift = proyekPakaiShift && p.id_supir && !supirShiftHariIni.has(p.id_supir)
                    ? ' ⚠ tanpa jadwal shift hari ini' : ''
                const sedangCuti = !!p.id_supir && supirCuti.has(p.id_supir)
                return {
                    value: p.id_penugasan,
                    label: `${supir} — ${armada}${p.sumber === 'vendor' ? ' (vendor)' : ''}${warnSim}${warnJalan}${warnShift}${sedangCuti ? ' ⛔ sedang cuti' : ''}`,
                    isDisabled: sedangCuti,
                }
            }))
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMemuat(false)
        }
    }, [])

    useEffect(() => {
        if (!isOpen || terkunci || !pilihProyek) return
        setPilihPenugasan('')
        muatPenugasan(pilihProyek)
    }, [isOpen, terkunci, pilihProyek, muatPenugasan])

    const handleSubmit = async () => {
        if (!pilihPenugasan) return
        setSaving(true)
        try {
            await tripService.mulai({
                id_penugasan: pilihPenugasan,
                id_rute: pilihRute,
                uang_jalan_alokasi: uangJalan ? Number(uangJalan) : null,
            })
            toast.push(<Notification type="success" title="Trip berhasil dimulai" />)
            onSukses(idProyekEfektif)
            onClose()
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={460}>
            <h5 className="text-base font-semibold mb-1">Mulai Trip</h5>
            <p className="text-xs text-gray-400 mb-4">
                Trip langsung berjalan (check-in otomatis) — pastikan supir & armada siap berangkat.
            </p>
            <form onSubmit={e => { e.preventDefault(); handleSubmit() }}>
                {!terkunci && (
                    <>
                        <FormItem label="Proyek" asterisk>
                            <Select placeholder="Pilih proyek..."
                                options={proyekOptions}
                                value={proyekOptions.find(o => o.value === pilihProyek) ?? null}
                                onChange={opt => setPilihProyek((opt as Option | null)?.value ?? '')} />
                        </FormItem>
                        <FormItem label="Penugasan (Supir — Armada)" asterisk>
                            <Select placeholder={memuat ? 'Memuat...' : 'Pilih penugasan...'}
                                isDisabled={!pilihProyek || memuat}
                                options={penugasanOptions}
                                value={penugasanOptions.find(o => o.value === pilihPenugasan) ?? null}
                                onChange={opt => setPilihPenugasan((opt as Option | null)?.value ?? '')} />
                        </FormItem>
                    </>
                )}
                {terkunci && warnShiftTerkunci && (
                    <p className="text-xs text-amber-600 mb-3">
                        ⚠ Supir tidak punya jadwal shift hari ini di papan jadwal — pastikan memang sesuai rencana.
                    </p>
                )}
                <FormItem label="Rute (opsional)">
                    <Select isClearable
                        isDisabled={!idProyekEfektif}
                        placeholder={!idProyekEfektif ? 'Pilih proyek dahulu...' : ruteOptions.length === 0 ? 'Belum ada rute terdaftar untuk proyek ini' : 'Pilih rute...'}
                        options={ruteOptions}
                        value={ruteOptions.find(o => o.value === pilihRute) ?? null}
                        onChange={opt => setPilihRute((opt as Option | null)?.value ?? null)} />
                </FormItem>
                <FormItem label="Uang Jalan (opsional)" extra={<span className="text-xs text-gray-400">Uang yang dibawa supir — dasar settlement setelah trip selesai</span>}>
                    <Input prefix="Rp" placeholder="0"
                        value={uangJalan ? formatNum(Number(uangJalan)) : ''}
                        onChange={e => setUangJalan(e.target.value.replace(/\D/g, ''))} />
                </FormItem>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="plain" onClick={onClose}>Batal</Button>
                    <Button type="submit" variant="solid" loading={saving} disabled={!pilihPenugasan}>
                        Mulai Trip
                    </Button>
                </div>
            </form>
        </Dialog>
    )
}
