export default function HeaderBar({
  chainId,
  contractAddress,
  onCopyContract,
  appTitle,
  appSubtitle,
}) {
  const shortAddress = contractAddress
    ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`
    : "";

  return (
    <header className="header-card">
      <div>
        <p className="eyebrow">Academic demo</p>
        <h1>{appTitle}</h1>
        <p className="subtitle">{appSubtitle}</p>
      </div>
      <div className="header-meta">
        <div className="meta-row">
          <span className="badge badge-accent">Sepolia</span>
          <span className="meta-text">chainId {chainId}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Contract</span>
          <span className="mono">{shortAddress || "Not set"}</span>
          <button
            type="button"
            className="btn ghost icon-button"
            onClick={() => onCopyContract?.(contractAddress)}
            aria-label="Copy contract address"
          >
            Copy
          </button>
        </div>
      </div>
    </header>
  );
}
