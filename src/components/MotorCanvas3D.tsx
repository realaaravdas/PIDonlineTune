import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MechanismType } from '../types/simulation';

interface MotorCanvas3DProps {
  angle: number; // current shaft angle in radians
  targetAngle: number; // target setpoint in radians
  velocity: number; // rad/s
  voltage: number; // control output Volts
  currentAmp: number;
  torque: number;
  mechanism: MechanismType;
  impulseActive: boolean;
  onApplyDisturbance: (torque: number) => void;
  onSetTargetAngle?: (angle: number) => void;
}

export const MotorCanvas3D: React.FC<MotorCanvas3DProps> = ({
  angle,
  targetAngle,
  velocity,
  voltage,
  currentAmp,
  torque,
  mechanism,
  impulseActive,
  onApplyDisturbance,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Dynamic 3D meshes references
  const shaftGroupRef = useRef<THREE.Group | null>(null);
  const targetIndicatorRef = useRef<THREE.Group | null>(null);
  const armMeshRef = useRef<THREE.Group | null>(null);
  const flywheelMeshRef = useRef<THREE.Group | null>(null);
  const wheelMeshRef = useRef<THREE.Group | null>(null);
  const linearCarriageRef = useRef<THREE.Group | null>(null);
  const encoderLedRef = useRef<THREE.Mesh | null>(null);
  const coilGlowLightRef = useRef<THREE.PointLight | null>(null);
  const shockwaveRef = useRef<THREE.Mesh | null>(null);

  // Mouse interaction state for orbital rotation
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 5, distance: 3.2 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0b1120); // deep slate #0b1120
    scene.fog = new THREE.FogExp2(0x0b1120, 0.15);

    // 2. Camera setup
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Lighting
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.7);
    scene.add(ambientLight);

    // Key Light (Warm directional)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(4, 5, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Fill Light (Cool cyan accent)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-4, 3, -3);
    scene.add(fillLight);

    // Rim Light (Sharp highlight from rear)
    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.6);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    // Coil internal glow
    const coilLight = new THREE.PointLight(0x06b6d4, 0, 1.5);
    coilLight.position.set(0, 0, 0);
    scene.add(coilLight);
    coilGlowLightRef.current = coilLight;

    // 5. Workbench Ground & Grid
    const benchMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.2,
    });
    const benchGeometry = new THREE.BoxGeometry(6, 0.2, 4);
    const bench = new THREE.Mesh(benchGeometry, benchMaterial);
    bench.position.set(0, -0.65, 0);
    bench.receiveShadow = true;
    scene.add(bench);

    // Optical Grid lines on bench
    const grid = new THREE.GridHelper(5, 20, 0x334155, 0x1e293b);
    grid.position.set(0, -0.54, 0);
    scene.add(grid);

    // 6. Motor Static Assembly
    const motorGroup = new THREE.Group();
    scene.add(motorGroup);

    // Motor Stator Chassis (Anodized Dark Aluminum with Cooling Fins)
    const statorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.35,
    });
    const statorGeom = new THREE.CylinderGeometry(0.42, 0.42, 0.9, 32);
    statorGeom.rotateX(Math.PI / 2);
    const stator = new THREE.Mesh(statorGeom, statorMat);
    stator.castShadow = true;
    stator.receiveShadow = true;
    motorGroup.add(stator);

    // Cooling Fins (Heatsink ribs)
    const finMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.4 });
    for (let f = -0.3; f <= 0.3; f += 0.12) {
      const finGeom = new THREE.CylinderGeometry(0.46, 0.46, 0.02, 32);
      finGeom.rotateX(Math.PI / 2);
      const fin = new THREE.Mesh(finGeom, finMat);
      fin.position.z = f;
      motorGroup.add(fin);
    }

    // Front Flange (Machined mounting plate)
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const flangeGeom = new THREE.BoxGeometry(1.0, 1.0, 0.08);
    const flange = new THREE.Mesh(flangeGeom, flangeMat);
    flange.position.set(0, 0, 0.45);
    flange.castShadow = true;
    motorGroup.add(flange);

    // Mounting Bracket Stand attaching to bench
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.5 });
    const bracketGeom = new THREE.BoxGeometry(0.6, 0.4, 0.7);
    const bracket = new THREE.Mesh(bracketGeom, bracketMat);
    bracket.position.set(0, -0.35, 0.0);
    bracket.castShadow = true;
    motorGroup.add(bracket);

    // Rear Optical Encoder Housing
    const encoderMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.5, roughness: 0.3 });
    const encoderGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.3, 24);
    encoderGeom.rotateX(Math.PI / 2);
    const encoderHousing = new THREE.Mesh(encoderGeom, encoderMat);
    encoderHousing.position.set(0, 0, -0.55);
    motorGroup.add(encoderHousing);

    // Encoder Optocoupler LED indicator
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const ledGeom = new THREE.SphereGeometry(0.04, 16, 16);
    const encoderLed = new THREE.Mesh(ledGeom, ledMat);
    encoderLed.position.set(0.18, 0.18, -0.65);
    motorGroup.add(encoderLed);
    encoderLedRef.current = encoderLed;

    // Power Cable Terminals
    const cablePosMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const cableNegMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.5 });
    const termPos = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 12), cablePosMat);
    termPos.position.set(-0.25, 0.45, -0.2);
    const termNeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 12), cableNegMat);
    termNeg.position.set(0.25, 0.45, -0.2);
    motorGroup.add(termPos);
    motorGroup.add(termNeg);

    // 7. Rotating Shaft Assembly (Rotates dynamically with motor.angle)
    const shaftGroup = new THREE.Group();
    scene.add(shaftGroup);
    shaftGroupRef.current = shaftGroup;

    // Center Steel Shaft
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const shaftGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 24);
    shaftGeom.rotateX(Math.PI / 2);
    const shaft = new THREE.Mesh(shaftGeom, shaftMat);
    shaft.position.set(0, 0, 0.4);
    shaft.castShadow = true;
    shaftGroup.add(shaft);

    // Shaft Keyway marker (to make rotation immediately visible)
    const keywayMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const keywayGeom = new THREE.BoxGeometry(0.03, 0.05, 0.4);
    const keyway = new THREE.Mesh(keywayGeom, keywayMat);
    keyway.position.set(0, 0.07, 0.8);
    shaftGroup.add(keyway);

    // 8. Swappable Mechanism Meshes attached to Shaft

    // Mechanism A: Robotic Joint Arm
    const armGroup = new THREE.Group();
    shaftGroup.add(armGroup);
    armMeshRef.current = armGroup;

    // Arm Hub Collar
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 24), hubMat);
    hub.rotateX(Math.PI / 2);
    hub.position.set(0, 0, 0.85);
    armGroup.add(hub);

    // Carbon fiber arm beam
    const armMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.2 });
    const armBeam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 0.06), armMat);
    // Pivot at base: center is at y = 0.375
    armBeam.position.set(0, 0.375, 0.88);
    armBeam.castShadow = true;
    armGroup.add(armBeam);

    // Accent line along arm
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.7, 0.065), stripeMat);
    stripe.position.set(0, 0.375, 0.88);
    armGroup.add(stripe);

    // End-Effector Payload Gripper
    const endEffectorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const endEffector = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.12), endEffectorMat);
    endEffector.position.set(0, 0.75, 0.88);
    endEffector.castShadow = true;
    armGroup.add(endEffector);

    // Gripper fingers
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const finger1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.04), fingerMat);
    finger1.position.set(-0.06, 0.86, 0.88);
    const finger2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.04), fingerMat);
    finger2.position.set(0.06, 0.86, 0.88);
    armGroup.add(finger1);
    armGroup.add(finger2);

    // Mechanism B: Flywheel / Inertia Wheel
    const flywheelGroup = new THREE.Group();
    shaftGroup.add(flywheelGroup);
    flywheelMeshRef.current = flywheelGroup;

    const flywheelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.92, roughness: 0.15 });
    const flywheelDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.08, 48), flywheelMat);
    flywheelDisc.rotateX(Math.PI / 2);
    flywheelDisc.position.set(0, 0, 0.85);
    flywheelDisc.castShadow = true;
    flywheelGroup.add(flywheelDisc);

    // Strobe markings (radial notches on perimeter)
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 12; i++) {
      const theta = (i * Math.PI * 2) / 12;
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.085), strobeMat);
      notch.position.set(Math.cos(theta) * 0.58, Math.sin(theta) * 0.58, 0.85);
      notch.rotation.z = theta;
      flywheelGroup.add(notch);
    }

    // Mechanism C: Mobile Robot Drive Wheel
    const wheelGroup = new THREE.Group();
    shaftGroup.add(wheelGroup);
    wheelMeshRef.current = wheelGroup;

    // Rubber Tire
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9, metalness: 0.1 });
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 16, 48), tireMat);
    tire.position.set(0, 0, 0.85);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim Spoke Hub
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.2 });
    const rimCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.1, 24), rimMat);
    rimCenter.rotateX(Math.PI / 2);
    rimCenter.position.set(0, 0, 0.85);
    wheelGroup.add(rimCenter);

    for (let s = 0; s < 5; s++) {
      const spokeAngle = (s * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.05), rimMat);
      spoke.position.set(Math.cos(spokeAngle) * 0.25, Math.sin(spokeAngle) * 0.25, 0.85);
      spoke.rotation.z = spokeAngle;
      wheelGroup.add(spoke);
    }

    // Mechanism D: Linear Carriage / Rack & Pinion
    const linearGroup = new THREE.Group();
    scene.add(linearGroup);
    linearCarriageRef.current = linearGroup;

    // Guide Rails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const railUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 16), railMat);
    railUpper.rotateZ(Math.PI / 2);
    railUpper.position.set(0, 0.3, 0.95);
    const railLower = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 16), railMat);
    railLower.rotateZ(Math.PI / 2);
    railLower.position.set(0, -0.3, 0.95);
    linearGroup.add(railUpper);
    linearGroup.add(railLower);

    // Sliding carriage body
    const carriageMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 });
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.08), carriageMat);
    carriage.position.set(0, 0, 0.95);
    carriage.name = 'carriageBody';
    linearGroup.add(carriage);

    // 9. Target Setpoint Holographic Visualizer (Laser ring & needle)
    const targetGroup = new THREE.Group();
    scene.add(targetGroup);
    targetIndicatorRef.current = targetGroup;

    // Glowing target marker
    const targetMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.85 });
    const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.84, 48), targetMat);
    targetRing.position.set(0, 0, 0.88);
    targetGroup.add(targetRing);

    // Target needle pointer
    const targetNeedleMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const targetNeedle = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 12), targetNeedleMat);
    targetNeedle.position.set(0, 0.85, 0.88);
    targetNeedle.rotateZ(Math.PI);
    targetGroup.add(targetNeedle);

    // 10. Disturbance Shockwave Ring (expands when impact applied)
    const shockwaveMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0 });
    const shockwave = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.35, 32), shockwaveMat);
    shockwave.position.set(0, 0, 0.9);
    scene.add(shockwave);
    shockwaveRef.current = shockwave;

    // Mouse orbital control handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMousePosRef.current.x;
      const dy = e.clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };

      cameraAngleRef.current.theta -= dx * 0.008;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraAngleRef.current.phi - dy * 0.008));
      updateCameraPosition();
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.distance = Math.max(1.8, Math.min(6.0, cameraAngleRef.current.distance + e.deltaY * 0.003));
      updateCameraPosition();
    };

    const canvasElem = renderer.domElement;
    canvasElem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvasElem.addEventListener('wheel', handleWheel, { passive: false });

    // Handle container resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation render loop
    let animationFrameId: number;
    let shockwaveScale = 1;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Animate shockwave if triggered
      if (shockwaveRef.current) {
        if (shockwaveMat.opacity > 0.01) {
          shockwaveScale += 0.08;
          shockwaveRef.current.scale.set(shockwaveScale, shockwaveScale, 1);
          shockwaveMat.opacity *= 0.88;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvasElem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvasElem.removeEventListener('wheel', handleWheel);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, distance } = cameraAngleRef.current;
    cameraRef.current.position.x = distance * Math.sin(phi) * Math.sin(theta);
    cameraRef.current.position.y = distance * Math.cos(phi);
    cameraRef.current.position.z = distance * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.lookAt(0, 0, 0.4);
  };

  // Sync physics state with 3D scene every frame
  useEffect(() => {
    // 1. Rotate motor shaft to physics angle
    if (shaftGroupRef.current) {
      shaftGroupRef.current.rotation.z = angle;
    }

    // 2. Rotate target indicator to setpoint angle
    if (targetIndicatorRef.current) {
      targetIndicatorRef.current.rotation.z = targetAngle;
    }

    // 3. Switch visible mechanism
    if (armMeshRef.current) armMeshRef.current.visible = mechanism === 'arm';
    if (flywheelMeshRef.current) flywheelMeshRef.current.visible = mechanism === 'flywheel';
    if (wheelMeshRef.current) wheelMeshRef.current.visible = mechanism === 'wheel';
    if (linearCarriageRef.current) {
      linearCarriageRef.current.visible = mechanism === 'linear';
      // If linear, translate carriage based on angle
      const carriageBody = linearCarriageRef.current.getObjectByName('carriageBody');
      if (carriageBody) {
        const pinionRadius = 0.04;
        const xPos = Math.max(-0.7, Math.min(0.7, angle * pinionRadius));
        carriageBody.position.x = xPos;
      }
    }

    // 4. Stator coil glow based on applied voltage & current
    if (coilGlowLightRef.current) {
      const intensity = Math.min(3.0, (Math.abs(voltage) / 12.0) * 2.5);
      coilGlowLightRef.current.intensity = intensity;
      // Blue for positive voltage, amber/red for negative reverse voltage
      coilGlowLightRef.current.color.setHex(voltage >= 0 ? 0x06b6d4 : 0xf97316);
    }

    // 5. Encoder optical pulse blink
    if (encoderLedRef.current) {
      // Blink LED every ~10 radians of rotation
      const pulse = Math.sin(angle * 20) > 0;
      (encoderLedRef.current.material as THREE.MeshBasicMaterial).color.setHex(pulse ? 0x22c55e : 0x065f46);
    }
  }, [angle, targetAngle, velocity, voltage, currentAmp, mechanism]);

  // Trigger visual shockwave on disturbance hit
  useEffect(() => {
    if (impulseActive && shockwaveRef.current) {
      (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = 0.95;
      shockwaveRef.current.scale.set(1, 1, 1);
    }
  }, [impulseActive]);

  const setCameraPreset = (preset: 'iso' | 'front' | 'top') => {
    if (preset === 'iso') {
      cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 5, distance: 3.2 };
    } else if (preset === 'front') {
      cameraAngleRef.current = { theta: 0, phi: Math.PI / 2 - 0.05, distance: 2.8 };
    } else if (preset === 'top') {
      cameraAngleRef.current = { theta: 0, phi: 0.05, distance: 3.5 };
    }
    updateCameraPosition();
  };

  const angleDeg = ((angle * 180) / Math.PI) % 360;
  const targetDeg = ((targetAngle * 180) / Math.PI) % 360;
  const rpm = (velocity * 60) / (2 * Math.PI);

  return (
    <div className="relative w-full h-full min-h-[360px] bg-slate-950 overflow-hidden select-none rounded-xl border border-slate-800">
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD: Real-time Motor State */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/60 shadow-lg flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Position</span>
            <span className="text-cyan-400 font-semibold tabular-nums">
              {angleDeg.toFixed(1)}° <span className="text-slate-500">({angle.toFixed(2)} rad)</span>
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Target</span>
            <span className="text-emerald-400 font-semibold tabular-nums">
              {targetDeg.toFixed(1)}° <span className="text-slate-500">({targetAngle.toFixed(2)} rad)</span>
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Speed</span>
            <span className="text-amber-400 font-semibold tabular-nums">
              {rpm.toFixed(0)} <span className="text-slate-500">RPM</span>
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Applied V</span>
            <span className={`font-semibold tabular-nums ${voltage >= 0 ? 'text-sky-400' : 'text-orange-400'}`}>
              {voltage.toFixed(2)} V
            </span>
          </div>
        </div>
      </div>

      {/* Floating Camera & Disturbance Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {/* Camera Views */}
        <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700/60">
          <button
            onClick={() => setCameraPreset('iso')}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Isometric 3D View"
          >
            Iso
          </button>
          <button
            onClick={() => setCameraPreset('front')}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Front Shaft View"
          >
            Front
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Top View"
          >
            Top
          </button>
        </div>

        {/* Disturbance Hammer Action */}
        <button
          onClick={() => onApplyDisturbance(0.25)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600/90 hover:bg-red-500 text-white rounded-lg shadow-md transition-all active:scale-95"
          title="Inject torque disturbance shock to test PID stiffness"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          Shock Motor
        </button>
      </div>

      {/* Orbit Navigation Hint */}
      <div className="absolute bottom-2 left-3 text-[11px] text-slate-500 pointer-events-none">
        Drag to Orbit · Scroll to Zoom
      </div>

      {/* Mechanism Active Badge */}
      <div className="absolute bottom-2 right-3 text-[11px] font-mono text-slate-400 bg-slate-900/70 px-2 py-0.5 rounded border border-slate-800">
        Load: <span className="text-cyan-400 capitalize">{mechanism}</span>
      </div>
    </div>
  );
};
