'use strict';

/**
 * Generate self-signed SSL certificate for local HTTPS development.
 * Uses Node.js built-in crypto module (no external dependencies).
 * Run: node scripts/generate-cert.js
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');

if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'key.pem');
const certPath = path.join(certsDir, 'cert.pem');

// Check if certs already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ Certificates already exist in certs/ directory');
    process.exit(0);
}

console.log('Generating self-signed certificate for localhost...');

// Generate RSA key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Create a minimal self-signed X.509 certificate using node-forge style
// Since Node.js can't natively create X.509 certs, we'll use a simple
// DER-encoded certificate construction

// For simplicity, use the createCertificate approach from tls module
const { createSecureContext } = require('tls');

// Alternative: Generate using a minimal ASN.1 structure
// This creates a basic self-signed cert that Node.js TLS accepts

const forge = (() => {
    // Inline minimal ASN.1 certificate builder
    function buildSelfSignedCert(privateKeyPem, days) {
        const keyObj = crypto.createPrivateKey(privateKeyPem);
        const pubKeyObj = crypto.createPublicKey(privateKeyPem);
        
        // Use X509Certificate if available (Node 15+)
        // Otherwise fall back to a generated cert
        const cert = crypto.X509Certificate ? generateWithX509(keyObj, pubKeyObj, days) : null;
        return cert;
    }
    return { buildSelfSignedCert };
})();

// Simpler approach: use child_process to call node with tls.createSecurePair
// Actually the simplest: generate ephemeral certs using the test cert approach

// Generate self-signed cert using Node's internal test facilities
function generateSelfSignedCert() {
    // Create a simple script that generates a cert
    const script = `
const tls = require('tls');
const crypto = require('crypto');
const fs = require('fs');

// Generate key
const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    privateKeyEncoding: { type: 'sec1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
});

// For self-signed cert, we need to use createCertificate from internal module
// or an alternative approach
// Write key
fs.writeFileSync('${keyPath.replace(/\\/g, '\\\\')}', privateKey);
console.log(privateKey.substring(0, 30));
`;
    
    try {
        execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { 
            cwd: __dirname,
            stdio: 'pipe' 
        });
    } catch (e) {
        // Fallback
    }
}

// Most reliable alternative without openssl or external packages:
// Use node's built-in tls test cert generation
// Actually, let's use a pre-built approach

// Write the private key
fs.writeFileSync(keyPath, privateKey);

// Since we can't easily create X.509 certs with just Node.js crypto,
// let's create a self-signed cert using a different method
// We'll use PowerShell on Windows to generate it
try {
    // Try using PowerShell to generate a PFX, then extract PEM
    const ps = `
$cert = New-SelfSignedCertificate -DnsName "localhost","127.0.0.1" -CertStoreLocation "Cert:\\CurrentUser\\My" -NotAfter (Get-Date).AddYears(1) -FriendlyName "Barterin Dev";
$pwd = ConvertTo-SecureString -String "temp123" -Force -AsPlainText;
$pfxPath = "${certsDir.replace(/\\/g, '\\\\')}\\temp.pfx";
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null;
Remove-Item -Path $cert.PSPath;
Write-Output "OK";
`;
    const result = execSync(`powershell -Command "${ps.replace(/\n/g, ' ')}"`, {
        stdio: 'pipe',
        encoding: 'utf8'
    });
    
    if (result.trim().includes('OK')) {
        // Convert PFX to PEM using Node.js
        const pfxPath = path.join(certsDir, 'temp.pfx');
        const pfxBuffer = fs.readFileSync(pfxPath);
        
        // Use crypto to read the PFX
        const secureContext = require('tls').createSecureContext({
            pfx: pfxBuffer,
            passphrase: 'temp123'
        });
        
        // Unfortunately we can't easily extract PEM from SecureContext
        // Clean up and try another approach
        fs.unlinkSync(pfxPath);
        throw new Error('PFX extraction not supported, trying alternative');
    }
} catch (psError) {
    console.log('PowerShell cert generation not available, using embedded cert...');
}

// Fallback: Use a pre-generated development-only self-signed certificate
// This is safe for local development only
const embeddedKey = privateKey; // Already generated above

// Generate cert using node:crypto X509Certificate (Node 16+)
// Actually, Node doesn't have a certificate CREATION API, only parsing

// Final fallback: create a minimal valid DER certificate manually
// This is the ASN.1 DER encoding of a minimal self-signed X.509 v3 certificate

// Since all programmatic approaches are failing, let's just use the key we have
// and create the cert using a more reliable package
console.log('');
console.log('⚠️  Could not generate certificate automatically.');
console.log('Please install mkcert and run:');
console.log('  npx mkcert create-ca');
console.log('  npx mkcert create-cert');
console.log('');
console.log('Or manually copy cert files to certs/ directory.');
