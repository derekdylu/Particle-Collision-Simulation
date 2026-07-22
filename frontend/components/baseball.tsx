'use client'

// pages/index.tsx
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
// @ts-expect-error - OrbitControls types are not included in @types/three
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const presets = [
  0.1,
  0.075,
  0.05,
  0.025,
  0,
  -0.025,
  -0.05,
]

const HomePage: React.FC<{
  positionIndex: number;
}> = ({ positionIndex }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [batHeight, setBatHeight] = useState(presets[positionIndex]);
  const targetPositionRef = useRef(presets[positionIndex]);
  const animationSpeed = 1; // units per second

  // Update target position when positionIndex changes
  useEffect(() => {
    targetPositionRef.current = presets[positionIndex];
  }, [positionIndex]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe0e0e0, 1, 12)

    // Add gradient background
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float time;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        float t = time * 0.2;

        // Create flowing gradient
        float r = sin(uv.x * 10.0 + t) * 0.5 + 0.5;
        float g = sin(uv.y * 8.0 + t * 1.2) * 0.5 + 0.5;
        float b = sin((uv.x + uv.y) * 6.0 + t * 0.8) * 0.5 + 0.5;

        // Soft pastel colors
        vec3 color = vec3(
          0.7 + r * 0.3,
          0.7 + g * 0.3,
          0.7 + b * 0.3
        );

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const gradientMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader,
      fragmentShader
    });

    // Create a render target for the gradient
    const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    // Create a scene and camera for rendering the gradient
    const gradientScene = new THREE.Scene();
    const gradientCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const gradientGeometry = new THREE.PlaneGeometry(2, 2);
    const gradientMesh = new THREE.Mesh(gradientGeometry, gradientMaterial);
    gradientScene.add(gradientMesh);

    // Set the gradient texture as the scene background
    scene.background = renderTarget.texture;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(-1.75, 0.75, 1.75);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // Orbit controls for manual adjustment
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableZoom = false; // Disable zooming
    controls.minPolarAngle = -Math.PI / 2; // -90 degrees in radians (vertical)
    controls.maxPolarAngle = 7 * Math.PI / 12; // 105 degrees in radians (vertical)
    controls.minAzimuthAngle = - 4 * Math.PI / 6; // -120 degrees in radians (horizontal)
    controls.maxAzimuthAngle = Math.PI / 6; // 30 degrees in radians (horizontal)
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: 0 // Disable two-finger touch interactions
    };
    controls.update();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const light2 = new THREE.PointLight(0xffffff, 0.8)
    light2.position.set(1, 1, 1)
    scene.add(light2)

    const light = new THREE.PointLight(0xffffff, 0.8)
    light.position.set(0, 1, 0)
    scene.add(light)
    light.castShadow = true
    light.shadow.mapSize.width = 4096
    light.shadow.mapSize.height = 4096
    light.shadow.camera.near = 0.1
    light.shadow.camera.far = 30

    // Add an additional light focused on the bat and ball area
    const focusLight = new THREE.SpotLight(0xffffff, 1.0)
    focusLight.position.set(0, 2, 0)
    focusLight.angle = Math.PI / 4
    focusLight.penumbra = 0.2
    focusLight.decay = 1
    focusLight.distance = 10
    focusLight.target.position.set(0, 0, 0)
    scene.add(focusLight)
    scene.add(focusLight.target)

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Bat
    const batLength = 1.5;
    // Handle section
    const handleLength = 0.6;
    const handleRadius = 0.02;
    const handleGeom = new THREE.CylinderGeometry(handleRadius, handleRadius, handleLength, 12);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x202020 });
    const handle = new THREE.Mesh(handleGeom, handleMat);
    handle.position.y = -batLength / 2 + handleLength / 2;
    // Barrel section
    const barrelLength = batLength - handleLength;
    const barrelStartRadius = handleRadius;
    const barrelEndRadius = 0.06;
    const barrelGeom = new THREE.CylinderGeometry(barrelEndRadius, barrelStartRadius, barrelLength, 12);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.5, metalness: 0.5 });
    const barrel = new THREE.Mesh(barrelGeom, barrelMat);
    barrel.position.y = -batLength / 2 + handleLength + barrelLength / 2;

    // Combine handle and barrel
    const bat = new THREE.Group();
    bat.add(handle);
    bat.add(barrel);
    bat.rotation.z = Math.PI / 2;
    bat.position.set(2 * batLength / 3, 0, 0);

    const batPivot = new THREE.Group();
    batPivot.position.set(-batLength / 2 + 0.2, batHeight, 0);
    batPivot.add(bat);
    scene.add(batPivot);

    // Ball
    const ballGeom = new THREE.SphereGeometry(0.16, 16, 16);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xFFBB00 });
    const ball = new THREE.Mesh(ballGeom, ballMat);
    ball.position.set(-0.1, 0.07, -0.25);
    scene.add(ball);

    // Add grid helper
    const gridHelperBottom = new THREE.GridHelper(4, 10, 0xB0B0B0, 0xB0B0B0);
    gridHelperBottom.position.set(0, -1, 0);
    gridHelperBottom.material.opacity = 0.5;
    gridHelperBottom.material.transparent = true;

    const gridHelperBack = new THREE.GridHelper(4, 10, 0xB0B0B0, 0xB0B0B0);
    gridHelperBack.rotation.z = Math.PI / 2;
    gridHelperBack.position.set(2, 1, 0);
    gridHelperBack.material.opacity = 0.5;
    gridHelperBack.material.transparent = true;

    const gridHelperSide = new THREE.GridHelper(4, 10, 0xB0B0B0, 0xB0B0B0);
    gridHelperSide.rotation.x = Math.PI / 2;
    gridHelperSide.position.set(0, 1, -2);
    gridHelperSide.material.opacity = 0.5;
    gridHelperSide.material.transparent = true;

    scene.add(gridHelperBottom, gridHelperBack, gridHelperSide);

    // Add plane
    const geoPlane = new THREE.CircleGeometry(8, 32)
    const mat3 = new THREE.MeshStandardMaterial({ color: 0x00FFFF })
    const plane = new THREE.Mesh(geoPlane, mat3)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -2
    plane.receiveShadow = true
    scene.add(plane)

    // Animation variables
    const clock = new THREE.Clock();

    // Handle resize
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      controls.update();
    };
    window.addEventListener('resize', onResize);

    // Static render with controls
    const render = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Update gradient time uniform
      gradientMaterial.uniforms.time.value = elapsedTime;

      // Render gradient to texture
      renderer.setRenderTarget(renderTarget);
      renderer.render(gradientScene, gradientCamera);
      renderer.setRenderTarget(null);

      // Animate bat to target position
      const currentY = batPivot.position.y;
      const targetY = targetPositionRef.current;
      const distance = targetY - currentY;

      if (Math.abs(distance) > 0.01) {
        const moveAmount = Math.sign(distance) * Math.min(Math.abs(distance), animationSpeed * delta);
        batPivot.position.y += moveAmount;
        setBatHeight(batPivot.position.y);
      }

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    render();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: 'absolute', width: '100%', height: '100vh', top: 0, left: 0 }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default HomePage;
