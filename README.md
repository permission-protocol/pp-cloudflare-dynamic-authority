# Permission Protocol × Cloudflare Dynamic Workers

Smallest-credible demo showing Permission Protocol as the **external authority layer** for dynamically generated agent/tenant code running on Cloudflare Dynamic Workers / Dynamic Workflows.

Cloudflare made dynamic durable compute easy. Permission Protocol decides what that dynamic code is authorized to do.


## Quickstart

```bash
npm run demo          # approval → receipt → deploy logged
npm run demo:denied   # denied approval → workflow blocked, no deploy
```

## The thesis

Dynamic Workers and Dynamic Workflows make this pattern practical:

```text
agent/tenant code runs in Cloudflare Dynamic Workflow
→ risky step pauses
→ Permission Protocol creates approval request
→ human signs
→ workflow resumes
→ immutable receipt is attached/logged
```

That is powerful, but it creates a new governance problem: if an agent can generate durable workflow code at runtime, the approval boundary cannot live inside the generated code. It has to be external, inspectable, and receipt-backed.

## Primitive choice

**Best primitive for the demo: Dynamic Workflows built on Dynamic Workers.**

Why:

- **Dynamic Workers** are the sandbox/runtime primitive for tenant or agent-generated code.
- **Dynamic Workflows** are the right narrative primitive because they already model durable steps, `step.waitForEvent`, retries, hibernation, and human-in-the-loop approval.
- **Durable Object Facets** are useful later for tenant-owned persistent state, but they are not necessary for the smallest authority demo.

So the demo centers on **Dynamic Workflows** and uses Dynamic Workers underneath.

If beta access blocks real deployment, the repo still preserves the architecture with a local runnable mock plus Cloudflare-targeted scaffold.


## Authority flow

```mermaid
flowchart TD
  A[Agent or tenant generates workflow code] --> B[Cloudflare Worker Loader]
  B --> C[Dynamic Worker sandbox]
  C --> D[Dynamic Workflow run(event, step)]
  D --> E[Safe steps run directly]
  E --> F{Risky capability?}
  F -- yes --> G[Permission Protocol approval request]
  G --> H[Human signer reviews evidence]
  H --> I{Decision}
  I -- denied --> J[Workflow blocked; no deploy]
  I -- approved --> K[Signed authority receipt]
  K --> L[Workflow resumes]
  L --> M[Capability binding verifies receipt]
  M --> N[Deploy/action executes]
  N --> O[Receipt ID logged with action]
  F -- no --> P[Workflow continues]
```

## What is in this repo

- `src/local-demo.mjs` — runnable local proof of the authority flow. No external dependencies.
- `src/cloudflare-worker-loader.ts` — Cloudflare-targeted scaffold showing where PP bindings sit in the Worker Loader.
- `examples/tenant-workflow.ts` — tenant/agent workflow code that requests approval before deploy.
- `wrangler.example.jsonc` — illustrative Wrangler config.
- `docs/architecture.md` — system architecture and sequence.
- `docs/threat-model.md` — threat model for dynamic agent code.
- `docs/positioning-draft.md` — short post aimed at Cloudflare/devrel + agent platform builders.
- `targets/outreach-targets.md` — people/companies to send this to.

## Run the local demo

```bash
npm run demo
```

Expected result:

1. Tenant workflow runs a safe build step.
2. Workflow reaches a risky deploy capability.
3. Permission Protocol creates an approval request.
4. Mock human approval signs a receipt.
5. Deployment only executes with `receiptId` attached.
6. Audit trail prints workflow steps, approval request, receipt, and deployment log.

Denied path:

```bash
npm run demo:denied
```

Dependency sanity check:

```bash
npm run check
```

## Cloudflare integration shape

In a real Cloudflare deployment:

1. Platform Worker Loader receives tenant/agent request.
2. Loader fetches tenant workflow code from R2/Artifacts/Git.
3. Loader instantiates a Dynamic Worker with narrow RPC bindings:
   - `WORKFLOWS` via `wrapWorkflowBinding({ tenantId })`
   - `PP` authority binding
   - capability-specific bindings like `CLOUDFLARE.deploy`
4. Tenant code runs as a normal Cloudflare Workflow.
5. At risky steps, tenant code calls `PP.requireApproval(...)`.
6. Workflow pauses with `step.waitForEvent({ type: "pp-approval" })`.
7. Permission Protocol sends a signed approval event back to the workflow instance.
8. Capability binding refuses to execute unless a valid receipt is present.
9. Receipt ID is attached to deployment logs and audit trail.

## Why this sells PP

Cloudflare answers: **Where does dynamic code run durably?**

Permission Protocol answers: **Who authorized that dynamic code to do something risky?**

That distinction matters. The runtime can isolate code, but isolation is not authority. Once dynamic workflows can touch bindings, deploy code, call APIs, mutate storage, or resume after human input, platforms need a signer layer outside the agent.

## Demo boundary

This is not production-complete. It intentionally does not implement:

- full PP API authentication
- real Cloudflare account deployment
- receipt verification cryptography
- UI polish
- tenant billing/quota enforcement

It does implement the strategic proof:

> dynamic durable execution needs external authority, and PP is the signer/receipt layer.
