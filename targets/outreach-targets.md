# Outreach Targets

Use this after the demo is polished enough to share. Do not spray. Send 1:1 notes with the demo link and the specific governance angle.

## Cloudflare

### Product / engineering / devrel

- Kenton Varda — Workers / Durable Objects / Dynamic Workers. Angle: capability bindings + dynamic sandbox governance.
- Dan Lapid — Dynamic Workflows author. Angle: `step.waitForEvent` plus external receipt-backed approvals.
- Luís Duarte — Dynamic Workflows author. Angle: tenant-routed durable execution needs authority routing.
- Brendan Irvine-Broque — Cloudflare agents / developer platform. Angle: agents becoming Cloudflare customers need auditable permission boundaries.
- Sid Chatterjee — Cloudflare agents / account creation flow. Angle: agent-initiated account/domain/deploy actions need receipts.
- CloudflareDev / Workers DevRel — Angle: reference architecture for human-in-the-loop dynamic workflows.

## Agent platform builders

- OpenCode maintainers — agents write code; dynamic workflow authorization pattern.
- StackBlitz / Bolt.new — generated apps need deploy/action approval receipts.
- Replit Agent / Replit Deployments — agent-generated deployment authority.
- Vercel v0 / AI SDK team — generated app actions and deploy gates.
- Anysphere / Cursor — coding agents performing external actions.
- Sourcegraph / Amp — agentic coding workflows with approval/audit.
- GitHub Copilot Workspace / Actions teams — per-repo dynamic CI workflows and protected actions.

## CI/CD and internal developer platforms

- Depot — fast CI with tenant/repo-specific execution.
- Buildkite — pipeline as code with human approval gates.
- Harness — governance/control plane positioning.
- Temporal community / workflow platform builders — contrast: durable execution vs external authority.

## Security / governance buyers who may care later

- Aikido Security
- Socket
- Snyk
- Semgrep
- Wiz
- Chainguard

Use later. The first wave should be builders, not security buyers.

## First-message template

Subject/DM:

> Tiny demo: external approvals for Cloudflare Dynamic Workflows

Message:

> I’m the founder of Permission Protocol. Cloudflare’s Dynamic Workflows announcement clicked with something we’ve been building: if agents/tenants can generate durable workflow code, the approval boundary probably has to sit outside that code.
>
> I made a small scaffold showing: generated tenant workflow → risky deploy step pauses → PP approval request → human signs → workflow resumes with receipt attached.
>
> Not production-complete, more a reference pattern. Curious if this maps to how you’re thinking about Dynamic Workers / agent-generated workflows.
>
> [link]
