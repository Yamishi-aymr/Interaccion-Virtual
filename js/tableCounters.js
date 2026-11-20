/* =====================================================
   PRACTICA 3.2 - INTERACCION VIRTUAL
   MODULO: TABLE-COUNTERS.JS
   Contadores 3D independientes sobre cada mesa.
===================================================== */

import * as THREE from 'three';

const TABLE_CATEGORIES = [
    { id: 'sphere', label: 'ESFERAS', color: '#28A9FF' },
    { id: 'cube', label: 'CUBOS', color: '#FF5577' },
    { id: 'pyramid', label: 'PIRÁMIDES', color: '#FFD166' },
    { id: 'octahedron', label: 'OCTAEDROS', color: '#A78BFA' }
];

function createCounterTexture(category) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 240;

    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return { canvas, context, texture, category };
}

function drawCounter(counter, correct = 0, total = 8) {
    const { canvas, context, category } = counter;
    const completed = correct >= total;

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'rgba(8, 13, 27, 0.94)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = completed ? '#35E6A1' : category.color;
    context.lineWidth = 9;
    context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

    context.textAlign = 'center';
    context.textBaseline = 'middle';

    context.fillStyle = category.color;
    context.font = 'bold 43px Arial';
    context.fillText(category.label, canvas.width / 2, 55);

    context.fillStyle = '#FFFFFF';
    context.font = 'bold 68px Arial';
    context.fillText(`${correct} / ${total}`, canvas.width / 2, 132);

    const barX = 65;
    const barY = 190;
    const barWidth = 510;
    const barHeight = 18;

    context.fillStyle = '#263553';
    context.fillRect(barX, barY, barWidth, barHeight);

    context.fillStyle = completed ? '#35E6A1' : category.color;
    context.fillRect(
        barX,
        barY,
        barWidth * Math.min(1, total > 0 ? correct / total : 0),
        barHeight
    );

    if (completed) {
        context.fillStyle = '#35E6A1';
        context.font = 'bold 22px Arial';
        context.fillText('¡CATEGORÍA COMPLETADA!', canvas.width / 2, 222);
    }

    counter.texture.needsUpdate = true;
}

export function createTableCounters(scene, tables) {
    if (!Array.isArray(tables) || tables.length !== TABLE_CATEGORIES.length) {
        throw new Error(
            `[TABLE-COUNTERS] Se esperaban ${TABLE_CATEGORIES.length} mesas.`
        );
    }

    const counters = [];

    tables.forEach((table, index) => {
        const category = TABLE_CATEGORIES[index];
        const textureData = createCounterTexture(category);

        const material = new THREE.SpriteMaterial({
            map: textureData.texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.name = `Counter-${category.id}`;
        sprite.scale.set(1.55, 0.58, 1);

        sprite.position.set(
            table.position.x,
            table.height + 1.35,
            table.position.z
        );

        sprite.renderOrder = 20;
        scene.add(sprite);

        const counter = {
            ...textureData,
            sprite,
            correct: 0,
            total: 8
        };

        drawCounter(counter, 0, 8);
        counters.push(counter);

        table.category = category.id;
        table.counter = sprite;
    });

    function update(categoryStats = {}) {
        counters.forEach(counter => {
            const stats = categoryStats[counter.category.id];
            const correct = stats?.correct ?? 0;
            const total = stats?.total ?? 8;

            counter.correct = correct;
            counter.total = total;

            drawCounter(counter, correct, total);
        });
    }

    function reset() {
        counters.forEach(counter => {
            counter.correct = 0;
            drawCounter(counter, 0, counter.total);
        });
    }

    function dispose() {
        counters.forEach(counter => {
            scene.remove(counter.sprite);
            counter.sprite.material.map?.dispose();
            counter.sprite.material.dispose();
        });

        counters.length = 0;
    }

    return { update, reset, dispose, counters };
}
