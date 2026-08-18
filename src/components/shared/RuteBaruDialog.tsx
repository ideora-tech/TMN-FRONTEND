'use client'
import { useEffect, useState } from 'react'
import { Button, Dialog, FormItem, Input, toast, Notification } from '@/components/ui'
import Select from '@/components/ui/Select'
import { ruteService, Rute } from '@/services/rute.service'
import { lokasiService } from '@/services/lokasi.service'
import { parseApiError } from '@/utils/error.util'

type Option = { value: string; label: string }

type FormRuteBaru = {
    nama_rute: string
    id_lokasi_asal: string
    id_lokasi_tujuan: string
    estimasi_jarak_km: string
    estimasi_durasi_menit: string
}

const FORM_RUTE_KOSONG: FormRuteBaru = {
    nama_rute: '', id_lokasi_asal: '', id_lokasi_tujuan: '',
    estimasi_jarak_km: '', estimasi_durasi_menit: '',
}

export function RuteBaruForm({ onBatal, onSaved }: {
    onBatal: () => void
    onSaved: (rute: Rute) => void
}) {
    const [formRute, setFormRute] = useState<FormRuteBaru>(FORM_RUTE_KOSONG)
    const [errorsRute, setErrorsRute] = useState<Partial<Record<'nama_rute', string>>>({})
    const [lokasiOptions, setLokasiOptions] = useState<Option[]>([])
    const [menyimpan, setMenyimpan] = useState(false)

    useEffect(() => {
        lokasiService.list(1, 200)
            .then(res => setLokasiOptions(res.data.map(l => ({
                value: l.id_lokasi,
                label: `${l.nama_lokasi}${l.kota && l.kota.trim().toLowerCase() !== l.nama_lokasi.trim().toLowerCase() ? ' — ' + l.kota : ''}`,
            }))))
            .catch(() => {})
    }, [])

    const simpan = async (e: React.FormEvent) => {
        e.preventDefault()
        const errs: Partial<Record<'nama_rute', string>> = {}
        if (!formRute.nama_rute.trim()) errs.nama_rute = 'Nama rute wajib diisi'
        setErrorsRute(errs)
        if (Object.keys(errs).length > 0) return

        setMenyimpan(true)
        try {
            const rute = await ruteService.create({
                nama_rute: formRute.nama_rute.trim(),
                id_lokasi_asal: formRute.id_lokasi_asal || null,
                id_lokasi_tujuan: formRute.id_lokasi_tujuan || null,
                estimasi_jarak_km: formRute.estimasi_jarak_km ? parseFloat(formRute.estimasi_jarak_km) : null,
                estimasi_durasi_menit: formRute.estimasi_durasi_menit ? parseInt(formRute.estimasi_durasi_menit) : null,
            })
            onSaved(rute)
        } catch (err) {
            toast.push(<Notification type="danger" title={parseApiError(err)} />)
        } finally {
            setMenyimpan(false)
        }
    }

    return (
        <form onSubmit={simpan}>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    <FormItem label="Nama Rute" asterisk invalid={!!errorsRute.nama_rute} errorMessage={errorsRute.nama_rute} className="sm:col-span-2">
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
    onSaved: (rute: Rute) => void
}) {
    return (
        <Dialog isOpen={isOpen} onRequestClose={onClose} onClose={onClose} width={800}>
            <h5 className="text-base font-semibold mb-1">Rute Baru</h5>
            <p className="text-xs text-gray-400 mb-4">Rute baru langsung bisa dipakai setelah disimpan</p>
            {isOpen && <RuteBaruForm onBatal={onClose} onSaved={onSaved} />}
        </Dialog>
    )
}
