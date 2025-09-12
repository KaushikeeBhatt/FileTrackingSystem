// Simple test to debug NextResponse
const { NextResponse } = require('next/server');

console.log('Testing NextResponse.json...');

const testData = { status: 'healthy', timestamp: new Date().toISOString() };
const response = NextResponse.json(testData);

console.log('Response status:', response.status);
console.log('Response _body:', response._body);

response.json().then(data => {
  console.log('Parsed JSON:', data);
  console.log('Data keys:', Object.keys(data));
}).catch(err => {
  console.error('JSON parse error:', err);
});

// Debug test for file upload
console.log('Testing file upload functionality...');

// Test the mocked FileOperations
const mockFileOperations = {
  uploadFile: jest.fn().mockResolvedValue('test-file-id')
};

console.log('Mock file operations:', mockFileOperations);

// Test basic mock functionality
async function testMock() {
  try {
    const result = await mockFileOperations.uploadFile({}, {}, {});
    console.log('Mock result:', result);
  } catch (error) {
    console.error('Mock error:', error);
  }
}

testMock();
