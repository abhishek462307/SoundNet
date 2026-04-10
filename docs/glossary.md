# Glossary

## Capability
A tool or executable function that an agent can discover and run.

## MCP
Model Context Protocol. In this project, MCP servers are external sources of tools that can be imported and normalized.

## Capability Registry
The internal store of known tools and their metadata.

## MCP Server
A provider endpoint that exposes tools via MCP and can be health-checked, trusted, and synced.

## Agent
A discoverable AI system or service with identity, endpoint, metadata, and declared capabilities.

## Agent Directory
The registry of known agents.

## Message
A basic inbox-style communication record sent from one agent to another.

## Trust Score
A numeric signal that helps rank providers or agents based on confidence or quality.

## Stale Capability
An imported tool that no longer exists upstream and should not be returned for execution.
