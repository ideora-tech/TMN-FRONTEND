'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Button, Card, Checkbox, Dialog, FormItem, Input, Spinner, Tag, toast, Notification } from '@/components/ui'
import { HiOutlinePencilAlt } from 'react-icons/hi'
import { parseApiError } from '@/utils/error.util'
import { formatNum, formatRupiah } from '@/utils/formatNumber'
import {
    parameterTagihanTripService,
    ParameterTagihanTrip,
    KomponenParameterTagihan,
} from '@/services/parameterTagihanTrip.service'

export function ringkasKomponen(k: KomponenParameterTagihan): string {
    if (k.kode === 'overnight') return `Overnight ${k.jumlah} malam`
    if (k.kode === 'add_drop') return `Add Drop ${k.jumlah} drop`
    return k.label
}

const MAKS_OVERNIGHT = 31
const MAKS_ADD_DROP = 20

function batasiAngka(nilai: string, maks: number): string {
    const angka = nilai.replace(/\D/g, '').slice(0, 3)
    return angka === '' ? '' : String(Math.min(Number(angka), maks))
}

function usulAddDrop(jumlahTitikDrop: number): number {
    return Math.min(Math.max(jumlahTitikDrop, 0), MAKS_ADD_DROP)
}

function adaTarifUntukMode(d: ParameterTagihanTrip): boolean {
    if (d.mode === 'cancellation') return d.tarif.cancellation != null
    return d.tarif.overnight != null || d.tarif.add_drop != null || d.tarif.cross_cluster != null
}

function keteranganJumlah(k: KomponenParameterTagihan): string {
    return k.satuan ? `${formatNum(k.jumlah)} ${k.satuan} × ${formatRupiah(k.tarif)}` : formatRupiah(k.tarif)
}

