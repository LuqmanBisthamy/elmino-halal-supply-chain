export default function TxStatusCard({
  txStatus,
  explorerBaseUrl,
  onCopyHash,
}) {
  const isIdle = txStatus.state === "idle";
  const isPending = txStatus.state === "pending";
  const isSuccess = txStatus.state === "success";
  const isError = txStatus.state === "error";
  const explorerUrl = txStatus.hash
    ? `${explorerBaseUrl}/tx/${txStatus.hash}`
    : "";
  const shortHash = (h) => (h ? `${h.slice(0, 6)}…${h.slice(-4)}` : "");

  return (
    <section className="card tx-card">
      <div className="card-header">
        <div>
          <h2>Transaction Status</h2>
          <p className="helper">
            Track contract interactions and quickly open Etherscan.
          </p>
        </div>
        <span
          className={`badge ${
            isIdle
              ? "badge-outline"
              : isPending
              ? "badge-warning"
              : isSuccess
              ? "badge-success"
              : "badge-danger"
          }`}
        >
          {isIdle
            ? "Idle"
            : isPending
            ? "Pending"
            : isSuccess
            ? "Success"
            : "Failed"}
        </span>
      </div>

      <div className="tx-body">
        <p className="meta-label">Current action</p>
        <p className="tx-action">
          {txStatus.action || "No transaction submitted yet."}
        </p>

        {isPending && <div className="spinner" aria-label="Loading" />}

        {txStatus.message && (
          <div className="callout success">{txStatus.message}</div>
        )}
        {txStatus.error && <div className="callout danger">{txStatus.error}</div>}

        {txStatus.hash && (
          <div className="tx-hash">
            <p className="meta-label">Transaction Hash</p>
            <div className="hash-row">
              <span className="hash-chip mono">{shortHash(txStatus.hash)}</span>
              <div className="hash-actions">
                <button
                  type="button"
                  className="btn ghost icon-button"
                  onClick={() => onCopyHash?.(txStatus.hash)}
                  aria-label="Copy transaction hash"
                >
                  Copy
                </button>
                <a
                  className="btn ghost"
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
