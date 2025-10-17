# Gigaverse Items Lookup

## Overview

This is a Next.js application that provides a lookup interface for Gigaverse game items based on wallet addresses. The application allows users to input one or more Ethereum addresses and retrieve information about game items (NFTs/tokens) associated with those addresses, including balances, metadata, images, and attributes. It supports both online API fetching and offline mode using local JSON data files.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15.5.6 with App Router and React 19
- **Reasoning**: Modern Next.js architecture with App Router provides server-side rendering capabilities, file-based routing, and integrated API routes
- **Client-Side State**: React hooks (useState, useMemo) for managing user input, loading states, and results
- **Styling**: Tailwind CSS v4 with custom theme configuration for responsive, utility-first styling
- **Font Optimization**: Next.js font optimization with Geist font family
- **Image Handling**: Next.js Image component with remote pattern configuration for Pinata IPFS gateway

**Component Structure**:
- Single-page application pattern with form input for addresses
- Dynamic rendering of item results with metadata display
- Support for multiple address inputs (comma, semicolon, newline, or space-separated)

### Backend Architecture

**API Layer**: Next.js API Routes (App Router)
- **Route Handler**: POST endpoint at `/api/items/route.ts`
- **Request Processing**: Accepts array of addresses and offline mode flag
- **Response Format**: JSON with structured data containing address-to-items mappings
- **Error Handling**: Standardized error responses with appropriate HTTP status codes

**Data Processing Logic** (`src/lib/gigaverse.ts`):
- **Dual-Mode Operation**: Supports both online API fetching and offline local data processing
- **Type Safety**: Comprehensive TypeScript types for API responses and data structures
- **Data Mapping**: Transforms raw blockchain/API data into structured item metadata including:
  - Item ID and name
  - Balance quantities
  - Image URLs (IPFS via Pinata)
  - Descriptions and attributes

**Data Models**:
- `RawEntity`: Blockchain entity with CID (Content Identifier) fields
- `GameItemsResponse`: API response for game items catalog
- `PlayerItemsResponse`: API response for player-specific items
- `MappedItem`: Processed item with metadata
- `AddressItems`: Address-to-items association

### Data Storage Solutions

**Local File System** (Offline Mode):
- JSON data files stored in `/data/log_example/` directory
- Static game item metadata and balance information
- File-based data reading using Node.js fs/promises API
- **Purpose**: Development, testing, and offline functionality without external API dependencies

**Remote APIs** (Online Mode):
- External Gigaverse API endpoints for real-time data
- Endpoints pattern: `gigaverse.io/api/*`
- **Data Types**:
  - Player energy and stats
  - Game item balances
  - Item metadata and attributes
  - Player inventory

### Authentication and Authorization

**Current Implementation**: None detected in the codebase
- Public API endpoints without authentication
- Client-side application without user authentication layer
- **Consideration**: Future implementation may require API keys or wallet-based authentication for production use

### External Dependencies

**Third-Party Services**:

1. **Pinata IPFS Gateway**
   - URL: `jade-decent-lizard-287.mypinata.cloud`
   - Purpose: Decentralized storage for game item images and metadata
   - Integration: Configured in Next.js image remote patterns

2. **Gigaverse API**
   - Base URL: `gigaverse.io/api/`
   - Endpoints:
     - `/offchain/player/energy/[address]` - Player energy data
     - `/indexer/player/gameitems/[address]` - Player game items
     - `/importexport/balances/[address]` - Player balances
     - `/metadata/gameItem/[id]` - Item metadata
   - Data Format: JSON with blockchain-indexed data using CID fields

**NPM Dependencies**:
- **Production**:
  - `next`: 15.5.6 (React framework)
  - `react`: 19.1.0 (UI library)
  - `react-dom`: 19.1.0 (React DOM rendering)
  
- **Development**:
  - `typescript`: Type safety and developer experience
  - `tailwindcss`: ^4 (Utility-first CSS framework)
  - `@tailwindcss/postcss`: ^4 (Tailwind PostCSS plugin)
  - `eslint`: Code quality and linting
  - `@types/*`: TypeScript type definitions

**Development Environment**:
- **Replit Integration**: Configured with `allowedDevOrigins` for Replit development URLs
- **Custom Port**: Runs on port 5000 with host binding to 0.0.0.0 for external access
- **Hot Reload**: Next.js development server with auto-update on file changes

## Recent Changes

### October 17, 2025 - Vercel to Replit Migration
Successfully migrated the project from Vercel to Replit environment:

1. **Port Configuration**: Updated package.json scripts to bind to port 5000 on host 0.0.0.0 for Replit compatibility
2. **Next.js Configuration**: Added image remote patterns for Pinata IPFS gateway and allowedDevOrigins for Replit cross-origin support
3. **Workflow Setup**: Configured development server workflow to run from gigaverse-app directory
4. **Deployment Configuration**: Set up autoscale deployment with proper build and start commands
5. **Dependencies**: Installed all npm dependencies (338 packages) with no vulnerabilities detected

The application is now fully operational on Replit with all features working correctly.