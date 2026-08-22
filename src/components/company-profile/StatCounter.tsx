'use client'
import { useEffect, useRef, useState } from 'react'
import { useCountUp } from './useCountUp'
import { WARNA } from '@/constants/companyProfile.data'

export default function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
    const ref = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState(false)
    const count = useCountUp(value, 1800, active)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            entries => entries.forEach(e => e.isIntersecting && setActive(true)),
            { threshold: 0.4 },
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [])

    const display = value >= 1000 ? count.toLocaleString('id-ID') : String(count)

    return (
        <div ref={ref} className="text-center">
            <div className="text-3xl md:text-4xl font-bold tabular-nums" style={{ fontFamily: 'Poppins, sans-serif', color: WARNA.navy }}>
                {display}{suffix}
            </div>
            <div className="text-sm text-slate-500 mt-1">{label}</div>
        </div>
    )
}
