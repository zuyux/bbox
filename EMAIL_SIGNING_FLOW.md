# Email Signing Encryption Flow

This document explains how BBOXX's Email Signing account flow protects wallet material and how it is restored for signing.

## Purpose

Email Signing lets a user create or restore a BBOXX-managed wallet with an email address and password. The password is used as the wallet encryption passphrase. The email verification step proves control of the email address before the encrypted wallet backup is saved.

## Main Components

- `components/PasswordInput.tsx`: collects email, verification code, and password during account creation.
- `components/GetInModal.tsx`: creates the normal Email Signing wallet account.
- `app/wallet/page.tsx`: can create the same passkey account when a connected wallet user needs a locally managed wallet to generate Bitcoin/Rootstock/Liquid receive addresses.
- `lib/encryptedStorage.ts`: encrypts/decrypts wallet secrets with AES using a PBKDF2-derived key.
- `app/api/auth/email-code/request/route.ts`: creates and emails a 6-digit verification code.
- `app/api/auth/email-code/verify/route.ts`: verifies the code and returns a short-lived verified email token.
- `app/api/save-account/route.ts`: stores the encrypted wallet backup and passkey hash in Supabase.
- `app/api/wallet-connect/login/route.ts`: loads the encrypted backup, decrypts it with the submitted password, verifies the passkey hash, and returns the unlocked wallet.

## Creation Flow

1. The user enters an email address in the Email Signing creation UI.
2. The client calls `POST /api/auth/email-code/request`.
3. The server normalizes the email, checks for duplicate profile/account records, creates a 6-digit code, hashes it with SHA-256, and stores the hash in `email_verification_codes`.
4. The server emails the raw 6-digit code to the user. The code expires after 10 minutes.
5. The user enters the code.
6. The client calls `POST /api/auth/email-code/verify`.
7. The server hashes the submitted code and compares it to the latest stored hash. If valid, the code is marked consumed and the server returns a signed `verifiedEmailToken`.
8. The client generates a new Stacks wallet locally with `createStacksAccount`.
9. The client calls `createEncryptedWallet(walletData, password)`.
10. `lib/encryptedStorage.ts` derives an encryption key from the password:

```text
key = PBKDF2(password, randomSalt, SHA-256, 10,000 iterations, 256-bit key)
```

11. The mnemonic and private key are encrypted separately with AES-256-CBC using the derived key and random IV.
12. The encrypted wallet snapshot is stored locally in `localStorage` under the encrypted session key.
13. The client reads the encrypted snapshot with `getStoredEncryptedWallet`.
14. The client calls `POST /api/save-account` with:

- normalized email
- verified email token
- wallet address
- encrypted mnemonic
- encrypted private key
- salt
- IV
- encryption version
- derived receive addresses
- private key as `passkey`
- password as `passphrase`

15. The server validates the verified email token and rejects duplicate emails.
16. The server creates a passkey hash:

```text
passkeyHash = SHA256(privateKey + password)
```

17. Supabase stores the encrypted wallet payload and `passkeyHash` in `connected_accounts`. The plaintext password, mnemonic, and private key are not stored.

## Stored Data

The `connected_accounts` row stores:

- `email`: normalized user email
- `address`: Stacks address
- `passkey`: `SHA256(privateKey + password)`
- `encrypted_private_key`: AES-encrypted private key
- `encrypted_mnemonic`: AES-encrypted mnemonic
- `encryption_salt`: PBKDF2 salt
- `encryption_iv`: AES IV
- `encryption_version`: encryption format version
- `wallet_label`
- `bitcoin_address`
- `rootstock_address`
- `liquid_address`

The local browser stores a similar encrypted wallet snapshot plus session metadata.

## Login / Unlock Flow

1. The user enters email and password.
2. The client calls `POST /api/wallet-connect/login`.
3. The server loads the matching `connected_accounts` row by email.
4. The server rebuilds a portable encrypted wallet payload from the stored encrypted fields.
5. The server derives the AES key from the submitted password and stored salt.
6. The server decrypts the mnemonic and private key.
7. The server recomputes:

```text
SHA256(decryptedPrivateKey + submittedPassword)
```

8. If the hash matches the stored `passkey`, the password is accepted.
9. The server returns the unlocked wallet payload to the client.
10. The client stores the wallet again locally with `createEncryptedWallet(unlockedWallet, password)` so later signing/address generation can use the local encrypted wallet flow.

## Address Generation Flow

For Bitcoin, Rootstock, or Liquid address generation, the app needs the wallet private key.

- If a local encrypted wallet exists, the user is prompted for the wallet password. The browser decrypts the local wallet and derives/saves the requested address.
- If no local encrypted wallet exists, the app prompts the user to create an Email Signing passkey account with email verification and password. After the account is created, the app immediately generates the requested address from the newly created local wallet.

## Security Properties

- Email ownership is verified before account creation.
- Verification codes are stored hashed, expire after 10 minutes, and are consumed after successful verification.
- Verified email tokens are HMAC-signed and short-lived.
- Supabase stores encrypted wallet secrets, not plaintext mnemonic/private key values.
- Wallet encryption uses random salt and IV values per wallet.
- The password is required to decrypt the encrypted wallet backup.
- The passkey hash gives the server a second check that the decrypted private key and password match the stored account.

## Important Trust Boundary

The current login and account-save APIs receive sensitive material over HTTPS:

- `POST /api/save-account` receives the password and private key so it can compute `SHA256(privateKey + password)`.
- `POST /api/wallet-connect/login` receives the password, decrypts the encrypted wallet server-side, and returns the plaintext wallet payload to the client.

That means the backend is currently trusted during account creation and login. The database does not store plaintext secrets, but the API process can observe them during these requests. A stricter end-to-end encryption model would keep decryption and passkey-hash computation entirely in the browser and only send encrypted wallet data plus verification proofs to the server.

