import React, { useState, useRef } from 'react';
import MapView from '../MapView';
import DataCollection from './DataCollection';
import FlagFeature from './FlagFeature';
import SyncData from './SyncData';
import CollectorHome from './CollectorHome';
import CollectorProfilePanel from './CollectorProfilePanel';
import CollectorSettingsPanel from './CollectorSettingsPanel';
import './Collector.css';

export default function CollectorDashboard({ manholes, pipes, userId, role, onDataRefresh, userProfile }) {
  const [activePanel, setActivePanel] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [pickMode, setPickMode] = useState(false);
  const [pickCallback, setPickCb] = useState(null);

  // Pending sync count
  const [pendingCount, setPendingCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pending_sync') || '[]').length; } catch { return 0; }
  });

  const refreshPending = () => {
    try { setPendingCount(JSON.parse(localStorage.getItem('pending_sync') || '[]').length); } catch { /* ignore */ }
  };

  const handleDataRefreshed = () => { refreshPending(); onDataRefresh(); };

  const toggle = (id) => setActivePanel(prev => prev === id ? null : id);

  // Start/Cancel map pick
  const startMapPick = (cb) => {
    setPickCb(() => cb);
    setPickMode(true);
    setActivePanel(null);
  };

  const cancelMapPick = () => {
    setPickMode(false);
    setPickCb(null);
  };

  const handleNavMapClick = (lat, lng) => {
    if (pickCallback) {
      pickCallback(lat, lng);
      setPickMode(false);
      setPickCb(null);
      setActivePanel(prev => prev ?? 'home');
    }
  };

  // Bottom tool dock
  const tools = [
    { id: 'home',    icon: '🏠', label: 'Home',    color: '#4aad4a' },
    { id: 'collect', icon: '📍', label: 'Collect', color: '#8fdc00' },
    { id: 'flag',    icon: '🚩', label: 'Flag',    color: '#f59e0b' },
    { id: 'sync',    icon: '🔄', label: 'Sync',    color: '#22d3ee', badge: pendingCount },
  ];

  return (
    <div className="fc-root">

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header className="fc-topbar">
        <div className="wd-brand">
          <div className="wd-brand-logo">🦺</div>
          <div>
            <div className="wd-brand-name">WWGIS</div>
            <div className="wd-brand-tagline">Field Collector · Wastewater Network</div>
          </div>
        </div>

        <div className="wd-topbar-sep" />

        <div className="wd-chips">
          <div className="wd-chip"><span className="dot dot-green" />{manholes?.length ?? 0} Manholes</div>
          <div className="wd-chip"><span className="dot dot-lime"  />{pipes?.length ?? 0} Pipelines</div>
          {pickMode && (
            <div className="wd-chip" style={{ borderColor: 'rgba(143,220,0,0.5)', color: '#8fdc00', animation: 'pulse-dot 0.8s infinite' }}>
              <span className="dot dot-lime" style={{ animationDuration: '0.5s' }} /> Pick Mode Active
            </div>
          )}
        </div>

        <div className="wd-topbar-actions">
          {/* Profile Panel */}
          <button className={`wd-icon-btn${activePanel === 'profile' ? ' active' : ''}`}
                  onClick={() => toggle('profile')} title="User Profile">👤</button>
          {/* Settings Panel */}
          <button className={`wd-icon-btn${activePanel === 'settings' ? ' active' : ''}`}
                  onClick={() => toggle('settings')} title="Settings">⚙️</button>
          {/* Sign Out */}
          <button className="wd-icon-btn" title="Sign Out" onClick={() => window.location.reload()}>
            🚪
          </button>
          <div className="wd-role-pill">{role ?? 'Field Collector'}</div>
        </div>
      </header>

      {/* ── MAP ───────────────────────────────────────────── */}
      <div className="fc-map-wrap">
        <MapView
          manholes={manholes}
          pipes={pipes}
          role={role}
          userId={userId}
          onMapReady={setMapInstance}
          navPickMode={pickMode}
          onNavMapClick={handleNavMapClick}
        />
      </div>

      {/* ── PICK MODE INDICATOR ────────────────────────────── */}
      {pickMode && (
        <div className="fc-mode-indicator" style={{ pointerEvents: 'auto' }}>
          <div className="mi-dot" style={{ background: '#8fdc00', color: '#8fdc00' }} />
          <span className="mi-text">Click map to place point</span>
          <button
            onClick={cancelMapPick}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 6,
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#ef4444',
              pointerEvents: 'auto',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── PANELS ────────────────────────────────────────── */}
      {activePanel === 'home' && (
        <CollectorHome
          manholes={manholes}
          pipes={pipes}
          pendingCount={pendingCount}
          onClose={() => setActivePanel(null)}
          onNavigate={toggle}
        />
      )}
      {activePanel === 'collect' && (
        <DataCollection
          userId={userId}
          map={mapInstance}
          onDataCollected={handleDataRefreshed}
          onClose={() => setActivePanel(null)}
          onStartMapPick={startMapPick}
          onCancelMapPick={cancelMapPick}
        />
      )}
      {activePanel === 'flag' && (
        <FlagFeature
          userId={userId}
          manholes={manholes}
          pipes={pipes}
          map={mapInstance}
          onFeatureFlagged={handleDataRefreshed}
          onClose={() => setActivePanel(null)}
          onStartMapPick={startMapPick}
        />
      )}
      {activePanel === 'sync' && (
        <SyncData
          userId={userId}
          onSyncComplete={handleDataRefreshed}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'profile' && (
        <CollectorProfilePanel
          userId={userId}
          role={role}
          userProfile={userProfile}
          onClose={() => setActivePanel(null)}
        />
      )}
      {activePanel === 'settings' && (
        <CollectorSettingsPanel
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* ── BOTTOM DOCK ───────────────────────────────────── */}
      <nav className="fc-dock">
        {tools.map((t, i) => (
          <React.Fragment key={t.id}>
            {i === 1 && <div className="fc-dock-sep" />}
            {i === tools.length - 1 && <div className="fc-dock-sep" />}
            <button
              className={`fc-dock-btn${activePanel === t.id ? ' active' : ''}`}
              style={{ '--dock-color': t.color }}
              onClick={() => toggle(t.id)}
            >
              {t.badge > 0 && <span className="db-badge">{t.badge}</span>}
              <span className="db-icon">{t.icon}</span>
              <span className="db-label">{t.label}</span>
            </button>
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}
