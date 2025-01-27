import { GridHelper } from "../../src/components/viewport/GridHelper";
import * as THREE from 'three';
import { ConstructionPlaneSnap } from "../../src/editor/snaps/ConstructionPlaneSnap";
import { CustomGrid, FloorHelper, OrthoModeGrid } from "../../src/components/viewport/FloorHelper";
import { PlaneDatabase } from "../../src/editor/PlaneDatabase";

let grids: GridHelper

beforeEach(() => {
    grids = new GridHelper(new THREE.Color(), new THREE.Color(), new THREE.Color());
})

test('getOverlay(true, ...)', () => {
    const result = grids.getOverlay(true, new ConstructionPlaneSnap(new THREE.Vector3(1, 0, 0)), new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(OrthoModeGrid);
})

test('getOverlay(false, ScreenSpace)', () => {
    const result = grids.getOverlay(false, PlaneDatabase.ScreenSpace, new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(OrthoModeGrid);
})

test('getOverlay(false, XY)', () => {
    const result = grids.getOverlay(false, PlaneDatabase.XY, new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(FloorHelper);
})

test('getOverlay(false, ....)', () => {
    const result = grids.getOverlay(false, new ConstructionPlaneSnap(new THREE.Vector3(1, 0, 0)), new THREE.OrthographicCamera());
    expect(result).toBeInstanceOf(CustomGrid);
})