/**
 * Walkthrough copy for Consolidated Collections — one tour per screen.
 *
 * All the wording lives here so it can be edited in one place. Steps whose
 * target is not on screen (no permission, empty list, different status) are
 * skipped automatically, so a tour can list every step that might apply.
 */
import type { CollectionStatus, HandoverMethod } from '@/types/consolidated';

import type { GuideTour } from './types';

// ─── Manager: set up ─────────────────────────────────────────────────────────

export const groupsTour: GuideTour = {
  id: 'cc.groups',
  title: 'Collection groups',
  steps: [
    {
      journey: 0,
      title: 'Start with a collection group',
      body: 'A group is the outlets at one venue (a stadium, zoo or campus) that bring their surplus to one shared spot. You set it up once, then schedule as many collections as you need.',
    },
    {
      target: 'groups.create',
      title: 'Create a group here',
      body: 'Give it a name, choose the shared collection point, pick the sites and say who runs it on the day.',
    },
    {
      target: 'groups.card',
      title: 'Your groups at a glance',
      body: 'See how many sites are taking part, who has not answered their invitation yet, and when the next collection is. Tap a group to see everything about it.',
    },
    {
      target: 'groups.collections',
      title: 'Then schedule collections',
      body: 'When a group is ready, go to Collections to set the dates and times.',
    },
  ],
};

export const groupDetailTour: GuideTour = {
  id: 'cc.groupDetail',
  title: 'Group details',
  steps: [
    {
      target: 'groupDetail.overview',
      title: 'The group at a glance',
      body: 'How many sites are taking part, who is still deciding, and when the next collection is.',
    },
    {
      target: 'groupDetail.points',
      title: 'Where the food goes',
      body: 'Every site brings its food here, and the charity collects it from here. Directions are shown to sites when they list.',
    },
    {
      target: 'groupDetail.sites',
      title: 'Who’s in',
      body: 'Each site’s status: taking part, invited, or declined. The host site owns the listing charities see.',
    },
    {
      target: 'groupDetail.people',
      title: 'Who runs it',
      body: 'Managers schedule and publish. Receivers confirm what arrives at the collection point.',
    },
    {
      target: 'groupDetail.edit',
      title: 'Need to change something?',
      body: 'Tap Edit to rename the group, add a collection point, or change its sites and people.',
    },
    {
      target: 'groupDetail.actions',
      title: 'Ready for a collection?',
      body: 'Schedule one for this group, or see the collections it already has.',
    },
  ],
};

export const groupFormTour: GuideTour = {
  id: 'cc.groupForm',
  title: 'Setting up a group',
  steps: [
    {
      journey: 0,
      title: 'Four parts to a group',
      body: 'The group name, the shared collection point, the sites taking part and the people who run it. Here is what each one does.',
    },
    {
      target: 'groupForm.details',
      title: 'Use a name staff know',
      body: 'Sites see this name every time they list food, so pick the one people already use, like “Stadium North”.',
    },
    {
      target: 'groupForm.point',
      title: 'Where the food comes together',
      body: 'Every site brings its food here, and the charity collects it from here.',
      tip: 'Add directions such as “rear gate, next to the cool room” so nobody gets lost on the day.',
    },
    {
      target: 'groupForm.sites',
      title: 'Choose the sites',
      body: 'Sites you run join straight away. Other sites get an invitation and take part once they accept. The host site owns the one listing that charities see.',
    },
    {
      target: 'groupForm.people',
      title: 'Who runs it on the day',
      body: 'Managers schedule collections, approve changes and publish to charities. Receivers stand at the collection point and confirm what actually arrives.',
    },
    {
      target: 'groupForm.save',
      title: 'Save and you’re set up',
      body: 'You only do this once. After that, schedule your first collection.',
    },
  ],
};

// ─── Manager: plan ───────────────────────────────────────────────────────────

export const collectionsTour: GuideTour = {
  id: 'cc.collections',
  title: 'Consolidated collections',
  steps: [
    {
      journey: 'all',
      title: 'How it works',
      body: 'Several sites send their surplus food to one collection point. You check it, publish it as one listing, and one charity collects the lot.',
    },
    {
      target: 'collections.tabs',
      title: 'Today, upcoming and past',
      body: 'Today shows collections that are running now: sites listing food, food arriving, a charity on the way. Upcoming and Past show the rest.',
    },
    {
      target: 'collections.schedule',
      title: 'Schedule a collection',
      body: 'Set up a one-off or repeating collection: the point, the drop-off window and when charities can pick up.',
    },
    {
      target: 'collections.card',
      title: 'Follow each collection',
      body: 'The bar shows how many sites have listed food so far. Tap a collection to run the day from its dashboard.',
    },
  ],
};

