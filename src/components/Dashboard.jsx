import MapView from "./MapView";
import ManholeList from "./ManholeList";
import PipeList from "./PipelineList";

export default function Dashboard({ role }) {
  // Temporary sample data (replace with API or DB later)
  const manholes = [
    {
      id: 1,
      status: "Needs Maintenance",
      plus_code: "X123",
      geom: { coordinates: [32.67, -18.97] }
    }
  ];

  const pipes = [
    {
      id: 1,
      status: "Good",
      plus_code: "Y456",
      material: "PVC",
      condition: "Excellent",
      geom: {
        coordinates: [
          [32.67, -18.97],
          [32.68, -18.96]
        ]
      }
    }
  ];

  // Role-based messages
  const roleMessages = {
    developer: "You have full access to all operations.",
    "field-operator": "You can edit status and sync data for approval.",
    "field-collector": "You can flag manholes and collect data only."
  };

  const roles = [
    { name: "Field Operator", key: "field-operator" },
    { name: "Field Collector", key: "field-collector" },
    { name: "Developer", key: "developer" }
  ];

  return (
    <div className="dashboard-container">
      <div className={`dashboard-layout role-${role}`}>
        {/* Left half: Map with border based on role */}
        <section className="map-section">
          <MapView manholes={manholes} pipes={pipes} />
        </section>

        {/* Right half: Black area with role info in tabs */}
        <section className="info-section">
          <div className="role-tabs">
            {roles.map((r) => (
              <div key={r.key} className={`role-tab ${r.key === role ? 'active' : ''}`}>
                <span className="role-label">{r.name}</span>
              </div>
            ))}
          </div>
          
          <div className="role-content">
            <h3>Current Role: {role.replace("-", " ")}</h3>
            <p>{roleMessages[role]}</p>
            
            <div className="lists-section">
              <ManholeList manholes={manholes} />
              <PipeList pipes={pipes} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
