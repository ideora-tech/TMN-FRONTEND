'use client'
import { useEffect, useState } from 'react'
import { Button, Dialog, FormItem, Input, Tag, Tooltip, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { HiOutlineTrash, HiPlusCircle } from 'react-icons/hi'
import { ruteService, Rute } from '@/services/rute.service'
import { tarifRuteService, TarifRute } from '@/services/tarifRute.service'
import { lokasiService } from '@/services/lokasi.service'
import { jenisKendaraanService, JenisKendaraan } from '@/services/jenis-kendaraan.service'
import { klienService, Klien } from '@/services/klien.service'
import { parseApiError } from '@/utils/error.util'
import { formatRupiah } from '@/utils/formatNumber'
import TarifFields, { TarifFieldsState, EMPTY_TARIF_FIELDS_STATE, tarifFieldsToPayload } from '@/components/shared/TarifFields'

type Option = { value: string; label: string }

type FormRuteBaru = {
    kode_rute: string
    nama_rute: string
    id_lokasi_asal: string
    id_lokasi_tujuan: string
    estimasi_jarak_km: string
    estimasi_durasi_menit: string
}

type StagedTarif = {
    fields: TarifFieldsState
    namaJenis: string
    namaKlien: string | null
}

const FORM_RUTE_KOSONG: FormRuteBaru = {
    kode_rute: '', nama_rute: '', id_lokasi_asal: '', id_lokasi_tujuan: '',
    estimasi_jarak_km: '', estimasi_durasi_menit: '',
}

const TAG_UMUM = 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-0'
const TAG_KLIEN = 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 border-0'

export function RuteBaruForm({ onBatal, onSaved }: {
    onBatal: () => void
    onSaved: (rute: Rute, tarifDibuat: TarifRute[]) => void
}) {
    const [formRute, setFormRute] = useState<FormRuteBaru>(FORM_RUTE_KOSONG)
    const [errorsRute, setErrorsRute] = useState<Partial<Record<'kode_rute' | 'nama_rute', string>>>({})
    const [lokasiOptions, setLokasiOptions] = useState<Option[]>([])
    const [jenisOptions, setJenisOptions] = useState<Option[]>([])
    const [klienOptions, setKlienOptions] = useState<Option[]>([])
    const [showTarifForm, setShowTarifForm] = useState(false)
    const [tarifForm, setTarifForm] = useState<TarifFieldsState>(EMPTY_TARIF_FIELDS_STATE)
    const [stagedTarif, setStagedTarif] = useState<StagedTarif[]>([])
    const [menyimpan, setMenyimpan] = useState(false)

    useEffect(() => {
        lokasiService.list(1, 200)
            .then(res => setLokasiOptions(res.data.map(l => ({
                value: l.id_lokasi,
                label: `${l.nama_lokasi}${l.kota && l.kota.trim().toLowerCase() !== l.nama_lokasi.trim().toLowerCase() ? ' — ' + l.kota : ''}`,
            }))))
            .catch(() => {})
        jenisKendaraanService.list(1, 100)
            .then(res => setJenisOptions(res.data.map((j: JenisKendaraan) => ({ value: j.id_jenis_kendaraan, label: j.nama_jenis }))))
            .catch(() => {})
        klienService.list(1, 100)
            .then(res => setKlienOptions(res.data.map((k: Klien) => ({ value: k.id_klien, label: k.nama_klien }))))
            .catch(() => {})
    }, [])

    const tambahKeDaftarTarif = () => {
        if (!tarifForm.id_jenis_kendaraan || !tarifForm.harga) return
        setStagedTarif(prev => [...prev, {
            fields: tarifForm,
            namaJenis: jenisOptions.find(o => o.value === tarifForm.id_jenis_kendaraan)?.label ?? '',
            namaKlien: tarifForm.id_klien ? (klienOptions.find(o => o.value === tarifForm.id_klien)?.label ?? null) : null,
        }])
        setTarifForm(EMPTY_TARIF_FIELDS_STATE)
        setShowTarifForm(false)
    }

    const simpan = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs: Partial<Record<'kode_rute' | 'nama_rute', string>> = {}
        if (!formRute.kode_rute.trim()) errs.kode_rute = 'Kode rute wajib diisi'
        if (!formRute.nama_rute.trim()) errs.nama_rute = 'Nama rute wajib diisi'
        setErrorsRute(errs)
        if (Object.keys(errs).length > 0) return

        setMenyimpan(true)
        let rute: Rute
        try {
            rute = await ruteService.create({
                kode_rute: formRute.kode_rute.trim(),
                nama_rute: formRute.nama_rute.trim(),
                id_lokasi_asal: formRute.id_lokasi_asal || null,
                id_lokasi_tujuan: formRute.id_lokasi_tujuan || null,
                estimasi_jarak_km: formRute.estimasi_jarak_km ? parseFloat(formRute.estimasi_jarak_km) : null,
                estimasi_durasi_menit: formRute.estimasi_durasi_menit ? parseInt(formRute.estimasi_durasi_menit) : null,
            })
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
            setMenyimpan(false)
            return
        }

        const tarifDibuat: TarifRute[] = []
        const gagal: string[] = []
        for (const staged of stagedTarif) {
            try {
                tarifDibuat.push(await tarifRuteService.create(tarifFieldsToPayload(staged.fields, rute.id_rute)))
            } catch (err) {
                gagal.push(`${staged.namaJenis}: ${parseApiError(err)}`)
            }
        }
        if (gagal.length > 0) {
            toast.push(<Notification type="danger" title={`Sebagian tarif gagal disimpan — ${gagal.join('; ')}`} />)
        }

        setMenyimpan(false)
        onSaved(rute, tarifDibuat)
    }

    return (
        <form onSubmit={simpan}>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    <FormItem label="Kode Rute" asterisk invalid={!!errorsRute.kode_rute} errorMessage={errorsRute.kode_rute}>
                        <Input placeholder="Contoh: RT-001" value={formRute.kode_rute}
                            invalid={!!errorsRute.kode_rute}
                            onChange={e => setFormRute(p => ({ ...p, kode_rute: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Nama Rute" asterisk invalid={!!errorsRute.nama_rute} errorMessage={errorsRute.nama_rute}>
                        <Input placeholder="Contoh: Jakarta - Surabaya" value={formRute.nama_rute}
                            invalid={!!errorsRute.nama_rute}
                            onChange={e => setFormRute(p => ({ ...p, nama_rute: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Asal">
                        <Select<Option> isClearable isSearchable placeholder="Pilih lokasi asal..."
                            options={lokasiOptions}
                            value={lokasiOptions.find(o => o.value === formRute.id_lokasi_asal) ?? null}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                            onChange={opt => setFormRute(p => ({ ...p, id_lokasi_asal: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Tujuan">
                        <Select<Option> isClearable isSearchable placeholder="Pilih lokasi tujuan..."
                            options={lokasiOptions}
                            value={lokasiOptions.find(o => o.value === formRute.id_lokasi_tujuan) ?? null}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                            onChange={opt => setFormRute(p => ({ ...p, id_lokasi_tujuan: opt?.value ?? '' }))} />
                    </FormItem>
                    <FormItem label="Estimasi Jarak (km)">
                        <Input type="number" step="0.01" min="0" placeholder="Contoh: 750.5"
                            value={formRute.estimasi_jarak_km}
                            onChange={e => setFormRute(p => ({ ...p, estimasi_jarak_km: e.target.value }))} />
                    </FormItem>
                    <FormItem label="Estimasi Durasi (menit)">
                        <Input type="number" min="0" placeholder="Contoh: 480"
                            value={formRute.estimasi_durasi_menit}
                            onChange={e => setFormRute(p => ({ ...p, estimasi_durasi_menit: e.target.value }))} />
                    </FormItem>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Tarif Awal (opsional)</p>
                            <p className="text-xs text-gray-400 mt-0.5">{stagedTarif.length} tarif akan disimpan</p>
                        </div>
                        <Button type="button" size="sm" variant="solid" icon={<HiPlusCircle />}
                            onClick={() => { setTarifForm(EMPTY_TARIF_FIELDS_STATE); setShowTarifForm(true) }}>
                            Tambah Tarif
                        </Button>
                    </div>

                    {showTarifForm && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 mb-3">
                            <TarifFields value={tarifForm} onChange={setTarifForm}
                                jenisOptions={jenisOptions} klienOptions={klienOptions} idRute={null} menuPortal />
                            <div className="flex justify-end gap-2 mt-3">
                                <Button type="button" size="sm" variant="plain" onClick={() => setShowTarifForm(false)}>Batal</Button>
                                <Button type="button" size="sm" variant="solid"
                                    disabled={!tarifForm.id_jenis_kendaraan || !tarifForm.harga}
                                    onClick={tambahKeDaftarTarif}>
                                    Tambah ke daftar
                                </Button>
                            </div>
                        </div>
                    )}

                    {stagedTarif.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-50 dark:bg-blue-500/10">
                                    <tr className="text-left text-gray-600 dark:text-gray-300">
                                        <th className="px-2 py-1.5 font-semibold">Jenis Kendaraan</th>
                                        <th className="px-2 py-1.5 font-semibold">Uang Jalan</th>
                                        <th className="px-2 py-1.5 font-semibold">Berlaku Untuk</th>
                                        <th className="px-2 py-1.5 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stagedTarif.map((t, i) => (
                                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                            <td className="px-2 py-2 font-medium text-gray-800 dark:text-gray-200">{t.namaJenis}</td>
                                            <td className="px-2 py-2">{formatRupiah(Number(t.fields.harga))}</td>
                                            <td className="px-2 py-2">
                                                <Tag className={t.namaKlien ? TAG_KLIEN : TAG_UMUM}>
                                                    {t.namaKlien ?? 'Umum'}
                                                </Tag>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <Tooltip title="Hapus">
                                                    <span
                                                        className="cursor-pointer inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 transition-colors"
                                                        onClick={() => setStagedTarif(prev => prev.filter((_, idx) => idx !== i))}
                                                    >
                                                        <HiOutlineTrash />
                                                    </span>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button type="button" variant="plain" onClick={onBatal}>Kembali</Button>
                <Button type="submit" variant="solid" loading={menyimpan}>Simpan Rute</Button>
            </div>
        </form>
    )
}

export default function RuteBaruDialog({ isOpen, onClose, onSaved }: {
    isOpen: boolean
    onClose: () => void
    onSaved: (rute: Rute, tarifDibuat: TarifRute[]) => void
}) {
    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={840}>
            <h5 className="text-base font-semibold mb-1">Rute Baru</h5>
            <p className="text-xs text-gray-400 mb-4">Rute baru langsung bisa dipakai setelah disimpan</p>
            {isOpen && <RuteBaruForm onBatal={onClose} onSaved={onSaved} />}
        </Dialog>
    )
}
