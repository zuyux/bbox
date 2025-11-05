import {
  cvToValue,
  stringAsciiCV,
  uintCV,
  principalCV,
  AnchorMode,
  PostConditionMode,
  deserializeCV,
  serializeCV,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import { openContractCall } from '@stacks/connect';
import { getPersistedNetwork } from './network';
import { getApiUrl } from './stacks-api';

// BBOX Contract addresses per network
const BBOX_CONTRACTS = {
  mainnet: 'SP000000000000000000002Q6VF78.bbox', // Update with actual mainnet address when deployed
  testnet: 'ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ.bbox',
  devnet: 'ST193GXQTNHVV9WSAPHAB89M6R9QSEXZKS3N9P3DZ.bbox',
};

export function getBboxContractAddress(): string {
  const network = getPersistedNetwork();
  return BBOX_CONTRACTS[network] || BBOX_CONTRACTS.testnet;
}

export function getStacksNetwork(): typeof STACKS_MAINNET | typeof STACKS_TESTNET {
  const network = getPersistedNetwork();
  
  if (network === 'mainnet') {
    return STACKS_MAINNET;
  }
  
  // For testnet and devnet
  return STACKS_TESTNET;
}

/**
 * Parse contract address into contract address and contract name
 */
export function parseContractAddress(fullAddress: string): {
  contractAddress: string;
  contractName: string;
} {
  const [contractAddress, contractName] = fullAddress.split('.');
  return { contractAddress, contractName };
}

/**
 * Get the listing fee from the contract
 */
export async function getListingFee(): Promise<{
  token: string;
  amount: bigint;
}> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-listing-fee`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('Contract call failed:', response.status, errorText);
      throw new Error(`Failed to fetch listing fee: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the actual response for debugging
    console.log('Contract response:', JSON.stringify(data, null, 2));
    
    // Check if we got a valid result
    if (!data || !data.okay || !data.result) {
      console.warn('Invalid contract response structure:', data);
      throw new Error('Invalid response from contract');
    }
    
    // The result can be either:
    // 1. A Clarity value object with 'type' field (new format)
    // 2. A hex string starting with '0x' (raw Clarity bytes - old format)
    const result = data.result;
    
    let clarityValue;
    if (typeof result === 'string' && result.startsWith('0x')) {
      // Parse hex string to Clarity value
      console.log('📦 Parsing hex-encoded Clarity value:', result);
      try {
        clarityValue = deserializeCV(result);
        console.log('✓ Deserialized Clarity value type:', clarityValue.type);
      } catch (deserializeError) {
        console.error('❌ Failed to deserialize Clarity value:', deserializeError);
        throw new Error('Failed to parse contract response');
      }
    } else if (result && typeof result === 'object' && 'type' in result) {
      // Already a parsed Clarity value object
      console.log('📦 Using pre-parsed Clarity value, type:', result.type);
      clarityValue = result;
    } else {
      console.warn('Result in unexpected format:', result);
      throw new Error('Unexpected contract response format');
    }
    
    // Convert Clarity value to JavaScript object
    const value = cvToValue(clarityValue);
    
    // The contract returns { token: "sBTC", amount: u111111 }
    if (!value || typeof value !== 'object') {
      console.warn('Parsed value is not an object:', value);
      throw new Error('Unexpected contract response format');
    }
    
    // Extract amount - cvToValue can return either a primitive or an object with {type, value}
    const rawAmount = (value as Record<string, unknown>).amount;
    const rawToken = (value as Record<string, unknown>).token;
    
    let amountValue: string | number | bigint;
    
    if (typeof rawAmount === 'object' && rawAmount !== null) {
      if ('value' in rawAmount) {
        amountValue = (rawAmount as { value: string | number | bigint }).value;
      } else {
        console.warn('Amount object has unexpected structure:', rawAmount);
        amountValue = String(rawAmount);
      }
    } else {
      amountValue = rawAmount as string | number | bigint;
    }
    
    // Extract token - might also be an object with {type, value}
    let tokenValue: string;
    if (typeof rawToken === 'object' && rawToken !== null) {
      if ('value' in rawToken) {
        tokenValue = String((rawToken as { value: unknown }).value);
      } else {
        console.warn('Token object has unexpected structure:', rawToken);
        tokenValue = String(rawToken);
      }
    } else {
      tokenValue = String(rawToken);
    }
    
    // Convert to BigInt, handling various input types
    const finalAmount = typeof amountValue === 'bigint' 
      ? amountValue 
      : BigInt(String(amountValue));
    
    console.log('✓ Parsed listing fee:', {
      token: tokenValue,
      amount: finalAmount.toString(),
      rawToken: typeof rawToken === 'object' ? JSON.stringify(rawToken) : rawToken,
      rawAmount: typeof rawAmount === 'object' ? JSON.stringify(rawAmount) : rawAmount
    });
    
    return {
      token: tokenValue,
      amount: finalAmount,
    };
  } catch (error) {
    console.warn('Using default listing fee (contract may not be deployed yet):', error);
    // Return default fallback value
    return {
      token: 'sBTC',
      amount: BigInt(111111), // Default fallback (111111 satoshis = 0.00111111 BTC)
    };
  }
}

