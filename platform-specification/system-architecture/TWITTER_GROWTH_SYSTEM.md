# Twitter Growth System - MVP Architecture

## 1. System Overview

### Purpose
Automated Twitter growth system to build audience for PingToPass through intelligent engagement, content analysis, and strategic interactions.

### MVP Scope (Single User - Your Account)
- Monitor and analyze your own tweets for optimization
- Identify and engage with relevant accounts in AI/networking space
- Generate contextual replies maintaining your voice
- Track growth attribution and ROI
- Simple approval workflow for all actions
- Cost-effective AI usage (Pydantic AI with model selection)

### Growth Targets
- **Monthly Follower Goal**: 500-1000 quality followers
- **Engagement Rate**: >5% on tweets
- **Cost Per Follower**: <$0.05 (AI costs)
- **Daily Actions**: 20-30 engagements

## 2. Core Architecture

### 2.1 Twitter Service Layer
```python
# app/services/twitter_service.py
from typing import List, Dict, Optional
import asyncio
from datetime import datetime, timedelta
import httpx
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

class TwitterService:
    """Core Twitter API integration service"""
    
    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.base_url = "https://api.twitter.com/2"
        
        # Twitter API credentials
        self.bearer_token = settings.TWITTER_BEARER_TOKEN
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {self.bearer_token}",
                "User-Agent": "PingToPass-Growth-Bot/1.0"
            },
            timeout=30.0
        )
        
        # Rate limit tracking
        self.rate_limits = {
            "tweets_lookup": {"limit": 300, "remaining": 300, "reset": None},
            "users_lookup": {"limit": 300, "remaining": 300, "reset": None},
            "tweets_search": {"limit": 180, "remaining": 180, "reset": None}
        }
    
    async def get_user_tweets(
        self, 
        user_id: str = None,
        username: str = None,
        max_results: int = 100
    ) -> List[Dict]:
        """Get tweets from a specific user"""
        
        # Get user ID if username provided
        if username and not user_id:
            user_data = await self.get_user_by_username(username)
            user_id = user_data["id"]
        
        # Fetch tweets with metrics
        params = {
            "max_results": min(max_results, 100),
            "tweet.fields": "created_at,public_metrics,context_annotations,entities",
            "exclude": "retweets,replies"
        }
        
        response = await self.client.get(
            f"{self.base_url}/users/{user_id}/tweets",
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            tweets = data.get("data", [])
            
            # Store in database for analysis
            for tweet in tweets:
                await self._store_tweet(tweet, user_id)
            
            return tweets
        
        return []
    
    async def search_tweets(
        self,
        query: str,
        max_results: int = 50
    ) -> List[Dict]:
        """Search for tweets matching query"""
        
        params = {
            "query": f"{query} -is:retweet -is:reply lang:en",
            "max_results": min(max_results, 100),
            "tweet.fields": "author_id,created_at,public_metrics,context_annotations",
            "user.fields": "username,public_metrics,verified",
            "expansions": "author_id"
        }
        
        response = await self.client.get(
            f"{self.base_url}/tweets/search/recent",
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            return self._process_search_results(data)
        
        return []
    
    async def get_user_by_username(self, username: str) -> Dict:
        """Get user data by username"""
        
        response = await self.client.get(
            f"{self.base_url}/users/by/username/{username}",
            params={"user.fields": "public_metrics,description,verified"}
        )
        
        if response.status_code == 200:
            return response.json()["data"]
        
        return None
    
    async def _store_tweet(self, tweet: Dict, user_id: str):
        """Store tweet in database for analysis"""
        
        tweet_doc = {
            "tweet_id": tweet["id"],
            "user_id": user_id,
            "text": tweet["text"],
            "created_at": datetime.fromisoformat(tweet["created_at"].rstrip("Z")),
            "metrics": tweet.get("public_metrics", {}),
            "entities": tweet.get("entities", {}),
            "context": tweet.get("context_annotations", []),
            "stored_at": datetime.utcnow()
        }
        
        await self.db.user_tweets.update_one(
            {"tweet_id": tweet["id"]},
            {"$set": tweet_doc},
            upsert=True
        )
    
    def _process_search_results(self, data: Dict) -> List[Dict]:
        """Process and enrich search results"""
        
        tweets = data.get("data", [])
        users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}
        
        enriched = []
        for tweet in tweets:
            author = users.get(tweet["author_id"], {})
            
            enriched.append({
                "tweet": tweet,
                "author": author,
                "engagement_rate": self._calculate_engagement_rate(tweet),
                "relevance_score": self._calculate_relevance(tweet, author)
            })
        
        # Sort by relevance
        enriched.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return enriched
    
    def _calculate_engagement_rate(self, tweet: Dict) -> float:
        """Calculate engagement rate for a tweet"""
        
        metrics = tweet.get("public_metrics", {})
        impressions = metrics.get("impression_count", 0)
        
        if impressions == 0:
            # Estimate based on followers if impressions not available
            impressions = max(100, metrics.get("like_count", 0) * 20)
        
        engagements = (
            metrics.get("like_count", 0) +
            metrics.get("retweet_count", 0) * 2 +
            metrics.get("reply_count", 0) * 3 +
            metrics.get("quote_count", 0) * 2
        )
        
        return (engagements / impressions) * 100 if impressions > 0 else 0
    
    def _calculate_relevance(self, tweet: Dict, author: Dict) -> float:
        """Calculate relevance score for engagement priority"""
        
        score = 0.0
        
        # Author metrics (0-40 points)
        author_metrics = author.get("public_metrics", {})
        followers = author_metrics.get("followers_count", 0)
        
        if followers > 10000:
            score += 20
        elif followers > 1000:
            score += 15
        elif followers > 100:
            score += 10
        
        if author.get("verified"):
            score += 10
        
        # Tweet performance (0-30 points)
        engagement_rate = self._calculate_engagement_rate(tweet)
        score += min(30, engagement_rate * 3)
        
        # Content relevance (0-30 points)
        text_lower = tweet["text"].lower()
        keywords = ["ai", "certification", "network", "study", "exam", "learning", 
                   "devops", "cloud", "security", "tech"]
        
        keyword_matches = sum(1 for kw in keywords if kw in text_lower)
        score += min(30, keyword_matches * 10)
        
        return score
```

