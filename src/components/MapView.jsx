import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ manholes = [], pipes = [] }) {
  return (
    <MapContainer
      center={[-18.97, 32.67]}
      zoom={13}
      style={{ height: "70vh", width: "100%" }}
    >
      <TileLayer
        attribution="OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {manholes.map((m) => (
        <Marker
          key={m.id}
          position={[m.geom.coordinates[1], m.geom.coordinates[0]]}
        >
          <Popup>
            ID: {m.id} <br /> Status: {m.status} <br /> Plus Code: {m.plus_code}
          </Popup>
        </Marker>
      ))}

      {pipes.map((p, idx) => (
        <Polyline
          key={idx}
          positions={p.geom.coordinates.map(([lon, lat]) => [lat, lon])}
          color="blue"
        />
      ))}
    </MapContainer>
  );
}