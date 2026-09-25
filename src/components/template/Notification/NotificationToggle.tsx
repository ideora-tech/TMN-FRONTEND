import classNames from '@/utils/classNames'
import Badge from '@/components/ui/Badge'
import { PiBellDuotone } from 'react-icons/pi'

const NotificationToggle = ({
    className,
    count = 0,
    baru = false,
}: {
    className?: string
    count?: number
    baru?: boolean
}) => {
    if (count <= 0) {
        return (
            <div className={classNames('text-2xl', className)}>
                <PiBellDuotone />
            </div>
        )
    }

    return (
        <div className={classNames('text-2xl relative', className)}>
            <span
                className="pointer-events-none absolute z-[1] h-5 w-5 rounded-full bg-error opacity-60 animate-ping"
                style={{ top: 3, right: 8 }}
            />
            <Badge
                badgeStyle={{ top: '3px', right: '6px' }}
                content={count}
                maxCount={99}
                innerClass="relative z-[2]"
            >
                <PiBellDuotone className={classNames('animate-lonceng', baru && 'text-red-500')} />
            </Badge>
        </div>
    )
}

export default NotificationToggle
