export function nomorSaatGantiJenis(jenisLama: string, jenisBaru: string, nomor: string, nikKtp?: string | null): string {
    const nik = nikKtp?.trim() ?? ''
    if (jenisBaru === 'KTP') return nik || nomor
    if (jenisLama === 'KTP' && nik !== '' && nomor.trim() === nik) return ''
    return nomor
}

export function nomorAwalDokumen(jenis: string, nomor: string | null | undefined, nikKtp?: string | null): string {
    const nik = nikKtp?.trim() ?? ''
    return jenis === 'KTP' && nik !== '' ? nik : (nomor ?? '')
}
