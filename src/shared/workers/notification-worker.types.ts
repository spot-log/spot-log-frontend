export interface WorkerCoordinate {
  lat: number;
  lng: number;
}

export interface WorkerNotificationTarget {
  memoId: string;
  tab: 'map' | 'nearby' | 'my' | 'settings';
  sheetContext: 'map' | 'nearby' | 'my' | 'bookmark';
  title: string;
  message: string;
  notificationTitle: string;
}

export interface WorkerAlertEntry {
  key: string;
  target: WorkerNotificationTarget;
}

export interface NotificationWorkerSyncMessage {
  type: 'sync';
  payload: {
    apiBaseUrl: string;
    accessToken: string;
    currentUserId: string;
    coordinate: WorkerCoordinate | null;
    privateAlerts: boolean;
    publicAlerts: boolean;
    intervalMs: number;
  };
}

export interface NotificationWorkerStopMessage {
  type: 'stop';
}

export type NotificationWorkerMessage = NotificationWorkerSyncMessage | NotificationWorkerStopMessage;

export interface NotificationWorkerEnteredEvent {
  type: 'entered';
  payload: WorkerAlertEntry[];
}

export interface NotificationWorkerAuthErrorEvent {
  type: 'auth-error';
}

export interface NotificationWorkerErrorEvent {
  type: 'error';
  payload: {
    message: string;
  };
}

export type NotificationWorkerEvent =
  | NotificationWorkerEnteredEvent
  | NotificationWorkerAuthErrorEvent
  | NotificationWorkerErrorEvent;
