<script setup lang="ts">
import { GitPullRequest, GitPullRequestDraft } from '@lucide/vue'
import type { BoardCard } from '@agent-dashboard/contracts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import GateStrip from './GateStrip.vue'

defineProps<{ card: BoardCard }>()
</script>

<template>
  <Card class="gap-3 py-3">
    <CardHeader class="px-3">
      <CardTitle class="text-sm leading-snug">
        <a v-if="card.issue" :href="card.issue.url" target="_blank" rel="noopener noreferrer" class="hover:underline">
          #{{ card.issue.number }} {{ card.issue.title }}
        </a>
        <span v-else class="text-muted-foreground">No linked issue</span>
      </CardTitle>
      <CardDescription v-if="card.issue && card.issue.labels.length > 0" class="flex flex-wrap gap-1">
        <Badge v-for="label in card.issue.labels" :key="label.name" variant="secondary">{{ label.name }}</Badge>
      </CardDescription>
    </CardHeader>
    <CardContent v-if="card.pullRequest" class="flex flex-col gap-2 px-3">
      <a
        :href="card.pullRequest.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 text-xs hover:underline"
      >
        <GitPullRequestDraft v-if="card.pullRequest.isDraft" class="size-3.5" />
        <GitPullRequest v-else class="size-3.5" />
        #{{ card.pullRequest.number }} {{ card.pullRequest.title }}
      </a>
      <Badge v-if="card.pullRequest.mergeable === 'CONFLICTING'" variant="destructive">Merge conflict</Badge>
      <GateStrip :gates="card.pullRequest.gates" :summary="card.pullRequest.gateSummary" />
    </CardContent>
  </Card>
</template>
