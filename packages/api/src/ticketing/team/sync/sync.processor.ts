import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { SyncService } from './sync.service';
import { Queues } from '@@core/@core-services/queues/types';

@Processor(Queues.SYNC_JOBS_WORKER)
export class SyncProcessor {
  constructor(private syncService: SyncService) {}
  @Process('ticketing-sync-teams')
  async handleSyncTeams(job: Job) {
    try {
      console.log(`Processing queue -> ticketing-sync-teams ${job.id}`);
      await this.syncService.syncTeams();
    } catch (error) {
      console.error('Error syncing ticketing teams', error);
    }
  }
}
