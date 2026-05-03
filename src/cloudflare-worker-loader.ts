/**
 * Cloudflare-targeted scaffold. This file is intentionally illustrative until
 * Dynamic Workers / Dynamic Workflows beta access and wrangler bindings are
 * available in the target account.
 */
import {
  createDynamicWorkflowEntrypoint,
  DynamicWorkflowBinding,
  wrapWorkflowBinding,
} from '@cloudflare/dynamic-workflows';
import { WorkerEntrypoint } from 'cloudflare:workers';

export { DynamicWorkflowBinding };

type TenantMetadata = { tenantId: string };

type ApprovalAction = {
  tenantId: string;
  workflowId: string;
  actor: string;
  capability: string;
  resource: string;
  reason: string;
  evidence: Record<string, unknown>;
};

export class PermissionProtocolBinding extends WorkerEntrypoint<Env, TenantMetadata> {
  async requireApproval(action: ApprovalAction) {
    // Real integration path:
    // 1. POST action + evidence to Permission Protocol.
    // 2. Return pending request metadata to the workflow.
    // 3. Workflow calls step.waitForEvent({ type: 'pp-approval' }).
    // 4. PP webhook calls instance.sendEvent({ type: 'pp-approval', payload: receipt }).
    // 5. Downstream capability binding requires receipt.id before executing.
    return this.env.PERMISSION_PROTOCOL.createApprovalRequest(action);
  }
}

export class CloudflareDeployBinding extends WorkerEntrypoint<Env, TenantMetadata> {
  async deploy(input: { artifact: string; receiptId: string }) {
    if (!input.receiptId) throw new Error('Missing Permission Protocol receipt');
    return this.env.CF_CONTROL_PLANE.deployDynamicWorker({
      tenantId: this.ctx.props.tenantId,
      artifact: input.artifact,
      receiptId: input.receiptId,
    });
  }
}

async function fetchTenantWorkflowCode(env: Env, tenantId: string): Promise<string> {
  const object = await env.TENANT_CODE.get(`${tenantId}/workflow.js`);
  if (!object) throw new Error(`No workflow code for tenant ${tenantId}`);
  return object.text();
}

function loadTenant(env: Env, ctx: ExecutionContext, tenantId: string) {
  return env.LOADER.get(tenantId, async () => ({
    compatibilityDate: '2026-05-01',
    mainModule: 'index.js',
    modules: { 'index.js': await fetchTenantWorkflowCode(env, tenantId) },
    env: {
      WORKFLOWS: wrapWorkflowBinding({ tenantId }),
      PP: ctx.exports.PermissionProtocolBinding({ props: { tenantId } }),
      CLOUDFLARE: ctx.exports.CloudflareDeployBinding({ props: { tenantId } }),
    },
    // Default deny outbound network from generated code. Expose capabilities via RPC bindings instead.
    globalOutbound: null,
  }));
}

export const DynamicTenantWorkflow = createDynamicWorkflowEntrypoint<Env>(
  async ({ env, ctx, metadata }) => {
    const { tenantId } = metadata as TenantMetadata;
    const stub = loadTenant(env, ctx, tenantId);
    return stub.getEntrypoint('TenantWorkflow');
  },
);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id') ?? url.searchParams.get('tenantId');
    if (!tenantId) return Response.json({ error: 'missing tenantId' }, { status: 400 });

    const stub = loadTenant(env, ctx, tenantId);
    return stub.getEntrypoint().fetch(request);
  },
};
