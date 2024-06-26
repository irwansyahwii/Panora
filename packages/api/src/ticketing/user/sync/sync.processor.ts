import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { SyncService } from './sync.service';
import { Queues } from '@@core/@core-services/queues/types';

@Processor(Queues.SYNC_JOBS_WORKER)
export class SyncProcessor {
  constructor(private syncService: SyncService) {}
  @Process('ticketing-sync-users')
  async handleSyncUsers(job: Job) {
    try {
      console.log(`Processing queue -> ticketing-sync-users ${job.id}`);
      await this.syncService.syncUsers();
    } catch (error) {
      console.error('Error syncing ticketing users', error);
    }
  }
}
