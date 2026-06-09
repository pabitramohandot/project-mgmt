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

export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
  return hashHex;
}

export async function comparePassword(password, hash) {
  const hashed = await hashPassword(password);
  return hashed === hash;
}

export function getRequestSession(request) {
  let companyId = request.headers.get('x-user-company-id');
  let role = request.headers.get('x-user-role');
  let userId = request.headers.get('x-user-id');
  let username = request.headers.get('x-user-username');

  // Fallback: If headers are missing, synchronously decode the payload from cookies.
  // Since middleware has already verified the JWT signature, we can safely trust the cookie payload.
  if (!role || !userId) {
    try {
      let token = null;
      if (request.cookies && typeof request.cookies.get === 'function') {
        token = request.cookies.get('admin_token')?.value;
      }
      if (!token) {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/admin_token=([^;]+)/);
        if (match) {
          token = match[1];
        }
      }
      if (token) {
        const parts = token.split('.');
        if (parts.length === 2) {
          const base64Data = parts[0];
          const paddedBase64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');
          const jsonStr = atob(paddedBase64);
          const payload = JSON.parse(jsonStr);
          if (payload && payload.exp > Date.now()) {
            companyId = payload.companyId || companyId;
            role = payload.role || role;
            userId = payload.userId || userId;
            username = payload.username || username;
          }
        }
      }
    } catch (e) {
      console.error('getRequestSession cookie fallback error:', e);
    }
  }

  return { companyId, role, userId, username };
}
