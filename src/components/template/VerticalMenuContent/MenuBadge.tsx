import classNames from 'classnames'

type MenuBadgeProps = {
    jumlah: number
    keterangan?: string
    className?: string
}

const MenuBadge = ({ jumlah, keterangan, className }: MenuBadgeProps) => {
    if (jumlah <= 0) return null

    return (
        <span
            title={keterangan}
            className={classNames(
                'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none',
                className,
            )}
        >
            {jumlah > 99 ? '99+' : jumlah}
        </span>
    )
}

export const MenuBadgeDot = ({ jumlah, keterangan }: MenuBadgeProps) => {
    if (jumlah <= 0) return null

    return (
        <span title={keterangan}
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
    )
}

export default MenuBadge
