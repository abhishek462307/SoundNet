class SchedulerService {
  constructor({ mcpServerService, messageService, syncIntervalMs = 0, healthIntervalMs = 0, deliveryIntervalMs = 0, logger = console }) {
    this.mcpServerService = mcpServerService;
    this.messageService = messageService;
    this.syncIntervalMs = Number(syncIntervalMs || 0);
    this.healthIntervalMs = Number(healthIntervalMs || 0);
    this.deliveryIntervalMs = Number(deliveryIntervalMs || 0);
    this.logger = logger;
    this.syncTimer = null;
    this.healthTimer = null;
    this.deliveryTimer = null;
    this.lastDeliveryRunAt = null;
    this.lastDeliveryProcessedCount = 0;
  }

  start() {
    if (this.healthIntervalMs > 0) {
      this.healthTimer = setInterval(async () => {
        try {
          await this.mcpServerService.checkAllServerHealth();
        } catch (error) {
          this.logger.error('Scheduled MCP health check failed', error.message);
        }
      }, this.healthIntervalMs);
    }

    if (this.syncIntervalMs > 0) {
      this.syncTimer = setInterval(async () => {
        try {
          await this.mcpServerService.syncAllServers();
        } catch (error) {
          this.logger.error('Scheduled MCP sync failed', error.message);
        }
      }, this.syncIntervalMs);
    }

    if (this.deliveryIntervalMs > 0 && this.messageService) {
      this.deliveryTimer = setInterval(async () => {
        try {
          const processed = await this.messageService.processDeliveryQueue();
          this.lastDeliveryRunAt = new Date().toISOString();
          this.lastDeliveryProcessedCount = processed.length;
        } catch (error) {
          this.logger.error('Scheduled message delivery failed', error.message);
        }
      }, this.deliveryIntervalMs);
    }
  }

  stop() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.deliveryTimer) {
      clearInterval(this.deliveryTimer);
      this.deliveryTimer = null;
    }
  }

  getStatus() {
    return {
      health_interval_ms: this.healthIntervalMs,
      sync_interval_ms: this.syncIntervalMs,
      delivery_interval_ms: this.deliveryIntervalMs,
      health_running: Boolean(this.healthTimer),
      sync_running: Boolean(this.syncTimer),
      delivery_running: Boolean(this.deliveryTimer),
      last_delivery_run_at: this.lastDeliveryRunAt,
      last_delivery_processed_count: this.lastDeliveryProcessedCount
    };
  }
}

module.exports = { SchedulerService };
