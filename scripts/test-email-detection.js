// Simple test script to verify email detection functionality
function isEmail(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(input)
}

// Test cases
const testCases = [
  // Valid emails
  { input: 'test@example.com', expected: true, description: 'Valid email' },
  { input: 'user.name@domain.co.uk', expected: true, description: 'Email with dots and country domain' },
  { input: 'test+tag@example.org', expected: true, description: 'Email with plus sign' },
  { input: '123@456.com', expected: true, description: 'Numeric email' },
  
  // Usernames (should be false)
  { input: 'username', expected: false, description: 'Simple username' },
  { input: 'user_name', expected: false, description: 'Username with underscore' },
  { input: 'user123', expected: false, description: 'Username with numbers' },
  { input: 'test-user', expected: false, description: 'Username with dash' },
  
  // Invalid emails (should be false)
  { input: 'test@', expected: false, description: 'Incomplete email (missing domain)' },
  { input: '@example.com', expected: false, description: 'Incomplete email (missing user)' },
  { input: 'test.example.com', expected: false, description: 'Missing @ symbol' },
  { input: 'test @example.com', expected: false, description: 'Email with space' },
  { input: '', expected: false, description: 'Empty string' },
]

console.log('Testing email detection function...\n')

let passed = 0
let failed = 0

testCases.forEach((testCase, index) => {
  const result = isEmail(testCase.input)
  const success = result === testCase.expected
  
  if (success) {
    passed++
    console.log(`✅ Test ${index + 1}: ${testCase.description} - PASSED`)
  } else {
    failed++
    console.log(`❌ Test ${index + 1}: ${testCase.description} - FAILED`)
    console.log(`   Input: "${testCase.input}"`)
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`)
  }
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)

if (failed === 0) {
  console.log('🎉 All tests passed!')
} else {
  console.log('⚠️  Some tests failed.')
  process.exit(1)
}