/**
 * Get total number of apps from the contract
 */
export async function getTotalApps(): Promise<number> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-total-apps`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [],
      }),
    });

    if (!response.ok) {
      console.warn('Failed to fetch total apps:', response.status);
      return 0;
    }

    const data = await response.json();
    
    if (!data || !data.okay || !data.result) {
      console.warn('Invalid response for total apps');
      return 0;
    }
    
    return Number(cvToValue(data.result));
  } catch (error) {
    console.warn('Error getting total apps (contract may not be deployed):', error);
    return 0;
  }
}

/**
 * Get app details from the contract
 */
export async function getAppFromContract(appId: number): Promise<Record<string, unknown> | null> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-app`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [uintCV(appId)],
      }),
    });

    if (!response.ok) {
      console.warn('Failed to fetch app:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.okay || !data.result) {
      console.warn('Invalid response for app data');
      return null;
    }
    
    return cvToValue(data.result) as Record<string, unknown>;
  } catch (error) {
    console.warn('Error getting app (contract may not be deployed):', error);
    return null;
  }
}

/**
 * Submit an app to the contract using Stacks Connect (for browser wallets)
 * Supports both Leather RPC API and legacy @stacks/connect
 */
export async function submitAppToContract(
  ipfsHash: string,
  onFinish?: (txId: string) => void,
  onCancel?: () => void
): Promise<void> {
  const network = getStacksNetwork();
  const contractId = getBboxContractAddress();
  const { contractAddress, contractName } = parseContractAddress(contractId);

  console.log('🔐 Initiating contract call...');
  console.log('   Network:', network);
  console.log('   Network type:', getPersistedNetwork());
  console.log('   Contract:', contractId);
  console.log('   Contract address:', contractAddress);
  console.log('   Contract name:', contractName);
  console.log('   Function: submit-app');
  console.log('   IPFS Hash:', ipfsHash);

  // Check if wallet extension is available
  if (typeof window === 'undefined') {
    const error = 'Cannot call contract: window is undefined (not in browser context)';
    console.error('❌', error);
    throw new Error(error);
  }

  console.log('🔍 Checking wallet providers...');
  const hasStacksProvider = typeof (window as Window & { StacksProvider?: unknown }).StacksProvider !== 'undefined';
  const hasLeatherProvider = typeof (window as Window & { LeatherProvider?: { request: (method: string, params: unknown) => Promise<unknown> } }).LeatherProvider !== 'undefined';
  const hasXverseProviders = typeof (window as Window & { XverseProviders?: unknown }).XverseProviders !== 'undefined';
  
  console.log('   window.StacksProvider:', hasStacksProvider ? 'available' : 'NOT FOUND');
  console.log('   window.LeatherProvider:', hasLeatherProvider ? 'available' : 'NOT FOUND');
  console.log('   window.XverseProviders:', hasXverseProviders ? 'available' : 'NOT FOUND');
  
  if (!hasStacksProvider && !hasLeatherProvider && !hasXverseProviders) {
    const error = 'No Stacks wallet extension detected. Please install Leather or Xverse wallet and refresh.';
    console.error('❌', error);
    throw new Error(error);
  }

  // Check if contract is deployed by trying to fetch it
  try {
    const checkUrl = `${getApiUrl(getPersistedNetwork())}/v2/contracts/interface/${contractAddress}/${contractName}`;
    console.log('🔍 Verifying contract deployment at:', checkUrl);
    const checkResponse = await fetch(checkUrl);
    
    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error('❌ Contract verification failed:', checkResponse.status, errorText);
      throw new Error(
        `Contract not found (HTTP ${checkResponse.status}). Please deploy the bbox contract to ${contractId} before submitting apps.`
      );
    }
    console.log('✓ Contract verified on network');
  } catch (error) {
    console.error('❌ Contract verification failed:', error);
    if (error instanceof Error && error.message.includes('Contract not found')) {
      throw error;
    }
    throw new Error(
      `Contract verification failed. The bbox contract must be deployed at ${contractId} before you can submit apps.`
    );
  }

  // Try Leather RPC API first (new method)
  // TEMPORARILY DISABLED: Leather RPC has issues with Clarity value serialization
  // Will use @stacks/connect which works with both Leather and Xverse
  const USE_LEATHER_RPC = false;
  
  if (hasLeatherProvider && USE_LEATHER_RPC) {
    console.log('📱 Using Leather RPC API (new method)...');
    try {
      const leatherProvider = (window as Window & { 
        LeatherProvider: { 
          request: (method: string, params: unknown) => Promise<{ result: { txid: string; transaction: string } }> 
        } 
      }).LeatherProvider;
      
      // According to Leather docs, functionArgs should be an array of hex-encoded Clarity values
      // Each argument is a complete serialized Clarity value (not just the string content)
      const ipfsHashCV = stringAsciiCV(ipfsHash);
      const serializedBuffer = serializeCV(ipfsHashCV);
      
      // Convert to hex string with 0x prefix
      // serializeCV returns a Uint8Array or Buffer
      let ipfsHashHex = '0x';
      if (typeof serializedBuffer === 'string') {
        // Already hex string
        ipfsHashHex = serializedBuffer.startsWith('0x') ? serializedBuffer : '0x' + serializedBuffer;
      } else {
        // Convert bytes to hex
        const bytes = serializedBuffer as ArrayLike<number>;
        for (let i = 0; i < bytes.length; i++) {
          const hex = bytes[i].toString(16);
          ipfsHashHex += hex.length === 1 ? '0' + hex : hex;
        }
      }
      
      console.log('   Contract:', `${contractAddress}.${contractName}`);
      console.log('   Function:', 'submit-app');
      console.log('   IPFS Hash:', ipfsHash);
      console.log('   Serialized CV hex:', ipfsHashHex);
      console.log('   Hex length:', ipfsHashHex.length);
      
      const requestParams = {
        contract: `${contractAddress}.${contractName}`,
        functionName: 'submit-app',
        functionArgs: [ipfsHashHex],
      };
      
      console.log('   Full request params:', JSON.stringify(requestParams, null, 2));
      console.log('🔐 Calling Leather RPC API...');
      
      const response = await leatherProvider.request('stx_callContract', requestParams);
      
      console.log('✅ Leather RPC response:', response);
      
      if (response.result?.txid) {
        console.log('✅ Transaction submitted via Leather RPC!');
        console.log('   Transaction ID:', response.result.txid);
        if (onFinish) {
          onFinish(response.result.txid);
        }
        return; // Success, exit function
      } else {
        console.warn('⚠️ No txid in Leather response:', response);
        throw new Error('No transaction ID returned from wallet');
      }
    } catch (leatherError) {
      console.error('❌ Leather RPC API error details:', leatherError);
      console.warn('⚠️ Leather RPC API failed, will try fallback method');
      // Fall through to try @stacks/connect as fallback
    }
  }

  // Use @stacks/connect (works with both Leather and Xverse)
  console.log('📱 Using @stacks/connect (works with Leather & Xverse)...');
  const contractCallOptions = {
    network,
    anchorMode: AnchorMode.Any,
    contractAddress,
    contractName,
    functionName: 'submit-app',
    functionArgs: [stringAsciiCV(ipfsHash)],
    postConditionMode: PostConditionMode.Allow, // Allow - important for sBTC transfer
    appDetails: {
      name: 'BBOX',
      icon: typeof window !== 'undefined' ? window.location.origin + '/bbox.png' : '',
    },
    onFinish: (data: { txId: string; stacksTransaction: unknown }) => {
      console.log('✅ Transaction submitted successfully!');
      console.log('   Transaction ID:', data.txId);
      console.log('   Full response:', data);
      if (onFinish && data.txId) {
        onFinish(data.txId);
      } else if (!data.txId) {
        console.warn('⚠️ onFinish called but no txId in response:', data);
      }
    },
    onCancel: () => {
      console.log('❌ Transaction cancelled by user');
      if (onCancel) {
        onCancel();
      }
    },
  };
  
  console.log('📋 Contract call options:', {
    networkType: getPersistedNetwork(),
    anchorMode: contractCallOptions.anchorMode,
    contractAddress: contractCallOptions.contractAddress,
    contractName: contractCallOptions.contractName,
    functionName: contractCallOptions.functionName,
    functionArgsCount: contractCallOptions.functionArgs.length,
    postConditionMode: contractCallOptions.postConditionMode,
    hasAppDetails: !!contractCallOptions.appDetails,
  });

  try {
    // Use openContractCall to trigger wallet popup
    // Note: openContractCall returns void - it's fire-and-forget
    // The callbacks (onFinish/onCancel) handle the async response
    const result = openContractCall(contractCallOptions);
    console.log('✓ openContractCall returned:', result);
    console.log('   (Note: This should be undefined - callbacks handle the actual response)');
    
    // Add a slight delay to check if wallet opened
    setTimeout(() => {
      console.log('⏱️  1 second after openContractCall - wallet should be visible now');
      console.log('   If wallet is not visible, check:');
      console.log('   1. Wallet extension is installed and unlocked');
      console.log('   2. No popup blockers are active');
      console.log('   3. Browser console for wallet extension errors');
    }, 1000);
  } catch (error) {
    console.error('❌ Error calling openContractCall:', error);
    console.error('   Error type:', error?.constructor?.name);
    console.error('   Error message:', error instanceof Error ? error.message : String(error));
    console.error('   Error stack:', error instanceof Error ? error.stack : 'N/A');
    throw new Error(
      `Failed to open wallet for signing: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Vote on an app (upvote/downvote)
 */
export async function voteOnApp(
  appId: number,
  voteType: 'upvote' | 'downvote',
  onFinish?: (txid: string) => void,
  onCancel?: () => void
): Promise<void> {
  const network = getStacksNetwork();
  const contractId = getBboxContractAddress();
  const { contractAddress, contractName } = parseContractAddress(contractId);

  openContractCall({
    network,
    anchorMode: AnchorMode.Any,
    contractAddress,
    contractName,
    functionName: 'vote-app',
    functionArgs: [uintCV(appId), stringAsciiCV(voteType)],
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Vote submitted:', data);
      if (onFinish && data.txId) {
        onFinish(data.txId);
      }
    },
    onCancel: () => {
      console.log('Vote cancelled');
      if (onCancel) {
        onCancel();
      }
    },
  });
}

/**
 * Rate an app (1-5 stars)
 */
export async function rateApp(
  appId: number,
  rating: number,
  onFinish?: (txid: string) => void,
  onCancel?: () => void
): Promise<void> {
  const network = getStacksNetwork();
  const contractId = getBboxContractAddress();
  const { contractAddress, contractName } = parseContractAddress(contractId);

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  openContractCall({
    network,
    anchorMode: AnchorMode.Any,
    contractAddress,
    contractName,
    functionName: 'rate-app',
    functionArgs: [uintCV(appId), uintCV(rating)],
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Rating submitted:', data);
      if (onFinish && data.txId) {
        onFinish(data.txId);
      }
    },
    onCancel: () => {
      console.log('Rating cancelled');
      if (onCancel) {
        onCancel();
      }
    },
  });
}

/**
 * Get user's vote on an app
 */
export async function getUserVote(
  voterAddress: string,
  appId: number
): Promise<Record<string, unknown> | null> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-user-vote`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [principalCV(voterAddress), uintCV(appId)],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user vote');
    }

    const data = await response.json();
    return cvToValue(data.result) as Record<string, unknown>;
  } catch (error) {
    console.error('Error getting user vote:', error);
    return null;
  }
}

