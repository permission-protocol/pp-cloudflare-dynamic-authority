# Architecture

## Core idea

The platform owns the Worker Loader. The tenant or agent owns the workflow code. Permission Protocol owns the authority decision.

```text
┌──────────────────────┐
│ Agent / Tenant       │
│ generates workflow   │
└──────────┬───────────┘
           │ code
           v
┌──────────────────────┐
│ Cloudflare Worker    │
│ Loader               │
│ - loads tenant code  │
│ - injects bindings   │
└──────────┬───────────┘
           │ Dynamic Worker
           v
┌──────────────────────┐
│ Dynamic Workflow     │
│ tenant run(event)    │
└──────────┬───────────┘
           │ risky capability call
           v
┌──────────────────────┐
│ Permission Protocol  │
│ approval request     │
└──────────┬───────────┘
           │ human signs
           v
┌──────────────────────┐
│ Workflow resumes     │
│ receipt attached     │
└──────────┬───────────┘
           │ capability executes
           v
┌──────────────────────┐
│ Cloudflare deploy /  │
│ binding / storage    │
└──────────────────────┘
```

## Sequence

1. Agent writes a workflow for a tenant.
2. Platform stores the generated workflow source.
3. Worker Loader receives request with `tenantId`.
4. Loader creates a Dynamic Worker for that tenant and injects only narrow RPC bindings.
5. Tenant workflow starts.
6. Safe steps run directly, for example build, summarize, validate.
7. Risky step calls `PP.requireApproval(action)`.
8. PP creates approval request with action, resource, actor, tenant, workflow ID, and evidence.
9. Workflow waits for `pp-approval` event.
10. Human signs approval in PP.
11. PP webhook sends event to workflow instance.
12. Workflow resumes with receipt payload.
13. Capability binding validates receipt presence/scope before executing.
14. Receipt ID is logged with deployment/action.

## Why PP should sit in the loader / binding layer

Do not trust tenant code to self-enforce.

Generated workflow code can ask for approval, but enforcement must happen in the capability binding that actually touches the world. The binding should require a valid receipt before it deploys, mutates storage, calls external APIs, accesses secrets, or resumes high-risk work.

The clean Cloudflare shape is:

- Dynamic Worker gets no raw secrets.
- Dynamic Worker gets no broad platform bindings.
- Dynamic Worker gets narrow RPC capabilities.
- RPC capability calls PP before action or requires a PP receipt.
- PP receipt becomes part of the audit trail.

## What gets signed

The approval request should include:

- actor: agent/user/service requesting action
- tenant/account
- workflow instance ID
- capability, e.g. `cloudflare.dynamic-worker.deploy`
- resource, e.g. `cloudflare://workers/tenant-acme/generated-app`
- evidence: build hash, source hash, diff summary, risk summary
- policy result: allowed, approval_required, denied
- signer identity and timestamp

## Cloudflare primitive mapping

- **Dynamic Workers**: runs generated tenant code in isolated sandbox.
- **Dynamic Workflows**: durable execution and pause/resume around approvals.
- **Worker RPC bindings**: narrow capability interfaces crossing sandbox boundary.
- **Durable Object Facets**: future extension for per-tenant persistent app state.
- **Artifacts / R2 / Git**: source storage for generated workflows.
