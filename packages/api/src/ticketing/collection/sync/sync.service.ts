import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@@core/@core-services/logger/logger.service';
import { PrismaService } from '@@core/@core-services/prisma/prisma.service';
import { SyncError, throwTypedError } from '@@core/utils/errors';
import { Cron } from '@nestjs/schedule';
import { ApiResponse } from '@@core/utils/types';
import { v4 as uuidv4 } from 'uuid';
import { ServiceRegistry } from '../services/registry.service';
import { TicketingObject } from '@ticketing/@lib/@types';
import { WebhookService } from '@@core/@core-services/webhooks/panora-webhooks/webhook.service';
import { UnifiedCollectionOutput } from '../types/model.unified';
import { ICollectionService } from '../types';
import { OriginalCollectionOutput } from '@@core/utils/types/original/original.ticketing';
import { tcg_collections as TicketingCollection } from '@prisma/client';
import { TICKETING_PROVIDERS } from '@panora/shared';
import { CoreSyncRegistry } from '@@core/@core-services/registries/core-sync.registry';
import { BullQueueService } from '@@core/@core-services/queues/shared.service';
import { CoreUnification } from '@@core/@core-services/unification/core-unification.service';

@Injectable()
export class SyncService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private webhook: WebhookService,
    private serviceRegistry: ServiceRegistry,
    private coreUnification: CoreUnification,
    private registry: CoreSyncRegistry,
    private bullQueueService: BullQueueService,
  ) {
    this.logger.setContext(SyncService.name);
    this.registry.registerService('ticketing', 'collection', this);
  }

  async onModuleInit() {
    try {
      await this.bullQueueService.queueSyncJob(
        'ticketing-sync-collections',
        '0 0 * * *',
      );
    } catch (error) {
      throw error;
    }
  }

  //function used by sync worker which populate our tcg_collections table
  //its role is to fetch all collections from providers 3rd parties and save the info inside our db
  // @Cron('*/2 * * * *') // every 2 minutes (for testing)
  @Cron('0 */8 * * *') // every 8 hours
  async syncCollections(user_id?: string) {
    try {
      this.logger.log(`Syncing collections....`);
      const users = user_id
        ? [
            await this.prisma.users.findUnique({
              where: {
                id_user: user_id,
              },
            }),
          ]
        : await this.prisma.users.findMany();
      if (users && users.length > 0) {
        for (const user of users) {
          const projects = await this.prisma.projects.findMany({
            where: {
              id_user: user.id_user,
            },
          });
          for (const project of projects) {
            const id_project = project.id_project;
            const linkedUsers = await this.prisma.linked_users.findMany({
              where: {
                id_project: id_project,
              },
            });
            linkedUsers.map(async (linkedUser) => {
              try {
                const providers = TICKETING_PROVIDERS;
                for (const provider of providers) {
                  try {
                    await this.syncCollectionsForLinkedUser(
                      provider,
                      linkedUser.id_linked_user,
                      id_project,
                    );
                  } catch (error) {
                    throw error;
                  }
                }
              } catch (error) {
                throw error;
              }
            });
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  //todo: HANDLE DATA REMOVED FROM PROVIDER
  async syncCollectionsForLinkedUser(
    integrationId: string,
    linkedUserId: string,
    id_project: string,
  ) {
    try {
      this.logger.log(
        `Syncing ${integrationId} collections for linkedUser ${linkedUserId}`,
      );
      // check if linkedTeam has a connection if not just stop sync
      const connection = await this.prisma.connections.findFirst({
        where: {
          id_linked_user: linkedUserId,
          provider_slug: integrationId,
          vertical: 'ticketing',
        },
      });
      if (!connection) {
        this.logger.warn(
          `Skipping collections syncing... No ${integrationId} connection was found for linked user ${linkedUserId} `,
        );
      }

      const service: ICollectionService =
        this.serviceRegistry.getService(integrationId);
      if (!service) return;
      const resp: ApiResponse<OriginalCollectionOutput[]> =
        await service.syncCollections(linkedUserId);

      const sourceObject: OriginalCollectionOutput[] = resp.data;
      //this.logger.log('SOURCE OBJECT DATA = ' + JSON.stringify(sourceObject));
      //unify the data according to the target obj wanted
      const unifiedObject = (await this.coreUnification.unify<
        OriginalCollectionOutput[]
      >({
        sourceObject,
        targetType: TicketingObject.collection,
        providerName: integrationId,
        vertical: 'ticketing',
        connectionId: connection.id_connection,
        customFieldMappings: [],
      })) as UnifiedCollectionOutput[];

      //insert the data in the DB with the fieldMappings (value table)
      const collection_data = await this.saveCollectionsInDb(
        connection.id_connection,
        linkedUserId,
        unifiedObject,
        integrationId,
        sourceObject,
      );

      const event = await this.prisma.events.create({
        data: {
          id_event: uuidv4(),
          status: 'success',
          type: 'ticketing.collection.synced',
          method: 'SYNC',
          url: '/sync',
          provider: integrationId,
          direction: '0',
          timestamp: new Date(),
          id_linked_user: linkedUserId,
        },
      });

      await this.webhook.handleWebhook(
        collection_data,
        'ticketing.collection.pulled',
        id_project,
        event.id_event,
      );
    } catch (error) {
      throw error;
    }
  }

  async saveCollectionsInDb(
    connection_id: string,
    linkedUserId: string,
    collections: UnifiedCollectionOutput[],
    originSource: string,
    remote_data: Record<string, any>[],
  ): Promise<TicketingCollection[]> {
    try {
      let collections_results: TicketingCollection[] = [];
      console.log(collections);
      for (let i = 0; i < collections.length; i++) {
        const collection = collections[i];
        const originId = collection.remote_id;

        if (!originId || originId == '') {
          throw new ReferenceError(`Origin id not there, found ${originId}`);
        }

        const existingTeam = await this.prisma.tcg_collections.findFirst({
          where: {
            remote_id: originId,
            id_connection: connection_id,
          },
        });

        let unique_ticketing_collection_id: string;

        if (existingTeam) {
          // Update the existing ticket
          const res = await this.prisma.tcg_collections.update({
            where: {
              id_tcg_collection: existingTeam.id_tcg_collection,
            },
            data: {
              name: existingTeam.name,
              description: collection.description,
              collection_type: collection.collection_type,
              modified_at: new Date(),
            },
          });
          unique_ticketing_collection_id = res.id_tcg_collection;
          collections_results = [...collections_results, res];
        } else {
          // Create a new collection
          this.logger.log('not existing collection ' + collection.name);
          const data = {
            id_tcg_collection: uuidv4(),
            name: collection.name,
            description: collection.description,
            collection_type: collection.collection_type,
            created_at: new Date(),
            modified_at: new Date(),
            remote_id: originId,
            id_connection: connection_id,
          };
          const res = await this.prisma.tcg_collections.create({
            data: data,
          });
          collections_results = [...collections_results, res];
          unique_ticketing_collection_id = res.id_tcg_collection;
        }

        //insert remote_data in db
        await this.prisma.remote_data.upsert({
          where: {
            ressource_owner_id: unique_ticketing_collection_id,
          },
          create: {
            id_remote_data: uuidv4(),
            ressource_owner_id: unique_ticketing_collection_id,
            format: 'json',
            data: JSON.stringify(remote_data[i]),
            created_at: new Date(),
          },
          update: {
            data: JSON.stringify(remote_data[i]),
            created_at: new Date(),
          },
        });
      }
      return collections_results;
    } catch (error) {
      throw error;
    }
  }
}
