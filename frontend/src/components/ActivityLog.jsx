export default function ActivityLog({ items, explorerBaseUrl }) {
  return (
    <section className="card activity-card">
      <div className="card-header">
        <div>
          <h2>Activity Log</h2>
          <p className="helper">Local session history (no chain fetch).</p>
        </div>
        <span className="badge badge-outline">{items.length} entries</span>
      </div>
      {items.length === 0 ? (
        <p className="empty">No actions yet. Your activity will appear here.</p>
      ) : (
        <div className="activity-list">
          {items.map((item, index) => (
            <div key={`${item.hash}-${index}`} className="activity-item">
              <div>
                <p className="activity-action">{item.action}</p>
                <p className="meta-text">{item.time}</p>
              </div>
              <a
                className="btn ghost"
                href={`${explorerBaseUrl}/tx/${item.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