### 2.2 AI Agent System (Pydantic AI)
```python
# app/agents/twitter_agents.py
from pydantic_ai import Agent, ModelRetry
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import json

class TweetAnalysis(BaseModel):
    """Analysis result for a tweet"""
    engagement_score: float = Field(..., ge=0, le=100)
    topic_categories: List[str]
    successful_elements: List[str]
    improvement_suggestions: List[str]
    optimal_time: str
    voice_characteristics: Dict[str, str]

class ReplyGeneration(BaseModel):
    """Generated reply for a tweet"""
    reply_text: str = Field(..., max_length=280)
    confidence_score: float = Field(..., ge=0, le=1)
    tone: str
    intent: str  # helpful, engaging, informative, supportive
    warnings: List[str] = []

class SelfAnalysisAgent:
    """Analyze your own Twitter content for patterns"""
    
    def __init__(self):
        self.agent = Agent(
            'openai:gpt-4o-mini',  # Cost-effective model
            system_prompt="""You are a Twitter growth analyst specializing in tech content.
            Analyze tweets to identify successful patterns, voice characteristics, and optimization opportunities.
            Focus on actionable insights for improving engagement."""
        )
    
    async def analyze_user_content(
        self, 
        tweets: List[Dict],
        user_profile: Dict
    ) -> Dict:
        """Analyze user's tweet history for patterns"""
        
        # Sort by engagement
        sorted_tweets = sorted(
            tweets,
            key=lambda t: t.get("public_metrics", {}).get("like_count", 0),
            reverse=True
        )
        
        # Analyze top 20% for success patterns
        top_percentile = len(sorted_tweets) // 5
        successful_tweets = sorted_tweets[:top_percentile]
        
        prompt = f"""
        Analyze these successful tweets to identify patterns:
        
        User: {user_profile.get('username')}
        Bio: {user_profile.get('description')}
        
        Top Performing Tweets:
        {json.dumps(successful_tweets, indent=2)}
        
        Identify:
        1. Common topics that perform well
        2. Writing style and voice characteristics  
        3. Optimal posting times
        4. Content formats that work (threads, single tweets, with media, etc.)
        5. Successful hooks and CTAs
        """
        
        result = await self.agent.run(prompt, result_type=TweetAnalysis)
        
        # Store analysis in database
        analysis_doc = {
            "user_id": user_profile["id"],
            "analysis_date": datetime.utcnow(),
            "tweets_analyzed": len(tweets),
            "patterns": result.model_dump(),
            "voice_profile": self._extract_voice_profile(successful_tweets)
        }
        
        await self.db.user_content_analysis.insert_one(analysis_doc)
        
        return analysis_doc
    
    def _extract_voice_profile(self, tweets: List[Dict]) -> Dict:
        """Extract voice characteristics from successful tweets"""
        
        return {
            "tone": "professional yet approachable",
            "expertise_areas": ["AI", "networking", "education"],
            "communication_style": "informative with practical examples",
            "emoji_usage": "minimal, professional",
            "hashtag_strategy": "2-3 relevant tags per tweet",
            "thread_preference": "2-3 tweet threads for complex topics"
        }

class EngagementAgent:
    """Generate contextual replies maintaining user's voice"""
    
    def __init__(self, voice_profile: Dict):
        self.voice_profile = voice_profile
        
        system_prompt = f"""You are a Twitter engagement assistant that maintains this specific voice:
        
        Tone: {voice_profile.get('tone', 'professional')}
        Style: {voice_profile.get('communication_style', 'informative')}
        Expertise: {', '.join(voice_profile.get('expertise_areas', []))}
        
        Generate helpful, engaging replies that:
        - Add value to the conversation
        - Maintain authenticity
        - Stay under 280 characters
        - Never be promotional
        - Match the user's established voice
        """
        
        self.agent = Agent(
            'openai:gpt-4o-mini',
            system_prompt=system_prompt,
            result_type=ReplyGeneration
        )
    
    async def generate_reply(
        self,
        tweet: Dict,
        context: Dict
    ) -> ReplyGeneration:
        """Generate contextual reply for a tweet"""
        
        prompt = f"""
        Generate a reply to this tweet:
        
        Author: @{context['author']['username']} ({context['author'].get('followers_count', 0)} followers)
        Tweet: {tweet['text']}
        
        Context:
        - Tweet topic: {context.get('topic', 'general tech')}
        - Engagement level: {context.get('engagement_rate', 0):.1f}%
        - Your expertise relevance: {context.get('relevance_to_expertise', 'medium')}
        
        Generate a helpful reply that adds value without being promotional.
        """
        
        try:
            result = await self.agent.run(prompt)
            
            # Validate reply
            if len(result.reply_text) > 280:
                result.reply_text = result.reply_text[:277] + "..."
            
            # Check for quality
            if result.confidence_score < 0.7:
                result.warnings.append("Low confidence - manual review recommended")
            
            return result
            
        except Exception as e:
            print(f"Reply generation failed: {e}")
            return None

class CompetitorDiscoveryAgent:
    """Discover and analyze competitors for following strategy"""
    
    def __init__(self):
        self.agent = Agent(
            'openai:gpt-4o-mini',
            system_prompt="""You are a competitive analysis expert for Twitter growth.
            Identify accounts that share similar audiences and content themes.
            Focus on accounts that are successful but not impossibly large."""
        )
    
    async def find_similar_accounts(
        self,
        user_profile: Dict,
        seed_accounts: List[str]
    ) -> List[Dict]:
        """Find accounts similar to seed accounts"""
        
        similar_accounts = []
        
        for seed in seed_accounts:
            # Get seed account's followers
            # Note: This would require Twitter API v2 with proper access
            # For MVP, we'll use a curated list
            pass
        
        # Return curated list for MVP
        return self._get_curated_competitors()
    
    def _get_curated_competitors(self) -> List[Dict]:
        """Curated list of accounts to monitor (MVP approach)"""
        
        return [
            # AI/Tech Educators
            {"username": "karpathy", "category": "ai_education", "followers": 500000},
            {"username": "mckaywrigley", "category": "ai_tools", "followers": 100000},
            {"username": "swyx", "category": "ai_engineering", "followers": 50000},
            
            # Networking Experts
            {"username": "networkchuck", "category": "networking", "followers": 300000},
            {"username": "davidbombal", "category": "networking", "followers": 200000},
            
            # Certification Focused
            {"username": "professormesser", "category": "certification", "followers": 150000},
            {"username": "StormwindStudio", "category": "certification", "followers": 50000}
        ]
```

