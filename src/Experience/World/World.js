import * as THREE from 'three'

import Environment from './Environment.js'
import Fox from './Fox.js'
import Robot from './Robot.js'
import ToyCarLoader from '../../loaders/ToyCarLoader.js'
import Floor from './Floor.js'
import ThirdPersonCamera from './ThirdPersonCamera.js'
import Sound from './Sound.js'
import AmbientSound from './AmbientSound.js'
import MobileControls from '../../controls/MobileControls.js'
import LevelManager from './LevelManager.js';
import BlockPrefab from './BlockPrefab.js'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'

export default class World {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.blockPrefab = new BlockPrefab(this.experience)
        this.resources = this.experience.resources
        this.levelManager = new LevelManager(this.experience);
        this.finalPrizeActivated = false
        this.totalPoints = 0;

        // Sonidos
        this.coinSound = new Sound('/sounds/coin.ogg')
        this.ambientSound = new AmbientSound('/sounds/ambiente.mp3')
        this.winner = new Sound('/sounds/winner.mp3')
        this.portalSound = new Sound('/sounds/portal.mp3')

        this.allowPrizePickup = false
        this.hasMoved = false

        // Permitimos recoger premios tras 2s
        setTimeout(() => {
            this.allowPrizePickup = true
        }, 2000)

