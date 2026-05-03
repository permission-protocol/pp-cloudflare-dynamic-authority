# Positioning Draft

## Working title

Cloudflare made dynamic durable compute easy. Now dynamic code needs external authority.

## Short post

Cloudflare's Dynamic Workers and Dynamic Workflows are a big deal for agent platforms.

They make a new architecture feel obvious: an agent writes tenant-specific workflow code, Cloudflare runs it in an isolated Dynamic Worker, the workflow persists across retries and sleeps, and the platform pays almost nothing while that tenant is idle.

That is the right compute primitive for AI-generated software.

But it creates a control-plane problem.

If every tenant, repo, or agent can bring its own workflow code, the platform needs to answer a separate question from "can this code run?"

It needs to answer: **who authorized this code to do the risky thing?**

Deploy a generated Worker. Touch a production binding. Call an external API. Access tenant storage. Resume after a human approval. Use a secret. Change billing state.

Those decisions should not live inside the generated workflow. The workflow is the thing being governed.

The pattern we are testing with Permission Protocol is simple:

```text
agent/tenant code runs in Cloudflare Dynamic Workflow
→ risky step pauses
→ Permission Protocol creates approval request
→ human signs
→ workflow resumes
→ immutable receipt is attached/logged
```

Cloudflare provides the dynamic durable runtime. Permission Protocol provides the external authority layer.

The important boundary is the capability binding. Generated code should not receive raw secrets or broad platform bindings. It should receive narrow RPC capabilities. Those capabilities either call Permission Protocol before execution or require a signed PP receipt before touching the world.

That gives platforms a clean split:

- Dynamic Workers answer where untrusted generated code runs.
- Dynamic Workflows answer how long-running generated plans survive.
- Permission Protocol answers what those plans are authorized to do.

This matters because agents are getting better at writing code than calling tools. As more platforms let agents produce durable workflows directly, approval and audit cannot be an afterthought bolted into the UI. They need to be a primitive at the execution boundary.

Dynamic execution needs external authority.

That's the layer Permission Protocol is built for.

## One-line version

Cloudflare made it cheap to run dynamic agent code durably; Permission Protocol makes it safe to authorize what that code can do.

## Devrel angle

This is not a competing runtime. It is a governance pattern for platforms already building on Workers:

- generated app platforms
- agent workflow builders
- CI/CD systems with per-repo pipelines
- low-code automation platforms
- internal developer platforms letting teams bring custom logic

## Demo CTA

We built a tiny reference scaffold showing a generated Cloudflare Dynamic Workflow that pauses before deploy, asks Permission Protocol for approval, resumes only after a human signs, and attaches the receipt to the deployment log.
