/* ============================================================
   ssd-renderer.js — SVG SSD renderer for Nexus: Shattered Void
   Renders a monochrome, printable Ship System Display card that
   closely matches the v0.8 reference template.
   ============================================================ */

/* ── Card geometry ────────────────────────────────────────── */
export const W = 820;
export const H = 500;
const HEADER_H = 52;
const FOOTER_H = 22;
const FOOTER_Y  = H - FOOTER_H;   // 478
const BODY_Y    = HEADER_H;       // 52
const BODY_H    = FOOTER_Y - BODY_Y; // 426

const COL_L = 172;   // left-col right edge  / centre-col left edge
const COL_R = 492;   // centre-col right edge / right-col left edge

const FONT = "'Arial Narrow','Roboto Condensed',Arial,sans-serif";
const INK  = '#1a1a1a';
const PAPER = '#f8f8f8';
const DIM  = '#555555';

/* Left-column section top-y values (cumulative, sum = BODY_H=426) */
const SEC = {
  structure:   BODY_Y,           // 52
  engineering: BODY_Y + 106,     // 158
  weapons:     BODY_Y + 106 + 92, // 250
  systems:     BODY_Y + 106 + 92 + 94, // 344
  end:         FOOTER_Y,         // 478
};
/* Heights */
const SEC_H = {
  structure:   106,
  engineering:  92,
  weapons:      94,
  systems:     134,  // 344+134=478 ✓
};

/* Right-column weapon-row top-y values */
const WPN = {
  primary: BODY_Y,        // 52
  altA:    BODY_Y + 108,  // 160
  altB:    BODY_Y + 108 + 104, // 264
  altC:    BODY_Y + 108 + 104 + 104, // 368
  notes:   BODY_Y + 108 + 104 + 104 + 80, // 448
  end:     FOOTER_Y,      // 478
};
const WPN_H = {
  primary: 108,
  altA:    104,
  altB:    104,
  altC:     80,
  notes:    30,
};

/* ── Tiny HTML-escape ─────────────────────────────────────── */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Silhouette path (centred arrow/chevron pointing up) ─── */
function shipSilhouette(cx, cy, scale) {
  // Arrow pointing up: apex → bottom-right → rear notch → bottom-left
  // Wide spread at base, small inner notch, narrow apex
  const pts = [
    [cx,                  cy - scale],              // top apex
    [cx + scale * 0.65,   cy + scale * 0.38],       // bottom-right
    [cx,                  cy + scale * 0.12],        // rear inner notch
    [cx - scale * 0.65,   cy + scale * 0.38],        // bottom-left
  ];
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
}

/* ── 8-arc firing diagram ─────────────────────────────────── */
function arcDiagram(ox, oy, sz, activeArcs) {
  const cx = ox + sz / 2;
  const cy = oy + sz / 2;
  const half = sz / 2;

  // 9 key boundary points (corner + midpoints)
  const pts = {
    NW: [ox,      oy     ],
    N:  [cx,      oy     ],
    NE: [ox + sz, oy     ],
    E:  [ox + sz, cy     ],
    SE: [ox + sz, oy + sz],
    S:  [cx,      oy + sz],
    SW: [ox,      oy + sz],
    W:  [ox,      cy     ],
  };

  // Each arc = triangle from center to two adjacent boundary points
  const arcTriangles = {
    NW: [pts.NW, pts.N ],
    N:  [pts.N,  pts.NE],
    NE: [pts.NE, pts.E ],
    E:  [pts.E,  pts.SE],
    SE: [pts.SE, pts.S ],
    S:  [pts.S,  pts.SW],
    SW: [pts.SW, pts.W ],
    W:  [pts.W,  pts.NW],
  };

  let g = `<rect x="${ox}" y="${oy}" width="${sz}" height="${sz}" fill="white" stroke="${INK}" stroke-width="1.5"/>`;

  // Filled active-arc triangles
  for (const arc of (activeArcs || [])) {
    const tri = arcTriangles[arc];
    if (!tri) continue;
    const polyPts = `${cx},${cy} ${tri[0][0]},${tri[0][1]} ${tri[1][0]},${tri[1][1]}`;
    g += `<polygon points="${polyPts}" fill="${INK}" opacity="0.75"/>`;
  }

  // Dividing lines (center → each of the 8 boundary points)
  const strokeAttr = `stroke="${INK}" stroke-width="1"`;
  for (const [, pt] of Object.entries(pts)) {
    g += `<line x1="${cx}" y1="${cy}" x2="${pt[0]}" y2="${pt[1]}" ${strokeAttr}/>`;
  }

  return `<g>${g}</g>`;
}

