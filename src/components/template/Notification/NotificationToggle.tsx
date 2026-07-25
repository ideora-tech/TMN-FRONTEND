import classNames from '@/utils/classNames'
import Badge from '@/components/ui/Badge'
import { PiBellDuotone } from 'react-icons/pi'

const NotificationToggle = ({
    className,
    count = 0,
}: {
    className?: string
    count?: number
}) => {
    return (
        <div className={classNames('text-2xl', className)}>
            {count > 0 ? (
                <Badge
                    badgeStyle={{ top: '3px', right: '6px' }}
                    content={count}
                    maxCount={99}
                >
                    <PiBellDuotone />
                </Badge>
            ) : (
                <PiBellDuotone />
            )}
        </div>
    )
}

export default NotificationToggle
