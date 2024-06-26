import { ZohoEngagementInput, ZohoEngagementOutput } from './types';
import {
  UnifiedEngagementInput,
  UnifiedEngagementOutput,
} from '@crm/engagement/types/model.unified';
import { IEngagementMapper } from '@crm/engagement/types';
import { MappersRegistry } from '@@core/@core-services/registries/mappers.registry';
import { Injectable } from '@nestjs/common';
import { Utils } from '@ticketing/@lib/@utils';

@Injectable()
export class ZohoEngagementMapper implements IEngagementMapper {
  constructor(private mappersRegistry: MappersRegistry, private utils: Utils) {
    this.mappersRegistry.registerService('crm', 'engagement', 'zoho', this);
  }

  desunify(
    source: UnifiedEngagementInput,
    customFieldMappings?: {
      slug: string;
      remote_id: string;
    }[],
  ): ZohoEngagementInput {
    return;
  }

  async unify(
    source: ZohoEngagementOutput | ZohoEngagementOutput[],
    engagement_type: string,
    connectionId: string,
    customFieldMappings?: {
      slug: string;
      remote_id: string;
    }[],
  ): Promise<UnifiedEngagementOutput | UnifiedEngagementOutput[]> {
    if (!Array.isArray(source)) {
      return this.mapSingleEngagementToUnified(
        source,
        connectionId,
        customFieldMappings,
      );
    }

    // Handling array of HubspotEngagementOutput
    return source.map((engagement) =>
      this.mapSingleEngagementToUnified(
        engagement,
        connectionId,
        customFieldMappings,
      ),
    );
  }

  private mapSingleEngagementToUnified(
    engagement: ZohoEngagementOutput,
    connectionId: string,
    customFieldMappings?: {
      slug: string;
      remote_id: string;
    }[],
  ): UnifiedEngagementOutput {
    return;
  }
}
