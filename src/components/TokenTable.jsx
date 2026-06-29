export default function TokenTable({ tokens }) {
  if (!tokens.length) return null;

  return (
    <div className="panel">
      <h2>Lexical Analysis (Tokenizer)</h2>

      <table className="token-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Lexeme</th>
            <th>Token</th>
          </tr>
        </thead>

        <tbody>
          {tokens.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.lexeme}</td>
              <td>{t.token}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}