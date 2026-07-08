'use client'

import { useEffect, useState } from 'react'

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function pad(n: number) {
    return String(n).padStart(2, '0')
}

const HeaderClock = () => {
    const [now, setNow] = useState<Date | null>(null)

    useEffect(() => {
        setNow(new Date())
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    if (!now) return null

    const hari    = HARI[now.getDay()]
    const tanggal = now.getDate()
    const bulan   = BULAN[now.getMonth()]
    const tahun   = now.getFullYear()
    const jam     = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    return (
        <div className="flex flex-col select-none ml-4">
            <span className="text-base font-mono font-bold text-gray-700 dark:text-gray-200 leading-tight tracking-wide">
                {jam}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                {hari}, {tanggal} {bulan} {tahun}
            </span>
        </div>
    )
}

export default HeaderClock
