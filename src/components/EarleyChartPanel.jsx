import React from 'react';
import { Network } from 'lucide-react';

export default function EarleyChartPanel({ chartStates }) {
  if (!chartStates?.length) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-group">
          <Network size={16} className="text-primary-light" />
          <h2 className="card-title">Earley Chart Viewer</h2>
        </div>
        <span className="badge badge-info">Chart States</span>
      </div>

      <div className="card-body">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Rule</th>
                <th>Dot Position</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>
            <tbody>
              {chartStates.map((state, idx) => (
                <tr key={`${state.start}-${state.end}-${idx}`} className={state.completed ? 'row-complete' : ''}>
                  <td>{idx + 1}</td>
                  <td>{state.rule}</td>
                  <td>{state.dot}</td>
                  <td>{state.start}</td>
                  <td>{state.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
