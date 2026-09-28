import { createRouter, createWebHistory } from 'vue-router'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/issues' },
    { path: '/issues', name: 'issues', component: () => import('./views/IssuesBoard.vue'), meta: { title: 'Issues' } },
    { path: '/credentials', name: 'credentials', component: () => import('./views/Credentials.vue'), meta: { title: 'Credentials' } },
  ],
})
