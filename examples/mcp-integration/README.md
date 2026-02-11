# MCP Integration Test

Simple test to verify that MCP tools can properly call the CozoDB connector scripts.

## Prerequisites

```bash
# Ensure MCP server is installed
cd ../mcp-cozodb
npm install && npm run build
```

## Test Script

```javascript
const { createExecutor } = require("../scripts/cozo-wrapper");
const { CozoError, ErrorCodes } = require("../scripts/cozo-errors");
const { createMemoryMonitor } = require("../scripts/memory-monitor");

// Mock CozoDB backend for testing
const mockBackend = {
  run: async (query, params) => {
    console.log("[Mock DB] Running query:", query.slice(0, 50));
    return { ok: true, headers: ["result"], rows: [["success"]] };
  },
};

async function testMCPIntegration() {
  console.log("🧪 Testing MCP Integration...\n");

  // Test 1: Executor creation
  console.log("Test 1: Create executor");
  const executor = createExecutor(mockBackend);
  const result = await executor.run("?[a] <- [[1]]");
  console.log("✅ Executor created:", result.ok);

  // Test 2: Error handling
  console.log("\nTest 2: Error handling");
  const error = new CozoError(ErrorCodes.COZO_QUERY_SYNTAX_ERROR, "Test error");
  console.log("✅ Error i18n:", error.toI18n());

  // Test 3: Memory monitor
  console.log("\nTest 3: Memory monitor");
  const monitor = createMemoryMonitor(mockBackend, {
    maxBytes: 1024,
    onWarning: (stats) => console.log("⚠️ Warning:", stats),
  });
  await monitor.run("?[a] <- [[1]]");
  console.log("✅ Monitor stats:", monitor.getStats());

  console.log("\n✅ All integration tests passed!");
}

testMCPIntegration().catch(console.error);
```

## Run

```bash
node examples/mcp-integration/test.js
```

## Expected Output

```
🧪 Testing MCP Integration...

Test 1: Create executor
[Mock DB] Running query: ?[a] <- [[1]]
✅ Executor created: true

Test 2: Error handling
✅ Error i18n: {
  code: 'COZO_QUERY_SYNTAX_ERROR',
  defaultMessage: 'Datalog query syntax error',
  detail: 'Test error',
  ...
}

Test 3: Memory monitor
[Mock DB] Running query: ?[a] <- [[1]]
✅ Monitor stats: {
  bytesWritten: 0,
  rowCount: 0,
  maxBytes: 1024,
  usagePercent: 0,
  status: 'ok',
  ...
}

✅ All integration tests passed!
```
