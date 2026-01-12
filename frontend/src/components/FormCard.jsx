export default function FormCard({ title, description, children }) {
  return (
    <div className="card form-card">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          {description && <p className="helper">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
