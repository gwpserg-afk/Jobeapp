/**
 * RevenueCat stub — real implementation requires a native build (not Expo Go).
 * All functions return { ok: false, reason: "not_configured" }.
 * Configure this once you have an App Store / Play Store build.
 */
import type {
  PurchasesOfferings,
  CustomerInfo,
  PurchasesPackage,
} from "react-native-purchases";

export type RevenueCatGuardReason =
  | "web_not_supported"
  | "not_configured"
  | "sdk_error";

export type RevenueCatResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: RevenueCatGuardReason; error?: unknown };

const NOT_CONFIGURED = { ok: false as const, reason: "not_configured" as const };

export const isRevenueCatEnabled = (): boolean => false;

export const getOfferings = (): Promise<RevenueCatResult<PurchasesOfferings>> =>
  Promise.resolve(NOT_CONFIGURED);

export const purchasePackage = (
  _pkg: PurchasesPackage,
): Promise<RevenueCatResult<CustomerInfo>> => Promise.resolve(NOT_CONFIGURED);

export const getCustomerInfo = (): Promise<RevenueCatResult<CustomerInfo>> =>
  Promise.resolve(NOT_CONFIGURED);

export const restorePurchases = (): Promise<RevenueCatResult<CustomerInfo>> =>
  Promise.resolve(NOT_CONFIGURED);

export const setUserId = (_userId: string): Promise<RevenueCatResult<void>> =>
  Promise.resolve(NOT_CONFIGURED);

export const logoutUser = (): Promise<RevenueCatResult<void>> =>
  Promise.resolve(NOT_CONFIGURED);

export const hasEntitlement = async (
  _entitlementId: string,
): Promise<RevenueCatResult<boolean>> => Promise.resolve(NOT_CONFIGURED);

export const hasActiveSubscription = async (): Promise<
  RevenueCatResult<boolean>
> => Promise.resolve(NOT_CONFIGURED);

export const getPackage = async (
  _packageIdentifier: string,
): Promise<RevenueCatResult<PurchasesPackage | null>> =>
  Promise.resolve(NOT_CONFIGURED);
