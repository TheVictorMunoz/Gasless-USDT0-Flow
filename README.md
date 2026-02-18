
# **Gasless USD₮0 Demo**
This project demonstrates a gasless token-transfer flow on the Flare Network using a two-piece architecture:

1. **Front-end (React + Ethers.js)**

   * Presents a simple UI: a “recipient” field, an “amount” field, and a “Send Gasless” button.
   * Builds an [EIP-712](https://eips.ethereum.org/EIPS/eip-712) “transferWithAuthorization” payload off-chain (including timestamps, nonce, etc.).
   * Prompts the user’s wallet (e.g. MetaMask) for an EIP-712 signature of that payload—**no gas needed from the user at this step**.
   * Sends the signed payload to the relayer via a POST request.

2. **Relayer (Express + Ethers.js)**

   * Listens for `/relay-transfer` requests.
   * Verifies and submits the user’s signed “transferWithAuthorization” on-chain by calling the USD₮0 contract’s `transferWithAuthorization(...)` method, paying the FLR gas itself.
   * Returns the resulting on-chain transaction hash back to the front-end.

This setup lets end users move USD₮0 tokens without holding any FLR—they only sign a message, and the relayer covers the gas.

---

# Step by step guide:

Clone the repository:

```powershell
git clone https://github.com/vmmunoza/Gasless-USDT0-Flow.git
```
And make sure you comply with all relevant dependencies (Node.js, `npm`, and EOA with FLR tokens for the relayer).

## 1. Copy the example file

In your project root (where you see `.env.example`, `frontend/` and `relayer/`), open a PowerShell or terminal and run:

```powershell
copy .env.example .env
```

This creates `.env` with all the placeholders.

---

## 2. Fill in the relayer settings

Open **`.env`** in your editor. In the **back‑end** section, set:

```dotenv
# — Flare RPC & USD₮0 contract 
FLARE_RPC_URL=…        # e.g. https://rpc.flare.network   or http://127.0.0.1:8545 for local
USD0_ADDRESS=…         # the USD₮0 token contract you want to use

# — Relayer credentials
RELAYER_PRIVATE_KEY=…  # a private key of an account with FLR (or test FLR) on that network
PORT=3000              # (or your preferred port)
```

* Note 1: If you’re demoing locally, you can point `FLARE_RPC_URL` at your Hardhat node and use one of the “Account #” private keys printed by `npx hardhat node`. ( On Coston2/testnet, use an account you’ve topped up with test FLR.)
* Note 2: The current project setup has been implemented on mainnet.

---

## 3. Verify the front‑end wiring

Still in the same `.env`, confirm (or adjust) the **front‑end** vars:

```dotenv
VITE_FLARE_RPC_URL=${FLARE_RPC_URL}
VITE_USD0_ADDRESS=${USD0_ADDRESS}
VITE_RELAYER_URL=http://localhost:${PORT}
```

Vite will automatically expose any `VITE_…` keys to your React code via `import.meta.env`.

---

## 4. Install dependencies

Now pull in all the packages:

```bash
# In project root
npm install

# (Optional: if you prefer per‑folder installs)
cd relayer && npm install && cd ../frontend && npm install && cd ..
```

---

## 5. Launch the application

Open **two** terminals:

1. **Relayer**

   ```bash
   cd relayer
   npm run start
   ```

   You should see `Listening on http://localhost:3000`.

2. **Front‑end**

   ```bash
   cd frontend
   npm run dev
   ```

   Your browser should open the demo form.

---

Once both services are running, head to the React UI, fill in a recipient and amount, sign the MetaMask prompt, and watch the USD₮0 move—all without the user holding any FLR.

You can visit the complete documentation section at the [Flare Dev Hub](https://dev.flare.network/network/guides/gasless-usdt0-transfers)

---



### *NEW:* 
DeepWiki - https://deepwiki.com/vmmunoza/Gasless-USDT0-Flow 


---


Note: There's an additional branch for testing new UX improvements. If you'd like to contribute, it's a good branch to open a PR request.
