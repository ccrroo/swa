let scene, camera, renderer, controls;
let moveForward = false,
    moveBackward = false,
    moveLeft = false,
    moveRight = false;
let isRunning = false;

// ★ ジャンプ用の変数
let canJump = false;

// ★ 召喚ギミック用の変数
let isSummoning = false;
let ringRotation = 0;
let currentRingRadius = 5000; // 輪の初期サイズ

// ★ レーザービーム用の配列
let lasers = [];

// ★ 30秒イベント用の変数
let isAngryPhase = false;
let angryTexture = null;

let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let swataros = [];

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x4A1C54);
    scene.fog = new THREE.FogExp2(0x4A1C54, 0.0003);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.y = 50;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('threejs-container').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    controls = new THREE.PointerLockControls(camera, document.body);
    const uiOverlay = document.getElementById('ui-overlay');

    uiOverlay.addEventListener('click', () => { controls.lock(); });
    controls.addEventListener('lock', () => { uiOverlay.style.display = 'none'; });
    controls.addEventListener('unlock', () => { uiOverlay.style.display = 'flex'; });
    scene.add(controls.getObject());

    const onKeyDown = (event) => {
        switch (event.code) {
            case 'KeyW':
                moveForward = true;
                break;
            case 'KeyA':
                moveLeft = true;
                break;
            case 'KeyS':
                moveBackward = true;
                break;
            case 'KeyD':
                moveRight = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                isRunning = true;
                break;
                // ★ スペースキーでジャンプ
            case 'Space':
                if (canJump === true) velocity.y += 1800; // ジャンプ力
                canJump = false;
                break;
        }
    };
    const onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW':
                moveForward = false;
                break;
            case 'KeyA':
                moveLeft = false;
                break;
            case 'KeyS':
                moveBackward = false;
                break;
            case 'KeyD':
                moveRight = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                isRunning = false;
                break;
        }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // ★ 右クリック時のブラウザメニューを無効化
    document.addEventListener('contextmenu', event => event.preventDefault());

    // ★ マウスクリックの制御
    document.addEventListener('mousedown', (event) => {
        if (!controls.isLocked) return;

        if (event.button === 0) {
            // 左クリック: レーザー発射
            shootLaser();
        } else if (event.button === 2) {
            // 右クリック: 召喚
            isSummoning = true;
        }
    });
    document.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            isSummoning = false;
            currentRingRadius = 5000; // クリックを離したら輪のサイズをリセット
        }
    });

    const floorSize = 10000;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(floorSize, 150, 0x000000, 0x000000);
    gridHelper.position.y = 1;
    scene.add(gridHelper);

    const textureLoader = new THREE.TextureLoader();

    // ★ 30秒後用の「赤い目」テクスチャを事前に読み込んでおく
    textureLoader.load('swatarore.png', (texture) => {
        angryTexture = texture;
    });

    // 通常のSwataroの読み込み
    textureLoader.load(
        'swataro.png',
        function(texture) {
            const imageAspect = texture.image.width / texture.image.height;
            const height = 250;
            const width = height * imageAspect;
            const geometry = new THREE.PlaneGeometry(width, height);
            const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });

            for (let i = 0; i < 50; i++) {
                const swataro = new THREE.Mesh(geometry, material.clone()); // ★後で個別に変更できるようにcloneする

                const startX = (Math.random() - 0.5) * 6000;
                const startZ = (Math.random() - 0.5) * 6000;
                swataro.position.set(startX, height / 2, startZ);

                swataro.userData = {
                    baseY: height / 2,
                    speedX: (Math.random() - 0.5) * 400,
                    speedZ: (Math.random() - 0.5) * 400,
                    jumpSpeed: Math.random() * 5 + 5,
                    jumpHeight: Math.random() * 80 + 20,
                    timeOffset: Math.random() * Math.PI * 2
                };

                scene.add(swataro);
                swataros.push(swataro);
            }
        }
    );

    window.addEventListener('resize', onWindowResize);
}