        this.resources.on('ready', async () => {
            this.floor = new Floor(this.experience)
            this.environment = new Environment(this.experience)

            this.loader = new ToyCarLoader(this.experience)
            await this.loader.loadFromAPI()

            this.fox = new Fox(this.experience)
            this.robot = new Robot(this.experience)

            this.experience.tracker.showCancelButton()
            this.experience.vr.bindCharacter(this.robot)
            this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.robot.group)

            this.mobileControls = new MobileControls({
                onUp: (pressed) => { this.experience.keyboard.keys.up = pressed },
                onDown: (pressed) => { this.experience.keyboard.keys.down = pressed },
                onLeft: (pressed) => { this.experience.keyboard.keys.left = pressed },
                onRight: (pressed) => { this.experience.keyboard.keys.right = pressed }
            })

            if (!this.experience.physics || !this.experience.physics.world) {
                console.error("🚫 Sistema de físicas no está inicializado al cargar el mundo.");
                return;
            }
        })
    }

    toggleAudio() {
        this.ambientSound.toggle()
    }

    update(delta) {
        this.fox?.update()
        this.robot?.update()
        this.blockPrefab?.update()

        if (!this.finalPrizeActivated && this.loader?.prizes?.length) {
            this.totalDefaultCoins = this.loader.prizes.filter(p => p.role === "default").length
        }

        if (this.thirdPersonCamera && this.experience.isThirdPerson && !this.experience.renderer.instance.xr.isPresenting) {
            this.thirdPersonCamera.update()
        }

        this.loader?.prizes?.forEach(p => p.update(delta))

        if (!this.allowPrizePickup || !this.loader || !this.robot) return

        const pos = this.robot.body.position
        const speed = this.robot.body.velocity.length()
        const moved = speed > 0.5
        const finalCoin = this.loader.prizes.find(p => p.role === "finalPrize")
        this.loader.prizes.forEach((prize, idx) => {
            if (!prize.pivot) return

            const dist = prize.pivot.position.distanceTo(pos)
            if (dist < 1.2 && moved && !prize.collected) {
                prize.collect()

                if (prize.role !== "finalPrize") {
                    this.loader.prizes.splice(idx, 1)
                }

                if (prize.role === "default") {
                    this.points = (this.points || 0) + 1
                    this.robot.points = this.points

                    const pointsTarget = this.levelManager.getCurrentLevelTargetPoints()
                    console.log(`🎯 Monedas recolectadas: ${this.points} / ${pointsTarget}`)

                    if (!this.finalPrizeActivated && this.points === pointsTarget) {
                        console.log("👏 Coin final activado. Buscando el premio final...")
                        console.log("😎 Coin final encontrado:", finalCoin)
                        if (finalCoin && !finalCoin.collected && finalCoin.pivot) {
                            if (finalCoin.model) finalCoin.model.visible = true
                            finalCoin.pivot.visible = true
                            this.finalPrizeActivated = true

                            //Espacio para activar el faro o luces en el premio final
                            this.showLights(finalCoin)
                            if (window.userInteracted) {
                                this.portalSound.play()
                            }

                            console.log("🪙 Coin final activado correctamente.")
                        }
                    }
                }

                const pointsTarget = this.levelManager.getCurrentLevelTargetPoints()
                if (prize.role === "finalPrize") {
                    this.showParticles(finalCoin)
                    // Sumar puntos del nivel al total antes de reiniciar
                    this.totalPoints += this.points || 0;
                    console.log("🚪 Coin final recogido. Pasando al siguiente nivel...")
                    if (this.levelManager.currentLevel < this.levelManager.totalLevels) {
                        
                        this.levelManager.nextLevel()
                        this.experience.menu.setLevelCount?.(this.levelManager.currentLevel);
                        //this.points = 0
                        //this.robot.points = 0
                    } else {
                        console.log('🏁 Completaste el último nivel, terminando partida...')
                        const elapsed = this.experience.tracker.stop()
                        this.experience.tracker.saveTime(elapsed)
                        //se agrego  this.totalPoints para la suma total de puntos
                        this.experience.tracker.showEndGameModal(elapsed,  this.totalPoints)

                        this.experience.obstacleWavesDisabled = true
                        clearTimeout(this.experience.obstacleWaveTimeout)
                        this.experience.raycaster?.removeAllObstacles()
                        if (window.userInteracted) {
                            this.winner.play()
                        }
                    }
                    return
                }

                console.log(`🎯 Monedas recolectadas: ${this.points} / ${pointsTarget}`)

                if (this.experience.raycaster?.removeRandomObstacles) {
                    const reduction = 0.2 + Math.random() * 0.1
                    this.experience.raycaster.removeRandomObstacles(reduction)
                }

                if (window.userInteracted) {
                    this.coinSound.play()
                }

                this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`) // (Total: ${this.totalPoints})
            }
        })

        // Faro rotación
        if (this.discoRaysGroup) {
            this.discoRaysGroup.rotation.y += delta * 0.5
        }
    }

    async loadLevel(level) {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const apiUrl = `${backendUrl}/api/blocks?level=${level}`;

            const res = await fetch(apiUrl);
            const data = await res.json();

            const blocks = data.blocks || [];
            const spawnPoint = data.spawnPoint || { x: 5, y: 1.5, z: 5 };

            this.points = 0;
            this.robot.points = 0;
            this.totalDefaultCoins = undefined;
            this.finalPrizeActivated = false;
            this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`);          
            this.experience.menu.setLevelCount?.(level);          


            await this.loader.loadFromURL(apiUrl);

            this.loader.prizes.forEach(p => {
                console.log(`🧪 Premio cargado: role=${p.role}, visible=${p.pivot.visible}`);
                if (p.pivot) p.pivot.visible = (p.role !== 'finalPrize');
                p.collected = false;
            });

            this.resetRobotPosition(spawnPoint);

            console.log(`✅ Nivel ${level} cargado con spawn en`, spawnPoint);
        } catch (error) {
            console.error('❌ Error cargando nivel:', error);
        }
    }

    clearCurrentScene() {
        if (!this.experience || !this.scene || !this.experience.physics || !this.experience.physics.world) {
            console.warn('⚠️ No se puede limpiar: sistema de físicas no disponible.');
            return;
        }

        let visualObjectsRemoved = 0;
        let physicsBodiesRemoved = 0;

        const childrenToRemove = [];

        this.scene.children.forEach((child) => {
            if (child.userData && child.userData.levelObject) {
                childrenToRemove.push(child);
            }
        });

        childrenToRemove.forEach((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }

            this.scene.remove(child);

            if (child.userData.physicsBody) {
                this.experience.physics.world.removeBody(child.userData.physicsBody);
            }

            visualObjectsRemoved++;
        });

        let physicsBodiesRemaining = -1;

        if (this.experience.physics
            && this.experience.physics.world
            && Array.isArray(this.experience.physics.bodies)
            && this.experience.physics.bodies.length > 0) {

            const survivingBodies = [];
            let bodiesBefore = this.experience.physics.bodies.length;

            this.experience.physics.bodies.forEach((body) => {
                if (body.userData && body.userData.levelObject) {
                    this.experience.physics.world.removeBody(body);
                    physicsBodiesRemoved++;
                } else {
                    survivingBodies.push(body);
                }
            });

            this.experience.physics.bodies = survivingBodies;

            console.log(`🧹 Physics Cleanup Report:`);
            console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`);
            console.log(`🎯 Cuerpos físicos sobrevivientes: ${survivingBodies.length}`);
            console.log(`📦 Estado inicial: ${bodiesBefore} cuerpos → Estado final: ${survivingBodies.length} cuerpos`);
        } else {
            console.warn('⚠️ Physics system no disponible o sin cuerpos activos, omitiendo limpieza física.');
        }

        console.log(`🧹 Escena limpiada antes de cargar el nuevo nivel.`);
        console.log(`✅ Objetos 3D eliminados: ${visualObjectsRemoved}`);
        console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`);
        console.log(`🎯 Objetos 3D actuales en escena: ${this.scene.children.length}`);

        if (physicsBodiesRemaining !== -1) {
            console.log(`🎯 Cuerpos físicos actuales en Physics World: ${physicsBodiesRemaining}`);
        }

        if (this.loader && this.loader.prizes.length > 0) {
            this.loader.prizes.forEach(prize => {
                if (prize.model) {
                    this.scene.remove(prize.model);
                    if (prize.model.geometry) prize.model.geometry.dispose();
                    if (prize.model.material) {
                        if (Array.isArray(prize.model.material)) {
                            prize.model.material.forEach(mat => mat.dispose());
                        } else {
                            prize.model.material.dispose();
                        }
                    }
                }
            });
            this.loader.prizes = [];
            console.log('🎯 Premios del nivel anterior eliminados correctamente.');
        }

        this.finalPrizeActivated = false
        this.loader?.prizes?.forEach(p => {
            if (p.role === "finalPrize" && p.pivot) {
                p.pivot.visible = false;
                p.collected = false;
            }
        })

        if (this.discoRaysGroup) {
            this.discoRaysGroup.children.forEach(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
            this.scene.remove(this.discoRaysGroup);
            this.discoRaysGroup = null;
        }
    }

    resetRobotPosition(spawn = { x: 5, y: 1.5, z: 5 }) {
        if (!this.robot?.body || !this.robot?.group) return

        this.robot.body.position.set(spawn.x, spawn.y, spawn.z)
        this.robot.body.velocity.set(0, 0, 0)
        this.robot.body.angularVelocity.set(0, 0, 0)
        this.robot.body.quaternion.setFromEuler(0, 0, 0)

        this.robot.group.position.set(spawn.x, spawn.y, spawn.z)
        this.robot.group.rotation.set(0, 0, 0)
    }
    showParticles(finalCoin) {
        console.log("🎉 Activando partículas para el premio final...")
        new FinalPrizeParticles({
            scene: this.scene,
            targetPosition: finalCoin.pivot.position,
            sourcePosition: this.robot.body.position,
            experience: this.experience
        })
    }

    showLights(finalCoin) {
        console.log("🎉 Activando luces para el premio final...")
        // Faro visual
        this.discoRaysGroup = new THREE.Group()
        this.scene.add(this.discoRaysGroup)

        const rayMaterial = new THREE.MeshBasicMaterial({
            color: 0xaa00ff,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        })

        const rayCount = 4
        for (let i = 0; i < rayCount; i++) {
            const cone = new THREE.ConeGeometry(0.2, 4, 6, 1, true)
            const ray = new THREE.Mesh(cone, rayMaterial)

            ray.position.set(0, 2, 0)
            ray.rotation.x = Math.PI / 2
            ray.rotation.z = (i * Math.PI * 2) / rayCount

            const spot = new THREE.SpotLight(0xaa00ff, 2, 12, Math.PI / 7, 0.2, 0.5)
            spot.castShadow = false
            spot.shadow.mapSize.set(1, 1)
            spot.position.copy(ray.position)
            spot.target.position.set(
                Math.cos(ray.rotation.z) * 10,
                2,
                Math.sin(ray.rotation.z) * 10
            )

            ray.userData.spot = spot
            this.discoRaysGroup.add(ray)
            this.discoRaysGroup.add(spot)
            this.discoRaysGroup.add(spot.target)
        }

        this.discoRaysGroup.position.copy(finalCoin.pivot.position)

    }
}