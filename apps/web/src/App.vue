<script setup lang="ts">
import { KeyRound, LayoutGrid } from '@lucide/vue'
import { usePreferredDark } from '@vueuse/core'
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

const navigationItems = [
  { title: 'Issues', path: '/issues', icon: LayoutGrid },
  { title: 'Credentials', path: '/credentials', icon: KeyRound },
]

const route = useRoute()
const pageTitle = computed(() => String(route.meta.title ?? ''))
const prefersDark = usePreferredDark()

watchEffect(() => document.documentElement.classList.toggle('dark', prefersDark.value))
</script>

<template>
  <SidebarProvider>
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span class="px-2 py-1 text-sm font-semibold group-data-[collapsible=icon]:hidden">Agent dashboard</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Work</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in navigationItems" :key="item.path">
                <SidebarMenuButton as-child :is-active="route.path.startsWith(item.path)" :tooltip="item.title">
                  <RouterLink :to="item.path">
                    <component :is="item.icon" />
                    <span>{{ item.title }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    <SidebarInset>
      <header class="flex h-12 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" class="h-4" />
        <h1 class="text-sm font-medium">{{ pageTitle }}</h1>
      </header>
      <main class="p-4">
        <RouterView />
      </main>
    </SidebarInset>
    <Toaster rich-colors />
  </SidebarProvider>
</template>
