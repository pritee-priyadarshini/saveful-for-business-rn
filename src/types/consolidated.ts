export type HandoverMethod = 'SITE_DROP_OFF' | 'INTERNAL_COLLECTION';

export type Recurrence = 'ONE_OFF' | 'DAILY' | 'WEEKLY' | 'SELECTED_WEEKDAYS' | 'CUSTOM_DATES';

export type CollectionStatus =
  | 'SCHEDULED'
  | 'OPEN'
  | 'SUBMISSIONS_CLOSED'
  | 'PUBLISHED'
  | 'CLAIMED'
  | 'AWAITING_ITEM_CHECK'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ContributionStatus =
  | 'SUBMITTED'
  | 'LATE_PENDING_APPROVAL'
  | 'REJECTED_LATE'
  | 'WITHDRAWN'
  | 'HANDED_OVER'
  | 'RECEIVED'
  | 'NOT_RECEIVED'
  | 'EXCLUDED'
  | 'NO_CONTRIBUTION'
  | 'COMPLETED'
  | 'CANCELLED';

export type ReceiptStatus = 'PENDING' | 'RECEIVED' | 'NOT_RECEIVED';

export type RejectionReason =
  | 'QUALITY'
  | 'TEMPERATURE'
  | 'PACKAGING_DAMAGED'
  | 'PAST_DATE'
  | 'NOT_AS_DESCRIBED'
  | 'CANNOT_TRANSPORT'
  | 'CANNOT_STORE'
  | 'OTHER';

export type Declaration = { version: string; text: string };

export type Declarations = {
  SITE: Declaration;
  MANAGER: Declaration;
  CHARITY: Declaration;
};

export type ConsolidatedMe = {
  canManage: boolean;
  managedGroupIds: number[];
  receiverGroupIds: number[];
  siteIdsWithOpenCollections: number[];
  /** Invitations to join a collection group that this user can answer. */
  pendingInvitationCount: number;
};

export type SiteInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type SiteInvitation = {
  id: number;
  invitedAt: string | null;
  invitedBy: string | null;
  site: { id: number; name: string; address: string | null };
  group: {
    id: number;
    name: string;
    description: string | null;
    hostSiteName: string | null;
    siteCount: number;
    managers: string[];
    point: { name: string; address: string; directions: string | null } | null;
  };
};

export type CollectionPoint = {
  id: number;
  name: string;
  address: string;
  postcode?: string | null;
  lat: number;
  lng: number;
  directions?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
};

export type ConsolidatedGroup = {
  id: number;
  name: string;
  description?: string | null;
  hostSite: { id: number; name: string };
  timezone: string;
  points: CollectionPoint[];
  sites: { id: number; name: string; removedAt?: string | null; invitationStatus?: SiteInvitationStatus }[];
  managers: { id: number; name: string }[];
  receivers: { id: number; name: string }[];
  isActive: boolean;
  siteCount?: number;
  acceptedSiteCount?: number;
  pendingSiteCount?: number;
  nextCollection?: { id: number; scheduledDate: string; status: CollectionStatus } | null;
};

export type OpenCollection = {
  id: number;
  groupName: string;
  point: { name: string; address: string; directions?: string | null };
  method: HandoverMethod;
  scheduledDate: string;
  submissionsCloseAt: string;
  handoverStartAt: string;
  handoverEndAt: string;
  pickupStartAt: string;
  pickupEndAt: string;
  suitabilityNotes: string;
  instructions?: string | null;
  lateAllowed: boolean;
  timezone: string;
};

export type PersonRef = { id: number; name: string };

export type ContributionItem = {
  itemId?: number | null;
  foodItemId: number;
  name: string;
  category?: string | null;
  quantityDescription?: string | null;
  submittedQtyKg: number;
  verifiedQtyKg?: number | null;
  acceptedQtyKg?: number | null;
  rejectedQtyKg?: number | null;
  unavailableQtyKg?: number | null;
  rejectionReason?: RejectionReason | null;
  bestBefore?: string | null;
};

export type ContributionStorage = {
  refrigeration?: boolean;
  ambient?: boolean;
  freezer?: boolean;
  hot?: boolean;
  reheating?: boolean;
};