/* ── Boost box (small labelled box, right side of left sections) */
function boostBox(x, y, w, h, lines) {
  // Filter empty strings that may result from leading/trailing | separators
  const rows = lines.filter(l => l.trim() !== '');
  let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="${INK}" stroke-width="1.5"/>`;
  const lineH = h / (rows.length + 0.5);
  rows.forEach((txt, i) => {
    const ty = y + lineH * (i + 1);
    g += `<text x="${x + w / 2}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="6.5" font-family="${FONT}" fill="${INK}">${esc(txt)}</text>`;
  });
  return g;
}

/* ── Left-column section ──────────────────────────────────── */
function leftSection(secY, secH, hitLabel, sectionName, rows, boostBoxDefs) {
  let g = '';

  // Section bottom border
  g += `<line x1="0" y1="${secY + secH}" x2="${COL_L}" y2="${secY + secH}" stroke="${INK}" stroke-width="1"/>`;

  // Hit-die label (top-left, two lines if comma-separated)
  const hitParts = String(hitLabel || '').split(',');
  if (hitParts.length > 1) {
    g += `<text x="5" y="${secY + 14}" font-size="9" font-weight="700" font-family="${FONT}" fill="${INK}">${esc(hitParts[0])},${esc(hitParts[1])}</text>`;
    if (hitParts.length > 2 && hitParts[2]) {
      g += `<text x="5" y="${secY + 24}" font-size="9" font-weight="700" font-family="${FONT}" fill="${INK}">${esc(hitParts[2])}</text>`;
    }
  } else {
    g += `<text x="5" y="${secY + 14}" font-size="9" font-weight="700" font-family="${FONT}" fill="${INK}">${esc(hitLabel)}</text>`;
  }

  // Section name
  g += `<text x="30" y="${secY + 15}" font-size="12" font-weight="700" font-family="${FONT}" fill="${INK}">${esc(sectionName)}</text>`;

  // Rows: each row has { icon, hasBox, y (relative offset) }
  for (const row of rows) {
    const ry = secY + row.dy;
    // Icon (small symbol)
    g += `<text x="6" y="${ry + 13}" font-size="14" font-family="${FONT}" fill="${INK}">${esc(row.icon)}</text>`;
    if (row.hasBox) {
      g += `<rect x="26" y="${ry}" width="18" height="18" fill="white" stroke="${INK}" stroke-width="1.5"/>`;
    }
  }

  // Boost boxes (stacked on right side of section)
  const bw = 28;
  const bx = COL_L - bw - 4;
  if (boostBoxDefs && boostBoxDefs.length > 0) {
    const totalBoxH = secH - 10;
    const bh = Math.floor(totalBoxH / boostBoxDefs.length) - 4;
    boostBoxDefs.forEach((bdef, idx) => {
      const by = secY + 5 + idx * (bh + 4);
      g += boostBox(bx, by, bw, bh, bdef.lines || [bdef.label || '']);
    });
  }

  return g;
}

/* ── Right-column weapon row ──────────────────────────────── */
function weaponRow(wy, wh, arcSz, arcX, arcY, name, trait, stat1, stat2, stat3, activeArcs) {
  let g = '';

  // Arc diagram
  g += arcDiagram(arcX, arcY, arcSz, activeArcs);

  // Weapon name
  const nameX = arcX + arcSz + 10;
  const nameY = wy + 20;
  g += `<text x="${nameX}" y="${nameY}" font-size="11" font-weight="700" font-family="${FONT}" fill="${INK}">${esc(name)}</text>`;

  // Three stat boxes: range | power | multiplier
  const sbW = 44, sbH = 22;
  const sbY = wy + 26;
  const sbX = [nameX, nameX + sbW + 4, nameX + (sbW + 4) * 2];
  const statVals = [stat1 || '1 - 2', stat2 || '1 ▼', stat3 || 'x1'];
  for (let i = 0; i < 3; i++) {
    g += `<rect x="${sbX[i]}" y="${sbY}" width="${sbW}" height="${sbH}" fill="white" stroke="${INK}" stroke-width="1.5"/>`;
    g += `<text x="${sbX[i] + sbW / 2}" y="${sbY + sbH - 6}" font-size="11" font-weight="700" font-family="${FONT}" fill="${INK}" text-anchor="middle">${esc(statVals[i])}</text>`;
  }

  // Trait label + value
  const traitY = wy + wh - 12;
  g += `<text x="${arcX}" y="${traitY}" font-size="9.5" font-weight="700" font-family="${FONT}" fill="${DIM}">Trait</text>`;
  if (trait) {
    g += `<text x="${arcX + 30}" y="${traitY}" font-size="9.5" font-family="${FONT}" fill="${INK}">${esc(trait)}</text>`;
  }

  // Row bottom border
  g += `<line x1="${COL_R}" y1="${wy + wh}" x2="${W}" y2="${wy + wh}" stroke="${INK}" stroke-width="1"/>`;

  return g;
}

