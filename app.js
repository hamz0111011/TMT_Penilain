// ========== Shorthand helpers ==========
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

// ========== State ==========
const today = new Date().toISOString().slice(0, 10);

let S = {
  program: 'Tailor Made Training',
  tempat: 'Medan',
  tanggal: today,
  penjab: '',
  names: [],
  cur: '0',
  units: {}
};

try {
  const r = localStorage.getItem('penilaianKUK');
  if (r) {
    const o = JSON.parse(r);
    if (o && o.units) S = Object.assign(S, o);
  }
} catch (e) { }

// ========== Persistence ==========
function save() {
  try { localStorage.setItem('penilaianKUK', JSON.stringify(S)); } catch (e) { }
}

// ========== Unit helpers ==========
function unit(k) {
  if (!S.units[k]) S.units[k] = { code: '', title: '', s: [3], bl: {} };
  return S.units[k];
}

const U = () => unit(S.cur);
const eff = u => u.useKuk === false ? u.s.map(() => 1) : u.s;

function fmtTgl() {
  const d = new Date(S.tanggal + 'T00:00:00');
  return isNaN(d)
    ? ''
    : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function final(u, p) {
  const s = eff(u);
  for (let e = 0; e < s.length; e++)
    for (let k = 0; k < s[e]; k++)
      if (u.bl[p + '_' + e + '_' + k]) return 'BL';
  return 'L';
}

// ========== Render: tab unit ==========
function renderSel() {
  unit(S.cur);
  const ks = Object.keys(S.units);
  $('tabs').innerHTML =
    ks.map((k, i) =>
      `<button data-k="${k}" class="${k === S.cur ? 'p' : ''}">${esc(S.units[k].code || ('Unit ' + (i + 1)))}</button>`
    ).join('') +
    `<button data-k="+">+ Tambah unit</button>` +
    (ks.length > 1 ? `<button data-k="-">Hapus unit ini</button>` : '');
}

// ========== Render: field kode & judul ==========
function renderUnitFields() {
  const u = U();
  $('code').value = u.code;
  $('title').value = u.title;
}

// ========== Render: daftar elemen ==========
function renderElems() {
  const u = U();
  $('useKuk').checked = u.useKuk !== false;
  $('elems').innerHTML = u.s.map((n, e) => `
    <div class="el">
      <b>Elemen ${e + 1}</b>
      ${u.useKuk === false ? '' : `
        <div class="step">
          <button data-a="m" data-e="${e}">−</button>
          <span>${n}</span>
          <button data-a="p" data-e="${e}">+</button>
        </div>
        <span class="rng">KUK ${e + 1}.1 sampai ${e + 1}.${n}</span>
      `}
      <span class="sp"></span>
      <button data-a="d" data-e="${e}" ${u.s.length < 2 ? 'disabled' : ''}>Hapus</button>
    </div>
  `).join('');
}

// ========== Render: tabel penilaian ==========
function renderTable() {
  const u = U(), N = S.names, K = u.useKuk !== false, s = eff(u), rs = K ? 2 : 1;

  // — header —
  let h = `<thead><tr><th rowspan=${rs}>No</th><th rowspan=${rs}>Nama Peserta</th>`;
  s.forEach((n, e) => { h += `<th colspan="${n}">Elemen Kompetensi ${e + 1}</th>`; });
  h += `<th rowspan=${rs}>Hasil Akhir</th></tr>` + (K ? '<tr>' : '');
  if (K) s.forEach((n, e) => { for (let k = 0; k < n; k++) h += `<th>KUK ${e + 1}.${k + 1}</th>`; });
  h += (K ? '</tr>' : '') + '</thead><tbody>';

  // — body —
  let nL = 0;
  N.forEach((nm, p) => {
    h += `<tr><td>${p + 1}</td><td class="nm">${esc(nm)}</td>`;
    s.forEach((n, e) => {
      for (let k = 0; k < n; k++) {
        const v = u.bl[p + '_' + e + '_' + k] ? 'BL' : 'L';
        h += `<td><button class="c ${v}" data-p="${p}" data-e="${e}" data-k="${k}">${v}</button></td>`;
      }
    });
    const f = final(u, p);
    if (f === 'L') nL++;
    h += `<td class="f ${f}">${f}</td></tr>`;
  });

  if (!N.length)
    h += `<tr><td colspan="${3 + s.reduce((a, b) => a + b, 0)}" style="color:var(--mut)">Belum ada peserta. Tempel nama di langkah 3.</td></tr>`;

  $('tbl').innerHTML = h + '</tbody>';
  $('rek').innerHTML = N.length
    ? `<span>Peserta: <b>${N.length}</b></span><span>Layak (L): <b>${nL}</b></span><span>Belum layak (BL): <b>${N.length - nL}</b></span>`
    : '';
}

// ========== Render all ==========
function renderAll() { renderSel(); renderUnitFields(); renderElems(); renderTable(); }

// ========== Event: elemen stepper ==========
$('elems').onclick = ev => {
  const b = ev.target.closest('button');
  if (!b) return;
  const u = U(), e = +b.dataset.e, a = b.dataset.a;
  if (a === 'p' && u.s[e] < 12) u.s[e]++;
  if (a === 'm' && u.s[e] > 1) u.s[e]--;
  if (a === 'd' && u.s.length > 1) { u.s.splice(e, 1); u.bl = {}; }
  save(); renderElems(); renderTable();
};

// ========== Event: tambah elemen ==========
$('addEl').onclick = () => {
  const u = U();
  if (u.s.length < 12) { u.s.push(2); save(); renderElems(); renderTable(); }
};

// ========== Event: klik sel tabel ==========
$('tbl').onclick = ev => {
  const b = ev.target.closest('button.c');
  if (!b) return;
  const key = b.dataset.p + '_' + b.dataset.e + '_' + b.dataset.k, u = U();
  if (u.bl[key]) delete u.bl[key]; else u.bl[key] = 1;
  save(); renderTable();
};

// ========== Event: toggle KUK ==========
$('useKuk').onchange = e => { U().useKuk = e.target.checked; save(); renderElems(); renderTable(); };

// ========== Event: semua L ==========
$('allL').onclick = () => { U().bl = {}; save(); renderTable(); };

// ========== Event: navigasi tab unit ==========
$('tabs').onclick = ev => {
  const b = ev.target.closest('button');
  if (!b) return;
  const k = b.dataset.k;
  if (k === '+') {
    const n = Object.keys(S.units).map(Number).filter(x => !isNaN(x));
    const id = String(n.length ? Math.max(...n) + 1 : 0);
    S.cur = id; unit(id);
  } else if (k === '-') {
    delete S.units[S.cur];
    S.cur = Object.keys(S.units)[0];
  } else {
    S.cur = k;
  }
  save(); renderAll();
};

// ========== Event: input fields ==========
$('code').oninput = e => { U().code = e.target.value; save(); renderSel(); };
$('title').oninput = e => { U().title = e.target.value; save(); };
$('names').oninput = e => {
  S.names = e.target.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  save(); renderTable();
};
['program', 'tempat', 'tanggal', 'penjab'].forEach(id => {
  $(id).oninput = e => { S[id] = e.target.value; save(); };
});

// ========== Lebar tabel seragam ==========
// Jumlah kolom KUK terbanyak di antara semua unit. Unit dengan KUK lebih sedikit
// dilebarkan kolomnya supaya total lebar tabel sama dengan unit yang paling banyak.
function maxTotAll() {
  return Math.max(1, ...Object.keys(S.units).map(k => eff(unit(k)).reduce((a, b) => a + b, 0)));
}

// Lebar tiap kolom KUK (satuan karakter Excel) agar total lebar semua tabel sama.
// SheetJS menyimpan lebar kolom = wch + 0.832, jadi padding ini ikut dihitung
// (kalau tidak, tabel dengan kolom lebih banyak jadi sedikit lebih lebar).
const COL_PAD = 0.83203125;
function kukWch(tot) {
  return maxTotAll() * (7 + COL_PAD) / tot - COL_PAD;
}

// ========== Export: build worksheet ==========
function sheetFor(u) {
  const K = u.useKuk !== false;
  const s = eff(u);
  const N = S.names;
  const tot = s.reduce((a, b) => a + b, 0);
  const hr = K ? 2 : 1;   // jumlah baris header tabel

  /*
   * Pemetaan kolom (0-based) — persis seperti file contoh:
   *   col 0 (A) = blank margin
   *   col 1 (B) = No
   *   col 2 (C) = Nama Peserta
   *   col 3..2+tot (D..) = KUK columns
   *   col 3+tot (R) = Hasil Akhir
   */
  const C_NO = 1;
  const C_NAMA = 2;
  const C_KUK0 = 3;
  const C_HASIL = 3 + tot;
  const nc = C_HASIL + 1;   // total kolom

  // Span footer (merge kolom untuk tanggal/penjab/nama — dinaikkan 2 kolom)
  const F_END = C_HASIL;
  const F_START = Math.max(C_KUK0, C_HASIL - 4);

  const A = [];   // array-of-arrays
  const M = [];   // merges

  /* ── Rows 0–3: blank (area logo) ──────────────────────────── */
  for (let i = 0; i < 4; i++) A.push(Array(nc).fill(''));

  /* ── Row 4: Judul ─────────────────────────────────────────── */
  const r4 = Array(nc).fill('');
  r4[C_NO] = 'PENILAIAN PELATIHAN BERBASIS KOMPETENSI';
  A.push(r4);
  M.push({ s: { r: 4, c: C_NO }, e: { r: 4, c: C_HASIL } });

  /* ── Row 5: Program Pelatihan ─────────────────────────────── */
  const r5 = Array(nc).fill('');
  r5[C_NAMA] = 'Program Pelatihan';
  r5[C_KUK0] = S.program;
  A.push(r5);
  M.push({ s: { r: 5, c: C_KUK0 }, e: { r: 5, c: C_HASIL } });

  /* ── Row 6: Unit Kompetensi ───────────────────────────────── */
  const r6 = Array(nc).fill('');
  r6[C_NAMA] = 'Unit Kompetensi';
  r6[C_KUK0] = u.code + ' / ' + u.title;
  A.push(r6);
  M.push({ s: { r: 6, c: C_KUK0 }, e: { r: 6, c: C_HASIL } });

  /* ── Row 7: blank ─────────────────────────────────────────── */
  A.push(Array(nc).fill(''));

  /* ── Row 8: Header tabel baris-1 ──────────────────────────── */
  const h1 = Array(nc).fill('');
  h1[C_NO] = 'No';
  h1[C_NAMA] = 'Nama Peserta';
  let col = C_KUK0;
  s.forEach((n, e) => {
    h1[col] = 'Elemen Kompetensi ' + (e + 1);
    if (n > 1) M.push({ s: { r: 8, c: col }, e: { r: 8, c: col + n - 1 } });
    col += n;
  });
  h1[C_HASIL] = 'Hasil Akhir';
  A.push(h1);

  /* ── Row 9: Header tabel baris-2 (KUK) ────────────────────── */
  if (K) {
    const h2 = Array(nc).fill('');
    let c2 = C_KUK0;
    s.forEach((n, e) => {
      for (let k = 0; k < n; k++) h2[c2++] = 'KUK ' + (e + 1) + '.' + (k + 1);
    });
    h2[C_HASIL] = 'L/BL';
    A.push(h2);
    // No dan Nama di-merge vertikal; Hasil Akhir / L/BL tetap 2 baris terpisah
    M.push(
      { s: { r: 8, c: C_NO }, e: { r: 9, c: C_NO } },
      { s: { r: 8, c: C_NAMA }, e: { r: 9, c: C_NAMA } }
    );
  }

  /* ── Data peserta ─────────────────────────────────────────── */
  const R_DATA_START = 8 + hr;
  N.forEach((nm, p) => {
    const row = Array(nc).fill('');
    row[C_NO] = p + 1;
    row[C_NAMA] = nm;
    let c2 = C_KUK0;
    s.forEach((n, e) => {
      for (let k = 0; k < n; k++)
        row[c2++] = u.bl[p + '_' + e + '_' + k] ? 'BL' : 'L';
    });
    row[C_HASIL] = final(u, p);
    A.push(row);
  });

  const R_DATA_END = N.length > 0 ? R_DATA_START + N.length - 1 : R_DATA_START - 1;

  /* ── Footer ───────────────────────────────────────────────── */
  // 2 baris kosong setelah data
  A.push(Array(nc).fill(''));
  A.push(Array(nc).fill(''));

  // Catatan (di col B = C_NO)
  const catRow = Array(nc).fill('');
  catRow[C_NO] = 'Catatan :';
  A.push(catRow);
  const RI_CATATAN = A.length - 1;

  // Tanggal & tempat (merge 4 kolom terakhir)
  const dateRow = Array(nc).fill('');
  dateRow[F_START] = (S.tempat || '') + ', ' + fmtTgl();
  A.push(dateRow);
  const RI_DATE = A.length - 1;
  M.push({ s: { r: RI_DATE, c: F_START }, e: { r: RI_DATE, c: F_END } });

  // Label "Penjab" (merge 4 kolom terakhir)
  const penjabRow = Array(nc).fill('');
  penjabRow[F_START] = 'Penjab';
  A.push(penjabRow);
  const RI_PENJAB = A.length - 1;
  M.push({ s: { r: RI_PENJAB, c: F_START }, e: { r: RI_PENJAB, c: F_END } });

  // 4 baris kosong (ruang tanda tangan)
  for (let i = 0; i < 4; i++) A.push(Array(nc).fill(''));

  // Nama penjab / tanda tangan
  const nameRow = Array(nc).fill('');
  nameRow[F_START] = S.penjab;
  A.push(nameRow);
  const RI_NAME = A.length - 1;
  M.push({ s: { r: RI_NAME, c: F_START }, e: { r: RI_NAME, c: F_END } });

  /* ── Build worksheet ──────────────────────────────────────── */
  const ws = XLSX.utils.aoa_to_sheet(A);
  ws['!merges'] = M;

  // Lebar kolom
  ws['!cols'] = [
    { wch: 2 },                              // A: margin
    { wch: 5 },                              // B: No
    { wch: 25 },                             // C: Nama Peserta
    ...Array(tot).fill({ wch: kukWch(tot) }),   // D..: KUK (total lebar sama untuk semua unit)
    { wch: 9 }                               // Hasil Akhir
  ];

  // Tinggi baris: logo area normal, judul sedikit lebih tinggi
  ws['!rows'] = Array(A.length).fill(null).map((_, i) =>
    i < 4 ? { hpx: LOGO_ROW_PX } : i === 4 ? { hpx: 20 } : null
  );

  /* ── Styling ──────────────────────────────────────────────── */

  // ncTotal = nc + 2: 2 kolom gap kosong di kanan, border double di tepi ncTotal-1
  const ncTotal   = nc + 2;
  const totalRows = A.length;

  const gc = (r, c) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    return ws[addr];
  };

  const TH    = { style: 'thin',   color: { rgb: '000000' } };
  const DBL   = { style: 'double', color: { rgb: '000000' } };
  const BDall = { top: TH, bottom: TH, left: TH, right: TH };

  const FILL_BLACK = { patternType: 'solid', fgColor: { rgb: '000000' } };

  // Tambah 2 kolom gap kanan ke !cols
  ws['!cols'].push({ wch: 2 }, { wch: 1 });

  // ── Inisialisasi paksa semua sel gap kanan (agar Excel mau render border) ──
  for (let r = 0; r < totalRows; r++) {
    for (let g = nc; g < ncTotal; g++) {
      const addr = XLSX.utils.encode_cell({ r, c: g });
      ws[addr] = { t: 's', v: ' ', s: {} };   // spasi = sel tidak kosong
    }
  }

  for (let r = 0; r < A.length; r++) {
    for (let c = 0; c < nc; c++) {            // hanya kolom data (0..nc-1)
      const cl = gc(r, c);

      /* ── Rows 0–3: logo area, kosong ── */
      if (r < 4) { if (!cl.s) cl.s = {}; continue; }

      /* ── Row 4: Judul ── */
      if (r === 4) {
        if (c >= C_NO && c <= C_HASIL) {
          cl.s = {
            fill:      FILL_BLACK,
            font:      { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border:    BDall
          };
        } else { if (!cl.s) cl.s = {}; }
        continue;
      }

      /* ── Rows 5–6: Program & Unit ── */
      if (r === 5 || r === 6) {
        if (c === C_NAMA) {
          cl.s = { font: { sz: 10 }, alignment: { horizontal: 'left', vertical: 'top' } };
        } else if (c >= C_KUK0 && c <= C_HASIL) {
          cl.s = { font: { sz: 10 }, alignment: { horizontal: 'left', vertical: 'top', wrapText: true } };
        } else { if (!cl.s) cl.s = {}; }
        continue;
      }

      /* ── Row 7: blank separator ── */
      if (r === 7) { if (!cl.s) cl.s = {}; continue; }

      /* ── Rows header tabel ── */
      if (r >= 8 && r < R_DATA_START) {
        if (c >= C_NO && c <= C_HASIL) {
          cl.s = {
            font:      { bold: true, sz: 9 },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border:    BDall
          };
        } else { if (!cl.s) cl.s = {}; }
        continue;
      }

      /* ── Data peserta ── */
      if (N.length > 0 && r >= R_DATA_START && r <= R_DATA_END) {
        if (c >= C_NO && c <= C_HASIL) {
          const isBL = cl.v === 'BL';
          const isNm = c === C_NAMA;
          const isHA = c === C_HASIL;
          cl.s = {
            font:      { bold: isHA, sz: 9, color: isBL ? { rgb: 'C00000' } : undefined },
            alignment: { horizontal: isNm ? 'left' : 'center', vertical: 'center' },
            border:    BDall
          };
        } else { if (!cl.s) cl.s = {}; }
        continue;
      }

      /* ── Footer ── */
      if (r === RI_CATATAN && c === C_NO) {
        cl.s = { font: { sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' } };
      } else if ((r === RI_DATE || r === RI_PENJAB || r === RI_NAME) && c >= F_START && c <= F_END) {
        cl.s = { font: { sz: 10, bold: r === RI_NAME }, alignment: { horizontal: 'center', vertical: 'center' } };
      } else { if (!cl.s) cl.s = {}; }
    }
  }

  /* ── Border double luar — semua 4 sisi ── */
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < ncTotal; c++) {
      const cl = gc(r, c);
      if (!cl.s)        cl.s        = {};
      if (!cl.s.border) cl.s.border = {};
      if (r === 0)              cl.s.border.top    = DBL;
      if (r === totalRows - 1)  cl.s.border.bottom = DBL;
      if (c === 0)              cl.s.border.left   = DBL;
      if (c === ncTotal - 1)    cl.s.border.right  = DBL;
    }
  }

  // Perluas !ref agar mencakup kolom gap kanan
  ws['!ref'] = XLSX.utils.encode_range(
    { r: 0, c: 0 },
    { r: totalRows - 1, c: ncTotal - 1 }
  );

  return ws;
}


// ========== Logo Kemnaker di Excel (kanan atas) ==========
const LOGO_ROW_PX = 22;                       // tinggi tiap baris area logo (4 baris = 88 px)
const LOGO_H_PX   = 80;                       // tinggi logo
const LOGO_W_PX   = Math.round(LOGO_H_PX * 192 / 256);   // rasio asli 192x256
const EMU         = 9525;                     // 1 px = 9525 EMU

// posisi logo: kiri atas, sejajar tepi kiri tabel (mulai kolom B)
function logoMeta(u) {
  return { col: 1 };
}

async function embedLogo(buf, metas) {
  const zip = await JSZip.loadAsync(buf);

  // media
  zip.file('xl/media/kemnaker-logo.png', LOGO_B64, { base64: true });

  // content types
  let ct = await zip.file('[Content_Types].xml').async('string');
  if (!/Extension="png"/i.test(ct))
    ct = ct.replace('<Default ', '<Default Extension="png" ContentType="image/png"/><Default ');
  metas.forEach((m, i) => {
    ct = ct.replace('</Types>',
      `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  });
  zip.file('[Content_Types].xml', ct);

  for (let i = 0; i < metas.length; i++) {
    const n = i + 1, m = metas[i];
    const colOff = 4 * EMU;                                        // rata kiri, jarak 4 px
    const rowOff = 4 * EMU;

    // drawing: logo menempel di pojok kanan atas tabel
    zip.file(`xl/drawings/drawing${n}.xml`,
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>${m.col}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${rowOff}</xdr:rowOff></xdr:from><xdr:ext cx="${LOGO_W_PX * EMU}" cy="${LOGO_H_PX * EMU}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${n + 1}" name="Logo Kemnaker" descr="Logo Kementerian Ketenagakerjaan"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${LOGO_W_PX * EMU}" cy="${LOGO_H_PX * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`);

    zip.file(`xl/drawings/_rels/drawing${n}.xml.rels`,
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/kemnaker-logo.png"/></Relationships>`);

    // hubungkan sheet -> drawing
    const sp = `xl/worksheets/sheet${n}.xml`;
    let sx = await zip.file(sp).async('string');
    if (!/xmlns:r=/.test(sx))
      sx = sx.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
    sx = sx.replace('</worksheet>', '<drawing r:id="rIdLogo"/></worksheet>');
    zip.file(sp, sx);

    const rp = `xl/worksheets/_rels/sheet${n}.xml.rels`;
    const rel = `<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/>`;
    if (zip.file(rp)) {
      let rx = await zip.file(rp).async('string');
      zip.file(rp, rx.replace('</Relationships>', rel + '</Relationships>'));
    } else {
      zip.file(rp, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel}</Relationships>`);
    }
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ========== Export: nama sheet ==========
function sname(u, i) {
  return (u.code.split('.')[2] || u.code || ('Unit' + i))
    .replace(/[\\\/?*\[\]:]/g, '')
    .slice(0, 28) + '_' + i;
}

// ========== Export: simpan xlsx (browser-native download) ==========
async function exportXlsx(all) {
  if (!S.names.length) { $('msg').textContent = 'Isi daftar peserta dulu.'; return; }

  const wb = XLSX.utils.book_new();
  const keys = all
    ? Object.keys(S.units).filter(k => S.units[k].code || S.units[k].title || k === S.cur)
    : [S.cur];
  if (!keys.includes(S.cur)) keys.push(S.cur);
  const metas = [];
  keys.forEach((k, i) => {
    const u = unit(k);
    XLSX.utils.book_append_sheet(wb, sheetFor(u), sname(u, i + 1));
    metas.push(logoMeta(u));
  });

  const filename = all
    ? 'penilaian-semua-unit.xlsx'
    : 'penilaian-' + (U().code.split('.')[2] || 'unit') + '.xlsx';

  try {
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    let blob;
    try {
      blob = await embedLogo(buf, metas);      // sisipkan logo Kemnaker
    } catch (err) {
      console.warn('Logo gagal disisipkan, ekspor tanpa logo:', err);
      blob = new Blob([buf], { type: 'application/octet-stream' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    $('msg').textContent = '';
  } catch (e) {
    $('msg').textContent = 'Gagal menyimpan: ' + (e.message || e);
  }
}

// ========== Export: PDF ==========
function pdfPage(doc, u) {
  const K = u.useKuk !== false, s = eff(u), N = S.names;
  const tot = s.reduce((a, b) => a + b, 0);
  const W = doc.internal.pageSize.getWidth();
  const Hh = doc.internal.pageSize.getHeight();
  const M = 12, CW = W - 2 * M;
  let y = M;

  // logo Kemnaker, kiri atas
  const lh = 22, lw = lh * 192 / 256;
  doc.addImage('data:image/png;base64,' + LOGO_B64, 'PNG', M, y, lw, lh);
  y += lh + 4;

  // judul (bar hitam)
  doc.setFillColor(0, 0, 0);
  doc.rect(M, y, CW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('PENILAIAN PELATIHAN BERBASIS KOMPETENSI', W / 2, y + 4.9, { align: 'center' });
  y += 7 + 5;

  // program & unit
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const vx = M + 42;
  doc.text('Program Pelatihan', M + 4, y);
  doc.text(String(S.program || ''), vx, y);
  y += 5.5;
  doc.text('Unit Kompetensi', M + 4, y);
  const ul = doc.splitTextToSize((u.code || '') + ' / ' + (u.title || ''), W - M - vx);
  doc.text(ul, vx, y);
  y += 5 * ul.length + 3;

  // tabel: total lebar sama untuk semua unit (selalu selebar halaman)
  const nameW = W > 250 ? 60 : 50, noW = 10, hasilW = 20;
  const kw = (CW - noW - nameW - hasilW) / tot;
  const head = [[
    { content: 'No', rowSpan: K ? 2 : 1 },
    { content: 'Nama Peserta', rowSpan: K ? 2 : 1 },
    ...s.map((n, e) => ({ content: 'Elemen Kompetensi ' + (e + 1), colSpan: n })),
    { content: 'Hasil Akhir' }
  ]];
  if (K) {
    const r2 = [];
    s.forEach((n, e) => { for (let k = 0; k < n; k++) r2.push('KUK ' + (e + 1) + '.' + (k + 1)); });
    r2.push('L/BL');
    head.push(r2);
  }
  const body = N.map((nm, p) => {
    const row = [p + 1, nm];
    s.forEach((n, e) => { for (let k = 0; k < n; k++) row.push(u.bl[p + '_' + e + '_' + k] ? 'BL' : 'L'); });
    row.push(final(u, p));
    return row;
  });
  const colStyles = { 0: { cellWidth: noW }, 1: { cellWidth: nameW, halign: 'left' } };
  for (let c = 0; c < tot; c++) colStyles[2 + c] = { cellWidth: kw };
  colStyles[2 + tot] = { cellWidth: hasilW, fontStyle: 'bold' };

  const opts = {
    startY: y, head, body, theme: 'grid',
    margin: { left: M, right: M, top: M, bottom: M },
    tableWidth: CW,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.4, halign: 'center', valign: 'middle',
              lineColor: [0, 0, 0], lineWidth: 0.2, textColor: [0, 0, 0] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: colStyles,
    didParseCell: d => {
      if (d.section === 'body' && d.cell.raw === 'BL') d.cell.styles.textColor = [192, 0, 0];
    }
  };
  if (typeof doc.autoTable === 'function') doc.autoTable(opts);
  else window.jspdf.autoTable(doc, opts);

  // footer: catatan, tempat/tanggal, penjab
  let fy = (doc.lastAutoTable ? doc.lastAutoTable.finalY : y) + 8;
  if (fy + 52 > Hh - M) { doc.addPage(); fy = M + 4; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Catatan :', M + 2, fy);
  const cx = W - M - 38;
  doc.text((S.tempat || '') + ', ' + fmtTgl(), cx, fy + 8, { align: 'center' });
  doc.text('Penjab', cx, fy + 14, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(String(S.penjab || ''), cx, fy + 14 + 24, { align: 'center' });
}

function exportPdf(all) {
  if (!S.names.length) { $('msg').textContent = 'Isi daftar peserta dulu.'; return; }
  const lib = window.jspdf && window.jspdf.jsPDF;
  if (!lib) { $('msg').textContent = 'Library PDF belum termuat. Periksa koneksi internet lalu muat ulang halaman.'; return; }
  try {
    const keys = all
      ? Object.keys(S.units).filter(k => S.units[k].code || S.units[k].title || k === S.cur)
      : [S.cur];
    if (!keys.includes(S.cur)) keys.push(S.cur);

    // selalu kertas lanskap
    const doc = new lib({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    keys.forEach((k, i) => {
      if (i > 0) doc.addPage();
      pdfPage(doc, unit(k));
    });
    doc.save(all
      ? 'penilaian-semua-unit.pdf'
      : 'penilaian-' + (U().code.split('.')[2] || 'unit') + '.pdf');
    $('msg').textContent = '';
  } catch (e) {
    $('msg').textContent = 'Gagal membuat PDF: ' + (e.message || e);
  }
}

$('expOne').onclick = () => exportXlsx(false);
$('expAll').onclick = () => exportXlsx(true);
$('pdfOne').onclick = () => exportPdf(false);
$('pdfAll').onclick = () => exportPdf(true);

// ========== Init ==========
['program', 'tempat', 'tanggal', 'penjab'].forEach(id => { $(id).value = S[id] || ''; });
$('names').value = S.names.join('\n');
renderAll();
