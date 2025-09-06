import { Component, Input, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// PrimeNG components
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';

import { DiagramRenderingService, RenderedDiagram } from '../services/diagram-rendering.service';
import { AdvancedDiagramRendererService } from '../services/advanced-diagram-renderer.service';
import { StructurizrMappingService, StructurizrContext } from '../services/structurizr-mapping.service';

@Component({
  selector: 'app-diagram-viewer',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ProgressBarModule,
    MessageModule,
    TabsModule,
    SkeletonModule
  ],
  template: `
    <div class="diagram-viewer">
      <p-tabs [(value)]="activeTab" (valueChange)="onTabChange($event)">
        <p-tablist>
          <p-tab value="diagram">
            <span>Rendered Diagram</span>
          </p-tab>
          <p-tab value="structurizr">
            <span>Structurizr DSL</span>
          </p-tab>
          <p-tab value="plantuml">
            <span>PlantUML Source</span>
          </p-tab>
          <p-tab value="graph">
            <span>Graph View</span>
          </p-tab>
          <p-tab value="structurizr-ui">
            <span>Structurizr UI</span>
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="diagram">
          <div class="diagram-container">
            @if (isLoading()) {
              <div class="loading-state">
                <p-skeleton height="300px" borderRadius="8px"></p-skeleton>
                <p class="text-center mt-3">
                  <i class="pi pi-spin pi-spinner"></i>
                  Rendering diagram...
                </p>
              </div>
            } @else if (renderError()) {
              <p-message
                severity="warn"
                [text]="renderError()"
                class="mb-3">
              </p-message>
              <div class="fallback-content">
                <div class="plantUML-source">
                  <h5>PlantUML Source Code:</h5>
                  <pre class="plantuml-code">{{ _plantUMLCode() }}</pre>
                </div>
                <div class="setup-instructions mt-3">
                  <p-message severity="info">
                    <div>
                      <strong>To render visual diagrams:</strong><br>
                      1. Start local PlantUML server: <code>docker run -d -p 8080:8080 plantuml/plantuml-server:jetty</code><br>
                      2. Or configure a remote PlantUML service<br>
                      3. Refresh the page to see rendered diagrams
                    </div>
                  </p-message>
                </div>
              </div>
            } @else if (renderedDiagram() && renderedDiagram()!.success) {
              <div class="rendered-diagram">
                @if (renderedDiagram()!.format === 'html') {
                  <iframe
                    [src]="sanitizedUrl()"
                    class="diagram-frame"
                    frameborder="0">
                  </iframe>
                } @else {
                  <img
                    [src]="renderedDiagram()!.url"
                    [alt]="'Architecture Diagram'"
                    class="diagram-image"
                    (error)="onImageError($event)"
                    (load)="onImageLoad()">
                }

                <div class="diagram-actions mt-3">
                  <p-button
                    label="Download SVG"
                    icon="pi pi-download"
                    severity="secondary"
                    size="small"
                    (click)="downloadDiagram('svg')"
                    class="mr-2">
                  </p-button>
                  <p-button
                    label="Download PNG"
                    icon="pi pi-download"
                    severity="secondary"
                    size="small"
                    (click)="downloadDiagram('png')"
                    class="mr-2">
                  </p-button>
                  <p-button
                    label="Open in New Tab"
                    icon="pi pi-external-link"
                    severity="secondary"
                    size="small"
                    (click)="openInNewTab()">
                  </p-button>
                </div>
              </div>
            }
          </div>
          </p-tabpanel>

          <p-tabpanel value="structurizr">
          <div class="structurizr-container">
            <h5>Structurizr DSL Code:</h5>
            <pre class="structurizr-code">{{ structurizrDSL() }}</pre>

            <div class="dsl-actions mt-3">
              <p-button
                label="Copy DSL"
                icon="pi pi-copy"
                severity="secondary"
                size="small"
                (click)="copyDSL()"
                class="mr-2">
              </p-button>
              <p-button
                label="Export Workspace"
                icon="pi pi-upload"
                severity="secondary"
                size="small"
                (click)="exportWorkspace()"
                [loading]="isExporting()">
              </p-button>
            </div>
          </div>
          </p-tabpanel>

          <p-tabpanel value="plantuml">
          <div class="plantuml-container">
            <h5>PlantUML C4 Code:</h5>
            <pre class="plantuml-code">{{ _plantUMLCode() }}</pre>

            <div class="source-actions mt-3">
              <p-button
                label="Copy Code"
                icon="pi pi-copy"
                severity="secondary"
                size="small"
                (click)="copyPlantUML()"
                class="mr-2">
              </p-button>
              <p-button
                label="Re-render"
                icon="pi pi-refresh"
                severity="secondary"
                size="small"
                (click)="rerender()"
                [loading]="isLoading()">
              </p-button>
            </div>
          </div>
          </p-tabpanel>

          <p-tabpanel value="graph">
          <div class="graph-container">
            <h5>Interactive Graph View:</h5>
            @if (graphData()) {
              <div id="graph-network" class="network-container" style="width: 100%; height: 500px;"></div>

            } @else {
              <p-message severity="info" text="No architecture context available for graph view"></p-message>
            }
          </div>
          </p-tabpanel>

          <p-tabpanel value="structurizr-ui">
          <div class="structurizr-ui-container">
            <h5>Structurizr Workspace:</h5>
            @if (structurizrWorkspace()) {
              <div class="workspace-info">
                <h6>{{ structurizrWorkspace().name }}</h6>
                <p>{{ structurizrWorkspace().description }}</p>

                <div class="workspace-stats mt-3">
                  <div class="stat-item">
                    <strong>People:</strong> {{ structurizrWorkspace().model.people.length }}
                  </div>
                  <div class="stat-item">
                    <strong>Systems:</strong> {{ structurizrWorkspace().model.softwareSystems.length }}
                  </div>
                  <div class="stat-item">
                    <strong>Relationships:</strong> {{ structurizrWorkspace().model.relationships.length }}
                  </div>
                </div>

                <!-- C4 Diagram Previews -->
                <div class="diagram-previews mt-4">
                  <h6>Available C4 Diagrams:</h6>

                  @if (structurizrWorkspace().views.systemContextViews.length > 0) {
                    <div class="diagram-section">
                      <h6><i class="pi pi-sitemap"></i> System Context Diagrams</h6>
                      @for (view of structurizrWorkspace().views.systemContextViews; track view.key) {
                        <div class="diagram-card">
                          <div class="diagram-placeholder">
                            <i class="pi pi-diagram-tree" style="font-size: 2rem; color: #1976d2;"></i>
                            <p><strong>{{ view.title }}</strong></p>
                            <p class="text-sm">{{ view.description }}</p>
                            <small>Shows system in its environment with external users and dependencies</small>
                          </div>
                        </div>
                      }
                    </div>
                  }

                  @if (structurizrWorkspace().views.containerViews.length > 0) {
                    <div class="diagram-section">
                      <h6><i class="pi pi-box"></i> Container Diagrams</h6>
                      @for (view of structurizrWorkspace().views.containerViews; track view.key) {
                        <div class="diagram-card">
                          <div class="diagram-placeholder">
                            <i class="pi pi-objects-column" style="font-size: 2rem; color: #388e3c;"></i>
                            <p><strong>{{ view.title }}</strong></p>
                            <p class="text-sm">{{ view.description }}</p>
                            <small>Shows high-level containers and their interactions within the system</small>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <p-message severity="info" text="No architecture context available for Structurizr workspace"></p-message>
            }
          </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
  `,
  styles: [`
    .diagram-viewer {
      width: 100%;
    }

    .diagram-container {
      min-height: 300px;
      position: relative;
    }

    .loading-state {
      text-align: center;
      padding: 2rem;
    }

    .diagram-image {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      background: white;
      padding: 1rem;
    }

    .diagram-frame {
      width: 100%;
      min-height: 400px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .rendered-diagram {
      text-align: center;
    }

    .diagram-actions,
    .dsl-actions,
    .source-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .plantuml-code,
    .structurizr-code {
      background: var(--p-surface-900);
      color: var(--p-surface-0);
      padding: 1.5rem;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
      max-height: 400px;
      overflow-y: auto;
    }

    .fallback-content {
      padding: 1rem;
    }

    .setup-instructions {
      background: var(--p-surface-50);
      padding: 1rem;
      border-radius: 8px;
      border-left: 4px solid var(--p-blue-500);
    }

    .setup-instructions code {
      background: var(--p-surface-100);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .mr-2 {
      margin-right: 0.5rem;
    }

    .mt-3 {
      margin-top: 1rem;
    }

    .mb-3 {
      margin-bottom: 1rem;
    }

    .network-container {
      width: 100%;
      height: 500px;
      border: 1px solid var(--p-surface-border);
      border-radius: 8px;
      background: var(--p-surface-0);
    }

    .graph-container,
    .structurizr-ui-container {
      padding: 1rem;
    }

    .workspace-info {
      background: var(--p-surface-50);
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid var(--p-blue-500);
    }

    .workspace-stats {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    .stat-item {
      padding: 0.5rem 1rem;
      background: var(--p-surface-100);
      border-radius: 4px;
      min-width: 120px;
    }

    .workspace-preview ul {
      list-style-type: disc;
      margin-left: 1.5rem;
      margin-top: 0.5rem;
    }

    .workspace-preview li {
      padding: 0.25rem 0;
      color: var(--p-text-color);
    }

    .graph-actions,
    .structurizr-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: flex-start;
    }

    .diagram-previews {
      background: var(--p-surface-50);
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--p-surface-border);
    }

    .diagram-section {
      margin-bottom: 2rem;
    }

    .diagram-section h6 {
      display: block;
      font-weight: 600;
      color: var(--p-text-color);
      margin-bottom: 1rem;
      font-size: 1.1rem;
    }

    .diagram-card {
      background: var(--p-surface-0);
      border: 1px solid var(--p-surface-border);
      border-radius: 6px;
      margin-bottom: 1rem;
      transition: all 0.2s ease;
    }

    .diagram-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: var(--p-blue-300);
    }

    .diagram-placeholder {
      padding: 2rem;
      text-align: center;
      background: var(--p-surface-0);
      border-radius: 6px;
    }

    .diagram-placeholder p {
      margin: 0.5rem 0;
    }

    .diagram-placeholder small {
      color: var(--p-text-color-secondary);
      font-style: italic;
    }

    .integration-info {
      background: var(--p-blue-50);
      border-radius: 6px;
      padding: 1rem;
    }

    @media (max-width: 768px) {
      .diagram-actions,
      .dsl-actions,
      .source-actions {
        justify-content: flex-start;
      }

      .plantuml-code,
      .structurizr-code {
        font-size: 0.75rem;
        padding: 1rem;
      }
    }
  `]
})
export class DiagramViewerComponent implements OnInit, OnChanges {
  @Input() plantUMLCode: string = '';
  @Input() architectureName: string = 'Architecture';
  @Input() architectureContext?: StructurizrContext;

