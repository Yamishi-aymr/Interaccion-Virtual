
/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: HUD.JS
   Panel tridimensional de información.
===================================================== */

import * as THREE from 'three';


// =============================================
// CONFIGURACIÓN
// =============================================

const HUD_CONFIG = {

    panelDistance: 1.45,

    panelWidth: 1.05,

    panelHeight: 0.72,

    updateInterval: 0.15,

    pinchDistance: 0.13

};


// =============================================
// CREAR TEXTURA DE PANEL
// =============================================

function createPanelTexture() {

    const canvas = document.createElement('canvas');

    canvas.width = 1024;

    canvas.height = 700;

    const context = canvas.getContext('2d');

    return { canvas, context };

}


// =============================================
// DIBUJAR PANEL
// =============================================

function drawPanel(context, stats, width, height) {

    context.clearRect(0, 0, width, height);


    // Fondo.
    const gradient = context.createLinearGradient(
        0, 0, width, height
    );

    gradient.addColorStop(0, '#101B38');

    gradient.addColorStop(1, '#080D1B');


    context.fillStyle = gradient;

    context.fillRect(0, 0, width, height);


    // Borde.
    context.strokeStyle = '#7865FF';

    context.lineWidth = 7;

    context.strokeRect(8, 8, width - 16, height - 16);


    // Encabezado.
    context.fillStyle = '#28D9FF';

    context.font = 'bold 37px Arial';

    context.fillText('LABORATORIO VR', 45, 65);


    context.fillStyle = '#A4AEC8';

    context.font = '23px Arial';

    context.fillText('CLASIFICACION DE FIGURAS', 45, 105);


    // Progreso.
    context.fillStyle = '#FFFFFF';

    context.font = 'bold 42px Arial';

    context.fillText(
        `PROGRESO: ${stats.correct} / ${stats.total}`,
        45,
        195
    );


    // Barra de progreso.
    const barX = 45;

    const barY = 225;

    const barWidth = 930;

    const barHeight = 24;


    context.fillStyle = '#263553';

    context.fillRect(
        barX,
        barY,
        barWidth,
        barHeight
    );


    context.fillStyle = '#28D9FF';

    context.fillRect(
        barX,
        barY,
        barWidth * (stats.progress?.percentage || 0) / 100,
        barHeight
    );


    // Cronómetro.
    context.fillStyle = '#A78BFA';

    context.font = 'bold 42px Arial';

    context.fillText('TIEMPO', 45, 335);


    context.fillStyle = '#FFFFFF';

    context.font = 'bold 58px Arial';

    context.fillText(
        stats.formattedTime || '00:00',
        45,
        405
    );


    // Aciertos.
    context.fillStyle = '#35E6A1';

    context.font = 'bold 34px Arial';

    context.fillText(
        `ACIERTOS: ${stats.correct}`,
        45,
        485
    );


    // Errores.
    context.fillStyle = '#FF5577';

    context.fillText(
        `ERRORES: ${stats.errors}`,
        520,
        485
    );


    // Precisión.
    context.fillStyle = '#FFFFFF';

    context.font = 'bold 30px Arial';

    context.fillText(
        `PRECISION: ${stats.accuracy}%`,
        45,
        560
    );


    // Mensaje final.
    if (stats.completed) {

        context.fillStyle = '#35E6A1';

        context.font = 'bold 30px Arial';

        context.fillText(
            'PRACTICA COMPLETADA',
            45,
            635
        );

    }

}


// =============================================
// CREAR TEXTURA DE BOTÓN
// =============================================

function createButtonTexture(label, color) {

    const canvas = document.createElement('canvas');

    canvas.width = 512;

    canvas.height = 160;


    const context = canvas.getContext('2d');


    context.fillStyle = '#101B38';

    context.fillRect(0, 0, 512, 160);


    context.strokeStyle = color;

    context.lineWidth = 8;

    context.strokeRect(5, 5, 502, 150);


    context.fillStyle = '#FFFFFF';

    context.font = 'bold 43px Arial';

    context.textAlign = 'center';

    context.textBaseline = 'middle';

    context.fillText(label, 256, 80);


    const texture = new THREE.CanvasTexture(canvas);

    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;

}


// =============================================
// CREAR SISTEMA HUD
// =============================================