### 2.3 Growth Tracking Service
```python
# app/services/growth_tracking_service.py

class GrowthTrackingService:
    """Track and attribute follower growth"""
    
    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
    
    async def track_daily_metrics(self, user_id: str) -> Dict:
        """Track daily growth metrics"""
        
        # Get current metrics from Twitter
        twitter_service = TwitterService(self.db)
        user_data = await twitter_service.get_user_by_username("your_username")
        
        metrics = user_data["public_metrics"]
        
        # Calculate daily changes
        yesterday = await self.db.growth_metrics.find_one({
            "user_id": user_id,
            "date": (datetime.utcnow() - timedelta(days=1)).date().isoformat()
        })
        
        daily_growth = {
            "user_id": user_id,
            "date": datetime.utcnow().date().isoformat(),
            "followers": metrics["followers_count"],
            "following": metrics["following_count"],
            "tweets": metrics["tweet_count"],
            "followers_gained": metrics["followers_count"] - (yesterday["followers"] if yesterday else metrics["followers_count"]),
            "engagement_rate": 0.0,  # Calculate from today's tweets
            "top_tweet": None,
            "successful_engagements": [],
            "attribution": {}
        }
        
        # Track attribution (what actions led to follows)
        daily_growth["attribution"] = await self._attribute_growth()
        
        # Store metrics
        await self.db.growth_metrics.insert_one(daily_growth)
        
        return daily_growth
    
    async def _attribute_growth(self) -> Dict:
        """Attribute follower growth to specific actions"""
        
        # Check recent engagements
        recent_engagements = await self.db.engagement_log.find({
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        }).to_list(None)
        
        attribution = {
            "organic": 0,
            "from_replies": 0,
            "from_content": 0,
            "from_follows": 0
        }
        
        # Simple attribution model for MVP
        for engagement in recent_engagements:
            if engagement["type"] == "reply" and engagement.get("resulted_in_follow"):
                attribution["from_replies"] += 1
            elif engagement["type"] == "tweet" and engagement.get("high_engagement"):
                attribution["from_content"] += 1
        
        return attribution
    
    async def calculate_roi(self) -> Dict:
        """Calculate ROI of growth efforts"""
        
        # Get monthly metrics
        monthly_metrics = await self.db.growth_metrics.find({
            "date": {"$gte": (datetime.utcnow() - timedelta(days=30)).date().isoformat()}
        }).to_list(None)
        
        # Calculate totals
        total_followers_gained = sum(m.get("followers_gained", 0) for m in monthly_metrics)
        
        # Get AI costs
        ai_costs = await self.db.ai_cost_tracking.find({
            "service": "twitter",
            "date": {"$gte": (datetime.utcnow() - timedelta(days=30)).date().isoformat()}
        }).to_list(None)
        
        total_cost = sum(c.get("daily_spend", 0) for c in ai_costs)
        
        return {
            "period": "last_30_days",
            "followers_gained": total_followers_gained,
            "total_cost": total_cost,
            "cost_per_follower": total_cost / total_followers_gained if total_followers_gained > 0 else 0,
            "engagement_improvement": self._calculate_engagement_improvement(monthly_metrics),
            "top_performing_content": await self._get_top_content()
        }
```

