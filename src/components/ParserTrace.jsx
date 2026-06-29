import React from 'react';
import { GitBranch } from 'lucide-react';

export default function ParserTrace({ steps }) {
  if (!steps?.length) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <GitBranch size={16} className="text-primary-light" />
          <h2 className="card-title">Parser Trace</h2>
        </div>
      </div>

      <div className="card-body">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Step</th>
                <th>Parser Stack</th>
                <th>Remaining Input</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.step}>
                  <td>{step.step}</td>
                  <td>{step.stack}</td>
                  <td>{step.remainingInput}</td>
                  <td>{step.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
