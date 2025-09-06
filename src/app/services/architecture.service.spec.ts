import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ArchitectureService } from './architecture.service';
import { 
  ArchitectureService as GeneratedArchitectureService,
  ApplicationLayerService,
  BusinessLayerService,
  TechnologyLayerService,
  Architecture
} from '../../generated/api';

describe('ArchitectureService', () => {
  let service: ArchitectureService;
  let httpMock: HttpTestingController;
  
  const mockArchitecture: Architecture = {
    uid: 'test-arch-1',
    name: 'Test Architecture',
    description: 'A test architecture model',
    version: '1.0.0'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ArchitectureService,
        GeneratedArchitectureService,
        ApplicationLayerService,
        BusinessLayerService,
        TechnologyLayerService
      ]
    });
    
    service = TestBed.inject(ArchitectureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all architectures', (done) => {
    const mockArchitectures = [mockArchitecture];
    
    service.getAllArchitectures().subscribe(architectures => {
      expect(architectures).toEqual(mockArchitectures);
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/architectures');
    expect(req.request.method).toBe('GET');
    req.flush(mockArchitectures);
  });

  it('should fetch architecture by ID', (done) => {
    const architectureId = 'test-arch-1';
    
    service.getArchitectureById(architectureId).subscribe(architecture => {
      expect(architecture).toEqual(mockArchitecture);
      done();
    });

    const req = httpMock.expectOne(`http://localhost:8080/api/v1/architectures/${architectureId}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockArchitecture);
  });

  it('should handle errors when fetching architectures', (done) => {
    service.getAllArchitectures().subscribe(architectures => {
      expect(architectures).toEqual([]);
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/architectures');
    req.error(new ProgressEvent('Network error'));
  });

  it('should test API connection', (done) => {
    service.testConnection().subscribe(isConnected => {
      expect(isConnected).toBe(true);
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/architectures');
    req.flush([]);
  });

  it('should return false for test connection on error', (done) => {
    service.testConnection().subscribe(isConnected => {
      expect(isConnected).toBe(false);
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/architectures');
    req.error(new ProgressEvent('Network error'));
  });

  it('should validate architecture', (done) => {
    const architectureId = 'test-arch-1';
    const mockValidationResult = { valid: true, errors: [], warnings: [] };
    
    service.validateArchitecture(architectureId).subscribe(result => {
      expect(result).toEqual(mockValidationResult);
      done();
    });

    const req = httpMock.expectOne(`http://localhost:8080/api/v1/architectures/${architectureId}/validate`);
    expect(req.request.method).toBe('POST');
    req.flush(mockValidationResult);
  });

  it('should reload models', (done) => {
    const mockArchitectures = [mockArchitecture];
    
    service.reloadModels().subscribe(architectures => {
      expect(architectures).toEqual(mockArchitectures);
      done();
    });

    const req = httpMock.expectOne('http://localhost:8080/api/v1/architectures/reload');
    expect(req.request.method).toBe('POST');
    req.flush(mockArchitectures);
  });
});