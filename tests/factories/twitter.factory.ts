/**
 * Twitter Factory
 * Generate test data for Twitter Growth System
 */

export interface TwitterProfileFactoryOptions {
  id?: number;
  username?: string;
  display_name?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  verified?: boolean;
  is_target?: boolean;
  engagement_score?: number;
}

export interface TweetFactoryOptions {
  id?: string;
  author_id?: string;
  text?: string;
  created_at?: Date;
  metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    impression_count?: number;
  };
  conversation_id?: string;
  referenced_tweets?: Array<{
    type: 'replied_to' | 'quoted' | 'retweeted';
    id: string;
  }>;
}

export interface VoiceProfileFactoryOptions {
  id?: number;
  user_id?: number;
  tone?: string;
  expertise_areas?: string[];
  communication_style?: string;
  common_phrases?: string[];
  engagement_rate?: number;
}

let profileIdCounter = 1;
let tweetIdCounter = 1;
let voiceProfileIdCounter = 1;

export class TwitterProfileFactory {
  static create(options: TwitterProfileFactoryOptions = {}) {
    const id = options.id || profileIdCounter++;
    
    return {
      id: `user_${id}`,
      username: options.username || `user${id}`,
      display_name: options.display_name || `Test User ${id}`,
      bio: options.bio || `Tech enthusiast. Cloud architect. DevOps practitioner.`,
      followers_count: options.followers_count || Math.floor(Math.random() * 10000),
      following_count: options.following_count || Math.floor(Math.random() * 1000),
      tweet_count: options.tweet_count || Math.floor(Math.random() * 5000),
      verified: options.verified || false,
      is_target: options.is_target !== undefined ? options.is_target : true,
      engagement_score: options.engagement_score || Math.random(),
      created_at: new Date(),
      profile_image_url: `https://example.com/profile/${id}.jpg`
    };
  }
  
  static createInfluencer(options: TwitterProfileFactoryOptions = {}) {
    return this.create({
      ...options,
      followers_count: Math.floor(Math.random() * 50000) + 10000,
      verified: true,
      engagement_score: Math.random() * 0.5 + 0.5 // 0.5-1.0
    });
  }
  
  static createTargetAudience(count: number = 10) {
    const topics = [
      'DevOps', 'Cloud', 'Security', 'Kubernetes', 'AWS',
      'Python', 'JavaScript', 'AI/ML', 'Networking', 'Linux'
    ];
    
    return Array.from({ length: count }, () => {
      const expertiseCount = Math.floor(Math.random() * 3) + 1;
      const expertise = topics
        .sort(() => Math.random() - 0.5)
        .slice(0, expertiseCount)
        .join(', ');
      
      return this.create({
        bio: `${expertise} expert. Building scalable systems.`,
        is_target: true,
        engagement_score: Math.random() * 0.3 + 0.7 // 0.7-1.0
      });
    });
  }
  
  static createBatch(count: number, options: TwitterProfileFactoryOptions = {}) {
    return Array.from({ length: count }, (_, i) => 
      this.create({ ...options, id: (options.id || 0) + i })
    );
  }
  
  static reset() {
    profileIdCounter = 1;
  }
}

export class TweetFactory {
  static create(options: TweetFactoryOptions = {}) {
    const id = options.id || `tweet_${tweetIdCounter++}`;
    const created_at = options.created_at || new Date();
    
    return {
      id,
      author_id: options.author_id || `user_1`,
      text: options.text || `This is a test tweet about cloud architecture and DevOps best practices. #CloudComputing #DevOps`,
      created_at,
      metrics: {
        like_count: options.metrics?.like_count || Math.floor(Math.random() * 100),
        retweet_count: options.metrics?.retweet_count || Math.floor(Math.random() * 20),
        reply_count: options.metrics?.reply_count || Math.floor(Math.random() * 10),
        impression_count: options.metrics?.impression_count || Math.floor(Math.random() * 1000)
      },
      conversation_id: options.conversation_id || id,
      referenced_tweets: options.referenced_tweets || [],
      entities: {
        hashtags: ['CloudComputing', 'DevOps'],
        mentions: [],
        urls: []
      }
    };
  }
  