export type DashboardContribution = {
  id: number;
  site: { id: number; name: string };
  listingId: number;
  status: ContributionStatus;
  submittedAt?: string | null;
  submittedBy?: PersonRef | null;
  isLate?: boolean;
  handover?: { at: string; by?: PersonRef | null } | null;
  receipt?: { status: ReceiptStatus; at?: string | null; by?: PersonRef | null; note?: string | null } | null;
  declaration?: { version: string; at?: string | null } | null;
  items: ContributionItem[];
  storage?: ContributionStorage | null;
  allergens?: string[];
  pendingChangeRequestId?: number | null;
  exceptions?: string[];
  collectionNotes?: string | null;
};

export type CollectionDashboard = {
  id: number;
  status: CollectionStatus;
  cancelReason?: string | null;
  method: HandoverMethod;
  timezone: string;
  scheduleId?: number | null;
  scheduledDate?: string | null;
  group: { id: number; name: string };
  point: {
    id: number;
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    directions?: string | null;
  };
  times: {
    opensAt?: string | null;
    submissionsCloseAt?: string | null;
    handoverStartAt?: string | null;
    handoverEndAt?: string | null;
    pickupStartAt?: string | null;
    pickupEndAt?: string | null;
    reopenedUntil?: string | null;
  };
  contact?: { name?: string | null; phone?: string | null } | null;
  instructions?: string | null;
  suitabilityNotes?: string | null;
  participatingSiteIds?: number[];
  totals?: {
    submittedKg?: number | null;
    verifiedKg?: number | null;
    acceptedKg?: number | null;
    rejectedKg?: number | null;
    unavailableKg?: number | null;
  } | null;
  counts?: {
    participating?: number;
    submitted?: number;
    handedOver?: number;
    received?: number;
    notReceived?: number;
    noContribution?: number;
    late?: number;
  } | null;
  contributions: DashboardContribution[];
  sitesWithoutContribution?: { id: number; name: string }[];
  publication?: {
    masterListingId?: number | null;
    publishedAt?: string | null;
    publishedBy?: PersonRef | null;
    declarationVersion?: string | null;
  } | null;
  claim?: {
    id: number;
    charityName?: string | null;
    claimedAt?: string | null;
    status?: string | null;
    driverPickup?: { status?: string | null; driverName?: string | null } | null;
  } | null;
  pendingMaterialChange?: { id: number; summary?: string | null } | null;
  permissions?: {
    canManage?: boolean;
    canReceive?: boolean;
    canPublish?: boolean;
    publishBlockers?: string[];
  };
};

export type CollectionListItem = {
  id: number;
  status: CollectionStatus;
  method: HandoverMethod;
  timezone: string;
  scheduledDate: string;
  group: { id: number; name: string };
  point: { id?: number; name: string; address?: string };
  times: {
    submissionsCloseAt?: string | null;
    handoverStartAt?: string | null;
    handoverEndAt?: string | null;
    pickupStartAt?: string | null;
    pickupEndAt?: string | null;
  };
  counts?: { participating?: number; submitted?: number };
  totals?: { submittedKg?: number | null; verifiedKg?: number | null };
};

export type ScheduleTimes = {
  submissionsClose: string;
  handoverStart: string;
  handoverEnd: string;
  pickupStart: string;
  pickupEnd: string;
};

export type SchedulePayload = {
  groupId: number;
  collectionPointId: number;
  method: HandoverMethod;
  recurrence: Recurrence;
  startDate: string;
  endDate?: string;
  daysOfWeek?: number[];
  customDates?: string[];
  opensDaysBefore?: number;
  times: ScheduleTimes;
  contactName: string;
  contactPhone: string;
  instructions?: string;
  suitabilityNotes: string;
  participatingSiteIds?: number[];
};

export type ConsolidatedSchedule = {
  id: number;
  groupId: number;
  collectionPointId: number;
  method: HandoverMethod;
  recurrence: Recurrence;
  startDate: string;
  endDate?: string | null;
  daysOfWeek?: number[];
  customDates?: string[];
  opensDaysBefore?: number;
  times: ScheduleTimes;
  contactName?: string;
  contactPhone?: string;
  instructions?: string | null;
  suitabilityNotes?: string;
  participatingSiteIds?: number[];
};