  // Public signals for template access
  _plantUMLCode = signal<string>('');
  _architectureName = signal<string>('Architecture');

  isLoading = signal<boolean>(false);
  isExporting = signal<boolean>(false);
  renderError = signal<string>('');
  renderedDiagram = signal<RenderedDiagram | null>(null);
  structurizrDSL = signal<string>('');
  activeTab = signal<string>('diagram');
  graphData = signal<any>(null);
  structurizrWorkspace = signal<any>(null);

  constructor(
    private diagramService: DiagramRenderingService,
    private advancedRenderer: AdvancedDiagramRendererService,
    private structurizrMapping: StructurizrMappingService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this._plantUMLCode.set(this.plantUMLCode);
    this._architectureName.set(this.architectureName);

    if (this._plantUMLCode()) {
      this.renderDiagram();
      this.generateStructurizrDSL();
    }

    if (this.architectureContext) {
      this.generateStructurizrWorkspace();
      this.generateGraphData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['plantUMLCode']) {
      this._plantUMLCode.set(this.plantUMLCode);
      if (this._plantUMLCode()) {
        this.renderDiagram();
        this.generateStructurizrDSL();
      }
    }

    if (changes['architectureName']) {
      this._architectureName.set(this.architectureName);
    }

    if (changes['architectureContext'] && this.architectureContext) {
      this.generateStructurizrWorkspace();
      this.generateGraphData();
    }
  }

