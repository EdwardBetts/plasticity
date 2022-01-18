/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { CenterCircleFactory } from '../src/commands/circle/CircleFactory';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { RenderedSceneBuilder } from '../src/visual_model/RenderedSceneBuilder';
import * as visual from '../src/visual_model/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';
import { SelectionDatabase } from '../src/selection/SelectionDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import theme from '../src/startup/default-theme';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selection: SelectionDatabase;

let solid: visual.Solid;
let circle: visual.SpaceInstance<visual.Curve3D>;
let highlighter: RenderedSceneBuilder;

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    selection = new SelectionDatabase(db, materials, signals);
    highlighter = new RenderedSceneBuilder(db, materials, selection, theme, signals);

    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;

    const makeCircle = new CenterCircleFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
});

test('outlineSelection', () => {
    selection.selected.addSolid(solid);
    expect([...highlighter.outlineSelection]).toEqual([solid]);
})

describe('useTemporary', () => {
    test('it uses a new selection and can be rolled back', () => {
        selection.selected.addSolid(solid);
        expect([...highlighter.outlineSelection]).toEqual([solid]);
    
        const temp = selection.makeTemporary();
        const dispose = highlighter.useTemporary(temp);
        expect([...highlighter.outlineSelection]).toEqual([]);
    
        dispose.dispose();
        expect([...highlighter.outlineSelection]).toEqual([solid]);
    })

    test('it bridges hover events', () => {
        const temp = selection.makeTemporary();
        const dispose = highlighter.useTemporary(temp);
        
        const hoverDelta = jest.fn();
        signals.hoverDelta.add(hoverDelta);

        selection.hovered.addSolid(solid);
        expect(hoverDelta).toHaveBeenCalledTimes(1);
        selection.hovered.removeSolid(solid);
        expect(hoverDelta).toHaveBeenCalledTimes(1);

        hoverDelta.mockReset();
        dispose.dispose();

        selection.hovered.addSolid(solid);
        expect(hoverDelta).toHaveBeenCalledTimes(0);
        selection.hovered.removeSolid(solid);
        expect(hoverDelta).toHaveBeenCalledTimes(0);
    })
})