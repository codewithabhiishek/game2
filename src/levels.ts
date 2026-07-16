/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level } from './types';

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "The First Echo",
    description: "The time loop is your only ally.",
    objective: "Step on the pressure plate to open the steel gate. It closes when you step off.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 440, width: 60, height: 100 },
    bgColor: "#0f1115",
    ambientColor: "rgba(30, 41, 59, 0.4)",
    solids: [
      // Floor
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      // Left border wall
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      // Right border wall
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      // Ceiling
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" },
    ],
    pressurePlates: [
      { id: "plate1", x: 450, y: 535, width: 50, height: 5, targetId: "door1", isPressed: false, color: "#38bdf8" }
    ],
    buttons: [],
    doors: [
      { id: "door1", x: 800, y: 380, width: 30, height: 160, isOpen: false, openProgress: 0, startX: 800, startY: 380, openX: 800, openY: 220, color: "#475569" }
    ],
    movingPlatforms: [],
    lasers: [],
    crates: [],
    keys: [],
    locks: []
  },
  {
    id: 2,
    name: "Synchronized Steps",
    description: "Cooperation begins with yourself.",
    objective: "Two pressure plates must be pressed at the same time to lift the heavy barrier.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 440, width: 60, height: 100 },
    bgColor: "#0f1115",
    ambientColor: "rgba(30, 41, 59, 0.4)",
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" }
    ],
    pressurePlates: [
      { id: "plate1", x: 320, y: 535, width: 50, height: 5, targetId: "double_door", isPressed: false, color: "#38bdf8" },
      { id: "plate2", x: 550, y: 535, width: 50, height: 5, targetId: "double_door", isPressed: false, color: "#38bdf8" }
    ],
    buttons: [],
    doors: [
      { id: "double_door", x: 820, y: 380, width: 30, height: 160, isOpen: false, openProgress: 0, startX: 820, startY: 380, openX: 820, openY: 220, color: "#475569" }
    ],
    movingPlatforms: [],
    lasers: [],
    crates: [],
    keys: [],
    locks: []
  },
  {
    id: 3,
    name: "The Passenger",
    description: "Gravity is a state of mind.",
    objective: "One echo must hold down the pressure plate to raise the elevator while you ride it.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 160, width: 60, height: 100 },
    bgColor: "#0d0e12",
    ambientColor: "rgba(15, 23, 42, 0.5)",
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" },
      // Raised exit platform
      { id: "exit_ledge", x: 950, y: 260, width: 210, height: 280, type: "floor" }
    ],
    pressurePlates: [
      { id: "plate1", x: 380, y: 535, width: 50, height: 5, targetId: "elevator1", isPressed: false, color: "#a855f7" }
    ],
    buttons: [],
    doors: [],
    movingPlatforms: [
      { id: "elevator1", x: 650, y: 520, width: 120, height: 20, startX: 650, startY: 520, endX: 650, endY: 260, speed: 4, progress: 0, direction: 1, isActive: false, requiresSignal: true, color: "#a855f7" }
    ],
    lasers: [],
    crates: [],
    keys: [],
    locks: []
  },
  {
    id: 4,
    name: "The Blockade",
    description: "Some weight transcends time.",
    objective: "Crates stay on pressure plates! Push the heavy block onto the plate to open the gate permanently.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 440, width: 60, height: 100 },
    bgColor: "#0f1115",
    ambientColor: "rgba(30, 41, 59, 0.4)",
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" }
    ],
    pressurePlates: [
      { id: "plate1", x: 650, y: 535, width: 50, height: 5, targetId: "door1", isPressed: false, color: "#38bdf8" }
    ],
    buttons: [],
    doors: [
      { id: "door1", x: 900, y: 380, width: 30, height: 160, isOpen: false, openProgress: 0, startX: 900, startY: 380, openX: 900, openY: 220, color: "#475569" }
    ],
    movingPlatforms: [],
    lasers: [],
    crates: [
      { id: "crate1", x: 350, y: 490, width: 50, height: 50, vx: 0, vy: 0, startX: 350, startY: 490, isGrounded: true }
    ],
    keys: [],
    locks: []
  },
  {
    id: 5,
    name: "Lethal Light",
    description: "Light can burn, but physical mass protects.",
    objective: "The laser beam is lethal! Push the crate under the laser to safely block the beam and walk past.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 440, width: 60, height: 100 },
    bgColor: "#111318",
    ambientColor: "rgba(220, 38, 38, 0.1)", // Crimson laser warning hue
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" },
      // Small safety cover ledge
      { id: "cover", x: 500, y: 40, width: 180, height: 60, type: "floor" }
    ],
    pressurePlates: [],
    buttons: [],
    doors: [],
    movingPlatforms: [],
    lasers: [
      { id: "laser1", x: 590, y: 100, dx: 0, dy: 1, isActive: true, requiresSignal: false } // vertical shooting laser
    ],
    crates: [
      { id: "crate1", x: 300, y: 490, width: 50, height: 50, vx: 0, vy: 0, startX: 300, startY: 490, isGrounded: true }
    ],
    keys: [],
    locks: []
  },
  {
    id: 6,
    name: "The Guarded Switch",
    description: "We are actors in a clockwork dance.",
    objective: "A button toggles the laser on and off. Time your run, or have an echo press the button.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 440, width: 60, height: 100 },
    bgColor: "#0f1115",
    ambientColor: "rgba(30, 41, 59, 0.4)",
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" }
    ],
    pressurePlates: [],
    buttons: [
      // Toggle button
      { id: "btn1", x: 350, y: 515, width: 30, height: 25, targetId: "laser_gate", isPressed: false, type: "toggle", color: "#fb7185" }
    ],
    doors: [],
    movingPlatforms: [],
    lasers: [
      { id: "laser_gate", x: 700, y: 40, dx: 0, dy: 1, isActive: true, requiresSignal: true, targetId: "btn1", invertSignal: true } // starts ACTIVE, pressing button turns it off!
    ],
    crates: [],
    keys: [],
    locks: []
  },
  {
    id: 7,
    name: "The Crypt Key",
    description: "Unlock the gates of tomorrow.",
    objective: "Retrieve the glowing crystal key to unlock the energy gate. Ride the moving platform to reach the key.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 440, width: 60, height: 100 },
    bgColor: "#0d0e12",
    ambientColor: "rgba(20, 80, 80, 0.1)",
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" },
      // Ledge where the key is kept
      { id: "key_ledge", x: 100, y: 220, width: 160, height: 30, type: "floor" }
    ],
    pressurePlates: [
      { id: "plate1", x: 800, y: 535, width: 50, height: 5, targetId: "lift1", isPressed: false, color: "#10b981" }
    ],
    buttons: [],
    doors: [],
    movingPlatforms: [
      { id: "lift1", x: 350, y: 520, width: 100, height: 20, startX: 350, startY: 520, endX: 350, endY: 220, speed: 4.5, progress: 0, direction: 1, isActive: false, requiresSignal: true, color: "#10b981" }
    ],
    lasers: [],
    crates: [],
    keys: [
      { id: "key1", x: 160, y: 170, width: 25, height: 25, startX: 160, startY: 170, isPickedUp: false, isCollected: false, color: "#eab308" }
    ],
    locks: [
      { id: "gate1", keyId: "key1", x: 950, y: 380, width: 25, height: 160, isOpen: false, color: "#eab308" }
    ]
  },
  {
    id: 8,
    name: "Intertwined Cascades",
    description: "A triple plate sequence.",
    objective: "Three plates must be held simultaneously to clear the way. You need at least two echoes running beforehand.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1080, y: 440, width: 60, height: 100 },
    bgColor: "#0d0d0f",
    ambientColor: "rgba(124, 58, 237, 0.15)",
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" }
    ],
    pressurePlates: [
      { id: "p1", x: 300, y: 535, width: 40, height: 5, targetId: "door_triple", isPressed: false, color: "#a855f7" },
      { id: "p2", x: 500, y: 535, width: 40, height: 5, targetId: "door_triple", isPressed: false, color: "#a855f7" },
      { id: "p3", x: 700, y: 535, width: 40, height: 5, targetId: "door_triple", isPressed: false, color: "#a855f7" }
    ],
    buttons: [],
    doors: [
      { id: "door_triple", x: 920, y: 380, width: 30, height: 160, isOpen: false, openProgress: 0, startX: 920, startY: 380, openX: 920, openY: 220, color: "#a855f7" }
    ],
    movingPlatforms: [],
    lasers: [],
    crates: [],
    keys: [],
    locks: []
  },
  {
    id: 9,
    name: "The Laser Sweeper",
    description: "Speed is relative. Shadows are absolute.",
    objective: "Two lasers block the exit. One is constant; the other is connected to a button. Jump, sprint, and block!",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1050, y: 440, width: 60, height: 100 },
    bgColor: "#0c0d10",
    ambientColor: "rgba(225, 29, 72, 0.12)",
    solids: [
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" },
      // Elevated mid platform
      { id: "mid_platform", x: 450, y: 320, width: 300, height: 40, type: "floor" }
    ],
    pressurePlates: [],
    buttons: [
      { id: "laser_switch", x: 600, y: 295, width: 30, height: 25, targetId: "laser2", isPressed: false, type: "toggle", color: "#f43f5e" }
    ],
    doors: [],
    movingPlatforms: [],
    lasers: [
      // Constantly active laser shooting horizontal at y=460. Must jump over it.
      { id: "laser1", x: 380, y: 460, dx: 1, dy: 0, isActive: true, requiresSignal: false },
      // Vertical laser blocking exit, toggled off by switch on elevated platform
      { id: "laser2", x: 920, y: 40, dx: 0, dy: 1, isActive: true, requiresSignal: true, targetId: "laser_switch", invertSignal: true }
    ],
    crates: [],
    keys: [],
    locks: []
  },
  {
    id: 10,
    name: "The Grand Paradox",
    description: "Every second of your past leads to this exit.",
    objective: "The ultimate trial! Elevators, crates, lasers, and keys. Use a symphony of echoes to conquer the temple.",
    width: 1200,
    height: 650,
    spawn: { x: 100, y: 480 },
    exit: { x: 1080, y: 150, width: 60, height: 100 },
    bgColor: "#090a0f",
    ambientColor: "rgba(14, 165, 233, 0.15)",
    solids: [
      // Main floor
      { id: "floor", x: 0, y: 540, width: 1200, height: 110, type: "floor" },
      { id: "left_wall", x: 0, y: 0, width: 40, height: 540, type: "wall" },
      { id: "right_wall", x: 1160, y: 0, width: 40, height: 540, type: "wall" },
      { id: "ceiling", x: 0, y: 0, width: 1200, height: 40, type: "ceiling" },
      // Platform 1 (Left high)
      { id: "high_left", x: 100, y: 250, width: 250, height: 40, type: "floor" },
      // Platform 2 (Right high, holds the exit)
      { id: "high_right", x: 800, y: 250, width: 360, height: 290, type: "floor" }
    ],
    pressurePlates: [
      // Plate to activate elevator on the right
      { id: "p1", x: 220, y: 245, width: 40, height: 5, targetId: "main_elevator", isPressed: false, color: "#38bdf8" },
      // Plate to turn off laser wall holding key
      { id: "p2", x: 500, y: 535, width: 40, height: 5, targetId: "key_laser", isPressed: false, color: "#fb7185" }
    ],
    buttons: [],
    doors: [],
    movingPlatforms: [
      // Elevator rising to the exit
      { id: "main_elevator", x: 670, y: 520, width: 110, height: 20, startX: 670, startY: 520, endX: 670, endY: 250, speed: 4, progress: 0, direction: 1, isActive: false, requiresSignal: true, color: "#38bdf8" }
    ],
    lasers: [
      // Laser protecting the key on the floor
      { id: "key_laser", x: 420, y: 400, dx: 1, dy: 0, isActive: true, requiresSignal: true, targetId: "p2", invertSignal: true }
    ],
    crates: [
      { id: "crate10", x: 150, y: 200, width: 45, height: 45, vx: 0, vy: 0, startX: 150, startY: 200, isGrounded: true }
    ],
    keys: [
      // Key sitting in key area protected by laser
      { id: "grand_key", x: 470, y: 500, width: 25, height: 25, startX: 470, startY: 500, isPickedUp: false, isCollected: false, color: "#eab308" }
    ],
    locks: [
      // Lock guarding exit on high platform
      { id: "grand_lock", keyId: "grand_key", x: 920, y: 90, width: 25, height: 160, isOpen: false, color: "#eab308" }
    ]
  }
];
