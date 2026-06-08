'use client';

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from 'next/navigation';
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { useEncryptedWallet } from '@/components/EncryptedWalletProvider';
import PasswordSigningModal from '@/components/PasswordSigningModal';
import { getProfile, upsertProfile, getSkillCategories, Profile } from '@/lib/profileApi';
import { hasEncryptedWallet } from '@/lib/encryptedStorage';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { BannerImageUpload } from "@/components/BannerImageUpload";
import { toast } from "sonner";
import { Copy } from 'lucide-react';

interface SkillCategory {
  category: string;
  skills: string[];
}

type PendingProfileData = Partial<Profile> & {
  address: string;
  bitcoin_experience_level?: string;
  bitcoin_tech_stack?: string;
  bitcoin_project_url?: string;
};

export default function SettingsPage() {
  const address = useCurrentAddress();
  const router = useRouter();
  const { currentWallet, isWalletEncrypted, isSessionLocked, unlockWallet } = useEncryptedWallet();

  // Determine wallet type - if we have an address but no encrypted wallet, it's an extension wallet
  const isExtensionWallet = address && !hasEncryptedWallet();
  
  // Basic Profile Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tagline, setTagline] = useState('');
  const [biography, setBiography] = useState('');
  const [location, setLocation] = useState('');
  
  // Social Links
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [discord, setDiscord] = useState('');
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
  const [copiedNostrKey, setCopiedNostrKey] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [pendingProfileData, setPendingProfileData] = useState<PendingProfileData | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  
  // Profile Media
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarCid, setAvatarCid] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerCid, setBannerCid] = useState('');
  
  // Privacy Settings
  const [profilePublic, setProfilePublic] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showLocation, setShowLocation] = useState(true);
  const [allowDirectMessages, setAllowDirectMessages] = useState(true);
  
  // Notifications Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  
  // State
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!address) return;
    
    const loadData = async () => {
      try {
        // Load profile from Nostr relays
        const profile = await getProfile(address);
        if (profile) {
          setUsername(profile.username || '');
          setEmail(profile.email || '');
          setDisplayName(profile.display_name || '');
          setTagline(profile.tagline || '');
          setBiography(profile.biography || '');
          setLocation(profile.location || '');
          setWebsite(profile.website || '');
          setTwitter(profile.twitter || '');
          setDiscord(profile.discord || '');
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
          setAllowDirectMessages(profile.allow_direct_messages ?? true);
          setEmailNotifications(profile.email_notifications ?? true);
          setPushNotifications(profile.push_notifications ?? true);
          setMarketingEmails(profile.marketing_emails ?? false);
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
      await navigator.clipboard.writeText(currentWallet.nostrPublicKey);
      setCopiedNostrKey(true);
      toast.success('Nostr public key copied');
      setTimeout(() => setCopiedNostrKey(false), 2500);
    } catch (err) {
      console.error('Failed to copy Nostr public key:', err);
      toast.error('Failed to copy Nostr public key');
    }
  };

  const handleUnlockAndSave = async (passphrase: string) => {
    setSaving(true);
    setUnlocking(true);
    setError('');
    setSuccess('');

    try {
      const walletData = await unlockWallet(passphrase);
      const privateKey = walletData.privateKey || currentWallet?.privateKey;
      if (!privateKey) {
        throw new Error('Unable to retrieve your private key after unlocking');
      }
      if (!pendingProfileData) {
        throw new Error('No pending profile data available to save');
      }

      await upsertProfile(pendingProfileData, privateKey);
      setSuccess('Profile saved successfully to Nostr relays!');
      toast.success('Profile updated!');
      setPendingProfileData(null);
      setIsUnlockModalOpen(false);
      setTimeout(() => {
        router.push(`/${address}`);
      }, 1500);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unlock wallet and save profile';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setUnlocking(false);
      setSaving(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!address) throw new Error('Wallet not connected');

      const profileData: PendingProfileData = {
        address,
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        display_name: displayName.trim() || undefined,
        tagline: tagline.trim() || undefined,
        biography: biography.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        twitter: twitter.trim() || undefined,
        discord: discord.trim() || undefined,
        instagram: instagram.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        artstation: artstation.trim() || undefined,
        sketchfab: sketchfab.trim() || undefined,
        fab: fab.trim() || undefined,
        turbosquid: turbosquid.trim() || undefined,
        cgtrader: cgtrader.trim() || undefined,
        behance: behance.trim() || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        occupation: occupation.trim() || undefined,
        company: company.trim() || undefined,
        years_experience: yearsExperience > 0 ? yearsExperience : undefined,
        bitcoin_experience_level: bitcoinExperienceLevel.trim() || undefined,
        bitcoin_tech_stack: bitcoinTechStack.trim() || undefined,
        bitcoin_project_url: bitcoinProjectUrl.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        avatar_cid: avatarCid.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
        banner_cid: bannerCid.trim() || undefined,
        profile_public: profilePublic,
        show_email: showEmail,
        show_location: showLocation,
        allow_direct_messages: allowDirectMessages,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        marketing_emails: marketingEmails,
      };

      const privateKey = currentWallet?.privateKey;
      if (!privateKey) {
        if (isWalletEncrypted) {
          setPendingProfileData(profileData);
          setIsUnlockModalOpen(true);
          setSaving(false);
          return;
        }

        throw new Error('Encrypted wallet is required to save profile data to Nostr relays');
      }

      await upsertProfile(profileData, privateKey);
      setSuccess('Profile saved successfully to Nostr relays!');
      toast.success('Profile updated!');

      // Navigate to user's profile page after successful save
      setTimeout(() => {
        router.push(`/${address}`);
      }, 1500); // Small delay to let user see the success message
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
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

  if (!address) {
    return (
  <div className="max-w-2xl mx-auto my-24 p-8 rounded-2xl border text-center bg-accent-background border-gray-200 dark:border-gray-800 text-foreground">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-foreground">Please connect your wallet to access settings.</p>
      </div>
    );
  }

  return (
  <div className="max-w-4xl mx-auto my-24 p-8 rounded-2xl border bg-accent-background border-gray-200 dark:border-gray-800 text-foreground">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList
          className="grid w-full grid-cols-2 sm:grid-cols-4 bg-accent-background border border-gray-200 dark:border-white/20 rounded-xl overflow-hidden"
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
          <TabsTrigger
            value="professional"
            className="cursor-pointer bg-accent-background text-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-foreground transition-colors"
          >
            Professional
          </TabsTrigger>
          <TabsTrigger
            value="privacy"
            className="cursor-pointer bg-accent-background text-foreground font-medium border-none focus:outline-none focus:ring-1 focus:ring-[#333] data-[state=active]:bg-transparent data-[state=active]:text-foreground transition-colors"
          >
            Privacy
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSave}>
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && <div className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/20 p-3 rounded">{error}</div>}
                {success && <div className="text-green-600 dark:text-green-400 text-sm bg-green-100 dark:bg-green-900/20 p-3 rounded">{success}</div>}
                
                {/* Profile Picture Section */}
                <div>
                  <label className="block mb-3 text-sm font-medium">Profile Photo</label>
                  {address && (
                    <ProfilePictureUpload
                      currentAvatarUrl={avatarUrl}
                      currentAvatarCid={avatarCid}
                      address={address}
                      onUploadSuccess={(newAvatarUrl, newAvatarCid) => {
                        setAvatarUrl(newAvatarUrl);
                        setAvatarCid(newAvatarCid);
                        setSuccess('Profile photo updated successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      onRemoveSuccess={() => {
                        setAvatarUrl('');
                        setAvatarCid('');
                        setSuccess('Profile photo removed successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                    />
                  )}
                </div>

                {/* Banner Image Section */}
                <div>
                  {address && (
                    <BannerImageUpload
                      currentBannerUrl={bannerUrl}
                      currentBannerCid={bannerCid}
                      address={address}
                      onUploadSuccess={(newBannerUrl, newBannerCid) => {
                        setBannerUrl(newBannerUrl);
                        setBannerCid(newBannerCid);
                        setSuccess('Banner image updated successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                      onRemoveSuccess={() => {
                        setBannerUrl('');
                        setBannerCid('');
                        setSuccess('Banner image removed successfully!');
                        setTimeout(() => setSuccess(''), 3000);
                      }}
                    />
                  )}
                </div>
                
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
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
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
                      Your Nostr public key is derived from your wallet private key and is shown here when your encrypted wallet is available. Your profile updates will be published to public Nostr relays.
                    </p>
                    {(isWalletEncrypted && isSessionLocked) || (isWalletEncrypted && !currentWallet?.privateKey) ? (
                      <div className="rounded-xl border border-yellow-400 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-200 p-3 mt-4">
                        <p className="text-sm font-medium">Your encrypted wallet must be unlocked to sign Nostr profile updates.</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">Click Save Changes to open the wallet unlock prompt, then your profile update will be signed locally.</p>
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">Tagline</label>
                  <input
                    className="w-full px-4 py-2 rounded-lg bg-accent-background dark:bg-accent-background text-gray-900 dark:text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    type="text"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="A short description about you"
                    maxLength={160}
                  />
                  <div className="text-xs text-gray-400 mt-1">{tagline.length}/160 characters</div>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium">Biography</label>
                  <textarea
                    className="w-full px-4 py-2 rounded-lg bg-accent-background dark:bg-accent-background text-gray-900 dark:text-foreground border border-[#222] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={biography}
                    onChange={e => setBiography(e.target.value)}
                    placeholder="Tell us more about you..."
                    maxLength={500}
                    rows={4}
                  />
                  <div className="text-xs text-gray-400 mt-1">{biography.length}/500 characters</div>
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
                      placeholder="Bitcoin Developer, Protocol Engineer, etc."
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

          <TabsContent value="privacy" className="space-y-6 mt-6">
            <Card className="bg-accent-background border-gray-200 dark:border-gray-700 text-foreground">
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Public Profile</h4>
                      <p className="text-xs text-gray-400">Make your profile visible to everyone</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={profilePublic}
                        onCheckedChange={v => setProfilePublic(!!v)}
                        aria-label="Public Profile"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Show Email</h4>
                      <p className="text-xs text-gray-400">Display your email on your public profile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={showEmail}
                        onCheckedChange={v => setShowEmail(!!v)}
                        aria-label="Show Email"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Show Location</h4>
                      <p className="text-xs text-gray-400">Display your location on your profile</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={showLocation}
                        onCheckedChange={v => setShowLocation(!!v)}
                        aria-label="Show Location"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Allow Direct Messages</h4>
                      <p className="text-xs text-gray-400">Allow other users to send you direct messages</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <Checkbox
                        checked={allowDirectMessages}
                        onCheckedChange={v => setAllowDirectMessages(!!v)}
                        aria-label="Allow Direct Messages"
                        className="h-6 w-6 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
                
                <hr className="border-gray-700" />
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Email Notifications</h4>
                        <p className="text-xs text-gray-400">Receive email notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <Checkbox
                          checked={emailNotifications}
                          onCheckedChange={v => setEmailNotifications(!!v)}
                          aria-label="Email Notifications"
                          className="h-6 w-6 cursor-pointer"
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Push Notifications</h4>
                        <p className="text-xs text-gray-400">Receive browser push notifications</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <Checkbox
                          checked={pushNotifications}
                          onCheckedChange={v => setPushNotifications(!!v)}
                          aria-label="Push Notifications"
                          className="h-6 w-6 cursor-pointer"
                        />
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Marketing Emails</h4>
                        <p className="text-xs text-gray-400">Receive updates about new features and promotions</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <Checkbox
                          checked={marketingEmails}
                          onCheckedChange={v => setMarketingEmails(!!v)}
                          aria-label="Marketing Emails"
                          className="h-6 w-6 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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

      {/* Account Management Links */}
      <div className="mt-12 pt-8 border-t border-gray-700">
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

      <PasswordSigningModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        onSign={handleUnlockAndSave}
        title="Unlock encrypted wallet"
        description="Enter your wallet password to unlock the private key and sign the Nostr profile update locally. Your password is never sent to the server."
        actionText="Unlock and Save"
        isLoading={unlocking}
      />
    </div>
  );
}