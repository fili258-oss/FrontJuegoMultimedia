import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { gsap } from 'gsap'

export default class Raycaster {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.camera = this.experience.camera.instance
        this.renderer = this.experience.renderer.instance
        this.physics = this.experience.physics
        this.pointer = new THREE.Vector2()
        this.raycaster = new THREE.Raycaster()
        this.spawnedObstacles = []

        // Reutilización
        this.sharedGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)

        this.setEvents()
    }

    setEvents() {
        window.addEventListener('click', (event) => {
            this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
            this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

            this.raycaster.setFromCamera(this.pointer, this.camera)
            const floorMesh = this.experience.world?.floor?.mesh
            if (!floorMesh) return

            const intersects = this.raycaster.intersectObject(floorMesh)


            if (intersects.length > 0) {
                const point = intersects[0].point
                //console.log('🟢 Punto seleccionado:', point)
                this.placeObject(point)
            }
        })
    }

    placeObject(position) {
    // this._createObstacle(position.x, 1, position.z) // comentado para evitar crear obstáculos
    
    this.experience.world.blockPrefab.getInstance(
        { x: position.x, y: 1, z: position.z },
        true // activa el log para mostrar coordenadas
    )
}

    generateRandomObstacle() {
        const size = 0.5
        const color = new THREE.Color(Math.random(), Math.random(), Math.random())
        const material = new THREE.MeshStandardMaterial({ color })
      
        const mesh = new THREE.Mesh(this.sharedGeometry, material)
        mesh.castShadow = true
      
        // Posición aleatoria dentro de un rango
        const x = (Math.random() - 0.5) * 100
        const z = (Math.random() - 0.5) * 100
        const y = 1
        mesh.position.set(x, y, z)
        this.scene.add(mesh)
      
        const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2))
        const body = new CANNON.Body({
          mass: 1,
          shape,
          position: new CANNON.Vec3(x, y, z),
          material: this.physics.defaultMaterial
        })
        this.physics.world.addBody(body)
      
        const tick = () => {
          mesh.position.copy(body.position)
          mesh.quaternion.copy(body.quaternion)
        }
        this.experience.time.on('tick', tick)
      
        const obstacle = { mesh, body, tick }
        this.spawnedObstacles.push(obstacle)
      
        return obstacle
      }

    _createObstacle(x, y, z) {
        const size = 0.5
        const color = new THREE.Color(Math.random(), Math.random(), Math.random())
        const material = new THREE.MeshStandardMaterial({ color })

        const mesh = new THREE.Mesh(this.sharedGeometry, material)
        mesh.castShadow = true
        mesh.position.set(x, y, z)
        this.scene.add(mesh)

        const shape = new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2))
        const body = new CANNON.Body({
            mass: 0.3,
            shape,
            position: new CANNON.Vec3(x, y, z),
            material: this.physics.defaultMaterial
        })
        this.physics.world.addBody(body)

        const tick = () => {
            mesh.position.copy(body.position)
            mesh.quaternion.copy(body.quaternion)
        }
        this.experience.time.on('tick', tick)

        this.spawnedObstacles.push({ mesh, body, tick })

        // Limitar máximo
        const MAX_OBSTACLES = 100
        if (this.spawnedObstacles.length > MAX_OBSTACLES) {
            this._removeObstacle(this.spawnedObstacles.shift())
        }
    }
    _removeObstacle({ mesh, body, tick }) {
        if (!mesh || !body) return;
    
        mesh.material.transparent = true
    
        // Bloquear tick inmediatamente
        this.experience.time.off('tick', tick)
    
        // Animación
        gsap.to(mesh.scale, {
            x: 0, y: 0, z: 0,
            duration: 0.4,
            ease: 'power1.in'
        })
    
        gsap.to(mesh.material, {
            opacity: 0,
            duration: 0.4,
            ease: 'power1.in',
            onComplete: () => {
                this.scene.remove(mesh)
    
                try {
                    mesh.geometry.dispose()
                    mesh.material.dispose()
                } catch (e) {
                    console.warn('Error liberando recursos de mesh:', e)
                }
    
                try {
                    this.physics.world.removeBody(body)
                } catch (e) {
                    console.warn('Error eliminando body físico:', e)
                }
            }
        })
    }
    

    removeRandomObstacles(percentage = 0.3) {
        const total = this.spawnedObstacles.length
        const count = Math.floor(total * percentage)
        const toRemove = this.spawnedObstacles.splice(0, count)
        toRemove.forEach(obj => this._removeObstacle(obj))
    }

    removeAllObstacles() {
        this.spawnedObstacles.forEach(obj => this._removeObstacle(obj))
        this.spawnedObstacles = []
    }
}
