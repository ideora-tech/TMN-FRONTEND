import { cloneElement } from 'react'
import Image from 'next/image'
import type { CommonProps } from '@/@types/common'

type SideProps = CommonProps

const NAVY = '#1B2D6E'
const NAVY_DARK = '#0D1938'
const CYAN = '#29C4D8'

const Side = ({ children, ...rest }: SideProps) => {
    return (
        <div className="flex h-screen overflow-hidden">
            {/* Left: SLI brand panel */}
            <div
                className="hidden lg:flex lg:w-[44%] shrink-0 flex-col items-center justify-center px-12 relative overflow-hidden"
                style={{
                    background: `linear-gradient(150deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
                }}
            >
                {/* Grid pattern overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                    }}
                />
                {/* Cyan glow top-right */}
                <div
                    className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl pointer-events-none"
                    style={{ background: CYAN, opacity: 0.15 }}
                />
                {/* Cyan glow bottom-left */}
                <div
                    className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
                    style={{ background: CYAN, opacity: 0.08 }}
                />

                <div className="relative z-10 text-center">
                    <Image
                        src="/img/logo/logo-sli.png"
                        alt="Sulita Logistik Indonesia"
                        width={160}
                        height={160}
                        className="brightness-0 invert mx-auto mb-8"
                        priority
                    />
                    <h2
                        className="text-white text-2xl font-bold mb-3 tracking-tight"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                        Sulita Logistik Indonesia
                    </h2>
                    <div
                        className="w-12 h-0.5 mx-auto mb-4 rounded-full"
                        style={{ background: CYAN }}
                    />
                    <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Platform manajemen armada, supir, dan operasional logistik terintegrasi.
                    </p>
                </div>
            </div>

            {/* Right: form panel */}
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 px-6 py-8 overflow-y-auto">
                <div className="w-full max-w-md">
                    {children
                        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          cloneElement(children as React.ReactElement<any>, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
        </div>
    )
}

export default Side
