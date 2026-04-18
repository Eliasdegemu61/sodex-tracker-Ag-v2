'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, MessageCircle, Siren } from 'lucide-react'

const PULSE_URL =
  'https://raw.githubusercontent.com/Eliasdegemu61/soso-x-analysis/refs/heads/main/Community_pulse/latest.json'
const CACHE_DURATION = 5 * 60 * 1000

interface PulsePostLink {
  content: string
  url: string
}

interface PulseTopic {
  topic: string
  summary: string
  related_posts: PulsePostLink[]
}

interface PulseAnnouncement {
  content: string
  url: string
}

interface PulseTopPost {
  username: string
  content: string
  likes: number
  url: string
}

interface PulsePayload {
  date: string
  sentiment_score: number
  hot_topics: PulseTopic[]
  official_announcements: PulseAnnouncement[]
  top_engaged_posts: PulseTopPost[]
}

let cachedPulseData: PulsePayload | null = null
let cachedAt = 0

function getSentimentLabel(score: number) {
  if (score >= 85) return 'Hopium'
  if (score >= 70) return 'Hyped'
  if (score >= 45) return 'Neutral'
  if (score >= 25) return 'Fading'
  return 'Sleeping'
}

function PulseSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Card className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="space-y-4">
          <div className="h-4 w-32 rounded-full bg-black/8 dark:bg-white/8" />
          <div className="h-10 w-56 rounded-2xl bg-black/8 dark:bg-white/8" />
          <div className="h-2 rounded-full bg-black/8 dark:bg-white/8" />
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 rounded-[1.5rem] bg-black/[0.04] dark:bg-white/[0.04]" />
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="space-y-3">
            {[1, 2].map((item) => (
              <div key={item} className="h-32 rounded-[1.5rem] bg-black/[0.04] dark:bg-white/[0.04]" />
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          {[1, 2].map((item) => (
            <Card
              key={item}
              className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="space-y-3">
                {[1, 2, 3].map((child) => (
                  <div key={child} className="h-24 rounded-[1.5rem] bg-black/[0.04] dark:bg-white/[0.04]" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function SentimentBar({ score }: { score: number }) {
  const normalized = Math.min(100, Math.max(0, score))

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35 md:text-[10px] md:tracking-[0.22em]">
            Community Hype
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-[-0.05em] text-foreground md:text-4xl">{normalized}</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/35 dark:text-white/35 md:text-[10px] md:tracking-[0.2em]">
              {getSentimentLabel(normalized)}
            </span>
          </div>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/25 dark:text-white/25 md:text-[10px] md:tracking-[0.2em]">
          0-100
        </span>
      </div>

      <div className="relative">
        <div className="h-3 overflow-hidden rounded-full bg-black/6 dark:bg-white/8">
          <div className="grid h-full grid-cols-3">
            <div className="bg-[#7f1d1d]" />
            <div className="bg-[#a16207]" />
            <div className="bg-[#166534]" />
          </div>
        </div>
        <div
          className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-white bg-black shadow-[0_4px_14px_rgba(0,0,0,0.2)] dark:border-black dark:bg-white"
          style={{ left: `calc(${normalized}% - 10px)` }}
        />
      </div>

      <div className="flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.12em] text-black/25 dark:text-white/25 md:text-[10px] md:tracking-[0.18em]">
        <span>Sleeping</span>
        <span>Neutral</span>
        <span>Hopium</span>
      </div>
    </div>
  )
}

function SectionHeader({
  label,
  title,
  meta,
}: {
  label: string
  title: string
  meta?: string
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35 md:text-[10px] md:tracking-[0.22em]">
          {label}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground md:text-2xl">{title}</h2>
      </div>
      {meta ? (
        <p className="text-right text-[9px] font-semibold uppercase tracking-[0.16em] text-black/25 dark:text-white/25 md:text-[10px] md:tracking-[0.2em]">
          {meta}
        </p>
      ) : null}
    </div>
  )
}

export function PulseDashboard() {
  const [data, setData] = useState<PulsePayload | null>(cachedPulseData)
  const [isLoading, setIsLoading] = useState(!cachedPulseData)
  const [error, setError] = useState<string | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [activeAnnouncementIndex, setActiveAnnouncementIndex] = useState(0)
  const announcementsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadPulse = async () => {
      const now = Date.now()

      if (cachedPulseData && now - cachedAt < CACHE_DURATION) {
        setData(cachedPulseData)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(PULSE_URL, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = (await response.json()) as PulsePayload
        cachedPulseData = payload
        cachedAt = Date.now()
        setData(payload)
      } catch (fetchError) {
        console.error('[pulse-dashboard] Failed to fetch community pulse:', fetchError)
        setError('Unable to sync community pulse right now.')
      } finally {
        setIsLoading(false)
      }
    }

    loadPulse()
  }, [])

  useEffect(() => {
    const node = announcementsRef.current
    if (!node) return

    const updateScrollState = () => {
      setCanScrollLeft(node.scrollLeft > 8)
      setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 8)
      const cardWidth = node.firstElementChild instanceof HTMLElement ? node.firstElementChild.offsetWidth + 16 : node.clientWidth
      setActiveAnnouncementIndex(Math.round(node.scrollLeft / Math.max(cardWidth, 1)))
    }

    updateScrollState()
    node.addEventListener('scroll', updateScrollState)
    window.addEventListener('resize', updateScrollState)

    return () => {
      node.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [data])

  const scrollAnnouncements = (direction: 'left' | 'right') => {
    const node = announcementsRef.current
    if (!node) return

    node.scrollBy({
      left: direction === 'left' ? -360 : 360,
      behavior: 'smooth',
    })
  }

  if (isLoading) {
    return <PulseSkeleton />
  }

  if (error || !data) {
    return (
      <Card className="rounded-[2rem] border border-black/8 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.03]">
            <Siren className="h-5 w-5 text-foreground/70" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Community Pulse</h1>
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35 md:text-[10px] md:tracking-[0.22em]">
              Feed Offline
            </p>
          </div>
          <p className="max-w-md text-sm leading-7 text-black/55 dark:text-white/55">
            {error ?? 'Community pulse data is currently unavailable.'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:p-8">
        <SentimentBar score={data.sentiment_score} />
      </Card>

      <Card className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <SectionHeader label="Hot Topics" title="Hot Topics" meta={`${data.hot_topics.length} tracked`} />
        <div className="grid gap-4 xl:grid-cols-2">
          {data.hot_topics.map((topic, index) => (
            <div
              key={topic.topic}
              className="relative overflow-hidden rounded-[1.5rem] border border-black/10 bg-[#fbfbf9] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/10 dark:bg-[#060606] sm:p-5 xl:rounded-[1.75rem] xl:p-6"
            >
              <div className="pointer-events-none absolute right-4 top-4 text-[38px] font-semibold tracking-[-0.08em] text-black/[0.05] dark:text-white/[0.05] sm:right-5 sm:top-5 sm:text-[44px] xl:text-[52px]">
                {index + 1}
              </div>
              <div className="relative">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-black/30 dark:text-white/30 md:text-[10px] md:tracking-[0.2em]">
                  Topic {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-foreground sm:text-[22px] xl:mt-3 xl:text-[26px] xl:tracking-[-0.05em]">{topic.topic}</h3>
                <p className="mt-3 max-w-[52ch] text-[11px] leading-5 text-black/65 dark:text-white/65 sm:text-[13px] sm:leading-6 xl:mt-4 xl:text-[15px] xl:leading-8">{topic.summary}</p>

                <div className="mt-5 space-y-3 border-t border-dashed border-black/10 pt-4 dark:border-white/10 xl:mt-6 xl:pt-5">
                  {topic.related_posts.map((post, postIndex) => (
                    <div
                      key={`${topic.topic}-${postIndex}`}
                      className="rounded-[1.1rem] border border-black/8 bg-white/90 p-3 dark:border-white/8 dark:bg-black sm:p-4 xl:rounded-[1.25rem]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/8 bg-black/[0.03] dark:border-white/8 dark:bg-white/[0.03] sm:h-8 sm:w-8 sm:rounded-xl">
                          <MessageCircle className="h-3.5 w-3.5 text-black/45 dark:text-white/45 sm:h-4 sm:w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] leading-[1.125rem] text-black/72 dark:text-white/72 sm:text-[12px] sm:leading-5 xl:text-[14px] xl:leading-7">{post.content}</p>
                        </div>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="View source"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] text-black/45 transition-colors hover:bg-black/[0.06] hover:text-black dark:border-white/8 dark:bg-white/[0.03] dark:text-white/45 dark:hover:bg-white/[0.08] dark:hover:text-white sm:h-9 sm:w-9"
                        >
                          <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <SectionHeader
          label="Most Engaged Posts"
          title="Most Engaged Posts"
          meta={`${data.top_engaged_posts.length} posts`}
        />
        <div className="space-y-4">
          {data.top_engaged_posts.map((post, index) => (
            <div
              key={`${post.url}-${index}`}
              className="rounded-[1.5rem] border border-black/8 bg-black/[0.03] p-4 dark:border-white/8 dark:bg-white/[0.03] sm:p-5 xl:rounded-[1.75rem]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border border-black/8 bg-white text-[9px] font-semibold text-black/45 dark:border-white/10 dark:bg-black dark:text-white/45 sm:h-8 sm:w-8 sm:text-[10px]">
                      {index + 1}
                    </div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/55 dark:text-white/55 sm:text-[11px] sm:tracking-[0.16em]">
                      {post.username}
                    </p>
                  </div>

                  <p className="mt-3 text-[11px] leading-5 text-black/72 dark:text-white/72 sm:mt-4 sm:text-[13px] sm:leading-6 xl:text-[15px] xl:leading-8">{post.content}</p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-black/45 dark:border-white/10 dark:bg-black dark:text-white/45 sm:px-2.5 sm:text-[10px] sm:tracking-[0.16em]">
                    <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {post.likes.toLocaleString()}
                  </div>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open post on X"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-black/8 bg-white text-black/45 transition-colors hover:bg-black/[0.06] hover:text-black dark:border-white/10 dark:bg-black dark:text-white/45 dark:hover:bg-white/[0.08] dark:hover:text-white sm:h-9 sm:w-9"
                  >
                    <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/35 dark:text-white/35">
              Official Announcements
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Official Announcements</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollAnnouncements('left')}
              disabled={!canScrollLeft}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] text-black/45 transition-colors hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/45 dark:hover:bg-white/[0.06]"
              aria-label="Scroll announcements left"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollAnnouncements('right')}
              disabled={!canScrollRight}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] text-black/45 transition-colors hover:bg-black/[0.06] disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/8 dark:bg-white/[0.03] dark:text-white/45 dark:hover:bg-white/[0.06]"
              aria-label="Scroll announcements right"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            ref={announcementsRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {data.official_announcements.map((announcement, index) => (
              <div
                key={`${announcement.url}-${index}`}
                className="min-w-[320px] max-w-[320px] snap-start rounded-[1.75rem] border border-black/8 bg-black/[0.03] p-5 dark:border-white/8 dark:bg-white/[0.03] md:min-w-[380px] md:max-w-[380px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/35 dark:text-white/35">
                    Update {index + 1}
                  </span>
                  <a
                    href={announcement.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open official announcement"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/8 bg-white text-black/45 transition-colors hover:bg-black/[0.06] hover:text-black dark:border-white/10 dark:bg-black dark:text-white/45 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
                <p className="mt-4 text-[11px] leading-5 text-black/70 dark:text-white/70 sm:text-[13px] sm:leading-6 xl:text-[14px] xl:leading-7">{announcement.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            {data.official_announcements.map((announcement, index) => (
              <span
                key={`${announcement.url}-indicator-${index}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  index === activeAnnouncementIndex
                    ? 'w-10 bg-black/60 dark:bg-white/60'
                    : 'w-6 bg-black/10 dark:bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
