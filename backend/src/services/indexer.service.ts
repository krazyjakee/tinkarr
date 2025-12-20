import { db } from '../db';
import { indexers, type Indexer, type NewIndexer } from '../db/schema';
import { eq } from 'drizzle-orm';

export class IndexerService {
  async getAll(): Promise<Indexer[]> {
    return db.select().from(indexers);
  }

  async getById(id: number): Promise<Indexer> {
    const [indexer] = await db.select().from(indexers).where(eq(indexers.id, id));

    if (!indexer) {
      throw new Error('Indexer not found');
    }

    return indexer;
  }

  async create(data: Partial<NewIndexer>): Promise<Indexer> {
    // Convert objects to JSON strings
    const insertData = {
      ...data,
      searchParams: data.searchParams ? JSON.stringify(data.searchParams) : null,
      rssParams: data.rssParams ? JSON.stringify(data.rssParams) : null,
      resultMapping: data.resultMapping ? JSON.stringify(data.resultMapping) : null,
    };

    const [newIndexer] = await db.insert(indexers).values(insertData as any).returning();

    return newIndexer;
  }

  async update(id: number, data: Partial<NewIndexer>): Promise<Indexer> {
    // Convert objects to JSON strings
    const updateData: any = { ...data };

    if (data.searchParams) {
      updateData.searchParams = JSON.stringify(data.searchParams);
    }
    if (data.rssParams) {
      updateData.rssParams = JSON.stringify(data.rssParams);
    }
    if (data.resultMapping) {
      updateData.resultMapping = JSON.stringify(data.resultMapping);
    }

    const [updatedIndexer] = await db
      .update(indexers)
      .set(updateData)
      .where(eq(indexers.id, id))
      .returning();

    if (!updatedIndexer) {
      throw new Error('Indexer not found');
    }

    return updatedIndexer;
  }

  async delete(id: number): Promise<void> {
    const result = await db.delete(indexers).where(eq(indexers.id, id));

    if (result.changes === 0) {
      throw new Error('Indexer not found');
    }
  }

  async toggle(id: number): Promise<Indexer> {
    const indexer = await this.getById(id);
    return this.update(id, { enabled: !indexer.enabled });
  }
}

export const indexerService = new IndexerService();
