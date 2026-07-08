import {
    PiHouseLineDuotone,
    PiBriefcaseDuotone,
    PiTruckDuotone,
    PiUsersDuotone,
    PiBuildingsDuotone,
    PiCalendarDuotone,
    PiMapPinDuotone,
    PiClipboardTextDuotone,
    PiReceiptDuotone,
    PiRepeatDuotone,
    PiHandshakeDuotone,
    PiGearDuotone,
    PiUserCheckDuotone,
    PiShieldCheckDuotone,
    PiDatabaseDuotone,
    PiStackDuotone,
    PiUserCircleDuotone,
    PiPathDuotone,
    PiNotepadDuotone,
    PiBugDuotone,
} from 'react-icons/pi'
import type { JSX } from 'react'

export type NavigationIcons = Record<string, JSX.Element>

const navigationIcon: NavigationIcons = {
    home:       <PiHouseLineDuotone />,
    briefcase:  <PiBriefcaseDuotone />,
    handshake:  <PiHandshakeDuotone />,
    truck:      <PiTruckDuotone />,
    users:     <PiUsersDuotone />,
    building:  <PiBuildingsDuotone />,
    calendar:  <PiCalendarDuotone />,
    mapPin:    <PiMapPinDuotone />,
    clipboard: <PiClipboardTextDuotone />,
    receipt:    <PiReceiptDuotone />,
    repeat:     <PiRepeatDuotone />,
    settings:   <PiGearDuotone />,
    userCheck:  <PiUserCheckDuotone />,
    shield:     <PiShieldCheckDuotone />,
    database:   <PiDatabaseDuotone />,
    layers:     <PiStackDuotone />,
    userCircle: <PiUserCircleDuotone />,
    path:       <PiPathDuotone />,
    notepad:    <PiNotepadDuotone />,
    bug:        <PiBugDuotone />,
}

export default navigationIcon
