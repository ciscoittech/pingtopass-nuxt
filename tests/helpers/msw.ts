/**
 * Mock Service Worker (MSW) Setup
 * Provides API mocking for external services and consistent test responses
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { faker } from '@faker-js/faker';

/**
 * Mock handlers for external APIs
 */
export const handlers = [
  // Google OAuth API
  http.post('https://oauth2.googleapis.com/token', () => {
    return HttpResponse.json({
      access_token: faker.string.alphanumeric(64),
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: faker.string.alphanumeric(64),
      scope: 'openid email profile',
      id_token: generateMockIdToken()
    });
  }),

  http.get('https://www.googleapis.com/oauth2/v2/userinfo', () => {
    return HttpResponse.json({
      id: faker.string.numeric(10),
      email: faker.internet.email(),
      verified_email: true,
      name: faker.person.fullName(),
      given_name: faker.person.firstName(),
      family_name: faker.person.lastName(),
      picture: faker.image.avatar()
    });
  }),

  // Stripe API
  http.post('https://api.stripe.com/v1/customers', () => {
    return HttpResponse.json({
      id: `cus_${faker.string.alphanumeric(14)}`,
      object: 'customer',
      email: faker.internet.email(),
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      metadata: {}
    });
  }),

  http.post('https://api.stripe.com/v1/checkout/sessions', () => {
    return HttpResponse.json({
      id: `cs_${faker.string.alphanumeric(14)}`,
      object: 'checkout.session',
      url: `https://checkout.stripe.com/pay/cs_${faker.string.alphanumeric(14)}`,
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel'
    });
  }),

  // OpenRouter API (LangChain integration)
  http.post('https://openrouter.ai/api/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as any;
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1]?.content || '';

    // Generate contextual mock responses based on request
    let mockContent = '';
    if (lastMessage.includes('question')) {
      mockContent = generateMockQuestion();
    } else if (lastMessage.includes('explanation')) {
      mockContent = generateMockExplanation();
    } else {
      mockContent = faker.lorem.paragraph();
    }

    return HttpResponse.json({
      id: `chatcmpl-${faker.string.alphanumeric(20)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'qwen/qwen3-30b-a3b-instruct-2507',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: mockContent
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: faker.number.int({ min: 50, max: 200 }),
        completion_tokens: faker.number.int({ min: 50, max: 300 }),
        total_tokens: faker.number.int({ min: 100, max: 500 })
      }
    });
  }),

  // Twitter API v2
  http.get('https://api.twitter.com/2/users/me', ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('Bearer')) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json({
      data: {
        id: faker.string.numeric(15),
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        verified: faker.datatype.boolean(),
        public_metrics: {
          followers_count: faker.number.int({ min: 100, max: 10000 }),
          following_count: faker.number.int({ min: 50, max: 1000 }),
          tweet_count: faker.number.int({ min: 100, max: 50000 })
        }
      }
    });
  }),

  http.post('https://api.twitter.com/2/tweets', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      data: {
        id: faker.string.numeric(15),
        text: body.text || faker.lorem.sentence(),
        created_at: new Date().toISOString()
      }
    });
  }),

  // Cloudflare API (for Workers/Pages deployment)
  http.get('https://api.cloudflare.com/client/v4/user', () => {
    return HttpResponse.json({
      success: true,
      result: {
        id: faker.string.alphanumeric(32),
        email: faker.internet.email(),
        username: faker.internet.userName()
      }
    });
  }),

  // Error simulation handlers
  http.get('https://api.example.com/error/500', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.get('https://api.example.com/error/timeout', () => {
    // Simulate timeout
    return new Promise(() => {}); // Never resolves
  }),

  http.get('https://api.example.com/error/network', () => {
    throw new Error('Network error');
  })
];

/**
 * Create and configure MSW server for Node.js tests
 */
export const server = setupServer(...handlers);

/**
 * Setup MSW for all tests
 */
export function setupMSW() {
  // Enable request interception
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn'
    });
  });

  // Reset handlers after each test
  afterEach(() => {
    server.resetHandlers();
  });

  // Cleanup
  afterAll(() => {
    server.close();
  });
}

/**
 * Add custom handlers for specific tests
 */
export function addMockHandlers(...newHandlers: any[]) {
  server.use(...newHandlers);
}

/**
 * Mock network delays for performance testing
 */
export function mockNetworkDelay(delay: number = 100) {
  server.use(
    http.all('*', async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return HttpResponse.passthrough();
    })
  );
}

/**
 * Mock intermittent network failures
 */
export function mockNetworkFailures(failureRate: number = 0.2) {
  server.use(
    http.all('*', () => {
      if (Math.random() < failureRate) {
        return new HttpResponse(null, { status: 500 });
      }
      return HttpResponse.passthrough();
    })
  );
}

// Helper functions for generating realistic mock data

function generateMockIdToken(): string {
  const header = Buffer.from(JSON.stringify({
    alg: 'RS256',
    typ: 'JWT',
    kid: faker.string.alphanumeric(10)
  })).toString('base64url');

  const payload = Buffer.from(JSON.stringify({
    iss: 'https://accounts.google.com',
    aud: 'your-google-client-id',
    sub: faker.string.numeric(21),
    email: faker.internet.email(),
    email_verified: true,
    name: faker.person.fullName(),
    picture: faker.image.avatar(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64url');

  const signature = faker.string.alphanumeric(86);

  return `${header}.${payload}.${signature}`;
}

function generateMockQuestion(): string {
  const topics = [
    'networking fundamentals',
    'network security',
    'routing protocols',
    'switching concepts',
    'wireless networking',
    'network troubleshooting'
  ];

  const topic = faker.helpers.arrayElement(topics);
  
  return JSON.stringify({
    text: `Which of the following best describes ${topic}?`,
    type: 'multiple_choice',
    difficulty: faker.number.int({ min: 1, max: 5 }),
    answers: [
      { id: 'a', text: faker.lorem.sentence(), is_correct: true },
      { id: 'b', text: faker.lorem.sentence(), is_correct: false },
      { id: 'c', text: faker.lorem.sentence(), is_correct: false },
      { id: 'd', text: faker.lorem.sentence(), is_correct: false }
    ],
    explanation: faker.lorem.paragraph(),
    references: [
      faker.lorem.words(3),
      faker.lorem.words(4)
    ]
  });
}

function generateMockExplanation(): string {
  return `This is correct because ${faker.lorem.paragraph()}. 

Key points to remember:
- ${faker.lorem.sentence()}
- ${faker.lorem.sentence()}
- ${faker.lorem.sentence()}

For more information, refer to the official documentation.`;
}

/**
 * Mock handlers for specific test scenarios
 */
export const scenarioHandlers = {
  // Slow API responses
  slowApi: [
    http.all('*', async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return HttpResponse.passthrough();
    })
  ],

  // Intermittent failures
  flaky: [
    http.all('*', () => {
      if (Math.random() < 0.3) {
        return new HttpResponse(null, { status: 503 });
      }
      return HttpResponse.passthrough();
    })
  ],

  // Rate limiting
  rateLimited: [
    http.all('*', () => {
      return HttpResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    })
  ]
};