  static createThread(count: number = 3, authorId: string = 'user_1') {
    const conversationId = `tweet_${tweetIdCounter++}`;
    const tweets = [];
    
    for (let i = 0; i < count; i++) {
      const tweet = this.create({
        author_id: authorId,
        text: `Thread ${i + 1}/${count}: Important insights about system design...`,
        conversation_id: conversationId,
        referenced_tweets: i > 0 ? [{ type: 'replied_to', id: tweets[i - 1].id }] : []
      });
      tweets.push(tweet);
    }
    
    return tweets;
  }
  
  static createViralTweet(options: TweetFactoryOptions = {}) {
    return this.create({
      ...options,
      metrics: {
        like_count: Math.floor(Math.random() * 5000) + 1000,
        retweet_count: Math.floor(Math.random() * 1000) + 200,
        reply_count: Math.floor(Math.random() * 500) + 100,
        impression_count: Math.floor(Math.random() * 50000) + 10000
      }
    });
  }
  
  static createReply(originalTweetId: string, authorId: string = 'user_2') {
    return this.create({
      author_id: authorId,
      text: `Great point! This aligns with our experience implementing similar solutions.`,
      conversation_id: originalTweetId,
      referenced_tweets: [{ type: 'replied_to', id: originalTweetId }]
    });
  }
  
  static createBatch(count: number, options: TweetFactoryOptions = {}) {
    return Array.from({ length: count }, () => this.create(options));
  }
  
  static reset() {
    tweetIdCounter = 1;
  }
}

export class VoiceProfileFactory {
  static create(options: VoiceProfileFactoryOptions = {}) {
    const id = options.id || voiceProfileIdCounter++;
    
    return {
      id,
      user_id: options.user_id || 1,
      tone: options.tone || 'professional',
      expertise_areas: options.expertise_areas || ['cloud', 'devops', 'security'],
      communication_style: options.communication_style || 'technical but approachable',
      common_phrases: options.common_phrases || [
        'interesting approach',
        'performance matters',
        'edge-first architecture',
        'scalability is key'
      ],
      engagement_rate: options.engagement_rate || 0.15,
      sample_tweets: [
        'Just deployed our new edge-first architecture. Sub-100ms globally!',
        'Performance matters: optimized our queries from 500ms to 50ms.',
        'Interesting approach to solving the cold start problem in serverless.'
      ],
      created_at: new Date(),
      updated_at: new Date()
    };
  }
  
  static createCasual(options: VoiceProfileFactoryOptions = {}) {
    return this.create({
      ...options,
      tone: 'casual',
      communication_style: 'friendly and conversational',
      common_phrases: [
        'love this',
        'totally agree',
        'game changer',
        'mind blown'
      ]
    });
  }
  
  static createTechnical(options: VoiceProfileFactoryOptions = {}) {
    return this.create({
      ...options,
      tone: 'technical',
      communication_style: 'detailed and precise',
      common_phrases: [
        'implementation details',
        'architectural patterns',
        'performance metrics',
        'optimization strategies'
      ]
    });
  }
  
  static reset() {
    voiceProfileIdCounter = 1;
  }
}

export class EngagementQueueFactory {
  static create(tweetId: string, userId: number = 1) {
    return {
      id: `queue_${Date.now()}`,
      tweet_id: tweetId,
      user_id: userId,
      suggested_reply: 'Great insights! This approach to distributed systems is fascinating.',
      confidence_score: Math.random() * 0.3 + 0.7, // 0.7-1.0
      status: 'pending' as const,
      created_at: new Date(),
      scheduled_for: new Date(Date.now() + 3600000) // 1 hour from now
    };
  }
  
  static createBatch(tweets: any[], userId: number = 1) {
    return tweets.map(tweet => this.create(tweet.id, userId));
  }
  
  static createApproved(tweetId: string, userId: number = 1) {
    return {
      ...this.create(tweetId, userId),
      status: 'approved' as const,
      approved_at: new Date(),
      approved_by: userId
    };
  }
  
  static createRejected(tweetId: string, userId: number = 1, reason: string = 'Not relevant') {
    return {
      ...this.create(tweetId, userId),
      status: 'rejected' as const,
      rejected_at: new Date(),
      rejected_by: userId,
      rejection_reason: reason
    };
  }
}