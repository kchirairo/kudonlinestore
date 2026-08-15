import { PaymentGatewayConfig } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const VAULT_SALT = 'KUD_STORE_AES_256_KEY_VAULT_SEED';

/**
 * Encrypts a sensitive string API key using XOR character-shifting + Base64 encoding.
 * Returns the encrypted string prefixed with 'enc_v1:'.
 */
export function encryptApiKey(plainTextKey: string): string {
  if (!plainTextKey || plainTextKey.startsWith('enc_v1:') || plainTextKey.startsWith('enc_v2:')) {
    return plainTextKey;
  }

  try {
    let shifted = '';
    for (let i = 0; i < plainTextKey.length; i++) {
      shifted += String.fromCharCode(plainTextKey.charCodeAt(i) ^ VAULT_SALT.charCodeAt(i % VAULT_SALT.length));
    }
    return `enc_v1:${btoa(shifted)}`;
  } catch (err) {
    console.warn('Key encryption error:', err);
    return plainTextKey;
  }
}

/**
 * Decrypts an encrypted API key starting with 'enc_v1:' or 'enc_v2:' back to plaintext.
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey || (!encryptedKey.startsWith('enc_v1:') && !encryptedKey.startsWith('enc_v2:'))) {
    return encryptedKey;
  }

  try {
    if (encryptedKey.startsWith('enc_v1:')) {
      const rawShifted = atob(encryptedKey.replace('enc_v1:', ''));
      let original = '';
      for (let i = 0; i < rawShifted.length; i++) {
        original += String.fromCharCode(rawShifted.charCodeAt(i) ^ VAULT_SALT.charCodeAt(i % VAULT_SALT.length));
      }
      return original;
    }
    
    if (encryptedKey.startsWith('enc_v2:')) {
      // Basic v2 base64 decode fallback
      return atob(encryptedKey.replace('enc_v2:', ''));
    }

    return encryptedKey;
  } catch (err) {
    console.warn('Key decryption error:', err);
    return encryptedKey;
  }
}

/**
 * Utility function to encrypt all secret fields in a PaymentGatewayConfig object
 * before persisting to database or localStorage.
 * Supports calling Supabase Edge Function 'encrypt-gateway-keys' if provisioned,
 * with seamless client-side encryption fallback.
 */
export async function encryptGatewayPayloadAsync(config: PaymentGatewayConfig): Promise<PaymentGatewayConfig> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('encrypt-gateway-keys', {
        body: { config },
      });

      if (!error && data?.encryptedConfig) {
        return data.encryptedConfig;
      }
    } catch (edgeErr) {
      console.info('Supabase Edge Function fallback active:', edgeErr);
    }
  }

  // Client-side encryption fallback
  return encryptGatewayPayload(config);
}

/**
 * Synchronous client-side encryption helper
 */
export function encryptGatewayPayload(config: PaymentGatewayConfig): PaymentGatewayConfig {
  return {
    ...config,
    yoco: config.yoco
      ? {
          ...config.yoco,
          secretKey: encryptApiKey(config.yoco.secretKey),
        }
      : config.yoco,
    payfast: config.payfast
      ? {
          ...config.payfast,
          merchantKey: encryptApiKey(config.payfast.merchantKey),
          passphrase: encryptApiKey(config.payfast.passphrase),
        }
      : config.payfast,
    ozow: config.ozow
      ? {
          ...config.ozow,
          privateKey: encryptApiKey(config.ozow.privateKey),
        }
      : config.ozow,
  };
}

/**
 * Utility function to decrypt all secret fields in a PaymentGatewayConfig object.
 */
export function decryptGatewayPayload(config: PaymentGatewayConfig): PaymentGatewayConfig {
  return {
    ...config,
    yoco: config.yoco
      ? {
          ...config.yoco,
          secretKey: decryptApiKey(config.yoco.secretKey),
        }
      : config.yoco,
    payfast: config.payfast
      ? {
          ...config.payfast,
          merchantKey: decryptApiKey(config.payfast.merchantKey),
          passphrase: decryptApiKey(config.payfast.passphrase),
        }
      : config.payfast,
    ozow: config.ozow
      ? {
          ...config.ozow,
          privateKey: decryptApiKey(config.ozow.privateKey),
        }
      : config.ozow,
  };
}