## 3. Automation Workflows

### 3.1 Daily Automation Pipeline
```python
# app/workflows/twitter_daily_workflow.py

class TwitterDailyWorkflow:
    """Daily Twitter growth automation workflow"""
    
    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.twitter_service = TwitterService(db)
        self.max_daily_actions = 30  # Conservative limit for safety
    
    async def run_daily_workflow(self):
        """Execute daily growth workflow"""
        
        print("Starting daily Twitter workflow...")
        
        # 1. Analyze yesterday's performance
        await self._analyze_yesterday()
        
        # 2. Find engagement opportunities
        opportunities = await self._find_opportunities()
        
        # 3. Generate and queue replies
        reply_queue = await self._generate_replies(opportunities[:10])
        
        # 4. Process approval queue
        await self._process_approvals(reply_queue)
        
        # 5. Track metrics
        await self._track_metrics()
        
        print("Daily workflow completed")
    
    async def _analyze_yesterday(self):
        """Analyze previous day's performance"""
        
        # Get your tweets from yesterday
        tweets = await self.twitter_service.get_user_tweets(
            username="your_username",
            max_results=10
        )
        
        # Analyze with AI
        analyzer = SelfAnalysisAgent()
        analysis = await analyzer.analyze_user_content(tweets, {"username": "your_username"})
        
        print(f"Yesterday's top tweet: {analysis.get('top_tweet')}")
        print(f"Engagement rate: {analysis.get('avg_engagement_rate')}%")
    
    async def _find_opportunities(self) -> List[Dict]:
        """Find high-value engagement opportunities"""
        
        opportunities = []
        
        # Search relevant topics
        topics = [
            "AI development",
            "machine learning",
            "certification exam",
            "network engineering",
            "devops",
            "cloud certification"
        ]
        
        for topic in topics:
            tweets = await self.twitter_service.search_tweets(
                query=topic,
                max_results=20
            )
            
            # Filter for quality
            quality_tweets = [
                t for t in tweets
                if t["relevance_score"] > 50
                and t["author"]["public_metrics"]["followers_count"] > 100
            ]
            
            opportunities.extend(quality_tweets[:5])
        
        # Sort by opportunity score
        opportunities.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return opportunities[:20]  # Top 20 opportunities
    
    async def _generate_replies(self, opportunities: List[Dict]) -> List[Dict]:
        """Generate replies for opportunities"""
        
        # Get voice profile
        voice_profile = await self._get_voice_profile()
        
        reply_agent = EngagementAgent(voice_profile)
        reply_queue = []
        
        for opp in opportunities:
            reply = await reply_agent.generate_reply(
                tweet=opp["tweet"],
                context=opp
            )
            
            if reply and reply.confidence_score > 0.7:
                reply_queue.append({
                    "tweet_id": opp["tweet"]["id"],
                    "author": opp["author"]["username"],
                    "original_text": opp["tweet"]["text"],
                    "reply_text": reply.reply_text,
                    "confidence": reply.confidence_score,
                    "intent": reply.intent,
                    "status": "pending_approval"
                })
        
        # Store in approval queue
        for reply in reply_queue:
            await self.db.reply_queue.insert_one(reply)
        
        return reply_queue
    
    async def _get_voice_profile(self) -> Dict:
        """Get stored voice profile"""
        
        profile = await self.db.user_content_analysis.find_one(
            {},
            sort=[("analysis_date", -1)]
        )
        
        if profile:
            return profile["voice_profile"]
        
        # Default profile
        return {
            "tone": "helpful and professional",
            "expertise_areas": ["AI", "certification", "networking"],
            "communication_style": "informative with examples"
        }
```

