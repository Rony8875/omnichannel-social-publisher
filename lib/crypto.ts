import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET_KEY || "omnichannel_social_publisher_secret_key_2026";
  // Always derive a strictly 32-byte key using sha256
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt a plain-text access token or secret using AES-256-GCM.
 * Output format: iv_hex:authTag_hex:ciphertext_hex
 */
export function encryptToken(token: string): string {
  if (!token) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted payload back to the plain-text token.
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  if (!encryptedPayload.includes(":")) {
    // If token wasn't encrypted yet (legacy token), return as is
    return encryptedPayload;
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    return encryptedPayload;
  }

  const [ivHex, authTagHex, encryptedText] = parts;
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err: any) {
    console.error("Token decryption failed:", err.message);
    return encryptedPayload;
  }
}
