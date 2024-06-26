import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { SyncService } from './sync.service';
import { Queues } from '@@core/@core-services/queues/types';

@Processor(Queues.SYNC_JOBS_WORKER)
export class SyncProcessor {
  constructor(private syncService: SyncService) {}
  @Process('crm-sync-notes')
  async handleSyncNotes(job: Job) {
    try {
      console.log(`Processing queue -> crm-sync-notes ${job.id}`);
      await this.syncService.syncNotes();
    } catch (error) {
      console.error('Error syncing crm notes', error);
    }
  }
}
