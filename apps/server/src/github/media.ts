import type { MediaKind, PullRequestMedia } from '@agent-dashboard/contracts'

const videoExtensionPattern = /\.(mp4|webm|mov)(\?|#|$)/i
const markdownImagePattern = /!\[[^\]]*\]\(\s*<?(https?:\/\/[^\s)>]+)/g
const htmlSourcePattern = /<(img|video|source)\b[^>]*?\bsrc\s*=\s*["'](https?:\/\/[^"']+)["']/gi
// GitHub renders a user-attachments link standing alone on its line as a video player; an
// uploaded image is always written as markdown or an <img> tag instead.
const bareAttachmentPattern = /^\s*(https:\/\/github\.com\/user-attachments\/assets\/[\w-]+)\s*$/gm
const bareVideoFilePattern = /^\s*(https?:\/\/\S+\.(?:mp4|webm|mov))\s*$/gim

const kindOfTag = (tagName: string, url: string): MediaKind =>
  tagName.toLowerCase() === 'img' && !videoExtensionPattern.test(url) ? 'image' : 'video'

const kindOfMarkdownImage = (url: string): MediaKind => (videoExtensionPattern.test(url) ? 'video' : 'image')

const markdownKinds = (body: string): MediaKind[] => [
  ...[...body.matchAll(markdownImagePattern)].map(([, url = '']) => kindOfMarkdownImage(url)),
  ...[...body.matchAll(htmlSourcePattern)].map(([, tagName = '', url = '']) => kindOfTag(tagName, url)),
  ...[...body.matchAll(bareAttachmentPattern)].map(() => 'video' as const),
  ...[...body.matchAll(bareVideoFilePattern)].map(() => 'video' as const),
]

/**
 * Tells whether a pull request body holds an image and a video, the way GitHub would render it.
 * @param body The body as written, in markdown.
 * @returns Whether it has an image and whether it has a video.
 */
export const mediaPresenceFromMarkdown = (body: string): PullRequestMedia => {
  const kinds = markdownKinds(body)
  return { hasImage: kinds.includes('image'), hasVideo: kinds.includes('video') }
}

// GitHub serves attachments of private repositories only through short-lived signed links on
// its own hosts, so a link anywhere else is never followed: the dashboard must not become a way
// to send the browser to an address a pull request author chose.
const isGithubMediaHost = (url: URL): boolean =>
  url.protocol === 'https:' && (url.hostname === 'github.com' || url.hostname.endsWith('.githubusercontent.com'))

const htmlEntities: Record<string, string> = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' }

const decodeAttribute = (value: string): string => value.replace(/&(amp|quot|#39|lt|gt);/g, (entity) => htmlEntities[entity] ?? entity)

const isEmojiImage = (tag: string): boolean => /\bclass\s*=\s*["'][^"']*\bemoji\b/i.test(tag)

/**
 * Finds the first image or video in a rendered body, skipping emoji.
 * Reads GitHub's own rendering of the body (bodyHTML), whose attachment links are already signed.
 * @param bodyHtml The body as GitHub renders it.
 * @param kind Whether to find an image or a video.
 * @returns The signed link, or null when there is none on GitHub's own hosts.
 */
export const mediaUrlFromBodyHtml = (bodyHtml: string, kind: MediaKind): string | null =>
  [...bodyHtml.matchAll(htmlSourcePattern)]
    .filter(([tag = '', tagName = '', url = '']) => !isEmojiImage(tag) && kindOfTag(tagName, url) === kind)
    .map(([, , url = '']) => URL.parse(decodeAttribute(url)))
    .find((url): url is URL => url !== null && isGithubMediaHost(url))
    ?.toString() ?? null
