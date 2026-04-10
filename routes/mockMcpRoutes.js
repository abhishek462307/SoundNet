const express = require('express');

const router = express.Router();

router.post('/', (req, res) => {
  const method = req.body?.method;
  const requestId = req.body?.id ?? null;

  if (method === 'initialize') {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      result: {
        protocolVersion: '2025-03-26',
        serverInfo: { name: 'mock-public-mcp', version: '1.0.0' },
        capabilities: { tools: {} }
      }
    });
  }

  if (method === 'tools/list') {
    return res.json({
      jsonrpc: '2.0',
      id: requestId,
      result: {
        tools: [
          {
            name: 'public_food_order',
            description: 'Order food via a public MCP server mock',
            inputSchema: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                quantity: { type: 'number' }
              }
            }
          },
          {
            name: 'public_weather_lookup',
            description: 'Get a mock weather report by city',
            inputSchema: {
              type: 'object',
              properties: {
                city: { type: 'string' }
              }
            }
          }
        ]
      }
    });
  }

  if (method === 'tools/call') {
    const toolName = req.body?.params?.name;
    const args = req.body?.params?.arguments || {};

    if (toolName === 'public_food_order') {
      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: toolName,
                status: 'confirmed',
                order: {
                  item: args.item || 'pizza',
                  quantity: Number(args.quantity || 1)
                }
              })
            }
          ]
        }
      });
    }

    if (toolName === 'public_weather_lookup') {
      return res.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                tool: toolName,
                city: args.city || 'San Francisco',
                forecast: 'sunny',
                temperature_c: 24
              })
            }
          ]
        }
      });
    }

    return res.status(404).json({
      jsonrpc: '2.0',
      id: requestId,
      error: { code: -32601, message: 'Tool not found' }
    });
  }

  return res.status(400).json({
    jsonrpc: '2.0',
    id: requestId,
    error: { code: -32601, message: 'Method not found' }
  });
});

module.exports = router;
