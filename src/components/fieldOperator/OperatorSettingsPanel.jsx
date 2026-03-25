import React, { useState } from 'react';
import './Dashboard.css';

export default function OperatorSettingsProfile({ onClose }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const toggleNotifications = () => setNotifications(prev => !prev);

  return (
    <div className="wd-panel">
      <div className="wd-panel-header">
        <div className="wd-panel-icon" style={{ '--panel-icon-bg': 'var(--glow-lime)' }}>
          ⚙️
        </div>
        <div>
          <div className="wd-panel-title">Settings</div>
          <div className="wd-panel-sub">Preferences & App Config</div>
        </div>
        <button className="wd-panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="wd-panel-body">
        <div className="wd-toggle-row">
          <div>
            <div className="wd-toggle-label">Dark Mode</div>
            <div className="wd-toggle-sub">System theme preference</div>
          </div>
          <div className={`wd-toggle ${darkMode ? 'on' : ''}`} onClick={toggleDarkMode} />
        </div>
        <div className="wd-toggle-row">
          <div>
            <div className="wd-toggle-label">Notifications</div>
            <div className="wd-toggle-sub">Receive alerts for network issues</div>
          </div>
          <div className={`wd-toggle ${notifications ? 'on' : ''}`} onClick={toggleNotifications} />
        </div>
        {/* Additional settings can be added here */}
      </div>
    </div>
  );
}
