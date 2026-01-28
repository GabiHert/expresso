import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface PostmanWorkspaceCollection {
  id: string;
  name: string;
  uid: string;
}

export class PostmanSync {
  private apiKey: string;
  private workspaceId: string;
  private collectionsPath: string;
  private forbiddenEnvs: string[];

  constructor(apiKey: string, workspaceId: string, collectionsPath: string, forbiddenEnvs: string[] = []) {
    this.apiKey = apiKey;
    this.workspaceId = workspaceId;
    this.collectionsPath = collectionsPath;
    this.forbiddenEnvs = forbiddenEnvs;
  }

  isEnvForbidden(envName: string): boolean {
    return this.forbiddenEnvs.some(forbidden =>
      forbidden.toLowerCase() === envName.toLowerCase()
    );
  }

  async syncCollections(): Promise<{ synced: string[]; errors: string[] }> {
    const synced: string[] = [];
    const errors: string[] = [];

    if (!this.apiKey || !this.workspaceId) {
      errors.push('Missing API key or workspace ID');
      return { synced, errors };
    }

    try {
      const collections = await this.listWorkspaceCollections();

      for (const collection of collections) {
        try {
          const fullCollection = await this.getCollection(collection.uid);
          const fileName = `${collection.name}.postman_collection.json`;
          const filePath = join(this.collectionsPath, fileName);

          if (!existsSync(this.collectionsPath)) {
            mkdirSync(this.collectionsPath, { recursive: true });
          }

          writeFileSync(filePath, JSON.stringify(fullCollection, null, 2));
          synced.push(collection.name);
        } catch (err) {
          errors.push(`Failed to sync ${collection.name}: ${err}`);
        }
      }

      // Also sync environments (skip forbidden ones)
      try {
        const environments = await this.listWorkspaceEnvironments();
        for (const env of environments) {
          if (this.isEnvForbidden(env.name)) {
            synced.push(`Environment: ${env.name} (SKIPPED - forbidden)`);
            continue;
          }
          try {
            const fullEnv = await this.getEnvironment(env.uid);
            const fileName = `${env.name}.postman_environment.json`;
            const filePath = join(this.collectionsPath, fileName);
            writeFileSync(filePath, JSON.stringify(fullEnv, null, 2));
            synced.push(`Environment: ${env.name}`);
          } catch (err) {
            errors.push(`Failed to sync environment ${env.name}: ${err}`);
          }
        }
      } catch (err) {
        errors.push(`Failed to list environments: ${err}`);
      }

    } catch (err) {
      errors.push(`Failed to list collections: ${err}`);
    }

    return { synced, errors };
  }

  private async listWorkspaceCollections(): Promise<PostmanWorkspaceCollection[]> {
    const response = await fetch(
      `https://api.getpostman.com/workspaces/${this.workspaceId}`,
      {
        headers: {
          'X-Api-Key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get workspace: ${response.status}`);
    }

    const data = await response.json() as {
      workspace: {
        collections: PostmanWorkspaceCollection[];
      };
    };

    return data.workspace.collections || [];
  }

  private async listWorkspaceEnvironments(): Promise<PostmanWorkspaceCollection[]> {
    const response = await fetch(
      `https://api.getpostman.com/workspaces/${this.workspaceId}`,
      {
        headers: {
          'X-Api-Key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get workspace: ${response.status}`);
    }

    const data = await response.json() as {
      workspace: {
        environments: PostmanWorkspaceCollection[];
      };
    };

    return data.workspace.environments || [];
  }

  private async getCollection(collectionUid: string): Promise<unknown> {
    const response = await fetch(
      `https://api.getpostman.com/collections/${collectionUid}`,
      {
        headers: {
          'X-Api-Key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get collection: ${response.status}`);
    }

    const data = await response.json() as { collection: unknown };
    return data.collection;
  }

  private async getEnvironment(envUid: string): Promise<unknown> {
    const response = await fetch(
      `https://api.getpostman.com/environments/${envUid}`,
      {
        headers: {
          'X-Api-Key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get environment: ${response.status}`);
    }

    const data = await response.json() as { environment: unknown };
    return data.environment;
  }
}
