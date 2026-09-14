# **Instawards Statement of Work (SOW)** — Follow-on #1

30-Day Scoped Engagement · Stellar Testnet

## **1. Project & Team Information**


|                                        |                                                                    |
| -------------------------------------- | ------------------------------------------------------------------ |
| **Project Name:**                   | **ArcusX**                                                      |
| **Builder / Team Name:**            | **Bruno Miranda**                                               |
| **Primary Contact (Name + Email):** | **[brunoandres205@gmail.com](mailto:brunoandres205@gmail.com)** |
| **Ambassador Chapter:**             | **Chile**                                                       |
| **Ambassador Chapter Lead:**        | **Bastian Koh**                                                 |
| **Date Submitted:**                 | **September 12, 2026**                                          |
| **Suggested Sprint Start Date:**    | **TBD**                                                         |


## **2. Instawards Overview & Intent**

### **2.1 Instawards Purpose**

Continue building `@arcusx/sdk` by shipping the **initial foundation for agentic payments** on Stellar Testnet. SOW 2 delivered the production-ready TypeScript SDK and Testnet escrow lifecycle for developers. This follow-on extends that SDK so an integrator or agent runtime can create a job, fund USDC escrow, mark work complete, and release payout **without the marketplace UI** — through authenticated API routes, typed SDK methods, a runnable Node demo, and Testnet evidence.

### **2.2 Why This Matters**

Developers already have a stable SOW 2 integration layer for human-driven and partner flows. The next Stellar builder wave needs the same conditional USDC escrow primitive callable by **orchestrators and agents**. Extending `@arcusx/sdk` with an agentic payments base turns ArcusX from a marketplace product into a reusable machine-callable settlement layer on Stellar.

## **3. Problem Statement & Objective**

### **3.1 Problem Being Addressed**

**What specific problem, gap, or blocker is this Instaward intended to solve?**

ArcusX already has a working marketplace and a completed SOW 2 `@arcusx/sdk` on Stellar Testnet. The current gap is not the core SDK itself; the gap is that **agentic / machine-callable payments are not yet exposed** as a first-class SDK and API surface.

Without this work, an external agent or orchestrator still cannot reliably:

- create a job (work object) with an API key,
- obtain an escrow quote,
- prepare and confirm funding with signed XDR,
- mark completion,
- prepare and confirm USDC release,
- read aggregated status,

through `@arcusx/sdk` alone. The escrow primitive exists; the **agentic foundation on top of the SDK** does not.

### **3.2 Objective of This Instaward**

Within 30 days on Stellar Testnet, ArcusX will extend `@arcusx/sdk` with the **initial agentic payments foundation**: an authenticated job/escrow API MVP, typed SDK agentic helpers, a Node agent-simulation demo, and a Testnet validation/release package (quickstart, smoke/demo scripts, changelog, known limitations, and transaction evidence) proving create → fund → complete → release without the marketplace UI.

## **4. Scope of Work**

### **Deliverable 1 — Agentic Payments API MVP (Testnet)**

An authenticated REST surface (sandbox / partner API key) that supports the minimal agentic lifecycle on Testnet:

- create job (work object)
- escrow quote
- fund prepare + confirm (signed XDR)
- mark complete
- release prepare + confirm
- get aggregated job / escrow status

Implementation builds on the existing single-release USDC escrow path and SOW 2 `/v1` contracts (normalized JSON, typed errors, idempotency where already patterned).

**Why this matters**

This opens the machine-callable faucet: agents and orchestrators can drive conditional USDC escrow on Stellar without opening the ArcusX UI.

### **Deliverable 2 — `@arcusx/sdk` Agentic Module + Node Demo**

Extend `@arcusx/sdk` with typed agentic helpers mirroring Deliverable 1, plus a runnable Node demo script (agent simulation) that executes the full Testnet path using the SDK only. Include environment templates and expected outputs.

**Why this matters**

