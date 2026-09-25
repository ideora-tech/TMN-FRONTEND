'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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

const notificationHeight = 'h-[360px]'
const LIMIT_PER_HALAMAN = 15
const INTERVAL_CEK_BARU_MS = 60_000

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
        case 'alert_servis':
            return 3
        default:
            return 0
    }
}

const _Notification = ({ className }: { className?: string }) => {
    const router = useRouter()
    const [notificationList, setNotificationList] = useState<LocalNotifikasi[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [adaBaru, setAdaBaru] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [halaman, setHalaman] = useState(1)
    const [totalHalaman, setTotalHalaman] = useState(1)
    const unreadSebelumnya = useRef<number | null>(null)
    const notificationDropdownRef = useRef<DropdownRef>(null)

    const { larger } = useResponsive()

    const getNotificationCount = useCallback(async () => {
        try {
            const count = await notifikasiService.unreadCount()
            if (unreadSebelumnya.current !== null && count > unreadSebelumnya.current) {
                setAdaBaru(true)
            }
            unreadSebelumnya.current = count
            setUnreadCount(count)
        } catch {
            // senyap – badge dibiarkan apa adanya
        }
    }, [])

    useEffect(() => {
        getNotificationCount()
        const timer = setInterval(getNotificationCount, INTERVAL_CEK_BARU_MS)
        window.addEventListener('focus', getNotificationCount)
        return () => {
            clearInterval(timer)
            window.removeEventListener('focus', getNotificationCount)
        }
    }, [getNotificationCount])

    const muatHalaman = async (page: number): Promise<LocalNotifikasi[]> => {
        const resp = await notifikasiService.list({ page, limit: LIMIT_PER_HALAMAN })
        setTotalHalaman(resp.meta?.totalPages ?? 1)
        setHalaman(page)
        return (resp.data ?? []).map((n: Notifikasi) => ({ ...n, _dibacaLocal: n.dibaca }))
    }

    const onNotificationOpen = async (open: boolean) => {
        if (!open) return
        setAdaBaru(false)
        setLoading(true)
        try {
            setNotificationList(await muatHalaman(1))
        } catch {
            setNotificationList([])
        } finally {
            setLoading(false)
        }
        getNotificationCount()
    }

    const onMuatLagi = async () => {
        setLoadingMore(true)
        try {
            const tambahan = await muatHalaman(halaman + 1)
            setNotificationList((prev) => {
                const sudahAda = new Set(prev.map((n) => n.id_notifikasi))
                return [...prev, ...tambahan.filter((n) => !sudahAda.has(n.id_notifikasi))]
            })
        } catch {
            // senyap – tombol bisa dicoba lagi
        } finally {
            setLoadingMore(false)
        }
    }

    const onMarkAllAsRead = async () => {
        setNotificationList((prev) => prev.map((item) => ({ ...item, _dibacaLocal: true })))
        setUnreadCount(0)
        unreadSebelumnya.current = 0
        setAdaBaru(false)
        try {
            await notifikasiService.markAllRead()
        } catch {
            // optimistic – UI sudah diperbarui
        }
    }

    const onMarkAsRead = async (item: LocalNotifikasi) => {
        if (!item._dibacaLocal) {
            setUnreadCount((c) => Math.max(0, c - 1))
            unreadSebelumnya.current = Math.max(0, (unreadSebelumnya.current ?? 1) - 1)
        }
        setNotificationList((prev) =>
            prev.map((n) => (n.id_notifikasi === item.id_notifikasi ? { ...n, _dibacaLocal: true } : n)),
        )
        try {
            await notifikasiService.markRead(item.id_notifikasi)
        } catch {
            // optimistic
        }
    }

    const onNotificationClick = (item: LocalNotifikasi) => {
        onMarkAsRead(item)
        if (item.link) {
            notificationDropdownRef.current?.handleDropdownClose()
            router.push(item.link)
        }
    }

    const kosong = !loading && notificationList.length === 0
    const masihAdaLagi = !loading && notificationList.length > 0 && halaman < totalHalaman

    return (
        <Dropdown
            ref={notificationDropdownRef}
            renderTitle={
                <NotificationToggle
                    count={unreadCount}
                    baru={adaBaru}
                    className={className}
                />
            }
            menuClass="min-w-[280px] md:min-w-[380px]"
            placement={larger.md ? 'bottom-end' : 'bottom'}
            onOpen={onNotificationOpen}
        >
            <Dropdown.Item variant="header">
                <div className="dark:border-gray-700 px-2 flex items-center justify-between mb-1">
                    <div className="flex items-baseline gap-2">
                        <h6>Notifikasi</h6>
                        {unreadCount > 0 && (
                            <span className="text-xs font-semibold text-red-500">
                                {unreadCount > 99 ? '99+' : unreadCount} belum dibaca
                            </span>
                        )}
                    </div>
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
                                className={classNames(
                                    'relative rounded-xl flex px-4 py-3 cursor-pointer hover:bg-gray-100 active:bg-gray-100 dark:hover:bg-gray-700',
                                    !item._dibacaLocal && 'bg-blue-50/60 dark:bg-blue-500/10',
                                )}
                                title={item.link ? 'Klik untuk membuka' : undefined}
                                onClick={() => onNotificationClick(item)}
                            >
                                <div>
                                    <NotificationAvatar
                                        type={tipeToAvatarType(item.tipe)}
                                        target={item.judul}
                                        image=""
                                        status={item.judul.startsWith('[SEGERA]') ? 'urgent' : 'succeed'}
                                    />
                                </div>
                                <div className="mx-3 min-w-0 flex-1 pr-4">
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
                {masihAdaLagi && (
                    <div className="px-4 pt-3 pb-1">
                        <Button block size="sm" variant="plain" loading={loadingMore} onClick={onMuatLagi}>
                            Muat lebih banyak
                        </Button>
                    </div>
                )}
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
                {kosong && (
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
