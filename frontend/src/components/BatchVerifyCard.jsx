import { QRCodeCanvas } from "qrcode.react";

const STEP_INDEX = {
  "Producer": 0,
  "Halal Authority": 1,
  "Distributor": 2,
  "Retailer": 3,
};

function roleToStage(role) {
  switch (Number(role)) {
    case 2:
      return 0;
    case 3:
      return 1;
    case 4:
      return 2;
    case 5:
      return 3;
    default:
      return -1;
  }
}

function inferStatusStage(currentStatus, halalCertHash) {
  const status = (currentStatus || "").toLowerCase();
  let stage = -1;
  if (status.includes("produced")) stage = Math.max(stage, 0);
  if (status.includes("certified") || halalCertHash) stage = Math.max(stage, 1);
  if (status.includes("distribut") || status.includes("transit")) stage = Math.max(stage, 2);
  if (status.includes("retail") || status.includes("sale")) stage = Math.max(stage, 3);
  return stage;
}

// Helper to determine active step based on status + owner role
function getStepStatus(currentStatus, stepName, ownerRole, halalCertHash) {
  const stepIndex = STEP_INDEX[stepName];
  const roleStage = roleToStage(ownerRole);
  const statusStage = inferStatusStage(currentStatus, halalCertHash);
  const maxStage = Math.max(0, roleStage, statusStage);
  return stepIndex <= maxStage;
}

export default function BatchVerifyCard({
  verifyForm,
  onChange,
  onSubmit,
  verifyResult,
  verifyError,
  explorerUrl,
  isReady,
}) {
  // --- UPDATED QR CONTENT GENERATION ---
  let qrContent = "";
  if (verifyResult) {
    // 1. Calculate status symbols for each step
    const s1 = getStepStatus(
      verifyResult.status,
      "Producer",
      verifyResult.currentOwnerRole,
      verifyResult.halalCertHash
    )
      ? "OK"
      : "X";
    const s2 = getStepStatus(
      verifyResult.status,
      "Halal Authority",
      verifyResult.currentOwnerRole,
      verifyResult.halalCertHash
    )
      ? "OK"
      : "X";
    const s3 = getStepStatus(
      verifyResult.status,
      "Distributor",
      verifyResult.currentOwnerRole,
      verifyResult.halalCertHash
    )
      ? "OK"
      : "X";
    const s4 = getStepStatus(
      verifyResult.status,
      "Retailer",
      verifyResult.currentOwnerRole,
      verifyResult.halalCertHash
    )
      ? "OK"
      : "X";

    // 2. Build the text string
    qrContent =
      `EL MINO: DIGITAL HALAL PROOF\n` +
      `----------------------------\n` +
      `Product: ${verifyResult.productName}\n` +
      `Batch ID: ${verifyResult.batchId}\n` +
      `Status:   ${verifyResult.status}\n` +
      `Date Produced:     ${verifyResult.createdAt}\n` +
      `\n` +
      `-- CHAIN OF CUSTODY --\n` +
      `----------------------------\n` +
      `Producer: ${verifyResult.producer}\n` +
      `Cert Hash: ${verifyResult.halalCertHash ? "VERIFIED OK" : "PENDING"}\n` +
      `Owner: ${verifyResult.currentOwner}\n` +
      `\n` +
      `-- PROCESS TRACKER --\n` +
      `----------------------------\n` +
      `         Producer          ${s1}\n` +
      `               |\n` +
      `         Halal Authority ${s2}\n` +
      `               |\n` +
      `         Distributor        ${s3}\n` +
      `               |\n` +
      `         Retailer             ${s4}`;
  }
  // -------------------------------------

  return (
    <section className="card verify-card">
      <div className="card-header">
        <div>
          <h2>Verify Batch</h2>
          <p className="helper">
            Track product journey from farm to fork.
          </p>
        </div>
        <span className="badge badge-outline">Read-only</span>
      </div>

      <form onSubmit={onSubmit} className="form-grid">
        <label className="field">
          <span>Batch ID</span>
          <input
            type="text"
            placeholder="Enter batch ID (e.g. BATCH-001)"
            value={verifyForm.batchId}
            onChange={(e) => onChange({ batchId: e.target.value })}
            required
          />
        </label>
        <button type="submit" className="btn primary" disabled={!isReady}>
          Trace Product
        </button>
      </form>

      {verifyError && <div className="callout danger">{verifyError}</div>}

      {verifyResult && (
        <div className="verify-results">
          {/* --- 1. QR CODE CENTERPIECE --- */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div
              style={{
                background: "white",
                padding: "10px",
                display: "inline-block",
                borderRadius: "16px",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
              }}
            >
              <QRCodeCanvas
                value={qrContent}
                size={180}
                level={"L"}
              />
            </div>
            <h3
              style={{
                marginTop: "15px",
                marginBottom: "5px",
                fontSize: "1.5rem",
              }}
            >
              {verifyResult.productName}
            </h3>
            <span className="badge badge-success">{verifyResult.status}</span>
          </div>

          {/* --- 2. THE VISUAL TIMELINE (On Screen) --- */}
          <div className="timeline-container">
            {["Producer", "Halal Authority", "Distributor", "Retailer"].map(
              (step, index) => {
                const isActive = getStepStatus(
                  verifyResult.status,
                  step,
                  verifyResult.currentOwnerRole,
                  verifyResult.halalCertHash
                );
                return (
                  <div
                    key={step}
                    className={`timeline-step ${isActive ? "active" : ""}`}
                  >
                    <div className="step-circle">
                      {isActive ? "✓" : index + 1}
                    </div>
                    <div className="step-label">{step}</div>
                  </div>
                );
              }
            )}
          </div>

          {/* --- 3. INFO CARDS --- */}
          <div className="info-grid">
            <div className="info-card">
              <h4>Batch ID</h4>
              <p>{verifyResult.batchId}</p>
            </div>
            <div className="info-card">
              <h4>Producer Address</h4>
              <p>{verifyResult.producer}</p>
            </div>
            <div className="info-card">
              <h4>Halal Cert</h4>
              <p>{verifyResult.halalCertHash || "Pending"}</p>
            </div>
            <div className="info-card">
              <h4>Created Date</h4>
              <p>{verifyResult.createdAt}</p>
            </div>
          </div>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <a
              className="btn secondary"
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              style={{ width: "100%" }}
            >
              View Full History on Etherscan
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
