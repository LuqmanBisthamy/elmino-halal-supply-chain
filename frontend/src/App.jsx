import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, JsonRpcProvider, ethers } from "ethers";
import abiJson from "./abi/ElMinoHalalSupplyChain.json";
import { chainId, contractAddress, readOnlyRpcUrl } from "./config/contract";
import ActivityLog from "./components/ActivityLog";
import BatchVerifyCard from "./components/BatchVerifyCard";
import FormCard from "./components/FormCard";
import HeaderBar from "./components/HeaderBar";
import Tabs from "./components/Tabs";
import TxStatusCard from "./components/TxStatusCard";
import WalletCard from "./components/WalletCard";
import "./App.css";

const explorerBaseUrl = "https://sepolia.etherscan.io";

function normalizeHexAddress(input) {
  const raw = String(input ?? "");
  const hex = raw.replace(/[^0-9a-fA-Fx]/g, "");
  const with0x = hex.startsWith("0x") ? hex : `0x${hex.replace(/^0x/i, "")}`;
  const candidate = with0x.slice(0, 42);
  try {
    return ethers.getAddress(candidate);
  } catch {
    return null;
  }
}

const FULL_CONTRACT_ADDRESS = normalizeHexAddress(contractAddress);

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState("");
  const [role, setRole] = useState(0);
  const [networkId, setNetworkId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [txStatus, setTxStatus] = useState({
    state: "idle",
    action: "",
    actionKey: "",
    message: "",
    error: "",
    hash: "",
  });
  const [activityLog, setActivityLog] = useState([]);

  const roleName = useMemo(() => {
    const map = {
      0: "None",
      1: "Admin",
      2: "Producer",
      3: "HalalAuthority",
      4: "Distributor",
      5: "Retailer",
    };
    return map[role] || "Unknown";
  }, [role]);

  const roleBadgeClass = useMemo(() => {
    const map = {
      None: "badge-outline",
      Admin: "badge-accent",
      Producer: "badge-success",
      HalalAuthority: "badge-warning",
      Distributor: "badge-info",
      Retailer: "badge-neutral",
      Unknown: "badge-danger",
    };
    return map[roleName] || "badge-outline";
  }, [roleName]);

  const readOnlyProvider = useMemo(
    () => new JsonRpcProvider(readOnlyRpcUrl),
    []
  );
  const writeContract = useMemo(() => {
    if (!provider || !FULL_CONTRACT_ADDRESS) return null;
    return new ethers.Contract(
      FULL_CONTRACT_ADDRESS,
      abiJson.abi,
      signer || provider
    );
  }, [provider, signer]);
  const readContract = useMemo(
    () =>
      FULL_CONTRACT_ADDRESS
        ? new ethers.Contract(
            FULL_CONTRACT_ADDRESS,
            abiJson.abi,
            provider || readOnlyProvider
          )
        : null,
    [provider, readOnlyProvider]
  );

  const [assignRoleForm, setAssignRoleForm] = useState({
    actor: "",
    role: "2",
  });
  const [createBatchForm, setCreateBatchForm] = useState({
    batchId: "",
    productName: "",
  });
  const [transferForm, setTransferForm] = useState({
    batchId: "",
    to: "",
  });
  const [certForm, setCertForm] = useState({
    batchId: "",
    certHash: "",
  });
  const [statusForm, setStatusForm] = useState({
    batchId: "",
    newStatus: "",
  });
  const [verifyForm, setVerifyForm] = useState({ batchId: "" });
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [activeTab, setActiveTab] = useState("consumer");

  function parseError(err) {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err.split("\n")[0];
    if (err.reason) return err.reason;
    if (err.shortMessage) return err.shortMessage;
    if (err.data && err.data.message) return err.data.message.split("\n")[0];
    const message = err.message || "Transaction failed";
    return message
      .replace("execution reverted: ", "")
      .replace("VM Exception while processing transaction: ", "")
      .split("\n")[0];
  }

  async function copyToClipboard(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      setWalletError("Unable to copy to clipboard.");
    }
  }

  function clearWalletState() {
    setProvider(null);
    setSigner(null);
    setAddress("");
    setRole(0);
    setNetworkId(null);
    setWalletError("");
  }

  async function connectWallet() {
    setWalletError("");
    if (!window.ethereum) {
      setWalletError("MetaMask not detected.");
      return;
    }

    try {
      setIsConnecting(true);
      const nextProvider = new BrowserProvider(window.ethereum);
      await nextProvider.send("eth_requestAccounts", []);
      const nextSigner = await nextProvider.getSigner();
      const addr = await nextSigner.getAddress();
      const network = await nextProvider.getNetwork();

      setProvider(nextProvider);
      setSigner(nextSigner);
      setAddress(addr);
      setNetworkId(Number(network.chainId));
    } catch (err) {
      setWalletError(parseError(err));
    } finally {
      setIsConnecting(false);
    }
  }

  async function switchToSepolia() {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch (err) {
      setWalletError(parseError(err));
    }
  }

  async function refreshRole() {
    if (!writeContract || !address) return;
    try {
      const nextRole = await writeContract.roles(address);
      setRole(Number(nextRole));
    } catch (err) {
      setWalletError(parseError(err));
    }
  }

  useEffect(() => {
    if (writeContract && address) {
      refreshRole();
    }
  }, [writeContract, address]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        clearWalletState();
        return;
      }
      setAddress(accounts[0]);
      setRole(0);
    };
    const handleChainChanged = (nextChainId) => {
      setNetworkId(Number(nextChainId));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  async function sendTransaction(actionKey, actionLabel, action, successMessage) {
    setTxStatus({
      state: "pending",
      action: actionLabel,
      actionKey,
      message: "",
      error: "",
      hash: "",
    });
    setIsBusy(true);
    try {
      const tx = await action();
      setTxStatus((prev) => ({ ...prev, hash: tx.hash }));
      await tx.wait();
      setTxStatus({
        state: "success",
        action: actionLabel,
        actionKey,
        message: successMessage,
        error: "",
        hash: tx.hash,
      });
      setActivityLog((prev) =>
        [
          {
            time: new Date().toLocaleTimeString(),
            action: actionLabel,
            hash: tx.hash,
          },
          ...prev,
        ].slice(0, 8)
      );
    } catch (err) {
      setTxStatus({
        state: "error",
        action: actionLabel,
        actionKey,
        message: "",
        error: parseError(err),
        hash: "",
      });
    } finally {
      setIsBusy(false);
    }
  }

  function renderInlineStatus(actionKey) {
    if (txStatus.actionKey !== actionKey) return null;
    if (txStatus.state === "pending") {
      return <div className="inline-status">Submitting...</div>;
    }
    if (txStatus.state === "error") {
      return <div className="inline-status error">{txStatus.error}</div>;
    }
    if (txStatus.state === "success") {
      return <div className="inline-status success">{txStatus.message}</div>;
    }
    return null;
  }

  async function handleAssignRole(e) {
    e.preventDefault();
    if (!writeContract) return;
    await sendTransaction(
      "assign-role",
      "Assigning role",
      () =>
        writeContract.assignRole(assignRoleForm.actor, Number(assignRoleForm.role)),
      "Role assigned."
    );
  }

  async function handleCreateBatch(e) {
    e.preventDefault();
    if (!writeContract) return;
    await sendTransaction(
      "create-batch",
      "Creating batch",
      () =>
        writeContract.createBatch(
          createBatchForm.batchId,
          createBatchForm.productName
        ),
      "Batch created."
    );
  }

  async function handleTransferBatch(e) {
    e.preventDefault();
    if (!writeContract) return;
    await sendTransaction(
      "transfer-batch",
      "Transferring batch",
      () => writeContract.transferBatch(transferForm.batchId, transferForm.to),
      "Batch transferred."
    );
  }

  async function handleSetCert(e) {
    e.preventDefault();
    if (!writeContract) return;
    await sendTransaction(
      "set-cert",
      "Setting halal certificate",
      () => writeContract.setHalalCertificate(certForm.batchId, certForm.certHash),
      "Halal certificate set."
    );
  }

  async function handleUpdateStatus(e) {
    e.preventDefault();
    if (!writeContract) return;
    await sendTransaction(
      "update-status",
      "Updating status",
      () => writeContract.updateStatus(statusForm.batchId, statusForm.newStatus),
      "Status updated."
    );
  }

  async function handleVerify(e) {
    e.preventDefault();
    console.log("VERIFY", {
      batchId: verifyForm.batchId,
      contractAddress: FULL_CONTRACT_ADDRESS,
    });
    setVerifyError("");
    setVerifyResult(null);
    if (!readContract) {
      setVerifyError(
        "Invalid contract address config. Please check src/config/contract.js"
      );
      return;
    }

    try {
      const batch = await readContract.getBatch(verifyForm.batchId);
      let ownerRole = 0;
      try {
        ownerRole = Number(await readContract.roles(batch.currentOwner));
      } catch (err) {
        ownerRole = 0;
      }
      setVerifyResult({
        productName: batch.productName,
        batchId: batch.id.toString(),
        producer: batch.producer,
        currentOwner: batch.currentOwner,
        currentOwnerRole: ownerRole,
        status: batch.status,
        halalCertHash: batch.halalCertHash,
        createdAt: new Date(Number(batch.createdAt) * 1000).toLocaleString(),
      });
    } catch (err) {
      console.error(err);
      const message = parseError(err);
      setVerifyError(
        message.toLowerCase().includes("batch") ||
          message.toLowerCase().includes("not found")
          ? "Batch not found"
          : message
      );
    }
  }

  const isSepolia = networkId === chainId;
  const tabs = useMemo(() => {
    const allowed = ["consumer"];
    if (roleName === "Producer") allowed.push("producer");
    if (roleName === "HalalAuthority") allowed.push("authority");
    if (roleName === "Distributor") allowed.push("distributor");
    if (roleName === "Retailer") allowed.push("retailer");
    if (roleName === "Admin") allowed.push("admin");

    const allTabs = [
      { key: "consumer", label: "Consumer" },
      { key: "producer", label: "Producer" },
      { key: "authority", label: "Halal Authority" },
      { key: "distributor", label: "Distributor" },
      { key: "retailer", label: "Retailer" },
      { key: "admin", label: "Admin" },
    ];
    return allTabs.filter((tab) => allowed.includes(tab.key));
  }, [roleName]);

  useEffect(() => {
    if (!tabs.find((tab) => tab.key === activeTab)) {
      setActiveTab("consumer");
    }
  }, [tabs, activeTab]);

  return (
    <div className="app-shell">
      <HeaderBar
        chainId={chainId}
        contractAddress={FULL_CONTRACT_ADDRESS || ""}
        appTitle="El Mino - Halal Supply Chain dApp"
        appSubtitle="Transparent halal verification across producers, authorities, and retailers."
        onCopyContract={(value) => {
          if (!FULL_CONTRACT_ADDRESS) return;
          copyToClipboard(value);
        }}
      />
      {!FULL_CONTRACT_ADDRESS && (
        <section className="card">
          <div className="callout danger">
            Invalid contract address config. Please check
            {" "}
            src/config/contract.js
          </div>
        </section>
      )}

      <div className="split-grid">
        <WalletCard
          address={address}
          roleName={roleName}
          roleBadgeClass={roleBadgeClass}
          isConnecting={isConnecting}
          isSepolia={isSepolia}
          onConnect={connectWallet}
          onDisconnect={clearWalletState}
          onRefreshRole={refreshRole}
          onCopyAddress={copyToClipboard}
          onSwitchNetwork={switchToSepolia}
          walletError={walletError}
        />
        <TxStatusCard
          txStatus={txStatus}
          explorerBaseUrl={explorerBaseUrl}
          onCopyHash={copyToClipboard}
        />
      </div>

      <section className="card tabs-card">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <div className="tab-content">
          {activeTab === "consumer" && (
            <BatchVerifyCard
              verifyForm={verifyForm}
              onChange={setVerifyForm}
              onSubmit={handleVerify}
              verifyResult={verifyResult}
              verifyError={verifyError}
              explorerUrl={
                FULL_CONTRACT_ADDRESS
                  ? `${explorerBaseUrl}/address/${FULL_CONTRACT_ADDRESS}`
                  : ""
              }
              isReady={Boolean(readContract && FULL_CONTRACT_ADDRESS)}
            />
          )}

          {activeTab === "admin" && (
            <div className="form-stack">
              <FormCard
                title="Assign Role"
                description="Grant a role to an address for access control."
              >
                <form onSubmit={handleAssignRole} className="form-grid">
                  <label className="field">
                    <span>Actor address</span>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={assignRoleForm.actor}
                      onChange={(e) =>
                        setAssignRoleForm({
                          ...assignRoleForm,
                          actor: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select
                      value={assignRoleForm.role}
                      onChange={(e) =>
                        setAssignRoleForm({
                          ...assignRoleForm,
                          role: e.target.value,
                        })
                      }
                    >
                      <option value="2">Producer</option>
                      <option value="3">Halal Authority</option>
                      <option value="4">Distributor</option>
                      <option value="5">Retailer</option>
                    </select>
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Assign Role"}
                  </button>
                </form>
                {renderInlineStatus("assign-role")}
              </FormCard>
            </div>
          )}

          {activeTab === "producer" && (
            <div className="form-stack">
              <FormCard
                title="Create Batch"
                description="Register a new halal product batch on-chain."
              >
                <form onSubmit={handleCreateBatch} className="form-grid">
                  <label className="field">
                    <span>Batch ID</span>
                    <input
                      type="text"
                      placeholder="BATCH-001"
                      value={createBatchForm.batchId}
                      onChange={(e) =>
                        setCreateBatchForm({
                          ...createBatchForm,
                          batchId: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Product name</span>
                    <input
                      type="text"
                      placeholder="Organic chicken"
                      value={createBatchForm.productName}
                      onChange={(e) =>
                        setCreateBatchForm({
                          ...createBatchForm,
                          productName: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Create Batch"}
                  </button>
                </form>
                {renderInlineStatus("create-batch")}
              </FormCard>

              <FormCard
                title="Transfer Batch"
                description="Send the batch to the next actor in the chain."
              >
                <form onSubmit={handleTransferBatch} className="form-grid">
                  <label className="field">
                    <span>Batch ID</span>
                    <input
                      type="text"
                      placeholder="BATCH-001"
                      value={transferForm.batchId}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          batchId: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Recipient address</span>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={transferForm.to}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          to: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Transfer Batch"}
                  </button>
                </form>
                {renderInlineStatus("transfer-batch")}
              </FormCard>
            </div>
          )}

          {activeTab === "authority" && (
            <div className="form-stack">
              <FormCard
                title="Set Halal Certificate"
                description="Attach a halal certificate hash to the batch."
              >
                <form onSubmit={handleSetCert} className="form-grid">
                  <label className="field">
                    <span>Batch ID</span>
                    <input
                      type="text"
                      placeholder="BATCH-001"
                      value={certForm.batchId}
                      onChange={(e) =>
                        setCertForm({ ...certForm, batchId: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Certificate hash / IPFS CID</span>
                    <input
                      type="text"
                      placeholder="Qm..."
                      value={certForm.certHash}
                      onChange={(e) =>
                        setCertForm({ ...certForm, certHash: e.target.value })
                      }
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Set Certificate"}
                  </button>
                </form>
                {renderInlineStatus("set-cert")}
              </FormCard>

              <FormCard
                title="Transfer Batch"
                description="Send the batch to the distributor."
              >
                <form onSubmit={handleTransferBatch} className="form-grid">
                  <label className="field">
                    <span>Batch ID</span>
                    <input
                      type="text"
                      placeholder="BATCH-001"
                      value={transferForm.batchId}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          batchId: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Recipient address</span>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={transferForm.to}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          to: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Transfer Batch"}
                  </button>
                </form>
                {renderInlineStatus("transfer-batch")}
              </FormCard>
            </div>
          )}

          {activeTab === "distributor" && (
            <div className="form-stack">
              <FormCard
                title="Update Status"
                description="Update the batch status during distribution."
              >
                <form onSubmit={handleUpdateStatus} className="form-grid">
                  <label className="field">
                    <span>Batch ID</span>
                    <input
                      type="text"
                      placeholder="BATCH-001"
                      value={statusForm.batchId}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, batchId: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>New status</span>
                    <input
                      type="text"
                      placeholder="In transit"
                      value={statusForm.newStatus}
                      onChange={(e) =>
                        setStatusForm({
                          ...statusForm,
                          newStatus: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Update Status"}
                  </button>
                </form>
                {renderInlineStatus("update-status")}
              </FormCard>

              <FormCard
                title="Transfer Batch"
                description="Send the batch to the retailer."
              >
                <form onSubmit={handleTransferBatch} className="form-grid">
                  <label className="field">
                    <span>Batch ID</span>
                    <input
                      type="text"
                      placeholder="BATCH-001"
                      value={transferForm.batchId}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          batchId: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Recipient address</span>
                    <input
                      type="text"
                      placeholder="0x..."
                      value={transferForm.to}
                      onChange={(e) =>
                        setTransferForm({
                          ...transferForm,
                          to: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Transfer Batch"}
                  </button>
                </form>
                {renderInlineStatus("transfer-batch")}
              </FormCard>
            </div>
          )}

          {activeTab === "retailer" && (
            <div className="form-stack">
              <FormCard
                title="Update Status"
                description="Finalize the batch status before consumer purchase."
              >
                <form onSubmit={handleUpdateStatus} className="form-grid">
                  <label className="field">
                    <span>Batch ID</span>
                    <input
                      type="text"
                      placeholder="BATCH-001"
                      value={statusForm.batchId}
                      onChange={(e) =>
                        setStatusForm({ ...statusForm, batchId: e.target.value })
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>New status</span>
                    <input
                      type="text"
                      placeholder="Available for sale"
                      value={statusForm.newStatus}
                      onChange={(e) =>
                        setStatusForm({
                          ...statusForm,
                          newStatus: e.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={isBusy}>
                    {isBusy ? "Submitting..." : "Update Status"}
                  </button>
                </form>
                {renderInlineStatus("update-status")}
              </FormCard>
            </div>
          )}
        </div>
      </section>

      <ActivityLog items={activityLog} explorerBaseUrl={explorerBaseUrl} />
    </div>
  );
}

export default App;
