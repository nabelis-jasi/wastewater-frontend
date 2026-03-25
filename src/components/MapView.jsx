import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ── Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ── Tiles
const TILES = { /* same as before, omitted for brevity */ };

// ── Colors
const manholeColor = (s) => { /* same as before */ };
const pipeColor = (s) => { /* same as before */ };

// ── Custom manhole icon
const manholeIcon = (color, size = 20) => L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background-color:${color};
    width:${size}px;
    height:${size}px;
    border-radius:50%;
    border:3px solid white;
    box-shadow:0 4px 8px rgba(0,0,0,0.3);
    display:flex;
    justify-content:center;
    align-items:center;
    color:white;
    font-size:${size / 2}px;
  ">🕳️</div>`,
  iconSize:   [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor:[0, -(size / 2 + 4)],
});

// ── Geometry parsers
const parsePoint = (geom) => { /* same as before */ };
const parseLine  = (geom) => { /* same as before */ };

// ── TileManager
function TileManager({ tileId }) {
  const map = useMap();
  const baseRef = useRef(null);
  const overRef = useRef(null);
  useEffect(() => {
    if (baseRef.current) { map.removeLayer(baseRef.current); baseRef.current = null; }
    if (overRef.current) { map.removeLayer(overRef.current); overRef.current = null; }
    const def = TILES[tileId] || TILES.osm;
    baseRef.current = L.tileLayer(def.url, { attribution: def.attr, maxZoom: def.max }).addTo(map);
    if (tileId === "hybrid" && def.overlayUrl) {
      overRef.current = L.tileLayer(def.overlayUrl, { opacity: 0.42 }).addTo(map);
    }
    return () => { if (baseRef.current) map.removeLayer(baseRef.current); if (overRef.current) map.removeLayer(overRef.current); }
  }, [tileId, map]);
  return null;
}

// ── MapBootstrap
function MapBootstrap({ onMapReady, setCoords, pickMode, onMapClick }) {
  const map = useMap();
  useEffect(() => { if (onMapReady) onMapReady(map); }, [map, onMapReady]);
  useMapEvents({
    mousemove(e) { setCoords(`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`); },
    click(e) { if (pickMode && onMapClick) onMapClick(e.latlng.lat, e.latlng.lng); },
  });
  useEffect(() => { map.getContainer().style.cursor = pickMode ? "crosshair" : ""; }, [map, pickMode]);
  return null;
}

// ── ZoomReposition
function ZoomReposition() {
  const map = useMap();
  useEffect(() => { map.zoomControl?.remove(); L.control.zoom({ position: "bottomright" }).addTo(map); }, [map]);
  return null;
}

