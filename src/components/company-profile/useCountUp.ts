'use client'
import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration = 1800, active = false) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        if (!active) return
        let raf: number
        const start = performance.now()
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setCount(Math.floor(eased * target))
            if (p < 1) raf = requestAnimationFrame(tick)
            else setCount(target)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [target, duration, active])
    return count
}
