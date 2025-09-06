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
- **🔌 API Integration**: Full integration with Architecture as Code Engine via OpenAPI-generated client with fallback to mock data
- **🎨 Modern UI**: Built with PrimeNG Aura theme for professional user experience
- **📁 Export Capabilities**: Download diagrams as SVG, PNG, graph images, and export Structurizr DSL workspaces
- **🧪 Development Ready**: Comprehensive mock data service for development and testing without backend
- **📈 Extensible Design**: Ready for future diagram types (BPMN, Mermaid, PlantUML, etc.)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+
- Docker or Podman (for PlantUML server)
- Architecture as Code Engine running on `http://localhost:8080` *(optional - fallback to mock data)*

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

### Development Without Backend

The application includes comprehensive mock data for development and testing without requiring the backend:

- **Mock Architecture**: Complete e-commerce system architecture with 3 actors, 3 applications, 6 components
- **Realistic Relationships**: 8 different relationship types demonstrating actor-to-system and system-to-component flows
- **Automatic Fallback**: When backend is unavailable, automatically switches to mock data
- **Full Feature Testing**: All visualization modes work with mock data (diagrams, graphs, Structurizr UI)

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
- **DiagramViewerComponent**: Advanced component with 5 visualization tabs (Diagram, DSL, Source, Graph, Structurizr UI)
- **ArchitectureService**: Service layer for API communication with automatic fallback to mock data
- **DiagramRenderingService**: Service for PlantUML rendering and Structurizr workspace creation
- **AdvancedDiagramRendererService**: Service for graph visualization and enhanced Structurizr DSL generation
- **StructurizrMappingService**: Transforms architecture data into C4 model elements with relationship mapping
- **MockDataService**: Comprehensive mock data service for development and testing

### Data Flow

1. **API Integration**: Connects to Architecture Engine REST API (with automatic fallback to mock data)
2. **Data Transformation**: Maps business actors → people, applications → systems, components → containers
3. **Relationship Mapping**: Maps all ArchiMate relationships including actor-to-system and container relationships
4. **Multi-format Generation**: 
   - PlantUML C4 diagrams with relationship visualization
   - Interactive graph data for vis-network visualization  
   - Complete Structurizr DSL workspaces
5. **Rendering Pipeline**: Multiple rendering strategies with graceful fallbacks
6. **Export & Analysis**: Download capabilities for all formats (SVG, PNG, JSON, DSL)

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

## 🖼️ Visualization Modes

The application provides 5 comprehensive visualization modes:

### 1. Rendered Diagram Tab
- High-quality PlantUML C4 diagrams with proper relationship visualization
- SVG and PNG export capabilities  
- Multiple PlantUML server fallback strategies
- Graceful degradation to source code display

### 2. Structurizr DSL Tab  
- Complete Structurizr workspace DSL generation
- Copy-to-clipboard functionality
- Export as .dsl files for Structurizr.com
- Proper syntax with model, views, and relationships

### 3. PlantUML Source Tab
- Raw PlantUML C4 source code
- Copy and re-render capabilities
- C4 PlantUML syntax with relationship types

### 4. Graph View Tab
- Interactive vis-network visualization
- Hierarchical automatic layout with physics
- Color-coded nodes (People: blue, Systems: navy, Containers: light blue)  
- Clickable nodes with detailed information
- Export as PNG images

### 5. Structurizr UI Tab
- Workspace statistics and overview
- Direct integration with Structurizr.com
- Export workspace as JSON
- Preview of available C4 diagrams (System Context, Container views)

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

- **Comprehensive Relationship Visualization**: Support for all ArchiMate relationship types:
  - FLOW (information, data, control flows)
  - SERVING (provides services)
  - ACCESS (read/write access)
  - TRIGGERING (event triggers)
  - ASSOCIATION, AGGREGATION, COMPOSITION, SPECIALIZATION
