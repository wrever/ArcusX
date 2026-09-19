# **Instawards Statement of Work (SOW)**

30-Day Scoped Engagement

## **1. Project & Team Information**


|                                        |                                                                    |
| -------------------------------------- | ------------------------------------------------------------------ |
| ## **Project Name:**                   | ## **ArcusX**                                                      |
| ## **Builder / Team Name:**            | ## **Bruno Miranda**                                               |
| ## **Primary Contact (Name + Email):** | ## **[brunoandres205@gmail.com](mailto:brunoandres205@gmail.com)** |
| ## **Ambassador Chapter:**             | ## **Chile**                                                       |
| ## **Ambassador Chapter Lead:**        | ## **Bastian Koh**                                                 |
| ## **Date Submitted:**                 | ## **July 3, 2026**                                                |
| ## **Suggested Sprint Start Date:**    | ## **TBD**                                                         |


## **2. Instawards Overview & Intent**

### **2.1 Instawards Purpose**

Make it significantly easier for developers to integrate Stellar-powered work and USDC escrow flows into their applications through `@arcusx/sdk`. In 30 days, ArcusX will provide a typed, documented, and production-ready TypeScript integration layer that hides internal API complexity and lets developers create work, attach evidence, manage escrow actions, and track payouts on Stellar Testnet.

### **2.2 Why This Matters**

Developers should not need to understand ArcusX internal endpoints, Trustless Work implementation details, or raw Stellar transaction flows to add conditional USDC payments to their products. A complete SDK, predictable API behavior, practical examples, and a reference implementation will reduce integration time, prevent common errors, and make ArcusX infrastructure reusable across marketplaces, award programs, freelance platforms, and other applications built on Stellar.

## **3. Problem Statement & Objective**

### **3.1 Problem Being Addressed**

**What specific problem, gap, or blocker is this Instaward intended to solve?**

ArcusX already has a working marketplace flow on Stellar Testnet using Trustless Work USDC escrow. The current gap is not the core platform flow itself; the gap is that external developers still need knowledge of internal endpoints and payment implementation details to build on top of ArcusX. The TypeScript SDK, REST contract, examples, and documentation need to be completed and aligned so an external application can reliably create work objects, attach evidence, prepare escrow actions, track status, and execute a complete Testnet payout flow through a simple public interface.

The current SDK and API surface also need clearer module coverage, typed errors, idempotency behavior, sandbox API key handling, bounded Trustless Work indexer reads, and runnable examples. Without this work, ArcusX can function as a platform, but other developers cannot integrate its Stellar-powered work execution and settlement capabilities quickly or confidently.

### **3.2 Objective of This Instaward**

Within 30 days, ArcusX will deliver a production-ready TypeScript SDK and developer integration kit on Stellar Testnet. The `@arcusx/sdk` package will provide typed modules for public reads, marketplace/work objects, private offers, deals, escrow, evidence, ratings, and webhooks/callbacks, supported by practical documentation, runnable examples, and automated smoke verification.

The sprint will also produce an award-style reference implementation that demonstrates the complete developer journey from work creation and evidence submission to winner selection, escrow funding, and USDC payout release on Testnet. This scenario is only a technical reference implementation; it does not imply that SDF, Stellar Development Foundation, or Instawards are partners, customers, or associated products of ArcusX.

  
  
  


## **4. Scope of Work** 

## **Deliverable 1 — `@arcusx/sdk` Core TypeScript Package**

A versioned TypeScript SDK package exposing stable, typed modules for public reads, marketplace/work objects, private offers, deals, escrow, evidence, ratings, and webhook/callback helpers. The package will include a consistent client configuration, sandbox API key authentication, idempotency support, normalized JSON responses, and typed errors.

**Why this matters**

Developers receive one predictable interface instead of integrating multiple internal endpoints and handling provider-specific behavior themselves. This reduces integration time, prevents authentication and response-handling errors, and creates a stable foundation for applications built on ArcusX.

#### **Deliverable 2 — Developer Integration Kit and Award-Style Reference App**

A runnable developer integration kit composed of Node.js examples, environment templates, and a lightweight playground. It will include an award-style reference application built exclusively with `@arcusx/sdk`, covering work creation, submission/evidence, winner or assignee selection, escrow quote, payout-ready state, and funding/release status.

**Why this matters**