SOW 2 established `@arcusx/sdk` as the integrator entry point. Agentic payments must live in the same package so builders continue on one SDK instead of inventing a second client.

### **Deliverable 3 — Testnet Validation & Agentic Foundation Release Package**

A foundation release package including: agentic quickstart, endpoint / OpenAPI notes for the MVP surface, automated smoke or `demo:agentic` verification, SDK changelog entry for the agentic module, known limitations, and an end-to-end Testnet demo with transaction / contract evidence for funding and release.

**Why this matters**

The valuable part is proving USDC moves safely through a machine-callable path. Docs, smoke, and Testnet hashes make the foundation reviewable by the Ambassador Chapter Lead with minimal friction.

### **4.1 Out-of-Scope (Explicitly Not Included)**

**Mainnet launch**  
This SOW focuses on the agentic foundation and Stellar Testnet verification only. Mainnet readiness can be documented as future work, but production mainnet launch is not a deliverable.

**Full agentic platform (subjobs, multi-agent graphs, webhook platform at scale)**  
Only the initial foundation (API MVP + SDK module + demo) is in scope. Nested job/subjob settlement and broad orchestration remain a later track.

**Automatic release-without-explicit-rule / oracle product (`releaseOnCallback`)**  
This sprint uses explicit complete + release callable via API/SDK. Advanced completion oracles are future work.

**Reworking the SOW 2 core SDK**  
Marketplace, deals, evidence, and existing escrow modules from SOW 2 stay; this sprint **extends** the SDK for agentic payments.

**Python SDK or additional language SDKs**  
Only the TypeScript `@arcusx/sdk` package is in scope.

**Native Soroban escrow replacement**  
Existing single-release USDC escrow remains the settlement baseline for this sprint.

**Multi-milestone escrow**  
Single-release remains the stable baseline.

**Consumer marketing, paid ads, or brand campaigns**  
Not included.

**Large ArcusX marketplace UI redesign**  
UI work is limited to whatever is needed for internal verification; deliverables are API, SDK, demo, and evidence.

### **4.2 Deliverable-Aligned Budget Request**

**Requested Budget: $4,850 USD**

#### **Core Product Development (66%)**

The majority of the grant will be invested in the agentic payments API MVP, escrow prepare/confirm wiring for machine-callable flows, `@arcusx/sdk` agentic helpers, and the developer tooling required to deliver a verifiable Testnet foundation on top of the SOW 2 SDK.

#### **Product Design & User Experience (16%)**

Funding will support the developer experience of the agentic quickstart, Node demo, examples, and documentation so the machine-callable integration flow is clear, intuitive, and easy to adopt.

#### **Technology & Operational Infrastructure (18%)**

A portion of the budget will be allocated to the software, cloud services, development tools, and operational infrastructure required to efficiently develop, test, deploy, and maintain the platform throughout the grant period.

## **5. 30-Day Execution Plan & Timeline**

### **5.1 Weekly Breakdown**

#### **Week 1**

**Planned Work**  
Map the SOW 2 escrow and work surfaces to the agentic MVP contract: create job, quote, fund prepare/confirm, complete, release prepare/confirm, status.

Implement or harden authenticated API routes for that surface on Testnet.

Document request/response envelopes, sandbox API key behavior, and required environment variables.

Baseline smoke: valid/invalid auth + create job + status read.

**Expected Output**  
MVP endpoint list aligned with implementation.

API create + status working with sandbox/partner API key on Testnet.

Auth and error envelope behavior documented.

#### **Week 2**

**Planned Work**  
Complete fund prepare/confirm and release prepare/confirm on the API path.

Add `@arcusx/sdk` agentic module methods matching the API.

Start the Node agent-simulation demo using SDK calls only.

Apply idempotency headers where already used on `/v1`.

**Expected Output**  
API can reach funded and released states on Testnet with signed XDR confirmation.

SDK agentic helpers compile and call the MVP routes.

