const { createApp } = require('./app');
const { getConfig } = require('./utils/config');
const { CapabilityService } = require('./services/capabilityService');
const { MpcServerService } = require('./services/mcpServerService');
const { SchedulerService } = require('./services/schedulerService');
const { McpCatalogService } = require('./services/mcpCatalogService');
const { DataRepairService } = require('./services/dataRepairService');
const { AnalyticsService } = require('./services/analyticsService');
const { AgentService } = require('./services/agentService');
const { MessageService } = require('./services/messageService');
const { AuditService } = require('./services/auditService');
const { createCapabilityStore } = require('./models/capabilityStore');
const { createExecutionLogStore } = require('./models/executionLogStore');
const { createMcpServerStore } = require('./models/mcpServerStore');
const { createQueryLogStore } = require('./models/queryLogStore');
const { createAgentStore } = require('./models/agentStore');
const { createMessageStore } = require('./models/messageStore');
const { createAuditLogStore } = require('./models/auditLogStore');

async function bootstrap() {
  const config = getConfig();
  const readinessState = { ready: false };

  const capabilityStore = await createCapabilityStore();
  const executionLogStore = await createExecutionLogStore();
  const mcpServerStore = await createMcpServerStore();
  const queryLogStore = await createQueryLogStore();
  const agentStore = await createAgentStore();
  const messageStore = await createMessageStore();
  const auditLogStore = await createAuditLogStore();

  const capabilityService = new CapabilityService({ capabilityStore, executionLogStore, queryLogStore, baseUrl: config.appBaseUrl });
  const mcpServerService = new MpcServerService({ mcpServerStore, capabilityStore, baseUrl: config.appBaseUrl });
  const schedulerService = new SchedulerService({ mcpServerService, syncIntervalMs: config.mcpSyncIntervalMs, healthIntervalMs: config.mcpHealthIntervalMs });
  const mcpCatalogService = new McpCatalogService({ mcpServerService, baseUrl: config.appBaseUrl });
  const dataRepairService = new DataRepairService({ capabilityStore });
  const analyticsService = new AnalyticsService({ capabilityStore, executionLogStore, mcpServerStore, queryLogStore });
  const agentService = new AgentService({ agentStore });
  const messageService = new MessageService({ agentStore, messageStore });
  const auditService = new AuditService({ auditLogStore });

  const app = createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, readinessState });
  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(config.port, () => resolve(instance));
    instance.on('error', reject);
  });

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
    await auditService.log('server_bootstrap', { port: config.port, baseUrl: config.appBaseUrl });
    schedulerService.start();
    readinessState.ready = true;
  } catch (error) {
    readinessState.ready = false;
    schedulerService.stop();
    server.close();
    throw error;
  }

  console.log(`Agent Network API listening on ${config.appBaseUrl}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
