# D2D Designer - Design Hackathon Discovery Platform

A comprehensive web application for discovering and bookmarking design hackathons from multiple platforms, featuring automated scraping, real-time updates, and a curated design inspiration gallery (EyeCandy).

![D2D Designer](public/logo.svg)

## 🚀 Features

### Core Features
- **Multi-Platform Hackathon Discovery**: Automated scraping from Devpost, Unstop, and Cumulus
- **Real-time Search & Filtering**: Instant search with category, platform, and deadline filters
- **User Authentication**: Secure Google OAuth integration via Auth.js v5
- **Smart Bookmarking**: Save hackathons with notes and custom tags
- **EyeCandy Gallery**: Curated design inspiration from Behance, Dribbble, and Awwwards

### Technical Features
- **Automated Data Collection**: Hourly hackathon scraping with rate limiting
- **Performance Optimized**: Built-in caching and image optimization
- **Type Safety**: Progressive TypeScript adoption
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Production Ready**: Comprehensive error handling and logging

## 📋 Prerequisites

- Node.js 20.x LTS or higher
- npm 10.x or higher
- MongoDB Atlas account (free tier)
- Google OAuth credentials
- Vercel account (for deployment)

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/d2d-designer-nextjs.git
cd d2d-designer-nextjs