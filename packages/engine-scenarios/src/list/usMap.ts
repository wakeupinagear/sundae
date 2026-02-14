import { type Engine, scaleToZoom } from '@repo/engine';
import type { LoadedJSON } from '@repo/engine/asset';
import type { Entity } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { SCENARIO_ASSETS } from '../assets';
import type { EngineScenario } from '../types';

const PADDING_PX = 32;
const MAP_WIDTH_PX = 2440 + PADDING_PX * 2;
const MAP_HEIGHT_PX = 1340 + PADDING_PX * 2;

const COUNTY_MIN_ZOOM = 1.2;
const EXCLUDED_STATE_NAMES = new Set(['Alaska', 'Hawaii', 'Puerto Rico']);
const EXCLUDED_STATE_CODES = new Set(['02', '15', '72']);

type LngLat = [number, number];
type Ring = LngLat[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

type Geometry = {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: Polygon | MultiPolygon;
} | null;

interface FeatureCollection<TProperties> {
    type: 'FeatureCollection';
    features: Feature<TProperties>[];
}

interface Feature<TProperties> {
    id?: number | string;
    properties: TProperties;
    geometry: Geometry;
}

interface StateProperties {
    name?: string;
}

interface CountyProperties {
    STATEFP?: string;
    STATE?: string | number;
    NAME?: string;
    COUNTY?: string;
}

interface ProjectedPoint {
    x: number;
    y: number;
}

interface ProjectedFeature<TProperties> {
    id: string;
    properties: TProperties;
    rings: ProjectedPoint[][];
}

const pad2 = (value: number | string): string => `${value}`.padStart(2, '0');

const getRingsFromGeometry = (geometry: Geometry): Ring[] => {
    if (!geometry) {
        return [];
    }

    if (geometry.type === 'Polygon') {
        return geometry.coordinates as Polygon;
    }

    const rings: Ring[] = [];
    for (const polygon of geometry.coordinates as MultiPolygon) {
        rings.push(...polygon);
    }
    return rings;
};

const readFeatureCollection = <TProperties>(
    payload: unknown,
): FeatureCollection<TProperties> => {
    return payload as FeatureCollection<TProperties>;
};

const getFeatureID = <TProperties>(
    feature: Feature<TProperties>,
    fallbackPrefix: string,
    index: number,
): string => {
    if (feature.id !== undefined && feature.id !== null) {
        return `${feature.id}`;
    }

    return `${fallbackPrefix}-${index}`;
};

const projectFeatureCollections = (
    states: FeatureCollection<StateProperties>,
    counties: FeatureCollection<CountyProperties>,
): {
    projectedStates: ProjectedFeature<StateProperties>[];
    projectedCounties: ProjectedFeature<CountyProperties>[];
} => {
    const points: ProjectedPoint[] = [];
    const allStateRings = states.features
        .filter((feature) => {
            const stateName = feature.properties.name;
            return !stateName || !EXCLUDED_STATE_NAMES.has(stateName);
        })
        .map((feature, index) => ({
            id: getFeatureID(feature, 'state', index),
            properties: feature.properties,
            rings: getRingsFromGeometry(feature.geometry),
        }));
    const allCountyRings = counties.features
        .map((feature, index) => ({
            id: getFeatureID(feature, 'county', index),
            properties: feature.properties,
            rings: getRingsFromGeometry(feature.geometry),
        }))
        .filter((county) => {
            const stateCode = getCountyStateCode(county);
            return !EXCLUDED_STATE_CODES.has(stateCode);
        });

    // Use states for projection bounds so county outliers do not skew centering.
    for (const feature of allStateRings) {
        for (const ring of feature.rings) {
            for (const [lon, lat] of ring) {
                points.push({ x: lon, y: lat });
            }
        }
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const lonScale = Math.cos((centerY * Math.PI) / 180);
    const projectedWidth = width * lonScale;
    const scale = MAP_WIDTH_PX / Math.max(projectedWidth, height);

    const projectRing = (ring: Ring): ProjectedPoint[] =>
        ring.map(([lon, lat]) => ({
            x: (lon - centerX) * lonScale * scale,
            y: (centerY - lat) * scale,
        }));

    const projectedStates = allStateRings.map((feature) => ({
        id: feature.id,
        properties: feature.properties,
        rings: feature.rings.map(projectRing),
    }));
    const projectedCounties = allCountyRings.map((feature) => ({
        id: feature.id,
        properties: feature.properties,
        rings: feature.rings.map(projectRing),
    }));

    return { projectedStates, projectedCounties };
};

const getCountyStateCode = (
    county: Pick<ProjectedFeature<CountyProperties>, 'id' | 'properties'>,
): string => {
    const { STATEFP, STATE } = county.properties;
    if (STATEFP) {
        return pad2(STATEFP);
    }
    if (STATE !== undefined && STATE !== null) {
        return pad2(STATE);
    }

    return county.id.slice(0, 2);
};

class USMapScene extends Scene<Engine> {
    #statesLayer!: Entity;
    #countiesLayer!: Entity;
    #loadedMap = false;

    override create(): void {
        const baseScale = this.#calculateBaseScale();
        this._engine.setCameraZoom(scaleToZoom(baseScale));

        const mapRoot = this.createEntity({
            type: 'entity',
            name: 'us-map-root',
        });
        this.#statesLayer = mapRoot.addChild({
            type: 'entity',
            name: 'states-layer',
            zIndex: 2,
        });
        this.#countiesLayer = mapRoot.addChild({
            type: 'entity',
            name: 'counties-layer',
            zIndex: 1,
            lod: {
                minZoom: COUNTY_MIN_ZOOM * baseScale,
            },
        });
    }

    update() {
        if (!this.#loadedMap) {
            const statesJSON = this._engine.getJSON(
                SCENARIO_ASSETS.US_MAP.STATES,
            );
            const countiesJSON = this._engine.getJSON(
                SCENARIO_ASSETS.US_MAP.COUNTIES,
            );
            if (statesJSON && countiesJSON) {
                this.#loadedMap = true;
                this.#generateMap(statesJSON, countiesJSON);
            }
        }

        const baseScale = this.#calculateBaseScale();
        this._engine.setCameraResetTarget({
            position: {
                x: 0,
                y: 0,
            },
            zoom: scaleToZoom(baseScale),
        });
    }

    #generateMap(statesJSON: LoadedJSON, countiesJSON: LoadedJSON) {
        {
            const { projectedStates, projectedCounties } =
                projectFeatureCollections(
                    statesJSON.json as unknown as FeatureCollection<StateProperties>,
                    countiesJSON.json as unknown as FeatureCollection<CountyProperties>,
                );

            let minX = Number.POSITIVE_INFINITY;
            let minY = Number.POSITIVE_INFINITY;
            let maxX = Number.NEGATIVE_INFINITY;
            let maxY = Number.NEGATIVE_INFINITY;
            for (const feature of projectedStates) {
                for (const ring of feature.rings) {
                    for (const point of ring) {
                        minX = Math.min(minX, point.x);
                        minY = Math.min(minY, point.y);
                        maxX = Math.max(maxX, point.x);
                        maxY = Math.max(maxY, point.y);
                    }
                }
            }
            const offsetX = (minX + maxX) / 2;
            const offsetY = (minY + maxY) / 2;
            const recenterRings = (rings: ProjectedPoint[][]) =>
                rings.map((ring) =>
                    ring.map((point) => ({
                        x: point.x - offsetX,
                        y: point.y - offsetY,
                    })),
                );

            const countyStateGroups = new Map<string, Entity>();

            for (const state of projectedStates) {
                const name = state.properties.name ?? state.id;
                const stateGroup = this.#statesLayer.addChild({
                    type: 'entity',
                    name: `state-${name}`,
                });
                const stateRings = recenterRings(state.rings);
                for (let r = 0; r < stateRings.length; r++) {
                    const ring = stateRings[r]!;
                    if (ring.length < 2) continue;
                    stateGroup.addChild({
                        type: 'polygon',
                        name: `state-${name}-ring-${r}`,
                        points: ring,
                        lineColor: '#EEEEEE',
                        lineWidth: 2,
                        opacity: 1,
                        lineJoin: 'round',
                        lineCap: 'round',
                    });
                }
            }

            for (const county of projectedCounties) {
                const stateCode = getCountyStateCode(county);
                let stateCountyGroup = countyStateGroups.get(stateCode);
                if (!stateCountyGroup) {
                    stateCountyGroup = this.#countiesLayer.addChild({
                        type: 'entity',
                        name: `counties-state-${stateCode}`,
                    });
                    countyStateGroups.set(stateCode, stateCountyGroup);
                }

                const countyName = county.properties.NAME ?? county.id;
                const countyRings = recenterRings(county.rings);
                for (let r = 0; r < countyRings.length; r++) {
                    const ring = countyRings[r]!;
                    if (ring.length < 2) continue;
                    stateCountyGroup.addChild({
                        type: 'polygon',
                        name: `county-${countyName}-${county.id}-ring-${r}`,
                        points: ring,
                        lineColor: '#999999',
                        lineWidth: 0.65,
                        lineJoin: 'round',
                        lineCap: 'round',
                        pointerTarget: true,
                        hoverStyle: {
                            lineColor: '#0000FF',
                            lineWidth: 2,
                        },
                        hoverZIndex: 10,
                    });
                }
            }

            this.engine.log(
                `US map loaded (${projectedStates.length} states, ${projectedCounties.length} counties).`,
            );
            this.engine.forceRender();
        }
    }

    #calculateBaseScale() {
        const startingCanvasSize = this.engine.getCanvasSize();
        const scale = startingCanvasSize
            ? Math.min(
                  startingCanvasSize.x / MAP_WIDTH_PX,
                  startingCanvasSize.y / MAP_HEIGHT_PX,
              )
            : 0.5;

        return scale;
    }
}

export const usMap: EngineScenario = (harness) => {
    harness.engine.options = {
        cameraOptions: {
            maxZoom: 4,
            bounds: {
                x1: -MAP_WIDTH_PX / 2,
                x2: MAP_WIDTH_PX / 2,
                y1: -MAP_HEIGHT_PX / 2,
                y2: MAP_HEIGHT_PX / 2,
            },
        },
    };
    harness.engine.openScene(USMapScene);
};
