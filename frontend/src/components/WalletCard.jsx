export default function WalletCard({
  address,
  roleName,
  roleBadgeClass,
  isConnecting,
  isSepolia,
  onConnect,
  onDisconnect,
  onRefreshRole,
  onCopyAddress,
  onSwitchNetwork,
  walletError,
}) {
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";
  const isConnected = Boolean(address);
  const networkBadge = !isConnected
    ? { label: "Not connected", className: "badge-neutral" }
    : isSepolia
    ? { label: "Sepolia", className: "badge-success" }
    : { label: "Wrong network", className: "badge-danger" };
  const networkHint =
    isConnected && !isSepolia ? "Switch MetaMask to Sepolia" : "";

  return (
    <section className="card wallet-card">
      <div className="card-header">
        <div>
          <h2>Wallet</h2>
          <p className="helper">
            Connect MetaMask to detect your role and access role-based actions.
          </p>
        </div>
        <div className="badge-group">
          <span className={`badge ${roleBadgeClass}`}>{roleName}</span>
          <span className={`badge ${networkBadge.className}`}>
            {networkBadge.label}
          </span>
          {networkHint && <span className="meta-text">{networkHint}</span>}
        </div>
      </div>

      <div className="wallet-actions">
        <button
          type="button"
          className="btn primary"
          onClick={onConnect}
          disabled={isConnecting}
        >
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={onDisconnect}
          disabled={!address}
        >
          Disconnect
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={onRefreshRole}
          disabled={!address}
        >
          Refresh Role
        </button>
      </div>

      <div className="wallet-info">
        <div>
          <p className="meta-label">Address</p>
          <div className="inline">
            <span className="mono">{shortAddress || "Not connected"}</span>
            <button
              type="button"
              className="btn ghost icon-button"
              onClick={() => onCopyAddress?.(address)}
              disabled={!address}
              aria-label="Copy wallet address"
            >
              Copy
            </button>
          </div>
        </div>
        {!isSepolia && address && (
          <div className="callout warning">
            <strong>Network mismatch.</strong> Please switch to Sepolia (chainId
            11155111).
            <button
              type="button"
              className="btn ghost"
              onClick={onSwitchNetwork}
            >
              Switch to Sepolia
            </button>
          </div>
        )}
        {walletError && <div className="callout danger">{walletError}</div>}
      </div>
    </section>
  );
}
