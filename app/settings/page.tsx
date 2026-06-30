'use client';

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useWallet } from '@/components/WalletProvider';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import {
  getProfile,
  upsertProfile,
  createWalletLinkProof,
  getSkillCategories,
  getProfileDeveloperMode,
  updateProfileDeveloperMode,
  Profile
} from '@/lib/profileApi';
import { buildWalletProofMessage, createWalletProof } from '@/lib/commentSigning';
import { hasEncryptedWallet, retrieveEncryptedWallet } from '@/lib/encryptedStorage';
import { getNostrSecretKeyFromPrivateKey, isNostrPublicKey } from '@/lib/nostr';
import { isDeveloperModeEnabled, setDeveloperModeEnabled } from '@/lib/developerMode';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Eye, EyeOff, Github, KeyRound } from 'lucide-react';

interface SkillCategory {
  category: string;
  skills: string[];
}

function SettingsCheckboxRow({
  id,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={value => onCheckedChange(value === true)}
        className="mt-0.5 cursor-pointer"
      />
      <div className="grid gap-1.5 leading-none">
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
          {title}
        </Label>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
}

type ProfileFormData = Record<string, unknown> & {
  address: string;
};

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (err) {
    console.warn('Navigator clipboard copy failed, trying fallback:', err);
  }

  try {
    if (typeof document === 'undefined') return false;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch (err) {
    console.warn('Fallback clipboard copy failed:', err);
    return false;
  }
}

export default function SettingsPage() {
  const address = useCurrentAddress();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { walletType } = useWallet();
  const { currentWallet } = useEncryptedWallet();
  const isNostriaWallet = walletType === 'nostria';
  const isNostrLightningWallet = walletType === 'alby' || walletType === 'nostria';
  const isBitcoinOnlyExtensionWallet = walletType === 'okx';

  // Determine wallet type - if we have an address but no encrypted wallet, it's an extension wallet
  const isExtensionWallet = Boolean(address && !hasEncryptedWallet());
  const isNostrKeyAvailable = Boolean(currentWallet?.nostrPublicKey && isNostrPublicKey(currentWallet.nostrPublicKey));
  const canLinkWallet = isExtensionWallet && !isNostrLightningWallet && !isBitcoinOnlyExtensionWallet && Boolean(walletType) && isNostrKeyAvailable;

  useEffect(() => {
    const previousBodyBackground = document.body.style.background;
    const previousHtmlBackground = document.documentElement.style.background;

    document.body.style.background = '#111';
    document.documentElement.style.background = '#111';

    return () => {
      document.body.style.background = previousBodyBackground;
      document.documentElement.style.background = previousHtmlBackground;
    };
  }, []);
  
  // Basic Profile Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeToken, setEmailCodeToken] = useState<string | null>(null);
  const [emailCodeLoading, setEmailCodeLoading] = useState(false);
  const [emailCodeMessage, setEmailCodeMessage] = useState('');
  const [emailCodeError, setEmailCodeError] = useState('');
  const [lightningAddress, setLightningAddress] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [biography, setBiography] = useState('');
  const [location, setLocation] = useState('');
  
  // Social Links
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  
  // 3D/Art Portfolio Platforms
  const [artstation, setArtstation] = useState('');
  const [sketchfab, setSketchfab] = useState('');
  const [fab, setFab] = useState('');
  const [turbosquid, setTurbosquid] = useState('');
  const [cgtrader, setCgtrader] = useState('');
  const [behance, setBehance] = useState('');
  
  // Professional Info
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number>(0);
  const [bitcoinExperienceLevel, setBitcoinExperienceLevel] = useState('');
  const [bitcoinTechStack, setBitcoinTechStack] = useState('');
  const [bitcoinProjectUrl, setBitcoinProjectUrl] = useState('');
  const [linkedNostrPublicKey, setLinkedNostrPublicKey] = useState('');
  const [walletLinkStatus, setWalletLinkStatus] = useState('');
  const [walletLinkError, setWalletLinkError] = useState('');
  const [walletProofResult, setWalletProofResult] = useState<{ walletSignature: string; walletPublicKey?: string; proofTimestamp: string } | null>(null);
  const [walletLinking, setWalletLinking] = useState(false);
  const [copiedNostrKey, setCopiedNostrKey] = useState(false);
  // Profile Media
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarCid, setAvatarCid] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerCid, setBannerCid] = useState('');
  
  // Privacy Settings
  const [profilePublic, setProfilePublic] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  
  // Notifications Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [savingDeveloperMode, setSavingDeveloperMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [revealingKeys, setRevealingKeys] = useState(false);
  const [recoveryKeys, setRecoveryKeys] = useState<{ mnemonic: string; privateKey: string; nsec: string } | null>(null);
  const [showRecoveryKeys, setShowRecoveryKeys] = useState(false);
  
  // State
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const githubAuthStatus = searchParams.get('github');

  useEffect(() => {
    if (!githubAuthStatus) return;

    const statusMessages: Record<string, { type: 'success' | 'error'; message: string }> = {
      connected: { type: 'success', message: 'GitHub connected successfully' },
      missing_config: { type: 'error', message: 'GitHub authentication is not configured' },
      missing_address: { type: 'error', message: 'Connect your wallet before connecting GitHub' },
      invalid_state: { type: 'error', message: 'GitHub authorization expired. Please try again' },
      token_error: { type: 'error', message: 'GitHub authorization failed' },
      user_error: { type: 'error', message: 'Unable to load your GitHub account' },
      save_error: { type: 'error', message: 'Unable to save your GitHub connection' },
      error: { type: 'error', message: 'GitHub connection failed' },
    };

    const status = statusMessages[githubAuthStatus];
    if (!status) return;

    if (status.type === 'success') {
      toast.success(status.message);
      setSuccess(status.message);
    } else {
      toast.error(status.message);
      setError(status.message);
    }

    router.replace('/settings', { scroll: false });
  }, [githubAuthStatus, router]);

  useEffect(() => {
    if (!address) return;
    
    const loadData = async () => {
      try {
        // Load profile from Supabase
        const profile = await getProfile(address);
        if (profile) {
          setUsername(profile.username || '');
          setEmail(profile.email || '');
          setOriginalEmail(profile.email || '');
          setEmailVerified(profile.email_verified === true);
          setLightningAddress(profile.lightning_address || '');
          setDisplayName(profile.display_name || '');
          setTagline(profile.tagline || '');
          setBiography(profile.biography || '');
          setLocation(profile.location || '');
          setWebsite(profile.website || '');
          setTwitter(profile.twitter || '');
          setDiscord(profile.discord || '');
          setGithubUrl(profile.github_url || '');
          setInstagram(profile.instagram || '');
          setLinkedin(profile.linkedin || '');
          setArtstation(profile.artstation || '');
          setSketchfab(profile.sketchfab || '');
          setFab(profile.fab || '');
          setTurbosquid(profile.turbosquid || '');
          setCgtrader(profile.cgtrader || '');
          setBehance(profile.behance || '');
          setSelectedSkills(profile.skills || []);
          setOccupation(profile.occupation || '');
          setCompany(profile.company || '');
          setYearsExperience(profile.years_experience || 0);
          const profileBitcoin = profile as Profile & {
            bitcoin_experience_level?: string;
            bitcoin_tech_stack?: string;
            bitcoin_project_url?: string;
          };
          setBitcoinExperienceLevel(profileBitcoin.bitcoin_experience_level || '');
          setBitcoinTechStack(profileBitcoin.bitcoin_tech_stack || '');
          setBitcoinProjectUrl(profileBitcoin.bitcoin_project_url || '');
          setAvatarUrl(profile.avatar_url || '');
          setAvatarCid(profile.avatar_cid || '');
          setBannerUrl(profile.banner_url || '');
          setBannerCid(profile.banner_cid || '');
          setProfilePublic(profile.profile_public ?? true);
          setShowEmail(profile.show_email ?? false);
          setShowLocation(profile.show_location ?? true);
          setEmailNotifications(profile.email_notifications ?? true);
          setPushNotifications(profile.push_notifications ?? true);
          setMarketingEmails(profile.marketing_emails ?? false);
        }

        try {
          const savedDeveloperMode = await getProfileDeveloperMode(address);
          setDeveloperMode(savedDeveloperMode);
          setDeveloperModeEnabled(savedDeveloperMode);
        } catch (developerModeError) {
          console.warn('Unable to load Developer Mode from profile:', developerModeError);
          setDeveloperMode(isDeveloperModeEnabled());
        }

        // Load skill categories
        const categories = await getSkillCategories();
        const defaultProgrammingSkills = [
          { category: 'Languages', skills: ['JavaScript', 'TypeScript', 'Rust', 'Python', 'Go', 'C++'] },
          { category: 'Bitcoin Stack', skills: ['Bitcoin Core', 'LND', 'BDK', 'Electrum', 'Ordinals', 'Lightning Network', 'Stacks', 'Rootstock'] },
          { category: 'Frameworks', skills: ['React', 'Next.js', 'Node.js', 'Express', 'Actix', 'Rocket'] },
          { category: 'DevOps Tools', skills: ['Docker', 'Kubernetes', 'GitHub Actions', 'GitLab CI', 'Terraform'] },
        ];

        const oldArtCategories = [
          '3D Software',
          'CAD Software',
          'Voxel/Pixel Art',
          'Texturing/Materials',
          'Rendering',
          'Game Engines',
          'Other Tools',
        ];

        const hasOldArtCategories = categories?.some((category) => oldArtCategories.includes(category.category));
        setSkillCategories(hasOldArtCategories || !categories || categories.length === 0 ? defaultProgrammingSkills : categories);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error loading profile data:', {
          error: errorMessage,
          address,
          timestamp: new Date().toISOString()
        });
        setError(`Failed to load profile: ${errorMessage}`);
      }
    };
    
    loadData();
  }, [address, currentWallet?.nostrPublicKey]);

  const copyNostrKey = async () => {
    if (!currentWallet?.nostrPublicKey) return;
    try {
      const copied = await copyToClipboard(currentWallet.nostrPublicKey);
      if (!copied) {
        throw new Error('Clipboard unavailable');
      }
      setCopiedNostrKey(true);
      toast.success('Nostr public key copied');
      setTimeout(() => setCopiedNostrKey(false), 2500);
    } catch (err) {
      console.error('Failed to copy Nostr public key:', err);
      toast.error('Failed to copy Nostr public key');
    }
  };

  const copySecret = async (label: string, value: string) => {
    try {
      const copied = await copyToClipboard(value);
      if (!copied) {
        throw new Error('Clipboard unavailable');
      }
      toast.success(`${label} copied`);
    } catch (err) {
      console.error(`Failed to copy ${label}:`, err);
      toast.error(`Failed to copy ${label}`);
    }
  };

  const handleRevealRecoveryKeys = async () => {
    setRevealingKeys(true);
    setRecoveryKeys(null);

    try {
      if (!recoveryPassword.trim()) {
        throw new Error('Enter your wallet password');
      }

      const wallet = await retrieveEncryptedWallet(recoveryPassword);
      if (!wallet?.mnemonic || !wallet.privateKey) {
        throw new Error('Unable to unlock wallet keys');
      }

      setRecoveryKeys({
        mnemonic: wallet.mnemonic,
        privateKey: wallet.privateKey,
        nsec: getNostrSecretKeyFromPrivateKey(wallet.privateKey),
      });
      setShowRecoveryKeys(true);
      setRecoveryPassword('');
      toast.success('Keys revealed locally');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reveal keys';
      toast.error(errorMessage);
    } finally {
      setRevealingKeys(false);
    }
  };

  const clearRecoveryKeys = () => {
    setRecoveryKeys(null);
    setRecoveryPassword('');
    setShowRecoveryKeys(false);
  };

  const normalizeEmail = (value: string) => value.trim().toLowerCase();
  const emailRequiresVerification = Boolean(
    normalizeEmail(email) &&
    (normalizeEmail(email) !== normalizeEmail(originalEmail) || !emailVerified)
  );

  const resetEmailVerification = (nextEmail: string) => {
    setEmail(nextEmail);
    setEmailCode('');
    setEmailCodeSent(false);
    setEmailCodeToken(null);
    setEmailCodeMessage('');
    setEmailCodeError('');
  };

  const handleRequestEmailCode = async () => {
    const trimmedEmail = normalizeEmail(email);
    setEmailCodeMessage('');
    setEmailCodeError('');
    setEmailCodeToken(null);

    if (!trimmedEmail) {
      setEmailCodeError('Enter an email address first.');
      return;
    }

    try {
      setEmailCodeLoading(true);
      const response = await fetch('/api/auth/email-code/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          purpose: 'profile_email',
          address,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send verification code');
      }

      setEmailCodeSent(true);
      setEmailCodeMessage(result.debugCode ? `Verification code sent. Dev code: ${result.debugCode}` : 'Verification code sent. Check your email.');
    } catch (err) {
      setEmailCodeError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    const trimmedEmail = normalizeEmail(email);
    const trimmedCode = emailCode.trim();
    setEmailCodeMessage('');
    setEmailCodeError('');

    if (!/^\d{6}$/.test(trimmedCode)) {
      setEmailCodeError('Enter the 6-digit verification code.');
      return;
    }

    try {
      setEmailCodeLoading(true);
      const response = await fetch('/api/auth/email-code/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          code: trimmedCode,
          purpose: 'profile_email',
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.verifiedEmailToken) {
        throw new Error(result.error || 'Failed to verify code');
      }

      setEmailCodeToken(result.verifiedEmailToken);
      setEmailCodeMessage('Email verified. Save your profile to apply it.');
    } catch (err) {
      setEmailCodeToken(null);
      setEmailCodeError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setEmailCodeLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!address) throw new Error('Wallet not connected');

      if (emailRequiresVerification && !emailCodeToken) {
        throw new Error('Verify your email before saving your profile.');
      }

      const optionalText = (value: string) => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      };

      const profileData: ProfileFormData = {
        address,
        username: optionalText(username),
        email: optionalText(email),
        lightning_address: optionalText(lightningAddress.toLowerCase()),
        display_name: optionalText(displayName),
        tagline: optionalText(tagline),
        biography: optionalText(biography),
        location: optionalText(location),
        website: optionalText(website),
        twitter: optionalText(twitter),
        discord: optionalText(discord),
        github_url: optionalText(githubUrl),
        instagram: optionalText(instagram),
        linkedin: optionalText(linkedin),
        artstation: optionalText(artstation),
        sketchfab: optionalText(sketchfab),
        fab: optionalText(fab),
        turbosquid: optionalText(turbosquid),
        cgtrader: optionalText(cgtrader),
        behance: optionalText(behance),
        skills: selectedSkills.length > 0 ? selectedSkills : null,
        occupation: optionalText(occupation),
        company: optionalText(company),
        years_experience: yearsExperience > 0 ? yearsExperience : null,
        bitcoin_experience_level: optionalText(bitcoinExperienceLevel),
        bitcoin_tech_stack: optionalText(bitcoinTechStack),
        bitcoin_project_url: optionalText(bitcoinProjectUrl),
        avatar_url: optionalText(avatarUrl),
        avatar_cid: optionalText(avatarCid),
        banner_url: optionalText(bannerUrl),
        banner_cid: optionalText(bannerCid),
        profile_public: profilePublic,
        show_email: showEmail,
        show_location: showLocation,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        marketing_emails: marketingEmails,
      };

      if (emailRequiresVerification && emailCodeToken) {
        profileData.verifiedEmailToken = emailCodeToken;
      }

      await upsertProfile(profileData);
      setOriginalEmail(email);
      setEmailVerified(Boolean(optionalText(email)));
      setEmailCode('');
      setEmailCodeSent(false);
      setEmailCodeToken(null);
      setEmailCodeMessage('');
      setEmailCodeError('');
      setSuccess('Profile saved successfully!');
      toast.success('Profile updated!');

      // Return to the app store after saving account details.
      setTimeout(() => {
        router.push('/apps');
      }, 1500); // Small delay to let user see the success message
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateWalletProof = async () => {
    setWalletLinkStatus('');
    setWalletLinkError('');

    try {
      if (!address) {
        throw new Error('Wallet address is required for proof creation');
      }
      if (!walletType) {
        throw new Error('Unable to determine wallet type');
      }
      if (!currentWallet?.nostrPublicKey) {
        throw new Error('Nostr public key is required to create a wallet link proof');
      }
      if (!isNostrPublicKey(currentWallet.nostrPublicKey)) {
        throw new Error('Invalid Nostr public key detected');
      }

      const proof = await createWalletProof(address, currentWallet.nostrPublicKey, walletType);
      setWalletProofResult({
        walletSignature: proof.walletSignature,
        walletPublicKey: proof.walletPublicKey,
        proofTimestamp: proof.proofTimestamp,
      });
      setLinkedNostrPublicKey(proof.nostrPublicKey);
      setWalletLinkStatus('Proof created, ready to link wallet.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet proof';
      setWalletLinkError(errorMessage);
      toast.error(errorMessage);
      console.error('Wallet proof creation error:', err);
    }
  };

  const handleLinkWallet = async () => {
    setWalletLinking(true);
    setWalletLinkStatus('Linking wallet proof...');
    setWalletLinkError('');

    try {
      if (!address) {
        throw new Error('Wallet address is required');
      }
      if (!walletProofResult) {
        throw new Error('Create a wallet proof before linking');
      }
      if (!linkedNostrPublicKey) {
        throw new Error('Nostr public key is required');
      }

      await createWalletLinkProof({
        address,
        nostrPublicKey: linkedNostrPublicKey,
        walletType: walletType ?? 'leather',
        walletSignature: walletProofResult.walletSignature,
        walletPublicKey: walletProofResult.walletPublicKey,
        proofMessage: buildWalletProofMessage(address, linkedNostrPublicKey, walletProofResult.proofTimestamp),
        proofTimestamp: walletProofResult.proofTimestamp,
      });

      setWalletLinkStatus('Wallet proof linked successfully!');
      toast.success('Wallet linked to Nostr key');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to link wallet proof';
      setWalletLinkError(errorMessage);
      toast.error(errorMessage);
      console.error('Wallet link error:', err);
    } finally {
      setWalletLinking(false);
    }
  };

  // ...removed passphrase signing logic...

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleDeveloperModeChange = async (enabled: boolean) => {
    if (!address) return;

    const previousDeveloperMode = developerMode;
    setDeveloperMode(enabled);
    setDeveloperModeEnabled(enabled);
    setSavingDeveloperMode(true);

    try {
      const savedDeveloperMode = await updateProfileDeveloperMode(address, enabled);
      setDeveloperMode(savedDeveloperMode);
      setDeveloperModeEnabled(savedDeveloperMode);
      toast.success(savedDeveloperMode ? 'Developer Mode enabled' : 'Developer Mode disabled');
    } catch (err) {
      setDeveloperMode(previousDeveloperMode);
      setDeveloperModeEnabled(previousDeveloperMode);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save Developer Mode';
      toast.error(errorMessage);
    } finally {
      setSavingDeveloperMode(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-[#111] px-4 py-24">
        <div className="max-w-2xl mx-auto p-8 rounded-2xl border text-center bg-accent-background border-gray-200 dark:border-gray-800 text-foreground">
          <h1 className="text-2xl font-bold mb-4">...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] px-4 py-24">
      <div className="max-w-4xl mx-auto p-0 rounded-2xl text-foreground">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className={`grid w-full grid-cols-2 ${developerMode ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} bg-accent-background border border-gray-200 dark:border-white/20 rounded-xl overflow-hidden`}
        >
          <TabsTrigger
            value="profile"
            className="cursor-pointer font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:border data-[state=active]:bg-transparent data-[state=active]:text-foreground transition-colors"
          >
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="social"
            className="cursor-pointer bg-accent-background text-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-foreground transition-colors"
          >
            Social
          </TabsTrigger>
          {developerMode && (
            <TabsTrigger
              value="professional"
              className="cursor-pointer bg-accent-background text-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-foreground transition-colors"
            >
              Professional
            </TabsTrigger>
          )}
          <TabsTrigger
            value="privacy"
            className="cursor-pointer bg-accent-background text-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-foreground transition-colors"
          >
            Privacy
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSave}>
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-none">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/20 p-3 rounded">{error}</div>}
                {success && <div className="text-green-600 dark:text-green-400 text-sm bg-green-100 dark:bg-green-900/20 p-3 rounded">{success}</div>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Username</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background dark:bg-accent-background text-gray-900 dark:text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="your_username"
                      pattern="^[a-zA-Z0-9_]{3,50}$"
                      title="3-50 characters, letters, numbers, and underscores only"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Email</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="email"
                      value={email}
                      onChange={e => resetEmailVerification(e.target.value)}
                      placeholder="you@example.com"
                    />
                    {emailRequiresVerification && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleRequestEmailCode}
                            disabled={emailCodeLoading || !address}
                            className="h-9 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {emailCodeSent ? 'Resend Code' : 'Send Code'}
                          </Button>
                          {emailCodeSent && (
                            <>
                              <input
                                className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                type="text"
                                inputMode="numeric"
                                value={emailCode}
                                onChange={e => {
                                  setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                  setEmailCodeToken(null);
                                  setEmailCodeError('');
                                }}
                                placeholder="6-digit code"
                                disabled={emailCodeLoading || Boolean(emailCodeToken)}
                                autoComplete="one-time-code"
                              />
                              <Button
                                type="button"
                                onClick={handleVerifyEmailCode}
                                disabled={emailCodeLoading || emailCode.length !== 6 || Boolean(emailCodeToken)}
                                className="h-9 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Verify
                              </Button>
                            </>
                          )}
                        </div>
                        {(emailCodeMessage || emailCodeError) && (
                          <p className={`text-xs ${emailCodeError ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {emailCodeError || emailCodeMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div id="lightning-address" className="scroll-mt-24">
                    <label htmlFor="profile-lightning-address" className="block mb-2 text-sm font-medium">Lightning Address</label>
                    <input
                      id="profile-lightning-address"
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="email"
                      value={lightningAddress}
                      onChange={e => setLightningAddress(e.target.value)}
                      placeholder="you@getalby.com"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isNostriaWallet
                        ? 'Add a Lightning address so people can pay this Nostria account.'
                        : 'Add a Lightning address so people can send sats to this profile.'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Display Name</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Location</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="City, Country"
                      maxLength={100}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm font-medium">Nostr Public Key</label>
                    <div className="flex gap-2 items-center">
                      <input
                        className="flex-1 px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        readOnly
                        value={currentWallet?.nostrPublicKey || ''}
                        placeholder={currentWallet ? 'Nostr key not available' : 'Encrypted wallet required'}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyNostrKey}
                        disabled={!currentWallet?.nostrPublicKey}
                        className="border-border text-muted-foreground hover:bg-muted cursor-pointer"
                      >
                        {copiedNostrKey ? 'Copied' : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Your Nostr public key is derived from your wallet private key and can be linked as public ownership proof.
                    </p>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-foreground">
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">Website</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="url"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="https://yourdomain.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">X</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={twitter}
                      onChange={e => setTwitter(e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Discord</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={discord}
                      onChange={e => setDiscord(e.target.value)}
                      placeholder="username"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">GitHub</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        className="min-w-0 flex-1 px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={githubUrl}
                        onChange={e => setGithubUrl(e.target.value)}
                        placeholder="github.com/username"
                      />
                      <Button
                        asChild
                        type="button"
                        variant="outline"
                        className="shrink-0 border-[#222] text-foreground hover:bg-muted"
                      >
                        <Link href={`/api/github/authorize?address=${encodeURIComponent(address)}`}>
                          <Github className="h-4 w-4" />
                          {githubUrl ? 'Reconnect' : 'Connect'}
                        </Link>
                      </Button>
                    </div>
                    {githubUrl && (
                      <p className="mt-2 text-xs text-emerald-500">
                        GitHub profile connected
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">Instagram</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={instagram}
                      onChange={e => setInstagram(e.target.value)}
                      placeholder="@username"
                    />
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium">LinkedIn</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="text"
                      value={linkedin}
                      onChange={e => setLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {developerMode && (
            <TabsContent value="professional" className="space-y-6 mt-6">
              <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-foreground">
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium">Occupation</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={occupation}
                        onChange={e => setOccupation(e.target.value)}
                        placeholder="Product lead, protocol engineer, designer, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">Company</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Company Name"
                      />
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium">Years of Experience</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="number"
                        min="0"
                        max="50"
                        value={yearsExperience}
                        onChange={e => setYearsExperience(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium">Bitcoin Experience Level</label>
                      <select
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={bitcoinExperienceLevel}
                        onChange={e => setBitcoinExperienceLevel(e.target.value)}
                      >
                        <option value="">Select level</option>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium">Bitcoin Tech Stack</label>
                      <input
                        className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        type="text"
                        value={bitcoinTechStack}
                        onChange={e => setBitcoinTechStack(e.target.value)}
                        placeholder="e.g. Bitcoin Core, LND, BDK, Ordinals"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium">Bitcoin Project URL</label>
                    <input
                      className="w-full px-4 py-2 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      type="url"
                      value={bitcoinProjectUrl}
                      onChange={e => setBitcoinProjectUrl(e.target.value)}
                      placeholder="https://github.com/your-bitcoin-project"
                    />
                  </div>

                  <div>
                    <label className="block mb-4 text-sm font-medium">Development Skills & Tools</label>
                    <div className="space-y-4">
                      {skillCategories.map((category) => (
                        <div key={category.category}>
                          <h4 className="text-sm font-medium text-foreground mb-2">{category.category}</h4>
                          <div className="flex flex-wrap gap-2">
                            {category.skills.map((skill) => (
                              <Badge
                                key={skill}
                                variant={selectedSkills.includes(skill) ? "default" : "outline"}
                                className={`cursor-pointer transition-colors ${
                                  selectedSkills.includes(skill)
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-accent-background hover:bg-[#333] text-foreground border-[#222]"
                                }`}
                                onClick={() => toggleSkill(skill)}
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedSkills.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-foreground mb-2">Selected Skills ({selectedSkills.length})</h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedSkills.map((skill) => (
                            <Badge
                              key={skill}
                              className="bg-blue-600 text-white"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="privacy" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-foreground">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <SettingsCheckboxRow
                    id="profile-public"
                    title="Public Profile"
                    description="Make your profile visible to everyone"
                    checked={profilePublic}
                    onCheckedChange={setProfilePublic}
                  />
                  
                  <SettingsCheckboxRow
                    id="show-email"
                    title="Show Email"
                    description="Display your email on your public profile"
                    checked={showEmail}
                    onCheckedChange={setShowEmail}
                  />
                  
                  <SettingsCheckboxRow
                    id="show-location"
                    title="Show Location"
                    description="Display your location on your profile"
                    checked={showLocation}
                    onCheckedChange={setShowLocation}
                  />
                </div>
                
                <hr className="border-gray-700" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <SettingsCheckboxRow
                      id="email-notifications"
                      title="Email Notifications"
                      description="Receive email notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                    
                    <SettingsCheckboxRow
                      id="push-notifications"
                      title="Push Notifications"
                      description="Receive browser push notifications"
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                    />
                    
                    <SettingsCheckboxRow
                      id="marketing-emails"
                      title="Marketing Emails"
                      description="Receive updates about new features and promotions"
                      checked={marketingEmails}
                      onCheckedChange={setMarketingEmails}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isExtensionWallet && !isNostrLightningWallet && !isBitcoinOnlyExtensionWallet && (
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 mt-8">
              <CardHeader>
                <CardTitle>Wallet Proof Linking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">
                  Link your Stacks browser wallet address to your Nostr public key for ownership proof.
                </p>

                {!isNostrKeyAvailable && (
                  <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/20 p-4 text-yellow-900 dark:text-yellow-100">
                    No valid Nostr public key is available. Unlock your encrypted wallet or configure your Nostr key first.
                  </div>
                )}

                {isNostrKeyAvailable && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-500">Stacks Wallet</label>
                        <p className="mt-1 text-sm text-foreground">{address}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase text-gray-500">Nostr Public Key</label>
                        <p className="mt-1 text-sm text-foreground break-all">{currentWallet?.nostrPublicKey}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        onClick={handleCreateWalletProof}
                        disabled={!canLinkWallet || walletLinking}
                        className="w-full bg-slate-700 hover:bg-slate-800 text-white"
                      >
                        Create Proof
                      </Button>
                      <Button
                        type="button"
                        onClick={handleLinkWallet}
                        disabled={!walletProofResult || walletLinking}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {walletLinking ? 'Linking...' : 'Link Wallet'}
                      </Button>
                    </div>

                    {walletLinkStatus && (
                      <div className="rounded-lg bg-green-100 dark:bg-green-900/20 p-3 text-green-900 dark:text-green-100 text-sm">
                        {walletLinkStatus}
                      </div>
                    )}

                    {walletLinkError && (
                      <div className="rounded-lg bg-red-100 dark:bg-red-900/20 p-3 text-red-900 dark:text-red-100 text-sm">
                        {walletLinkError}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="mt-8 flex gap-4">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Tabs>

      <Card id="developer-mode" className="mt-8 bg-accent-background border-gray-200 dark:border-gray-700 text-foreground scroll-mt-24">
        <CardHeader>
          <CardTitle>Developer Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SettingsCheckboxRow
            id="developer-mode-toggle"
            title="Show publishing tools"
            description="Turn this on only when you want to submit or manage app listings."
            checked={developerMode}
            disabled={savingDeveloperMode}
            onCheckedChange={handleDeveloperModeChange}
          />

          {developerMode && (
            <Button asChild className="w-full bg-orange-500 text-white hover:bg-orange-600">
              <Link href="/submit">Submit an App</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {!isExtensionWallet && (
        <Card className="mt-8 bg-accent-background border-gray-200 dark:border-gray-700 text-foreground">
          <CardHeader>
            <CardTitle>Reveal Recovery Keys</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-gray-400">
              Enter your wallet password to decrypt and show your mnemonic, private key, and Nostr nsec key locally in this browser.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="min-w-0 flex-1 px-4 py-3 rounded-lg bg-accent-background text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                type="password"
                value={recoveryPassword}
                onChange={event => setRecoveryPassword(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleRevealRecoveryKeys();
                  }
                }}
                placeholder="Wallet password"
                autoComplete="current-password"
              />
              <Button
                type="button"
                onClick={handleRevealRecoveryKeys}
                disabled={revealingKeys || !recoveryPassword.trim()}
                className="shrink-0 bg-red-600 text-white hover:bg-red-700"
              >
                <KeyRound className="h-4 w-4" />
                {revealingKeys ? 'Unlocking...' : 'Reveal Keys'}
              </Button>
            </div>

            {recoveryKeys && (
              <div className="space-y-4 rounded-lg border border-red-500/40 bg-red-500/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-red-600 dark:text-red-300">
                    Keep these keys private. Anyone with them can control your wallet.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRecoveryKeys(value => !value)}
                      className="border-border text-muted-foreground hover:bg-muted"
                    >
                      {showRecoveryKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showRecoveryKeys ? 'Hide' : 'Show'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearRecoveryKeys}
                      className="border-border text-muted-foreground hover:bg-muted"
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {[
                  { label: 'Mnemonic', value: recoveryKeys.mnemonic },
                  { label: 'Private Key', value: recoveryKeys.privateKey },
                  { label: 'Nostr nsec Key', value: recoveryKeys.nsec },
                ].map(secret => (
                  <div key={secret.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-medium uppercase text-gray-500">{secret.label}</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copySecret(secret.label, secret.value)}
                        className="h-8 border-border text-muted-foreground hover:bg-muted"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="min-h-12 break-all rounded-lg border border-[#222] bg-background p-3 font-mono text-sm text-foreground">
                      {showRecoveryKeys ? secret.value : '********************************'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account Management Links */}
      <div className="mt-12 pt-8">
        <div className="space-y-3">
          {/* Only show Change Password button for encrypted wallet users */}
          {!isExtensionWallet && (
            <Link
              href="/settings/password"
              className="block w-full text-center py-3 px-4 rounded-lg border border-[#222] bg-accent-background text-foreground hover:underline"
            >
              Change Password
            </Link>
          )}
          <Link
            href="/settings/api/delete"
            className="block w-full text-center text-red-400 py-3 px-4transition-colors"
          >
            Delete Account
          </Link>
        </div>
      </div>

      </div>
    </div>
  );
}
