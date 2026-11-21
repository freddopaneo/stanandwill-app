import React, { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { TracePoint } from "../lib/walkMedia";
import { colors, fonts, radius } from "../lib/theme";

/**
 * Carte du parcours d'une balade : fond OpenStreetMap + tracé + départ et arrivée.
 * Sans dépendance (mêmes briques sur iOS, Android et navigateur) : les tuiles de carte sont de simples images,
 * le tracé une suite de petits segments. Le tracé vient du téléphone (lib/walkMedia) ; seul le fond de carte
 * est téléchargé, par zone d'environ un kilomètre de côté, auprès d'OpenStreetMap.
 */
const TILE = 256;
const MAX_ZOOM = 17;
const MAX_SEGMENTS = 160;

/** Position d'un point dans la « carte du monde » en pixels, au niveau de zoom z (projection Web Mercator). */
function project(lat: number, lon: number, z: number) {
  const n = TILE * 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return { x: ((lon + 180) / 360) * n, y: ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n };
}

export function WalkMap({ trace, width, height = 200 }: { trace: TracePoint[]; width: number; height?: number }) {
  const view = useMemo(() => {
    if (trace.length < 2 || width < 40) return null;
    const lats = trace.map((p) => p[0]); const lons = trace.map((p) => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
    // Plus grand zoom pour lequel tout le parcours tient dans le cadre, avec une marge.
    let z = MAX_ZOOM;
    for (; z > 3; z--) {
      const a = project(maxLat, minLon, z), b = project(minLat, maxLon, z);
      if (b.x - a.x <= width - 40 && b.y - a.y <= height - 40) break;
    }
    const a = project(maxLat, minLon, z), b = project(minLat, maxLon, z);
    const ox = (a.x + b.x) / 2 - width / 2, oy = (a.y + b.y) / 2 - height / 2;

    const tiles: { key: string; uri: string; left: number; top: number }[] = [];
    const max = 2 ** z;
    for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + width) / TILE); tx++) {
      for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + height) / TILE); ty++) {
        if (ty < 0 || ty >= max) continue;
        const wx = ((tx % max) + max) % max;
        tiles.push({ key: `${z}/${wx}/${ty}`, uri: `https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`, left: tx * TILE - ox, top: ty * TILE - oy });
      }
    }

    const step = Math.max(1, Math.ceil((trace.length - 1) / MAX_SEGMENTS));
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < trace.length; i += step) { const p = project(trace[i][0], trace[i][1], z); pts.push({ x: p.x - ox, y: p.y - oy }); }
    const last = project(trace[trace.length - 1][0], trace[trace.length - 1][1], z);
    pts.push({ x: last.x - ox, y: last.y - oy });

    const segments = pts.slice(1).map((p, i) => {
      const q = pts[i]; const dx = p.x - q.x, dy = p.y - q.y; const len = Math.hypot(dx, dy);
      return { key: i, left: (p.x + q.x) / 2 - len / 2 - 2, top: (p.y + q.y) / 2 - 2.5, width: len + 4, angle: Math.atan2(dy, dx) };
    });
    return { tiles, segments, start: pts[0], end: pts[pts.length - 1] };
  }, [trace, width, height]);

  if (!view) return null;
  return (
    <View style={[s.frame, { width, height }]} accessibilityLabel="Carte du parcours de la balade">
      {view.tiles.map((t) => <Image key={t.key} source={{ uri: t.uri }} style={[s.tile, { left: t.left, top: t.top }]} />)}
      {view.segments.map((g) => <View key={g.key} style={[s.segment, { left: g.left, top: g.top, width: g.width, transform: [{ rotate: `${g.angle}rad` }] }]} />)}
      <View style={[s.dot, s.start, { left: view.start.x - 8, top: view.start.y - 8 }]} />
      <View style={[s.dot, s.end, { left: view.end.x - 8, top: view.end.y - 8 }]} />
      <View style={s.legend}><View style={[s.key, s.start]} /><Text style={s.legendText}>Départ</Text><View style={[s.key, s.end, { marginLeft: 8 }]} /><Text style={s.legendText}>Arrivée</Text></View>
      <Text style={s.credit}>© OpenStreetMap</Text>
    </View>
  );
}

const s = StyleSheet.create({
  frame: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.saugeClair, borderWidth: 1, borderColor: colors.ligne },
  tile: { position: "absolute", width: TILE, height: TILE },
  segment: { position: "absolute", height: 5, borderRadius: 3, backgroundColor: colors.foret },
  dot: { position: "absolute", width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: colors.blanc },
  start: { backgroundColor: colors.foret },
  end: { backgroundColor: colors.miel },
  legend: { position: "absolute", left: 6, top: 6, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.88)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  key: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: fonts.bold, fontSize: 11, color: colors.foretFonce },
  credit: { position: "absolute", right: 4, bottom: 3, fontFamily: fonts.regular, fontSize: 9, color: colors.foretFonce, backgroundColor: "rgba(255,255,255,0.8)", paddingHorizontal: 4, borderRadius: 3 },
});
