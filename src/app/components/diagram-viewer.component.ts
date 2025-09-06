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
    <div class="diagram-viewer-compact">
      <!-- Floating Action Toolbar -->
      <div class="floating-toolbar">
        <div class="view-selector">
          <button 
            *ngFor="let tab of tabs; trackBy: trackTab" 
            class="tab-button"
            [class.active]="activeTab() === tab.value"
            (click)="onTabChange(tab.value)"
            [title]="tab.tooltip">
            <i [class]="tab.icon"></i>
            <span class="tab-label">{{ tab.label }}</span>
          </button>
        </div>
        
        <!-- Action buttons for current view -->
        <div class="action-buttons">
          @if (activeTab() === 'diagram') {
            @if (renderedDiagram() && renderedDiagram()!.success) {
              <p-button
                icon="pi pi-cloud-download"
                size="small"
                severity="secondary"
                (click)="downloadDiagram('svg')"
                [title]="'Download SVG'">
              </p-button>
              <p-button
                icon="pi pi-arrow-up-right"
                size="small"
                severity="secondary"
                (click)="openInNewTab()"
                [title]="'Open in New Tab'">
              </p-button>
            }
            <p-button
              icon="pi pi-sync"
              size="small"
              severity="secondary"
              (click)="rerender()"
              [loading]="isLoading()"
              [title]="'Re-render'">
            </p-button>
          } @else if (activeTab() === 'structurizr') {
            <p-button
              icon="pi pi-clipboard"
              size="small"
              severity="secondary"
              (click)="copyDSL()"
              [title]="'Copy DSL'">
            </p-button>
            <p-button
              icon="pi pi-file-export"
              size="small"
              severity="secondary"
              (click)="exportWorkspace()"
              [loading]="isExporting()"
              [title]="'Export Workspace'">
            </p-button>
          } @else if (activeTab() === 'plantuml') {
            <p-button
              icon="pi pi-clipboard"
              size="small"
              severity="secondary"
              (click)="copyPlantUML()"
              [title]="'Copy Code'">
            </p-button>
          }
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="content-area">
        @if (activeTab() === 'diagram') {
          <div class="diagram-content">
            @if (isLoading()) {
              <div class="loading-state">
                <p-skeleton height="100%" borderRadius="8px"></p-skeleton>
                <div class="loading-text">
                  <i class="pi pi-spin pi-spinner"></i>
                  Rendering diagram...
                </div>
              </div>
            } @else if (renderError()) {
              <div class="error-state">
                <p-message
                  severity="warn"
                  [text]="renderError()">
                </p-message>
                <div class="fallback-content">
                  <pre class="code-preview">{{ _plantUMLCode() }}</pre>
                  <div class="setup-hint">
                    <strong>Setup PlantUML:</strong>
                    <code>docker run -d -p 8080:8080 plantuml/plantuml-server:jetty</code>
                  </div>
                </div>
              </div>
            } @else if (renderedDiagram() && renderedDiagram()!.success) {
              <div class="rendered-content">
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
              </div>
            }
          </div>
        } @else if (activeTab() === 'structurizr') {
          <div class="code-content">
            <pre class="code-display">{{ structurizrDSL() }}</pre>
          </div>
        } @else if (activeTab() === 'plantuml') {
          <div class="code-content">
            <pre class="code-display">{{ _plantUMLCode() }}</pre>
          </div>
        } @else if (activeTab() === 'graph') {
          <div class="graph-content">
            @if (graphData()) {
              <div id="graph-network" class="network-container"></div>
            } @else {
              <div class="empty-state">
                <i class="pi pi-share-alt"></i>
                <p>No architecture context available for graph view</p>
              </div>
            }
          </div>
        } @else if (activeTab() === 'structurizr-ui') {
          <div class="workspace-content">
            @if (structurizrWorkspace()) {
              <div class="workspace-overview">
                <h3>{{ structurizrWorkspace().name }}</h3>
                <p>{{ structurizrWorkspace().description }}</p>
                
                <div class="stats-grid">
                  <div class="stat">
                    <span class="count">{{ structurizrWorkspace().model.people.length }}</span>
                    <span class="label">People</span>
                  </div>
                  <div class="stat">
                    <span class="count">{{ structurizrWorkspace().model.softwareSystems.length }}</span>
                    <span class="label">Systems</span>
                  </div>
                  <div class="stat">
                    <span class="count">{{ structurizrWorkspace().model.relationships.length }}</span>
                    <span class="label">Relations</span>
                  </div>
                </div>

                <div class="diagram-types">
                  @if (structurizrWorkspace().views.systemContextViews.length > 0) {
                    <div class="diagram-type">
                      <h4><i class="pi pi-building"></i> System Context Views</h4>
                      @for (view of structurizrWorkspace().views.systemContextViews; track view.key) {
                        <div class="view-card">
                          <strong>{{ view.title }}</strong>
                          <p>{{ view.description }}</p>
                        </div>
                      }
                    </div>
                  }
                  
                  @if (structurizrWorkspace().views.containerViews.length > 0) {
                    <div class="diagram-type">
                      <h4><i class="pi pi-objects-column"></i> Container Views</h4>
                      @for (view of structurizrWorkspace().views.containerViews; track view.key) {
                        <div class="view-card">
                          <strong>{{ view.title }}</strong>
                          <p>{{ view.description }}</p>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="empty-state">
                <i class="pi pi-briefcase"></i>
                <p>No architecture context available for Structurizr workspace</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .diagram-viewer-compact {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 500px;
    }

    .floating-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem;
      background: var(--p-surface-0);
      border-bottom: 1px solid var(--p-surface-border);
      border-radius: 8px 8px 0 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .view-selector {
      display: flex;
      gap: 0.25rem;
    }

    .tab-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tab-button:hover {
      background: var(--p-surface-100);
      color: var(--p-text-color);
    }

    .tab-button.active {
      background: var(--p-primary-color);
      color: var(--p-primary-contrast-color);
      border-color: var(--p-primary-color);
    }

    .tab-button i {
      font-size: 1rem;
    }

    .action-buttons {
      display: flex;
      gap: 0.25rem;
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .diagram-content,
    .code-content,
    .graph-content,
    .workspace-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .loading-state {
      flex: 1;
      position: relative;
      display: flex;
      flex-direction: column;
    }

    .loading-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .error-state,
    .fallback-content {
      padding: 1rem;
      flex: 1;
      overflow-y: auto;
    }

    .code-preview,
    .setup-hint {
      background: var(--p-surface-100);
      padding: 1rem;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.75rem;
      margin-top: 1rem;
    }

    .setup-hint code {
      background: var(--p-surface-200);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }

    .rendered-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    }

    .diagram-image {
      max-width: 100%;
      max-height: 100%;
      border-radius: 6px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    .diagram-frame {
      width: 100%;
      height: 100%;
      border-radius: 6px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    }

    .code-display {
      flex: 1;
      background: var(--p-surface-900);
      color: var(--p-surface-0);
      padding: 1rem;
      border-radius: 0;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      overflow: auto;
      white-space: pre;
      margin: 0;
    }

    .network-container {
      width: 100%;
      flex: 1;
      min-height: 400px;
      border-radius: 6px;
      background: var(--p-surface-0);
    }

    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .empty-state i {
      font-size: 3rem;
      opacity: 0.5;
    }

    .workspace-overview {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .workspace-overview h3 {
      margin: 0 0 0.5rem 0;
      color: var(--p-text-color);
    }

    .workspace-overview p {
      margin: 0 0 1.5rem 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    .stats-grid {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat {
      text-align: center;
      padding: 1rem;
      background: var(--p-surface-100);
      border-radius: 8px;
      min-width: 80px;
    }

    .stat .count {
      display: block;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--p-primary-color);
    }

    .stat .label {
      display: block;
      font-size: 0.75rem;
      color: var(--p-text-muted-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .diagram-types {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .diagram-type h4 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: var(--p-text-color);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .view-card {
      background: var(--p-surface-50);
      padding: 1rem;
      border-radius: 6px;
      border-left: 3px solid var(--p-primary-color);
      margin-bottom: 0.75rem;
    }

    .view-card strong {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--p-text-color);
    }

    .view-card p {
      margin: 0;
      color: var(--p-text-muted-color);
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .tab-button .tab-label {
        display: none;
      }
      
      .stats-grid {
        flex-direction: column;
        gap: 1rem;
      }
      
      .floating-toolbar {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }
      
      .view-selector,
      .action-buttons {
        justify-content: center;
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

  // Tab configuration for compact view
  tabs = [
    { 
      value: 'diagram', 
      label: 'Diagram', 
      icon: 'pi pi-palette',
      tooltip: 'Rendered Architecture Diagram'
    },
    { 
      value: 'structurizr', 
      label: 'DSL', 
      icon: 'pi pi-code',
      tooltip: 'Structurizr DSL Source'
    },
    { 
      value: 'plantuml', 
      label: 'PlantUML', 
      icon: 'pi pi-file-edit',
      tooltip: 'PlantUML C4 Source Code'
    },
    { 
      value: 'graph', 
      label: 'Graph', 
      icon: 'pi pi-sitemap',
      tooltip: 'Interactive Network Graph'
    },
    { 
      value: 'structurizr-ui', 
      label: 'Workspace', 
      icon: 'pi pi-briefcase',
      tooltip: 'Structurizr Workspace Overview'
    }
  ];

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



  onTabChange(tabValue: string) {
    this.activeTab.set(tabValue);
    if (tabValue === 'graph') {
      this.generateGraphData();
      // Initialize graph after a short delay to ensure DOM is ready
      setTimeout(() => this.initializeGraph(), 100);
    }
  }

  trackTab(index: number, tab: any) {
    return tab.value;
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