/**
 * Get user's rating on an app
 */
export async function getUserRating(
  voterAddress: string,
  appId: number
): Promise<Record<string, unknown> | null> {
  try {
    const network = getPersistedNetwork();
    const apiUrl = getApiUrl(network);
    const contractId = getBboxContractAddress();
    const { contractAddress, contractName } = parseContractAddress(contractId);

    const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contractName}/get-user-rating`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: contractAddress,
        arguments: [principalCV(voterAddress), uintCV(appId)],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user rating');
    }

    const data = await response.json();
    return cvToValue(data.result) as Record<string, unknown>;
  } catch (error) {
    console.error('Error getting user rating:', error);
    return null;
  }
}

/**
 * Convert satoshis to BTC for display
 */
export function satsToBTC(sats: bigint): string {
  const btc = Number(sats) / 100000000;
  return btc.toFixed(8);
}

/**
 * Format listing fee for display
 */
export function formatListingFee(amount: bigint, token: string): string {
  if (token === 'sBTC') {
    return `${satsToBTC(amount)} ${token}`;
  }
  return `${amount.toString()} ${token}`;
}

/**
 * Get transaction explorer URL
 */
export function getExplorerTxUrl(txId: string, network: string): string {
  const baseUrl = 'https://explorer.hiro.so/txid';
  return `${baseUrl}/${txId}?chain=${network}`;
}

/**
 * Get contract explorer URL
 */
export function getExplorerContractUrl(network: string): string {
  const contractId = getBboxContractAddress();
  const [address, name] = contractId.split('.');
  return `https://explorer.hiro.so/address/${address}?chain=${network}#${name}`;
}
