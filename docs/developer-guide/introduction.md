# Developer Guide

Welcome to the ArcusX Developer Guide. This comprehensive guide will help you understand, integrate with, and extend the ArcusX platform.

## Overview

ArcusX is a decentralized freelancing platform built on Stellar blockchain technology. This guide provides technical documentation for developers who want to:

- Understand the platform architecture
- Integrate with ArcusX APIs
- Build applications on top of ArcusX
- Contribute to the platform development
- Extend platform functionality

## What You Can Build

With ArcusX, developers can:

- **Integrate Escrow Functionality**: Use our escrow system powered by Trustless Work smart contracts
- **Build Client Applications**: Create custom interfaces for task management
- **Develop Worker Tools**: Build applications to help workers manage tasks and earnings
- **Create Automation Tools**: Automate workflows using our REST API
- **Build Analytics Dashboards**: Access platform data for insights and reporting
- **Develop Mobile Applications**: Use our APIs to create mobile experiences

## Documentation Structure

This developer guide is organized into several sections:

### Getting Started

- **Setup and Installation**: Environment setup and configuration
- **Authentication**: How to authenticate API requests
- **First Integration**: Build your first integration step-by-step

### API Reference

- **REST API**: Complete endpoint documentation
- **Request/Response Formats**: Data structures and schemas
- **Error Handling**: Error codes and handling strategies
- **Rate Limits**: Understanding API limits

### Services and SDKs

- **Frontend Services**: TypeScript services for React applications
- **Escrow Service**: Trustless Work escrow operations
- **Authentication Service**: User authentication and session management
- **Admin Service**: Administrative operations

### Stellar Integration

- **Network Configuration**: Testnet vs Mainnet
- **Wallet Integration**: Connecting Stellar wallets
- **Transaction Handling**: Creating and signing transactions
- **Smart Contracts**: Working with Trustless Work escrows

### Architecture

- **System Architecture**: High-level system design
- **Database Schema**: Data models and relationships
- **Security Model**: Security practices and considerations
- **Performance Optimization**: Caching and optimization strategies

## Prerequisites

Before starting, you should have:

- Basic understanding of REST APIs
- Familiarity with JavaScript/TypeScript
- Knowledge of blockchain concepts (helpful but not required)
- Understanding of Stellar network basics
- Development environment set up (Node.js, PHP, MySQL)

## Quick Start

The fastest way to get started:

1. **Review Architecture**: Understand how ArcusX works
2. **Setup Environment**: Configure your development environment
3. **Get API Access**: Understand authentication requirements
4. **Build First Integration**: Follow the integration guide
5. **Explore APIs**: Review API reference documentation

## Key Concepts

### Escrow System

ArcusX uses Trustless Work smart contracts for escrow management. Funds are held in blockchain-based contracts that execute automatically based on predefined rules.

### Task Lifecycle

Tasks progress through stages: creation → proposals → selection → escrow creation → funding → work → completion → payment release.

### Authentication

ArcusX uses JWT tokens for API authentication. Users authenticate through email/password or OAuth providers (Google, GitHub).

### Blockchain Integration

All payments are processed through Stellar blockchain using USDC. Transactions are fast (3-5 seconds), transparent, and immutable.

## Development Workflow

1. **Local Setup**: Set up local development environment
2. **API Testing**: Use Testnet for testing without real funds
3. **Development**: Build and test integrations
4. **Testing**: Comprehensive testing before deployment
5. **Deployment**: Deploy to production environment

## Resources

- **API Base URL**: `https://arcusx.pro/api` (Production), `http://arcusx.pro/api` (Development)
- **Stellar Testnet**: `https://horizon-testnet.stellar.org`
- **Stellar Mainnet**: `https://horizon.stellar.org`
- **Trustless Work Docs**: https://docs.trustlesswork.com/
- **Stellar Docs**: https://developers.stellar.org/

## Support

For developer support:

- Review documentation thoroughly
- Check FAQ section for common questions
- Review code examples in documentation
- Contact support through official channels

## Next Steps

- Read the [Architecture Overview](architecture/system-overview.md) to understand the system
- Follow the [API Integration Guide](developer-guide/api-integration.md) to build your first integration
- Review the [API Reference](../api-reference/overview.md) for detailed endpoint documentation

Let's build something great with ArcusX!