## 4. API Endpoints

### 4.1 Twitter Management Endpoints
```python
# app/api/v1/twitter.py

@router.post("/twitter/analyze-profile")
async def analyze_profile(
    username: str = "your_username",
    current_user: CurrentUser,
    db: Database
):
    """Analyze Twitter profile and content"""
    
    twitter_service = TwitterService(db)
    tweets = await twitter_service.get_user_tweets(username=username)
    
    analyzer = SelfAnalysisAgent()
    analysis = await analyzer.analyze_user_content(tweets, {"username": username})
    
    return {
        "success": True,
        "data": analysis
    }

@router.get("/twitter/opportunities")
async def get_opportunities(
    limit: int = 20,
    current_user: CurrentUser,
    db: Database
):
    """Get engagement opportunities"""
    
    workflow = TwitterDailyWorkflow(db)
    opportunities = await workflow._find_opportunities()
    
    return {
        "success": True,
        "data": {
            "opportunities": opportunities[:limit],
            "total": len(opportunities)
        }
    }

@router.get("/twitter/reply-queue")
async def get_reply_queue(
    status: str = "pending_approval",
    current_user: CurrentUser,
    db: Database
):
    """Get replies awaiting approval"""
    
    replies = await db.reply_queue.find(
        {"status": status}
    ).sort("confidence", -1).to_list(50)
    
    return {
        "success": True,
        "data": {
            "replies": replies,
            "total": len(replies)
        }
    }

@router.post("/twitter/approve-reply/{reply_id}")
async def approve_reply(
    reply_id: str,
    modifications: Dict = None,
    current_user: CurrentUser,
    db: Database
):
    """Approve and send a reply"""
    
    reply = await db.reply_queue.find_one({"_id": ObjectId(reply_id)})
    
    if modifications:
        reply["reply_text"] = modifications.get("text", reply["reply_text"])
    
    # Here you would actually send the reply via Twitter API
    # For MVP, we'll mark it as approved for manual sending
    
    await db.reply_queue.update_one(
        {"_id": ObjectId(reply_id)},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.utcnow(),
                "final_text": reply["reply_text"]
            }
        }
    )
    
    # Log engagement
    await db.engagement_log.insert_one({
        "type": "reply",
        "tweet_id": reply["tweet_id"],
        "author": reply["author"],
        "text": reply["reply_text"],
        "timestamp": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": "Reply approved for sending"
    }

@router.get("/twitter/growth-metrics")
async def get_growth_metrics(
    period: str = "7d",
    current_user: CurrentUser,
    db: Database
):
    """Get growth metrics and analytics"""
    
    tracking_service = GrowthTrackingService(db)
    
    if period == "today":
        metrics = await tracking_service.track_daily_metrics("your_user_id")
    else:
        # Get historical metrics
        days = int(period[:-1])
        metrics = await db.growth_metrics.find({
            "date": {"$gte": (datetime.utcnow() - timedelta(days=days)).date().isoformat()}
        }).to_list(None)
    
    # Calculate ROI
    roi = await tracking_service.calculate_roi()
    
    return {
        "success": True,
        "data": {
            "metrics": metrics,
            "roi": roi,
            "period": period
        }
    }
```

