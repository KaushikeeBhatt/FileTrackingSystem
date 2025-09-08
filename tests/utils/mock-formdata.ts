// Mock FormData for testing
global.FormData = class {
  private data: Record<string, any> = {};
  private files: Record<string, any> = {};

  append(key: string, value: any, filename?: string) {
    if (value instanceof Blob) {
      this.files[key] = {
        name: filename || 'test.txt',
        type: value.type,
        size: value.size,
        arrayBuffer: () => value.arrayBuffer(),
        text: () => value.text()
      };
    } else {
      this.data[key] = value;
    }
  }

  get(key: string) {
    return this.data[key] || this.files[key];
  }

  entries() {
    return Object.entries({ ...this.data, ...this.files });
  }

  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }
} as any;

// Mock Blob if not available
global.Blob = class extends Blob {
  constructor(parts?: any[], options?: any) {
    super(parts || [], options);
  }
} as any;

// Mock File if not available
if (typeof File === 'undefined') {
  global.File = class extends Blob {
    name: string;
    lastModified: number;
    
    constructor(parts: any[], name: string, options: any = {}) {
      super(parts, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  } as any;
}
