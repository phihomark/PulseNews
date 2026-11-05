import { Article } from '../types';

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    slug: 'national-ai-strategy-and-data-sovereignty-2026',
    title: 'Global Breakthrough in National AI Strategy and Sovereign Data Protection',
    summary: 'Governments accelerate computing infrastructure for large language models while establishing strict cybersecurity defense standards against automated data scraping.',
    content: `
As artificial intelligence (AI) transforms global economies, nation-states are upgrading national AI strategies. Key focus areas include technological autonomy, data ownership, and multi-layered cybersecurity systems to combat unauthorized automated harvesting.

### 1. High-Performance Compute Infrastructure

Industry leaders and government taskforces have established Supercomputing Hubs designed to power research institutes, startups, and enterprises developing sovereign AI models.

> "Mastering compute infrastructure and data sovereignty is the cornerstone of information security in the digital era." — *AI Global Summit Keynote*.

### 2. Defensive Anti-Scraping Protocols

In parallel with AI integration, new security guidelines mandate WAF rate limiting and AI crawler disallow rules for online news outlets. These regulations protect server infrastructure from overload and prevent unauthorized model training on proprietary intellectual property.

### 3. Training 100,000 High-Caliber AI Engineers

Collaborative initiatives between universities and global research labs aim to train next-generation talent focused on Safe AI, Federated Learning, and specialized Natural Language Processing.
    `,
    category: 'Technology',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    author: {
      name: 'Michael Vance',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'Senior Tech Editor'
    },
    publishedAt: '2026-11-03T14:30:00Z',
    readTimeMinutes: 3,
    views: 14250,
    likes: 842,
    isFeatured: true,
    tags: ['AI', 'Technology', 'Security', 'Infrastructure'],
    commentsCount: 2,
    comments: [
      {
        id: 'c-1',
        author: 'Sarah Jenkins',
        text: 'Exceptional insight! Blocking rogue AI bots from scraping content without authorization is essential for server stability.',
        createdAt: '2026-11-03T15:10:00Z',
        likes: 12
      },
      {
        id: 'c-2',
        author: 'David Miller',
        text: 'The reader view is blazingly fast on my phone. Love the sleek dark mode aesthetic!',
        createdAt: '2026-11-03T16:00:00Z',
        likes: 9
      }
    ]
  },
  {
    id: 'art-2',
    slug: 'anti-ddos-and-rate-limiting-for-news-platforms',
    title: 'Advanced Security Shield: Anti-DDoS Mitigation & Ultra-Fast News Infrastructure',
    summary: 'Analyzing sliding-window rate limiting combined with honeypot traps to shield servers from automated bot scraping and denial-of-service attacks.',
    content: `
Modern news platforms face a dual challenge: delivering sub-millisecond page load speeds while defending against DDoS attacks and relentless automated scraping scripts.

### Why Scraper Bots Overload Servers

Millions of automated bots (ranging from search crawlers to data harvesters) hit news websites daily. Without intelligent filtering, bot traffic can consume up to 70% of server bandwidth.

### The Core Defensive Trio:

1. **Strict Robots.txt WAF**: Rejecting unauthorized AI crawlers (e.g. ByteSpider, GPTBot) at the edge gateway.
2. **Sliding-Window Rate Limiting**: Restricting request spikes per IP (e.g. max 100 req/min) to prevent flood attacks.
3. **Honeypot Anti-Spam Fields**: Invisible form traps that trick automated scripts, enabling instant IP blocking.
    `,
    category: 'Cybersecurity',
    coverUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    author: {
      name: 'Alex Mercer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      role: 'Cybersecurity Architect'
    },
    publishedAt: '2026-11-03T11:15:00Z',
    readTimeMinutes: 4,
    views: 9830,
    likes: 615,
    isFeatured: false,
    tags: ['Cybersecurity', 'WAF', 'DDoS', 'RateLimit'],
    commentsCount: 1,
    comments: [
      {
        id: 'c-3',
        author: 'Brian Cole',
        text: 'Honeypot traps are remarkably simple yet incredibly effective at stopping automated spam bots!',
        createdAt: '2026-11-03T12:00:00Z',
        likes: 5
      }
    ]
  },
  {
    id: 'art-3',
    slug: 'global-ecommerce-record-growth',
    title: 'E-Commerce Boom: The Shift Toward Minimalist UX and Instant Checkout',
    summary: 'Consumers increasingly favor clutter-free mobile applications with zero intrusive ads and 1-touch lightning-fast performance.',
    content: `
Recent economic market reports indicate digital commerce volume has surged past record milestones. Notably, consumer behavior is aggressively shifting toward "Minimalism" and "Velocity".

Cluttered applications burdened with intrusive popups and laggy scripts are being abandoned in favor of lightweight, distraction-free platforms with instant responsiveness.
    `,
    category: 'Business',
    coverUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    author: {
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      role: 'Economic Analyst'
    },
    publishedAt: '2026-11-02T16:00:00Z',
    readTimeMinutes: 2,
    views: 8210,
    likes: 430,
    isFeatured: false,
    tags: ['Business', 'ECommerce', 'Trends'],
    commentsCount: 0,
    comments: []
  },
  {
    id: 'art-4',
    slug: 'smart-ev-infrastructure-expansion',
    title: 'Next-Gen EV Infrastructure: Supercharging Stations Network Expands Nationwide',
    summary: 'Ultra-fast 360kW green charging stations allow vehicles to reach 80% capacity in 15 minutes, accelerating sustainable transport.',
    content: `
With rapid adoption of electric mobility, charging infrastructure is undergoing a massive transformation. Major highways and urban centers are now outfitted with standardized ultra-fast charging hubs.
    `,
    category: 'Mobility & EV',
    coverUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80',
    author: {
      name: 'Marcus Vance',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      role: 'Automotive Journalist'
    },
    publishedAt: '2026-11-02T09:45:00Z',
    readTimeMinutes: 3,
    views: 6540,
    likes: 312,
    isFeatured: false,
    tags: ['EV', 'CleanTech', 'Mobility'],
    commentsCount: 0,
    comments: []
  },
  {
    id: 'art-5',
    slug: 'smart-cities-digital-transformation',
    title: 'Smart City Evolution: Digital Municipal Services Save Millions of Hours',
    summary: 'Streamlined mobile portals allow citizens to process permits and public services in 3 quick swipes with zero wait times.',
    content: `
End-to-end digital service implementation has eliminated over 70% of manual queue times for municipal services. Mobile interfaces feature high-contrast dark modes for effortless viewing.
    `,
    category: 'World News',
    coverUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    author: {
      name: 'Michael Vance',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'Senior Tech Editor'
    },
    publishedAt: '2026-11-01T18:20:00Z',
    readTimeMinutes: 3,
    views: 11200,
    likes: 780,
    isFeatured: false,
    tags: ['WorldNews', 'SmartCity', 'DigitalGov'],
    commentsCount: 0,
    comments: []
  }
];
