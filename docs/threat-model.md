# Threat Model

## Context

Cloudflare Dynamic Workers and Dynamic Workflows make it practical for platforms to run tenant-specific or agent-generated code on demand, durably, with near-zero idle cost.

That changes the security boundary. The dangerous unit is no longer just a deployed app. It is a generated workflow step that may be written minutes ago by an agent, persisted for days, and resumed after external events.

## Assets

- Cloudflare account, Workers, Workflows, Durable Objects, R2, queues, AI bindings
- tenant data and tenant-specific state
- platform secrets and API tokens
- deployment authority
- workflow event/resume authority
- audit trail and receipts

## Trust boundaries

1. **Tenant/agent code is untrusted.** It may be generated, buggy, malicious, or prompt-injected.
2. **Worker Loader is trusted platform code.** It chooses what bindings tenant code receives.
3. **Permission Protocol is external authority.** It decides whether risky actions require approval or are denied.
4. **Capability bindings are enforcement points.** They must not execute risky actions without PP receipt checks.

## Threats

### 1. Self-approval by generated code

Generated code could try to approve its own risky step or fabricate an approval event.

Mitigation:
- PP approval events must be signed/server-originated.
- Capability bindings verify receipt scope before executing.
- Workflow metadata is routing context, not authorization.

### 2. Binding overreach

Dynamic Worker receives a broad binding, secret, or raw Cloudflare API token and bypasses PP.

Mitigation:
- Give generated code only narrow RPC capabilities.
- No raw secrets in dynamic env.
- Default-deny outbound network where possible.
- Wrap standard bindings with scoped RPC facades.

### 3. Resume-event spoofing

Attacker sends `pp-approval` event to workflow instance.

Mitigation:
- Treat wait event payload as untrusted until verified.
- Require receipt signature or server-side lookup from PP.
- Scope receipt to workflow ID, action hash, capability, resource, and tenant.

### 4. Time-of-check / time-of-use drift

Human approves one artifact, but workflow deploys another.

Mitigation:
- Include build/source hash in approval request.
- Capability binding recomputes or receives artifact hash and checks against receipt.
- Receipt binds action hash to artifact.

### 5. Tenant breakout through network

Generated code calls external systems directly instead of using platform bindings.

Mitigation:
- Disable or intercept global outbound network for high-risk generated workflows.
- Provide explicit capability bindings for approved integrations.
- Log egress decisions as PP-governed actions when sensitive.

### 6. Durable malicious workflow

A workflow sleeps, waits, retries, and resumes later after code/policy context changed.

Mitigation:
- Re-check policy at every risky step, not only at workflow creation.
- Include policy version in receipts.
- Expire approvals or constrain receipts to one action.

## Non-goals for this demo

- Formal verification of tenant code
- Complete Cloudflare account hardening
- Full receipt cryptography implementation
- Tenant billing/quota enforcement

## Security claim

Cloudflare isolates where generated code runs. Permission Protocol governs what that code is authorized to do.

The correct security architecture needs both.
