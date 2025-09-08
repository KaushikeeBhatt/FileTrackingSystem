// Simple test to debug NextResponse mock
const { NextResponse } = require('next/server');

console.log('Testing NextResponse mock...');

// Test 1: Direct NextResponse.json call
const response1 = NextResponse.json({ success: true, test: 'data' });
console.log('Response 1 created:', response1);
console.log('Response 1 _body:', response1._body);

// Test 2: Call json() method
response1.json().then(data => {
  console.log('Response 1 json() result:', data);
}).catch(err => {
  console.error('Response 1 json() error:', err);
});

// Test 3: Test with error response
const response2 = NextResponse.json({ success: false, error: 'test error' }, { status: 500 });
console.log('Response 2 created:', response2);
console.log('Response 2 _body:', response2._body);

response2.json().then(data => {
  console.log('Response 2 json() result:', data);
}).catch(err => {
  console.error('Response 2 json() error:', err);
});
