# Architecture as Code Studio

A comprehensive web-based platform for visualizing and analyzing enterprise architecture models. This Angular 20 application serves as the central interactive working environment for architecture modeling, real-time diagram generation, and seamless navigation between different architectural views.

## 🏗️ Project Overview

The Architecture as Code Studio is designed to bridge the gap between architectural modeling and visualization, providing a modern web interface that connects to architecture engines and transforms complex data into comprehensible C4 diagrams.

### Key Features

- **🔄 Real-time Architecture Visualization**: Live generation and rendering of C4 diagrams from architecture models
- **🖼️ Visual Diagram Rendering**: Integration with PlantUML server and Structurizr for actual diagram visualization
- **🕸️ Interactive Graph Views**: Advanced network visualization with vis-network for exploring relationships
- **🏗️ Structurizr UI Integration**: Complete Structurizr DSL workspace generation and export
- **🔗 Comprehensive Relationship Modeling**: Support for all ArchiMate relationship types (FLOW, SERVING, ACCESS, etc.)
- **🎯 Multi-Layer Navigation**: Seamless transitions between Business, Application, and Technology layer views  
- **📊 Interactive Analysis**: Comprehensive architecture analysis with detailed statistics
- **🔌 API Integration**: Full integration with Architecture as Code Engine via OpenAPI-generated client
- **🎨 Modern UI**: Built with PrimeNG Aura theme for professional user experience
- **📁 Export Capabilities**: Download diagrams as SVG, PNG, graph images, and export Structurizr DSL workspaces
- **📈 Extensible Design**: Ready for future diagram types (BPMN, Mermaid, PlantUML, etc.)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- Docker or Podman (for PlantUML server)
- Architecture as Code Engine running on `http://localhost:8080`

### Installation & Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up PlantUML server for diagram rendering**:
   ```bash
   npm run setup-plantuml
   ```

3. **Update API specifications** (if backend changes):
   ```bash
   npm run update-api
   ```

4. **Start development server**:
   ```bash
   npm start
   ```

5. **Access the application**:
   Open your browser and navigate to `http://localhost:4200/`

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start development server on port 4200 |
| `npm run build` | Build for production |
| `npm run watch` | Build in watch mode |
| `npm test` | Run unit tests |
| `npm run setup-plantuml` | Set up PlantUML server for diagram rendering |
| `npm run generate-api` | Generate TypeScript client from OpenAPI spec |
| `npm run update-api` | Fetch latest API spec and regenerate client |

## 🏛️ Architecture Overview

### Core Components

- **ArchitectureDashboardComponent**: Main interface for architecture analysis and visualization
- **DiagramViewerComponent**: Advanced component for rendering PlantUML and Structurizr diagrams
- **ArchitectureService**: Service layer for API communication with comprehensive error handling
- **DiagramRenderingService**: Service for PlantUML rendering and Structurizr workspace creation
- **StructurizrMappingService**: Transforms architecture data into C4 model elements

### Data Flow

1. **API Integration**: Connects to Architecture Engine REST API
2. **Data Transformation**: Maps business actors → people, applications → systems, components → containers
3. **PlantUML Generation**: Generates PlantUML C4 code from architecture data
4. **Diagram Rendering**: Renders visual diagrams using PlantUML server or fallback methods
5. **Structurizr Integration**: Creates Structurizr DSL workspaces for advanced modeling
6. **Export & Analysis**: Provides download capabilities and detailed architecture statistics

## 🎨 Technology Stack

- **Frontend**: Angular 20 with standalone components and signals
- **UI Framework**: PrimeNG Aura theme + PrimeFlex for professional components and layouts
- **API Client**: Auto-generated TypeScript client from OpenAPI specification
- **Diagram Rendering**: PlantUML server integration with multiple fallback strategies
- **Visualization**: C4 PlantUML diagram generation and Structurizr DSL export
- **Interactive Graphs**: vis-network for dynamic network visualization with relationship exploration
- **Structurizr Integration**: structurizr-typescript for workspace generation and DSL export
- **Architecture Mapping**: Custom service for transforming architecture data to C4 model elements with relationship support

## 🔌 Backend Integration

### API Endpoints

The application integrates with the following Architecture Engine endpoints:

- `GET /api/v1/architectures` - List all architectures
- `GET /api/v1/architectures/{id}` - Get specific architecture
- `GET /api/v1/architectures/{id}/business` - Business layer data
- `GET /api/v1/architectures/{id}/application` - Application layer data  
- `GET /api/v1/architectures/{id}/technology` - Technology layer data
- `POST /api/v1/architectures/{id}/validate` - Validate architecture
- `POST /api/v1/architectures/reload` - Reload models from files

### Data Mapping

| Architecture Element | C4 Model Element | Description |
|---------------------|------------------|-------------|
| Business Actor | Person | External or internal users of the system |
| Application | Software System | High-level software systems |
| Application Component | Container | Deployable/executable units |
| Technology Node | Infrastructure | Supporting technology infrastructure |