export const scheduleTour: GuideTour = {
  id: 'cc.schedule',
  title: 'Scheduling',
  steps: [
    {
      journey: 1,
      title: 'Plan the day',
      body: 'Sites see these details when they list food. You can change one date or the whole series later.',
    },
    {
      target: 'schedule.group',
      title: 'Group and collection point',
      body: 'Choose where the food comes together. If the group has more than one point, choose the one for this collection.',
    },
    {
      target: 'schedule.method',
      title: 'Dropped off or collected?',
      body: 'Choose whether each site brings its food to the point, or your team collects it from each outlet. Sites see instructions to match.',
    },
    {
      target: 'schedule.recurrence',
      title: 'Once, or on repeat',
      body: 'Each date becomes its own collection with its own deadlines and records. You also choose how early sites can start listing.',
    },
    {
      target: 'schedule.times',
      title: 'The times that matter most',
      body: 'Sites list food by the deadline, hand it over in the window, and the charity picks it up after that. Each time has to come after the one before it.',
      tip: 'Leave a short gap between handover ending and pickup starting, so there is time to check the food.',
    },
    {
      target: 'schedule.sites',
      title: 'Who’s taking part',
      body: 'Only sites that have accepted the group can take part. Sites still deciding join upcoming collections once they accept.',
    },
    {
      target: 'schedule.suitability',
      title: 'Set the food rules',
      body: 'For example: chilled below 5°C, sealed and labelled. Every site sees this when it lists food, along with your on-site contact.',
    },
    {
      target: 'schedule.save',
      title: 'Save it',
      body: 'On the day, run everything from the collection’s dashboard.',
    },
  ],
};

// ─── Manager & receiver: on the day ──────────────────────────────────────────

function stageFor(status: CollectionStatus): 1 | 2 | 3 | 4 {
  switch (status) {
    case 'SCHEDULED':
      return 1;
    case 'OPEN':
      return 2;
    case 'SUBMISSIONS_CLOSED':
      return 3;
    default:
      return 4;
  }
}

function nextStepBody(status: CollectionStatus, canManage: boolean): string {
  switch (status) {
    case 'SCHEDULED':
      return 'Nothing to do yet. Sites can start listing food when the collection opens.';
    case 'OPEN':
      return canManage
        ? 'Sites are listing food now. Listing closes at the deadline, or you can close it early here once everyone has listed.'
        : 'Sites are listing food now. When it arrives at the point, record it below.';
    case 'SUBMISSIONS_CLOSED':
      return canManage
        ? 'Record what arrived from each site. Once nothing is blocking, review the food and publish it to charities as one listing.'
        : 'Confirm what physically arrived from each site below.';
    case 'PUBLISHED':
      return 'The food is published. Charities nearby can claim it now.';
    case 'CLAIMED':
      return 'A charity has claimed it. Here you can see who is collecting and when.';
    case 'AWAITING_ITEM_CHECK':
      return 'The charity has collected the food and is checking what it accepted.';
    default:
      return 'This card always shows the next step. It changes as the collection moves along.';
  }
}

export function dashboardTour({
  status,
  canManage,
  canReceive,
  method,
}: {
  status: CollectionStatus;
  canManage: boolean;
  canReceive: boolean;
  method: HandoverMethod;
}): GuideTour {
  const internal = method === 'INTERNAL_COLLECTION';
  return {
    id: 'cc.dashboard',
    title: 'Collection dashboard',
    steps: [
      {
        journey: stageFor(status),
        title: 'Your collection, live',
        body: 'Everything about this collection in one place. It updates itself while the collection is running, and you can pull down to refresh.',
      },
      {
        target: 'dashboard.overview',
        title: 'Progress at a glance',
        body: `How many sites have listed food, how many kilos are listed and checked, and how much has been ${internal ? 'collected from sites' : 'dropped off'} and received.`,
      },
      {
        target: 'dashboard.next',
        title: 'What to do now',
        body: nextStepBody(status, canManage),
      },
      {
        target: 'dashboard.decisions',
        title: 'Decisions waiting for you',
        body: 'Food listed after the deadline and changes sites have asked for need a yes or no before you publish.',
      },
      {
        target: 'dashboard.sites',
        title: canReceive ? 'Check off each site’s food' : 'Every site’s food',
        body: canReceive
          ? 'When a site’s food arrives, record it as received. If the amount is different, change it to what really arrived. Only checked food goes to the charity.'
          : 'Tap a site to see what it listed and where its food is up to.',
      },
      {
        target: 'dashboard.exceptions',
        title: 'Chase anything missing',
        body: canManage
          ? 'Sites that haven’t listed food, or are running late, show up here. Send them a reminder in one tap.'
          : 'Sites that haven’t listed food, or are running late, show up here.',
      },
      {
        target: 'dashboard.menu',
        title: 'More options',
        body: 'Change this date or the whole series, reopen listing, see who did what and when, or cancel the collection.',
      },
    ],
  };
}