Demo script covers the happy-path skeleton.

#### **Week 3**

**Planned Work**  
Finish the Node demo end-to-end on Testnet (create → fund → complete → release).

Write agentic quickstart, endpoint/OpenAPI notes, and known limitations.

Expand smoke or dedicated `demo:agentic` / `smoke-agentic` verification.

Draft SDK changelog entry for the agentic foundation release.

**Expected Output**  
Demo runs the full machine-callable lifecycle on Stellar Testnet.

Docs and verification scripts ready for external reproduction.

SDK release candidate including the agentic module.

#### **Week 4**

**Planned Work**  
Run fresh-clone verification for demo, docs, and smoke with documented env vars and sandbox key.

Resolve issues discovered during Weeks 1–3.

Collect Testnet transaction hashes / Stellar Expert links for fund and release.

Assemble the final agentic foundation package: SDK version, changelog, quickstart, smoke/demo logs, and evidence.

**Expected Output**  
The `@arcusx/sdk` agentic foundation builds successfully and the documented demo/smoke path passes on Stellar Testnet.

Quickstart, changelog, known limitations, and end-to-end evidence are complete.

Evidence bundle ready for Ambassador review and SOW closeout.

## **6. Evidence of Completion**

### **6.1 Planned Evidence to Be Submitted**

#### **Deliverable 1 — Agentic Payments API MVP**

**Evidence Type**  
Repo + endpoint / OpenAPI notes + Testnet API evidence

**Description**  
Repository access to the authenticated MVP routes; endpoint list or OpenAPI excerpt; proof that job create, quote, fund, complete, release, and status work on Testnet without the marketplace UI.

#### **Deliverable 2 — `@arcusx/sdk` Agentic Module + Node Demo**

**Evidence Type**  
SDK package + runnable demo / examples

**Description**  
Versioned SDK exports for agentic helpers; Node demo and environment template executing the full Testnet lifecycle using `@arcusx/sdk` only.

#### **Deliverable 3 — Testnet Validation & Agentic Foundation Release Package**

**Evidence Type**  
Smoke/demo logs + docs + Testnet tx hashes + changelog

**Description**  
Passing demo/smoke output, agentic quickstart, changelog, known limitations, and Stellar Testnet transaction/contract evidence showing funding and payout release on the machine-callable path.

### **6.2 Evidence Verification Checklist**


| Deliverable   | Evidence Present | Evidence Partial | Evidence Missing | Comments |
| ------------- | ---------------- | ---------------- | ---------------- | -------- |
| Deliverable 1 | ☐                | ☐                | ☐                |          |
| Deliverable 2 | ☐                | ☐                | ☐                |          |
| Deliverable 3 | ☐                | ☐                | ☐                |          |


## **7. Next-Step Alignment**

### **7.1 Anticipated Next Step After Completion**

After this Instaward, the most likely next step is:

☐ Apply to SCF Build Award  
☐ Continue development independently  
☑ Apply for a follow-on Instaward (if eligible)  
☐ Seek other ecosystem support  
☐ Other: deepen agentic platform (subjobs / webhooks) and/or prepare SCF Build Award materials using this foundation

## **8. Instawards Constraints Acknowledgement**

By submitting this SOW, the Builder acknowledges:

☑ This scope will be completed within 30 days or less.  
☑ Instawards support execution, not open-ended exploration.  
☑ A project may receive no more than two follow-on Instawards.  
☑ Each Instaward is capped at $5,000.  
☑ Total Instawards funding may not exceed $15,000.

## **9. Submission Confirmation**

Once finalized, this Statement of Work will be submitted by the Ambassador Chapter Lead via the Instawards Airtable submission form for review and approval.

## **Contact**

Email: [brunoandres205@gmail.com](mailto:brunoandres205@gmail.com)  
X: [https://x.com/Brunixsoo](https://x.com/Brunixsoo)  
Telegram: @AwderS
