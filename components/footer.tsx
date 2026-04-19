'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function Footer() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <footer className="border-t border-border bg-background/50 mt-12">
      <div className="px-4 md:px-6 py-8">
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
          {/* X (Twitter) Link */}
          <a
            href="https://x.com/eliasing__"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-orange-500 transition-colors flex items-center justify-center p-1.5 sm:p-2 rounded-lg hover:bg-orange-500/10"
            title="Follow on X"
            aria-label="Follow on X"
          >
            <svg
              className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.6l-5.165-6.756-5.868 6.756h-3.308l7.732-8.835L2.882 2.25h6.6l4.759 6.318L18.244 2.25zM17.55 19.5h1.832L6.281 3.75H4.38L17.55 19.5z" />
            </svg>
          </a>

          {/* Telegram Link */}
          <a
            href="https://t.me/fallphile"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-orange-500 transition-colors flex items-center justify-center p-1.5 sm:p-2 rounded-lg hover:bg-orange-500/10"
            title="Chat on Telegram"
            aria-label="Chat on Telegram"
          >
            <Send className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </a>

          {/* Separator dot */}
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />

          {/* Built by text */}
          <span className="text-xs">Built by Elias</span>

          {/* Separator dot */}
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />

          {/* Disclaimer Button */}
          <button
            onClick={() => setShowDisclaimer(true)}
            className="hover:text-orange-500 transition-colors underline text-xs"
            title="View disclaimer"
          >
            Disclaimer
          </button>
        </div>
      </div>

      {/* Disclaimer Dialog */}
      <Dialog open={showDisclaimer} onOpenChange={setShowDisclaimer}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Disclaimer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              This dashboard is an independent, community built analytics tool created for tracking on-chain activity related to SoDEX. It is not affiliated with, endorsed by, or operated by the SoDEX team. All data is provided for informational purposes only and should not be considered financial advice. Always verify transactions and contract addresses directly on the blockchain before making any decisions.
            </p>
            <p className="pt-2 border-t border-border">
              - Elias (SoDex OG)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </footer>
  );
}

