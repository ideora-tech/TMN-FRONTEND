export const formatDurasiMenit = (menit: number | null | undefined): string => {
    if (menit == null) return '—'
    if (menit < 1) return '< 1 menit'
    const hari = Math.floor(menit / 1440)
    const jam = Math.floor((menit % 1440) / 60)
    const sisa = menit % 60
    if (hari > 0) return jam > 0 ? `${hari} hari ${jam} jam` : `${hari} hari`
    if (jam > 0) return sisa > 0 ? `${jam} jam ${sisa} menit` : `${jam} jam`
    return `${sisa} menit`
}
