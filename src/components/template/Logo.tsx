import classNames from 'classnames'
import Image from 'next/image'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    mode?: 'light' | 'dark'
    imgClass?: string
    logoWidth?: number
    logoHeight?: number
}

const Logo = (props: LogoProps) => {
    const { className, imgClass, style, logoWidth, logoHeight } = props

    // SLI logo is square — always use equal width/height so Next.js optimizes correctly
    const size = logoWidth || logoHeight || 200

    return (
        <div className={classNames('logo', className)} style={style}>
            <Image
                className={classNames('w-auto', imgClass)}
                src="/img/logo/logo-sli.png"
                alt="Sulita Logistik Indonesia"
                width={size}
                height={size}
                priority
            />
        </div>
    )
}

export default Logo
