import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import L from 'leaflet';

// ── Haversine distance ─────────────────────────────────────────────────────
const haversine = (a, b) => {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
};

const m2h = (m) => m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${Math.round(m)} m`;

// ── Temp marker icon ───────────────────────────────────────────────────────
const tempIcon = (color, label) => L.divIcon({
  className: '',
  html: `<div style="display:flex;flex-direction:column;align-items:center">
    <div style="width:22px;height:22px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 3px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:9px;font-weight:800;font-family:'JetBrains Mono',monospace">${label}</div>
    <div style="width:2px;height:8px;background:${color};opacity:0.7"></div>
  </div>`,
  iconSize: [22, 32], iconAnchor: [11, 30], popupAnchor: [0, -32],
});

const previewLineLayer = (map, pts, color = '#8fdc00') => {
  if (pts.length < 2) return null;
  return L.polyline(pts.map(p => [p.lat, p.lng]), {
    color, weight: 4, opacity: 0.8, dashArray: '8 6', lineJoin: 'round',
  }).addTo(map);
};

// ─────────────────────────────────────────────────────────────────────────
const MANHOLE_STATUSES = ['Good', 'Needs Maintenance', 'Blocked', 'Out of Service'];
const PIPE_MATERIALS   = ['PVC', 'Concrete', 'Clay', 'HDPE', 'Cast Iron', 'Unknown'];
const PIPE_SIZES       = ['100mm', '150mm', '225mm', '300mm', '375mm', '450mm', '600mm', 'Unknown'];
const CONDITIONS       = ['Good', 'Fair', 'Poor', 'Critical'];

// ─────────────────────────────────────────────────────────────────────────
export default function DataCollection({ userId, map, onDataCollected, onClose, onStartMapPick, onCancelMapPick }) {
  const [mode,     setMode]     = useState(null);  // 'manhole' | 'pipeline' | null
  const [step,     setStep]     = useState(1);     // wizard step
  const [points,   setPoints]   = useState([]);    // [{lat,lng}]
  const [locating, setLocating] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [status,   setStatus]   = useState('');
  const [stCls,    setStCls]    = useState('info');

  const [form, setForm] = useState({
    status:    'Good',
    material:  'PVC',
    pipe_size: '150mm',
    condition: 'Good',
    remarks:   '',
    manhole_id:'',
    pipe_id:   '',
  });

  const markerRefs = useRef([]);
  const lineRef    = useRef(null);

  // ── Cleanup map layers on close ────────────────────────────────────────
  const clearMapLayers = () => {
    if (!map) return;
    markerRefs.current.forEach(m => map.removeLayer(m));
    markerRefs.current = [];
    if (lineRef.current) { map.removeLayer(lineRef.current); lineRef.current = null; }
  };

  const handleClose = () => { clearMapLayers(); onCancelMapPick?.(); onClose(); };

  const reset = () => {
    clearMapLayers();
    setMode(null); setStep(1); setPoints([]);
    setSaved(false); setStatus(''); setStCls('info');
    setForm({ status: 'Good', material: 'PVC', pipe_size: '150mm', condition: 'Good', remarks: '', manhole_id: '', pipe_id: '' });
  };

  // ── GPS ────────────────────────────────────────────────────────────────
  const getGPS = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lng, accuracy } }) => {
        addPoint(lat, lng);
        setLocating(false);
        setStatus(`📍 GPS acquired — accuracy ±${Math.round(accuracy)}m`);
        setStCls('ok');
      },
      () => { setStatus('GPS denied. Use map click instead.'); setStCls('warn'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  // ── Add point (from GPS or map click) ─────────────────────────────────
  const addPoint = (lat, lng) => {
    const newPt = { lat, lng };
    setPoints(prev => {
      const updated = [...prev, newPt];

      // Draw marker on map
      if (map) {
        const colors  = ['#4aad4a', '#3b82f6', '#f59e0b', '#ef4444'];
        const color   = colors[prev.length % colors.length];
        const label   = mode === 'manhole' ? '🕳' : String(prev.length + 1);
        const mk = L.marker([lat, lng], { icon: tempIcon(color, label) }).addTo(map);
        markerRefs.current.push(mk);
        map.panTo([lat, lng]);

        // For pipeline: draw preview line
        if (mode === 'pipeline' && updated.length >= 2) {
          if (lineRef.current) map.removeLayer(lineRef.current);
          lineRef.current = previewLineLayer(map, updated);
        }
      }

      return updated;
    });
  };

  // ── Request map pick ──────────────────────────────────────────────────
  const requestMapPick = () => {
    onStartMapPick((lat, lng) => {
      addPoint(lat, lng);
      // For manhole: one point is enough → move to step 2
      if (mode === 'manhole') setStep(2);
      // For pipeline: need 2 points
      if (mode === 'pipeline' && points.length + 1 >= 2) setStep(2);
    });
  };

  // ── Save to Supabase or offline queue ─────────────────────────────────
  const save = async () => {
    setSaving(true);
    setStatus('');

    try {
      if (mode === 'manhole') {
        if (points.length < 1) throw new Error('No location set. Click 📍 or the map first.');
        const payload = {
          geom:       { type: 'Point', coordinates: [points[0].lng, points[0].lat] },
          manhole_id: form.manhole_id || `MH_${Date.now()}`,
          status:     form.status,
          condition:  form.condition,
          remarks:    form.remarks,
          created_by: userId,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('waste_water_manhole').insert([payload]);
        if (error) { queueOffline('manhole', payload); throw new Error('Saved offline — will sync when online.'); }

      } else if (mode === 'pipeline') {
        if (points.length < 2) throw new Error('At least 2 points required for a pipeline.');
        const payload = {
          geom:       { type: 'LineString', coordinates: points.map(p => [p.lng, p.lat]) },
          pipe_id:    form.pipe_id || `PL_${Date.now()}`,
          status:     form.status,
          pipe_mat:   form.material,
          pipe_size:  form.pipe_size,
          condition:  form.condition,
          remarks:    form.remarks,
          created_by: userId,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('waste_water_pipeline').insert([payload]);
        if (error) { queueOffline('pipeline', payload); throw new Error('Saved offline — will sync when online.'); }
      }

      setSaved(true);
      setStatus(`✓ ${mode === 'manhole' ? 'Manhole' : 'Pipeline'} saved successfully!`);
      setStCls('ok');
      clearMapLayers();
      setTimeout(() => { onDataCollected(); reset(); }, 1500);

    } catch (err) {
      setStatus(err.message);
      setStCls(err.message.includes('offline') ? 'warn' : 'err');
      if (err.message.includes('offline')) {
        setSaved(true);
        setTimeout(() => { onDataCollected(); reset(); }, 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const queueOffline = (type, data) => {
    const q = JSON.parse(localStorage.getItem('pending_sync') || '[]');
    q.push({ type, data, queuedAt: new Date().toISOString() });
    localStorage.setItem('pending_sync', JSON.stringify(q));
  };

  // ── Distance between pipeline points ─────────────────────────────────
  const pipelineDistance = points.length >= 2
    ? points.reduce((acc, pt, i) => i === 0 ? 0 : acc + haversine(points[i-1], pt), 0)
    : 0;

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="fc-panel" style={{ width: 420 }}>
      <div className="fc-panel-header" style={{ '--panel-icon-bg': 'rgba(143,220,0,0.1)', '--panel-icon-border': 'rgba(143,220,0,0.3)' }}>
        <div className="fc-panel-icon">📍</div>
        <div>
          <div className="fc-panel-title">Data Collection</div>
          <div className="fc-panel-sub">
            {!mode ? 'Select feature type' : mode === 'manhole' ? `Manhole — Step ${step}/2` : `Pipeline — Step ${step}/2`}
          </div>
        </div>
        <button className="fc-panel-close" onClick={handleClose}>×</button>
      </div>

      <div className="fc-panel-body">

        {/* ── STEP 0: SELECT MODE ── */}
        {!mode && (
          <>
            <div className="fc-section">What are you collecting?</div>
            <div className="fc-type-grid">
              <div className="fc-type-card" style={{ '--card-color': '#4aad4a' }} onClick={() => { setMode('manhole'); setStep(1); }}>
                <div className="tc-icon">🕳️</div>
                <div className="tc-title">Manhole</div>
                <div className="tc-desc">Place a single point on the map for a new or existing manhole</div>
              </div>
              <div className="fc-type-card" style={{ '--card-color': '#3b82f6' }} onClick={() => { setMode('pipeline'); setStep(1); }}>
                <div className="tc-icon">📏</div>
                <div className="tc-title">Pipeline</div>
                <div className="tc-desc">Place two or more points to draw a sewer pipeline segment</div>
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'rgba(143,220,0,0.05)', border: '1px solid rgba(143,220,0,0.15)', borderRadius: 10 }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(122,184,122,0.7)', marginBottom: 8 }}>Field Guide</div>
              {[
                ['📍', 'Use GPS for fastest precise placement'],
                ['🗺️', 'Click the map to set points manually'],
                ['🚶', 'For pipelines: walk between manholes, mark each end'],
                ['🌐', 'Works offline — data syncs when you reconnect'],
              ].map(([icon, tip]) => (
                <div key={tip} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13 }}>{icon}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(122,184,122,0.65)', lineHeight: 1.4 }}>{tip}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── MANHOLE WIZARD ── */}
        {mode === 'manhole' && (
          <>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
              {[['1','Location'],['2','Attributes']].map(([n, lbl], i) => (
                <React.Fragment key={n}>
                  <div className={`fc-step${step === i+1 ? ' active' : step > i+1 ? ' done' : ''}`}>
                    <div className="s-circle">{step > i+1 ? '✓' : n}</div>
                    <div className="s-label">{lbl}</div>
                  </div>
                  {i < 1 && <div className={`fc-step-line${step > 1 ? ' done' : ''}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Location */}
            {step === 1 && (
              <>
                <div className="fc-map-prompt">
                  <div className="mp-icon">🕳️</div>
                  <div className="mp-title">Set Manhole Location</div>
                  <div className="mp-sub">Use GPS for accuracy or click the map to place the point</div>
                </div>

                {points.length > 0 && (
                  <div className="fc-point-item" style={{ marginBottom: 12 }}>
                    <div className="pi-num">✓</div>
                    <div className="pi-coords">{points[0].lat.toFixed(6)}, {points[0].lng.toFixed(6)}</div>
                    <button className="pi-del" onClick={() => { clearMapLayers(); setPoints([]); }}>×</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <button className="fc-btn fc-btn-lime" onClick={getGPS} disabled={locating}>
                    {locating ? '⏳ Locating…' : '📍 Use GPS'}
                  </button>
                  <button className="fc-btn fc-btn-ghost" onClick={requestMapPick}>
                    🗺️ Click Map
                  </button>
                </div>

                {status && <div className={`fc-status ${stCls}`}>{status}</div>}

                <div className="fc-btn-row">
                  <button className="fc-btn fc-btn-ghost" onClick={reset}>← Back</button>
                  <button className="fc-btn fc-btn-primary"
                    onClick={() => setStep(2)} disabled={points.length < 1}>
                    Next: Attributes →
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Attributes */}
            {step === 2 && (
              <>
                <div className="fc-section">Manhole Details</div>

                <div className="fc-field">
                  <label className="fc-label">Manhole ID (optional)</label>
                  <input className="fc-input" placeholder="e.g. MH-0042" value={form.manhole_id}
                    onChange={e => setForm({ ...form, manhole_id: e.target.value })} />
                </div>

                <div className="fc-field">
                  <label className="fc-label">Status</label>
                  <select className="fc-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {MANHOLE_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="fc-field">
                  <label className="fc-label">Condition</label>
                  <select className="fc-select" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="fc-field">
                  <label className="fc-label">Field Notes / Remarks</label>
                  <textarea className="fc-textarea" placeholder="Describe the manhole condition, surroundings, access…"
                    value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} />
                </div>

                {status && <div className={`fc-status ${stCls}`}>{status}</div>}

                <div className="fc-btn-row">
                  <button className="fc-btn fc-btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <button className="fc-btn fc-btn-lime"  onClick={save} disabled={saving || saved}>
                    {saving ? '⏳ Saving…' : saved ? '✓ Saved!' : '💾 Save Manhole'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── PIPELINE WIZARD ── */}
        {mode === 'pipeline' && (
          <>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
              {[['1','Points'],['2','Attributes']].map(([n, lbl], i) => (
                <React.Fragment key={n}>
                  <div className={`fc-step${step === i+1 ? ' active' : step > i+1 ? ' done' : ''}`}>
                    <div className="s-circle">{step > i+1 ? '✓' : n}</div>
                    <div className="s-label">{lbl}</div>
                  </div>
                  {i < 1 && <div className={`fc-step-line${step > 1 ? ' done' : ''}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1: Points */}
            {step === 1 && (
              <>
                <div className="fc-map-prompt">
                  <div className="mp-icon">📏</div>
                  <div className="mp-title">Mark Pipeline Points</div>
                  <div className="mp-sub">
                    {points.length === 0 && 'Set the START point of the pipeline'}
                    {points.length === 1 && 'Now set the END point — or walk to next manhole and add more'}
                    {points.length >= 2 && `${points.length} points set — add more or proceed`}
                  </div>
                </div>

                {/* Pipeline distance preview */}
                {points.length >= 2 && (
                  <div className="fc-line-preview">
                    <div className="lp-dot" style={{ background: '#4aad4a' }} />
                    <div className="lp-line" />
                    <div className="lp-dot" style={{ background: '#3b82f6' }} />
                    <div className="lp-dist">{m2h(pipelineDistance)}</div>
                  </div>
                )}

                {/* Points list */}
                {points.map((pt, i) => (
                  <div key={i} className="fc-point-item">
                    <div className="pi-num">{i + 1}</div>
                    <div className="pi-coords">
                      {i === 0 ? 'Start: ' : i === points.length - 1 ? 'End: ' : `P${i+1}: `}
                      {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                    </div>
                    <button className="pi-del" onClick={() => {
                      const updated = points.filter((_, idx) => idx !== i);
                      setPoints(updated);
                      // Redraw markers
                      clearMapLayers();
                      updated.forEach((p, idx) => {
                        const colors = ['#4aad4a', '#3b82f6', '#f59e0b', '#ef4444'];
                        const mk = L.marker([p.lat, p.lng], { icon: tempIcon(colors[idx % colors.length], String(idx+1)) }).addTo(map);
                        markerRefs.current.push(mk);
                      });
                      if (updated.length >= 2) lineRef.current = previewLineLayer(map, updated);
                    }}>×</button>
                  </div>
                ))}

                {/* Action buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, marginBottom: 14 }}>
                  <button className="fc-btn fc-btn-lime"  onClick={getGPS} disabled={locating}>
                    {locating ? '⏳' : '📍 GPS Point'}
                  </button>
                  <button className="fc-btn fc-btn-ghost" onClick={requestMapPick}>
                    🗺️ Click Map
                  </button>
                </div>

                {status && <div className={`fc-status ${stCls}`}>{status}</div>}

                <div className="fc-btn-row">
                  <button className="fc-btn fc-btn-ghost" onClick={reset}>← Back</button>
                  <button className="fc-btn fc-btn-primary"
                    onClick={() => setStep(2)} disabled={points.length < 2}>
                    {points.length < 2 ? `Need ${2 - points.length} more point${2 - points.length > 1 ? 's' : ''}` : 'Next: Attributes →'}
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Attributes */}
            {step === 2 && (
              <>
                <div className="fc-section">Pipeline Details</div>

                {/* Length summary */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <div className="fc-fstat lime" style={{ flex: 1 }}>
                    <div className="fs-num" style={{ fontSize: 16 }}>{m2h(pipelineDistance)}</div>
                    <div className="fs-lbl">Measured Length</div>
                  </div>
                  <div className="fc-fstat" style={{ flex: 1 }}>
                    <div className="fs-num" style={{ fontSize: 16 }}>{points.length}</div>
                    <div className="fs-lbl">Points</div>
                  </div>
                </div>

                <div className="fc-field">
                  <label className="fc-label">Pipe ID (optional)</label>
                  <input className="fc-input" placeholder="e.g. PL-0118" value={form.pipe_id}
                    onChange={e => setForm({ ...form, pipe_id: e.target.value })} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="fc-field">
                    <label className="fc-label">Material</label>
                    <select className="fc-select" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}>
                      {PIPE_MATERIALS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="fc-field">
                    <label className="fc-label">Pipe Size</label>
                    <select className="fc-select" value={form.pipe_size} onChange={e => setForm({ ...form, pipe_size: e.target.value })}>
                      {PIPE_SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="fc-field">
                  <label className="fc-label">Status</label>
                  <select className="fc-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {MANHOLE_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="fc-field">
                  <label className="fc-label">Condition</label>
                  <select className="fc-select" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="fc-field">
                  <label className="fc-label">Field Notes</label>
                  <textarea className="fc-textarea" placeholder="Material observations, depth, blockage signs…"
                    value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} />
                </div>

                {status && <div className={`fc-status ${stCls}`}>{status}</div>}

                <div className="fc-btn-row">
                  <button className="fc-btn fc-btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <button className="fc-btn fc-btn-lime"  onClick={save} disabled={saving || saved}>
                    {saving ? '⏳ Saving…' : saved ? '✓ Saved!' : '💾 Save Pipeline'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}