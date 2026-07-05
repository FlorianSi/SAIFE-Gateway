const fs = require('fs');
const crypto = require('crypto');

function verifyChain(logFilePath) {
  if (!fs.existsSync(logFilePath)) {
    console.error("Log file not found:", logFilePath);
    process.exit(1);
  }

  const lines = fs.readFileSync(logFilePath, 'utf-8').split('\n').filter(l => l.trim() !== '');
  let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  console.log(`Verifying ${lines.length} audit log entries...`);

  for (let i = 0; i < lines.length; i++) {
    const entry = JSON.parse(lines[i]);
    
    if (entry.previousHash !== expectedPrevHash) {
      console.error(`❌ Chain broken at entry ${i}! Expected previous hash: ${expectedPrevHash}, but got: ${entry.previousHash}`);
      process.exit(1);
    }

    const { hash, ...dataWithoutHash } = entry;
    const computedHash = crypto.createHash('sha256').update(JSON.stringify(dataWithoutHash)).digest('hex');

    if (computedHash !== hash) {
      console.error(`❌ Hash mismatch at entry ${i}! Data has been tampered with.`);
      process.exit(1);
    }

    expectedPrevHash = hash;
  }

  console.log("✅ Audit chain is intact and cryptographically verified.");
}

const targetFile = process.argv[2];
if (!targetFile) {
  console.log("Usage: node verify-audit-chain.js <path-to-audit.jsonl>");
  process.exit(1);
}

verifyChain(targetFile);
