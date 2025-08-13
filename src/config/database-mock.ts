import { logger } from '../utils/logger';

// Mock database interface that mimics PostgreSQL Pool
interface MockQueryResult {
  rows: any[];
  rowCount: number;
}

class MockDatabase {
  private users: any[] = [];
  private vehicles: any[] = [];
  private drivers: any[] = [];
  private orders: any[] = [];
  private orderItems: any[] = [];

  async query(text: string, params?: any[]): Promise<MockQueryResult> {
    logger.debug(`Mock DB Query: ${text}`, params);
    
    // Simple query parsing for basic operations
    if (text.includes('INSERT INTO users')) {
      const mockUser = {
        id: params?.[0] || 'mock-user-id',
        email: params?.[1] || 'test@example.com',
        password_hash: params?.[2] || 'hashed',
        first_name: params?.[3] || 'Test',
        last_name: params?.[4] || 'User',
        phone: params?.[5] || null,
        role: params?.[6] || 'customer',
        is_active: params?.[7] || true
      };
      this.users.push(mockUser);
      return { rows: [mockUser], rowCount: 1 };
    }
    
    if (text.includes('SELECT') && text.includes('FROM users')) {
      if (text.includes('WHERE email')) {
        const email = params?.[0];
        const user = this.users.find(u => u.email === email);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      return { rows: this.users, rowCount: this.users.length };
    }
    
    if (text.includes('SELECT NOW()')) {
      return { rows: [{ now: new Date() }], rowCount: 1 };
    }
    
    // Default empty result
    return { rows: [], rowCount: 0 };
  }

  async connect() {
    logger.info('Mock database connected');
    return this;
  }

  async end() {
    logger.info('Mock database connection closed');
  }
}

let mockDb: MockDatabase;

export const connectDB = async (): Promise<void> => {
  try {
    mockDb = new MockDatabase();
    await mockDb.connect();
    logger.info('Mock database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to mock database:', error);
    throw error;
  }
};

export const getDB = (): MockDatabase => {
  if (!mockDb) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return mockDb;
};

export const closeDB = async (): Promise<void> => {
  if (mockDb) {
    await mockDb.end();
    logger.info('Mock database connection closed');
  }
};
