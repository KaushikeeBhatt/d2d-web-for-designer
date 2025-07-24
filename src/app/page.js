// src/app/page.js

import Link from 'next/link';
import Image from 'next/image';
import { HackathonGrid } from '@/components/hackathons/HackathonGrid';
import { DesignGrid } from '@/components/eyecandy/DesignGrid';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { connectDB } from '@/lib/db/mongodb';
import { Hackathon } from '@/lib/db/models/Hackathon';
import { Design } from '@/lib/db/models/Design';
import { Logger } from '@/lib/utils/logger';
import { ArrowRight, Sparkles, Trophy, Palette, Clock, Users, TrendingUp } from 'lucide-react';

// Initialize logger for home page
const logger = new Logger('HomePage');

/**
 * Fetch featured hackathons from database
 * @returns {Promise<Array>} Array of featured hackathons
 */
async function getFeaturedHackathons() {
  try {
    logger.info('Fetching featured hackathons');
    
    // Connect to database
    await connectDB();
    
    // Fetch hackathons with upcoming deadlines
    const hackathons = await Hackathon
      .find({
        isActive: true,
        deadline: { $gte: new Date() }
      })
      .sort({ deadline: 1 })
      .limit(6)
      .lean();
    
    logger.info(`Fetched ${hackathons.length} featured hackathons`);
    
    // Convert to plain objects and handle dates
    return hackathons.map(hackathon => ({
      ...hackathon,
      _id: hackathon._id.toString(),
      deadline: hackathon.deadline?.toISOString(),
      startDate: hackathon.startDate?.toISOString(),
      endDate: hackathon.endDate?.toISOString(),
      createdAt: hackathon.createdAt?.toISOString(),
      updatedAt: hackathon.updatedAt?.toISOString(),
    }));
  } catch (error) {
    logger.error('Error fetching featured hackathons', error);
    return [];
  }
}

/**
 * Fetch trending designs from database
 * @returns {Promise<Array>} Array of trending designs
 */
async function getTrendingDesigns() {
  try {
    logger.info('Fetching trending designs');
    
    // Connect to database
    await connectDB();
    
    // Fetch trending designs
    const designs = await Design
      .find({ isTrending: true })
      .sort({ 'stats.likes': -1 })
      .limit(8)
      .lean();
    
    logger.info(`Fetched ${designs.length} trending designs`);
    
    // Convert to plain objects
    return designs.map(design => ({
      ...design,
      _id: design._id.toString(),
      publishedAt: design.publishedAt?.toISOString(),
      createdAt: design.createdAt?.toISOString(),
      updatedAt: design.updatedAt?.toISOString(),
    }));
  } catch (error) {
    logger.error('Error fetching trending designs', error);
    return [];
  }
}

/**
 * Get platform statistics
 * @returns {Promise<Object>} Platform stats
 */
