/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Button as UIButton } from './ui-placeholder'; // Lightweight fallbacks if needed, or inline Tailwind buttons
import { LEVELS } from '../levels';
import { Level, Echo, PlayerFrame, Particle, Rect, Crate, Key, LockGate, Button, PressurePlate, MovingPlatform, Laser } from '../types';
import { audioEngine } from '../audio';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ChevronRight, HelpCircle, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Color palette for Echoes
const ECHO_COLORS = [
  'rgba(56, 189, 248, 0.75)',  // Cyan
  'rgba(168, 85, 247, 0.75)',  // Purple
  'rgba(16, 185, 129, 0.75)',  // Emerald
  'rgba(244, 63, 94, 0.75)',   // Rose
  'rgba(234, 179, 8, 0.75)',   // Gold
  'rgba(249, 115, 22, 0.75)',  // Orange
  'rgba(6, 182, 212, 0.75)',   // Teal
  'rgba(236, 72, 153, 0.75)',  // Pink
  'rgba(99, 102, 241, 0.75)',  // Indigo
  'rgba(139, 92, 246, 0.75)',  // Violet
];

interface GameCanvasProps {
  currentLevelIndex: number;
  onLevelComplete: () => void;
  onSelectLevel: (index: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function GameCanvas({
  currentLevelIndex,
  onLevelComplete,
  onSelectLevel,
  isMuted,
  onToggleMute
}: GameCanvasProps) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core Game State Refs to avoid React re-render lag
  const levelRef = useRef<Level>(JSON.parse(JSON.stringify(LEVELS[currentLevelIndex])));
  const playerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    width: 20,
    height: 40,
    isSprinting: false,
    isJumping: false,
    isGrounded: false,
    isPushing: false,
    facingLeft: false,
    isDead: false,
    deathTimer: 0
  });

  const echoesRef = useRef<Echo[]>([]);
  const currentRecordingRef = useRef<PlayerFrame[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keyStateRef = useRef<{ [key: string]: boolean }>({});
  
  // Audio state
  const [audioStarted, setAudioStarted] = useState(false);

  // Time loop variables (8 seconds max = 480 frames at 60fps)
  const maxLoopTime = 8.0; // seconds
  const [timeRemaining, setTimeRemaining] = useState(maxLoopTime);
  const timeRemainingRef = useRef(maxLoopTime);
  const loopCountRef = useRef(1);
  const [loopCount, setLoopCount] = useState(1);

  // Cinematic / Camera Effects
  const cameraRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, shake: 0, zoom: 1.0, targetZoom: 1.0 });
  const timeResetEffectRef = useRef({ active: false, timer: 0, duration: 40, x: 0, y: 0 }); // 40 frames of reset animation

  // UI States synced from engine loop
  const [activeEchoCount, setActiveEchoCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  // Reset the level completely (from scratch, delete all Echoes)
  const restartLevelFromScratch = () => {
    audioEngine.playRewind();
    
    // Deep clone original level
    levelRef.current = JSON.parse(JSON.stringify(LEVELS[currentLevelIndex]));
    
    // Spawn player
    playerRef.current.x = levelRef.current.spawn.x;
    playerRef.current.y = levelRef.current.spawn.y;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.isDead = false;
    playerRef.current.deathTimer = 0;

    echoesRef.current = [];
    currentRecordingRef.current = [];
    particlesRef.current = [];
    timeRemainingRef.current = maxLoopTime;
    loopCountRef.current = 1;
    setLoopCount(1);
    setActiveEchoCount(0);
    timeResetEffectRef.current.active = false;
    
    // Initialize key states
    levelRef.current.keys.forEach(k => {
      k.isPickedUp = false;
      k.isCollected = false;
    });
    levelRef.current.locks.forEach(l => l.isOpen = false);

    // Initial camera placement
    cameraRef.current.x = playerRef.current.x;
    cameraRef.current.y = playerRef.current.y;
    cameraRef.current.zoom = 1.0;
    cameraRef.current.targetZoom = 1.0;

    spawnPulseParticles(playerRef.current.x, playerRef.current.y, '#38bdf8', 40);
  };

  // Reset timeline loop (keeps previous Echoes, starts new recording)
  const resetTimelineLoop = (causedByDeath: boolean = false) => {
    if (timeResetEffectRef.current.active) return; // Prevent double trigger
    
    // Play rewind effects
    audioEngine.playRewind();
    
    // Add screen shake
    cameraRef.current.shake = 15;

    // Trigger visual reset effect at player position
    timeResetEffectRef.current.active = true;
    timeResetEffectRef.current.timer = 0;
    timeResetEffectRef.current.x = playerRef.current.x + playerRef.current.width / 2;
    timeResetEffectRef.current.y = playerRef.current.y + playerRef.current.height / 2;

    // Save current recording as an Echo (if they didn't die instantly with 0 frames or if we want to save it)
    if (!causedByDeath && currentRecordingRef.current.length > 5) {
      const color = ECHO_COLORS[(loopCountRef.current - 1) % ECHO_COLORS.length];
      echoesRef.current.push({
        id: `echo_${Date.now()}`,
        color,
        frames: [...currentRecordingRef.current]
      });
      loopCountRef.current += 1;
      setLoopCount(loopCountRef.current);
    }

    // Reset loop variables
    currentRecordingRef.current = [];
    timeRemainingRef.current = maxLoopTime;

    // Reset Level Entities back to initial positions
    const originalLevel = LEVELS[currentLevelIndex];
    
    // Reset door progress but keep open states if tied to toggle switches that are persistent
    // Actually, in time loop games, EVERYTHING resets except player memories (echoes).
    // So all buttons, plates, doors, crates, keys go back to their spawn/initial state!
    levelRef.current.doors.forEach((door, i) => {
      door.isOpen = false;
      door.openProgress = 0;
      door.x = door.startX;
      door.y = door.startY;
    });

    levelRef.current.pressurePlates.forEach(plate => plate.isPressed = false);
    levelRef.current.buttons.forEach(btn => btn.isPressed = false);
    
    levelRef.current.crates.forEach((crate, i) => {
      const origCrate = originalLevel.crates[i];
      if (origCrate) {
        crate.x = origCrate.startX;
        crate.y = origCrate.startY;
        crate.vx = 0;
        crate.vy = 0;
        crate.isGrounded = true;
      }
    });

    levelRef.current.keys.forEach((key, i) => {
      const origKey = originalLevel.keys[i];
      if (origKey) {
        key.x = origKey.startX;
        key.y = origKey.startY;
        key.isPickedUp = false;
        key.isCollected = false;
      }
    });

    levelRef.current.locks.forEach((lock, i) => {
      lock.isOpen = false;
    });

    // Reset moving platforms
    levelRef.current.movingPlatforms.forEach((platform, i) => {
      const origPlat = originalLevel.movingPlatforms[i];
      if (origPlat) {
        platform.x = origPlat.startX;
        platform.y = origPlat.startY;
        platform.progress = 0;
        platform.direction = 1;
        platform.isActive = origPlat.isActive;
      }
    });

    // Reset player position
    playerRef.current.x = levelRef.current.spawn.x;
    playerRef.current.y = levelRef.current.spawn.y;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    playerRef.current.isDead = false;
    playerRef.current.deathTimer = 0;

    setActiveEchoCount(echoesRef.current.length);
  };

  // Triggered when level index changes
  useEffect(() => {
    restartLevelFromScratch();
    setShowTutorial(true);
    setGameWon(false);
  }, [currentLevelIndex]);

  // Audio start assistant
  const handleStartAudio = () => {
    audioEngine.init();
    audioEngine.resume();
    setAudioStarted(true);
  };

  // Spawns particles
  const spawnPulseParticles = (x: number, y: number, color: string, count: number = 20, type: 'trail' | 'reset' | 'spark' | 'dissolve' = 'spark') => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      const maxLife = Math.random() * 30 + 20;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife,
        size: Math.random() * 4 + 1.5,
        color,
        alpha: 1.0,
        type
      });
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyStateRef.current[key] = true;
      keyStateRef.current[e.key] = true; // Support capitals and other representations

      // Immediate triggers
      if (key === 'r') {
        restartLevelFromScratch();
      }

      if (!audioStarted) {
        handleStartAudio();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyStateRef.current[key] = false;
      keyStateRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioStarted, currentLevelIndex]);

  // Check AABB collision
  const checkAABB = (r1: Rect, r2: Rect): boolean => {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  };

  // Solve collisions against solids, closed doors, and locked gates
  const checkSolidCollisions = (rect: Rect): boolean => {
    // 1. Static walls and floors
    for (const solid of levelRef.current.solids) {
      if (checkAABB(rect, solid)) return true;
    }

    // 2. Closed doors (slide collisions depend on open progress)
    for (const door of levelRef.current.doors) {
      // If closed or partially open, collide with its active physical boundaries
      if (door.openProgress < 0.9) {
        // Calculate door current dynamic collision rect
        // The door slides up, meaning its physical height shrinks or moves
        const openHeight = door.height * (1 - door.openProgress);
        if (openHeight > 5) {
          const doorPhysicalRect: Rect = {
            x: door.x,
            y: door.y + (door.height - openHeight), // slides up out of the floor/ceiling
            width: door.width,
            height: openHeight
          };
          if (checkAABB(rect, doorPhysicalRect)) return true;
        }
      }
    }

    // 3. Locked gates
    for (const lock of levelRef.current.locks) {
      if (!lock.isOpen) {
        if (checkAABB(rect, lock)) return true;
      }
    }

    return false;
  };

  // Main game loop
  useEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const timestep = 1000 / 60; // stable 60 updates per second (16.67ms)

    // Handle container resizing via ResizeObserver (robust and responsive)
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Dynamic scale helper
    const getLevelScale = () => {
      const lvl = levelRef.current;
      if (!canvas || canvas.width <= 0 || canvas.height <= 0) return 1;
      const wScale = canvas.width / lvl.width;
      const hScale = canvas.height / lvl.height;
      return Math.min(wScale, hScale, 1.1) || 1; // Cap scale at 1.1x to keep crispness
    };

    // Frame update (Physics, Collisions, Inputs)
    const updatePhysics = () => {
      const lvl = levelRef.current;
      const player = playerRef.current;

      // Handle cinematic reset effect lock
      if (timeResetEffectRef.current.active) {
        timeResetEffectRef.current.timer++;
        if (timeResetEffectRef.current.timer >= timeResetEffectRef.current.duration) {
          timeResetEffectRef.current.active = false;
        }
        return; // Pause normal physics during time flash
      }

      // Check death timeline reset
      if (player.isDead) {
        player.deathTimer++;
        if (player.deathTimer > 45) {
          resetTimelineLoop(true);
        }
        return;
      }

      // 1. Slow Motion and Time Loops
      // If time remaining is low, we enter a cinematic slow motion
      let speedFactor = 1.0;
      if (timeRemainingRef.current < 1.5) {
        speedFactor = 0.45; // Slow motion factor
      }

      // Decrement timeline time remaining
      timeRemainingRef.current -= (timestep / 1000) * speedFactor;
      if (timeRemainingRef.current <= 0) {
        resetTimelineLoop(false);
        return;
      }
      setTimeRemaining(timeRemainingRef.current);
      audioEngine.setMusicIntensity(timeRemainingRef.current / maxLoopTime);

      // 2. Playback of Echoes
      const currentFrameIndex = currentRecordingRef.current.length;
      
      // Update pressure plates state to false first
      lvl.pressurePlates.forEach(plate => plate.isPressed = false);

      // Check if Echoes trigger pressure plates
      echoesRef.current.forEach(echo => {
        const frame = echo.frames[currentFrameIndex];
        if (frame) {
          const echoRect: Rect = { x: frame.x, y: frame.y, width: player.width, height: player.height };
          
          // Check plate overlaps
          lvl.pressurePlates.forEach(plate => {
            if (checkAABB(echoRect, plate)) {
              plate.isPressed = true;
            }
          });

          // Check button activations
          lvl.buttons.forEach(btn => {
            if (checkAABB(echoRect, btn) && !btn.isPressed) {
              if (btn.type === 'toggle') {
                btn.isPressed = !btn.isPressed;
                audioEngine.playClick();
                cameraRef.current.shake = 5;
              }
            }
          });

          // Spawn subtle particle trails for echoes
          if (Math.random() < 0.15 && (Math.abs(frame.vx) > 0.5 || Math.abs(frame.vy) > 0.5)) {
            particlesRef.current.push({
              x: frame.x + player.width / 2 + (Math.random() * 10 - 5),
              y: frame.y + player.height / 2 + (Math.random() * 15 - 7.5),
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              life: 1.0,
              maxLife: Math.random() * 25 + 15,
              size: Math.random() * 3 + 1,
              color: echo.color,
              alpha: 0.6,
              type: 'trail'
            });
          }
        }
      });

      // 3. Player Input & Physics
      const keys = keyStateRef.current;
      const isA = keys['a'] || keys['arrowleft'];
      const isD = keys['d'] || keys['arrowright'];
      const isSpace = keys[' '] || keys['w'] || keys['arrowup'];
      const isSprint = keys['shift'];

      player.isSprinting = isSprint;
      const targetSpeed = isSprint ? 4.5 : 2.5;
      const accel = player.isGrounded ? 0.35 : 0.15;
      const decel = player.isGrounded ? 0.8 : 0.95;

      // Apply horizontal inputs
      if (isA) {
        player.vx -= accel * speedFactor;
        if (player.vx < -targetSpeed) player.vx = -targetSpeed;
        player.facingLeft = true;
      } else if (isD) {
        player.vx += accel * speedFactor;
        if (player.vx > targetSpeed) player.vx = targetSpeed;
        player.facingLeft = false;
      } else {
        player.vx *= decel;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
      }

      // Apply Gravity
      const gravity = 0.45 * speedFactor;
      player.vy += gravity;
      if (player.vy > 12) player.vy = 12; // Terminal velocity

      // Jump request
      if (isSpace && player.isGrounded) {
        player.vy = -8.2;
        player.isJumping = true;
        player.isGrounded = false;
        audioEngine.playJump();

        // Jump particles
        spawnPulseParticles(player.x + player.width / 2, player.y + player.height, 'rgba(255, 255, 255, 0.4)', 8);
      }

      // Horizontal solver & Crate Pushing
      player.isPushing = false;
      const nextX = player.x + player.vx * speedFactor;
      const hRect: Rect = { x: nextX, y: player.y, width: player.width, height: player.height };

      let horizontalCollision = checkSolidCollisions(hRect);

      // Check interaction with Crates
      for (const crate of lvl.crates) {
        if (checkAABB(hRect, crate)) {
          // Player is walking into a crate!
          player.isPushing = true;
          
          // Try pushing the crate in the direction of velocity
          const pushDirection = player.vx > 0 ? 1 : -1;
          const pushSpeed = player.vx * 0.75; // Crate is heavy, pushes slower
          
          const nextCrateX = crate.x + pushSpeed * speedFactor;
          const crateTestRect: Rect = { x: nextCrateX, y: crate.y, width: crate.width, height: crate.height };
          
          // Does the crate collide with walls or doors?
          const crateCollision = checkSolidCollisions(crateTestRect);
          
          if (!crateCollision) {
            crate.x = nextCrateX;
            player.vx = pushSpeed; // Slower movement when pushing
            horizontalCollision = false; // Resolved via push!
          } else {
            horizontalCollision = true; // Blocked because crate is blocked
            player.vx = 0;
          }
        }
      }

      if (!horizontalCollision) {
        player.x = nextX;
      } else {
        player.vx = 0;
      }

      // Vertical solver
      const nextY = player.y + player.vy * speedFactor;
      const vRect: Rect = { x: player.x, y: nextY, width: player.width, height: player.height };

      let verticalCollision = checkSolidCollisions(vRect);
      player.isGrounded = false;

      // Check vertical collisions against Crates
      for (const crate of lvl.crates) {
        if (checkAABB(vRect, crate)) {
          // Landing on a crate
          if (player.vy > 0 && player.y + player.height <= crate.y + 4) {
            player.y = crate.y - player.height;
            player.vy = 0;
            player.isGrounded = true;
            player.isJumping = false;
            verticalCollision = false;
          } else if (player.vy < 0) {
            // Hitting bottom of crate
            player.y = crate.y + crate.height;
            player.vy = 0;
            verticalCollision = true;
          }
        }
      }

      if (!verticalCollision) {
        player.y = nextY;
      } else {
        if (player.vy > 0) {
          player.isGrounded = true;
          player.isJumping = false;
        }
        player.vy = 0;
      }

      // Check floor borders
      if (player.y > lvl.height - 100) {
        player.y = lvl.height - 100 - player.height;
        player.vy = 0;
        player.isGrounded = true;
      }

      // Check current player plate overlap
      lvl.pressurePlates.forEach(plate => {
        if (checkAABB(player, plate)) {
          plate.isPressed = true;
        }
      });

      // Check current player button triggers
      lvl.buttons.forEach(btn => {
        if (checkAABB(player, btn) && !btn.isPressed) {
          if (btn.type === 'toggle') {
            btn.isPressed = true; // Set persistent pressed
            audioEngine.playClick();
            cameraRef.current.shake = 5;
          }
        }
      });

      // 4. Update Crates Physics (gravity & floor)
      lvl.crates.forEach(crate => {
        crate.vy += 0.4 * speedFactor;
        if (crate.vy > 10) crate.vy = 10;

        const nextCrateY = crate.y + crate.vy * speedFactor;
        const crateVRect: Rect = { x: crate.x, y: nextCrateY, width: crate.width, height: crate.height };

        if (checkSolidCollisions(crateVRect)) {
          crate.vy = 0;
          crate.isGrounded = true;
        } else {
          crate.y = nextCrateY;
          crate.isGrounded = false;
        }

        // Apply friction/drag to crate horizontal slide
        crate.vx *= 0.8;
        if (Math.abs(crate.vx) < 0.05) crate.vx = 0;

        // Check if crate lands on pressure plates
        lvl.pressurePlates.forEach(plate => {
          if (checkAABB(crate, plate)) {
            plate.isPressed = true;
          }
        });
      });

      // 5. Update Key Pickups
      lvl.keys.forEach(key => {
        if (!key.isPickedUp && !key.isCollected && checkAABB(player, key)) {
          key.isPickedUp = true;
          key.isCollected = true;
          audioEngine.playKey();
          spawnPulseParticles(key.x + key.width / 2, key.y + key.height / 2, '#fbbf24', 15);
        }
      });

      // Lock gate unlocking
      lvl.locks.forEach(lock => {
        if (!lock.isOpen) {
          // Check if player has the matching key collected
          const key = lvl.keys.find(k => k.id === lock.keyId);
          if (key && key.isCollected && checkAABB(player, lock)) {
            lock.isOpen = true;
            audioEngine.playDoorOpen();
            cameraRef.current.shake = 8;
            spawnPulseParticles(lock.x + lock.width / 2, lock.y + lock.height / 2, '#fbbf24', 25);
          }
        }
      });

      // 6. Doors Sliding Logic (Pneumatic visual slide)
      lvl.doors.forEach(door => {
        // Evaluate trigger signals
        // Find all plates or buttons targeting this door
        const activators = [
          ...lvl.pressurePlates.filter(p => p.targetId === door.id),
          ...lvl.buttons.filter(b => b.targetId === door.id)
        ];

        let shouldOpen = false;
        if (activators.length > 0) {
          // If multiple, they ALL must be active (AND gate logic)
          shouldOpen = activators.every(act => act.isPressed);
        }

        const openRate = 0.06 * speedFactor;
        if (shouldOpen) {
          if (door.openProgress === 0) {
            audioEngine.playDoorOpen();
            cameraRef.current.shake = 3;
          }
          door.openProgress = Math.min(1.0, door.openProgress + openRate);
        } else {
          door.openProgress = Math.max(0.0, door.openProgress - openRate);
        }

        // Smooth door coordinate positioning
        door.y = door.startY - (door.startY - door.openY) * door.openProgress;
      });

      // 7. Moving Platforms Mechanics
      lvl.movingPlatforms.forEach(platform => {
        let active = platform.isActive;

        // If requires signaling, check buttons/plates
        if (platform.requiresSignal) {
          const signals = [
            ...lvl.pressurePlates.filter(p => p.targetId === platform.id),
            ...lvl.buttons.filter(b => b.targetId === platform.id)
          ];
          active = signals.length > 0 ? signals.every(s => s.isPressed) : platform.isActive;
        }

        if (active) {
          const dx = platform.endX - platform.startX;
          const dy = platform.endY - platform.startY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            const step = (platform.speed / dist) * speedFactor;
            platform.progress += step * platform.direction;

            if (platform.progress >= 1.0) {
              platform.progress = 1.0;
              platform.direction = -1;
            } else if (platform.progress <= 0.0) {
              platform.progress = 0.0;
              platform.direction = 1;
            }

            const oldX = platform.x;
            const oldY = platform.y;

            platform.x = platform.startX + dx * platform.progress;
            platform.y = platform.startY + dy * platform.progress;

            const platDiffX = platform.x - oldX;
            const platDiffY = platform.y - oldY;

            // Carry player if standing on top of platform
            const playerFeet = player.y + player.height;
            const isStandingOnPlat =
              player.x + player.width > platform.x &&
              player.x < platform.x + platform.width &&
              Math.abs(playerFeet - oldY) < 5 &&
              player.vy >= 0;

            if (isStandingOnPlat) {
              player.x += platDiffX;
              player.y = platform.y - player.height;
              player.vy = 0;
              player.isGrounded = true;
            }

            // Carry crates if standing on platform
            lvl.crates.forEach(crate => {
              const crateFeet = crate.y + crate.height;
              const isCrateOnPlat =
                crate.x + crate.width > platform.x &&
                crate.x < platform.x + platform.width &&
                Math.abs(crateFeet - oldY) < 5;

              if (isCrateOnPlat) {
                crate.x += platDiffX;
                crate.y = platform.y - crate.height;
                crate.vy = 0;
                crate.isGrounded = true;
              }
            });
          }
        }
      });

      // 8. Lasers Firing & Death Check
      lvl.lasers.forEach(laser => {
        let isFired = laser.isActive;

        if (laser.requiresSignal && laser.targetId) {
          const trigger = [
            ...lvl.pressurePlates.filter(p => p.id === laser.targetId),
            ...lvl.buttons.filter(b => b.id === laser.targetId)
          ].find(t => t.isPressed);

          const signalActive = !!trigger;
          isFired = laser.invertSignal ? !signalActive : signalActive;
        }

        if (isFired) {
          // Cast the laser ray
          let beamX = laser.x;
          let beamY = laser.y;
          const rayStep = 4;
          const maxDist = 1200;
          let distTravelled = 0;
          let hitObject = false;

          while (distTravelled < maxDist && !hitObject) {
            beamX += laser.dx * rayStep;
            beamY += laser.dy * rayStep;
            distTravelled += rayStep;

            const rayPoint: Rect = { x: beamX, y: beamY, width: 2, height: 2 };

            // Check if laser ray hits any solid block
            if (checkSolidCollisions(rayPoint)) {
              hitObject = true;
            }

            // Check if laser ray hits a Crate
            for (const crate of lvl.crates) {
              if (checkAABB(rayPoint, crate)) {
                hitObject = true;
              }
            }

            // Check if laser hits active player
            const pRect: Rect = player;
            if (checkAABB(rayPoint, pRect) && !player.isDead) {
              player.isDead = true;
              player.vx = 0;
              player.vy = 0;
              audioEngine.playLaserZap();
              cameraRef.current.shake = 18;
              spawnPulseParticles(player.x + player.width / 2, player.y + player.height / 2, '#ef4444', 35);
              hitObject = true;
            }

            // Check if laser hits any Echoes
            echoesRef.current.forEach(echo => {
              const frame = echo.frames[currentFrameIndex];
              if (frame) {
                const echoRect: Rect = { x: frame.x, y: frame.y, width: player.width, height: player.height };
                if (checkAABB(rayPoint, echoRect)) {
                  // Echo gets zapped! They dissolve early.
                  spawnPulseParticles(frame.x + player.width / 2, frame.y + player.height / 2, echo.color, 12, 'dissolve');
                  echo.frames = echo.frames.slice(0, currentFrameIndex); // truncate echo path (dissolves)
                }
              }
            });
          }

          // Visual spark generator at the ray end point
          if (Math.random() < 0.25) {
            particlesRef.current.push({
              x: beamX,
              y: beamY,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 1.0,
              maxLife: Math.random() * 15 + 10,
              size: Math.random() * 2 + 1,
              color: '#f43f5e',
              alpha: 0.9,
              type: 'spark'
            });
          }
        }
      });

      // 9. Save current frame recording
      currentRecordingRef.current.push({
        x: player.x,
        y: player.y,
        vx: player.vx,
        vy: player.vy,
        isSprinting: player.isSprinting,
        isJumping: player.isJumping,
        isGrounded: player.isGrounded,
        isPushing: player.isPushing,
        facingLeft: player.facingLeft
      });

      // Check Victory Overlap
      if (checkAABB(player, lvl.exit)) {
        // Win!
        setGameWon(true);
        audioEngine.playKey();
        onLevelComplete();
      }
    };

    // Update camera transitions & particle life
    const updateVisuals = () => {
      const player = playerRef.current;
      const camera = cameraRef.current;

      // Camera anticipation/follow
      // Calculate smooth destination centered on player with some offset for screen viewing ahead
      const anticipationX = player.vx * 15;
      const targetCamX = player.x + player.width / 2 + anticipationX - canvas.width / (2 * camera.zoom);
      const targetCamY = player.y + player.height / 2 - canvas.height / (2 * camera.zoom);

      // Smooth interpolation
      camera.x += (targetCamX - camera.x) * 0.08;
      camera.y += (targetCamY - camera.y) * 0.08;

      // Handle screen shake decay
      if (camera.shake > 0.1) {
        camera.shake *= 0.88;
      } else {
        camera.shake = 0;
      }

      // Constrain camera bounds to level borders
      const lvl = levelRef.current;
      const camW = canvas.width / camera.zoom;
      const camH = canvas.height / camera.zoom;

      if (camera.x < 0) camera.x = 0;
      if (camera.x > lvl.width - camW) camera.x = lvl.width - camW;
      if (camera.y < 0) camera.y = 0;
      if (camera.y > lvl.height - camH) camera.y = lvl.height - camH;

      // Update particles
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        // Reverse particles slowly fly backward if resetting
        if (timeResetEffectRef.current.active) {
          p.x -= p.vx * 1.5;
          p.y -= p.vy * 1.5;
        }

        p.life -= 1 / p.maxLife;
      });

      // Clear dead particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    };

    // Draw frame onto HTML5 Canvas
    const renderFrame = () => {
      const lvl = levelRef.current;
      const player = playerRef.current;
      const camera = cameraRef.current;
      const activeFrameIndex = currentRecordingRef.current.length;

      // Render context setup
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      
      // Screen shake offset
      let shakeX = 0;
      let shakeY = 0;
      if (camera.shake > 0) {
        shakeX = (Math.random() - 0.5) * camera.shake;
        shakeY = (Math.random() - 0.5) * camera.shake;
      }

      // Center layout scale translation
      const levelScale = getLevelScale();
      ctx.translate(canvas.width / 2 + shakeX, canvas.height / 2 + shakeY);
      ctx.scale(levelScale * camera.zoom, levelScale * camera.zoom);
      ctx.translate(-lvl.width / 2, -lvl.height / 2);

      // Desaturate effect for timeline reset
      if (timeResetEffectRef.current.active) {
        ctx.filter = 'grayscale(60%) contrast(120%)';
      }

      // --- 1. Atmospheric Ambient Background ---
      const bgGrad = ctx.createLinearGradient(0, 0, 0, lvl.height);
      bgGrad.addColorStop(0, '#040406');
      bgGrad.addColorStop(0.6, '#08080d');
      bgGrad.addColorStop(1, '#020203');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, lvl.width, lvl.height);

      // Fine Geometric Grid Background (Aesthetic minimalist matrix)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < lvl.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, lvl.height);
        ctx.stroke();
      }
      for (let y = 0; y < lvl.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(lvl.width, y);
        ctx.stroke();
      }

      // Volumetric spotlight cones (Dynamic, pulsing, atmospheric)
      const timeSec = Date.now() / 1000;
      
      // Spotlight 1: Dynamic overhead ambient glow
      const spot1X = lvl.width * 0.4 + Math.sin(timeSec * 0.5) * 60;
      const spot1Glow = ctx.createRadialGradient(
        spot1X, 0, 20,
        spot1X, 200, lvl.height * 0.9
      );
      spot1Glow.addColorStop(0, lvl.ambientColor ? lvl.ambientColor.replace('0.4', '0.22') : 'rgba(56, 189, 248, 0.12)');
      spot1Glow.addColorStop(0.6, 'rgba(0,0,0,0)');
      spot1Glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot1Glow;
      ctx.fillRect(0, 0, lvl.width, lvl.height);

      // Spotlight 2: Dynamic green glow near the exit monolith
      const spot2X = lvl.exit.x + lvl.exit.width / 2 + Math.cos(timeSec * 0.7) * 40;
      const spot2Glow = ctx.createRadialGradient(
        spot2X, 100, 10,
        spot2X, 300, 450
      );
      spot2Glow.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      spot2Glow.addColorStop(0.6, 'rgba(0,0,0,0)');
      spot2Glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = spot2Glow;
      ctx.fillRect(0, 0, lvl.width, lvl.height);

      // Volumetric light shafts (Swaying soft fog prisms)
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Primary cyan mist beam
      const shaft1X = lvl.width * 0.5 + Math.sin(timeSec * 0.3) * 70;
      const shaft1Width = 150 + Math.sin(timeSec) * 15;
      const shaftGrad1 = ctx.createLinearGradient(shaft1X, 0, shaft1X + 50, lvl.height);
      shaftGrad1.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
      shaftGrad1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shaftGrad1;
      ctx.beginPath();
      ctx.moveTo(shaft1X - shaft1Width / 2, 0);
      ctx.lineTo(shaft1X + shaft1Width / 2, 0);
      ctx.lineTo(shaft1X + shaft1Width + 100, lvl.height);
      ctx.lineTo(shaft1X - shaft1Width - 50, lvl.height);
      ctx.closePath();
      ctx.fill();

      // Secondary keys beam (amber light)
      if (lvl.keys.length > 0 && !lvl.keys[0].isPickedUp) {
        const key = lvl.keys[0];
        const shaft2X = key.x + key.width / 2;
        const shaftGrad2 = ctx.createLinearGradient(shaft2X, 0, shaft2X, lvl.height);
        shaftGrad2.addColorStop(0, 'rgba(234, 179, 8, 0.035)');
        shaftGrad2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shaftGrad2;
        ctx.beginPath();
        ctx.moveTo(shaft2X - 40, 0);
        ctx.lineTo(shaft2X + 40, 0);
        ctx.lineTo(shaft2X + 110, lvl.height);
        ctx.lineTo(shaft2X - 110, lvl.height);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // --- 2. Render Pressure Plates ---
      lvl.pressurePlates.forEach(plate => {
        // Base plate slot recess
        ctx.fillStyle = '#090a0f';
        ctx.fillRect(plate.x, plate.y + 4, plate.width, 4);

        // Pressed visual state (minimal thin-line activation indicator)
        const plateColor = plate.color || '#38bdf8';
        ctx.fillStyle = plate.isPressed ? plateColor : '#272935';
        const plateHeight = plate.isPressed ? 1.5 : 3.5;
        const plateY = plate.isPressed ? plate.y + 3 : plate.y + 1;
        
        ctx.beginPath();
        ctx.roundRect(plate.x + 1, plateY, plate.width - 2, plateHeight, [1, 1, 0, 0]);
        ctx.fill();

        // Atmospheric floor indicator glow
        if (plate.isPressed) {
          ctx.save();
          ctx.shadowColor = plateColor;
          ctx.shadowBlur = 10;
          ctx.fillStyle = plateColor;
          ctx.fillRect(plate.x + 4, plateY + 0.5, plate.width - 8, 1);
          ctx.restore();
        }
      });

      // --- 3. Render Buttons ---
      lvl.buttons.forEach(btn => {
        // Flat wall/floor socket
        ctx.fillStyle = '#0c0d12';
        ctx.fillRect(btn.x, btn.y + btn.height - 4, btn.width, 4);

        // Minimal glowing micro-lever
        const btnColor = btn.color || '#fb7185';
        ctx.fillStyle = btn.isPressed ? btnColor : '#475569';
        const btnY = btn.isPressed ? btn.y + 10 : btn.y + 4;
        const btnH = btn.isPressed ? btn.height - 10 : btn.height - 6;
        ctx.fillRect(btn.x + 6, btnY, btn.width - 12, btnH);

        // Super-thin elegant copper wiring paths (glowing when charged!)
        ctx.strokeStyle = btn.isPressed ? btnColor : 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        
        const target = [...lvl.doors, ...lvl.movingPlatforms, ...lvl.lasers].find(t => t.id === btn.targetId);
        if (target) {
          ctx.beginPath();
          ctx.moveTo(btn.x + btn.width / 2, btn.y + btn.height);
          const midX = (btn.x + btn.width / 2 + target.x) / 2;
          ctx.lineTo(midX, btn.y + btn.height);
          ctx.lineTo(midX, target.y + target.height / 2);
          ctx.lineTo(target.x, target.y + target.height / 2);
          ctx.stroke();

          // Animated energy pulse particle along wiring path if pressed
          if (btn.isPressed) {
            ctx.save();
            const pulsePos = (Date.now() / 15) % 100;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = btnColor;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            // Draw a tiny energy pulse dot
            const ratio = pulsePos / 100;
            const px = btn.x + btn.width / 2 + (target.x - btn.x) * ratio;
            const py = btn.y + btn.height + (target.y + target.height / 2 - btn.y - btn.height) * ratio;
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        ctx.setLineDash([]); // Reset dash state
      });

      // --- 4. Render Moving Platforms ---
      lvl.movingPlatforms.forEach(plat => {
        // High-end dark matte monolithic slab
        ctx.fillStyle = '#101116';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 2);
        ctx.fill();

        // 1px architectural outline highlight
        ctx.strokeStyle = plat.color || 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);

        // Sleek central energy indicator line
        const signals = [...lvl.pressurePlates, ...lvl.buttons].filter(s => s.targetId === plat.id);
        const isActive = plat.requiresSignal ? (signals.length > 0 && signals.every(s => s.isPressed)) : true;
        
        ctx.fillStyle = isActive ? plat.color || '#10b981' : '#272935';
        ctx.fillRect(plat.x + plat.width / 2 - 12, plat.y + plat.height / 2 - 1.5, 24, 3);
      });

      // --- 5. Render Doors ---
      lvl.doors.forEach(door => {
        // Recessed minimalist wall portal frames
        ctx.fillStyle = '#06070a';
        ctx.fillRect(door.x - 2, door.startY - 4, door.width + 4, 4); 
        
        // Solid matte-carbon sliding door slab
        const openHeight = door.height * (1 - door.openProgress);
        if (openHeight > 1) {
          ctx.fillStyle = '#0b0c10';
          ctx.beginPath();
          ctx.roundRect(door.x, door.y + (door.height - openHeight), door.width, openHeight, 1);
          ctx.fill();

          // Delicate aesthetic lines across sliding slabs
          ctx.strokeStyle = door.color || 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(door.x, door.y + (door.height - openHeight), door.width, openHeight);

          // Horizontal neon joint line at the bottom
          ctx.fillStyle = door.color || '#475569';
          ctx.fillRect(door.x + 3, door.y + door.height - 4, door.width - 6, 2);
        }
      });

      // --- 6. Render Keys and Lock Gates ---
      lvl.keys.forEach(key => {
        if (!key.isPickedUp) {
          // Soft floating hover animation
          const hoverOffset = Math.sin(Date.now() / 250) * 4;
          const keyY = key.y + hoverOffset;

          ctx.save();
          ctx.translate(key.x + key.width / 2, keyY + key.height / 2);
          ctx.rotate(Date.now() / 900);
          
          // Outer delicate spinning diamond halo
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -key.height * 0.7);
          ctx.lineTo(key.width * 0.7, 0);
          ctx.lineTo(0, key.height * 0.7);
          ctx.lineTo(-key.width * 0.7, 0);
          ctx.closePath();
          ctx.stroke();

          // Sharp glass gem core
          ctx.fillStyle = key.color || '#fbbf24';
          ctx.shadowColor = key.color || '#fbbf24';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(0, -key.height / 2);
          ctx.lineTo(key.width / 2, 0);
          ctx.lineTo(0, key.height / 2);
          ctx.lineTo(-key.width / 2, 0);
          ctx.closePath();
          ctx.fill();
          
          ctx.restore();
        }
      });

      lvl.locks.forEach(lock => {
        if (!lock.isOpen) {
          // Minimalist energy frame
          ctx.fillStyle = '#08090d';
          ctx.fillRect(lock.x - 1, lock.y, lock.width + 2, 6);
          ctx.fillRect(lock.x - 1, lock.y + lock.height - 6, lock.width + 2, 6);

          // Holographic vertical security laser threads
          ctx.strokeStyle = lock.color || '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = lock.color || '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(lock.x + lock.width / 2, lock.y + 6);
          ctx.lineTo(lock.x + lock.width / 2, lock.y + lock.height - 6);
          ctx.stroke();

          // Delicate scan threads
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
          ctx.lineWidth = 0.8;
          for (let gy = lock.y + 12; gy < lock.y + lock.height - 12; gy += 15) {
            ctx.beginPath();
            ctx.moveTo(lock.x + 2, gy);
            ctx.lineTo(lock.x + lock.width - 2, gy);
            ctx.stroke();
          }
          ctx.shadowBlur = 0; // reset
        }
      });

      // --- 7. Render Crates ---
      lvl.crates.forEach(crate => {
        // Premium minimal dark slate blocks
        ctx.fillStyle = '#14151a';
        ctx.fillRect(crate.x, crate.y, crate.width, crate.height);

        // Thin outer frame highlight
        ctx.strokeStyle = '#2d3142';
        ctx.lineWidth = 1;
        ctx.strokeRect(crate.x, crate.y, crate.width, crate.height);

        // Minimal neon central power node
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(crate.x + crate.width / 2 - 4, crate.y + crate.height / 2 - 4, 8, 8);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fillRect(crate.x + crate.width / 2 - 2, crate.y + crate.height / 2 - 2, 4, 4);
      });

      // --- 8. Render Level Exit Door (Mysterious monolith portal) ---
      const exit = lvl.exit;
      ctx.fillStyle = '#020204';
      ctx.fillRect(exit.x, exit.y, exit.width, exit.height);
      
      // Dynamic glowing portal rim
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.strokeRect(exit.x, exit.y, exit.width, exit.height);
      ctx.shadowBlur = 0;

      // Beautiful animated vertical energy streams climbing inside portal
      ctx.save();
      ctx.rect(exit.x + 1, exit.y + 1, exit.width - 2, exit.height - 2);
      ctx.clip();
      
      const portalShift = (Date.now() / 25) % 100;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const streamX = exit.x + 6 + i * 14;
        ctx.beginPath();
        ctx.moveTo(streamX, exit.y);
        ctx.lineTo(streamX, exit.y + exit.height);
        ctx.stroke();

        // Pulsing spark on energy streams
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        const sparkY = exit.y + exit.height - ((portalShift + i * 25) % exit.height);
        ctx.fillRect(streamX - 1.5, sparkY, 3, 5);
      }
      ctx.restore();

      // --- 9. Render Static Solids / Architectural Silhouettes (Limbo atmosphere) ---
      lvl.solids.forEach(solid => {
        // Deep matte concrete blocks
        const solidGrad = ctx.createLinearGradient(solid.x, solid.y, solid.x, solid.y + solid.height);
        solidGrad.addColorStop(0, '#101116');
        solidGrad.addColorStop(1, '#07080b');
        ctx.fillStyle = solidGrad;
        ctx.fillRect(solid.x, solid.y, solid.width, solid.height);
        
        // Exquisite floor surface edge lighting highlight
        if (solid.type === 'floor' || solid.type === 'ledge') {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.fillRect(solid.x, solid.y, solid.width, 1.5);
        }
        
        // Fine structural outline borders
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;
        ctx.strokeRect(solid.x, solid.y, solid.width, solid.height);
      });

      // --- 10. Render Ghosts / Echoes (Beautiful Holographic scans) ---
      echoesRef.current.forEach(echo => {
        const frame = echo.frames[activeFrameIndex];
        if (frame) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.shadowColor = echo.color;
          ctx.shadowBlur = 10;
          ctx.fillStyle = echo.color;

          // Solid neon silhouette
          ctx.beginPath();
          ctx.roundRect(frame.x, frame.y, player.width, player.height, 4);
          ctx.fill();

          // Glowing scanline layers across ghosts (holographic detailing)
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0; // reset blur for fine scanlines
          for (let sy = frame.y + 4; sy < frame.y + player.height; sy += 5) {
            ctx.beginPath();
            ctx.moveTo(frame.x + 1, sy);
            ctx.lineTo(frame.x + player.width - 1, sy);
            ctx.stroke();
          }

          // Minimal glowing mask eye slit
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.95;
          const eyeOffset = frame.facingLeft ? 2 : player.width - 6;
          ctx.fillRect(frame.x + eyeOffset, frame.y + 9, 4, 1.5);

          ctx.restore();
        }
      });

      // --- 11. Render Lasers ---
      lvl.lasers.forEach(laser => {
        let isFired = laser.isActive;

        // Signal evaluations
        if (laser.requiresSignal && laser.targetId) {
          const trigger = [
            ...lvl.pressurePlates.filter(p => p.id === laser.targetId),
            ...lvl.buttons.filter(b => b.id === laser.targetId)
          ].find(t => t.isPressed);

          const signalActive = !!trigger;
          isFired = laser.invertSignal ? !signalActive : signalActive;
        }

        if (isFired) {
          let beamX = laser.x;
          let beamY = laser.y;
          const rayStep = 4;
          const maxDist = 1200;
          let distTravelled = 0;
          let hitObject = false;

          while (distTravelled < maxDist && !hitObject) {
            beamX += laser.dx * rayStep;
            beamY += laser.dy * rayStep;
            distTravelled += rayStep;

            const rayPoint: Rect = { x: beamX, y: beamY, width: 2, height: 2 };

            if (checkSolidCollisions(rayPoint)) {
              hitObject = true;
            }

            for (const crate of lvl.crates) {
              if (checkAABB(rayPoint, crate)) hitObject = true;
            }
          }

          // Sleek industrial laser source mount
          ctx.fillStyle = '#101116';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(laser.x, laser.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Hyper-intense white core laser line
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(laser.x, laser.y);
          ctx.lineTo(beamX, beamY);
          ctx.stroke();

          // Sleek primary red beam aura
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(laser.x, laser.y);
          ctx.lineTo(beamX, beamY);
          ctx.stroke();

          ctx.shadowBlur = 0; // Reset shadow state
        }
      });

      // --- 12. Render Current Player Silhouette ---
      if (!player.isDead) {
        ctx.save();
        
        // Solid white/bone gradient body
        const playerGrad = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
        playerGrad.addColorStop(0, '#ffffff');
        playerGrad.addColorStop(1, '#d1d5db');
        ctx.fillStyle = playerGrad;
        
        ctx.beginPath();
        ctx.roundRect(player.x, player.y, player.width, player.height, 4);
        ctx.fill();

        // High-contrast clean dark face visor plate
        ctx.fillStyle = '#0a0a0d';
        const faceX = player.facingLeft ? player.x + 1 : player.x + player.width - 7;
        ctx.beginPath();
        ctx.roundRect(faceX, player.y + 6, 6, 10, 1);
        ctx.fill();

        // Elegant glowing active timeline eye slit
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 8;
        const eyeX = player.facingLeft ? player.x + 2 : player.x + player.width - 5;
        ctx.fillRect(eyeX, player.y + 9, 3, 1.5);
        
        ctx.restore();
      }

      // --- 13. Particle System Drawing ---
      particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * p.alpha;
        
        if (p.type === 'trail') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sharp minimal square sparks
          ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      });
      ctx.globalAlpha = 1.0;

      // --- 14. Camera Rewind Visual Flash Animation ---
      if (timeResetEffectRef.current.active) {
        const resetProgress = timeResetEffectRef.current.timer / timeResetEffectRef.current.duration;
        
        // Expanding geometric shockwave ring
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(timeResetEffectRef.current.x, timeResetEffectRef.current.y, resetProgress * lvl.width * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        // Pure cinematic white/desaturated flash overlays
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 0.65 - resetProgress * 0.65)})`;
        ctx.fillRect(0, 0, lvl.width, lvl.height);
      }

      ctx.restore();
    };

    // Main 60FPS Orchestration Loop
    const gameLoop = (timestamp: number) => {
      let delta = timestamp - lastTime;
      lastTime = timestamp;
      if (delta > 100) delta = 100; // prevent extreme frames skip

      accumulator += delta;
      while (accumulator >= timestep) {
        updatePhysics();
        accumulator -= timestep;
      }
      
      updateVisuals();
      renderFrame();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [currentLevelIndex, audioStarted, canvas]);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#040406] overflow-hidden rounded-xl border border-white/5 shadow-2xl">
      {/* Dynamic Header HUD bar */}
      <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-10 bg-gradient-to-b from-[#040406]/90 to-transparent pointer-events-none">
        <div className="flex flex-col items-start select-none pointer-events-auto">
          <span className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase">TIMELINE LOOP</span>
          <span className="text-base font-light font-sans tracking-widest text-zinc-100 uppercase flex items-center gap-1.5">
            <span className="text-zinc-600">/</span>{currentLevelIndex + 1} &mdash; {levelRef.current.name}
          </span>
        </div>

        {/* Dynamic Circular Timeline Progress Meter */}
        <div className="flex flex-col items-center pointer-events-auto select-none">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* SVG circle meter */}
            <svg className="absolute w-full h-full transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                className="stroke-zinc-900/60 fill-none"
                strokeWidth="1.5"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                className={`fill-none transition-all duration-75 ${
                  timeRemaining < 2.0 ? 'stroke-rose-500' : 'stroke-zinc-300'
                }`}
                strokeWidth="1.5"
                strokeDasharray="125"
                strokeDashoffset={125 - (timeRemaining / maxLoopTime) * 125}
              />
            </svg>
            <span className={`text-xs font-mono tracking-tighter ${
              timeRemaining < 2.0 ? 'text-rose-400 animate-pulse' : 'text-zinc-300'
            }`}>
              {timeRemaining.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Right side controls panel */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="p-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-zinc-400 hover:text-white transition-all pointer-events-auto"
            title="Toggle Procedural Synth"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={restartLevelFromScratch}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-zinc-400 hover:text-white transition-all font-mono text-[10px] cursor-pointer pointer-events-auto tracking-wider uppercase"
            title="Restart Level (R)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Element */}
      <div ref={containerRef} className="w-full flex-grow relative bg-[#040406]">
        <canvas ref={setCanvas} className="block w-full h-full cursor-crosshair" />

        {/* Ambient Overlay Vignette */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

        {/* Atmospheric Dark Overlay for Victory */}
        <AnimatePresence>
          {gameWon && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#040406]/95 backdrop-blur-md flex flex-col items-center justify-center text-center z-30 p-6"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1.0, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-md flex flex-col items-center"
              >
                <div className="w-12 h-12 bg-emerald-500/5 rounded-full flex items-center justify-center border border-emerald-500/20 mb-5 text-emerald-400">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-light text-white tracking-[0.25em] font-sans uppercase mb-2">Timeline Resolved</h3>
                <p className="text-zinc-400 font-mono text-xs mb-6 max-w-xs leading-relaxed">
                  The echoes synchronized perfectly. You made {activeEchoCount} copy copies of yourself to cross the barrier.
                </p>
                <div className="flex gap-3">
                  <UIButton
                    onClick={onLevelComplete}
                    className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-zinc-200 text-black text-xs font-mono uppercase tracking-[0.2em] rounded transition-all cursor-pointer"
                  >
                    <span>Proceed to Next Era</span>
                    <ArrowRight className="w-4 h-4" />
                  </UIButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intro Audio Activation Overlay (To satisfy browser autoplay limits gracefully) */}
        {!audioStarted && (
          <div className="absolute inset-0 bg-[#040406]/98 backdrop-blur-lg flex flex-col items-center justify-center z-40 p-6 text-center select-none">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1.0, opacity: 1 }}
              className="max-w-md flex flex-col items-center"
            >
              <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-6 text-zinc-400">
                <Layers className="w-6 h-6 animate-pulse" />
              </div>
              <h1 className="text-3xl font-extralight text-white tracking-[0.4em] uppercase mb-3">Time Echo</h1>
              <p className="text-zinc-400 font-sans text-xs mb-8 leading-relaxed max-w-sm font-light">
                An atmospheric puzzle adventure. Step on plates, push blocks, block lasers, and guide past selves to escape the temporal rift.
              </p>
              
              <button
                onClick={handleStartAudio}
                className="px-8 py-3.5 border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white font-mono tracking-[0.2em] font-light text-xs uppercase transition-all rounded cursor-pointer"
              >
                INITIALIZE TEMPORAL LOOP
              </button>

              <div className="mt-6 flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono tracking-wider uppercase">
                <span>Procedural Sound Synthesis System</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Minimal Bottom Instructions HUD */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-2.5 rounded bg-zinc-950/80 backdrop-blur-md border border-white/5 flex items-center gap-8 select-none pointer-events-none text-[10px] font-mono text-zinc-500 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 tracking-wider">ECHOES:</span>
            <span className="text-white font-bold font-mono text-xs">{activeEchoCount}</span>
          </div>
          <div className="h-3 w-[1px] bg-white/10" />
          <div className="hidden md:flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300">W,A,S,D</span>
            <span>Move / Jump</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300">Shift</span>
            <span>Sprint</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300">R</span>
            <span>Reset Timeline</span>
          </div>
        </div>

        {/* Level Objectives Hint Bar */}
        <AnimatePresence>
          {showTutorial && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-20 left-4 max-w-sm p-4 rounded bg-zinc-950/80 backdrop-blur-md border border-white/5 shadow-xl pointer-events-auto z-10"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-white/5 rounded border border-white/10 text-zinc-400">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <div className="flex-grow select-none">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-mono font-medium text-zinc-500 tracking-[0.15em] uppercase">LEVEL MISSION</span>
                    <button 
                      onClick={() => setShowTutorial(false)}
                      className="text-[9px] font-mono text-zinc-500 hover:text-white"
                    >
                      [DISMISS]
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-zinc-200 mb-1 leading-normal">
                    {levelRef.current.objective}
                  </p>
                  <p className="text-[10px] text-zinc-400 leading-normal italic font-light">
                    &ldquo;{levelRef.current.description}&rdquo;
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
