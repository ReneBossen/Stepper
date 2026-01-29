import { supabaseConfig, apiConfig, validateConfig } from '../supabase.config';

describe('supabaseConfig', () => {
  it('should export correct Supabase URL', () => {
    expect(supabaseConfig.url).toBe('https://test.supabase.co');
  });

  it('should export correct Supabase anon key', () => {
    expect(supabaseConfig.anonKey).toBe('test-anon-key');
  });

  it('should have all required config properties', () => {
    expect(supabaseConfig).toHaveProperty('url');
    expect(supabaseConfig).toHaveProperty('anonKey');
  });

  it('should export string values', () => {
    expect(typeof supabaseConfig.url).toBe('string');
    expect(typeof supabaseConfig.anonKey).toBe('string');
  });
});

describe('apiConfig', () => {
  it('should export correct API base URL', () => {
    expect(apiConfig.baseUrl).toBe('http://localhost:5000');
  });

  it('should have default timeout of 30 seconds', () => {
    expect(apiConfig.timeout).toBe(30000);
  });

  it('should have all required config properties', () => {
    expect(apiConfig).toHaveProperty('baseUrl');
    expect(apiConfig).toHaveProperty('timeout');
  });

  it('should have correct types', () => {
    expect(typeof apiConfig.baseUrl).toBe('string');
    expect(typeof apiConfig.timeout).toBe('number');
  });

  it('should have positive timeout', () => {
    expect(apiConfig.timeout).toBeGreaterThan(0);
  });
});

describe('validateConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when all required config is present', () => {
    const result = validateConfig();

    expect(result).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('should validate that config is defined', () => {
    expect(supabaseConfig).toBeDefined();
    expect(supabaseConfig.url).toBeDefined();
    expect(supabaseConfig.anonKey).toBeDefined();
    expect(apiConfig).toBeDefined();
    expect(apiConfig.baseUrl).toBeDefined();
  });

  it('should validate URL format is a string', () => {
    expect(typeof supabaseConfig.url).toBe('string');
    expect(supabaseConfig.url.length).toBeGreaterThan(0);
  });

  it('should validate anon key format is a string', () => {
    expect(typeof supabaseConfig.anonKey).toBe('string');
    expect(supabaseConfig.anonKey.length).toBeGreaterThan(0);
  });

  it('should validate timeout is a number', () => {
    expect(typeof apiConfig.timeout).toBe('number');
  });

  it('should validate timeout is positive', () => {
    expect(apiConfig.timeout).toBeGreaterThan(0);
  });

  it('should export validateConfig as a function', () => {
    expect(typeof validateConfig).toBe('function');
  });

  it('should validate config returns boolean', () => {
    const result = validateConfig();
    expect(typeof result).toBe('boolean');
  });
});