- **Smart Container Distribution**: Containers are intelligently distributed across systems
- **Automatic Relationship Inference**: Missing actor-to-system relationships are automatically inferred
- **Export Options**: Download diagrams as SVG, PNG, graph images, DSL files, and JSON workspaces
- **Copy Functions**: Copy source code, DSL, and graph data to clipboard
- **Interactive Features**: Clickable graph nodes, zoom/pan controls, and relationship filtering
- **Error Handling**: Graceful fallbacks with helpful setup instructions and mock data

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

## 🧪 Testing & Development

### Unit Testing

The project includes comprehensive unit tests for all services and components:

```bash
# Run all tests
npm test

# Run tests in watch mode  
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Development Features

- **Mock Data Service**: Complete e-commerce architecture for development without backend
- **Comprehensive Logging**: Console debugging for data flow tracing (API → Model → DSL → Diagrams)  
- **Error Recovery**: Automatic fallback to mock data when backend is unavailable
- **Hot Reload**: Development server with live reload for efficient development
- **TypeScript**: Full type safety with generated API client types

### Architecture Testing

Test the complete workflow with the included mock data:

1. **Load Architecture**: Select "E-Commerce System Architecture" from the dropdown
2. **Verify Systems**: Check that 3 systems appear (E-Commerce App, Admin Portal, Payment Service)
3. **Check Relationships**: Verify 8 relationships are mapped correctly  
4. **Test Visualizations**: Switch between all 5 visualization tabs
5. **Export Functions**: Test all export capabilities (SVG, PNG, DSL, JSON)

## 🏗️ Building for Production

```bash
# Build for production
npm run build

# The build artifacts will be stored in `dist/` directory
```

## 🎯 Recent Improvements

### Fixed Issues (v2.0)

- **✅ Systems Not Appearing**: Fixed DSL generation where systems were getting lost in visualization
- **✅ Container-System Association**: Improved container distribution across systems instead of hardcoded limits
- **✅ Relationship Inference**: Re-enabled automatic actor-to-system relationship generation
- **✅ Mock Data Integration**: Added comprehensive fallback data for development without backend
- **✅ Enhanced Debugging**: Added console logging throughout the data mapping pipeline

### Current Features

- **5 Visualization Modes**: Complete tabbed interface with all diagram types
- **Comprehensive Relationship Support**: All ArchiMate relationship types with proper mapping
- **Smart Data Flow**: API → Model → DSL → Multiple Diagram Libraries workflow
- **Export Capabilities**: SVG, PNG, DSL, JSON export with copy-to-clipboard
- **Interactive Elements**: Clickable graph nodes, drag/zoom/pan controls

## 🎯 Future Roadmap

- **Additional Diagram Types**: BPMN, Mermaid, PlantUML sequence diagrams
- **Interactive Editing**: Direct manipulation of architecture elements in graph view
- **Enhanced Exports**: PDF generation and batch export options
- **Collaboration Features**: Real-time collaboration and commenting
- **Advanced Analytics**: Architecture metrics, health indicators, and dependency analysis
- **Custom Themes**: User-customizable color schemes and diagram styling

## 📚 Development Guide

### Key Services

- **StructurizrMappingService**: Core mapping logic (API → C4 Model)
- **AdvancedDiagramRendererService**: Enhanced DSL generation and graph visualization  
- **DiagramRenderingService**: PlantUML rendering and export functions
- **MockDataService**: Development data (automatically used when backend unavailable)

### Adding New Diagram Types

The architecture is designed for extensibility. To add new diagram types:

1. Extend `AdvancedDiagramRendererService` with new generation methods
2. Create new tab in `DiagramViewerComponent` template
3. Add export functionality for the new format
4. Update the tabbed interface logic

### Debugging Data Flow

Use browser console to trace the complete data pipeline:

1. **Load Architecture**: See mapping results from `StructurizrMappingService`
2. **DSL Generation**: View system and container processing in `AdvancedDiagramRendererService`
3. **Graph Data**: Monitor node/edge creation for vis-network
4. **Relationship Mapping**: Track all relationship types and inference logic

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
