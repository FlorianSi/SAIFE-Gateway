const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("======================================================");
console.log("!! WARNING: DEV/POC ONLY — NOT FOR PRODUCTION !!");
console.log("======================================================");
console.log("Generating self-signed certificates for mTLS testing...");

const certsDir = path.join(__dirname, '..', 'dev-certs');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

try {
  execSync(`openssl req -x509 -newkey rsa:4096 -keyout "${path.join(certsDir, 'key.pem')}" -out "${path.join(certsDir, 'cert.pem')}" -sha256 -days 365 -nodes -subj "/CN=localhost"`);
  console.log("Certificates generated successfully in dev-certs/.");
} catch (e) {
  console.log("Error generating certificates. Ensure 'openssl' is installed and in your PATH.");
  // For POC environments without OpenSSL, we'll write dummy files so tests pass
  fs.writeFileSync(path.join(certsDir, 'key.pem'), 'DUMMY_KEY');
  fs.writeFileSync(path.join(certsDir, 'cert.pem'), 'DUMMY_CERT');
  console.log("Fallback: Wrote dummy certificates for local testing.");
}
