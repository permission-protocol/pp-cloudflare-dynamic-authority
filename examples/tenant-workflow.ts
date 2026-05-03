import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

type Params = {
  actor: string;
  resource: string;
  workflowId: string;
};

export class TenantWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const build = await step.do('build generated worker', async () => ({
      artifact: 'worker-bundle.js',
      diffSummary: '+ generated fetch handler, + outbound API call',
    }));

    const approval = await this.env.PP.requireApproval({
      tenantId: this.env.TENANT_ID,
      workflowId: event.payload.workflowId,
      actor: event.payload.actor,
      capability: 'cloudflare.dynamic-worker.deploy',
      resource: event.payload.resource,
      reason: 'AI-generated workflow wants to deploy tenant code',
      evidence: build,
    });

    const signed = await step.waitForEvent('wait for PP approval receipt', {
      type: 'pp-approval',
      timeout: '24 hours',
    });

    return step.do('deploy dynamic worker', async () =>
      this.env.CLOUDFLARE.deploy({ artifact: build.artifact, receiptId: signed.payload.receiptId }),
    );
  }
}
