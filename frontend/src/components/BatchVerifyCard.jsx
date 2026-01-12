export default function BatchVerifyCard({
  verifyForm,
  onChange,
  onSubmit,
  verifyResult,
  verifyError,
  explorerUrl,
  isReady,
}) {
  return (
    <section className="card verify-card">
      <div className="card-header">
        <div>
          <h2>Verify Batch</h2>
          <p className="helper">
            Consumers can verify halal supply chain data without connecting a
            wallet.
          </p>
        </div>
        <span className="badge badge-outline">Read-only</span>
      </div>

      <form onSubmit={onSubmit} className="form-grid">
        <label className="field">
          <span>Batch ID</span>
          <input
            type="text"
            placeholder="Enter batch ID"
            value={verifyForm.batchId}
            onChange={(e) => onChange({ batchId: e.target.value })}
            required
          />
        </label>
        <button type="submit" className="btn primary" disabled={!isReady}>
          Verify
        </button>
      </form>

      {verifyError && <div className="callout danger">{verifyError}</div>}

      {verifyResult && (
        <div className="verify-results">
          <table>
            <tbody>
              <tr>
                <td>Product Name</td>
                <td>{verifyResult.productName}</td>
              </tr>
              <tr>
                <td>Batch ID</td>
                <td>{verifyResult.batchId}</td>
              </tr>
              <tr>
                <td>Producer</td>
                <td className="mono">{verifyResult.producer}</td>
              </tr>
              <tr>
                <td>Current Owner</td>
                <td className="mono">{verifyResult.currentOwner}</td>
              </tr>
              <tr>
                <td>Status</td>
                <td>{verifyResult.status}</td>
              </tr>
              <tr>
                <td>Halal Cert Hash</td>
                <td className="mono">{verifyResult.halalCertHash}</td>
              </tr>
              <tr>
                <td>Created At</td>
                <td>{verifyResult.createdAt}</td>
              </tr>
            </tbody>
          </table>
          <a
            className="btn secondary"
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on Etherscan
          </a>
        </div>
      )}
    </section>
  );
}
