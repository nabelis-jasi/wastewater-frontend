import React from 'react';

export default function CollectorProfilePanel({
  userId,
  role,
  userProfile,
  onLogout,
  onClose
}) {
  return (
    <div className="wd-panel">

      {/* HEADER */}
      <div className="wd-panel-header">
        <h3>Profile</h3>
        <button onClick={onClose}>✖</button>
      </div>

      {/* CONTENT */}
      <div className="wd-panel-body">

        <div className="wd-section">
          <p><strong>User ID:</strong> {userId}</p>
          <p><strong>Role:</strong> {role ?? 'field-collector'}</p>
        </div>

        <div className="wd-section">
          <p><strong>Name:</strong> {userProfile?.name || '—'}</p>
          <p><strong>Email:</strong> {userProfile?.email || '—'}</p>
        </div>

        <div className="wd-section">
          <p><strong>Status:</strong> Active</p>
          <p><strong>Mode:</strong> Field Operations</p>
        </div>

      </div>

      {/* ACTIONS */}
      <div className="wd-panel-footer">

        <button
          style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#ef4444',
            padding: '10px',
            borderRadius: 8,
            cursor: 'pointer',
            width: '100%',
            fontWeight: 600
          }}
          onClick={onLogout}
        >
          ⎋ Logout
        </button>

      </div>

    </div>
  );
}
