import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const UrbanizationModel = ({ color = '#9ca3af' }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const animFrameRef = useRef(null);
  const modelRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Update material color if the prop changes after load
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.color.set(color);
        }
      });
    }
  }, [color]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth;
    const H = el.clientHeight;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    // Tone mapping to make GLTF materials look better
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Fixed deprecation warning
    el.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ── Camera (isometric) ──
    const aspect = W / H;
    const frustum = 3.8; // Reduced frustum to zoom in / make it larger
    const camera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect,
      frustum, -frustum,
      0.1, 1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    // ── Lights ──
    const ambient = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 3.0);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    scene.add(sun);

    // ── Load Model ──
    const loader = new GLTFLoader();
    loader.setPath('/models/padel_court/');
    loader.load(
      'scene.gltf',
      (gltf) => {
        const model = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Create a wrapper group to handle scaling and centering independently
        const wrapper = new THREE.Group();
        scene.add(wrapper);
        wrapper.add(model);

        // Center the model inside the wrapper
        model.position.set(-center.x, -center.y, -center.z);

        // Scale the wrapper to fit our 8-unit target size
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const targetSize = 8;
          const scale = targetSize / maxDim;
          wrapper.scale.setScalar(scale);
        }

        // Make it a uniform grey clay render
        const clayMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color), 
          roughness: 0.85,
          metalness: 0.1
        });

        // Enable shadows and replace materials
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.material = clayMaterial;
          }
        });

        modelRef.current = wrapper;
        setLoading(false);
      },
      undefined,
      (error) => {
        console.error('Error loading GLTF model:', error);
        setLoading(false);
      }
    );

    // ── Static Render ──
    // Set a static, identical isometric angle for all cards
    const angle = -(Math.PI / 4); 
    const r = 15;
    camera.position.set(Math.sin(angle) * r, 12, Math.cos(angle) * r);
    camera.lookAt(0, 0, 0);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!el) return;
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      const newAspect = nw / nh;
      camera.left = -frustum * newAspect;
      camera.right = frustum * newAspect;
      camera.top = frustum;
      camera.bottom = -frustum;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', 
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--clr-green)', fontWeight: 'bold'
        }}>
          Cargando modelo...
        </div>
      )}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', opacity: loading ? 0 : 1, transition: 'opacity 0.5s ease' }}
      />
    </div>
  );
};

export default UrbanizationModel;
