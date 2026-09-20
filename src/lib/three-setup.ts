import * as THREE from 'three';
import { Timer } from 'three';

/**
 * Three.js r183+ deprecated THREE.Clock in favor of THREE.Timer.
 * Since ecosystem libraries (like @react-three/fiber v9) internally still instantiate
 * new THREE.Clock() during default scene store setup, Three.js provides the official
 * `setConsoleFunction` hook to manage/filter console output.
 *
 * In our application code, all animations strictly use modern `THREE.Timer`.
 * This setup module intercepts and suppresses the deprecated Clock notice from
 * third-party libraries so the developer and production console remains pristine.
 */

// 1. Intercept Three.js internal logger using Three.js's official setConsoleFunction API
if (typeof (THREE as any).setConsoleFunction === 'function') {
  (THREE as any).setConsoleFunction((type: 'log' | 'warn' | 'error', message: string, ...params: any[]) => {
    if (typeof message === 'string' && message.includes('Clock: This module has been deprecated')) {
      return;
    }
    const consoleMethod = console[type] || console.log;
    consoleMethod(message, ...params);
  });
}

// 2. Global console.warn safeguard to catch direct browser log outputs
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (
      args.length > 0 &&
      typeof args[0] === 'string' &&
      args[0].includes('Clock: This module has been deprecated')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export { THREE, Timer };