// ── MapView with overlaying cascading panels
export default function MapView({ manholes = [], pipes = [], role, userId, onFeatureClick, onMapReady, navPickMode = false, onNavMapClick }) {
  const [tileId, setTileId] = useState("osm");
  const [coords, setCoords] = useState("");
  const [showLegend, setShowLegend] = useState(true);

  const handleMapReady = useCallback((map) => { if (onMapReady) onMapReady(map); }, [onMapReady]);

  const glass = { background: "rgba(7,20,7,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(45,138,45,0.25)", borderRadius: 10, color: "#e8f5e8", fontFamily: "'Barlow',sans-serif" };

  const buildTable = (rows) => (
    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
      <tbody>{rows.filter(Boolean).map(([k,v]) => <tr key={k} style={{borderBottom:"1px solid #f0f0f0"}}><td style={{padding:"3px 8px 3px 0",color:"#555",fontWeight:600,whiteSpace:"nowrap"}}>{k}</td><td style={{padding:"3px 0",color:"#111"}}>{v}</td></tr>)}</tbody>
    </table>
  );

  const editBtn = (feature) => onFeatureClick ? (
    <button onClick={() => onFeatureClick(feature)} style={{ marginTop: 10, width: "100%", background: "#1a4d1a", color: "white", border: "1px solid #2d8a2d", borderRadius: 6, padding: "7px 0", cursor: "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>✏️ Edit Record</button>
  ) : null;

  const popupHeader = (dot,label) => (
    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingBottom:8,borderBottom:"2px solid #f0f7f0" }}>{dot}<span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:800, fontSize:14,textTransform:"uppercase",letterSpacing:"0.06em",color:"#0a1f0a" }}>{label}</span></div>
  );

  // ── Cascading z-index
  const zIndexBase = 900; // map controls and overlays
  const zIndexIncrement = 10;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer center={[-18.97,32.67]} zoom={13} style={{ width: "100%", height: "100%" }} zoomControl={false} scrollWheelZoom>
        <ZoomReposition />
        <MapBootstrap onMapReady={handleMapReady} setCoords={setCoords} pickMode={navPickMode} onMapClick={onNavMapClick} />
        <TileManager tileId={tileId} />

        {/* ── MANHOLES ── */}
        {manholes.map((m) => { const pt = parsePoint(m.geom); if (!pt) return null; const color = manholeColor(m.bloc_stat); return (<Marker key={`mh-${m.gid}`} position={[pt.lat,pt.lng]} icon={manholeIcon(color,20)}><Popup maxWidth={280}><div style={{ fontFamily:"'Barlow',sans-serif", minWidth:210, padding:2 }}>{popupHeader(<div style={{ width:14,height:14,borderRadius:"50%",background:color,border:"2px solid white",boxShadow:`0 0 0 2px ${color}44` }} />, m.manhole_id||`MH-${m.gid}`)}{buildTable([["Pipe ID",m.pipe_id||"—"],["Depth", m.mh_depth?`${m.mh_depth} m`:"—"],["Status", m.bloc_stat||"Normal"],["Type", m.type||"Standard"],["Suburb", m.suburb_nam||"—"],["Coords",`${pt.lat.toFixed(5)}, ${pt.lng.toFixed(5)}`]])}{editBtn({...m,type:"manhole"})}</div></Popup></Marker>); })}

        {/* ── PIPELINES ── */}
        {pipes.map((p) => { const positions = parseLine(p.geom); if(!positions || positions.length<2) return null; const color = pipeColor(p.block_stat); return (<Polyline key={`pl-${p.gid}`} positions={positions} pathOptions={{color,weight:5,opacity:1}}><Popup maxWidth={280}><div style={{fontFamily:"'Barlow',sans-serif", minWidth:210, padding:2}}>{popupHeader(<div style={{width:22,height:4,borderRadius:2,background:color,flexShrink:0}} />, p.pipe_id||`PL-${p.gid}`)}{buildTable([["Start MH",p.start_mh||"—"],["End MH",p.end_mh||"—"],["Material",p.pipe_mat||"—"],["Size",p.pipe_size||"—"],["Length",p.length?`${p.length} m`:"—"],["Status",p.block_stat||"Normal"]])}{editBtn({...p,type:"pipeline"})}</div></Polyline>); })}
      </MapContainer>

      {/* ── OVERLAYS WITH CASCADING Z-INDEX ── */}
      {/* Tile Switcher */}
      <div style={{ ...glass, position:"absolute", top:12,right:12, zIndex:zIndexBase+1, display:"flex", gap:3, padding:4 }}>
        {Object.values(TILES).map((t) => { const active = tileId===t.id; return (<button key={t.id} onClick={()=>setTileId(t.id)} title={t.label} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", transition:"all 0.15s", background:active?"#4aad4a":"transparent", color:active?"#011001":"#7ab87a", boxShadow:active?"0 2px 10px rgba(74,173,74,0.4)":"none" }}><span>{t.icon}</span><span>{t.label}</span></button>); })}
      </div>

      {/* Legend */}
      {showLegend && <div style={{ ...glass, position:"absolute", bottom:36,left:12, zIndex:zIndexBase+2, padding:"10px 14px", minWidth:210 }}>
        {/* ...legend content same as before */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", color:"#8fdc00" }}>Legend</span>
          <button onClick={()=>setShowLegend(false)} style={{ background:"none", border:"none", color:"#3d6e3d", cursor:"pointer", fontSize:14, padding:0 }}>×</button>
        </div>
      </div>}

      {/* Pick Mode Banner */}
      {navPickMode && <div style={{ ...glass, position:"absolute", top:"50%", left:"50%", transform:"translate(-50%, -50%)", zIndex:zIndexBase+3, pointerEvents:"none", textAlign:"center", padding:"10px 20px", fontSize:13, fontWeight:700, color:"#8fdc00", boxShadow:"0 4px 24px rgba(0,0,0,0.5)", animation:"pulse-pick 1.2s infinite" }}>📍 Click on the map to set your point</div>}

      {/* Coordinate readout */}
      {coords && <div style={{ ...glass, position:"absolute", bottom:8, right:90, zIndex:zIndexBase+4, padding:"4px 12px", fontSize:11, fontFamily:"'JetBrains Mono', monospace", color:"#7ab87a", pointerEvents:"none", whiteSpace:"nowrap" }}>📍 {coords}</div>}
    </div>
  );
}
