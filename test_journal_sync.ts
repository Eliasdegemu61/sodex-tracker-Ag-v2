import { syncLocalPlansToCloud, getPlans, savePlan } from './lib/journal-store';

async function testSync() {
    console.log('--- Starting Sync Test ---');
    
    try {
        // 1. Check current plans
        const initialPlans = await getPlans();
        console.log('Initial plans count:', initialPlans.length);

        // 2. Try to sync
        console.log('Attempting syncLocalPlansToCloud...');
        await syncLocalPlansToCloud();
        console.log('Sync call completed.');

        // 3. Check plans after sync
        const finalPlans = await getPlans();
        console.log('Final plans count:', finalPlans.length);
        
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

testSync();
