import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import AssetEditor from './AssetEditor';   // <-- import AssetEditor

export default function MaintenanceRecords({ userId }) {
  const [featureType, setFeatureType] = useState('manhole');
  const [featureId, setFeatureId] = useState('');
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(true);
  const [showAssetEditor, setShowAssetEditor] = useState(false); // <-- new
  const [formData, setFormData] = useState({
    maintenance_type: 'inspection',
    description: '',
    priority: 'medium',
    scheduled_date: '',
    technician: '',
    notes: ''
  });

  // Fetch asset when ID changes
  useEffect(() => {
    if (featureId && featureId.trim() !== '') {
      fetchAsset();
    } else {
      setAsset(null);
    }
  }, [featureId, featureType]);

  // Fetch user's own maintenance records
  useEffect(() => {
    fetchMyRecords();
  }, []);

  const fetchAsset = async () => {
    setLoading(true);
    const table = featureType === 'manhole' ? 'waste_water_manhole' : 'waste_water_pipeline';
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', featureId)
      .single();
    if (error) {
      setAsset(null);
      setMessage('❌ Asset not found');
    } else {
      setAsset(data);
      setMessage('');
    }
    setLoading(false);
  };

  const fetchMyRecords = async () => {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    if (!error) setRecords(data || []);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!asset) {
      setMessage('Please select a valid asset');
      return;
    }

    setSaving(true);
    const record = {
      feature_type: featureType,
      feature_id: featureId,
      ...formData,
      created_by: userId,
      status: 'pending',
      synced: false
    };

    const { error } = await supabase
      .from('maintenance_records')
      .insert([record]);

    if (error) {
      setMessage(`❌ Error: ${error.message}`);
    } else {
      setMessage('✅ Maintenance request submitted for approval.');
      setFormData({
        maintenance_type: 'inspection',
        description: '',
        priority: 'medium',
        scheduled_date: '',
        technician: '',
        notes: ''
      });
      setFeatureId('');
      setAsset(null);
      fetchMyRecords();
    }
    setSaving(false);
  };

  // Called after AssetEditor successfully submits an edit
  const handleEditSubmitted = () => {
    setShowAssetEditor(false);
    // Refresh asset data to show updated values
    if (featureId) fetchAsset();
    // Optionally refresh the whole dashboard
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const styles = {
    container: {
      position: "absolute",
      top: "80px",
      right: "20px",
      width: "500px",
      maxHeight: "calc(100vh - 100px)",
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "1rem",
      backgroundColor: "#ff9800",
      color: "white",
      fontWeight: "bold",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    closeBtn: { background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" },
    content: { padding: "1rem", overflowY: "auto", flex: 1 },
    row: { marginBottom: "1rem" },
    label: { display: "block", fontWeight: "bold", marginBottom: "0.25rem", color: "#555" },
    input: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
    select: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" },
    textarea: { width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc", minHeight: "60px" },
    readonly: { backgroundColor: "#f0f0f0", padding: "0.5rem", borderRadius: "6px", color: "#666" },
    button: { padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold" },
    submitBtn: { backgroundColor: "#4caf50", color: "white", width: "100%" },
    editAssetBtn: { backgroundColor: "#2196f3", color: "white", marginTop: "0.5rem", width: "100%" },
    message: { marginTop: "1rem", padding: "0.5rem", borderRadius: "4px", textAlign: "center" },
    recordItem: { border: "1px solid #eee", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem", backgroundColor: "#fafafa" },
    recordHeader: { display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" },
    recordStatus: { fontSize: "0.7rem", padding: "2px 8px", borderRadius: "12px", textTransform: "uppercase" },
    pendingBadge: { backgroundColor: "#ff9800", color: "white" },
    approvedBadge: { backgroundColor: "#4caf50", color: "white" },
    rejectedBadge: { backgroundColor: "#f44336", color: "white" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span>🔧 Maintenance Requests</span>
        <button style={styles.closeBtn} onClick={() => window.dispatchEvent(new Event('closePanel'))}>✕</button>
      </div>

      <div style={styles.content}>
        {showForm && (
          <>
            <h4>Submit New Request</h4>
            <div style={styles.row}>
              <label style={styles.label}>Asset Type</label>
              <select
                style={styles.select}
                value={featureType}
                onChange={(e) => { setFeatureType(e.target.value); setFeatureId(''); setAsset(null); }}
              >
                <option value="manhole">Manhole</option>
                <option value="pipeline">Pipeline</option>
              </select>
            </div>

            <div style={styles.row}>
              <label style={styles.label}>Asset ID</label>
              <input
                style={styles.input}
                type="text"
                placeholder={`Enter ${featureType} ID`}
                value={featureId}
                onChange={(e) => setFeatureId(e.target.value)}
              />
            </div>

            {loading && <div>Loading asset...</div>}

            {asset && (
              <div style={styles.row}>
                <div style={styles.readonly}>
                  <strong>Current Asset Info (read-only)</strong><br />
                  {featureType === 'manhole' ? (
                    <>
                      📍 Location: {asset.location ? `${asset.location.coordinates[1]}, ${asset.location.coordinates[0]}` : 'N/A'}<br />
                      🔧 Condition: {asset.condition_status || 'Unknown'}<br />
                      🕒 Last Inspection: {asset.last_inspection_date || 'Never'}<br />
                      📏 Depth: {asset.depth || 'N/A'}<br />
                      🔽 Invert Level: {asset.invert_level || 'N/A'}<br />
                      🟫 Ground Level: {asset.ground_level || 'N/A'}
                    </>
                  ) : (
                    <>
                      📍 Location: {asset.location ? `${asset.location.coordinates[1]}, ${asset.location.coordinates[0]}` : 'N/A'}<br />
                      🔧 Condition: {asset.condition_status || 'Unknown'}<br />
                      🕒 Last Inspection: {asset.last_inspection_date || 'Never'}
                    </>
                  )}
                </div>
                <button
                  style={{ ...styles.button, ...styles.editAssetBtn }}
                  onClick={() => setShowAssetEditor(true)}
                >
                  ✏️ Edit Asset Details
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={styles.row}>
                <label style={styles.label}>Maintenance Type</label>
                <select
                  style={styles.select}
                  value={formData.maintenance_type}
                  onChange={(e) => handleChange('maintenance_type', e.target.value)}
                >
                  <option value="inspection">Inspection</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="repair">Repair</option>
                  <option value="replacement">Replacement</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Priority</label>
                <select
                  style={styles.select}
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Description</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Describe the work needed"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Scheduled Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => handleChange('scheduled_date', e.target.value)}
                />
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Technician (optional)</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Assigned technician"
                  value={formData.technician}
                  onChange={(e) => handleChange('technician', e.target.value)}
                />
              </div>

              <div style={styles.row}>
                <label style={styles.label}>Notes (optional)</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Additional notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </div>

              <button
                type="submit"
                style={{ ...styles.button, ...styles.submitBtn }}
                disabled={saving}
              >
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>

            {message && (
              <div style={{ ...styles.message, backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da', color: message.includes('✅') ? '#155724' : '#721c24' }}>
                {message}
              </div>
            )}

            <hr style={{ margin: '1rem 0' }} />
          </>
        )}

        <h4>My Requests</h4>
        {records.length === 0 ? (
          <div>No maintenance requests yet.</div>
        ) : (
          records.map(record => (
            <div key={record.id} style={styles.recordItem}>
              <div style={styles.recordHeader}>
                <span><strong>{record.feature_type.toUpperCase()}</strong> ID: {record.feature_id}</span>
                <span style={{
                  ...styles.recordStatus,
                  ...(record.status === 'pending' ? styles.pendingBadge : record.status === 'approved' ? styles.approvedBadge : styles.rejectedBadge)
                }}>
                  {record.status}
                </span>
              </div>
              <div><strong>{record.maintenance_type}</strong> – {record.description}</div>
              <div>Priority: <span style={{ color: getPriorityColor(record.priority) }}>{record.priority}</span></div>
              {record.scheduled_date && <div>📅 Scheduled: {record.scheduled_date}</div>}
              {record.technician && <div>👤 Tech: {record.technician}</div>}
              {record.notes && <div>📝 {record.notes}</div>}
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.5rem' }}>
                Submitted: {new Date(record.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Asset Editor Modal / Panel */}
      {showAssetEditor && (
        <AssetEditor
          userId={userId}
          featureType={featureType}
          featureId={featureId}
          onEditSubmitted={handleEditSubmitted}
          onCancel={() => setShowAssetEditor(false)}
        />
      )}
    </div>
  );
}
