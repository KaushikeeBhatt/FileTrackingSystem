// Simple debug test to check NextResponse mock
const { NextResponse } = require('./jest.setup.js');

console.log('Testing NextResponse.json...');

const testData = { status: 'healthy', timestamp: new Date().toISOString() };
const response = NextResponse.json(testData);

console.log('Response status:', response.status);
console.log('Response body:', response._body);

response.json().then(data => {
  console.log('Parsed JSON:', data);
}).catch(err => {
  console.error('JSON parse error:', err);
});
