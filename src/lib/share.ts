const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBinaryString = (value: Uint8Array) =>
  Array.from(value, (byte) => String.fromCharCode(byte)).join('');

const fromBinaryString = (value: string) =>
  Uint8Array.from(value, (char) => char.charCodeAt(0));

export const encodeSharePayload = (payload: unknown) => {
  const json = JSON.stringify(payload);
  const base64 = btoa(toBinaryString(textEncoder.encode(json)));

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const decodeSharePayload = <T,>(encodedPayload: string): T => {
  const normalized = encodedPayload
    .trim()
    .replace(/ /g, '+')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = `${normalized}${'='.repeat(padding)}`;
  const binary = atob(padded);

  return JSON.parse(textDecoder.decode(fromBinaryString(binary))) as T;
};
