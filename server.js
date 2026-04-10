const { createApp } = require('./app');
const { getConfig } = require('./utils/config');
const { getRuntimeConfig } = require('./utils/runtimeConfig');
const { CapabilityService } = require('./services/capabilityService');
const { MpcServerService } = require('./services/mcpServerService');
const { SchedulerService } = require('./services/schedulerService');
const { McpCatalogService } = require('./services/mcpCatalogService');
const { DataRepairService } = require('./services/dataRepairService');
const { AnalyticsService } = require('./services/analyticsService');
const { AgentService } = require('./services/agentService');
const { MessageService } = require('./services/messageService');
const { AuditService } = require('./services/auditService');
const { UserService } = require('./services/userService');
const { TenantPolicyService } = require('./services/tenantPolicyService');
const { findAvailablePort } = require('./utils/port');
const { createCapabilityStore } = require('./models/capabilityStore');
const { createExecutionLogStore } = require('./models/executionLogStore');
const { createMcpServerStore } = require('./models/mcpServerStore');
const { createQueryLogStore } = require('./models/queryLogStore');
const { createAgentStore } = require('./models/agentStore');
const { createMessageStore } = require('./models/messageStore');
const { createAuditLogStore } = require('./models/auditLogStore');
const { createUserStore } = require('./models/userStore');
const { createTenantPolicyStore } = require('./models/tenantPolicyStore');

async function bootstrap() {
  const config = getConfig();
  const resolvedPort = await findAvailablePort(config.port);
  const runtimeConfig = await getRuntimeConfig(config);
  const resolvedBaseUrl = runtimeConfig.appBaseUrl || `http://127.0.0.1:${resolvedPort}`;
  const readinessState = { ready: false };

  const capabilityStore = await createCapabilityStore();
  const executionLogStore = await createExecutionLogStore();
  const mcpServerStore = await createMcpServerStore();
  const queryLogStore = await createQueryLogStore();
  const agentStore = await createAgentStore();
  const messageStore = await createMessageStore();
  const auditLogStore = await createAuditLogStore();
  const userStore = await createUserStore();
  const tenantPolicyStore = await createTenantPolicyStore();
  const tenantPolicyService = new TenantPolicyService({ tenantPolicyStore });

  const capabilityService = new CapabilityService({ capabilityStore, executionLogStore, queryLogStore, baseUrl: resolvedBaseUrl, tenantPolicyService });
  const mcpServerService = new MpcServerService({ mcpServerStore, capabilityStore, baseUrl: resolvedBaseUrl });
  const schedulerService = new SchedulerService({ mcpServerService, messageService: null, syncIntervalMs: config.mcpSyncIntervalMs, healthIntervalMs: config.mcpHealthIntervalMs, deliveryIntervalMs: config.messageDeliveryIntervalMs });
  const mcpCatalogService = new McpCatalogService({ mcpServerService, baseUrl: resolvedBaseUrl });
  const dataRepairService = new DataRepairService({ capabilityStore });
  const analyticsService = new AnalyticsService({ capabilityStore, executionLogStore, mcpServerStore, queryLogStore });
  const agentService = new AgentService({ agentStore });
  const messageService = new MessageService({ agentStore, messageStore, retryBaseDelayMs: config.messageRetryBaseDelayMs });
  schedulerService.messageService = messageService;
  const auditService = new AuditService({ auditLogStore });
  const userService = new UserService({ userStore });

  const app = createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, userService, tenantPolicyService, readinessState, runtimeConfig });
  const server = await new Promise((resolve, reject) => { const instance = app.listen(resolvedPort, ()=>resolve(instance)); instance.on('error', reject); });

  const shutdown = async (signal) => {
    try {
      readinessState.ready = false;
      schedulerService.stop();
      await auditService.log('server_shutdown', { signal });
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      process.exit(0);
    } catch (error) {
      console.error('Failed during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    await capabilityService.seedMockCapability();
    await mcpServerService.seedMockMcpServer();
    await dataRepairService.backfillCapabilities();
    await auditService.log('server_bootstrap', { port: resolvedPort, baseUrl: resolvedBaseUrl, requested_port: config.port });
    schedulerService.start();
    readinessState.ready = true;

    if (runtimeConfig.generatedSecrets) {
      console.warn('Sound Net generated runtime API secrets because production keys were not provided. Persisted to data/runtime-secrets.json. Set API_KEY and ADMIN_API_KEY in your host for stable operations.');
    }
  } catch (error) {
    readinessState.ready = false;
    schedulerService.stop();
    server.close();
    throw error;
  }

  console.log(`Sound Net API listening on ${resolvedBaseUrl}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
