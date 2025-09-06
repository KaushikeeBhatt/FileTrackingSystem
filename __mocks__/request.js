// Mock Request class
class RequestMock {
  constructor(url, options = {}) {
    this.url = url;
    this.method = options.method || 'GET';
    this.headers = new Map();
    this.body = options.body;
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }

  async json() {
    return JSON.parse(this.body || '{}');
  }

  text() {
    return Promise.resolve(this.body || '');
  }
}

global.Request = RequestMock;
