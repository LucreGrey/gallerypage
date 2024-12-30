import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { gsap } from 'gsap';

// Constants
const GOLDENRATIO = 1.61803398875;

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#fefefe');
//scene.fog = new THREE.Fog('#191920', 0, 30);

// Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera Setup
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
const originalCameraPosition = new THREE.Vector3(0, .5, 8);
camera.position.copy(originalCameraPosition);
const originalCameraTarget = new THREE.Vector3(0, 0, 0);

// Raycaster for object selection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;

// Add Reflective Floor
const floorGeometry = new THREE.PlaneGeometry(50, 50);
const floorReflector = new Reflector(floorGeometry, {
  clipBias: 0.003,
  textureWidth: window.innerWidth * window.devicePixelRatio,
  textureHeight: window.innerHeight * window.devicePixelRatio,
  //color: 0xffffff,
  useDepthTexture: true,
});
floorReflector.rotation.x = -Math.PI / 2;
floorReflector.position.y = -1;
scene.add(floorReflector);


// Add Environment Light
const environmentLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
environmentLight.position.set(0, 20, 0);
scene.add(environmentLight);

// Frames Function
const framesGroup = new THREE.Group();
scene.add(framesGroup);

// Function to Add Hover Animation to a Group
const animateHover = (group) => {
  const duration = THREE.MathUtils.randFloat(10, 15); // Random duration between 2 and 5 seconds
  const offset = group.position.y; // Start position
  gsap.to(group.position, {
    y: offset + 0.2,
    duration: duration / 2, // Half the duration for one direction
    ease: "power1.inOut",
    yoyo: true,
    repeat: -1, // Infinite repeat
    onRepeat: () => {
      // Alternate between going up and down
      group.position.y = offset - 0.2;
    },
  });
};

// Frames Function with Animation
const addFrame = (position, rotation, url) => {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.set(...rotation);

  // Frame
  const frameGeometry = new THREE.BoxGeometry(1, GOLDENRATIO * 1.2, 0.05); // Taller frames
  const frameMaterial = new THREE.MeshStandardMaterial({ color: '#000000', metalness: 0.5, roughness: 0 });
  const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
  group.add(frameMesh);

  // Image
  const textureLoader = new THREE.TextureLoader();
  const imageTexture = textureLoader.load(url);
  const imageGeometry = new THREE.PlaneGeometry(0.9, GOLDENRATIO * 1.15); // Taller images
  const imageMaterial = new THREE.MeshBasicMaterial({ map: imageTexture });
  const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
  imageMesh.position.set(0, 0, 0.03);
  group.add(imageMesh);

  // Add animation to the group
  animateHover(group);

  framesGroup.add(group);
};

// Add Images
const pexel = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260`;
// Adjusted Positions for Spread Out Pexels
const images = [
  { position: [0, .25, 2], rotation: [0, 0, 0], url: pexel(1103970) }, // Slightly forward
  { position: [-1.2, 4, -1], rotation: [0, 0.4, 0], url: pexel(416430) }, // Slightly left
  { position: [1.2, 2.5, -1], rotation: [0, -0.4, 0], url: pexel(310452) }, // Slightly right
  { position: [-2.5, 1.7, 0.4], rotation: [0, Math.PI / 2.5, 0], url: pexel(327482) }, // Left
  { position: [-3, .4, 1.7], rotation: [0, Math.PI / 2.5, 0], url: pexel(325185) }, // Left diagonal
  { position: [-2.8, 2.2, 3.5], rotation: [0, Math.PI / 2.5, 0], url: pexel(358574) }, // Left far
  { position: [2.5, .7, 0.4], rotation: [0, -Math.PI / 2.5, 0], url: pexel(227675) }, // Right
  { position: [3, 3, 1.7], rotation: [0, -Math.PI / 2.5, 0], url: pexel(911738) }, // Right diagonal
  { position: [2.8, 1.3, 3.5], rotation: [0, -Math.PI / 2.5, 0], url: pexel(1738986) }, // Right far
];

// Add Images
images.forEach(({ position, rotation, url }) => addFrame(position, rotation, url));

// Animation Loop
const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

animate();

const handleMouseClick = (event) => {
  // Convert mouse coordinates to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update raycaster with camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Intersect objects within the frames group
  const meshes = [];
  framesGroup.traverse((child) => {
    if (child.isMesh) meshes.push(child); // Add only mesh objects to be intersected
  });

  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    // Get the parent group of the intersected mesh
    selectedObject = intersects[0].object.parent;
    const targetPosition = new THREE.Vector3();
    const targetQuaternion = new THREE.Quaternion();
    selectedObject.getWorldPosition(targetPosition);
    selectedObject.getWorldQuaternion(targetQuaternion);

    // Calculate the camera position in front of the frame
    const offsetDistance = 2; // Distance in front of the frame
    const cameraOffset = new THREE.Vector3(0, 0, offsetDistance); // Local offset along Z-axis
    cameraOffset.applyQuaternion(targetQuaternion); // Rotate offset to match the frame's orientation
    const finalCameraPosition = targetPosition.clone().add(cameraOffset);

    // Animate camera to move and rotate towards the object
    gsap.to(camera.position, {
      x: finalCameraPosition.x,
      y: finalCameraPosition.y,
      z: finalCameraPosition.z,
      duration: 1.5,
      ease: 'power2.out',
    });
    gsap.to(camera.quaternion, {
      x: targetQuaternion.x,
      y: targetQuaternion.y,
      z: targetQuaternion.z,
      w: targetQuaternion.w,
      duration: 1.5,
      ease: 'power2.out',
    });
  } else {
    // No objects intersected; reset to original position and orientation
    selectedObject = null;
    gsap.to(camera.position, {
      x: originalCameraPosition.x,
      y: originalCameraPosition.y,
      z: originalCameraPosition.z,
      duration: 1.5,
      ease: 'power2.out',
    });
    gsap.to(camera.quaternion, {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
      duration: 1.5,
      ease: 'power2.out',
    });
  }
};


// Add Event Listener
window.addEventListener('click', handleMouseClick);


// Handle Resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