async function getPlatformStats() {
  try {
    logger.info('Fetching platform statistics');
    
    await connectDB();
    
    const [totalHackathons, activeHackathons, totalDesigns] = await Promise.all([
      Hackathon.countDocuments(),
      Hackathon.countDocuments({ 
        isActive: true, 
        deadline: { $gte: new Date() } 
      }),
      Design.countDocuments()
    ]);
    
    return {
      totalHackathons,
      activeHackathons,
      totalDesigns,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error fetching platform stats', error);
    return {
      totalHackathons: 0,
      activeHackathons: 0,
      totalDesigns: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Home page component
 * @returns {JSX.Element} Home page
 */
export default async function HomePage() {
  try {
    // Fetch data in parallel
    const [featuredHackathons, trendingDesigns, stats] = await Promise.all([
      getFeaturedHackathons(),
      getTrendingDesigns(),
      getPlatformStats()
    ]);

    return (
      <>
        <Header />
        
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="container relative z-10 py-24 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              {/* Announcement Badge */}
              <Badge className="mb-4 animate-fade-in">
                <Sparkles className="mr-1 h-3 w-3" />
                New hackathons added daily
              </Badge>
              
              {/* Hero Title */}
              <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl animate-slide-up">
                Discover Design{' '}
                <span className="gradient-text">Hackathons</span>
                {' '}& Get{' '}
                <span className="gradient-text">Inspired</span>
              </h1>
              
              {/* Hero Description */}
              <p className="mb-8 text-lg text-muted-foreground md:text-xl animate-slide-up animation-delay-100">
                Your one-stop platform for finding design competitions and 
                exploring curated inspiration from the world's best designers.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-200">
                <Button asChild size="lg" className="group">
                  <Link href="/dashboard">
                    Explore Hackathons
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/eye-candy">
                    Browse Inspiration
                  </Link>
                </Button>
              </div>
              
              {/* Stats */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 animate-fade-in animation-delay-300">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{stats.activeHackathons}</div>
                  <div className="text-sm text-muted-foreground">Active Hackathons</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{stats.totalDesigns.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Design Inspirations</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">3</div>
                  <div className="text-sm text-muted-foreground">Platform Sources</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          </div>
        </section>

        {/* Featured Hackathons Section */}
        <section className="section">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Featured Hackathons</h2>
                <p className="text-muted-foreground">
                  Upcoming design competitions with great prizes
                </p>
              </div>
              <Button asChild variant="ghost">
                <Link href="/dashboard">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            {featuredHackathons.length > 0 ? (
              <HackathonGrid hackathons={featuredHackathons} />
            ) : (
              <Card className="p-8 text-center">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No hackathons available at the moment. Check back soon!
                </p>
              </Card>
            )}
          </div>
        </section>

        {/* EyeCandy Preview Section */}
        <section className="section bg-muted/30">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Trending Designs</h2>
                <p className="text-muted-foreground">
                  Get inspired by the latest design trends
                </p>
              </div>
              <Button asChild variant="ghost">
                <Link href="/eye-candy">
                  Explore gallery
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            {trendingDesigns.length > 0 ? (
              <DesignGrid designs={trendingDesigns} />
            ) : (
              <Card className="p-8 text-center">
                <Palette className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Design inspiration coming soon!
                </p>
              </Card>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="section">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why D2D Designer?</h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to stay ahead in the design world
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="p-6 hover-card">
                <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Real-time Updates</h3>
                <p className="text-muted-foreground">
                  Automatically discover new hackathons from multiple platforms 
                  as soon as they're announced.
                </p>
              </Card>
              
              {/* Feature 2 */}
              <Card className="p-6 hover-card">
                <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
                <p className="text-muted-foreground">
                  Join a community of designers, share insights, and collaborate 
                  on exciting projects.
                </p>
              </Card>
              
              {/* Feature 3 */}
              <Card className="p-6 hover-card">
                <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Curated Inspiration</h3>
                <p className="text-muted-foreground">
                  Browse trending designs from Behance, Dribbble, and Awwwards 
                  to fuel your creativity.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section bg-primary/5">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to level up your design game?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join thousands of designers who never miss a hackathon opportunity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Get Started Free
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </>
    );
  } catch (error) {
    // Log error and show error state
    logger.error('Error rendering home page', error);
    
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold mb-4 text-center">
              Oops! Something went wrong
            </h1>
            <p className="text-muted-foreground text-center mb-6">
              We're having trouble loading the page. Please try again later.
            </p>
            <Button asChild className="w-full">
              <Link href="/">
                Refresh Page
              </Link>
            </Button>
          </Card>
        </div>
        <Footer />
      </>
    );
  }
}

/**
 * Configure revalidation for this page
 * Revalidate every 5 minutes to show fresh content
 */
export const revalidate = 300;

/**
 * Generate metadata for the home page
 * @returns {Object} Page metadata
 */
export const metadata = {
  title: 'D2D Designer - Discover Design Hackathons & Inspiration',
  description: 'Your one-stop platform for discovering design hackathons and getting inspired by curated design galleries from Behance, Dribbble, and more.',
};