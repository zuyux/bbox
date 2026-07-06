'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, Home, ExternalLink, Sparkles } from 'lucide-react';
import { getExplorerTxUrl } from '@/lib/bbox-contract';
import { getPersistedNetwork } from '@/lib/network';

export default function SubmitSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txId = searchParams.get('txid');
  const networkParam = searchParams.get('network');
  const resolvedNetwork = networkParam || getPersistedNetwork();
  const explorerUrl = txId ? getExplorerTxUrl(txId, resolvedNetwork || 'testnet') : null;
  const shortTxId = txId ? `${txId.slice(0, 6)}…${txId.slice(-4)}` : null;

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Card */}
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800">
            <CardContent className="p-12 text-center">
              {/* Success Icon */}
              <div className="mb-6 relative inline-block">
                <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative bg-green-500 rounded-full p-6 inline-block">
                  <CheckCircle className="w-16 h-16 text-white" />
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Submission Successful!
              </h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                Your app has been submitted to BBOX for review
              </p>

              {explorerUrl && (
                <div className="w-full mb-8 inline-flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-white/80 px-6 py-4 text-center shadow-sm dark:border-green-900/40 dark:bg-green-950/30">
                  <p className="text-sm text-muted-foreground">View your on-chain submission</p>
                  <Button asChild variant="outline" className="w-full cursor-pointer">
                    <a href={explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      {shortTxId}
                    </a>
                  </Button>
                </div>
              )}

              {/* What's Next Section */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-8 mb-8 text-left shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <h2 className="text-2xl font-bold">What happens next?</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Review Process</h3>
                      <p className="text-sm text-muted-foreground">
                        Our team will review your app submission within 24-48 hours. We&apos;ll verify all links, metadata, and ensure it meets our guidelines.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email Notification</h3>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll receive an email confirmation shortly, followed by another email once your app is approved or if any changes are needed.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Go Live!</h3>
                      <p className="text-sm text-muted-foreground">
                        Once approved, your app will be live on BBOX and discoverable by the sovereign software community. You can update it anytime from your dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6 mb-8 text-left">
                <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-3 flex items-center gap-2">
                  <span>💡</span>
                  <span>Pro Tips While You Wait</span>
                </h3>
                <ul className="space-y-2 text-sm text-orange-800 dark:text-orange-300">
                  <li className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Make sure your website and documentation are up to date</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Prepare screenshots and promotional materials</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Join our community to connect with other open-source builders</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>Consider preparing a launch announcement for social media</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => router.push('/apps')}
                  size="lg"
                  className="cursor-pointer bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Browse Apps
                </Button>
                <Button
                  onClick={() => router.push('/submit/review')}
                  size="lg"
                  className="cursor-pointer bg-foreground text-background hover:bg-foreground/90"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Review Submissions
                </Button>
                <Button
                  onClick={() => router.push('/')}
                  size="lg"
                  variant="outline"
                >
                  <ArrowRight className="cursor-pointer w-5 h-5 mr-2" />
                  Back to Home
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* Additional Resources */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.open('https://github.com/zuyux/bbox', '_blank')}>
              <CardContent className="p-6">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Documentation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Learn more about BBOX features and how to optimize your app listing
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = 'mailto:fabohax@gmail.com'}>
              <CardContent className="p-6">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Need Help?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Contact us at fabohax@gmail.com for any questions or support
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
