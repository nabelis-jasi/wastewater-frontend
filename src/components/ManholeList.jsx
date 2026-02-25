export default function ManholeList({ manholes, role }) {
  return (
    <div>
      <h3>Manholes</h3>
      <ul>
        {manholes.map((m) => (
          <li key={m.id}>
            ID: {m.id}, Status: {m.status}, Plus Code: {m.plus_code}{" "}
            {role === "FieldOperator" && <button>Edit</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}