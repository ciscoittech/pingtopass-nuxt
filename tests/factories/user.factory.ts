/**
 * User Factory
 * Generate test user data
 */

export interface UserFactoryOptions {
  id?: number;
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
  subscription_status?: 'free' | 'premium' | 'enterprise';
  google_id?: string;
  stripe_customer_id?: string;
  created_at?: Date;
}

let userIdCounter = 1;

export class UserFactory {
  static create(options: UserFactoryOptions = {}) {
    const id = options.id || userIdCounter++;
    
    return {
      id,
      email: options.email || `user${id}@example.com`,
      name: options.name || `Test User ${id}`,
      google_id: options.google_id || `google_${id}`,
      role: options.role || 'user',
      subscription_status: options.subscription_status || 'free',
      stripe_customer_id: options.stripe_customer_id || null,
      created_at: options.created_at || new Date(),
      updated_at: new Date()
    };
  }
  
  static createBatch(count: number, options: UserFactoryOptions = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.create({ ...options, id: (options.id || 0) + i })
    );
  }
  
  static createWithProgress(examId: number = 1) {
    const user = this.create();
    return {
      ...user,
      progress: {
        exam_id: examId,
        total_questions_answered: 0,
        correct_answers: 0,
        mastery_scores: {},
        last_activity: new Date()
      }
    };
  }
  
  static createPremium(options: UserFactoryOptions = {}) {
    return this.create({
      ...options,
      subscription_status: 'premium',
      stripe_customer_id: `cus_${Date.now()}`
    });
  }
  
  static createAdmin(options: UserFactoryOptions = {}) {
    return this.create({
      ...options,
      role: 'admin',
      subscription_status: 'premium'
    });
  }
  
  static reset() {
    userIdCounter = 1;
  }
}