Developers gain working code they can copy, run, and adapt instead of learning only from an API reference. The reference application proves how the SDK components fit together in a realistic Stellar payment flow and shortens the path from installation to a functional integration.

#### **Deliverable 3 — Testnet Escrow Lifecycle and SDK Release Package**

A production-ready Testnet escrow lifecycle exposed through the SDK, covering quote, transaction preparation and confirmation, funding, status synchronization, evidence approval, and payout release. The release package will include bounded indexer reads, automated smoke scripts, a quickstart, API reference, changelog, known limitations, and an end-to-end demo.

**Why this matters**

The most valuable part of the integration is moving USDC safely and predictably. A complete, tested escrow lifecycle gives developers a reliable payment primitive while bounded network reads and automated verification reduce failures, rate-limit risks, and integration regressions.

  
  
  
  


### **4.1 Out-of-Scope (Explicitly Not Included)**

**Mainnet launch**  
This SOW focuses on SDK readiness and Stellar Testnet verification only. Mainnet readiness can be documented as a checklist, but production mainnet launch is not a deliverable.

**Agent-to-agent payments / job-subjob settlement**  
This is intentionally excluded because it is a larger future track and would exceed the 30-day scope.

**Python SDK or additional language SDKs**  
Only the TypeScript @arcusx/sdk package is in scope.

**Full standalone award product launch**  
The SDF award-style flow is a validation scenario for the SDK, not a customer-facing product, partnership, or associated SDF product.

**Native Soroban escrow replacement**  
Trustless Work single-release USDC escrow remains the settlement provider for this sprint.

**Multi-milestone escrow**  
Single-release escrow remains the stable baseline for SOW 2 verification.

**Large ArcusX marketplace UI redesign**  
The existing ArcusX platform flow already works independently from the SDK. UI work is limited to the SDK playground, examples, and the award-style reference application.

  
  
  
  
  
  
  
  
  
  


### **4.2 Deliverable-Aligned Budget Request**

## Requested Budget**: $4,250 USD**

### **Core Product Development (66%)**

### The majority of the grant will be invested in the TypeScript SDK, stable backend API surface, escrow lifecycle integration, typed interfaces, and the developer tooling required to deliver a production-ready integration package.

### **Product Design & User Experience (16%)**

Funding will support the developer experience of the SDK playground, reference application, examples, and documentation so the integration flow is clear, intuitive, and easy to adopt.

### **Technology & Operational Infrastructure (18%)**

A portion of the budget will be allocated to the software, cloud services, development tools, and operational infrastructure required to efficiently develop, test, deploy, and maintain the platform throughout the grant period.

### **5. 30-Day Execution Plan & Timeline**

### **5.1 Weekly Breakdown**

#### **Week 1**

**Planned Work**  
Inventory the current @arcusx/sdk package, modules, examples, and REST coverage.

Reconcile SDK README, docs, API reference, quickstart, and OpenAPI/REST notes with the actual implementation.

Define the exact SOW 2 SDK surface: public, marketplace/work objects, private offers, deals, escrow, evidence, ratings, and webhooks/callback helpers where stable.

Verify sandbox API key behavior on protected /v1 routes and invalid-key JSON errors.

Document environment variables, setup requirements, and expected response envelope/error behavior.

**Expected Output**  
The public SDK contract, authenticated client, typed errors, response envelopes, and module interfaces are implemented, tested, and ready to merge into the production SDK package.

`docs/sdk/README.md`, `docs/sdk/QUICKSTART.md`, `docs/sdk/API_REFERENCE.md`, and the package README accurately describe the implemented public interface.

The sandbox API key flow works end to end with valid and invalid credential handling.

#### **Week 2**

**Planned Work**  
Complete or refine SDK modules needed for the agreed SOW 2 surface.

Implement the SDF award-style validation scenario using SDK calls instead of raw fetch calls.

Map award/campaign, submission/evidence, winner selection, payout quote, and payout-ready state to SDK modules.

Ensure SDK-created records carry sandbox/integration attribution and idempotency metadata where applicable.

Add or update Node examples for the core SDK flow.

**Expected Output**  
The marketplace/work, private offers, deals, evidence, and escrow quote modules are functional and ready to merge into the production SDK package.

The award-style reference application runs through work creation, evidence submission, winner selection, and an escrow-ready payout state on Testnet using SDK calls only.

