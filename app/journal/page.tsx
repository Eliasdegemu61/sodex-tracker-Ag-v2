import type { Metadata } from 'next';
import { PortfolioProvider } from '@/context/portfolio-context';
import { JournalPageClient } from '@/components/journal/journal-page-client';

export const metadata: Metadata = {
    title: 'Trading Journal — SoDex Tracker',
    description: 'Create and track trading plans, enforce discipline rules, and analyze your performance.',
};

export default function JournalPage() {
    return (
        <PortfolioProvider>
            <JournalPageClient />
        </PortfolioProvider>
    );
}
