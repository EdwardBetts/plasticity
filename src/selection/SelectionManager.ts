import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import { RefCounter } from '../util/Util';
import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, TopologyItem } from '../VisualModel';
import { ClickStrategy } from './Click';
import { Hoverable, HoverStrategy } from './Hover';
import * as visual from '../VisualModel';
import { SelectionMemento } from '../History';
import { Clone } from '../History';

export enum SelectionMode {
    Edge, Face, Solid, Curve
}

export interface SelectionStrategy {
    emptyIntersection(): void;
    solid(object: TopologyItem, parentItem: Solid): boolean;
    topologicalItem(object: TopologyItem, parentItem: Solid): boolean;
    curve3D(object: CurveSegment, parentItem: SpaceInstance<Curve3D>): boolean;
    invalidIntersection(): void;
}

export class SelectionManager {
    readonly selectedSolids = new Set<Solid>();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly selectedCurves = new Set<SpaceInstance<Curve3D>>();

    // selectedChildren is the set of solids that have actively selected topological items;
    // It's used in selection logic -- you can't select a solid if its face is already selected, for instance;
    // Further, when you delete a solid, if it has any selected faces, you need to unselect those faces as well.
    readonly selectedChildren = new RefCounter();

    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve, SelectionMode.Face]);
    hover?: Hoverable = undefined;

    private readonly clickStrategy = new ClickStrategy(this);
    private readonly hoverStrategy = new HoverStrategy(this);

    constructor(
        readonly db: GeometryDatabase,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals
    ) {
        signals.objectRemoved.add(item => this.delete(item));
        signals.clicked.add((intersections) => this.onClick(intersections));
        signals.hovered.add((intersections) => this.onPointerMove(intersections));
    }

    private onIntersection(intersections: THREE.Intersection[], strategy: SelectionStrategy) {
        if (intersections.length == 0) {
            strategy.emptyIntersection();
            return;
        }

        intersections.sort((i1, i2) => {
            const a = i1.object, b = i2.object;
            if (a instanceof visual.CurveEdge && b instanceof visual.Face) {
                return -1;
            } else if (a instanceof visual.Face && b instanceof visual.CurveEdge) {
                return 1;
            } else {
                return 0;
            }
        });

        for (const intersection of intersections) {
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (this.mode.has(SelectionMode.Solid)) {
                    if (strategy.solid(object, parentItem as Solid)) return;
                }
                if (strategy.topologicalItem(object, parentItem as Solid)) return;
            } else if (object instanceof CurveSegment) {
                const parentItem = object.parentItem;
                if (strategy.curve3D(object, parentItem)) return;
            }
        }
    }

    onClick(intersections: THREE.Intersection[]): void {
        this.onIntersection(intersections, this.clickStrategy);
    }

    onPointerMove(intersections: THREE.Intersection[]): void {
        this.onIntersection(intersections, this.hoverStrategy);
    }

    deselectAll(): void {
        for (const object of this.selectedEdges) {
            this.selectedEdges.delete(object);
            const model = this.db.lookupTopologyItem(object);
            object.material = this.materials.lookup(model);
            this.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedFaces) {
            this.selectedFaces.delete(object);
            const model = this.db.lookupTopologyItem(object);
            object.material = this.materials.lookup(model);
            this.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedSolids) {
            this.selectedSolids.delete(object);
            this.signals.objectDeselected.dispatch(object);
        }
        for (const curve of this.selectedCurves) {
            this.selectedCurves.delete(curve);
            const model = this.db.lookup(curve);
            curve.material = this.materials.line(model);
            this.signals.objectDeselected.dispatch(curve);
        }
        this.selectedChildren.clear();
    }

    delete(item: visual.SpaceItem): void {
        if (item instanceof visual.Solid) {
            this.selectedSolids.delete(item);
            this.selectedChildren.delete(item);
            this.signals.objectDeselected.dispatch(item);
        } else if (item instanceof visual.SpaceInstance) {
            this.selectedCurves.delete(item);
            this.signals.objectDeselected.dispatch(item);
        }
    }

    saveToMemento(registry: Map<any, any>) {
        return new SelectionMemento(
            Clone(this.selectedSolids),
            Clone(this.selectedChildren),
            Clone(this.selectedEdges),
            Clone(this.selectedFaces),
            Clone(this.selectedCurves),
        );
    }

    restoreFromMemento(m: SelectionMemento) {
        (this.selectedSolids as SelectionManager['selectedSolids']) = m.selectedSolids;
        (this.selectedChildren as SelectionManager['selectedChildren']) = m.selectedChildren;
        (this.selectedEdges as SelectionManager['selectedEdges']) = m.selectedEdges;
        (this.selectedFaces as SelectionManager['selectedFaces']) = m.selectedFaces;
        (this.selectedCurves as SelectionManager['selectedCurves']) = m.selectedCurves;
    }
}
