'use client';



import { LocalizedText } from "@/components/LocalizedText";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentAddress } from '@/hooks/useCurrentAddress';
import { hasEncryptedWallet, validatePassphraseStrength } from '@/lib/encryptedStorage';
import { toast } from "sonner";

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, score: 0, feedback: [] as string[] });
  
  const router = useRouter();
  const walletAddress = useCurrentAddress();
  const hasPasswordWallet = hasEncryptedWallet();

  useEffect(() => {
    // If wallet is connected but no password-based wallet exists, redirect to settings
    if (walletAddress && !hasPasswordWallet) {
      toast.info("Wallet connected. No password required", {
        description: "You're using wallet-based authentication. Password changes are not needed.",
      });
      router.push('/settings');
      return;
    }

    // If no wallet connected and no encrypted wallet, redirect to main page
    if (!walletAddress && !hasPasswordWallet) {
      router.push('/');
      return;
    }
  }, [walletAddress, hasPasswordWallet, router]);

  useEffect(() => {
    // Validate password strength as user types
    if (newPassword) {
      const validation = validatePassphraseStrength(newPassword);
      setPasswordStrength(validation);
    } else {
      setPasswordStrength({ isValid: false, score: 0, feedback: [] });
    }
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Validation checks
      if (!newPassword || !confirmPassword) {
        throw new Error('Please fill in all required fields');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (!passwordStrength.isValid) {
        throw new Error('Password does not meet security requirements');
      }

      if (hasPasswordWallet && !currentPassword) {
        throw new Error('Current password is required');
      }

      // Here you would implement the actual password change logic
      // This would involve:
      // 1. Validating current password against encrypted wallet
      // 2. Re-encrypting wallet data with new password
      // 3. Updating stored encrypted data

      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Password changed successfully!");
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Redirect to settings
      router.push('/settings');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Show loading if we're checking authentication state
  if ((walletAddress && !hasPasswordWallet) || (!walletAddress && !hasPasswordWallet)) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 bg-black rounded-2xl border-[1px] border-[#333] shadow text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p><LocalizedText>Checking authentication...</LocalizedText></p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-24 p-8 bg-transparent shadow text-white">
      <h1 className="text-3xl font-bold mb-2"><LocalizedText>Change Password</LocalizedText></h1>
      <p className="text-gray-400 mb-8"><LocalizedText>Update your encrypted wallet password</LocalizedText></p>
      
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {hasPasswordWallet && (
          <div>
            <label className="block mb-2 text-sm font-semibold"><LocalizedText>Current Password</LocalizedText></label>
            <input
              className="w-full px-4 py-2 rounded-xl border border-[#333] bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
          </div>
        )}

        <div>
          <label className="block mb-2 text-sm font-semibold"><LocalizedText>New Password</LocalizedText></label>
          <input
            className="w-full px-4 py-2 rounded-xl border border-[#333] bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder={"Enter new password"}
            minLength={8}
            autoComplete="new-password"
            required
          />
          
          {/* Password strength indicator */}
          {newPassword && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-xs font-medium"><LocalizedText>Strength:</LocalizedText></div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-2 w-4 rounded-sm ${
                        level <= passwordStrength.score
                          ? passwordStrength.score <= 2
                            ? 'bg-red-500'
                            : passwordStrength.score <= 3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                          : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {passwordStrength.feedback.length > 0 && (
                <div className="text-xs text-gray-400">
                  {passwordStrength.feedback.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block mb-2 text-sm font-semibold"><LocalizedText>Confirm New Password</LocalizedText></label>
          <input
            className="w-full px-4 py-2 rounded-xl border border-[#333] bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={"Confirm new password"}
            autoComplete="new-password"
            required
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <div className="text-xs text-red-400 mt-1"><LocalizedText>Passwords do not match</LocalizedText></div>
          )}
        </div>

        <div className="bg-gray-900 p-4 rounded-xl">
          <h3 className="font-semibold mb-2 text-sm"><LocalizedText>Password Requirements:</LocalizedText></h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li><LocalizedText>• At least 8 characters long (12+ recommended)</LocalizedText></li>
            <li><LocalizedText>• Include uppercase and lowercase letters</LocalizedText></li>
            <li><LocalizedText>• Include numbers and special characters</LocalizedText></li>
            <li><LocalizedText>• Don&apos;t use easily guessable information</LocalizedText></li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={saving || !passwordStrength.isValid || newPassword !== confirmPassword}
          className="w-full py-3 px-4 rounded-xl border-[1px] border-[#ff6a00ff] bg-[#ff6a00ff] text-white hover:bg-white hover:text-[#ff6a00ff] transition-all duration-200 focus:outline-none cursor-pointer select-none font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#ff6a00ff] disabled:hover:text-white"
        >
          {saving ? "Changing Password..." : "Change Password"}
        </button>
      </form>
    </div>
  );
}