export function createHUD(camera, {

    onReset = null,

    onExit = null

} = {}) {

    console.log('[HUD] Creando panel tridimensional...');


    const group = new THREE.Group();

    group.name = 'VR-HUD';


    // El panel queda unido a la cámara.
    camera.add(group);


    // =================================
    // PANEL PRINCIPAL
    // =================================

    const textureData = createPanelTexture();

    const panelTexture = new THREE.CanvasTexture(
        textureData.canvas
    );

    panelTexture.colorSpace = THREE.SRGBColorSpace;


    const panelMaterial = new THREE.MeshBasicMaterial({

        map: panelTexture,

        transparent: true,

        side: THREE.DoubleSide,

        depthTest: false

    });


    const panel = new THREE.Mesh(

        new THREE.PlaneGeometry(

            HUD_CONFIG.panelWidth,

            HUD_CONFIG.panelHeight

        ),

        panelMaterial

    );


    panel.position.set(

        0,

        0.05,

        -HUD_CONFIG.panelDistance

    );


    panel.renderOrder = 1000;

    group.add(panel);


    // =================================
    // BOTONES
    // =================================

    function createButton(label, color, x, action) {

        const buttonGroup = new THREE.Group();


        const texture = createButtonTexture(

            label,

            color

        );


        const material = new THREE.MeshBasicMaterial({

            map: texture,

            transparent: true,

            side: THREE.DoubleSide,

            depthTest: false

        });


        const mesh = new THREE.Mesh(

            new THREE.PlaneGeometry(0.38, 0.12),

            material

        );


        mesh.position.z = 0.002;

        mesh.renderOrder = 1001;


        buttonGroup.add(mesh);


        buttonGroup.position.set(

            x,

            -0.49,

            -HUD_CONFIG.panelDistance

        );


        buttonGroup.userData.action = action;

        buttonGroup.userData.label = label;

        buttonGroup.userData.cooldown = false;


        group.add(buttonGroup);


        return buttonGroup;

    }


    const resetButton = createButton(

        'REINICIAR',

        '#28D9FF',

        -0.22,

        'reset'

    );


    const exitButton = createButton(

        'SALIR VR',

        '#FF5577',

        0.22,

        'exit'

    );


    // =================================
    // ESTADO
    // =================================

    let currentStats = {

        correct: 0,

        errors: 0,

        total: 20,

        accuracy: 0,

        formattedTime: '00:00',

        progress: {

            percentage: 0

        },

        completed: false

    };


    let updateAccumulator = 0;

    let previousPinching = {

        left: false,

        right: false

    };


    let disposed = false;


    // =================================
    // ACTUALIZAR ESTADÍSTICAS
    // =================================

    function updateStats(stats) {

        currentStats = {

            ...currentStats,

            ...stats

        };


    }


    // =================================
    // ACTUALIZAR TEXTURA
    // =================================

    function refreshPanel() {

        drawPanel(

            textureData.context,

            currentStats,

            textureData.canvas.width,

            textureData.canvas.height

        );


        panelTexture.needsUpdate = true;

    }


    // =================================
    // DETECTAR BOTÓN POR PROXIMIDAD
    // =================================

    function checkButton(handState) {

        if (!handState || !handState.tracked) {

            return;

        }


        const handPosition = handState.centerPosition;


        const buttons = [

            resetButton,

            exitButton

        ];


        for (const button of buttons) {

            const worldPosition = new THREE.Vector3();

            button.getWorldPosition(worldPosition);


            const distance = handPosition.distanceTo(

                worldPosition

            );


            if (distance <= HUD_CONFIG.pinchDistance) {

                if (button.userData.cooldown) {

                    continue;

                }


                button.userData.cooldown = true;


                if (button.userData.action === 'reset') {

                    if (typeof onReset === 'function') {

                        onReset();

                    }

                }


                if (button.userData.action === 'exit') {

                    if (typeof onExit === 'function') {

                        onExit();

                    }

                }


                setTimeout(() => {

                    button.userData.cooldown = false;

                }, 700);


                break;

            }

        }

    }


    // =================================
    // ACTUALIZAR INTERACCIÓN CON BOTONES
    // =================================

    function updateHandButtons(xr) {

        if (!xr) {

            return;

        }


        const hands = [

            xr.getHand('left'),

            xr.getHand('right')

        ];


        hands.forEach(hand => {

            if (!hand) {

                return;

            }


            const handId = hand.handedness;


            const pinching =

                hand.tracked && hand.pinching;


            // Ejecutar solamente al comenzar la pinza.
            if (

                pinching &&

                !previousPinching[handId]

            ) {

                checkButton(hand);

            }


            previousPinching[handId] = pinching;

        });

    }


    // =================================
    // ACTUALIZAR HUD
    // =================================

    function update(deltaTime = 1 / 60, xr = null) {

        if (disposed) {

            return;

        }


        updateAccumulator += deltaTime;


        if (

            updateAccumulator >=

            HUD_CONFIG.updateInterval

        ) {

            refreshPanel();

            updateAccumulator = 0;

        }


        updateHandButtons(xr);

    }


    // =================================
    // MOSTRAR / OCULTAR
    // =================================

    function setVisible(visible) {

        group.visible = Boolean(visible);

    }


    // =================================
    // LIMPIAR RECURSOS
    // =================================

    function dispose() {

        if (disposed) {

            return;

        }


        disposed = true;

        camera.remove(group);


        group.traverse(object => {

            if (object.geometry) {

                object.geometry.dispose();

            }


            if (object.material) {

                const materials = Array.isArray(object.material)

                    ? object.material

                    : [object.material];


                materials.forEach(material => {

                    if (material.map) {

                        material.map.dispose();

                    }

                    material.dispose();

                });

            }

        });


        console.log('[HUD] Recursos liberados.');

    }


    // =================================
    // API PÚBLICA
    // =================================

    refreshPanel();


    return {

        group,

        update,

        updateStats,

        setVisible,

        dispose

    };

}
