/**
 * Device Detection Utility
 *
 * Detects device type for cross-device alarm synchronization
 * Based on 2024 best practices:
 * - User-Agent detection for broad compatibility
 * - Screen size validation
 * - Capacitor platform detection for native apps
 */

import { Capacitor } from '@capacitor/core';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Detect if the current device is mobile based on User-Agent
 * MDN recommends checking for "Mobi" in the UA string
 */
function isMobileUserAgent(): boolean {
  return /Mobi/i.test(navigator.userAgent);
}

/**
 * Detect if device is tablet based on User-Agent and screen size
 */
function isTabletUserAgent(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return (
    /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(ua)
  );
}

/**
 * Detect device type based on screen size
 * Mobile: <= 768px
 * Tablet: 769px - 1024px
 * Desktop: > 1024px
 */
function getDeviceTypeByScreenSize(): DeviceType {
  const width = window.innerWidth || document.documentElement.clientWidth;

  if (width <= 768) {
    return 'mobile';
  } else if (width <= 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Main function to detect device type
 * Uses multiple methods for accuracy:
 * 1. Capacitor native platform detection (most reliable for native apps)
 * 2. User-Agent string detection
 * 3. Screen size validation
 */
export function getDeviceType(): DeviceType {
  // 1. Check if running in Capacitor native app
  const platform = Capacitor.getPlatform();

  if (platform === 'ios' || platform === 'android') {
    // Native mobile app - always treat as mobile
    return 'mobile';
  }

  // 2. For web platform, use User-Agent detection
  if (isTabletUserAgent()) {
    return 'tablet';
  }

  if (isMobileUserAgent()) {
    return 'mobile';
  }

  // 3. Fallback to screen size detection
  return getDeviceTypeByScreenSize();
}

/**
 * Check if device supports full-screen alarms
 * Only mobile devices (phones and tablets) show full-screen alarms
 * Desktop/browser shows simple notifications
 */
export function supportsFullScreenAlarm(): boolean {
  const deviceType = getDeviceType();
  const platform = Capacitor.getPlatform();

  // Full-screen alarms only on:
  // 1. Native mobile apps (iOS/Android)
  // 2. Mobile web browsers
  return platform === 'ios' || platform === 'android' || deviceType === 'mobile';
}

/**
 * Get device information for push notification subscription
 * Returns comprehensive device data to store with subscription
 */
export function getDeviceInfo() {
  const platform = Capacitor.getPlatform();
  const deviceType = getDeviceType();
  const supportsFullScreen = supportsFullScreenAlarm();

  return {
    platform, // 'web', 'ios', 'android'
    deviceType, // 'mobile', 'tablet', 'desktop'
    supportsFullScreen, // boolean
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  };
}

/**
 * Log device information for debugging
 */
export function logDeviceInfo() {
  const info = getDeviceInfo();
  console.log('[Device Detection]', {
    platform: info.platform,
    deviceType: info.deviceType,
    supportsFullScreen: info.supportsFullScreen,
    screenSize: `${info.screenWidth}x${info.screenHeight}`,
  });
}
