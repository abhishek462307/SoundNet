class McpCatalogService {
  constructor({ mcpServerService, baseUrl }) {
    this.mcpServerService = mcpServerService;
    this.baseUrl = baseUrl;
  }

  listCatalog() {
    return [
      {
        name: 'mock_public_mcp',
        description: 'Local mock MCP server for food ordering and weather lookup',
        endpoint: `${this.baseUrl}/mock-mcp`,
        transport: 'http',
        auth_type: 'none',
        trust_score: 0.9,
        tags: ['mock', 'public', 'mcp', 'trusted'],
        provider: 'orchids',
        category: 'general',
        official: false,
        seedable: true,
        requires_auth: false,
        deployment_mode: 'remote',
        repo_url: null,
        docs_url: null,
        install_command: null,
        notes: 'Built-in starter MCP for local development and demos.'
      },
      {
        name: 'github_official_mcp',
        description: "GitHub's official MCP Server for repositories, issues, pull requests, actions, and code workflows.",
        endpoint: 'https://api.githubcopilot.com/mcp/',
        transport: 'http',
        auth_type: 'oauth_or_pat',
        trust_score: 0.95,
        tags: ['github', 'official', 'remote', 'mcp', 'devtools'],
        provider: 'github',
        category: 'developer-tools',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'remote_or_local',
        repo_url: 'https://github.com/github/github-mcp-server',
        docs_url: 'https://github.com/github/github-mcp-server',
        install_command: 'docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server',
        notes: 'Remote MCP is available, but this system does not yet manage GitHub OAuth/PAT setup automatically.'
      },
      {
        name: 'perplexity_official_mcp',
        description: 'Official Perplexity MCP server for search, ask, research, and reasoning tools.',
        endpoint: 'http://localhost:8080/mcp',
        transport: 'http',
        auth_type: 'api_key',
        trust_score: 0.92,
        tags: ['perplexity', 'official', 'search', 'research', 'mcp'],
        provider: 'perplexity',
        category: 'search',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'local_or_self_hosted_http',
        repo_url: 'https://github.com/perplexityai/modelcontextprotocol',
        docs_url: 'https://docs.perplexity.ai/guides/mcp-server',
        install_command: 'npx -y @perplexity-ai/mcp-server',
        notes: 'Supports hosted HTTP mode, but requires a Perplexity API key and server deployment.'
      },
      {
        name: 'firecrawl_official_mcp',
        description: 'Official Firecrawl MCP server for web scraping, crawling, search, and extraction.',
        endpoint: null,
        transport: 'stdio_or_sse',
        auth_type: 'api_key',
        trust_score: 0.9,
        tags: ['firecrawl', 'official', 'scraping', 'search', 'mcp'],
        provider: 'firecrawl',
        category: 'web-data',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'local_or_self_hosted',
        repo_url: 'https://github.com/mendableai/firecrawl-mcp-server',
        docs_url: 'https://github.com/mendableai/firecrawl-mcp-server',
        install_command: 'env FIRECRAWL_API_KEY=<key> npx -y firecrawl-mcp',
        notes: 'Requires a Firecrawl API key or self-hosted Firecrawl backend.'
      },
      {
        name: 'browserstack_official_mcp',
        description: "BrowserStack's official MCP server for real browser and device testing workflows.",
        endpoint: null,
        transport: 'stdio',
        auth_type: 'api_key',
        trust_score: 0.88,
        tags: ['browserstack', 'official', 'testing', 'browsers', 'devices'],
        provider: 'browserstack',
        category: 'testing',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'local',
        repo_url: 'https://github.com/browserstack/mcp-server',
        docs_url: 'https://github.com/browserstack/mcp-server',
        install_command: 'npx browserstack-mcp-server',
        notes: 'Requires BrowserStack credentials and is typically configured in an MCP client.'
      },
      {
        name: 'smartbear_official_mcp',
        description: "SmartBear's official MCP server for BugSnag, Swagger, PactFlow, Zephyr, and related testing tools.",
        endpoint: null,
        transport: 'stdio',
        auth_type: 'api_key',
        trust_score: 0.88,
        tags: ['smartbear', 'official', 'testing', 'swagger', 'bugsnag'],
        provider: 'smartbear',
        category: 'testing',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'local',
        repo_url: 'https://github.com/SmartBear/smartbear-mcp',
        docs_url: 'https://developer.smartbear.com/smartbear-mcp/docs/mcp-server',
        install_command: 'npx -y @smartbear/mcp@latest',
        notes: 'Requires one or more SmartBear product tokens and local MCP client configuration.'
      },
      {
        name: 'aws_official_mcp_collection',
        description: 'AWS MCP server collection covering documentation, pricing, CDK, Terraform, databases, and managed remote options.',
        endpoint: null,
        transport: 'mixed',
        auth_type: 'aws_credentials',
        trust_score: 0.9,
        tags: ['aws', 'official', 'cloud', 'infrastructure', 'mcp'],
        provider: 'aws',
        category: 'cloud',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'local_or_remote',
        repo_url: 'https://github.com/awslabs/mcp',
        docs_url: 'https://github.com/awslabs/mcp',
        install_command: 'uv tool run awslabs.core-mcp-server',
        notes: 'Many AWS MCP servers require local credentials or AWS-managed remote services.'
      },
      {
        name: 'oracle_official_mcp_collection',
        description: 'Oracle MCP server suite for interacting with Oracle products and cloud services.',
        endpoint: null,
        transport: 'mixed',
        auth_type: 'oracle_credentials',
        trust_score: 0.86,
        tags: ['oracle', 'official', 'cloud', 'database', 'enterprise'],
        provider: 'oracle',
        category: 'cloud',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'local_or_remote',
        repo_url: 'https://github.com/oracle/mcp',
        docs_url: 'https://github.com/oracle/mcp',
        install_command: 'See per-server instructions in oracle/mcp',
        notes: 'Repository contains multiple Oracle-focused MCP servers rather than a single plug-and-play public endpoint.'
      },
      {
        name: 'brave_search_mcp',
        description: 'Brave Search MCP server for web, local, image, video, and news search through Brave Search.',
        endpoint: null,
        transport: 'stdio',
        auth_type: 'api_key',
        trust_score: 0.87,
        tags: ['brave', 'search', 'official-org', 'web', 'news'],
        provider: 'brave',
        category: 'search',
        official: true,
        seedable: false,
        requires_auth: true,
        deployment_mode: 'local',
        repo_url: 'https://github.com/brave/brave-search-mcp-server',
        docs_url: 'https://github.com/brave/brave-search-mcp-server',
        install_command: 'See brave/brave-search-mcp-server setup instructions',
        notes: 'Provided by the Brave org and generally requires Brave Search API access.'
      }
    ];
  }

  async seedCatalog() {
    const catalog = this.listCatalog();
    const existingServers = await this.mcpServerService.listServers();
    const results = [];

    for (const item of catalog) {
      if (item.seedable === false) {
        results.push({ name: item.name, created: false, skipped: true, reason: 'manual_setup_required' });
        continue;
      }

      const existing = existingServers.find((server) => server.endpoint === item.endpoint || server.name === item.name);
      if (existing) {
        results.push({ name: item.name, created: false, skipped: true, reason: 'already_exists', server_id: existing.id });
        continue;
      }

      try {
        const server = await this.mcpServerService.registerServer({
          ...item,
          is_public: true,
          is_trusted: true,
          allow_sync: true
        });
        await this.mcpServerService.syncServer(server.id);
        results.push({ name: item.name, created: true, server_id: server.id });
      } catch (error) {
        results.push({ name: item.name, created: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = { McpCatalogService };