## 5. Frontend Dashboard

### 5.1 Twitter Growth Dashboard
```html
<!-- templates/twitter/dashboard.html -->
<div class="container-fluid">
    <!-- Growth Metrics -->
    <div class="row">
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h6>Followers</h6>
                    <h3 id="followerCount">--</h3>
                    <span class="text-success">+<span id="dailyGrowth">--</span> today</span>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h6>Engagement Rate</h6>
                    <h3 id="engagementRate">--%</h3>
                    <span class="text-muted">Last 7 days</span>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h6>Cost per Follower</h6>
                    <h3>$<span id="costPerFollower">--</span></h3>
                    <span class="text-muted">30-day average</span>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card">
                <div class="card-body">
                    <h6>Reply Queue</h6>
                    <h3 id="queueCount">--</h3>
                    <a href="#reply-queue" class="btn btn-sm btn-primary">Review</a>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Growth Chart -->
    <div class="card mt-4">
        <div class="card-header">
            <h4>Follower Growth</h4>
        </div>
        <div class="card-body">
            <div id="growthChart"></div>
        </div>
    </div>
    
    <!-- Reply Approval Queue -->
    <div class="card mt-4" id="reply-queue">
        <div class="card-header">
            <h4>Reply Approval Queue</h4>
        </div>
        <div class="card-body">
            <div hx-get="/api/v1/twitter/reply-queue" 
                 hx-trigger="load, every 30s"
                 hx-target="#replyList">
                <div id="replyList">
                    <!-- Replies loaded here -->
                </div>
            </div>
        </div>
    </div>
    
    <!-- Engagement Opportunities -->
    <div class="card mt-4">
        <div class="card-header">
            <h4>High-Value Opportunities</h4>
            <button class="btn btn-sm btn-primary float-end" 
                    hx-post="/api/v1/twitter/find-opportunities">
                Find New
            </button>
        </div>
        <div class="card-body" hx-get="/api/v1/twitter/opportunities" 
             hx-trigger="load">
            <!-- Opportunities loaded here -->
        </div>
    </div>
</div>

<script>
// Initialize growth chart
var growthChart = new ApexCharts(document.querySelector("#growthChart"), {
    series: [{
        name: 'Followers',
        data: [] // Loaded via API
    }],
    chart: {
        type: 'area',
        height: 350
    },
    xaxis: {
        type: 'datetime'
    }
});
growthChart.render();

// Load metrics
async function loadMetrics() {
    const response = await fetch('/api/v1/twitter/growth-metrics?period=7d');
    const data = await response.json();
    
    // Update metrics
    document.getElementById('followerCount').textContent = data.data.metrics[0]?.followers || '--';
    document.getElementById('dailyGrowth').textContent = data.data.metrics[0]?.followers_gained || '--';
    document.getElementById('engagementRate').textContent = data.data.roi?.engagement_improvement || '--';
    document.getElementById('costPerFollower').textContent = data.data.roi?.cost_per_follower?.toFixed(3) || '--';
    
    // Update chart
    const chartData = data.data.metrics.map(m => ({
        x: new Date(m.date),
        y: m.followers
    }));
    growthChart.updateSeries([{data: chartData}]);
}

// Load on page load
loadMetrics();
setInterval(loadMetrics, 60000); // Refresh every minute
</script>
```

