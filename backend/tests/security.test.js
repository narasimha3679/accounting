const assert = require('assert');
const { escapeHtml } = require('../src/utils/security');

console.log('Running security tests...');

// Test 1: Basic string
assert.strictEqual(escapeHtml('Hello World'), 'Hello World', 'Basic string failed');

// Test 2: HTML tags
assert.strictEqual(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;', 'HTML tags failed');

// Test 3: Attributes
assert.strictEqual(escapeHtml('" onmouseover="alert(1)'), '&quot; onmouseover=&quot;alert(1)', 'Attributes failed');

// Test 4: Single quotes
assert.strictEqual(escapeHtml("' OR '1'='1"), '&#039; OR &#039;1&#039;=&#039;1', 'Single quotes failed');

// Test 5: Ampersand
assert.strictEqual(escapeHtml('Ben & Jerry'), 'Ben &amp; Jerry', 'Ampersand failed');

// Test 6: Null/Undefined
assert.strictEqual(escapeHtml(null), null, 'Null failed');
assert.strictEqual(escapeHtml(undefined), undefined, 'Undefined failed');

// Test 7: Empty string
assert.strictEqual(escapeHtml(''), '', 'Empty string failed');

console.log('✅ All security tests passed!');
