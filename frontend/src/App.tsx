// frontend/src/App.tsx
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import USD0Abi from "./USD0.json";

const USD0_ADDRESS = import.meta.env.VITE_USD0_ADDRESS!;
const RELAYER_URL  = import.meta.env.VITE_RELAYER_URL!;

// Get Flare explorer URL based on chain ID
function getExplorerUrl(chainId: bigint, txHash: string): string {
  if (chainId === 14n) {
    return `https://flare-explorer.flare.network/tx/${txHash}`;
  } else if (chainId === 114n) {
    return `https://coston2-explorer.flare.network/tx/${txHash}`;
  }
  return `https://flare-explorer.flare.network/tx/${txHash}`;
}

export default function App() {
  const [to,     setTo]     = useState("");
  const [amount, setAmount] = useState("1");
  const [balance, setBalance] = useState<string | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [chainId, setChainId] = useState<bigint | null>(null);

  // Load balance when user address changes
  useEffect(() => {
    async function loadBalance() {
      if (!userAddress || !window.ethereum) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(USD0_ADDRESS, USD0Abi, provider);
        const bal = await contract.balanceOf(userAddress);
        // USD0 has 6 decimals
        setBalance(ethers.formatUnits(bal, 6));
      } catch (err) {
        console.error("Failed to load balance:", err);
      }
    }
    loadBalance();
  }, [userAddress]);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      setUserAddress(address);
      setChainId(network.chainId);
      setStatus("");
    } catch (err) {
      console.error("Failed to connect:", err);
      alert("Failed to connect wallet");
    }
  }

  async function sendGasless() {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    if (!to || !amount) {
      alert("Please enter recipient and amount");
      return;
    }

    setStatus("Connecting to wallet...");
    setTxHash(null);

    try {
      // — 1) Provider & signer —
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const from   = await signer.getAddress();
      const network = await provider.getNetwork();
      setUserAddress(from);
      setChainId(network.chainId);

      // — 2) Domain & types for EIP-712 —
      setStatus("Preparing authorization...");
      const chainId  = (await provider.getNetwork()).chainId;
      const contract = new ethers.Contract(USD0_ADDRESS, USD0Abi, signer);
      const domain   = {
        name:    await contract.name(),
        version: "1",
        chainId,
        verifyingContract: USD0_ADDRESS
      };
    const types = {
      TransferWithAuthorization: [
        { name: "from",        type: "address" },
        { name: "to",          type: "address" },
        { name: "value",       type: "uint256" },
        { name: "validAfter",  type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce",       type: "bytes32" }
      ]
    };

    // — 3) Build the payload message —
    const now         = Math.floor(Date.now() / 1000);
    const validAfter  = now;
    const validBefore = now + 3600;                   // good for 1 hour
    const nonce       = ethers.hexlify(ethers.randomBytes(32));
    const message = {
      from,
      to,
      // Serialize amount (in smallest units) to string so JSON.stringify works
      value: ethers.parseUnits(amount, 6).toString(),
      validAfter,
      validBefore,
      nonce
    };

      // — 4) Sign it with EIP-712 — (ethers v6)
      setStatus("Waiting for signature in MetaMask...");
      const rawSig = await signer.signTypedData(domain, types, message);
      const { v, r, s } = ethers.Signature.from(rawSig);



      // — 5) POST to your relayer —
      setStatus("Sending to relayer...");
      const resp = await fetch(`${RELAYER_URL}/relay-transfer`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ payload: message, v, r, s })
      });
      if (!resp.ok) {
        const err = await resp.json();
        console.error("Relayer error", err);
        setStatus(`❌ Error: ${err.error}`);
        alert("Relayer failed: " + err.error);
        return;
      }

      const { txHash: hash } = await resp.json();
      setTxHash(hash);
      setStatus("✅ Transaction submitted!");
      
      // Refresh balance after a short delay
      setTimeout(() => {
        if (userAddress) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(USD0_ADDRESS, USD0Abi, provider);
          contract.balanceOf(userAddress).then((bal: bigint) => {
            setBalance(ethers.formatUnits(bal, 6));
          });
        }
      }, 3000);
    } catch (err: any) {
      console.error("Error:", err);
      setStatus(`❌ Error: ${err.message || "Unknown error"}`);
      alert("Transaction failed: " + (err.message || "Unknown error"));
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Gasless USD₮0 Demo</h1>
      
      {!userAddress ? (
        <button 
          onClick={connectWallet}
          style={{ 
            width: "100%", 
            padding: "12px", 
            marginBottom: 16,
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px"
          }}
        >
          Connect Wallet
        </button>
      ) : (
        <>
          <div style={{ 
            padding: 12, 
            marginBottom: 16, 
            backgroundColor: "#f5f5f5", 
            borderRadius: "6px",
            fontSize: "14px"
          }}>
            <div><strong>Connected:</strong> {userAddress.slice(0, 6)}...{userAddress.slice(-4)}</div>
            {balance !== null && (
              <div style={{ marginTop: 8 }}>
                <strong>Balance:</strong> {balance} USD₮0
              </div>
            )}
          </div>

          <input
            placeholder="Recipient address (0x...)"
            value={to}
            onChange={e => setTo(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "10px",
              marginBottom: 8,
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
          <input
            placeholder="Amount (e.g. 0.5)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            type="number"
            step="0.000001"
            style={{ 
              width: "100%", 
              padding: "10px",
              marginBottom: 12,
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
          
          {status && (
            <div style={{ 
              padding: 12, 
              marginBottom: 12, 
              backgroundColor: status.includes("❌") ? "#ffebee" : "#e8f5e9",
              borderRadius: "6px",
              fontSize: "14px",
              color: status.includes("❌") ? "#c62828" : "#2e7d32"
            }}>
              {status}
            </div>
          )}

          {txHash && (
            <div style={{ 
              padding: 12, 
              marginBottom: 12, 
              backgroundColor: "#e3f2fd",
              borderRadius: "6px",
              fontSize: "14px"
            }}>
              <div style={{ marginBottom: 8 }}>
                <strong>Transaction Hash:</strong>
              </div>
              <div style={{ 
                fontFamily: "monospace", 
                fontSize: "12px", 
                wordBreak: "break-all",
                marginBottom: 8
              }}>
                {txHash}
              </div>
              <a 
                href={chainId ? getExplorerUrl(chainId, txHash) : "#"} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: "#1976d2",
                  textDecoration: "none",
                  fontSize: "12px"
                }}
              >
                View on Flare Explorer →
              </a>
            </div>
          )}

          <button 
            onClick={sendGasless}
            disabled={!!status && !status.includes("✅") && !status.includes("❌")}
            style={{ 
              width: "100%", 
              padding: "12px",
              backgroundColor: status && !status.includes("✅") && !status.includes("❌") ? "#ccc" : "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: status && !status.includes("✅") && !status.includes("❌") ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold"
            }}
          >
            {status && !status.includes("✅") && !status.includes("❌") ? status : "Send Gasless"}
          </button>
        </>
      )}

      <div style={{ 
        marginTop: 24, 
        padding: 16, 
        backgroundColor: "#fff3cd",
        borderRadius: "6px",
        fontSize: "12px",
        color: "#856404"
      }}>
        <strong>💡 How it works:</strong>
        <ol style={{ margin: "8px 0", paddingLeft: 20 }}>
          <li>You sign an EIP-712 message (no gas needed)</li>
          <li>Relayer submits transaction on-chain (pays FLR gas)</li>
          <li>USD₮0 tokens are transferred without you holding FLR!</li>
        </ol>
      </div>
    </div>
  );
}
