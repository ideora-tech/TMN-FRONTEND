import { useEffect, useState } from 'react'
import { proyekRuteService, ProyekRute } from '@/services/proyekRute.service'

export type EstimasiItemOption = { value: string; label: string }

export function useEstimasiPenugasan(idProyek: string | null) {
    const [items, setItems] = useState<ProyekRute[]>([])
    const [selectedItemId, setSelectedItemId] = useState('')

    useEffect(() => {
        setItems([])
        setSelectedItemId('')
        if (!idProyek) return
        let batal = false
        proyekRuteService.list(idProyek)
            .then(list => {
                if (batal || list.length === 0) return
                setItems(list)
                setSelectedItemId(list[0].id_proyek_rute)
            })
            .catch(() => {})
        return () => { batal = true }
    }, [idProyek])

    const selected = items.find(i => i.id_proyek_rute === selectedItemId) ?? null
    const estimasi = selected?.estimasi_biaya ?? null
    const namaRute = selected ? (selected.nama_rute ?? selected.kode_rute ?? '') : ''
    const dataTidakLengkap = selected != null && estimasi == null

    const itemOptions: EstimasiItemOption[] = items.map(i => ({
        value: i.id_proyek_rute,
        label: [i.nama_rute ?? i.kode_rute ?? 'Rute', i.nama_jenis].filter(Boolean).join(' — '),
    }))

    return { itemOptions, selectedItemId, setSelectedItemId, estimasi, namaRute, dataTidakLengkap }
}
