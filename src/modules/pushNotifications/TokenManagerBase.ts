import EventEmitter from 'events';
import { CurrentUser } from '../../models/Session';

export enum TokenManagerEvents {
  TokenChanged = 'TokenChanged',
  PermissionChanged = 'PermissionChanged',
}

export enum TokenManagerPermissionStatus {
  GRANTED = 'granted',
  UNDETERMINED = 'undetermined',
  DENIED = 'denied',
}

abstract class TokenManagerBase extends EventEmitter {
  static shared: TokenManagerBase;

  abstract initialize(): Promise<void>;
  abstract registerForPushNotifications(): Promise<void>;
  abstract canAskForPermission(): boolean;
  abstract getPermission(): TokenManagerPermissionStatus;

  abstract identifyUser(user: CurrentUser): void;
}

export default TokenManagerBase;
