<script setup lang="ts">
import type { CheckGate, GateSummary } from '@agent-dashboard/contracts'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { gateOverallLabels, gateStateClasses } from '@/lib/presentation'

defineProps<{ gates: CheckGate[]; summary: GateSummary }>()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-xs text-muted-foreground">
      {{ gateOverallLabels[summary.overallState] }}
      <template v-if="summary.total > 0">({{ summary.passed }}/{{ summary.total }})</template>
    </span>
    <TooltipProvider :delay-duration="150">
      <ul class="flex flex-wrap gap-1">
        <li v-for="gate in gates" :key="gate.name">
          <Tooltip>
            <TooltipTrigger as-child>
              <Badge
                :as="gate.url ? 'a' : 'span'"
                :href="gate.url ?? undefined"
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                :class="gateStateClasses[gate.state]"
              >
                {{ gate.name }}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{{ gate.name }}: {{ gate.state }}</TooltipContent>
          </Tooltip>
        </li>
      </ul>
    </TooltipProvider>
  </div>
</template>
