export default function PipeList({ pipes }) {
  return (
    <div>
      <h3>Pipes</h3>
      <ul>
        {pipes.map((p) => (
          <li key={p.id}>
            ID: {p.id}, Material: {p.material}, Condition: {p.condition}
          </li>
        ))}
      </ul>
    </div>
  );
}