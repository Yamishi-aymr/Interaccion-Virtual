
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: EFFECTS.JS
   Efectos visuales y partículas 3D.
===================================================== */

import * as THREE from 'three';


export function createEffectsSystem(scene) {

    const particles = [];

    const MAX_PARTICLES = 180;


    // =================================
    // CREAR EXPLOSIÓN DE PARTÍCULAS
    // =================================

    function spawn(position, color = 0x28D9FF, count = 18) {

        if (!position) {

            return;

        }


        const available = Math.max(

            0,

            MAX_PARTICLES - particles.length

        );


        const particleCount = Math.min(

            count,

            available

        );


        for (let i = 0; i < particleCount; i++) {

            const geometry = new THREE.SphereGeometry(

                0.025,

                6,

                6

            );


            const material = new THREE.MeshBasicMaterial({

                color,

                transparent: true,

                opacity: 1

            });


            const mesh = new THREE.Mesh(

                geometry,

                material

            );


            mesh.position.copy(position);


            const velocity = new THREE.Vector3(

                (Math.random() - 0.5) * 2,

                Math.random() * 2,

                (Math.random() - 0.5) * 2

            );


            scene.add(mesh);


            particles.push({

                mesh,

                velocity,

                life: 1,

                decay: 0.7 + Math.random() * 0.8

            });

        }

    }


    // =================================
    // EFECTO DE ACIERTO
    // =================================

    function correct(position) {

        spawn(

            position,

            0x35E6A1,

            28

        );

    }


    // =================================
    // EFECTO DE ERROR
    // =================================

    function error(position) {

        spawn(

            position,

            0xFF5577,

            15

        );

    }


    // =================================
    // EFECTO DE AGARRE
    // =================================

    function grab(position) {

        spawn(

            position,

            0x28D9FF,

            8

        );

    }


    // =================================
    // ACTUALIZAR PARTÍCULAS
    // =================================

    function update(deltaTime = 1 / 60) {

        const safeDelta = Math.min(

            Math.max(deltaTime, 0),

            0.05

        );


        for (let i = particles.length - 1; i >= 0; i--) {

            const particle = particles[i];


            particle.life -= safeDelta * particle.decay;


            if (particle.life <= 0) {

                scene.remove(particle.mesh);

                particle.mesh.geometry.dispose();

                particle.mesh.material.dispose();

                particles.splice(i, 1);

                continue;

            }


            particle.velocity.y -= 1.2 * safeDelta;


            particle.mesh.position.addScaledVector(

                particle.velocity,

                safeDelta

            );


            particle.mesh.material.opacity = particle.life;


            const scale = Math.max(

                0.05,

                particle.life

            );


            particle.mesh.scale.setScalar(scale);

        }

    }


    // =================================
    // LIMPIAR PARTÍCULAS
    // =================================

    function clear() {

        particles.forEach(particle => {

            scene.remove(particle.mesh);

            particle.mesh.geometry.dispose();

            particle.mesh.material.dispose();

        });


        particles.length = 0;

    }


    function dispose() {

        clear();

    }


    return {

        spawn,

        correct,

        error,

        grab,

        update,

        clear,

        dispose

    };

}
