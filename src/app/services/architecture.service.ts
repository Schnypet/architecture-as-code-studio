import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import {
  ArchitectureService as GeneratedArchitectureService,
  ApplicationLayerService,
  BusinessLayerService,
  TechnologyLayerService,
  Configuration,
  Architecture,
  ApplicationLayer,
  BusinessLayer,
  TechnologyLayer,
  BusinessActor,
  ApplicationComponent,
  TechnologyNode
} from '../../generated/api';
import { getApiConfig } from '../config/api.config';
import { MockDataService } from './mock-data.service';

@Injectable({
  providedIn: 'root'
})
export class ArchitectureService {
  private readonly apiConfig = getApiConfig();
  private config: Configuration;

  constructor(
    private http: HttpClient,
    private architectureApi: GeneratedArchitectureService,
    private applicationApi: ApplicationLayerService,
    private businessApi: BusinessLayerService,
    private technologyApi: TechnologyLayerService,
    private mockDataService: MockDataService
  ) {
    this.config = new Configuration({
      basePath: this.apiConfig.baseUrl
    });
  }

  getAllArchitectures(): Observable<Architecture[]> {
    // Call the generated API - now properly typed with JSON Accept header
    return this.architectureApi.getAllArchitectures('body', false, {
      httpHeaderAccept: 'application/json'
    }).pipe(
      map(response => {
        // Ensure we have a proper array response
        if (Array.isArray(response)) {
          return response;
        }
        console.warn('API returned non-array response:', response);
        return [];
      }),
      catchError(error => {
        console.error('Backend not available, using mock data:', error);
        // Check if the error response is a Blob (HTML error page)
        if (error.error instanceof Blob) {
          console.error('Received Blob response, likely an HTML error page. Check if backend is running.');
        }
        // Fallback to mock data
        return this.mockDataService.getMockArchitectureList();
      })
    );
  }

  getArchitectureById(id: string): Observable<Architecture | null> {
    return this.architectureApi.getArchitectureById({ id }).pipe(
      map(architecture => {
        console.log(`getArchitectureById - received from API for ${id}:`, architecture);
        return architecture;
      }),
      catchError(error => {
        console.error(`Backend not available for architecture ${id}, using mock data:`, error);
        // Fallback to mock data for testing - return mock for any architecture ID
        console.log('Falling back to mock data for architecture:', id);
        return this.mockDataService.getMockArchitecture();
      })
    );
  }

  getCompleteArchitecture(id: string): Observable<Architecture | null> {
    return this.getArchitectureById(id).pipe(
      map(architecture => {
        if (!architecture) return null;
        console.log('getCompleteArchitecture - received architecture:', architecture);
        console.log('getCompleteArchitecture - applications:', architecture.applicationLayer?.applications);
        return architecture;
      })
    );
  }

  getBusinessLayer(architectureId: string): Observable<BusinessLayer | null> {
    return this.businessApi.getBusinessLayer({ architectureId }).pipe(
      catchError(error => {
        console.error(`Error fetching business layer for ${architectureId}:`, error);
        return of(null);
      })
    );
  }

  getApplicationLayer(architectureId: string): Observable<ApplicationLayer | null> {
    return this.applicationApi.getApplicationLayer({ architectureId }).pipe(
      catchError(error => {
        console.error(`Error fetching application layer for ${architectureId}:`, error);
        return of(null);
      })
    );
  }

  getTechnologyLayer(architectureId: string): Observable<TechnologyLayer | null> {
    return this.technologyApi.getTechnologyLayer({ architectureId }).pipe(
      catchError(error => {
        console.error(`Error fetching technology layer for ${architectureId}:`, error);
        return of(null);
      })
    );
  }

  getBusinessActors(architectureId: string): Observable<BusinessActor[]> {
    return this.businessApi.getBusinessActors({ architectureId }).pipe(
      catchError(error => {
        console.error(`Error fetching business actors for ${architectureId}:`, error);
        return of([]);
      })
    );
  }

  validateArchitecture(id: string): Observable<any> {
    return this.architectureApi.validateArchitecture({ id }).pipe(
      catchError(error => {
        console.error(`Error validating architecture ${id}:`, error);
        return of({ valid: false, errors: ['Connection error'] });
      })
    );
  }

  reloadModels(): Observable<Architecture[]> {
    return this.architectureApi.reloadModelsFromFiles().pipe(
      catchError(error => {
        console.error('Error reloading models:', error);
        return of([]);
      })
    );
  }

  testConnection(): Observable<boolean> {
    return this.getAllArchitectures().pipe(
      map(architectures => {
        console.log('Connection test - received:', architectures);
        return Array.isArray(architectures);
      }),
      catchError((error) => {
        console.error('Connection test failed:', error);
        return of(false);
      })
    );
  }

  // Helper method to test raw HTTP connection
  testRawConnection(): Observable<any> {
    return this.http.get(`${this.apiConfig.baseUrl}/api/v1/architectures`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError(error => {
        console.error('Raw connection test failed:', error);
        return of({ error: 'Connection failed', details: error });
      })
    );
  }
}