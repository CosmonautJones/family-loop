import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const MAGIC = Buffer.from('LOOPEDIN-BACKUP\0', 'utf8');
const ITERATIONS = 310_000;

function requirePassphrase() {
  const passphrase = process.env.LOOPEDIN_BACKUP_PASSPHRASE;
  if (!passphrase || passphrase.length < 16) {
    throw new Error('LOOPEDIN_BACKUP_PASSPHRASE must contain at least 16 characters.');
  }
  return passphrase;
}

function deriveKey(passphrase, salt) {
  return pbkdf2Sync(passphrase, salt, ITERATIONS, 32, 'sha256');
}

async function encrypt(inputPath, outputPath) {
  const plaintext = await readFile(inputPath);
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(requirePassphrase(), salt), nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  await writeFile(outputPath, Buffer.concat([MAGIC, salt, nonce, tag, ciphertext]));
  process.stdout.write(`Encrypted backup written (${ciphertext.length} payload bytes).\n`);
}

async function decrypt(inputPath, outputPath) {
  const encrypted = await readFile(inputPath);
  if (!encrypted.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Backup header is invalid.');
  }
  let offset = MAGIC.length;
  const salt = encrypted.subarray(offset, offset += 16);
  const nonce = encrypted.subarray(offset, offset += 12);
  const tag = encrypted.subarray(offset, offset += 16);
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(requirePassphrase(), salt), nonce);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(encrypted.subarray(offset)), decipher.final()]);
  await writeFile(outputPath, plaintext);
  process.stdout.write(`Backup authenticated and decrypted (${plaintext.length} bytes).\n`);
}

async function hash(inputPath) {
  const digest = createHash('sha256').update(await readFile(inputPath)).digest('hex');
  process.stdout.write(`${digest}\n`);
}

const [command, inputPath, outputPath] = process.argv.slice(2);

try {
  if (command === 'encrypt' && inputPath && outputPath) await encrypt(inputPath, outputPath);
  else if (command === 'decrypt' && inputPath && outputPath) await decrypt(inputPath, outputPath);
  else if (command === 'hash' && inputPath && !outputPath) await hash(inputPath);
  else throw new Error('Usage: local-backup-crypto.mjs <encrypt|decrypt|hash> <input> [output]');
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
