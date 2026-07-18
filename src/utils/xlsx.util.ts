export type GayaSelXlsx = 'polos' | 'judul' | 'header' | 'nama' | 'isi' | 'kosong'

export type SelXlsx = { teks: string; gaya: GayaSelXlsx }

export type OpsiXlsx = {
    gabung?: string[]
    lebarKolom?: { dari: number; sampai: number; lebar: number }[]
    tinggiBaris?: Record<number, number>
}

const GAYA_INDEX: Record<GayaSelXlsx, number> = { polos: 0, judul: 1, header: 2, nama: 3, isi: 4, kosong: 5 }

const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const kolomXlsx = (n: number): string => {
    let s = ''
    let x = n + 1
    while (x > 0) {
        const m = (x - 1) % 26
        s = String.fromCharCode(65 + m) + s
        x = Math.floor((x - 1) / 26)
    }
    return s
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`

const RELS_ROOT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`

const RELS_WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="5"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF1E40AF"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF006100"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF94A3B8"/></left><right style="thin"><color rgb="FF94A3B8"/></right><top style="thin"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

const buatWorkbook = (namaSheet: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(namaSheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`

const buatSheet = (baris: SelXlsx[][], opsi?: OpsiXlsx): string => {
    const cols = opsi?.lebarKolom?.length
        ? `<cols>${opsi.lebarKolom.map(c => `<col min="${c.dari}" max="${c.sampai}" width="${c.lebar}" customWidth="1"/>`).join('')}</cols>`
        : ''
    const rows = baris.map((sel, i) => {
        const r = i + 1
        const tinggi = opsi?.tinggiBaris?.[r]
        const cells = sel.map((c, j) => {
            const ref = `${kolomXlsx(j)}${r}`
            const s = GAYA_INDEX[c.gaya]
            if (c.teks === '') return `<c r="${ref}" s="${s}"/>`
            return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.teks)}</t></is></c>`
        }).join('')
        return `<row r="${r}"${tinggi ? ` ht="${tinggi}" customHeight="1"` : ''}>${cells}</row>`
    }).join('')
    const merges = opsi?.gabung?.length
        ? `<mergeCells count="${opsi.gabung.length}">${opsi.gabung.map(g => `<mergeCell ref="${g}"/>`).join('')}</mergeCells>`
        : ''
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${rows}</sheetData>${merges}</worksheet>`
}

const CRC_TABLE = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
        let c = i
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        t[i] = c >>> 0
    }
    return t
})()

const crc32 = (d: Uint8Array): number => {
    let c = 0xffffffff
    for (let i = 0; i < d.length; i++) c = CRC_TABLE[(c ^ d[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

const DOS_DATE = (1 << 5) | 1

const buatZip = (entri: { nama: string; isi: string }[]): Uint8Array => {
    const enc = new TextEncoder()
    const bagian: Uint8Array[] = []
    const pusat: Uint8Array[] = []
    let offset = 0
    for (const e of entri) {
        const nama = enc.encode(e.nama)
        const data = enc.encode(e.isi)
        const crc = crc32(data)
        const lokal = new Uint8Array(30 + nama.length)
        const lv = new DataView(lokal.buffer)
        lv.setUint32(0, 0x04034b50, true)
        lv.setUint16(4, 20, true)
        lv.setUint16(8, 0, true)
        lv.setUint16(12, DOS_DATE, true)
        lv.setUint32(14, crc, true)
        lv.setUint32(18, data.length, true)
        lv.setUint32(22, data.length, true)
        lv.setUint16(26, nama.length, true)
        lokal.set(nama, 30)
        bagian.push(lokal, data)

        const cd = new Uint8Array(46 + nama.length)
        const cv = new DataView(cd.buffer)
        cv.setUint32(0, 0x02014b50, true)
        cv.setUint16(4, 20, true)
        cv.setUint16(6, 20, true)
        cv.setUint16(10, 0, true)
        cv.setUint16(14, DOS_DATE, true)
        cv.setUint32(16, crc, true)
        cv.setUint32(20, data.length, true)
        cv.setUint32(24, data.length, true)
        cv.setUint16(28, nama.length, true)
        cv.setUint32(42, offset, true)
        cd.set(nama, 46)
        pusat.push(cd)
        offset += lokal.length + data.length
    }
    const cdSize = pusat.reduce((a, b) => a + b.length, 0)
    const eocd = new Uint8Array(22)
    const ev = new DataView(eocd.buffer)
    ev.setUint32(0, 0x06054b50, true)
    ev.setUint16(8, entri.length, true)
    ev.setUint16(10, entri.length, true)
    ev.setUint32(12, cdSize, true)
    ev.setUint32(16, offset, true)
    const hasil = new Uint8Array(offset + cdSize + 22)
    let p = 0
    for (const b of [...bagian, ...pusat, eocd]) {
        hasil.set(b, p)
        p += b.length
    }
    return hasil
}

export function buatXlsx(namaSheet: string, baris: SelXlsx[][], opsi?: OpsiXlsx): Blob {
    const zip = buatZip([
        { nama: '[Content_Types].xml', isi: CONTENT_TYPES },
        { nama: '_rels/.rels', isi: RELS_ROOT },
        { nama: 'xl/workbook.xml', isi: buatWorkbook(namaSheet) },
        { nama: 'xl/_rels/workbook.xml.rels', isi: RELS_WORKBOOK },
        { nama: 'xl/styles.xml', isi: STYLES },
        { nama: 'xl/worksheets/sheet1.xml', isi: buatSheet(baris, opsi) },
    ])
    return new Blob([zip.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
