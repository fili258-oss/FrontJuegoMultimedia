import * as THREE from 'three'
export default function debugScene(scene) {
    scene.traverse(child => {
        if (child.isMesh && child.geometry && child.geometry.boundingBox) {
            const helper = new THREE.BoxHelper(child, 0xffff00)
            scene.add(helper)
        } else if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingBox()
            const helper = new THREE.BoxHelper(child, 0xff00ff)
            scene.add(helper)
        }
    })
    console.log('🟣 Ayudantes de escena activados.')
}
