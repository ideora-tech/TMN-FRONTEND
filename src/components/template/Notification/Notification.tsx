'use client'

import { useEffect, useState, useRef } from 'react'
import classNames from 'classnames'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import Dropdown from '@/components/ui/Dropdown'
import ScrollBar from '@/components/ui/ScrollBar'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import NotificationAvatar from './NotificationAvatar'
import NotificationToggle from './NotificationToggle'
import { HiOutlineMailOpen } from 'react-icons/hi'
import { notifikasiService } from '@/services/notifikasi.service'
import type { Notifikasi } from '@/services/notifikasi.service'
import isLastChild from '@/utils/isLastChild'
import useResponsive from '@/utils/hooks/useResponsive'

import type { DropdownRef } from '@/components/ui/Dropdown'

type LocalNotifikasi = Notifikasi & { _dibacaLocal: boolean }

const notificationHeight = 'h-[280px]'

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

const tipeToAvatarType = (tipe: Notifikasi['tipe']): number => {
    switch (tipe) {
        case 'reminder_trip':
            return 1
        case 'alert_dokumen':
            return 2
        default:
            return 0
    }
}

const _Notification = ({ className }: { className?: string }) => {
    const [notificationList, setNotificationList] = useState<LocalNotifikasi[]>([])
    const [unreadNotification, setUnreadNotification] = useState(false)
    const [noResult, setNoResult] = useState(false)
    const [loading, setLoading] = useState(false)

    const { larger } = useResponsive()

    const getNotificationCount = async () => {
        try {
            const count = await notifikasiService.unreadCount()
            if (count > 0) {
                setNoResult(false)
                setUnreadNotification(true)
            } else {
                setNoResult(true)
            }
        } catch {
            // silent – badge stays off
        }
    }

    useEffect(() => {
        getNotificationCount()
    }, [])

    const onNotificationOpen = async () => {
        if (notificationList.length === 0) {
            setLoading(true)
            try {
                const resp = await notifikasiService.list({ limit: 10 })
                const list: LocalNotifikasi[] = (resp.data ?? []).map(
                    (n: Notifikasi) => ({ ...n, _dibacaLocal: n.dibaca }),
                )
                setNotificationList(list)
                if (list.length === 0) setNoResult(true)
            } catch {
                setNoResult(true)
            } finally {
                setLoading(false)
            }
        }
    }

    const onMarkAllAsRead = async () => {
        try {
            await notifikasiService.markAllRead()
        } catch {
            // optimistic – UI updates regardless
        }
        setNotificationList((prev) =>
            prev.map((item) => ({ ...item, _dibacaLocal: true })),
        )
        setUnreadNotification(false)
    }

    const onMarkAsRead = async (id: string) => {
        try {
            await notifikasiService.markRead(id)
        } catch {
            // optimistic
        }
        setNotificationList((prev) => {
            const updated = prev.map((item) =>
                item.id_notifikasi === id
                    ? { ...item, _dibacaLocal: true }
                    : item,
            )
            const hasUnread = updated.some((item) => !item._dibacaLocal)
            if (!hasUnread) setUnreadNotification(false)
            return updated
        })
    }

    const notificationDropdownRef = useRef<DropdownRef>(null)

    return (
        <Dropdown
            ref={notificationDropdownRef}
            renderTitle={
                <NotificationToggle
                    dot={unreadNotification}
                    className={className}
                />
            }
            menuClass="min-w-[280px] md:min-w-[340px]"
            placement={larger.md ? 'bottom-end' : 'bottom'}
            onOpen={onNotificationOpen}
        >
            <Dropdown.Item variant="header">
                <div className="dark:border-gray-700 px-2 flex items-center justify-between mb-1">
                    <h6>Notifikasi</h6>
                    <Tooltip title="Tandai semua dibaca">
                        <Button
                            variant="plain"
                            shape="circle"
                            size="sm"
                            icon={<HiOutlineMailOpen className="text-xl" />}
                            onClick={onMarkAllAsRead}
                        />
                    </Tooltip>
                </div>
            </Dropdown.Item>
            <ScrollBar
                className={classNames('overflow-y-auto', notificationHeight)}
            >
                {notificationList.length > 0 &&
                    notificationList.map((item, index) => (
                        <div key={item.id_notifikasi}>
                            <div
                                className="relative rounded-xl flex px-4 py-3 cursor-pointer hover:bg-gray-100 active:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => onMarkAsRead(item.id_notifikasi)}
                            >
                                <div>
                                    <NotificationAvatar
                                        type={tipeToAvatarType(item.tipe)}
                                        target={item.judul}
                                        image=""
                                        status="succeed"
                                    />
                                </div>
                                <div className="mx-3">
                                    <div>
                                        <span className="font-semibold heading-text">
                                            {item.judul}{' '}
                                        </span>
                                        <span>{item.isi}</span>
                                    </div>
                                    <span className="text-xs">
                                        {formatDate(item.dibuat_pada)}
                                    </span>
                                </div>
                                <Badge
                                    className="absolute top-4 ltr:right-4 rtl:left-4 mt-1.5"
                                    innerClass={`${
                                        item._dibacaLocal
                                            ? 'bg-gray-300 dark:bg-gray-600'
                                            : 'bg-primary'
                                    }`}
                                />
                            </div>
                            {!isLastChild(notificationList, index) ? (
                                <div className="border-b border-gray-200 dark:border-gray-700 my-2" />
                            ) : (
                                ''
                            )}
                        </div>
                    ))}
                {loading && (
                    <div
                        className={classNames(
                            'flex items-center justify-center',
                            notificationHeight,
                        )}
                    >
                        <Spinner size={40} />
                    </div>
                )}
                {noResult && notificationList.length === 0 && !loading && (
                    <div
                        className={classNames(
                            'flex items-center justify-center',
                            notificationHeight,
                        )}
                    >
                        <div className="text-center">
                            <img
                                className="mx-auto mb-2 max-w-[150px]"
                                src="/img/others/no-notification.png"
                                alt="no-notification"
                            />
                            <h6 className="font-semibold">Tidak ada notifikasi!</h6>
                            <p className="mt-1">Semua notifikasi sudah dibaca</p>
                        </div>
                    </div>
                )}
            </ScrollBar>
            <Dropdown.Item variant="header">
                <div className="pt-4">
                    <Button
                        block
                        variant="solid"
                        onClick={() =>
                            notificationDropdownRef.current?.handleDropdownClose()
                        }
                    >
                        Tutup
                    </Button>
                </div>
            </Dropdown.Item>
        </Dropdown>
    )
}

const Notification = withHeaderItem(_Notification)

export default Notification