/* ── Main renderer ────────────────────────────────────────── */
export function renderSSD(s) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;background:${PAPER};font-family:${FONT}">`;

  /* ── Card background + outer border ── */
  svg += `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>`;

  /* ══════════════════════════════════════
     HEADER
  ══════════════════════════════════════ */
  // CLASSNAME (large bold left)
  svg += `<text x="10" y="35" font-size="26" font-weight="900" font-family="${FONT}" fill="${INK}" letter-spacing="0.04em">${esc(s.className || 'CLASSNAME')}</text>`;
  // shiptype (smaller, below)
  svg += `<text x="10" y="48" font-size="11" font-family="${FONT}" fill="${INK}">${esc(s.shipType || 'shiptype')}</text>`;

  // Centre emblem area — simplified Nexus emblem (stylised fork-lightning)
  const embX = 380, embY = 28;
  svg += `<text x="${embX}" y="${embY}" font-size="18" font-weight="900" font-family="${FONT}" fill="${INK}" text-anchor="middle">⚔</text>`;
  // Fleet-points display
  const fpX = embX + 20;
  svg += `<text x="${fpX}" y="${embY}" font-size="20" font-weight="900" font-family="${FONT}" fill="${INK}">${esc(s.fleetPoints || '000')}</text>`;
  svg += `<text x="${fpX + 38}" y="${embY - 2}" font-size="9.5" font-weight="700" font-family="${FONT}" fill="${DIM}">FP</text>`;

  // FACTION (large bold right)
  svg += `<text x="665" y="35" font-size="22" font-weight="900" font-family="${FONT}" fill="${INK}" text-anchor="end" letter-spacing="0.04em">${esc(s.faction || 'FACTION')}</text>`;

  // ID box (far right)
  svg += `<rect x="672" y="5" width="44" height="43" fill="white" stroke="${INK}" stroke-width="2"/>`;
  svg += `<text x="694" y="32" font-size="13" font-weight="700" font-family="${FONT}" fill="${INK}" text-anchor="middle">${esc(s.idCode || 'ID')}</text>`;

  // Header bottom border
  svg += `<line x1="0" y1="${HEADER_H}" x2="${W}" y2="${HEADER_H}" stroke="${INK}" stroke-width="2"/>`;

  /* ══════════════════════════════════════
     COLUMN DIVIDERS
  ══════════════════════════════════════ */
  svg += `<line x1="${COL_L}" y1="${BODY_Y}" x2="${COL_L}" y2="${FOOTER_Y}" stroke="${INK}" stroke-width="1.5"/>`;
  svg += `<line x1="${COL_R}" y1="${BODY_Y}" x2="${COL_R}" y2="${FOOTER_Y}" stroke="${INK}" stroke-width="1.5"/>`;

  /* ══════════════════════════════════════
     LEFT COLUMN — 4 sections
  ══════════════════════════════════════ */

  // ── Structure (1,3,5) ──
  svg += leftSection(
    SEC.structure, SEC_H.structure,
    s.structureHitLabel || '1,3,5',
    'Structure',
    [
      { icon: '◼', hasBox: true,  dy: 24 },
      { icon: '◉', hasBox: true,  dy: 56 },
    ],
    [
      { lines: (s.structureBoost1 || '⚡+1').split('|') },
      { lines: (s.structureBoost2 || '⚙⚡').split('|')  },
    ]
  );

  // ── Engineering (1-2) ──
  svg += leftSection(
    SEC.engineering, SEC_H.engineering,
    s.engineeringHitLabel || '1-2',
    'Engineering',
    [
      { icon: '⧗', hasBox: true,  dy: 24 },
      { icon: 'Nϟ', hasBox: false, dy: 56 },
    ],
    [
      { lines: (s.engineeringBoost1 || '⇒⚡+1').split('|') },
      { lines: (s.engineeringBoost2 || '▶⚡').split('|')   },
    ]
  );

  // ── Weapons (3-4) ──
  svg += leftSection(
    SEC.weapons, SEC_H.weapons,
    s.weaponsHitLabel || '3-4',
    'Weapons',
    [
      { icon: '✦', hasBox: true,  dy: 28 },
    ],
    [
      { lines: (s.weaponsBoost1 || '▽/⚡').split('|') },
    ]
  );

  // ── Systems (5-6) ──
  svg += leftSection(
    SEC.systems, SEC_H.systems,
    s.systemsHitLabel || '5-6',
    'Systems',
    [
      { icon: '⚙', hasBox: true, dy: 24 },
      { icon: '⊛', hasBox: true, dy: 60 },
    ],
    [
      { lines: (s.systemsBoost1 || '⚙⚡+1').split('|') },
      { lines: (s.systemsBoost2 || '⊕⚡+1').split('|') },
    ]
  );

  /* ══════════════════════════════════════
     CENTRE COLUMN — silhouette + stats
  ══════════════════════════════════════ */
  const silPad = 12;
  const silX = COL_L + silPad;
  const silY = BODY_Y + 8;
  const silW = (COL_R - COL_L) - silPad * 2; // ≈ 296
  const silH = silW; // square

  // Silhouette box (light grey fill to match reference)
  svg += `<rect x="${silX}" y="${silY}" width="${silW}" height="${silH}" fill="#e2e2e2" stroke="${INK}" stroke-width="1.5"/>`;

  // Corner diagonal guide marks
  const gm = 20;
  const corners = [
    [silX,       silY,       gm,  gm ],
    [silX+silW,  silY,      -gm,  gm ],
    [silX,       silY+silH,  gm, -gm ],
    [silX+silW,  silY+silH, -gm, -gm ],
  ];
  for (const [cx2, cy2, dx, dy] of corners) {
    svg += `<line x1="${cx2}" y1="${cy2}" x2="${cx2+dx}" y2="${cy2+dy}" stroke="#999" stroke-width="1.5" stroke-dasharray="4,3"/>`;
  }

  // Ship silhouette (arrow pointing up, fills ~75% of the box)
  const scx = silX + silW / 2;
  // Position the centroid slightly below centre so the arrow sits naturally
  const scy = silY + silH * 0.62;
  const sc  = silH * 0.52;
  svg += `<path d="${shipSilhouette(scx, scy, sc)}" fill="${INK}"/>`;

  // Small "hull hit" icon + "1" in top-left of silhouette box
  svg += `<text x="${silX + 6}" y="${silY + 16}" font-size="14" font-family="${FONT}" fill="${INK}">◉</text>`;
  svg += `<text x="${silX + 22}" y="${silY + 16}" font-size="12" font-weight="700" font-family="${FONT}" fill="${INK}">1</text>`;

  // Stats band divider
  const statsY = silY + silH + 6;
  svg += `<line x1="${COL_L}" y1="${statsY}" x2="${COL_R}" y2="${statsY}" stroke="${INK}" stroke-width="1"/>`;

  // Helper: render one icon+value pair
  function statCell(x, y, icon, value) {
    return `<text x="${x}" y="${y + 14}" font-size="15" font-family="${FONT}" fill="${INK}">${esc(icon)}</text>`
         + `<text x="${x + 20}" y="${y + 14}" font-size="12" font-weight="700" font-family="${FONT}" fill="${INK}">${esc(value)}</text>`;
  }

  const colW = (COL_R - COL_L);

  // Row 1 — 2 stats side-by-side
  const r1y = statsY + 4;
  svg += statCell(COL_L + 12,             r1y, s.stat1Icon || '⇒', s.stat1Value || '1');
  svg += statCell(COL_L + 12 + colW / 2,  r1y, s.stat2Icon || '⊙', s.stat2Value || '1');

  svg += `<line x1="${COL_L}" y1="${statsY + 26}" x2="${COL_R}" y2="${statsY + 26}" stroke="${INK}" stroke-width="1"/>`;

  // Row 2 — 3 stats
  const r2y = statsY + 30;
  const col3 = colW / 3;
  svg += statCell(COL_L + 8,            r2y, s.stat3Icon || '✕', s.stat3Value || '1');
  svg += statCell(COL_L + 8 + col3,     r2y, s.stat4Icon || '▶', s.stat4Value || '1');
  svg += statCell(COL_L + 8 + col3 * 2, r2y, s.stat5Icon || '↩', s.stat5Value || '1');

  svg += `<line x1="${COL_L}" y1="${statsY + 52}" x2="${COL_R}" y2="${statsY + 52}" stroke="${INK}" stroke-width="1"/>`;

  // Row 3 — 3 stats
  const r3y = statsY + 56;
  svg += statCell(COL_L + 8,            r3y, s.stat6Icon || '⚐', s.stat6Value || '1');
  svg += statCell(COL_L + 8 + col3,     r3y, s.stat7Icon || '⚙', s.stat7Value || '1');
  svg += statCell(COL_L + 8 + col3 * 2, r3y, s.stat8Icon || '▽', s.stat8Value || '1');

  /* ══════════════════════════════════════
     RIGHT COLUMN — 4 weapon rows
  ══════════════════════════════════════ */
  const arcSz = 56;
  const arcOffX = COL_R + 5;

  const weapons = [
    { wy: WPN.primary, wh: WPN_H.primary, name: s.primaryWeaponName  || 'Primary Weapon', trait: s.primaryWeaponTrait  || '', arcs: s.primaryWeaponArcs  || [], s1: s.primaryWeaponStat1, s2: s.primaryWeaponStat2, s3: s.primaryWeaponStat3 },
    { wy: WPN.altA,    wh: WPN_H.altA,    name: s.altWeaponAName     || 'Alt Weapon A',   trait: s.altWeaponATrait     || '', arcs: s.altWeaponAArcs     || [], s1: s.altWeaponAStat1,    s2: s.altWeaponAStat2,    s3: s.altWeaponAStat3 },
    { wy: WPN.altB,    wh: WPN_H.altB,    name: s.altWeaponBName     || 'Alt Weapon B',   trait: s.altWeaponBTrait     || '', arcs: s.altWeaponBArcs     || [], s1: s.altWeaponBStat1,    s2: s.altWeaponBStat2,    s3: s.altWeaponBStat3 },
    { wy: WPN.altC,    wh: WPN_H.altC,    name: s.altWeaponCName     || 'Alt Weapon C',   trait: s.altWeaponCTrait     || '', arcs: s.altWeaponCArcs     || [], s1: s.altWeaponCStat1,    s2: s.altWeaponCStat2,    s3: s.altWeaponCStat3 },
  ];

  for (const wpn of weapons) {
    const arcY = wpn.wy + 6;
    svg += weaponRow(
      wpn.wy, wpn.wh,
      arcSz, arcOffX, arcY,
      wpn.name, wpn.trait,
      wpn.s1, wpn.s2, wpn.s3,
      wpn.arcs
    );
  }

  /* ── Notes + FTL Drive box (below Alt C) ── */
  const nY = WPN.notes;
  const nH = WPN_H.notes;
  // No border needed — the enclosing right-col border covers it.
  // FTL checkbox
  const ftlY = nY + (nH - 18) / 2;
  svg += `<rect x="${COL_R + 8}" y="${ftlY}" width="14" height="14" fill="${s.ftlEnabled ? INK : 'white'}" stroke="${INK}" stroke-width="1.5"/>`;
  if (s.ftlEnabled) {
    svg += `<text x="${COL_R + 8}" y="${ftlY + 11}" font-size="10" font-family="${FONT}" fill="white">✓</text>`;
  }
  svg += `<text x="${COL_R + 26}" y="${ftlY + 11}" font-size="11" font-weight="700" font-family="${FONT}" fill="${INK}">FTL Drive</text>`;

  // Notes text (if any)
  if (s.notes) {
    svg += `<foreignObject x="${COL_R + 5}" y="${nY + 2}" width="${W - COL_R - 7}" height="${nH - 18}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:8px;font-family:${FONT};color:${INK};word-break:break-word;overflow:hidden;line-height:1.4">${esc(s.notes)}</div>
    </foreignObject>`;
  }

  /* ══════════════════════════════════════
     FOOTER
  ══════════════════════════════════════ */
  svg += `<line x1="0" y1="${FOOTER_Y}" x2="${W}" y2="${FOOTER_Y}" stroke="${INK}" stroke-width="1.5"/>`;
  svg += `<text x="8" y="${FOOTER_Y + 15}" font-size="9" font-family="${FONT}" fill="${DIM}">Nexus: Shattered Void™   Starship Display v0.8</text>`;
  svg += `<text x="${W - 8}" y="${FOOTER_Y + 15}" font-size="9" font-family="${FONT}" fill="${DIM}" text-anchor="end">© 2026  Vulcans&apos; Forge Studio</text>`;

  svg += '</svg>';
  return svg;
}