export const reviewPublishTour: GuideTour = {
  id: 'cc.reviewPublish',
  title: 'Review & publish',
  steps: [
    {
      target: 'review.blockers',
      title: 'Fix these first',
      body: 'Publishing stays switched off until everything on this list is sorted.',
    },
    {
      target: 'review.preview',
      title: 'Exactly what charities see',
      body: 'One listing from the collection point. Charities never see site names or which outlet the food came from.',
    },
    {
      target: 'review.breakdown',
      title: 'Where it came from',
      body: 'How much each site gave, for your records only. Each site’s food still counts in its own impact.',
    },
    {
      target: 'review.publish',
      title: 'Confirm and publish',
      body: 'Tick the declaration, then publish. Charities nearby can claim the food straight away.',
      journey: 3,
    },
  ],
};

// ─── Sites ───────────────────────────────────────────────────────────────────

export const invitationsTour: GuideTour = {
  id: 'cc.invitations',
  title: 'Invitations',
  steps: [
    {
      journey: 0,
      title: 'You’ve been invited',
      body: 'A manager wants your site to send its surplus food to a shared collection point, where one charity collects food from every site at once.',
    },
    {
      target: 'invites.card',
      title: 'Check the details',
      body: 'See where the collection point is, how many sites are involved and who manages the group.',
    },
    {
      target: 'invites.actions',
      title: 'Accept or decline',
      body: 'If you accept, you can add food to this group’s collections from List Surplus. Your food still counts in your own site’s impact.',
    },
  ],
};

export function listingTour(step: 1 | 2 | 3, method?: HandoverMethod | null): GuideTour {
  const internal = method === 'INTERNAL_COLLECTION';
  if (step === 1) {
    return {
      id: 'cc.listing.food',
      title: 'Listing for a shared collection',
      steps: [
        {
          journey: 2,
          title: 'This food goes to a shared collection',
          body: 'Your food joins food from other sites at one collection point, and one charity collects it all. Your site still gets the credit.',
        },
        {
          target: 'listing.steps',
          title: 'Three quick steps',
          body: 'Add your food, check where and when it needs to go, then confirm it’s safe to give away.',
        },
      ],
    };
  }
  if (step === 2) {
    return {
      id: 'cc.listing.logistics',
      title: 'Listing for a shared collection',
      steps: [
        {
          target: 'listing.logistics',
          title: internal ? 'When to have it ready' : 'Where and when to drop it off',
          body: internal
            ? 'Your food will be collected from your outlet. Have it packed and ready by the time shown here.'
            : 'Take your food to the collection point within this window. Directions are here too.',
        },
      ],
    };
  }
  return {
    id: 'cc.listing.confirm',
    title: 'Listing for a shared collection',
    steps: [
      {
        target: 'listing.declaration',
        title: 'Confirm it’s safe',
        body: 'Tick to confirm the food meets the requirements. The manager and the people at the collection point see what you listed.',
      },
    ],
  };
}

export function contributionTour(method: HandoverMethod): GuideTour {
  const internal = method === 'INTERNAL_COLLECTION';
  return {
    id: 'cc.contribution',
    title: 'Your contribution',
    steps: [
      {
        target: 'contribution.progress',
        title: 'Follow your food',
        body: `Each tick shows where your food is up to: listed, ${internal ? 'collected from your outlet' : 'dropped off'}, received at the point, then collected by a charity.`,
      },
      {
        target: 'contribution.handover',
        title: internal ? 'Let them know it’s collected' : 'Let them know it’s dropped off',
        body: internal
          ? 'Tap this once your food has been collected, so the collection point knows it’s on the way.'
          : 'Tap this when you hand your food over, so the receiver knows to look for it.',
      },
      {
        target: 'contribution.food',
        title: 'Need to change something?',
        body: 'You can edit your items until the collection is published. After that, changes go to the manager to approve.',
      },
      {
        target: 'contribution.details',
        title: 'Where and when',
        body: 'The collection point, times, directions and food rules are always here if you need them.',
      },
    ],
  };
}

// ─── Charity ─────────────────────────────────────────────────────────────────

export const pickupCheckTour: GuideTour = {
  id: 'cc.pickupCheck',
  title: 'Confirming a collection',
  steps: [
    {
      journey: 4,
      title: 'Check the food as you collect it',
      body: 'This food comes from several sites through one collection point. Record what you took so each site’s impact is right.',
    },
    {
      target: 'pickup.summary',
      title: 'All good? One tap',
      body: 'If everything is fine, tap Accept all. If nothing was there, tap None was there.',
    },
    {
      target: 'pickup.items',
      title: 'Account for every kilo',
      body: 'Split each item’s weight into accepted, not accepted and not available. Tell us why anything wasn’t accepted.',
    },
    {
      target: 'pickup.confirm',
      title: 'Confirm the pickup',
      body: 'Tick the declaration and confirm. This records the impact for every site that gave food.',
    },
  ],
};