## 6. Database Schema

### 6.1 Twitter Collections
```javascript
// user_tweets collection
{
  "_id": ObjectId("..."),
  "tweet_id": "1234567890",
  "user_id": "user_123",
  "text": "Just shipped a new AI feature...",
  "created_at": ISODate("2024-01-20T10:00:00Z"),
  "metrics": {
    "like_count": 45,
    "retweet_count": 12,
    "reply_count": 8,
    "quote_count": 3,
    "bookmark_count": 15,
    "impression_count": 2500
  },
  "entities": {
    "hashtags": ["AI", "DevOps"],
    "mentions": ["@user1"],
    "urls": []
  },
  "engagement_rate": 3.2,
  "performance_score": 78
}

// growth_metrics collection
{
  "_id": ObjectId("..."),
  "user_id": "user_123",
  "date": "2024-01-20",
  "followers": 1234,
  "following": 567,
  "tweets": 890,
  "followers_gained": 23,
  "followers_lost": 2,
  "net_growth": 21,
  "engagement_rate": 4.5,
  "top_tweet": {
    "id": "tweet_123",
    "text": "...",
    "likes": 120
  },
  "attribution": {
    "from_replies": 8,
    "from_content": 10,
    "from_follows": 3,
    "organic": 0
  }
}

// reply_queue collection  
{
  "_id": ObjectId("..."),
  "tweet_id": "original_tweet_123",
  "author": "target_user",
  "original_text": "Looking for AI tools...",
  "reply_text": "Have you tried...",
  "confidence": 0.85,
  "intent": "helpful",
  "status": "pending_approval",
  "created_at": ISODate("2024-01-20T10:00:00Z"),
  "approved_at": null,
  "sent_at": null
}

// engagement_log collection
{
  "_id": ObjectId("..."),
  "type": "reply",  // reply, quote, follow
  "tweet_id": "tweet_123",
  "author": "target_user",
  "text": "Great point about...",
  "timestamp": ISODate("2024-01-20T10:00:00Z"),
  "resulted_in_follow": true,
  "engagement_received": {
    "likes": 5,
    "replies": 2
  }
}
```

## 7. Cost Management

### 7.1 AI Cost Optimization
```python
class TwitterAICostManager:
    """Manage AI costs for Twitter features"""
    
    def __init__(self):
        self.daily_budget = 1.00  # $1/day for Twitter AI
        self.models = {
            "analysis": "gpt-4o-mini",  # $0.00015/1k tokens
            "reply_generation": "gpt-4o-mini",
            "fallback": "gemini-flash"  # Free tier
        }
    
    async def track_usage(self, tokens_used: int, purpose: str):
        """Track AI usage for Twitter"""
        
        cost = (tokens_used / 1000) * 0.00015  # GPT-4o-mini pricing
        
        await self.db.ai_cost_tracking.update_one(
            {
                "date": datetime.utcnow().date().isoformat(),
                "service": "twitter"
            },
            {
                "$inc": {
                    "daily_spend": cost,
                    f"usage.{purpose}": tokens_used
                }
            },
            upsert=True
        )
```

This Twitter Growth System is optimized for MVP single-user operation with:
- Simple approval workflow for all actions
- Cost-effective AI usage ($1/day budget)
- Curated competitor lists (no complex discovery needed)
- Basic attribution tracking
- Manual final approval for safety
- Easy path to automation as you scale