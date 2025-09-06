import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { getApiConfig } from '../config/api.config';

declare const plantumlEncoder: any;

export interface DiagramRenderOptions {
  format: 'svg' | 'png' | 'pdf';
  theme?: 'default' | 'dark' | 'bluegray' | 'sandstone';
  server?: string;
}

export interface RenderedDiagram {
  url: string;
  format: string;
  source: string;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DiagramRenderingService {
  private readonly apiConfig = getApiConfig();
  
  // Default PlantUML servers (public and local)
  private readonly defaultPlantUMLServers = [
    'http://www.plantuml.com/plantuml', // Official public server
    'http://localhost:8081',            // Local PlantUML server (if available)
    'https://plantuml-server.kkeisuke.com' // Alternative public server
  ];

  // Structurizr configuration
  private readonly structurizrConfig = {
    workspaceUrl: 'https://structurizr.com',
    apiUrl: this.apiConfig.baseUrl + '/api/v1/structurizr'
  };

  constructor(private http: HttpClient) {}

  /**
   * Render PlantUML diagram using various rendering strategies
   */
  renderPlantUML(
    plantUMLCode: string, 
    options: DiagramRenderOptions = { format: 'svg' }
  ): Observable<RenderedDiagram> {
    // Try multiple rendering strategies
    return this.renderWithLocalServer(plantUMLCode, options).pipe(
      catchError(() => this.renderWithPublicServer(plantUMLCode, options)),
      catchError(() => this.renderWithEncoding(plantUMLCode, options)),
      catchError((error) => of({
        url: '',
        format: options.format,
        source: plantUMLCode,
        success: false,
        error: `All rendering methods failed: ${error.message}`
      }))
    );
  }

  /**
   * Try rendering with local PlantUML server first
   */
  private renderWithLocalServer(plantUMLCode: string, options: DiagramRenderOptions): Observable<RenderedDiagram> {
    const localServerUrl = 'http://localhost:8081';
    return this.renderWithServer(localServerUrl, plantUMLCode, options);
  }

  /**
   * Fallback to public PlantUML server
   */
  private renderWithPublicServer(plantUMLCode: string, options: DiagramRenderOptions): Observable<RenderedDiagram> {
    const publicServerUrl = options.server || this.defaultPlantUMLServers[0];
    return this.renderWithServer(publicServerUrl, plantUMLCode, options);
  }

  /**
   * Render diagram using PlantUML server
   */
  private renderWithServer(serverUrl: string, plantUMLCode: string, options: DiagramRenderOptions): Observable<RenderedDiagram> {
    return from(import('plantuml-encoder')).pipe(
      switchMap((encoder) => {
        const encoded = encoder.encode(plantUMLCode);
        const diagramUrl = `${serverUrl}/${options.format}/${encoded}`;
        
        // Test if the diagram URL is accessible
        return this.http.get(diagramUrl, { 
          responseType: 'blob',
          headers: { 'Accept': `image/${options.format === 'svg' ? 'svg+xml' : options.format}` }
        }).pipe(
          map(() => ({
            url: diagramUrl,
            format: options.format,
            source: plantUMLCode,
            success: true
          })),
          catchError((error) => {
            throw new Error(`Server ${serverUrl} not accessible: ${error.status || error.message}`);
          })
        );
      })
    );
  }

  /**
   * Fallback: Generate data URL with base64 encoded PlantUML for client-side rendering
   */
  private renderWithEncoding(plantUMLCode: string, options: DiagramRenderOptions): Observable<RenderedDiagram> {
    return from(import('plantuml-encoder')).pipe(
      map((encoder) => {
        const encoded = encoder.encode(plantUMLCode);
        // Use the official PlantUML server as last resort
        const diagramUrl = `${this.defaultPlantUMLServers[0]}/${options.format}/${encoded}`;
        
        return {
          url: diagramUrl,
          format: options.format,
          source: plantUMLCode,
          success: true
        };
      })
    );
  }

  /**
   * Create Structurizr workspace and render C4 diagrams
   */
  createStructurizrWorkspace(architectureName: string, plantUMLCode: string): Observable<any> {
    const workspaceData = {
      name: `${architectureName} - Architecture Workspace`,
      description: `Generated workspace for ${architectureName}`,
      model: this.extractModelFromPlantUML(plantUMLCode),
      views: this.createDefaultViews()
    };

    // Try to send to backend Structurizr integration first
    return this.http.post(`${this.apiConfig.baseUrl}/api/v1/structurizr/workspace`, workspaceData).pipe(
      catchError((error) => {
        console.warn('Backend Structurizr integration not available:', error);
        // Return mock workspace for display
        return of({
          id: Math.random().toString(36).substr(2, 9),
          name: workspaceData.name,
          description: workspaceData.description,
          url: '#', // Placeholder URL
          plantUMLGenerated: true
        });
      })
    );
  }

  /**
   * Generate Structurizr DSL from PlantUML code (legacy method)
   * Note: This is used for fallback when architecture context is not available
   */
  generateStructurizrDSL(plantUMLCode: string): string {
    // Convert PlantUML C4 to Structurizr DSL format
    const lines = plantUMLCode.split('\n');
    let dsl = 'workspace "Architecture Workspace" "Generated from Architecture as Code Studio" {\n\n';
    
    dsl += '    model {\n';
    const people: string[] = [];
    const systems: string[] = [];
    
    // Extract people, systems, and containers from PlantUML
    lines.forEach(line => {
      line = line.trim();
      
      if (line.startsWith('Person(') || line.startsWith('Person_Ext(')) {
        const match = line.match(/Person(?:_Ext)?\(([^,]+),\s*"([^"]+)"/);
        if (match) {
          const id = match[1];
          const name = match[2];
          dsl += `        ${id} = person "${name}"\n`;
          people.push(id);
        }
      } else if (line.startsWith('System(') || line.startsWith('System_Ext(')) {
        const match = line.match(/System(?:_Ext)?\(([^,]+),\s*"([^"]+)"/);
        if (match) {
          const id = match[1];
          const name = match[2];
          dsl += `        ${id} = softwareSystem "${name}"\n`;
          systems.push(id);
        }
      }
    });
    
    // Add basic relationships if extracted
    if (people.length > 0 && systems.length > 0) {
      dsl += '\n        # Relationships\n';
      people.forEach(person => {
        systems.forEach(system => {
          dsl += `        ${person} -> ${system} "Uses"\n`;
        });
      });
    }
    
    dsl += '    }\n\n';
    dsl += '    views {\n';
    
    if (systems.length > 0) {
      dsl += `        systemContext ${systems[0]} "SystemContext" {\n`;
      dsl += '            include *\n';
      dsl += '            autoLayout\n';
      dsl += '        }\n\n';
    }
    
    dsl += '        theme default\n';
    dsl += '    }\n';
    dsl += '}\n';
    
    return dsl;
  }

  /**
   * Render diagram with error handling and fallbacks
   */
  renderDiagramWithFallback(plantUMLCode: string): Observable<RenderedDiagram> {
    return this.renderPlantUML(plantUMLCode, { format: 'svg' }).pipe(
      catchError((error) => {
        console.warn('Primary rendering failed, trying alternative methods:', error);
        
        // Fallback: try PNG format
        return this.renderPlantUML(plantUMLCode, { format: 'png' }).pipe(
          catchError(() => {
            // Final fallback: return a placeholder with the code
            return of({
              url: this.createPlaceholderDiagram(plantUMLCode),
              format: 'html',
              source: plantUMLCode,
              success: false,
              error: 'Diagram rendering services unavailable. Showing PlantUML code instead.'
            });
          })
        );
      })
    );
  }

  /**
   * Create a placeholder diagram when rendering fails
   */
  private createPlaceholderDiagram(plantUMLCode: string): string {
    const htmlContent = `
      <div style="
        padding: 2rem;
        border: 2px dashed #ccc;
        border-radius: 8px;
        background: #f9f9f9;
        font-family: monospace;
        text-align: left;
        max-height: 400px;
        overflow-y: auto;
      ">
        <h4 style="margin: 0 0 1rem 0; color: #666;">PlantUML Diagram Source</h4>
        <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${plantUMLCode}</pre>
        <div style="margin-top: 1rem; padding: 1rem; background: #e8f4fd; border-radius: 4px;">
          <strong>Note:</strong> To render visual diagrams, start a local PlantUML server or configure a remote PlantUML service.
          <br><br>
          <strong>Quick Setup:</strong>
          <br>1. Run: <code>npm run setup-plantuml</code>
          <br>2. Or manually: <code>podman run -d -p 8081:8080 docker.io/plantuml/plantuml-server:jetty</code>
          <br>3. Test at: <a href="http://localhost:8081" target="_blank">http://localhost:8081</a>
        </div>
      </div>
    `;
    
    return 'data:text/html;base64,' + btoa(htmlContent);
  }

  /**
   * Check if PlantUML server is available
   */
  checkPlantUMLServerAvailability(): Observable<boolean> {
    return this.http.get('http://localhost:8081/png/SyfFKj2rKt3CoKnELR1Io4ZDoSa70000', {
      responseType: 'blob'
    }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Extract model elements from PlantUML code
   */
  private extractModelFromPlantUML(plantUMLCode: string): any {
    const model: any = {
      people: [],
      softwareSystems: [],
      containers: []
    };

    const lines = plantUMLCode.split('\n');
    lines.forEach(line => {
      line = line.trim();
      
      if (line.startsWith('Person(') || line.startsWith('Person_Ext(')) {
        const match = line.match(/Person(?:_Ext)?\(([^,]+),\s*"([^"]+)",?\s*"?([^"]*)"?/);
        if (match) {
          model.people.push({
            id: match[1],
            name: match[2],
            description: match[3] || ''
          });
        }
      } else if (line.startsWith('System(') || line.startsWith('System_Ext(')) {
        const match = line.match(/System(?:_Ext)?\(([^,]+),\s*"([^"]+)",?\s*"?([^"]*)"?/);
        if (match) {
          model.softwareSystems.push({
            id: match[1],
            name: match[2],
            description: match[3] || ''
          });
        }
      }
    });

    return model;
  }

  /**
   * Create default views for Structurizr workspace
   */
  private createDefaultViews(): any {
    return {
      systemContextView: {
        title: 'System Context',
        description: 'System context view showing the software system and its environment'
      },
      containerView: {
        title: 'Container View',
        description: 'Container view showing the high-level containers within the software system'
      }
    };
  }

  /**
   * Export diagram in various formats
   */
  exportDiagram(plantUMLCode: string, format: 'svg' | 'png' | 'pdf' = 'png'): Observable<Blob> {
    return this.renderPlantUML(plantUMLCode, { format }).pipe(
      switchMap((result) => {
        if (result.success && result.url) {
          return this.http.get(result.url, { responseType: 'blob' });
        } else {
          throw new Error(result.error || 'Failed to render diagram');
        }
      })
    );
  }
}