export function ParameterTagihanCard({ idTrip, statusTrip }: { idTrip: string; statusTrip?: string }) {
    const [data, setData]       = useState<ParameterTagihanTrip | null>(null)
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)

    const muat = useCallback(async () => {
        setLoading(true)
        try {
            setData(await parameterTagihanTripService.detail(idTrip))
        } catch {
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [idTrip])

    useEffect(() => { muat() }, [muat, statusTrip])

    if (!data || !data.berlaku) return null

    const adaTarif = adaTarifUntukMode(data)
    const rincian = data.rincian

    return (
        <Card>
            <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                    <h5>Parameter Tagihan Klien</h5>
                    <p className="text-xs text-gray-400 mt-0.5">Tambahan yang ditagihkan ke klien di luar harga deal</p>
                </div>
                {loading ? (
                    <span className="text-xs text-gray-400">Memuat...</span>
                ) : data.terkunci ? (
                    <Tag className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-0 text-xs">Sudah masuk invoice</Tag>
                ) : data.bisa_diatur && adaTarif ? (
                    <Button size="sm" variant="default" icon={<HiOutlinePencilAlt />} onClick={() => setDialogOpen(true)}>Atur</Button>
                ) : null}
            </div>

            {!loading && (
                <>
                    {data.mode === null && (
                        <p className="text-sm text-gray-400 mb-3">Parameter bisa diatur setelah trip berjalan.</p>
                    )}
                    {data.mode !== null && !adaTarif && (
                        <p className="text-sm text-gray-400 mb-3">
                            {data.mode === 'cancellation'
                                ? 'Penawaran proyek belum mengatur tarif Cancellation.'
                                : 'Penawaran proyek belum mengatur tarif Overnight, Add Drop, maupun Cross Cluster.'}
                        </p>
                    )}
                    {data.mode === 'normal' && data.bisa_diatur && data.tarif.add_drop != null
                        && data.jumlah_titik_drop >= 1 && data.nilai.jumlah_add_drop === 0 && !data.add_drop_manual && (
                        <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                            Penugasan trip ini punya {data.jumlah_titik_drop} titik drop, tetapi Add Drop belum diisi.
                        </p>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                <tr>
                                    <td className="py-2 pr-4 text-gray-500">Harga Deal</td>
                                    <td className="py-2 pr-4 text-xs text-gray-400">
                                        {rincian.cancellation ? 'Diganti biaya cancellation' : data.harga_perkiraan ? 'Perkiraan' : ''}
                                    </td>
                                    <td className={`py-2 text-right ${rincian.cancellation ? 'line-through text-gray-400' : ''}`}>
                                        {data.harga_deal != null ? formatRupiah(data.harga_deal) : <span className="text-xs text-red-500">Tarif belum diatur</span>}
                                    </td>
                                </tr>
                                {rincian.komponen.map(k => (
                                    <tr key={k.kode}>
                                        <td className="py-2 pr-4">{k.label}</td>
                                        <td className="py-2 pr-4 text-xs text-gray-400">{keteranganJumlah(k)}</td>
                                        <td className="py-2 text-right">{formatRupiah(k.nominal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-gray-100 dark:border-gray-700">
                                    <td className="pt-2 pr-4 text-gray-500 font-medium" colSpan={2}>Total Harga + Parameter</td>
                                    <td className="pt-2 text-right font-bold text-blue-700 dark:text-blue-300">
                                        {data.total_tagihan != null ? formatRupiah(data.total_tagihan) : '—'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {data.mode === 'cancellation' && !rincian.cancellation ? (
                        <p className="text-xs text-gray-400 mt-2">Trip dibatalkan tidak ditagihkan, kecuali ditandai Cancellation.</p>
                    ) : (
                        <>
                            {!data.add_drop_manual && data.nilai.jumlah_add_drop > 0 && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Add Drop terisi otomatis dari {data.jumlah_titik_drop} titik drop di penugasan. Bisa diubah lewat tombol Atur.
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">Biaya tagihan lain dari laporan perjalanan ikut dijumlahkan di Konsolidasi Klien.</p>
                        </>
                    )}

                    {(data.nilai.keterangan || data.diubah_oleh) && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                            {data.nilai.keterangan && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">Keterangan: {data.nilai.keterangan}</p>
                            )}
                            {data.diubah_oleh && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Diisi: {data.diubah_oleh}{data.diubah_pada ? ` · ${dayjs(data.diubah_pada).format('DD MMM YYYY HH:mm')}` : ''}
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            <ParameterTagihanDialog
                idTrip={idTrip}
                isOpen={dialogOpen}
                data={data}
                onClose={() => setDialogOpen(false)}
                onSaved={hasil => { setData(hasil); setDialogOpen(false) }}
            />
        </Card>
    )
}

export function ParameterTagihanDialog({ idTrip, isOpen, data: dataAwal, info, onClose, onSaved }: {
    idTrip: string | null
    isOpen: boolean
    data?: ParameterTagihanTrip | null
    info?: string
    onClose: () => void
    onSaved: (hasil: ParameterTagihanTrip) => void
}) {
    const [data, setData]             = useState<ParameterTagihanTrip | null>(null)
    const [loading, setLoading]       = useState(false)
    const [overnight, setOvernight]   = useState('')
    const [addDrop, setAddDrop]       = useState('')
    const [crossCluster, setCrossCluster] = useState(false)
    const [cancellation, setCancellation] = useState(false)
    const [keterangan, setKeterangan] = useState('')
    const [saving, setSaving]         = useState(false)

    const isiForm = (d: ParameterTagihanTrip) => {
        setData(d)
        setOvernight(d.nilai.jumlah_overnight ? String(d.nilai.jumlah_overnight) : '')
        setAddDrop(d.nilai.jumlah_add_drop ? String(d.nilai.jumlah_add_drop) : '')
        setCrossCluster(d.nilai.cross_cluster)
        setCancellation(d.nilai.cancellation)
        setKeterangan(d.nilai.keterangan ?? '')
    }

    useEffect(() => {
        if (!isOpen || !idTrip) return
        if (dataAwal) {
            isiForm(dataAwal)
            return
        }
        let batal = false
        setData(null)
        setLoading(true)
        parameterTagihanTripService.detail(idTrip)
            .then(d => { if (!batal) isiForm(d) })
            .catch(err => {
                if (batal) return
                toast.push(<Notification type="danger" title={parseApiError(err)} />)
                onClose()
            })
            .finally(() => { if (!batal) setLoading(false) })
        return () => { batal = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, idTrip])

    const normal = data?.mode === 'normal'
    const tarif = data?.tarif

    const pratinjau = useMemo(() => {
        if (!data || !tarif) return null
        if (!normal) {
            if (!cancellation) return null
            return tarif.cancellation ?? 0
        }
        if (data.harga_deal == null) return null
        return data.harga_deal
            + Number(overnight || 0) * (tarif.overnight ?? 0)
            + Number(addDrop || 0) * (tarif.add_drop ?? 0)
            + (crossCluster ? tarif.cross_cluster ?? 0 : 0)
    }, [data, tarif, normal, overnight, addDrop, crossCluster, cancellation])

    const adaParameter = normal
        ? Number(overnight || 0) > 0 || Number(addDrop || 0) > 0 || crossCluster
        : cancellation

    const handleSimpan = async () => {
        if (!idTrip) return
        if (adaParameter && !keterangan.trim()) {
            toast.push(<Notification type="warning" title="Keterangan wajib diisi" />)
            return
        }
        setSaving(true)
        try {
            const hasil = await parameterTagihanTripService.simpan(idTrip, {
                jumlah_overnight: normal ? Number(overnight || 0) : 0,
                jumlah_add_drop:  normal ? Number(addDrop || 0) : 0,
                cross_cluster:    normal && crossCluster,
                cancellation:     !normal && cancellation,
                keterangan:       keterangan.trim() || null,
            })
            toast.push(<Notification type="success" title="Parameter tagihan disimpan" />)
            onSaved(hasil)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setSaving(false)
        }
    }

    const tarifKosong = <span className="text-xs text-gray-400">Tarif belum diatur di penawaran</span>

    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={560}>
            <h5 className="text-base font-semibold mb-1">Atur Parameter Tagihan</h5>
            {info && <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{info}</p>}
            <p className="text-xs text-gray-400 mb-4">
                {!data
                    ? 'Memuat data trip...'
                    : normal
                        ? 'Isi bila trip ini kena biaya tambahan di luar harga deal. Kosongkan bila tidak berlaku.'
                        : 'Trip dibatalkan hanya bisa ditagih biaya cancellation, menggantikan harga deal.'}
            </p>
            {loading || !data ? (
                <div className="flex items-center justify-center py-10"><Spinner /></div>
            ) : (
                <form onSubmit={e => { e.preventDefault(); handleSimpan() }}>
                    {normal ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                            <FormItem label="Overnight" extra={tarif?.overnight != null ? <span className="text-xs text-gray-400 ml-1">({formatRupiah(tarif.overnight)} / malam)</span> : undefined}>
                                {tarif?.overnight != null ? (
                                    <Input suffix="malam" placeholder="0" value={overnight}
                                        onChange={e => setOvernight(batasiAngka(e.target.value, MAKS_OVERNIGHT))} />
                                ) : tarifKosong}
                            </FormItem>
                            <FormItem label="Add Drop" extra={tarif?.add_drop != null ? <span className="text-xs text-gray-400 ml-1">({formatRupiah(tarif.add_drop)} / drop)</span> : undefined}>
                                {tarif?.add_drop != null ? (
                                    <>
                                        <Input suffix="drop" placeholder="0" value={addDrop}
                                            onChange={e => setAddDrop(batasiAngka(e.target.value, MAKS_ADD_DROP))} />
                                        {data.jumlah_titik_drop >= 1 && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {Number(addDrop || 0) === usulAddDrop(data.jumlah_titik_drop) ? (
                                                    data.add_drop_manual
                                                        ? `Sama dengan ${data.jumlah_titik_drop} titik drop di penugasan`
                                                        : `Otomatis dari ${data.jumlah_titik_drop} titik drop di penugasan, bisa diubah`
                                                ) : (
                                                    <>
                                                        Penugasan punya {data.jumlah_titik_drop} titik drop
                                                        {' — '}
                                                        <button type="button" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                                            onClick={() => setAddDrop(String(usulAddDrop(data.jumlah_titik_drop)))}>
                                                            isi {usulAddDrop(data.jumlah_titik_drop)}
                                                        </button>
                                                    </>
                                                )}
                                            </p>
                                        )}
                                    </>
                                ) : tarifKosong}
                            </FormItem>
                            <div className="sm:col-span-2">
                                <FormItem label="Cross Cluster">
                                    {tarif?.cross_cluster != null ? (
                                        <Checkbox checked={crossCluster} onChange={(checked: boolean) => setCrossCluster(checked)}>
                                            Trip lintas cluster ({formatRupiah(tarif.cross_cluster)})
                                        </Checkbox>
                                    ) : tarifKosong}
                                </FormItem>
                            </div>
                        </div>
                    ) : (
                        <FormItem label="Cancellation">
                            {tarif?.cancellation != null ? (
                                <Checkbox checked={cancellation} onChange={(checked: boolean) => setCancellation(checked)}>
                                    Tagih biaya cancellation ke klien ({formatRupiah(tarif.cancellation)})
                                </Checkbox>
                            ) : tarifKosong}
                        </FormItem>
                    )}

                    <FormItem label="Keterangan" asterisk={adaParameter}>
                        <Input textArea rows={3} maxLength={500}
                            placeholder="Contoh: Bongkar tertunda, gudang klien tutup jam 17.00"
                            value={keterangan} onChange={e => setKeterangan(e.target.value)} />
                    </FormItem>

                    <div className="rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                        <span className="text-xs text-blue-500 dark:text-blue-400">Total tagihan trip</span>
                        <span className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                            {pratinjau != null ? formatRupiah(pratinjau) : '—'}
                        </span>
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button type="button" variant="plain" onClick={onClose}>Kembali</Button>
                        <Button type="submit" variant="solid" loading={saving}>Simpan</Button>
                    </div>
                </form>
            )}
        </Dialog>
    )
}
