import React from 'react';
import { ScanSearch } from 'lucide-react';

export default function LexicalAnalysis({ rows }) {
  if (!rows?.length) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <ScanSearch size={16} className="text-info-light" />
            <h2 className="card-title">Lexical Analysis</h2>
          </div>
        </div>
        <div className="card-body">
          <div className="empty-state">No tokens available yet.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <ScanSearch size={16} className="text-info-light" />
          <h2 className="card-title">Lexical Analysis</h2>
        </div>
        <span className="badge badge-info">Tokenizer</span>
      </div>

      <div className="card-body">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Lexeme</th>
                <th>Token</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.lexeme}</td>
                  <td><span className="token-pill">{row.token}</span></td>
                  <td>{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
