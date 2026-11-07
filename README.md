# Popup

A live captioning app where multiple phones share captions in real time, built with Next.js, TypeScript, and partyserver (Cloudflare Workers + Durable Objects) for real-time communication.

## Overview

Anyone can open a room. Everyone who joins chooses whether their phone is a **mic** (sends captions up to the server) or **audience** (just shows the captions). The server pushes caption updates to every phone in the room.

## Features

- Real-time caption sharing across phones
- Mic and audience roles chosen on join
- Score tracking system
- Round-based gameplay
- QR code sharing for easy room joining

## Tech Stack

- **Frontend**: Next.js 15.1.4, React 19
- **Styling**: Tailwind CSS
- **Real-time Communication**: partyserver (Cloudflare Workers + Durable Objects)
- **Type Safety**: TypeScript
- **Testing**: Jest with React Testing Library
- **Code Quality**: ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js (version specified in package.json)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd popup-captions
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Start the partyserver dev server:
```bash
npm run dev:party
```

### Environment Variables

Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_VERCEL_ENV=development
```

## Room Flow

1. Create a room, or join one using its room ID or QR code
2. Choose a role for your phone: **mic** or **audience**
3. You're in — there's no waiting room or ready-up step

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Development Commands

- `npm run dev`: Start Next.js development server
- `npm run dev:party`: Start the partyserver dev server (Cloudflare Workers, port 8787)
- `npm run deploy:party`: Deploy the partyserver Worker to your Cloudflare account
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests
- `npm run test:watch`: Run tests in watch mode

## Deployment

The real-time server runs on Cloudflare Workers (Durable Objects) via partyserver:

```bash
npx wrangler login    # one-time; authenticates your Cloudflare account
npm run deploy:party  # deploys to https://popup.<your-subdomain>.workers.dev
```

Then set the following env var on your app host (e.g. Vercel):

```env
NEXT_PUBLIC_PARTYKIT_HOST=popup.<your-subdomain>.workers.dev
```

## Project Structure

- `/game-logic`: Core game logic and types
- `/src/app/components`: React components
- `/src/app/hooks`: Custom React hooks
- `/src/app/utils`: Utility functions
- `/__tests__`: Test files

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