Node.js examples run with documented environment variables and produce the expected typed outputs.

  
  
  
  
  
  


#### **Week 3**

**Planned Work**  
Add SDK-guided Testnet escrow examples for quote, prepare/confirm funding or deployment where applicable, escrow status reads, and payout release status.

Ensure Trustless Work indexer reads are bounded and action-driven, avoiding render-loop or runaway polling behavior.

Build or update the lightweight SDK playground for the award-style flow.

Document webhook/callback verification story and provide HMAC/callback validation example where stable.

Expand smoke scripts to cover public reads, sandbox auth, award/work creation, evidence, escrow quote/status, and clear error responses.

**Expected Output**  
The SDK escrow lifecycle supports quote, transaction preparation, confirmation, funding, status synchronization, and payout release on Stellar Testnet.

Bounded indexer reads, webhook/callback verification, and error handling are implemented, tested, and ready to merge.

The SDK playground demonstrates the complete award/work, evidence, escrow, and payout-status flow.

  


#### **Week 4**

**Planned Work**  
Resolve issues discovered during Week 2 and Week 3 testing.

Run fresh-clone verification for SDK examples, playground, and smoke scripts with documented env vars and sandbox key.

Finalize quickstart, API reference, expected outputs, demo script or recording notes, endpoint/module status list, and known limitations.

Document mainnet readiness checklist as future work only: wallets, USDC trustlines, keys, fee config, smoke amount, rollback plan, and risks.

Assemble the final SDK release package, including examples, documentation, changelog, known limitations, smoke scripts, and the end-to-end demo.

**Expected Output**  
The `@arcusx/sdk` release candidate builds successfully and all documented examples and smoke scripts pass on Stellar Testnet.

The quickstart, API reference, changelog, examples, playground, known limitations, and end-to-end demo are complete and ready for release.

The completed SDK release package is functional, documented, and ready to merge into production.

  


## **6. Evidence of Completion** 

### **6.1 Planned Evidence to Be Submitted**

#### **Deliverable 1 — `@arcusx/sdk` Core TypeScript Package**

**Evidence Type**  
Repo + docs

**Description**  
Repository access to the versioned SDK package, exported modules, generated types, package build output, API reference, and passing SDK tests/smoke checks.

#### **Deliverable 2 — Developer Integration Kit and Award-Style Reference App**

**Evidence Type**  
Demo script / examples / playground

**Description**  
Runnable Node.js examples and playground showing the award-style reference flow: create a work object, attach evidence, select a winner or assignee, compute an escrow quote, and reach payout-ready state using `@arcusx/sdk`.

#### **Deliverable 3 — Testnet Escrow Lifecycle and SDK Release Package**

**Evidence Type**  
Smoke scripts + Testnet evidence + SDK release package + changelog

**Description**  
Testnet transaction hashes and escrow status evidence, passing smoke-script output, SDK documentation, changelog, and an end-to-end demo showing the complete escrow and payout lifecycle without excessive Trustless Work indexer polling.

  


### **6.2 Evidence Verification Checklist**


|               |                  |                  |                  |          |
| ------------- | ---------------- | ---------------- | ---------------- | -------- |
| Deliverable   | Evidence Present | Evidence Partial | Evidence Missing | Comments |
| Deliverable 1 | ☐                | ☐                | ☐                |          |
| Deliverable 2 | ☐                | ☐                | ☐                |          |
| Deliverable 3 | ☐                | ☐                | ☐                |          |


  


**7. Next-Step Alignment**

### **7.1 Anticipated Next Step After Completion**

After this Instaward, the most likely next step is:

☐ Apply to SCF Build Award  
☐ Continue development independently  
☑ Apply for a follow-on Instaward (if eligible)  
☐ Seek other ecosystem support  
☐ Other:

## **8. Instawards Constraints Acknowledgement**

By submitting this SOW, the Builder acknowledges:

☑ This scope will be completed within 30 days or less.  
☑ Instawards support execution, not open-ended exploration.  
☑ A project may receive no more than two follow-on Instawards.  
☑ Each Instaward is capped at $5,000.  
☑ Total Instawards funding may not exceed $15,000.

## **Contact**

Email: ++[brunoandres205@gmail.com](mailto:brunoandres205@gmail.com)++, 

++[https://x.com/Brunixsoo](https://x.com/Brunixsoo)++

Telegram: @AwderS