## 🖼️ Diagram Rendering

### PlantUML Integration

The application integrates with PlantUML servers to render visual diagrams:

1. **Local Server**: `http://localhost:8081` (recommended)
2. **Public Servers**: Fallback to official PlantUML servers
3. **Graceful Degradation**: Shows PlantUML source code if rendering fails

### Supported Formats

- **SVG**: Vector graphics for high-quality scaling
- **PNG**: Raster images for embedding and sharing
- **Structurizr DSL**: Export for advanced modeling tools

### Setup PlantUML Server

```bash
# Easy setup using our script
npm run setup-plantuml

# Manual setup with Docker
docker run -d -p 8081:8080 plantuml/plantuml-server:jetty

# Manual setup with Podman
podman run -d -p 8081:8080 docker.io/plantuml/plantuml-server:jetty
```

### Diagram Features

- **5 Visualization Modes**: 
  - **Rendered Diagram**: High-quality PlantUML C4 diagrams with relationships
  - **Structurizr DSL**: Complete workspace definition for Structurizr.com
  - **PlantUML Source**: Raw PlantUML code with C4 syntax
  - **Graph View**: Interactive network visualization with clickable nodes and relationship exploration
  - **Structurizr UI**: Workspace preview with statistics and direct Structurizr.com integration
- **Relationship Visualization**: Support for all ArchiMate relationship types:
  - FLOW (information, data, control flows)
  - SERVING (provides services)
  - ACCESS (read/write access)
  - TRIGGERING (event triggers)
  - ASSOCIATION, AGGREGATION, COMPOSITION, SPECIALIZATION
- **Export Options**: Download diagrams as SVG, PNG, graph images, and JSON workspaces
- **Copy Functions**: Copy source code, DSL, and graph data to clipboard
- **Interactive Features**: Clickable graph nodes, zoom/pan controls, and relationship filtering
- **Error Handling**: Graceful fallbacks with helpful setup instructions

## 🕸️ Advanced Visualization

### Interactive Graph View

The Graph View provides an interactive network visualization of your architecture using vis-network:

- **Dynamic Layout**: Hierarchical automatic layout with physics simulation
- **Node Types**: Different colors and shapes for People (blue), Systems (navy), Containers (light blue), Components (lightest blue)
- **Relationship Colors**: Color-coded edges based on relationship type
- **Interactive Controls**: Drag nodes, zoom, pan, and click for details
- **Export**: Save graph visualizations as PNG images

### Structurizr UI Integration

Complete integration with Structurizr ecosystem:

- **Workspace Generation**: Automatic Structurizr workspace creation from architecture data
- **DSL Export**: Complete Structurizr DSL with model, views, and relationships
- **Statistics Dashboard**: Real-time counts of people, systems, and relationships
- **Direct Integration**: One-click export to Structurizr.com with copy-to-clipboard functionality

### Relationship Modeling

Advanced support for architectural relationships:

```typescript
// Supported relationship types from ArchiMate
RelationshipType: 'ASSOCIATION' | 'ASSIGNMENT' | 'REALIZATION' | 'AGGREGATION' | 
                 'COMPOSITION' | 'TRIGGERING' | 'FLOW' | 'SERVING' | 'ACCESS' | 
                 'INFLUENCE' | 'SPECIALIZATION'

FlowType: 'INFORMATION' | 'VALUE' | 'GOODS' | 'RESOURCES' | 'DATA' | 
          'CONTROL' | 'EVENT' | 'SIGNAL' | 'MATERIAL'
```

## 🧪 Testing

The project includes comprehensive unit tests for all services and components:

```bash
# Run all tests
npm test

# Run tests in watch mode  
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🏗️ Building for Production

```bash
# Build for production
npm run build

# The build artifacts will be stored in `dist/` directory
```

## 🎯 Future Roadmap

- **Additional Diagram Types**: BPMN, Mermaid, PlantUML sequence diagrams
- **Interactive Editing**: Direct manipulation of architecture elements
- **Export Capabilities**: PDF, SVG, and image export options
- **Collaboration Features**: Real-time collaboration and commenting
- **Advanced Analytics**: Architecture metrics and health indicators

## 📚 Development Guide

### Adding New Diagram Types

The architecture is designed for extensibility. To add new diagram types:

1. Extend `StructurizrMappingService` with new transformation methods
2. Create new rendering functions for the target format
3. Add UI controls in `ArchitectureDashboardComponent`
4. Update routing and navigation as needed

### Custom Styling

The application uses PrimeNG theming. To customize:

1. Update theme imports in `src/styles.css`
2. Override CSS custom properties for brand colors
3. Add component-specific styles as needed

## 🤝 Contributing

1. Follow Angular style guide and conventions
2. Write unit tests for new features
3. Update documentation as needed
4. Use conventional commit messages

## 📄 License

This project is part of the Architecture as Code ecosystem and follows the same licensing terms.
