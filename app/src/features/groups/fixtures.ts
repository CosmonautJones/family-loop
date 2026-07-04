import type { Group } from '../../types/domain';

export const groupsOverview = {
  description:
    'LoopedIn starts with one private group, one real event, and just enough setup to feel instantly useful.',
  groups: [
    {
      id: 'group-jones-family',
      name: 'Jones Family',
      description: 'Primary family calendar and shared memories',
      kind: 'family',
      badge: 'Active',
      tone: 'sage',
      memberCount: 6,
    },
    {
      id: 'group-dinner-club',
      name: 'Friday Dinner Club',
      description: 'Recurring friend-group plans and recaps',
      kind: 'friends',
      badge: 'Friends',
      tone: 'sky',
      memberCount: 8,
    },
  ] satisfies Group[],
  steps: [
    { title: 'Create the group', detail: 'Name the circle, choose family or friends, and invite the core people first.' },
    { title: 'Start with one event', detail: 'A dinner, birthday, or weekend plan is enough to make the app feel real.' },
    { title: 'Keep the photos attached', detail: 'After the event, upload the highlights so the memory stays where the plan lived.' },
  ],
} as const;