export type EligibleSite = { id: number; name: string };
export type EligibleUser = { id: number; name: string; canManage: boolean; email?: string | null };

export type PermissionUser = {
  id: number;
  name: string;
  email?: string | null;
  orgRole?: string | null;
  siteRole?: string | null;
  role?: string | null;
  canManage: boolean;
  eligible?: boolean;
};

export type CreateGroupPayload = {
  name: string;
  description?: string;
  hostSiteId: number;
  timezone?: string;
  siteIds: number[];
  managerUserIds: number[];
  receiverUserIds: number[];
  collectionPoint: {
    name: string;
    address: string;
    postcode?: string;
    lat: number;
    lng: number;
    directions?: string;
  };
};

export type PointPayload = {
  name: string;
  address: string;
  postcode?: string;
  lat: number;
  lng: number;
  directions?: string;
  isActive?: boolean;
};

export type PublishPreviewItem = {
  name: string;
  category?: string | null;
  quantityDescription?: string | null;
  qtyKg: number;
  allergens?: string[];
  bestBefore?: string | null;
  storageLabel?: string | null;
};

export type PublishPreview = {
  blockers: string[];
  warnings: string[];
  items: PublishPreviewItem[];
  pointName: string;
  pointAddress: string;
  pickupStartAt?: string | null;
  pickupEndAt?: string | null;
  timezone?: string | null;
  instructions?: string | null;
  suitabilityNotes?: string | null;
  breakdown: Array<{
    siteName: string;
    verifiedKg: number;
    items: Array<{ name: string; verifiedKg: number; quantityDescription?: string | null }>;
  }>;
};

export type ChangeRequest = {
  id: number;
  contributionId?: number | null;
  siteName?: string | null;
  summary: string;
  status?: string | null;
};

export type AuditEntry = {
  id?: number;
  at?: string | null;
  actor?: string | null;
  action: string;
  detail?: string | null;
};

export type ItemCheckItem = {
  masterFoodItemId: number;
  name: string;
  category?: string | null;
  quantityDescription?: string | null;
  qtyKg: number;
  allergens?: string[];
};

export type ItemCheckView = {
  pointName: string;
  pointAddress?: string | null;
  pickupStartAt?: string | null;
  pickupEndAt?: string | null;
  timezone?: string | null;
  declaration: Declaration;
  pendingChange?: { id: number; summary: string } | null;
  items: ItemCheckItem[];
};

export type ItemCheckPayload = {
  items: {
    masterFoodItemId: number;
    acceptedQtyKg: number;
    rejectedQtyKg: number;
    unavailableQtyKg: number;
    rejectionReason?: RejectionReason;
    rejectionNote?: string;
  }[];
  declaration: { version: string; accepted: true };
  rating?: number;
  ratingNote?: string;
};

export type ReportTotals = {
  listedKg: number;
  verifiedKg: number;
  acceptedKg: number;
  rejectedKg: number;
  unavailableKg: number;
};

export type ReportSiteRow = ReportTotals & {
  siteId: number;
  siteName: string;
  collections: number;
};

export type ReportSummary = {
  totals: ReportTotals;
  sites: ReportSiteRow[];
  rejectionReasons: Array<{ reason: string; kg: number | null; count: number | null }>;
  categories: Array<{ category: string; acceptedKg: number }>;
};

export type ReportCollectionRow = {
  id: number;
  scheduledDate: string;
  status: CollectionStatus;
  groupName?: string | null;
  pointName?: string | null;
  listedKg?: number | null;
  verifiedKg?: number | null;
  acceptedKg?: number | null;
};

export type ContributionDetail = DashboardContribution & {
  method: HandoverMethod;
  timezone: string;
  groupName?: string | null;
  pointName: string;
  pointAddress?: string | null;
  directions?: string | null;
  times: CollectionDashboard['times'];
  suitabilityNotes?: string | null;
  instructions?: string | null;
  collectionStatus?: CollectionStatus | null;
  canManage?: boolean;
  canReceive?: boolean;
  pendingChangeStatus?: string | null;
};

export type Paged<T> = {
  items: T[];
  page: number;
  totalPages: number;
};
