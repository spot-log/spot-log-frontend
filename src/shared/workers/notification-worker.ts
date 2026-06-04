/// <reference lib="webworker" />

import type { NotificationCandidateMemo } from '../../entities/notification/api/notifications';
import type {
  NotificationWorkerEvent,
  NotificationWorkerMessage,
  WorkerAlertEntry,
  WorkerCoordinate,
} from './notification-worker.types';

declare const self: DedicatedWorkerGlobalScope;

interface WorkerState {
  apiBaseUrl: string;
  accessToken: string;
  currentUserId: string;
  coordinate: WorkerCoordinate | null;
  privateAlerts: boolean;
  publicAlerts: boolean;
  intervalMs: number;
}

let state: WorkerState | null = null;
let intervalId: number | null = null;
let polling = false;
let activeMemoIds = new Set<string>();

function buildCandidatesUrl(apiBaseUrl: string, coordinate: WorkerCoordinate) {
  const params = new URLSearchParams({
    latitude: String(coordinate.lat),
    longitude: String(coordinate.lng),
  });

  return `${apiBaseUrl}/notifications/candidates?${params.toString()}`;
}

function postWorkerEvent(event: NotificationWorkerEvent) {
  self.postMessage(event);
}

function clearPolling() {
  if (intervalId !== null) {
    self.clearInterval(intervalId);
    intervalId = null;
  }
}

function isEnabled(nextState: WorkerState | null) {
  return Boolean(
    nextState &&
      nextState.coordinate &&
      nextState.accessToken &&
      (nextState.privateAlerts || nextState.publicAlerts),
  );
}

function buildAlertEntry(memo: NotificationCandidateMemo): WorkerAlertEntry | null {
  if (!state) {
    return null;
  }

  if (memo.visibility === 'PRIVATE') {
    if (!state.privateAlerts || memo.authorId !== state.currentUserId) {
      return null;
    }

    return {
      key: memo.id,
      target: {
        memoId: memo.id,
        tab: 'map',
        sheetContext: 'map',
        title: memo.title,
        message: `${memo.placeName ?? memo.title} 반경에 들어왔습니다.`,
        notificationTitle: '개인 메모 알림',
      },
    };
  }

  if (!state.publicAlerts || memo.authorId === state.currentUserId) {
    return null;
  }

  return {
    key: memo.id,
    target: {
      memoId: memo.id,
      tab: 'nearby',
      sheetContext: 'nearby',
      title: memo.title,
      message: `${memo.placeName ?? memo.title} 공개 메모 반경에 들어왔습니다.`,
      notificationTitle: '공개 메모 알림',
    },
  };
}

async function pollNotificationCandidates() {
  if (polling || !state || !isEnabled(state) || !state.coordinate) {
    if (!isEnabled(state)) {
      activeMemoIds = new Set();
    }
    return;
  }

  polling = true;

  try {
    const response = await fetch(buildCandidatesUrl(state.apiBaseUrl, state.coordinate), {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${state.accessToken}`,
      },
    });

    if (response.status === 401) {
      postWorkerEvent({ type: 'auth-error' });
      clearPolling();
      activeMemoIds = new Set();
      return;
    }

    if (!response.ok) {
      throw new Error(`Notification polling failed with status ${response.status}.`);
    }

    const candidates = (await response.json()) as NotificationCandidateMemo[];
    const nextEntries = candidates
      .map((memo) => buildAlertEntry(memo))
      .filter((entry): entry is WorkerAlertEntry => Boolean(entry));
    const nextMemoIds = new Set(nextEntries.map((entry) => entry.key));
    const enteredEntries = nextEntries.filter((entry) => !activeMemoIds.has(entry.key));

    activeMemoIds = nextMemoIds;

    if (enteredEntries.length > 0) {
      postWorkerEvent({
        type: 'entered',
        payload: enteredEntries,
      });
    }
  } catch (error) {
    postWorkerEvent({
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : 'Notification worker failed.',
      },
    });
  } finally {
    polling = false;
  }
}

function syncWorker(nextState: WorkerState) {
  const previousState = state;
  const sessionChanged =
    previousState?.accessToken !== nextState.accessToken || previousState?.currentUserId !== nextState.currentUserId;

  state = nextState;

  if (sessionChanged) {
    activeMemoIds = new Set();
  }

  clearPolling();

  if (!isEnabled(state)) {
    activeMemoIds = new Set();
    return;
  }

  void pollNotificationCandidates();
  intervalId = self.setInterval(() => {
    void pollNotificationCandidates();
  }, state.intervalMs);
}

self.addEventListener('message', (event: MessageEvent<NotificationWorkerMessage>) => {
  if (event.data.type === 'stop') {
    clearPolling();
    activeMemoIds = new Set();
    state = null;
    return;
  }

  syncWorker(event.data.payload);
});
