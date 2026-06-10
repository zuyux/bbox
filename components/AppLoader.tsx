'use client';

import { LoaderCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppLoaderProps {
  isLoading: boolean;
}

export default function AppLoader({ isLoading }: AppLoaderProps) {
  if (!isLoading) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className="w-full max-w-3xl rounded-[32px] border border-border bg-card/90 p-8 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-8">
          <LoaderCircle className="animate-spin text-primary" size={38} />
          <div>
            <p className="text-lg font-semibold text-foreground">Preparing BBOX</p>
            <p className="text-sm text-muted-foreground">Loading essential resources. This should be quick.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 rounded-3xl border border-border bg-muted/20 p-4">
            <div className="h-4 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-4/5 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="space-y-3 rounded-3xl border border-border bg-muted/20 p-4">
            <div className="h-4 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-4/5 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="space-y-3 rounded-3xl border border-border bg-muted/20 p-4">
            <div className="h-4 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-4/5 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
