const encoder = new TextEncoder();

const JWT_SECRET = process.env.JWT_SECRET || 'ionetweb-super-secret-key-1234567890';

// Convert ArrayBuffer to Hex String
function bufToHex(buf) {
  return Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Convert Hex String to ArrayBuffer
function hexToBuf(hex) {
  const matched = hex.match(/.{1,2}/g);
  if (!matched) return new ArrayBuffer(0);
  const bytes = new Uint8Array(matched.map(byte => parseInt(byte, 16)));
  return bytes.buffer;
}

export async function signToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours validity
  });

  const secretBuf = encoder.encode(JWT_SECRET);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const dataBuf = encoder.encode(data);
  const signatureBuf = await crypto.subtle.sign('HMAC', cryptoKey, dataBuf);
  const signature = bufToHex(signatureBuf);

  // Return base64url data + hex signature
  const base64Data = btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64Data}.${signature}`;
}

export async function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [base64Data, signature] = parts;
  try {
    // Decode base64url data
    const paddedBase64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(paddedBase64);
    const payload = JSON.parse(jsonStr);

    if (payload.exp < Date.now()) {
      return null; // Expired
    }

    const secretBuf = encoder.encode(JWT_SECRET);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const dataBuf = encoder.encode(jsonStr);
    const signatureBuf = hexToBuf(signature);

    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, signatureBuf, dataBuf);
    if (!isValid) return null;

    return payload;
  } catch (e) {
    console.error('verifyToken error:', e);
    return null;
  }
}
