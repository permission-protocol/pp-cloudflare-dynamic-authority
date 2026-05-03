#!/usr/bin/env node
import crypto from 'node:crypto';

const deny = process.argv.includes('--deny');
const checkOnly = process.argv.includes('--check');

const tenantWorkflowCode = `
export class TenantDeployWorkflow {
  async run(event, step, env) {
    const build = await step.do('build generated worker', async () => ({
      artifact: 'worker-bundle.js',
      sha256: '${crypto.createHash('sha256').update('agent-generated-worker-v1').digest('hex')}'
    }));

    const approval = await env.PP.requireApproval({
      tenantId: event.tenantId,
      workflowId: event.workflowId,
      actor: event.actor,
      capability: 'cloudflare.dynamic-worker.deploy',
      resource: event.resource,
      reason: 'AI-generated tenant workflow wants to deploy dynamic Worker code',
      evidence: { build, diffSummary: '+ generated fetch handler, + outbound API call' }
    });

    if (approval.decision !== 'approved') {
      return { status: 'blocked', approvalRequestId: approval.requestId };
    }

    const deploy = await step.do('deploy dynamic worker', async () => env.CLOUDFLARE.deploy({
      tenantId: event.tenantId,
      artifact: build.artifact,
      receiptId: approval.receipt.id
    }));

    return { status: 'deployed', deploy, receipt: approval.receipt };
  }
}
`;

class MockDynamicWorkflowRuntime {
  constructor({ pp, cloudflare }) {
    this.env = { PP: pp, CLOUDFLARE: cloudflare };
    this.logs = [];
  }

  async runTenantWorkflow({ tenantId, workflowId, actor, resource }) {
    const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(tenantWorkflowCode).toString('base64');
    const mod = await import(moduleUrl);
    const Workflow = mod.TenantDeployWorkflow;
    const workflow = new Workflow();
    const step = {
      do: async (name, fn) => {
        this.logs.push({ type: 'workflow.step.start', name });
        const output = await fn();
        this.logs.push({ type: 'workflow.step.complete', name, output });
        return output;
      }
    };

    return workflow.run({ tenantId, workflowId, actor, resource }, step, this.env);
  }
}

class MockPermissionProtocol {
  constructor({ deny = false } = {}) {
    this.deny = deny;
    this.requests = [];
    this.receipts = [];
  }

  async requireApproval(action) {
    const requestId = 'apr_' + crypto.randomUUID().slice(0, 8);
    const canonical = JSON.stringify(action, Object.keys(action).sort());
    const request = {
      id: requestId,
      status: 'pending',
      action,
      reviewUrl: `https://app.permissionprotocol.com/approve/${requestId}`,
      createdAt: new Date().toISOString(),
      actionHash: crypto.createHash('sha256').update(canonical).digest('hex')
    };
    this.requests.push(request);

    console.log('\nPP approval request created');
    console.log(JSON.stringify({ requestId, reviewUrl: request.reviewUrl, capability: action.capability, resource: action.resource }, null, 2));

    const decision = this.deny ? 'denied' : 'approved';
    if (decision !== 'approved') return { decision, requestId };

    const receipt = {
      id: 'rcpt_' + crypto.randomUUID().replaceAll('-', '').slice(0, 16),
      requestId,
      decision,
      signer: 'human:demo-operator',
      signedAt: new Date().toISOString(),
      actionHash: request.actionHash,
      subject: {
        actor: action.actor,
        tenantId: action.tenantId,
        workflowId: action.workflowId,
        capability: action.capability,
        resource: action.resource
      }
    };
    this.receipts.push(receipt);
    return { decision, requestId, receipt };
  }
}

class MockCloudflareControlPlane {
  constructor() {
    this.deployments = [];
  }

  async deploy({ tenantId, artifact, receiptId }) {
    if (!receiptId) throw new Error('deploy refused: missing PP receipt');
    const deployment = {
      id: 'cf_deploy_' + crypto.randomUUID().slice(0, 8),
      tenantId,
      artifact,
      receiptId,
      loggedAt: new Date().toISOString()
    };
    this.deployments.push(deployment);
    return deployment;
  }
}

async function main() {
  if (checkOnly) {
    console.log('ok: local demo has no external dependencies');
    return;
  }

  console.log('Permission Protocol × Cloudflare Dynamic Workflow demo');
  console.log('Flow: dynamic tenant code → risky step → PP approval → workflow resumes → receipt logged');

  const pp = new MockPermissionProtocol({ deny });
  const cloudflare = new MockCloudflareControlPlane();
  const runtime = new MockDynamicWorkflowRuntime({ pp, cloudflare });

  const result = await runtime.runTenantWorkflow({
    tenantId: 'tenant_acme_ai',
    workflowId: 'wf_dynamic_deploy_001',
    actor: 'agent:tenant-builder-bot',
    resource: 'cloudflare://workers/tenant-acme/generated-app'
  });

  console.log('\nWorkflow result');
  console.log(JSON.stringify(result, null, 2));

  console.log('\nAudit trail');
  console.log(JSON.stringify({ workflowLogs: runtime.logs, approvalRequests: pp.requests, receipts: pp.receipts, deployments: cloudflare.deployments }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
