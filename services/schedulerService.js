class SchedulerService {
  constructor({ mcpServerService, syncIntervalMs = 0, healthIntervalMs = 0, logger = console }) {
    this.mcpServerService = mcpServerService;
    this.syncIntervalMs = Number(syncIntervalMs || 0);
    this.healthIntervalMs = Number(healthIntervalMs || 0);
    this.logger = logger;
    this.syncTimer = null;
    this.healthTimer = null;
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
  }

  getStatus() {
    return {
      health_interval_ms: this.healthIntervalMs,
      sync_interval_ms: this.syncIntervalMs,
      health_running: Boolean(this.healthTimer),
      sync_running: Boolean(this.syncTimer)
    };
  }
}

module.exports = { SchedulerService };
