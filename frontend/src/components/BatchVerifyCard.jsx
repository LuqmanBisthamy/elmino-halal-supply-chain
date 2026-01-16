import { QRCodeCanvas } from "qrcode.react";

// Helper to determine active step based on status string
function getStepStatus(currentStatus, stepName) {
  const status = (currentStatus || "").toLowerCase();
  
  // Logic: Has the product reached or passed this stage?
  if (stepName === "Producer") return true; // Always starts here
  if (stepName === "Halal Auth" && status !== "created") return true;
  if (stepName === "Distributor" && (status.includes("transit") || status.includes("sale"))) return true;
  if (stepName === "Retailer" && status.includes("sale")) return true;
  
  return false;
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
    const s1 = getStepStatus(verifyResult.status, "Producer")    ? "✅" : "❌";
    const s2 = getStepStatus(verifyResult.status, "Halal Auth")  ? "✅" : "❌";
    const s3 = getStepStatus(verifyResult.status, "Distributor") ? "✅" : "❌";
    const s4 = getStepStatus(verifyResult.status, "Retailer")    ? "✅" : "❌";

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
      `[🐮] Producer: ${verifyResult.producer.substring(0, 8)}...\n` +
      `[🎖️] Cert Hash: ${verifyResult.halalCertHash ? "VERIFIED ✅" : "PENDING ⏳"}\n` +
      `[👤] Owner: ${verifyResult.currentOwner.substring(0, 8)}...\n` +
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
             <div style={{ 
                 background: "white", 
                 padding: "10px", 
                 display: "inline-block", 
                 borderRadius: "16px",
                 boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
             }}>
              <QRCodeCanvas 
                value={qrContent} 
                size={180}  // Slightly larger to fit more data cleanly
                level={"L"} // Lower error correction allows more data capacity
              />
            </div>
            <h3 style={{marginTop: "15px", marginBottom: "5px", fontSize: "1.5rem"}}>
                {verifyResult.productName}
            </h3>
            <span className="badge badge-success">{verifyResult.status}</span>
          </div>

          {/* --- 2. THE VISUAL TIMELINE (On Screen) --- */}
          <div className="timeline-container">
            {["Producer", "Halal Auth", "Distributor", "Retailer"].map((step, index) => {
               const isActive = getStepStatus(verifyResult.status, step);
               return (
                 <div key={step} className={`timeline-step ${isActive ? "active" : ""}`}>
                   <div className="step-circle">
                     {isActive ? "✓" : index + 1}
                   </div>
                   <div className="step-label">{step}</div>
                 </div>
               );
            })}
          </div>

          {/* --- 3. INFO CARDS --- */}
          <div className="info-grid">
             <div className="info-card">
                <h4>Batch ID</h4>
                <p>{verifyResult.batchId}</p>
             </div>
             <div className="info-card">
                <h4>Producer Address</h4>
                <p>{verifyResult.producer.substring(0, 16)}...</p>
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

          <div style={{marginTop: "20px", textAlign: "center"}}>
            <a
                className="btn secondary"
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{width: "100%"}}
            >
                View Full History on Etherscan
            </a>
          </div>

        </div>
      )}
    </section>
  );
}