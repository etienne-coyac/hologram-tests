import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

function main() {
  const canvas = document.querySelector("#c");
  const view1Elem = document.querySelector("#view1");
  const view2Elem = document.querySelector("#view2");
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });

  const fov = 60;
  const aspect = 2; // the canvas default
  const near = 10;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  const workWidth = window.innerWidth / 2;
  const workHeight = window.innerHeight;
  const simulatedWidth = workWidth;
  const simulatedHeight = workHeight;

  const cameraHelper = new THREE.CameraHelper(camera);

  function farPlaneCenterFromViewOffset(
    camera: THREE.PerspectiveCamera,
  ): THREE.Vector3 {
    if (!camera.view) {
      throw new Error(
        "camera.view is not set — call camera.setViewOffset(...) first",
      );
    }

    const { fullWidth, fullHeight, offsetX, offsetY, width, height } =
      camera.view;

    // vertical FOV in radians
    const fovRad = (camera.fov * Math.PI) / 180;

    // full frustum size at the far plane (world units)
    const fullHeightAtFar = 2 * Math.tan(fovRad / 2) * camera.far;
    const fullWidthAtFar = fullHeightAtFar * (fullWidth / fullHeight);

    // center of the subview in pixel coords (origin = top-left as used by setViewOffset)
    const cx = offsetX + width * 0.5;
    const cy = offsetY + height * 0.5;

    // normalized offsets: [-0.5, 0.5] (x), [0.5, -0.5] (y) because screen Y is top->down
    const nx = cx / fullWidth - 0.5;
    const ny = 0.5 - cy / fullHeight;

    // camera-space coordinates of that center point on the far plane
    const xCam = nx * fullWidthAtFar;
    const yCam = ny * fullHeightAtFar;
    const zCam = -camera.far; // camera looks down -Z in camera space

    // transform to world space
    const centerWorld = new THREE.Vector3(xCam, yCam, zCam).applyMatrix4(
      camera.matrixWorld,
    );

    return centerWorld;
  }

  class MinMaxGUIHelper {
    constructor(obj, minProp, maxProp, minDif) {
      this.obj = obj;
      this.minProp = minProp;
      this.maxProp = maxProp;
      this.minDif = minDif;
    }
    get min() {
      return this.obj[this.minProp];
    }
    set min(v) {
      this.obj[this.minProp] = v;
      this.obj[this.maxProp] = Math.max(
        this.obj[this.maxProp],
        v + this.minDif,
      );
    }
    get max() {
      return this.obj[this.maxProp];
    }
    set max(v) {
      this.obj[this.maxProp] = v;
      this.min = this.min; // this will call the min setter
    }
  }

  const gui = new GUI();
  gui.add(camera, "fov", 1, 180);
  const minMaxGUIHelper = new MinMaxGUIHelper(camera, "near", "far", 0.1);
  gui.add(minMaxGUIHelper, "min", 0.1, 50, 0.1).name("near");
  gui.add(minMaxGUIHelper, "max", 0.1, 50, 0.1).name("far");

  // const controls = new OrbitControls(camera, view1Elem);
  // const controls = new OrbitControls(camera, view1Elem);
  const distance = -0.5;
  // const test = farPlaneCenterFromViewOffset(camera).multiply(
  //   new THREE.Vector3(distance, distance, distance),
  // );
  // console.log(test);
  // controls.target.set(test.x, test.y, test.z);

  // controls.update();

  const camera2 = new THREE.PerspectiveCamera(
    60, // fov
    2, // aspect
    0.1, // near
    1000, // far
  );
  camera2.position.set(0, 0, 40);
  camera2.lookAt(0, 0, 0);

  const controls2 = new OrbitControls(camera2, view2Elem);
  controls2.target.set(0, 5, 0);
  controls2.update();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("black");
  scene.add(cameraHelper);

  {
    const planeSize = 400;

    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      "https://threejs.org/manual/examples/resources/images/checker.png",
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5;
    scene.add(mesh);
  }

  {
    const cubeSize = 4;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshPhongMaterial({ color: "#8AC" });
    const mesh = new THREE.Mesh(cubeGeo, cubeMat);
    mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
    scene.add(mesh);
  }

  {
    const sphereRadius = 3;
    const sphereWidthDivisions = 32;
    const sphereHeightDivisions = 16;
    const sphereGeo = new THREE.SphereGeometry(
      sphereRadius,
      sphereWidthDivisions,
      sphereHeightDivisions,
    );
    const sphereMat = new THREE.MeshPhongMaterial({ color: "#CA8" });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
    scene.add(mesh);
  }

  {
    const color = 0xffffff;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 10, 0);
    light.target.position.set(-1, 0, -5);
    scene.add(light);
    scene.add(light.target);
  }

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  function setScissorForElement(elem) {
    const canvasRect = canvas.getBoundingClientRect();
    const elemRect = elem.getBoundingClientRect();

    // compute a canvas relative rectangle
    const right = Math.min(elemRect.right, canvasRect.right) - canvasRect.left;
    const left = Math.max(0, elemRect.left - canvasRect.left);
    const bottom =
      Math.min(elemRect.bottom, canvasRect.bottom) - canvasRect.top;
    const top = Math.max(0, elemRect.top - canvasRect.top);

    const width = Math.min(canvasRect.width, right - left);
    const height = Math.min(canvasRect.height, bottom - top);

    // setup the scissor to only render to that part of the canvas
    const positiveYUpBottom = canvasRect.height - bottom;
    renderer.setScissor(left, positiveYUpBottom, width, height);
    renderer.setViewport(left, positiveYUpBottom, width, height);

    // return the aspect
    return width / height;
  }

  function moveCamera(camera: THREE.PerspectiveCamera, time: number) {
    // adjust time so it is between 0 and 360
    const degrees = (time / 40) % 360;

    const radians = degrees * (Math.PI / 180);
    const sin = Math.sin(radians);
    // const sin = -1;
    const cos = Math.cos(radians);

    const cameraTranslateCoef = -sin;
    camera.position.x = cameraTranslateCoef * 10 + 5;

    // camera.position.y = cos * 10;
    camera.setViewOffset(
      simulatedWidth,
      simulatedHeight,
      simulatedWidth * -cameraTranslateCoef * 0.9,
      simulatedHeight * 0,
      simulatedWidth,
      simulatedHeight,
    );
    cameraHelper.update();
  }

  let currentX = 0;
  let currentY = 0;
  let currentZ = 0;
  let currentFovDelta = 0;
  const speed = 0.2;
  const initialPosition = new THREE.Vector3(5, 10, 150);
  camera.position.copy(initialPosition);
  document.addEventListener("keydown", (event) => {
    // if scroll down
    console.log(event.key);
    if (event.key === "6") currentX += 1;
    if (event.key === "4") currentX -= 1;
    if (event.key === "2") {
      currentZ += 1;
      currentFovDelta -= 1;
    }
    if (event.key === "8") {
      currentZ -= 1;
      currentFovDelta += 1;
    }
    if (event.key === "9") currentY += 1;
    if (event.key === "3") currentY -= 1;
    const displacementX = currentX * speed;
    const displacementY = currentY * speed;
    const displacementZ = currentZ * speed;

    camera.position.x = displacementX + initialPosition.x;
    camera.position.y = displacementY + initialPosition.y;
    camera.position.z = displacementZ + initialPosition.z;
    // camera.fov = 90 + currentFovDelta * speed * 3;

    const coefMagique =
      (window.innerWidth / 2 / window.innerHeight) * initialPosition.y * 2;

    camera.setViewOffset(
      simulatedWidth,
      simulatedHeight,
      (simulatedWidth * -displacementX) / coefMagique,
      // (simulatedHeight * displacementY) / coefMagique,
      0,
      simulatedWidth,
      simulatedHeight,
    );
    camera.updateProjectionMatrix();
  });

  function render(time: number) {
    resizeRendererToDisplaySize(renderer);

    // turn on the scissor
    renderer.setScissorTest(true);

    // render the original view
    {
      const aspect = setScissorForElement(view1Elem);

      // adjust the camera for this aspect
      camera.aspect = aspect;
      // moveCamera(camera, time);
      camera.updateProjectionMatrix();
      cameraHelper.update();

      // don't draw the camera helper in the original view
      cameraHelper.visible = false;

      scene.background.set(0x000000);

      // render
      renderer.render(scene, camera);
    }

    // render from the 2nd camera
    {
      const aspect = setScissorForElement(view2Elem);

      // adjust the camera for this aspect
      camera2.aspect = aspect;
      camera2.updateProjectionMatrix();

      // draw the camera helper in the 2nd view
      cameraHelper.visible = true;

      scene.background.set(0x000040);

      renderer.render(scene, camera2);
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