  private renderDiagram() {
    if (!this._plantUMLCode()) return;

    this.isLoading.set(true);
    this.renderError.set('');
    this.renderedDiagram.set(null);

    this.diagramService.renderDiagramWithFallback(this._plantUMLCode()).subscribe({
      next: (result) => {
        this.renderedDiagram.set(result);
        if (!result.success) {
          this.renderError.set(result.error || 'Failed to render diagram');
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        this.renderError.set(`Rendering error: ${error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  private generateStructurizrDSL() {
    // Use advanced DSL generation if architecture context is available
    if (this.architectureContext) {
      const dsl = this.advancedRenderer.generateStructurizrDSL(this.architectureContext);
      this.structurizrDSL.set(dsl);
    } else if (this._plantUMLCode()) {
      // Fallback to legacy method
      const dsl = this.diagramService.generateStructurizrDSL(this._plantUMLCode());
      this.structurizrDSL.set(dsl);
    }
  }

  sanitizedUrl(): SafeResourceUrl {
    const diagram = this.renderedDiagram();
    if (diagram?.url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(diagram.url);
    }
    return '';
  }

  onImageError(event: any) {
    console.warn('Image failed to load:', event);
    this.renderError.set('Failed to load diagram image. The PlantUML server might be unavailable.');
  }

  onImageLoad() {
    // Diagram image loaded successfully
  }

  rerender() {
    this.renderDiagram();
  }

  downloadDiagram(format: 'svg' | 'png') {
    if (!this._plantUMLCode()) return;

    this.diagramService.exportDiagram(this._plantUMLCode(), format).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this._architectureName()}-diagram.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download failed:', error);
        this.renderError.set(`Download failed: ${error.message}`);
      }
    });
  }

  openInNewTab() {
    const diagram = this.renderedDiagram();
    if (diagram?.url) {
      window.open(diagram.url, '_blank');
    }
  }

  copyPlantUML() {
    if (navigator.clipboard && this._plantUMLCode()) {
      navigator.clipboard.writeText(this._plantUMLCode()).then(() => {
        // PlantUML code copied to clipboard
      }).catch((err) => {
        console.error('Failed to copy PlantUML code:', err);
      });
    }
  }

  copyDSL() {
    if (navigator.clipboard && this.structurizrDSL()) {
      navigator.clipboard.writeText(this.structurizrDSL()).then(() => {
        // Structurizr DSL copied to clipboard
      }).catch((err) => {
        console.error('Failed to copy DSL:', err);
      });
    }
  }

  exportWorkspace() {
    if (!this._plantUMLCode()) return;

    this.isExporting.set(true);

    this.diagramService.createStructurizrWorkspace(
      this._architectureName(),
      this._plantUMLCode()
    ).subscribe({
      next: (workspace) => {
        // Structurizr workspace created successfully

        // Download the DSL file
        const dslBlob = new Blob([this.structurizrDSL()], { type: 'text/plain' });
        const url = window.URL.createObjectURL(dslBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this._architectureName()}-workspace.dsl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.isExporting.set(false);
      },
      error: (error) => {
        console.error('Workspace export failed:', error);
        this.isExporting.set(false);
      }
    });
  }

  private generateGraphData() {
    if (!this.architectureContext) {
      return;
    }

    try {
      const graphData = this.advancedRenderer.generateGraphData(this.architectureContext);

      if (graphData && graphData.nodes && graphData.edges) {
        this.graphData.set(graphData);
        // Initialize graph visualization if the graph tab is active
        if (this.activeTab() === 'graph') {
          // Graph data tab loaded
          setTimeout(() => this.initializeGraph(), 200);
        }
      }
    } catch (error) {
      console.error('Error generating graph data:', error);
    }
  }

  private generateStructurizrWorkspace() {
    if (!this.architectureContext) return;

    this.advancedRenderer.generateStructurizrWorkspace(this.architectureContext).subscribe({
      next: (workspace) => {
        this.structurizrWorkspace.set(workspace);
      },
      error: (error) => {
        console.error('Error generating Structurizr workspace:', error);
      }
    });
  }

  private networkInstance: any = null;

  private initializeGraph() {
    const container = document.getElementById('graph-network');
    if (!container || !this.graphData()) {
      return;
    }
    // Clear any existing network instance
    if (this.networkInstance) {
      this.networkInstance.destroy();
      this.networkInstance = null;
    }

    try {
      // Import vis-network dynamically to avoid SSR issues
      import('vis-network/standalone').then(({ Network }) => {
        const options = this.advancedRenderer.getNetworkOptions();
        const data = this.graphData();

        if (!data || !data.nodes || !data.edges) {
          return;
        }

        this.networkInstance = new Network(container, data, options);

        // Add event listeners
        this.networkInstance.on('click', (params: any) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            // Find and display node details
            const nodeData = data.nodes.get(nodeId);
            if (nodeData) {
              // Node clicked - could show details in future
            }
          }
        });

        // Fit the network to view after initialization
        this.networkInstance.once('stabilizationIterationsDone', () => {
          this.networkInstance.fit();
        });

      }).catch(error => {
        console.error('Error loading vis-network:', error);
      });
    } catch (error) {
      console.error('Error initializing graph:', error);
    }
  }



  exportStructurizrWorkspace() {
    if (!this.structurizrWorkspace()) return;

    const workspace = this.structurizrWorkspace();
    const dataStr = JSON.stringify(workspace, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = window.URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this._architectureName()}-workspace.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }



  onTabChange(event: any) {
    this.activeTab.set(event);
    this.generateGraphData();
  }

  generateFromStructurizr(format: 'plantuml' | 'mermaid' | 'websequence') {
    if (!this.architectureContext) return;

    const dsl = this.advancedRenderer.generateStructurizrDSL(this.architectureContext);

    switch (format) {
      case 'plantuml':
        // Convert Structurizr DSL to PlantUML (simplified)
        const plantUMLCode = this.convertStructurizrToPlantUML(dsl);
        this._plantUMLCode.set(plantUMLCode);
        this.renderDiagram();
        this.activeTab.set('diagram'); // Switch to diagram tab
        break;
      case 'mermaid':
        // Future: Convert to Mermaid format
        alert('Mermaid export coming soon! DSL has been copied to clipboard.');
        navigator.clipboard?.writeText(dsl);
        break;
      case 'websequence':
        // Future: Convert to WebSequence format
        alert('WebSequence export coming soon! DSL has been copied to clipboard.');
        navigator.clipboard?.writeText(dsl);
        break;
    }
  }

  private convertStructurizrToPlantUML(dsl: string): string {
    // Simple conversion - extract elements from DSL and create PlantUML
    let plantuml = '@startuml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml\n';
    plantuml += '!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml\n\n';

    // Extract people, systems and relationships from DSL
    const lines = dsl.split('\n');
    const elements: {id: string, type: string, name: string, description?: string}[] = [];
    const relationships: {source: string, target: string, label: string}[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();

      // Match person definitions
      const personMatch = trimmed.match(/(\w+) = person "([^"]+)"(?: "([^"]+)")?/);
      if (personMatch) {
        elements.push({
          id: personMatch[1],
          type: 'person',
          name: personMatch[2],
          description: personMatch[3]
        });
      }

      // Match system definitions
      const systemMatch = trimmed.match(/(\w+) = softwareSystem "([^"]+)"(?: "([^"]+)")?/);
      if (systemMatch) {
        elements.push({
          id: systemMatch[1],
          type: 'system',
          name: systemMatch[2],
          description: systemMatch[3]
        });
      }

      // Match relationships
      const relMatch = trimmed.match(/(\w+) -> (\w+) "([^"]+)"/);
      if (relMatch) {
        relationships.push({
          source: relMatch[1],
          target: relMatch[2],
          label: relMatch[3]
        });
      }
    });

    // Generate PlantUML elements
    elements.forEach(element => {
      switch (element.type) {
        case 'person':
          plantuml += `Person(${element.id}, "${element.name}", "${element.description || ''}")\n`;
          break;
        case 'system':
          plantuml += `System(${element.id}, "${element.name}", "${element.description || ''}")\n`;
          break;
      }
    });

    // Generate PlantUML relationships
    plantuml += '\n';
    relationships.forEach(rel => {
      plantuml += `Rel(${rel.source}, ${rel.target}, "${rel.label}")\n`;
    });

    plantuml += '\n@enduml';
    return plantuml;
  }
}
