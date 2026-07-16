/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlayerFrame {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isSprinting: boolean;
  isJumping: boolean;
  isGrounded: boolean;
  isPushing: boolean;
  facingLeft: boolean;
}

export interface Echo {
  id: string;
  color: string;
  frames: PlayerFrame[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Solid extends Rect {
  id: string;
  type: 'wall' | 'floor' | 'ceiling' | 'ledge';
  color?: string;
}

export interface Button extends Rect {
  id: string;
  targetId: string; // ID of door, platform, or laser toggled
  isPressed: boolean;
  color?: string;
  type: 'toggle' | 'momentary'; // toggle switches state, momentary is only active when held (though plates are better for held)
}

export interface PressurePlate extends Rect {
  id: string;
  targetId: string;
  isPressed: boolean;
  color?: string;
}

export interface Door extends Rect {
  id: string;
  isOpen: boolean;
  openProgress: number; // 0 to 1
  startX: number;
  startY: number;
  openX: number;
  openY: number;
  color?: string;
}

export interface MovingPlatform extends Rect {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  progress: number; // 0 to 1
  direction: 1 | -1;
  isActive: boolean; // Does it require a button/plate to move, or does it move constantly?
  requiresSignal: boolean; // If true, only moves/actives when signal is received
  color?: string;
}

export interface Laser {
  id: string;
  x: number;
  y: number;
  dx: number; // beam direction x
  dy: number; // beam direction y
  isActive: boolean; // whether firing
  requiresSignal: boolean; // if connected to plate/button
  targetId?: string; // connection
  invertSignal?: boolean; // active when plate NOT pressed
}

export interface Crate extends Rect {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
}

export interface Key extends Rect {
  id: string;
  isPickedUp: boolean;
  isCollected: boolean; // global loop state
  startX: number;
  startY: number;
  color?: string;
}

export interface LockGate extends Rect {
  id: string;
  keyId: string;
  isOpen: boolean;
  color?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0 to 1
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'trail' | 'reset' | 'spark' | 'dissolve';
}

export interface Level {
  id: number;
  name: string;
  description: string;
  objective: string;
  width: number;
  height: number;
  spawn: Point;
  exit: Rect;
  solids: Solid[];
  buttons: Button[];
  pressurePlates: PressurePlate[];
  doors: Door[];
  movingPlatforms: MovingPlatform[];
  lasers: Laser[];
  crates: Crate[];
  keys: Key[];
  locks: LockGate[];
  bgColor?: string;
  ambientColor?: string;
}
