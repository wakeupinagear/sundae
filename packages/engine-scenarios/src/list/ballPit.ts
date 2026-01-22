import { Scene } from "@repo/engine/scene";
import { type EngineScenario } from "..";
import { type Engine, type EngineOptions } from "@repo/engine";
import { E_Shape, type E_ShapeJSON } from "@repo/engine/entities";

const BALL_COLORS = ['red', 'blue', 'cyan', 'yellow', 'orange', 'green'];

class E_Ball extends E_Shape {
}

class PitScene extends Scene {
    override create(_engine: Engine<EngineOptions>): void {
        const wallOptions: E_ShapeJSON =  {
            type:'shape',
            shape:'RECT',
            style:{fillStyle:'#DDDDDD'},
            collision:true
        }
        this.createEntities({
            ...wallOptions,
            position: {x:0, y:300},
            scale: {x: 800, y: 50}
        }, {
            ...wallOptions,
            position: {x:350, y:150},
            scale: {x: 25, y: 400}
        }, {
            ...wallOptions,
            position: {x:-350, y:150},
            scale: {x: 25, y: 400}
        })

        for (let i = 0 ; i < 600; i++) {
            this.createEntities({
                type: E_Ball,
                shape: 'ELLIPSE',
                scale: 5 + _engine.random() * 25,
                style: {
                    fillStyle: BALL_COLORS[Math.floor(this._engine.random() * (BALL_COLORS.length))]
                },
                position: {
                    x: 500 * (_engine.random() - 0.5),
                    y: 400 * (_engine.random() - 0.5),
                },
                collision: true,
                pointerTarget: true,
                onPointerEnter: (collider) => {
                    (collider.entity as E_Shape).shape.setOpacity(0.5);
                },
                onPointerLeave: (collider) => {
                    (collider.entity as E_Shape).shape.setOpacity(1);
                },
                mass: 1,
            })
        }
    }
}

export const ballPit:EngineScenario = (harness) => {
    harness.engine.openScene(PitScene)
}