// ★ レーザーを発射する関数
function shootLaser() {
    // レーザーの形状 (太さ5, 長さ5000のビーム)
    const length = 5000;
    const geometry = new THREE.CylinderGeometry(5, 5, length, 8);
    geometry.rotateX(Math.PI / 2); // 奥行き方向に向ける
    geometry.translate(0, 0, -length / 2); // カメラ位置が始点になるようにずらす

    // 黄色く光るマテリアル
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 1.0 });
    const laser = new THREE.Mesh(geometry, material);

    // カメラの位置と向きをレーザーにコピー
    camera.getWorldPosition(laser.position);
    laser.quaternion.copy(camera.quaternion);

    // 目の高さから少し右下から発射されている感を出す微調整（不要なら消してもOK）
    laser.translateY(-10);
    laser.translateX(10);

    scene.add(laser);
    lasers.push(laser); // アニメーション用に配列に追加
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    const timeInSeconds = time / 1000;

    // ★ 30秒経過イベントの監視
    if (!isAngryPhase && time > 30000) { // 30000ミリ秒 = 30秒
        isAngryPhase = true;

        // 背景と霧を薄黒くする
        scene.background.setHex(0x1a1a1a);
        scene.fog.color.setHex(0x1a1a1a);

        // 全員を「赤い目」テクスチャに変更
        if (angryTexture) {
            swataros.forEach(swataro => {
                swataro.material.map = angryTexture;
                swataro.material.needsUpdate = true;
            });
        }
    }

    // ★ レーザーのアニメーション（フェードアウトして消える）
    for (let i = lasers.length - 1; i >= 0; i--) {
        let laser = lasers[i];
        laser.material.opacity -= delta * 3; // どんどん透明になる
        if (laser.material.opacity <= 0) {
            scene.remove(laser);
            laser.geometry.dispose();
            laser.material.dispose();
            lasers.splice(i, 1); // 配列から削除
        }
    }

    // Swataroたちの行動制御
    if (isSummoning) {
        // --- 召喚中（右クリック長押し）---
        ringRotation -= delta * 0.8;

        // ★ 輪のサイズを徐々に小さくする（最小で半径800まで寄ってくる）
        if (currentRingRadius > 800) {
            currentRingRadius -= delta * 2000;
        }

        swataros.forEach((swataro, index) => {
            const angle = ringRotation + (index / swataros.length) * Math.PI * 2;
            const targetX = camera.position.x + Math.cos(angle) * currentRingRadius;
            const targetZ = camera.position.z + Math.sin(angle) * currentRingRadius;
            const targetY = swataro.userData.baseY;

            swataro.position.x += (targetX - swataro.position.x) * 5 * delta;
            swataro.position.z += (targetZ - swataro.position.z) * 5 * delta;
            swataro.position.y += (targetY - swataro.position.y) * 5 * delta;

            swataro.lookAt(camera.position.x, swataro.position.y, camera.position.z);
        });

    } else {
        // --- 通常時 ---
        swataros.forEach(swataro => {
            swataro.position.x += swataro.userData.speedX * delta;
            swataro.position.z += swataro.userData.speedZ * delta;

            if (swataro.position.x > 4800 || swataro.position.x < -4800) swataro.userData.speedX *= -1;
            if (swataro.position.z > 4800 || swataro.position.z < -4800) swataro.userData.speedZ *= -1;

            swataro.position.y = swataro.userData.baseY + Math.abs(Math.sin(timeInSeconds * swataro.userData.jumpSpeed + swataro.userData.timeOffset)) * swataro.userData.jumpHeight;

            swataro.lookAt(camera.position.x, swataro.position.y, camera.position.z);
        });
    }

    // プレイヤーの移動とジャンプ制御
    if (controls.isLocked === true) {
        // 摩擦（減速）
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        // ★ 重力処理（ジャンプ用）
        velocity.y -= 9.8 * 800.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = isRunning ? 2500.0 : 1000.0;

        if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;

        // X, Z方向の移動
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);

        // ★ Y方向（高さ）の移動と着地判定
        controls.getObject().position.y += (velocity.y * delta);
        if (controls.getObject().position.y < 50) { // 地面の高さ(目の高さ)
            velocity.y = 0;
            controls.getObject().position.y = 50;
            canJump = true; // 着地したら再びジャンプ可能に
        }
    }

    prevTime = time;
    renderer.render(scene, camera);
}

init();
animate();
