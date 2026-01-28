import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
  PostmanEvent,
  CollectionSummary,
  RequestSummary,
  FlattenedRequest
} from '../types/postman.js';

export class CollectionLoader {
  private collections: Map<string, PostmanCollection> = new Map();
  private flattenedRequests: FlattenedRequest[] = [];

  constructor(collectionsPath: string) {
    this.loadCollections(collectionsPath);
  }

  private loadCollections(collectionsPath: string): void {
    const files = readdirSync(collectionsPath);

    for (const file of files) {
      if (file.endsWith('.postman_collection.json')) {
        const filePath = join(collectionsPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const collection: PostmanCollection = JSON.parse(content);

        this.collections.set(collection.info.name, collection);
        this.flattenRequests(collection.info.name, collection.item);
      }
    }
  }

  private flattenRequests(
    collectionName: string,
    items: PostmanItem[],
    parentPath: string = ''
  ): void {
    for (const item of items) {
      const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;

      if (item.request) {
        this.flattenedRequests.push({
          collection: collectionName,
          name: item.name,
          request: item.request,
          events: item.event
        });
      }

      if (item.item) {
        this.flattenRequests(collectionName, item.item, currentPath);
      }
    }
  }

  listCollections(): CollectionSummary[] {
    const summaries: CollectionSummary[] = [];

    for (const [name, collection] of this.collections) {
      const requestCount = this.countRequests(collection.item);
      summaries.push({ name, requestCount });
    }

    return summaries;
  }

  private countRequests(items: PostmanItem[]): number {
    let count = 0;

    for (const item of items) {
      if (item.request) {
        count++;
      }
      if (item.item) {
        count += this.countRequests(item.item);
      }
    }

    return count;
  }

  listRequests(collectionName?: string): RequestSummary[] {
    const requests = collectionName
      ? this.flattenedRequests.filter(r => r.collection === collectionName)
      : this.flattenedRequests;

    return requests.map(r => ({
      collection: r.collection,
      name: r.name,
      method: r.request.method,
      path: this.extractPath(r.request.url.raw)
    }));
  }

  private extractPath(rawUrl: string): string {
    const urlWithoutVars = rawUrl.replace(/\{\{[^}]+\}\}/g, '');
    const match = urlWithoutVars.match(/\/v\d+\/.*/);
    return match ? match[0].split('?')[0] : rawUrl;
  }

  findRequest(name: string, collectionName?: string): FlattenedRequest | null {
    const normalizedName = name.toLowerCase();

    const matches = this.flattenedRequests.filter(r => {
      const nameMatch = r.name.toLowerCase() === normalizedName ||
                       r.name.toLowerCase().includes(normalizedName);
      const collectionMatch = !collectionName ||
                             r.collection.toLowerCase() === collectionName.toLowerCase();
      return nameMatch && collectionMatch;
    });

    if (matches.length === 0) {
      return null;
    }

    const exactMatch = matches.find(r => r.name.toLowerCase() === normalizedName);
    return exactMatch || matches[0];
  }

  getCollection(name: string): PostmanCollection | undefined {
    return this.collections.get(name);
  }
}
