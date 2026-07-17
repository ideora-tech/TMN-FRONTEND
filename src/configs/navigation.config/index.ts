import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'

import type { NavigationTree } from '@/@types/navigation'

const ADMIN_UP = ['superadmin', 'admin']
const SUPERADMIN_ONLY = ['superadmin']

const navigationConfig: NavigationTree[] = [
    // === DASHBOARD ===
    {
        key: 'home', path: '/home', title: 'Dashboard',
        translateKey: 'nav.home', icon: 'home',
        type: NAV_ITEM_TYPE_ITEM, authority: [], subMenu: [],
    },

    // === SALES ===
    {
        key: 'nav.sales', path: '', title: 'Sales',
        translateKey: 'nav.sales', icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ['sales', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'klien', path: '/klien', title: 'Klien',
        translateKey: 'nav.klien', icon: 'handshake',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['sales', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'tarifRute', path: '/tarif-rute', title: 'Tarif Rute',
        translateKey: 'nav.tarifRute', icon: 'fileText',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['sales', 'manager', 'admin', 'superadmin'],
        subMenu: [],
    },
    {
        key: 'penawaran', path: '/penawaran', title: 'Penawaran',
        translateKey: 'nav.penawaran', icon: 'notepad',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['sales', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'project', path: '/project', title: 'Project',
        translateKey: 'nav.project', icon: 'briefcase',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['sales', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },

    // === OPERASIONAL ===
    {
        key: 'nav.operasional', path: '', title: 'Operasional',
        translateKey: 'nav.operasional', icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'armada', path: '/armada', title: 'Armada',
        translateKey: 'nav.armada', icon: 'truck',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'supir', path: '/supir', title: 'Supir',
        translateKey: 'nav.supir', icon: 'users',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'vendor', path: '/vendor', title: 'Vendor',
        translateKey: 'nav.vendor', icon: 'building',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'kontrak-vendor', path: '/kontrak-vendor', title: 'Kontrak Vendor',
        translateKey: 'nav.kontrakVendor', icon: 'contract',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'rute', path: '/rute', title: 'Rute',
        translateKey: 'nav.rute', icon: 'path',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'penugasan', path: '/penugasan', title: 'Penugasan',
        translateKey: 'nav.penugasan', icon: 'userCheck',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'jadwal', path: '/jadwal', title: 'Jadwal',
        translateKey: 'nav.jadwal', icon: 'calendar',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'trip', path: '/trip', title: 'Trip Monitor',
        translateKey: 'nav.trip', icon: 'mapPin',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'laporan', path: '/laporan', title: 'Laporan',
        translateKey: 'nav.laporan', icon: 'clipboard',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'keuangan', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },

    // === OPERASIONAL VENDOR ===
    {
        key: 'nav.operasionalVendor', path: '', title: 'Operasional Vendor',
        translateKey: 'nav.operasionalVendor', icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'armada-vendor', path: '/armada-vendor', title: 'Armada Vendor',
        translateKey: 'nav.armadaVendor', icon: 'truck',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'supir-vendor', path: '/supir-vendor', title: 'Supir Vendor',
        translateKey: 'nav.supirVendor', icon: 'users',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'penugasan-vendor', path: '/penugasan-vendor', title: 'Penugasan Vendor',
        translateKey: 'nav.penugasanVendor', icon: 'clipboard',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },

    // === SDM ===
    {
        key: 'nav.sdm', path: '', title: 'SDM',
        translateKey: 'nav.sdm', icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ['manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'karyawan', path: '/karyawan', title: 'Karyawan',
        translateKey: 'nav.karyawan', icon: 'idCard',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'departemen', path: '/departemen', title: 'Departemen',
        translateKey: 'nav.departemen', icon: 'treeStructure',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'jabatan', path: '/jabatan', title: 'Jabatan',
        translateKey: 'nav.jabatan', icon: 'medal',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['manager', 'superadmin', 'admin'],
        subMenu: [],
    },

    // === KEUANGAN ===
    {
        key: 'nav.keuangan', path: '', title: 'Keuangan',
        translateKey: 'nav.keuangan', icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ['keuangan', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'faktur', path: '/faktur', title: 'Faktur',
        translateKey: 'nav.faktur', icon: 'receipt',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['keuangan', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'rekonsiliasi', path: '/rekonsiliasi', title: 'Rekonsiliasi',
        translateKey: 'nav.rekonsiliasi', icon: 'repeat',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['keuangan', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },

    // === PENGATURAN ===
    {
        key: 'nav.pengaturan', path: '', title: 'Pengaturan',
        translateKey: 'nav.pengaturan', icon: '',
        type: NAV_ITEM_TYPE_TITLE,
        authority: ADMIN_UP,
        subMenu: [],
    },
    {
        key: 'pengguna', path: '/pengguna', title: 'Pengguna',
        translateKey: 'nav.pengguna', icon: 'usersThree',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ADMIN_UP,
        subMenu: [],
    },
    {
        key: 'peran', path: '/peran', title: 'Peran & Akses',
        translateKey: 'nav.peran', icon: 'key',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ADMIN_UP,
        subMenu: [],
    },
    {
        key: 'perusahaan', path: '/perusahaan', title: 'Perusahaan',
        translateKey: 'nav.perusahaan', icon: 'office',
        type: NAV_ITEM_TYPE_ITEM,
        authority: SUPERADMIN_ONLY,
        subMenu: [],
    },
    {
        key: 'jenis-kendaraan', path: '/jenis-kendaraan', title: 'Jenis Kendaraan',
        translateKey: 'nav.jenisKendaraan', icon: 'carProfile',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ADMIN_UP,
        subMenu: [],
    },
    {
        key: 'lokasi-kantor', path: '/lokasi-kantor', title: 'Lokasi Kantor',
        translateKey: 'nav.lokasiKantor', icon: 'map',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ADMIN_UP,
        subMenu: [],
    },
    {
        key: 'lokasi', path: '/lokasi', title: 'Lokasi',
        translateKey: 'nav.lokasi', icon: 'mapPin',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'jenis-bbm', path: '/jenis-bbm', title: 'Jenis BBM',
        translateKey: 'nav.jenisBbm', icon: 'gasPump',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['dispatcher', 'manager', 'superadmin', 'admin'],
        subMenu: [],
    },
    {
        key: 'parameterBok', path: '/parameter-bok', title: 'Parameter BOK',
        translateKey: 'nav.parameterBok', icon: 'wrench',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ['manager', 'admin', 'superadmin'],
        subMenu: [],
    },
    {
        key: 'log-error', path: '/log-error', title: 'Log Error',
        translateKey: 'nav.logError', icon: 'bug',
        type: NAV_ITEM_TYPE_ITEM,
        authority: ADMIN_UP,
        subMenu: [],
    },
]

export default navigationConfig
